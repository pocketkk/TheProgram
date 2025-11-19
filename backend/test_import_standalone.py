#!/usr/bin/env python3
"""
Standalone Import Service Test Script

Demonstrates and tests the import service functionality without pytest.
Can be run directly to verify import service features.

Usage:
    python test_import_standalone.py

Author: The Program Development Team
Date: 2025-11-16
"""

import sys
import json
import tempfile
from pathlib import Path
from datetime import datetime
from uuid import uuid4
from typing import Dict, List

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from app.models_sqlite.base import Base
from app.models_sqlite import Client, BirthData, Chart
from app.services.import_service import ImportService
from app.services.export_service import ExportService
from app.schemas_sqlite.import_schemas import ImportMode, ImportOptions, ImportFormat


# ==================== Setup ====================

def create_test_database():
    """Create in-memory test database"""
    engine = create_engine('sqlite:///:memory:', echo=False)
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine)
    return SessionLocal()


def print_section(title: str):
    """Print section header"""
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}\n")


def print_result(test_name: str, success: bool, details: str = ""):
    """Print test result"""
    status = "✓ PASS" if success else "✗ FAIL"
    print(f"{status} - {test_name}")
    if details:
        print(f"       {details}")


# ==================== Test Functions ====================

def test_basic_import(db: Session):
    """Test basic client import"""
    print_section("Test 1: Basic Client Import")

    service = ImportService(db)

    client_data = {
        'id': str(uuid4()),
        'first_name': 'John',
        'last_name': 'Doe',
        'email': 'john.doe@example.com',
        'phone': '+1-555-0123'
    }

    import_data = {'clients': [client_data]}

    result = service.import_full_database(
        data=import_data,
        options=ImportOptions(mode=ImportMode.MERGE)
    )

    # Verify
    success = result.success and result.inserted_records == 1
    client = db.query(Client).filter(Client.id == client_data['id']).first()

    print_result(
        "Import single client",
        success,
        f"Inserted: {result.inserted_records}, Duration: {result.duration_seconds:.3f}s"
    )

    if client:
        print(f"       Client: {client.first_name} {client.last_name} ({client.email})")

    return success


def test_multiple_clients_import(db: Session):
    """Test importing multiple clients"""
    print_section("Test 2: Multiple Clients Import")

    service = ImportService(db)

    clients = [
        {
            'id': str(uuid4()),
            'first_name': f'Client{i}',
            'last_name': f'User{i}',
            'email': f'client{i}@test.com'
        }
        for i in range(10)
    ]

    result = service.import_full_database(
        data={'clients': clients},
        options=ImportOptions(mode=ImportMode.MERGE)
    )

    success = result.success and result.inserted_records == 10
    count = db.query(Client).count()

    print_result(
        "Import 10 clients",
        success,
        f"Database count: {count}, Inserted: {result.inserted_records}"
    )

    return success


def test_import_modes(db: Session):
    """Test different import modes"""
    print_section("Test 3: Import Modes (MERGE, SKIP, UPDATE)")

    service = ImportService(db)

    # Create initial client
    client_id = str(uuid4())
    initial_data = {
        'id': client_id,
        'first_name': 'Original',
        'last_name': 'Name',
        'email': 'original@test.com'
    }

    result1 = service.import_full_database(
        data={'clients': [initial_data]},
        options=ImportOptions(mode=ImportMode.MERGE)
    )

    # Test MERGE mode (should update)
    updated_data = {
        'id': client_id,
        'first_name': 'Updated',
        'last_name': 'Name',
        'email': 'updated@test.com'
    }

    result2 = service.import_full_database(
        data={'clients': [updated_data]},
        options=ImportOptions(mode=ImportMode.MERGE)
    )

    client = db.query(Client).filter(Client.id == client_id).first()
    merge_success = client.first_name == 'Updated'

    print_result(
        "MERGE mode updates existing",
        merge_success,
        f"Updated records: {result2.updated_records}"
    )

    # Test SKIP mode
    skip_data = {
        'id': client_id,
        'first_name': 'Should Skip',
        'email': 'skip@test.com'
    }

    result3 = service.import_full_database(
        data={'clients': [skip_data]},
        options=ImportOptions(mode=ImportMode.SKIP)
    )

    db.refresh(client)
    skip_success = client.first_name == 'Updated' and result3.skipped_records == 1

    print_result(
        "SKIP mode skips existing",
        skip_success,
        f"Skipped records: {result3.skipped_records}"
    )

    # Test UPDATE mode with new record
    new_client = {
        'id': str(uuid4()),
        'first_name': 'New',
        'last_name': 'Client'
    }

    result4 = service.import_full_database(
        data={'clients': [new_client]},
        options=ImportOptions(mode=ImportMode.UPDATE)
    )

    update_success = result4.skipped_records == 1  # Should skip new record

    print_result(
        "UPDATE mode skips new records",
        update_success,
        f"Skipped records: {result4.skipped_records}"
    )

    return merge_success and skip_success and update_success


def test_import_with_relationships(db: Session):
    """Test importing related data"""
    print_section("Test 4: Import with Relationships")

    service = ImportService(db)

    client_id = str(uuid4())
    birth_data_id = str(uuid4())
    chart_id = str(uuid4())

    import_data = {
        'clients': [{
            'id': client_id,
            'first_name': 'Related',
            'last_name': 'Test'
        }],
        'birth_data': [{
            'id': birth_data_id,
            'client_id': client_id,
            'birth_date': '1990-05-15',
            'birth_time': '14:30:00',
            'latitude': 40.7128,
            'longitude': -74.0060,
            'timezone': 'America/New_York',
            'city': 'New York',
            'country': 'USA'
        }],
        'charts': [{
            'id': chart_id,
            'client_id': client_id,
            'birth_data_id': birth_data_id,
            'chart_name': 'Natal Chart',
            'chart_type': 'natal',
            'astro_system': 'western',  # Required field
            'chart_data': {
                'planets': {'sun': {'longitude': 54.5}}
            }
        }]
    }

    result = service.import_full_database(
        data=import_data,
        options=ImportOptions(mode=ImportMode.MERGE)
    )

    # Verify relationships
    client = db.query(Client).filter(Client.id == client_id).first()
    success = (
        result.success and
        result.inserted_records == 3 and
        client is not None and
        len(client.birth_data) == 1 and
        len(client.charts) == 1
    )

    print_result(
        "Import client with birth_data and chart",
        success,
        f"Client has {len(client.birth_data)} birth records, {len(client.charts)} charts"
    )

    return success


def test_dry_run_mode(db: Session):
    """Test dry run mode"""
    print_section("Test 5: Dry Run Mode")

    service = ImportService(db)

    initial_count = db.query(Client).count()

    new_client = {
        'id': str(uuid4()),
        'first_name': 'Dry',
        'last_name': 'Run'
    }

    result = service.import_full_database(
        data={'clients': [new_client]},
        options=ImportOptions(),
        dry_run=True
    )

    final_count = db.query(Client).count()
    success = (
        final_count == initial_count and  # No changes to DB
        result.would_insert == 1  # But would have inserted
    )

    print_result(
        "Dry run doesn't modify database",
        success,
        f"Would insert: {result.would_insert}, Actual DB change: {final_count - initial_count}"
    )

    return success


def test_validation(db: Session):
    """Test validation features"""
    print_section("Test 6: Validation")

    service = ImportService(db)

    # Missing required field
    invalid_data = {
        'clients': [{
            # Missing 'id'
            'first_name': 'No',
            'last_name': 'ID'
        }]
    }

    result = service.import_full_database(
        data=invalid_data,
        options=ImportOptions(strict_validation=True)
    )

    success = not result.success and result.validation_result is not None

    print_result(
        "Validation catches missing required fields",
        success,
        f"Valid: {result.validation_result.valid if result.validation_result else 'N/A'}, "
        f"Errors: {len(result.validation_result.errors) if result.validation_result else 0}"
    )

    return success


def test_csv_import(db: Session):
    """Test CSV import"""
    print_section("Test 7: CSV Import")

    service = ImportService(db)

    csv_data = f"""id,first_name,last_name,email
{uuid4()},CSV,User1,csv1@test.com
{uuid4()},CSV,User2,csv2@test.com"""

    result = service.import_full_database(
        data=csv_data,
        options=ImportOptions(format=ImportFormat.CSV)
    )

    success = result.success and result.inserted_records >= 2

    print_result(
        "Import from CSV format",
        success,
        f"Inserted: {result.inserted_records}"
    )

    return success


def test_large_dataset(db: Session):
    """Test large dataset import with batching"""
    print_section("Test 8: Large Dataset Import (1000 records)")

    service = ImportService(db)

    clients = [
        {
            'id': str(uuid4()),
            'first_name': f'Bulk{i}',
            'last_name': f'User{i}',
            'email': f'bulk{i}@test.com'
        }
        for i in range(1000)
    ]

    result = service.import_full_database(
        data={'clients': clients},
        options=ImportOptions(batch_size=100)
    )

    success = result.success and result.inserted_records == 1000

    print_result(
        "Import 1000 clients with batching",
        success,
        f"Inserted: {result.inserted_records}, "
        f"Duration: {result.duration_seconds:.3f}s, "
        f"Rate: {result.inserted_records/result.duration_seconds:.0f} records/sec"
    )

    return success


def test_export_import_roundtrip(db: Session):
    """Test export then import"""
    print_section("Test 9: Export/Import Roundtrip")

    import_service = ImportService(db)
    export_service = ExportService(db)

    # Create some data
    client_id = str(uuid4())
    client = Client(
        id=client_id,
        first_name='Roundtrip',
        last_name='Test',
        email='roundtrip@test.com'
    )
    db.add(client)
    db.commit()

    # Export
    export_result = export_service.export_full_database(format='json')

    # Clear database
    db.query(Client).delete()
    db.commit()
    mid_count = db.query(Client).count()

    # Import back
    import_result = import_service.import_full_database(
        data=export_result,
        options=ImportOptions(mode=ImportMode.MERGE)
    )

    # Verify
    final_count = db.query(Client).count()
    restored_client = db.query(Client).filter(Client.id == client_id).first()

    success = (
        mid_count == 0 and
        import_result.success and
        restored_client is not None and
        restored_client.first_name == 'Roundtrip'
    )

    print_result(
        "Export then import restores data",
        success,
        f"Exported {export_result['record_counts'].get('clients', 0)} clients, "
        f"Imported {import_result.inserted_records} clients"
    )

    return success


def test_backup_feature(db: Session):
    """Test backup creation"""
    print_section("Test 10: Backup Creation")

    service = ImportService(db)

    client_data = {
        'id': str(uuid4()),
        'first_name': 'Backup',
        'last_name': 'Test'
    }

    result = service.import_full_database(
        data={'clients': [client_data]},
        options=ImportOptions(create_backup=True)
    )

    # For in-memory databases, backup_path will be None (which is correct)
    # For file-based databases, backup should be created
    db_url = str(db.bind.url)
    is_memory_db = ':memory:' in db_url

    if is_memory_db:
        # In-memory DB: backup should be None but import should succeed
        success = result.success and result.backup_path is None
        print_result(
            "In-memory DB: backup skipped, import succeeded",
            success,
            f"Success: {result.success}, Backup: {result.backup_path}"
        )
    else:
        # File-based DB: backup should exist
        backup_exists = result.backup_path is not None
        if backup_exists and result.backup_path:
            backup_exists = Path(result.backup_path).exists()
        print_result(
            "File-based DB: backup created",
            backup_exists,
            f"Backup path: {result.backup_path if result.backup_path else 'None'}"
        )
        success = backup_exists

    return success


# ==================== Main ====================

def main():
    """Run all tests"""
    print("\n")
    print("╔" + "═" * 58 + "╗")
    print("║" + " " * 10 + "IMPORT SERVICE STANDALONE TESTS" + " " * 16 + "║")
    print("╚" + "═" * 58 + "╝")

    # Create test database
    print("\nInitializing test database...")
    db = create_test_database()

    # Run tests
    tests = [
        ("Basic Import", test_basic_import),
        ("Multiple Clients", test_multiple_clients_import),
        ("Import Modes", test_import_modes),
        ("Related Data", test_import_with_relationships),
        ("Dry Run", test_dry_run_mode),
        ("Validation", test_validation),
        ("CSV Import", test_csv_import),
        ("Large Dataset", test_large_dataset),
        ("Export/Import Roundtrip", test_export_import_roundtrip),
        ("Backup Creation", test_backup_feature),
    ]

    results = []
    for test_name, test_func in tests:
        try:
            # Create fresh database for each test
            db = create_test_database()
            success = test_func(db)
            results.append((test_name, success))
        except Exception as e:
            print(f"\n✗ ERROR in {test_name}: {str(e)}")
            results.append((test_name, False))
            import traceback
            traceback.print_exc()

    # Summary
    print_section("Test Summary")

    passed = sum(1 for _, success in results if success)
    total = len(results)

    for test_name, success in results:
        status = "✓ PASS" if success else "✗ FAIL"
        print(f"{status} - {test_name}")

    print(f"\n{'='*60}")
    print(f"Results: {passed}/{total} tests passed ({passed/total*100:.1f}%)")
    print(f"{'='*60}\n")

    return 0 if passed == total else 1


if __name__ == '__main__':
    sys.exit(main())
