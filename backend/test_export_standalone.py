#!/usr/bin/env python3
"""
Standalone test for Export Service

Tests the export service functionality without requiring the full test suite.
Creates a temporary database and verifies export operations.
"""
import sys
import os
import json
import tempfile
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent
sys.path.insert(0, str(backend_path))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Import models and service
from app.models_sqlite import Base, Client, BirthData, Chart, ChartInterpretation
from app.services.export_service import ExportService


def create_test_database():
    """Create temporary test database"""
    # Create temp DB in memory
    engine = create_engine('sqlite:///:memory:', echo=False)

    # Enable foreign keys
    from sqlalchemy import event
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_conn, connection_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    # Create tables
    Base.metadata.create_all(engine)

    # Create session
    Session = sessionmaker(bind=engine)
    return Session(), engine


def populate_test_data(db):
    """Populate database with test data"""
    print("Creating test data...")

    # Create clients
    client1 = Client(
        first_name="John",
        last_name="Doe",
        email="john.doe@example.com",
        phone="+1-555-0123",
        notes="Test client 1"
    )
    db.add(client1)

    client2 = Client(
        first_name="Jane",
        last_name="Smith",
        email="jane.smith@example.com",
        notes="Test client 2"
    )
    db.add(client2)

    client3 = Client(
        first_name="Bob",
        last_name="Johnson",
        email="bob.johnson@example.com"
    )
    db.add(client3)

    db.commit()
    db.refresh(client1)
    db.refresh(client2)

    # Create birth data for client1
    birth_data = BirthData(
        client_id=client1.id,
        birth_date="1990-01-15",
        birth_time="14:30:00",
        time_unknown=False,
        latitude=40.7128,
        longitude=-74.0060,
        timezone="America/New_York",
        city="New York",
        state_province="NY",
        country="USA",
        rodden_rating="A"
    )
    db.add(birth_data)
    db.commit()
    db.refresh(birth_data)

    # Create chart
    chart = Chart(
        client_id=client1.id,
        birth_data_id=birth_data.id,
        chart_name="Natal Chart",
        chart_type="natal",
        astro_system="western",
        house_system="placidus",
        zodiac_type="tropical",
        chart_data={
            "planets": {
                "sun": {"longitude": 294.5, "sign": 9, "house": 1, "retrograde": False},
                "moon": {"longitude": 123.2, "sign": 4, "house": 5, "retrograde": False},
                "mercury": {"longitude": 280.1, "sign": 9, "house": 12, "retrograde": True}
            },
            "houses": {
                "cusps": [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330],
                "ascendant": 15.5,
                "mc": 105.3
            },
            "aspects": [
                {"planet1": "sun", "planet2": "moon", "type": "trine", "orb": 2.5, "applying": True},
                {"planet1": "sun", "planet2": "mercury", "type": "conjunction", "orb": 1.2, "applying": False}
            ]
        }
    )
    db.add(chart)
    db.commit()
    db.refresh(chart)

    # Create interpretation
    interpretation = ChartInterpretation(
        chart_id=chart.id,
        element_type="overview",
        element_key="general",
        ai_description="This is a test chart interpretation with detailed astrological analysis.",
        ai_model="test-model"
    )
    db.add(interpretation)
    db.commit()

    print(f"Created {db.query(Client).count()} clients")
    print(f"Created {db.query(BirthData).count()} birth data records")
    print(f"Created {db.query(Chart).count()} charts")
    print(f"Created {db.query(ChartInterpretation).count()} interpretations")

    return {
        'client1': client1,
        'client2': client2,
        'client3': client3,
        'birth_data': birth_data,
        'chart': chart,
        'interpretation': interpretation
    }


def test_full_database_export_json(export_service, test_data):
    """Test full database export in JSON format"""
    print("\n" + "="*60)
    print("TEST: Full Database Export (JSON)")
    print("="*60)

    result = export_service.export_full_database(
        format='json',
        include_metadata=True,
        pretty=True
    )

    assert result['format'] == 'json', "Format should be json"
    assert 'metadata' in result, "Should include metadata"
    assert 'data' in result, "Should include data"

    # Verify JSON is valid
    json_data = json.loads(result['data'])
    assert isinstance(json_data, dict), "Data should be dictionary"

    print(f"✓ Exported {result['metadata']['total_tables']} tables")
    print(f"✓ Total records: {result['metadata']['total_records']}")
    print(f"✓ Table counts: {result['metadata']['table_counts']}")

    # Verify clients
    assert 'clients' in json_data, "Should include clients"
    assert len(json_data['clients']) >= 3, "Should have at least 3 clients"

    print(f"✓ Clients exported: {len(json_data['clients'])}")
    print("✓ JSON export successful")

    return result


def test_full_database_export_csv(export_service, test_data):
    """Test full database export in CSV format"""
    print("\n" + "="*60)
    print("TEST: Full Database Export (CSV)")
    print("="*60)

    result = export_service.export_full_database(
        format='csv',
        include_metadata=True
    )

    assert result['format'] == 'csv', "Format should be csv"
    assert isinstance(result['data'], dict), "CSV data should be dict of tables"

    # Check clients CSV
    assert 'clients' in result['data'], "Should include clients"
    clients_csv = result['data']['clients']
    lines = clients_csv.strip().split('\n')

    print(f"✓ CSV has {len(lines)} lines (including header)")

    assert len(lines) >= 2, "Should have header + data"
    assert 'id' in lines[0], "Header should include 'id'"

    print("✓ CSV export successful")

    return result


def test_client_export(export_service, test_data):
    """Test selective client export"""
    print("\n" + "="*60)
    print("TEST: Client Export with Related Data")
    print("="*60)

    client = test_data['client1']

    result = export_service.export_clients(
        client_ids=[client.id],
        format='json',
        include_related=True
    )

    assert result['client_count'] == 1, "Should export 1 client"
    assert len(result['clients']) == 1, "Should have 1 client in results"

    print(f"✓ Exported client: {result['clients'][0]['first_name']} {result['clients'][0]['last_name']}")

    # Check related data
    assert 'related_data' in result, "Should include related data"
    assert 'birth_data' in result['related_data'], "Should include birth_data"
    assert 'charts' in result['related_data'], "Should include charts"

    print(f"✓ Related birth_data records: {len(result['related_data']['birth_data'])}")
    print(f"✓ Related charts: {len(result['related_data']['charts'])}")
    print(f"✓ Related chart_interpretations: {len(result['related_data'].get('chart_interpretations', []))}")

    # Verify JSON
    json_data = json.loads(result['data'])
    assert 'clients' in json_data, "JSON should include clients"

    print("✓ Client export successful")

    return result


def test_chart_export(export_service, test_data):
    """Test chart export with interpretations"""
    print("\n" + "="*60)
    print("TEST: Chart Export with Interpretations")
    print("="*60)

    chart = test_data['chart']

    result = export_service.export_charts(
        chart_ids=[chart.id],
        format='json',
        include_interpretations=True
    )

    assert result['chart_count'] == 1, "Should export 1 chart"
    assert len(result['charts']) == 1, "Should have 1 chart in results"

    chart_data = result['charts'][0]
    print(f"✓ Exported chart: {chart_data.get('chart_name', 'Unnamed')}")
    print(f"✓ Chart type: {chart_data['chart_type']}")
    print(f"✓ Astro system: {chart_data['astro_system']}")

    # Verify chart_data is present
    assert 'chart_data' in chart_data, "Chart should include chart_data"
    assert 'planets' in chart_data['chart_data'], "Chart data should include planets"

    print(f"✓ Planets in chart: {len(chart_data['chart_data']['planets'])}")
    print(f"✓ Aspects in chart: {len(chart_data['chart_data']['aspects'])}")

    # Check interpretations
    assert 'interpretations' in result, "Should include interpretations"
    print(f"✓ Interpretations: {len(result['interpretations'])}")

    print("✓ Chart export successful")

    return result


def test_table_export_with_filters(export_service, test_data):
    """Test table export with filters"""
    print("\n" + "="*60)
    print("TEST: Table Export with Filters")
    print("="*60)

    result = export_service.export_table(
        table_name='clients',
        filters={'first_name': 'John'},
        format='json'
    )

    assert result['table'] == 'clients', "Should export clients table"
    assert result['record_count'] >= 1, "Should have at least 1 record"

    print(f"✓ Filtered results: {result['record_count']} records")

    # Verify all records match filter
    for record in result['records']:
        assert record['first_name'] == 'John', "All records should have first_name='John'"

    print("✓ All records match filter")
    print("✓ Table export with filters successful")

    return result


def test_csv_format(export_service, test_data):
    """Test CSV format with special characters"""
    print("\n" + "="*60)
    print("TEST: CSV Format Handling")
    print("="*60)

    chart = test_data['chart']

    result = export_service.export_charts(
        chart_ids=[chart.id],
        format='csv'
    )

    assert result['format'] == 'csv', "Format should be csv"
    assert 'charts' in result['data'], "Should include charts CSV"

    csv_data = result['data']['charts']
    lines = csv_data.strip().split('\n')

    print(f"✓ CSV has {len(lines)} lines")
    print(f"✓ Header: {lines[0][:80]}...")

    # Verify chart_data is serialized as JSON string in CSV
    assert 'chart_data' in csv_data, "CSV should include chart_data column"

    print("✓ CSV format handling successful")

    return result


def test_export_validation(export_service, test_data):
    """Test export validation"""
    print("\n" + "="*60)
    print("TEST: Export Validation")
    print("="*60)

    result = export_service.export_full_database(format='json')
    validation = export_service.validate_export(result)

    assert validation['valid'] is True, "Export should be valid"
    print(f"✓ Export is valid: {validation['valid']}")
    print(f"✓ Warnings: {len(validation['warnings'])}")
    print(f"✓ Errors: {len(validation['errors'])}")

    if validation['warnings']:
        for warning in validation['warnings']:
            print(f"  ⚠ {warning}")

    print("✓ Export validation successful")

    return validation


def test_streaming_export(export_service, test_data):
    """Test streaming export"""
    print("\n" + "="*60)
    print("TEST: Streaming Export")
    print("="*60)

    chunks = list(export_service.stream_table_export(
        table_name='clients',
        format='json',
        chunk_size=2
    ))

    print(f"✓ Generated {len(chunks)} chunks")

    # Combine chunks
    full_json = ''.join(chunks)

    # Verify valid JSON
    parsed = json.loads(full_json)
    assert isinstance(parsed, list), "Should be JSON array"
    print(f"✓ Streamed {len(parsed)} records")

    print("✓ Streaming export successful")

    return chunks


def main():
    """Run all tests"""
    print("\n" + "="*60)
    print("EXPORT SERVICE STANDALONE TEST SUITE")
    print("="*60)

    try:
        # Create test database
        print("\nInitializing test database...")
        db, engine = create_test_database()

        # Populate test data
        test_data = populate_test_data(db)

        # Create export service
        export_service = ExportService(db)

        # Run tests
        tests_passed = 0
        tests_failed = 0

        test_functions = [
            test_full_database_export_json,
            test_full_database_export_csv,
            test_client_export,
            test_chart_export,
            test_table_export_with_filters,
            test_csv_format,
            test_export_validation,
            test_streaming_export,
        ]

        for test_func in test_functions:
            try:
                test_func(export_service, test_data)
                tests_passed += 1
            except AssertionError as e:
                print(f"\n✗ FAILED: {e}")
                tests_failed += 1
            except Exception as e:
                print(f"\n✗ ERROR: {e}")
                import traceback
                traceback.print_exc()
                tests_failed += 1

        # Summary
        print("\n" + "="*60)
        print("TEST SUMMARY")
        print("="*60)
        print(f"Tests passed: {tests_passed}/{len(test_functions)}")
        print(f"Tests failed: {tests_failed}/{len(test_functions)}")

        if tests_failed == 0:
            print("\n✓ ALL TESTS PASSED!")
            return 0
        else:
            print(f"\n✗ {tests_failed} TESTS FAILED")
            return 1

    except Exception as e:
        print(f"\n✗ FATAL ERROR: {e}")
        import traceback
        traceback.print_exc()
        return 1

    finally:
        db.close()
        engine.dispose()


if __name__ == '__main__':
    sys.exit(main())
