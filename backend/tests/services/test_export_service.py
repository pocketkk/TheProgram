"""
Comprehensive tests for Export Service

Tests all export functionality including:
- Full database export
- Selective client/chart export
- Table export with filters
- JSON and CSV formats
- Data validation
- Edge cases
"""
import json
import pytest
from datetime import datetime
from typing import Dict, Any

from sqlalchemy.orm import Session

from app.services.export_service import ExportService
from app.models_sqlite import (
    Client, BirthData, Chart, ChartInterpretation,
    AspectPattern, TransitEvent, SessionNote,
    AppConfig, UserPreferences
)


# ==================== Fixtures ====================

@pytest.fixture
def export_service(db_session: Session):
    """Create export service instance"""
    return ExportService(db_session)


@pytest.fixture
def sample_client(db_session: Session):
    """Create a sample client with related data"""
    client = Client(
        first_name="John",
        last_name="Doe",
        email="john.doe@example.com",
        phone="+1-555-0123",
        notes="Test client for export"
    )
    db_session.add(client)
    db_session.commit()
    db_session.refresh(client)
    return client


@pytest.fixture
def sample_birth_data(db_session: Session, sample_client: Client):
    """Create sample birth data"""
    birth_data = BirthData(
        client_id=sample_client.id,
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
    db_session.add(birth_data)
    db_session.commit()
    db_session.refresh(birth_data)
    return birth_data


@pytest.fixture
def sample_chart(db_session: Session, sample_client: Client, sample_birth_data: BirthData):
    """Create sample chart"""
    chart = Chart(
        client_id=sample_client.id,
        birth_data_id=sample_birth_data.id,
        chart_name="Natal Chart",
        chart_type="natal",
        astro_system="western",
        house_system="placidus",
        zodiac_type="tropical",
        chart_data={
            "planets": {
                "sun": {"longitude": 294.5, "sign": 9, "house": 1},
                "moon": {"longitude": 123.2, "sign": 4, "house": 5}
            },
            "houses": {
                "cusps": [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330],
                "ascendant": 15.5,
                "mc": 105.3
            },
            "aspects": [
                {"planet1": "sun", "planet2": "moon", "type": "trine", "orb": 2.5}
            ]
        }
    )
    db_session.add(chart)
    db_session.commit()
    db_session.refresh(chart)
    return chart


@pytest.fixture
def sample_interpretation(db_session: Session, sample_chart: Chart):
    """Create sample chart interpretation"""
    interpretation = ChartInterpretation(
        chart_id=sample_chart.id,
        element_type="overview",
        element_key="general",
        ai_description="Sample chart interpretation",
        ai_model="gpt-4"
    )
    db_session.add(interpretation)
    db_session.commit()
    db_session.refresh(interpretation)
    return interpretation


@pytest.fixture
def populated_database(
    db_session: Session,
    sample_client: Client,
    sample_birth_data: BirthData,
    sample_chart: Chart,
    sample_interpretation: ChartInterpretation
):
    """Fixture that ensures database is populated with test data"""
    # Add a few more clients for testing
    client2 = Client(
        first_name="Jane",
        last_name="Smith",
        email="jane.smith@example.com"
    )
    db_session.add(client2)

    client3 = Client(
        first_name="Bob",
        last_name="Johnson",
        email="bob.johnson@example.com"
    )
    db_session.add(client3)

    db_session.commit()

    return {
        'client': sample_client,
        'birth_data': sample_birth_data,
        'chart': sample_chart,
        'interpretation': sample_interpretation,
        'client2': client2,
        'client3': client3
    }


# ==================== Full Database Export Tests ====================

class TestFullDatabaseExport:
    """Tests for full database export functionality"""

    def test_export_full_database_json(self, export_service: ExportService, populated_database):
        """Test full database export in JSON format"""
        result = export_service.export_full_database(
            format='json',
            include_metadata=True,
            pretty=True
        )

        # Check structure
        assert result['format'] == 'json'
        assert 'tables' in result
        assert 'record_counts' in result
        assert 'metadata' in result
        assert 'data' in result

        # Check metadata
        metadata = result['metadata']
        assert 'export_timestamp' in metadata
        assert metadata['export_format'] == 'json'
        assert metadata['total_records'] > 0

        # Verify data is valid JSON
        json_data = json.loads(result['data'])
        assert isinstance(json_data, dict)

        # Check clients were exported
        assert 'clients' in json_data
        assert len(json_data['clients']) >= 3  # We created 3 clients

    def test_export_full_database_csv(self, export_service: ExportService, populated_database):
        """Test full database export in CSV format"""
        result = export_service.export_full_database(
            format='csv',
            include_metadata=True
        )

        assert result['format'] == 'csv'
        assert 'data' in result
        assert isinstance(result['data'], dict)

        # Each table should have CSV string
        assert 'clients' in result['data']
        assert isinstance(result['data']['clients'], str)

        # CSV should have header row
        clients_csv = result['data']['clients']
        lines = clients_csv.strip().split('\n')
        assert len(lines) >= 2  # Header + at least 1 record
        assert 'id' in lines[0]  # Header should contain 'id'

    def test_export_with_table_filtering(self, export_service: ExportService, populated_database):
        """Test export with include/exclude table filters"""
        # Include only specific tables
        result = export_service.export_full_database(
            format='json',
            include_tables=['clients', 'birth_data'],
            include_metadata=True
        )

        assert len(result['tables']) == 2
        assert 'clients' in result['tables']
        assert 'birth_data' in result['tables']

        # Exclude specific tables
        result = export_service.export_full_database(
            format='json',
            exclude_tables=['location_cache'],
            include_metadata=True
        )

        assert 'location_cache' not in result['tables']

    def test_export_without_metadata(self, export_service: ExportService, populated_database):
        """Test export without metadata"""
        result = export_service.export_full_database(
            format='json',
            include_metadata=False
        )

        assert 'metadata' not in result
        assert 'data' in result
        assert 'tables' in result

    def test_export_invalid_format(self, export_service: ExportService):
        """Test export with invalid format raises error"""
        with pytest.raises(ValueError, match="Unsupported export format"):
            export_service.export_full_database(format='xml')

    def test_export_invalid_table_name(self, export_service: ExportService):
        """Test export with invalid table name raises error"""
        with pytest.raises(ValueError, match="Invalid table names"):
            export_service.export_full_database(
                include_tables=['nonexistent_table']
            )


# ==================== Selective Export Tests ====================

class TestClientsExport:
    """Tests for selective client export"""

    def test_export_single_client(self, export_service: ExportService, populated_database):
        """Test exporting a single client"""
        client = populated_database['client']

        result = export_service.export_clients(
            client_ids=[client.id],
            format='json',
            include_related=True
        )

        assert result['client_count'] == 1
        assert len(result['clients']) == 1
        assert result['clients'][0]['id'] == client.id

        # Check related data
        assert 'related_data' in result
        assert 'birth_data' in result['related_data']
        assert 'charts' in result['related_data']

        # Verify JSON is valid
        json_data = json.loads(result['data'])
        assert 'clients' in json_data

    def test_export_multiple_clients(self, export_service: ExportService, populated_database):
        """Test exporting multiple clients"""
        client1 = populated_database['client']
        client2 = populated_database['client2']

        result = export_service.export_clients(
            client_ids=[client1.id, client2.id],
            format='json'
        )

        assert result['client_count'] == 2
        assert len(result['clients']) == 2

    def test_export_clients_without_related(
        self, export_service: ExportService, populated_database
    ):
        """Test exporting clients without related data"""
        client = populated_database['client']

        result = export_service.export_clients(
            client_ids=[client.id],
            include_related=False
        )

        assert result['client_count'] == 1
        assert 'related_data' not in result

    def test_export_clients_csv(self, export_service: ExportService, populated_database):
        """Test exporting clients in CSV format"""
        client = populated_database['client']

        result = export_service.export_clients(
            client_ids=[client.id],
            format='csv',
            include_related=True
        )

        assert result['format'] == 'csv'
        assert 'data' in result
        assert isinstance(result['data'], dict)
        assert 'clients' in result['data']

        # Verify CSV format
        csv_data = result['data']['clients']
        lines = csv_data.strip().split('\n')
        assert len(lines) >= 2  # Header + data

    def test_export_nonexistent_client(self, export_service: ExportService, populated_database):
        """Test exporting non-existent client ID"""
        result = export_service.export_clients(
            client_ids=['00000000-0000-0000-0000-000000000000'],
            format='json'
        )

        # Should not raise error, just return empty
        assert result['client_count'] == 0
        assert len(result['clients']) == 0

    def test_export_clients_includes_all_relationships(
        self, export_service: ExportService, populated_database
    ):
        """Test that client export includes all related data"""
        client = populated_database['client']

        result = export_service.export_clients(
            client_ids=[client.id],
            include_related=True
        )

        related = result['related_data']
        assert 'birth_data' in related
        assert 'charts' in related
        assert 'chart_interpretations' in related
        assert 'session_notes' in related

        # Verify counts
        assert result['related_counts']['birth_data'] >= 1
        assert result['related_counts']['charts'] >= 1


class TestChartsExport:
    """Tests for selective chart export"""

    def test_export_single_chart(self, export_service: ExportService, populated_database):
        """Test exporting a single chart"""
        chart = populated_database['chart']

        result = export_service.export_charts(
            chart_ids=[chart.id],
            format='json',
            include_interpretations=True
        )

        assert result['chart_count'] == 1
        assert len(result['charts']) == 1
        assert result['charts'][0]['id'] == chart.id

        # Verify chart_data is included
        assert 'chart_data' in result['charts'][0]
        chart_data = result['charts'][0]['chart_data']
        assert 'planets' in chart_data
        assert 'houses' in chart_data

    def test_export_charts_with_interpretations(
        self, export_service: ExportService, populated_database
    ):
        """Test exporting charts with interpretations"""
        chart = populated_database['chart']

        result = export_service.export_charts(
            chart_ids=[chart.id],
            include_interpretations=True
        )

        assert 'interpretations' in result
        assert result['interpretation_count'] >= 1

    def test_export_charts_without_interpretations(
        self, export_service: ExportService, populated_database
    ):
        """Test exporting charts without interpretations"""
        chart = populated_database['chart']

        result = export_service.export_charts(
            chart_ids=[chart.id],
            include_interpretations=False
        )

        assert 'interpretations' not in result
        assert 'interpretation_count' not in result

    def test_export_charts_csv(self, export_service: ExportService, populated_database):
        """Test exporting charts in CSV format"""
        chart = populated_database['chart']

        result = export_service.export_charts(
            chart_ids=[chart.id],
            format='csv'
        )

        assert result['format'] == 'csv'
        assert 'charts' in result['data']

        # Verify CSV contains chart_data as JSON string
        csv_data = result['data']['charts']
        assert 'chart_data' in csv_data


class TestTableExport:
    """Tests for individual table export"""

    def test_export_table_no_filters(self, export_service: ExportService, populated_database):
        """Test exporting entire table without filters"""
        result = export_service.export_table(
            table_name='clients',
            format='json'
        )

        assert result['table'] == 'clients'
        assert result['record_count'] >= 3
        assert 'records' in result

    def test_export_table_with_filters(self, export_service: ExportService, populated_database):
        """Test exporting table with filters"""
        client = populated_database['client']

        result = export_service.export_table(
            table_name='clients',
            filters={'first_name': 'John'},
            format='json'
        )

        assert result['record_count'] >= 1
        # All records should have first_name = 'John'
        for record in result['records']:
            assert record['first_name'] == 'John'

    def test_export_table_with_limit(self, export_service: ExportService, populated_database):
        """Test exporting table with limit"""
        result = export_service.export_table(
            table_name='clients',
            limit=2,
            format='json'
        )

        assert result['record_count'] <= 2
        assert len(result['records']) <= 2

    def test_export_table_with_offset(self, export_service: ExportService, populated_database):
        """Test exporting table with offset"""
        # Get all clients first
        all_result = export_service.export_table(
            table_name='clients',
            format='json'
        )
        total_count = all_result['record_count']

        # Export with offset
        result = export_service.export_table(
            table_name='clients',
            offset=1,
            format='json'
        )

        assert result['record_count'] == total_count - 1

    def test_export_table_csv(self, export_service: ExportService, populated_database):
        """Test exporting table in CSV format"""
        result = export_service.export_table(
            table_name='clients',
            format='csv'
        )

        assert result['format'] == 'csv'
        assert isinstance(result['data'], str)
        assert len(result['data']) > 0

    def test_export_invalid_table(self, export_service: ExportService):
        """Test exporting invalid table name"""
        with pytest.raises(ValueError, match="Unknown table"):
            export_service.export_table(
                table_name='invalid_table',
                format='json'
            )


# ==================== Format Conversion Tests ====================

class TestFormatConversion:
    """Tests for format conversion utilities"""

    def test_json_serialization(self, export_service: ExportService):
        """Test JSON serialization with special types"""
        data = {
            'string': 'test',
            'number': 123,
            'float': 45.67,
            'boolean': True,
            'null': None,
            'dict': {'nested': 'value'},
            'list': [1, 2, 3]
        }

        json_str = export_service._to_json(data, pretty=True)
        parsed = json.loads(json_str)

        assert parsed['string'] == 'test'
        assert parsed['number'] == 123
        assert parsed['float'] == 45.67
        assert parsed['boolean'] is True
        assert parsed['null'] is None

    def test_json_datetime_serialization(self, export_service: ExportService):
        """Test JSON serialization of datetime objects"""
        now = datetime.utcnow()
        data = {'timestamp': now}

        json_str = export_service._to_json(data)
        parsed = json.loads(json_str)

        # Should be ISO format string
        assert isinstance(parsed['timestamp'], str)
        assert 'T' in parsed['timestamp']

    def test_csv_conversion(self, export_service: ExportService):
        """Test CSV conversion"""
        data = [
            {'id': '1', 'name': 'Alice', 'age': 30},
            {'id': '2', 'name': 'Bob', 'age': 25}
        ]

        csv_str = export_service._to_csv(data, 'test_table')

        lines = csv_str.strip().split('\n')
        assert len(lines) == 3  # Header + 2 data rows
        assert 'id' in lines[0]
        assert 'name' in lines[0]
        assert 'age' in lines[0]

    def test_csv_with_nested_json(self, export_service: ExportService):
        """Test CSV conversion with nested JSON data"""
        data = [
            {
                'id': '1',
                'name': 'Test',
                'metadata': {'key': 'value', 'nested': {'deep': 'data'}}
            }
        ]

        csv_str = export_service._to_csv(data, 'test_table')

        # Nested JSON should be serialized as string
        assert '"metadata"' in csv_str or 'metadata' in csv_str
        lines = csv_str.strip().split('\n')
        assert len(lines) == 2  # Header + 1 data row

    def test_csv_custom_delimiter(self, export_service: ExportService):
        """Test CSV with custom delimiter"""
        data = [
            {'id': '1', 'name': 'Alice'},
            {'id': '2', 'name': 'Bob'}
        ]

        csv_str = export_service._to_csv(data, 'test_table', delimiter=';')

        # Should use semicolon
        assert ';' in csv_str
        lines = csv_str.strip().split('\n')
        assert ';' in lines[0]  # Header line

    def test_csv_empty_data(self, export_service: ExportService):
        """Test CSV conversion with empty data"""
        csv_str = export_service._to_csv([], 'test_table')
        assert csv_str == ""


# ==================== Validation Tests ====================

class TestExportValidation:
    """Tests for export validation"""

    def test_validate_valid_export(self, export_service: ExportService, populated_database):
        """Test validation of valid export"""
        result = export_service.export_full_database(format='json')
        validation = export_service.validate_export(result)

        assert validation['valid'] is True
        assert len(validation['errors']) == 0

    def test_validate_export_with_empty_tables(self, export_service: ExportService):
        """Test validation with empty tables"""
        result = export_service.export_full_database(format='json')
        validation = export_service.validate_export(result)

        # May have warnings about empty tables
        # Should still be valid
        assert validation['valid'] is True

    def test_validate_export_missing_data(self, export_service: ExportService):
        """Test validation with missing data field"""
        invalid_result = {
            'format': 'json',
            'tables': [],
            # Missing 'data' field
        }

        validation = export_service.validate_export(invalid_result)

        assert validation['valid'] is False
        assert len(validation['errors']) > 0
        assert any('data' in error for error in validation['errors'])


# ==================== Streaming Export Tests ====================

class TestStreamingExport:
    """Tests for streaming export functionality"""

    def test_stream_table_json(self, export_service: ExportService, populated_database):
        """Test streaming table export in JSON format"""
        chunks = list(export_service.stream_table_export(
            table_name='clients',
            format='json',
            chunk_size=2
        ))

        assert len(chunks) > 0

        # Combine chunks
        full_json = ''.join(chunks)

        # Should be valid JSON array
        parsed = json.loads(full_json)
        assert isinstance(parsed, list)
        assert len(parsed) >= 3  # We have at least 3 clients

    def test_stream_table_chunking(self, export_service: ExportService, populated_database):
        """Test that streaming properly chunks data"""
        # With chunk_size=1, should get separate chunks
        chunks = list(export_service.stream_table_export(
            table_name='clients',
            format='json',
            chunk_size=1
        ))

        # Should have multiple chunks
        assert len(chunks) > 3  # Opening, records, closing

    def test_stream_empty_table(self, export_service: ExportService, db_session: Session):
        """Test streaming export of empty table"""
        # Ensure location_cache is empty
        chunks = list(export_service.stream_table_export(
            table_name='location_cache',
            format='json'
        ))

        # Should still produce valid empty array
        full_json = ''.join(chunks)
        parsed = json.loads(full_json)
        assert isinstance(parsed, list)
        assert len(parsed) == 0


# ==================== Edge Cases and Error Handling ====================

class TestEdgeCases:
    """Tests for edge cases and error handling"""

    def test_export_with_null_values(self, db_session: Session, export_service: ExportService):
        """Test export with NULL values"""
        client = Client(
            first_name="Test",
            # All other fields NULL
        )
        db_session.add(client)
        db_session.commit()

        result = export_service.export_clients(
            client_ids=[client.id],
            format='json'
        )

        assert result['client_count'] == 1
        client_data = result['clients'][0]
        assert client_data['last_name'] is None
        assert client_data['email'] is None

    def test_export_with_unicode(self, db_session: Session, export_service: ExportService):
        """Test export with unicode characters"""
        client = Client(
            first_name="José",
            last_name="Müller",
            notes="Unicode test: 你好, مرحبا, Здравствуй"
        )
        db_session.add(client)
        db_session.commit()

        result = export_service.export_clients(
            client_ids=[client.id],
            format='json'
        )

        json_str = result['data']
        parsed = json.loads(json_str)

        # Unicode should be preserved
        assert parsed['clients'][0]['first_name'] == "José"
        assert parsed['clients'][0]['last_name'] == "Müller"

    def test_export_large_json_field(
        self, db_session: Session, export_service: ExportService, sample_birth_data
    ):
        """Test export with large JSON field (chart_data)"""
        # Create chart with large chart_data
        large_chart_data = {
            'planets': {f'planet_{i}': {'longitude': i * 10} for i in range(100)},
            'aspects': [
                {'p1': f'p{i}', 'p2': f'p{j}', 'orb': 1.5}
                for i in range(10) for j in range(10)
            ]
        }

        chart = Chart(
            birth_data_id=sample_birth_data.id,
            chart_type='natal',
            astro_system='western',
            zodiac_type='tropical',
            chart_data=large_chart_data
        )
        db_session.add(chart)
        db_session.commit()

        result = export_service.export_charts(
            chart_ids=[chart.id],
            format='json'
        )

        # Should successfully export large data
        assert result['chart_count'] == 1
        chart_data = result['charts'][0]['chart_data']
        assert len(chart_data['planets']) == 100

    def test_export_special_characters_csv(
        self, db_session: Session, export_service: ExportService
    ):
        """Test CSV export with special characters (quotes, commas)"""
        client = Client(
            first_name='John "Johnny"',
            last_name='O\'Brien',
            notes='Special chars: , ; " \' \n'
        )
        db_session.add(client)
        db_session.commit()

        result = export_service.export_clients(
            client_ids=[client.id],
            format='csv'
        )

        csv_str = result['data']['clients']

        # CSV should properly escape special characters
        assert 'John "Johnny"' in csv_str or '"John ""Johnny"""' in csv_str
        # Should not break CSV structure
        lines = csv_str.strip().split('\n')
        assert len(lines) >= 2


# ==================== Performance Tests ====================

class TestPerformance:
    """Performance and scalability tests"""

    @pytest.mark.slow
    def test_export_many_clients(self, db_session: Session, export_service: ExportService):
        """Test export performance with many clients"""
        # Create 100 clients
        clients = []
        for i in range(100):
            client = Client(
                first_name=f"Client{i}",
                last_name=f"Test{i}",
                email=f"client{i}@test.com"
            )
            clients.append(client)

        db_session.bulk_save_objects(clients)
        db_session.commit()

        # Export all clients
        import time
        start = time.time()

        result = export_service.export_full_database(format='json')

        duration = time.time() - start

        # Should complete in reasonable time (< 5 seconds)
        assert duration < 5.0
        assert result['record_counts']['clients'] >= 100

    @pytest.mark.slow
    def test_streaming_memory_efficiency(
        self, db_session: Session, export_service: ExportService
    ):
        """Test that streaming doesn't load all data into memory"""
        # Create many records
        clients = [
            Client(first_name=f"Client{i}", last_name=f"Test{i}")
            for i in range(50)
        ]
        db_session.bulk_save_objects(clients)
        db_session.commit()

        # Stream export with small chunks
        chunk_count = 0
        for chunk in export_service.stream_table_export(
            table_name='clients',
            format='json',
            chunk_size=5
        ):
            chunk_count += 1
            # Each chunk should be relatively small
            assert len(chunk) < 10000  # Arbitrary reasonable limit

        # Should have processed multiple chunks
        assert chunk_count > 1
