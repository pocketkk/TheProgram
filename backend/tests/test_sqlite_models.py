"""
Comprehensive test suite for SQLite models

Tests model creation, relationships, JSON serialization, cascade deletes,
and constraint enforcement.
"""
import pytest
from datetime import datetime
from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

from app.models_sqlite import (
    Base, BaseModel, SingletonModel,
    AppConfig, UserPreferences,
    Client, BirthData, Chart,
    ChartInterpretation, Interpretation,
    AspectPattern, TransitEvent, SessionNote,
    LocationCache
)
from app.core.uuid_helpers import generate_uuid


# Test database setup
@pytest.fixture(scope='function')
def db_engine():
    """Create in-memory SQLite database for testing"""
    engine = create_engine(
        'sqlite:///:memory:',
        connect_args={'check_same_thread': False},
        poolclass=StaticPool
    )

    # Enable foreign keys for each connection
    @event.listens_for(Engine, "connect")
    def set_sqlite_pragma(dbapi_conn, connection_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.close()

    # Create all tables
    Base.metadata.create_all(bind=engine)

    yield engine

    # Cleanup
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope='function')
def db_session(db_engine):
    """Create database session for testing"""
    SessionLocal = sessionmaker(bind=db_engine)
    session = SessionLocal()

    # Initialize singleton tables
    app_config = AppConfig(id='1')
    user_prefs = UserPreferences(id='1')
    session.add(app_config)
    session.add(user_prefs)
    session.commit()

    yield session

    session.close()


# ============================================================================
# Singleton Model Tests
# ============================================================================

class TestSingletonModels:
    """Test singleton models (AppConfig, UserPreferences)"""

    def test_app_config_creation(self, db_session):
        """Test AppConfig singleton creation"""
        config = db_session.query(AppConfig).filter_by(id='1').first()
        assert config is not None
        assert config.id == '1'
        assert config.app_version == '1.0.0'
        assert config.database_version == 1
        assert not config.has_password

    def test_app_config_password(self, db_session):
        """Test AppConfig password functionality"""
        config = db_session.query(AppConfig).filter_by(id='1').first()

        # Set password
        config.password_hash = "hashed_password_here"
        db_session.commit()

        # Verify
        config = db_session.query(AppConfig).filter_by(id='1').first()
        assert config.has_password
        assert config.password_hash == "hashed_password_here"

        # to_dict should not include password_hash
        data = config.to_dict()
        assert 'password_hash' not in data
        assert data['has_password'] is True

    def test_user_preferences_defaults(self, db_session):
        """Test UserPreferences default values"""
        prefs = db_session.query(UserPreferences).filter_by(id='1').first()
        assert prefs is not None
        assert prefs.default_house_system == 'placidus'
        assert prefs.default_ayanamsa == 'lahiri'
        assert prefs.default_zodiac == 'tropical'
        assert prefs.color_scheme == 'light'

    def test_user_preferences_json_fields(self, db_session):
        """Test UserPreferences JSON field serialization"""
        prefs = db_session.query(UserPreferences).filter_by(id='1').first()

        # Set aspect orbs
        prefs.aspect_orbs = {
            'conjunction': 10,
            'opposition': 10,
            'trine': 8,
            'square': 8
        }

        # Set displayed points
        prefs.displayed_points = ['sun', 'moon', 'mercury', 'venus']

        db_session.commit()

        # Verify
        prefs = db_session.query(UserPreferences).filter_by(id='1').first()
        assert prefs.aspect_orbs['conjunction'] == 10
        assert prefs.aspect_orbs['trine'] == 8
        assert len(prefs.displayed_points) == 4
        assert 'sun' in prefs.displayed_points


# ============================================================================
# Client Model Tests
# ============================================================================

class TestClient:
    """Test Client model"""

    def test_client_creation(self, db_session):
        """Test creating a client"""
        client = Client(
            first_name="John",
            last_name="Doe",
            email="john.doe@example.com",
            phone="+1-555-0123"
        )
        db_session.add(client)
        db_session.commit()

        # Verify
        assert client.id is not None
        assert client.full_name == "John Doe"
        assert client.created_at is not None

    def test_client_full_name(self, db_session):
        """Test full_name property"""
        # Both names
        client1 = Client(first_name="John", last_name="Doe")
        assert client1.full_name == "John Doe"

        # First name only
        client2 = Client(first_name="John")
        assert client2.full_name == "John"

        # Last name only
        client3 = Client(last_name="Doe")
        assert client3.full_name == "Doe"

        # No names
        client4 = Client()
        assert client4.full_name == ""

    def test_client_to_dict(self, db_session):
        """Test Client.to_dict()"""
        client = Client(
            first_name="Jane",
            last_name="Smith",
            email="jane@example.com"
        )
        db_session.add(client)
        db_session.commit()

        data = client.to_dict()
        assert data['first_name'] == "Jane"
        assert data['last_name'] == "Smith"
        assert data['full_name'] == "Jane Smith"
        assert 'id' in data
        assert 'created_at' in data


# ============================================================================
# BirthData Model Tests
# ============================================================================

class TestBirthData:
    """Test BirthData model"""

    def test_birth_data_creation(self, db_session):
        """Test creating birth data"""
        # Create client first
        client = Client(first_name="Test", last_name="User")
        db_session.add(client)
        db_session.commit()

        # Create birth data
        birth_data = BirthData(
            client_id=client.id,
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

        # Verify
        assert birth_data.id is not None
        assert birth_data.has_time is True
        assert birth_data.location_string == "New York, NY, USA"

    def test_birth_data_relationships(self, db_session):
        """Test BirthData relationships"""
        client = Client(first_name="Test")
        db_session.add(client)
        db_session.commit()

        birth_data = BirthData(
            client_id=client.id,
            birth_date="1990-01-15",
            latitude=40.0,
            longitude=-74.0,
            timezone="America/New_York"
        )
        db_session.add(birth_data)
        db_session.commit()

        # Test relationship
        assert birth_data.client is not None
        assert birth_data.client.id == client.id
        assert len(client.birth_data) == 1

    def test_birth_data_coordinates_validation(self, db_session):
        """Test coordinate constraint validation"""
        client = Client(first_name="Test")
        db_session.add(client)
        db_session.commit()

        # Invalid latitude should fail
        with pytest.raises(Exception):
            birth_data = BirthData(
                client_id=client.id,
                birth_date="1990-01-15",
                latitude=100.0,  # Invalid: > 90
                longitude=-74.0,
                timezone="America/New_York"
            )
            db_session.add(birth_data)
            db_session.commit()

        db_session.rollback()

    def test_birth_data_cascade_delete(self, db_session):
        """Test cascade delete from client"""
        client = Client(first_name="Test")
        db_session.add(client)
        db_session.commit()

        birth_data = BirthData(
            client_id=client.id,
            birth_date="1990-01-15",
            latitude=40.0,
            longitude=-74.0,
            timezone="America/New_York"
        )
        db_session.add(birth_data)
        db_session.commit()

        birth_data_id = birth_data.id

        # Delete client
        db_session.delete(client)
        db_session.commit()

        # Verify birth_data is deleted
        result = db_session.query(BirthData).filter_by(id=birth_data_id).first()
        assert result is None


# ============================================================================
# Chart Model Tests
# ============================================================================

class TestChart:
    """Test Chart model"""

    def test_chart_creation(self, db_session):
        """Test creating a chart"""
        # Create client and birth data
        client = Client(first_name="Test")
        db_session.add(client)
        db_session.commit()

        birth_data = BirthData(
            client_id=client.id,
            birth_date="1990-01-15",
            latitude=40.0,
            longitude=-74.0,
            timezone="America/New_York"
        )
        db_session.add(birth_data)
        db_session.commit()

        # Create chart
        chart = Chart(
            client_id=client.id,
            birth_data_id=birth_data.id,
            chart_name="Natal Chart",
            chart_type="natal",
            astro_system="western",
            house_system="placidus",
            zodiac_type="tropical",
            chart_data={
                'planets': {'sun': {'longitude': 294.5}},
                'houses': {'cusps': [0, 30, 60]},
                'aspects': []
            }
        )
        db_session.add(chart)
        db_session.commit()

        # Verify
        assert chart.id is not None
        assert chart.display_name == "Natal Chart"
        assert chart.planets['sun']['longitude'] == 294.5

    def test_chart_json_fields(self, db_session):
        """Test Chart JSON field serialization"""
        client = Client(first_name="Test")
        birth_data = BirthData(
            client_id=client.id,
            birth_date="1990-01-15",
            latitude=40.0,
            longitude=-74.0,
            timezone="America/New_York"
        )
        db_session.add_all([client, birth_data])
        db_session.commit()

        chart = Chart(
            client_id=client.id,
            birth_data_id=birth_data.id,
            chart_type="natal",
            astro_system="western",
            zodiac_type="tropical",
            chart_data={
                'planets': {
                    'sun': {'longitude': 294.5, 'sign': 9},
                    'moon': {'longitude': 120.0, 'sign': 3}
                },
                'aspects': [
                    {'planet1': 'sun', 'planet2': 'moon', 'type': 'trine', 'orb': 5.5}
                ]
            },
            calculation_params={
                'node_type': 'true',
                'include_asteroids': True
            }
        )
        db_session.add(chart)
        db_session.commit()

        # Verify
        chart = db_session.query(Chart).first()
        assert len(chart.planets) == 2
        assert chart.planets['sun']['sign'] == 9
        assert len(chart.aspects) == 1
        assert chart.calculation_params['node_type'] == 'true'

    def test_chart_cascade_delete(self, db_session):
        """Test cascade delete from client and birth_data"""
        client = Client(first_name="Test")
        birth_data = BirthData(
            client_id=client.id,
            birth_date="1990-01-15",
            latitude=40.0,
            longitude=-74.0,
            timezone="America/New_York"
        )
        chart = Chart(
            client_id=client.id,
            birth_data_id=birth_data.id,
            chart_type="natal",
            astro_system="western",
            zodiac_type="tropical",
            chart_data={}
        )
        db_session.add_all([client, birth_data, chart])
        db_session.commit()

        chart_id = chart.id

        # Delete client should cascade to chart
        db_session.delete(client)
        db_session.commit()

        result = db_session.query(Chart).filter_by(id=chart_id).first()
        assert result is None


# ============================================================================
# ChartInterpretation Model Tests
# ============================================================================

class TestChartInterpretation:
    """Test ChartInterpretation model"""

    def test_interpretation_creation(self, db_session):
        """Test creating chart interpretation"""
        client = Client(first_name="Test")
        birth_data = BirthData(
            client_id=client.id,
            birth_date="1990-01-15",
            latitude=40.0,
            longitude=-74.0,
            timezone="America/New_York"
        )
        chart = Chart(
            client_id=client.id,
            birth_data_id=birth_data.id,
            chart_type="natal",
            astro_system="western",
            zodiac_type="tropical",
            chart_data={}
        )
        db_session.add_all([client, birth_data, chart])
        db_session.commit()

        interp = ChartInterpretation(
            chart_id=chart.id,
            element_type="planet",
            element_key="sun",
            ai_description="Your Sun in Capricorn indicates strong ambition...",
            ai_model="claude-3-opus",
            ai_prompt_version="v1.2",
            version=1,
            is_approved="pending"
        )
        db_session.add(interp)
        db_session.commit()

        # Verify
        assert interp.id is not None
        assert interp.is_pending is True
        assert interp.is_approved_status is False

    def test_interpretation_cascade_delete(self, db_session):
        """Test cascade delete from chart"""
        client = Client(first_name="Test")
        birth_data = BirthData(
            client_id=client.id,
            birth_date="1990-01-15",
            latitude=40.0,
            longitude=-74.0,
            timezone="America/New_York"
        )
        chart = Chart(
            client_id=client.id,
            birth_data_id=birth_data.id,
            chart_type="natal",
            astro_system="western",
            zodiac_type="tropical",
            chart_data={}
        )
        interp = ChartInterpretation(
            chart_id=chart.id,
            element_type="planet",
            element_key="sun",
            ai_description="Test description"
        )
        db_session.add_all([client, birth_data, chart, interp])
        db_session.commit()

        interp_id = interp.id

        # Delete chart should cascade
        db_session.delete(chart)
        db_session.commit()

        result = db_session.query(ChartInterpretation).filter_by(id=interp_id).first()
        assert result is None


# ============================================================================
# AspectPattern Model Tests
# ============================================================================

class TestAspectPattern:
    """Test AspectPattern model"""

    def test_aspect_pattern_creation(self, db_session):
        """Test creating aspect pattern"""
        client = Client(first_name="Test")
        birth_data = BirthData(
            client_id=client.id,
            birth_date="1990-01-15",
            latitude=40.0,
            longitude=-74.0,
            timezone="America/New_York"
        )
        chart = Chart(
            client_id=client.id,
            birth_data_id=birth_data.id,
            chart_type="natal",
            astro_system="western",
            zodiac_type="tropical",
            chart_data={}
        )
        db_session.add_all([client, birth_data, chart])
        db_session.commit()

        pattern = AspectPattern(
            chart_id=chart.id,
            pattern_type="grand_trine",
            planets_involved=["sun", "moon", "jupiter"],
            description="Grand Trine in Fire signs"
        )
        db_session.add(pattern)
        db_session.commit()

        # Verify
        assert pattern.id is not None
        assert pattern.planet_count == 3
        assert pattern.planet_names_string == "Sun, Moon, Jupiter"

    def test_aspect_pattern_json_field(self, db_session):
        """Test planets_involved JSON serialization"""
        client = Client(first_name="Test")
        birth_data = BirthData(
            client_id=client.id,
            birth_date="1990-01-15",
            latitude=40.0,
            longitude=-74.0,
            timezone="America/New_York"
        )
        chart = Chart(
            client_id=client.id,
            birth_data_id=birth_data.id,
            chart_type="natal",
            astro_system="western",
            zodiac_type="tropical",
            chart_data={}
        )
        pattern = AspectPattern(
            chart_id=chart.id,
            pattern_type="t_square",
            planets_involved=["mars", "saturn", "pluto"]
        )
        db_session.add_all([client, birth_data, chart, pattern])
        db_session.commit()

        # Verify
        pattern = db_session.query(AspectPattern).first()
        assert isinstance(pattern.planets_involved, list)
        assert len(pattern.planets_involved) == 3
        assert "mars" in pattern.planets_involved


# ============================================================================
# TransitEvent Model Tests
# ============================================================================

class TestTransitEvent:
    """Test TransitEvent model"""

    def test_transit_event_creation(self, db_session):
        """Test creating transit event"""
        client = Client(first_name="Test")
        birth_data = BirthData(
            client_id=client.id,
            birth_date="1990-01-15",
            latitude=40.0,
            longitude=-74.0,
            timezone="America/New_York"
        )
        chart = Chart(
            client_id=client.id,
            birth_data_id=birth_data.id,
            chart_type="natal",
            astro_system="western",
            zodiac_type="tropical",
            chart_data={}
        )
        db_session.add_all([client, birth_data, chart])
        db_session.commit()

        event = TransitEvent(
            chart_id=chart.id,
            event_date="2025-01-15T14:30:00",
            transiting_planet="jupiter",
            natal_planet="sun",
            aspect_type="trine",
            orb=2.5,
            is_applying=True
        )
        db_session.add(event)
        db_session.commit()

        # Verify
        assert event.id is not None
        assert event.description == "Jupiter trine Sun"
        assert event.is_exact is False
        assert event.direction_string == "applying"


# ============================================================================
# SessionNote Model Tests
# ============================================================================

class TestSessionNote:
    """Test SessionNote model"""

    def test_session_note_creation(self, db_session):
        """Test creating session note"""
        client = Client(first_name="Test", last_name="User")
        db_session.add(client)
        db_session.commit()

        note = SessionNote(
            client_id=client.id,
            note_date="2025-01-15",
            note_content="Client discussed career concerns..."
        )
        db_session.add(note)
        db_session.commit()

        # Verify
        assert note.id is not None
        assert note.has_content is True
        assert len(note.preview_text) <= 100


# ============================================================================
# LocationCache Model Tests
# ============================================================================

class TestLocationCache:
    """Test LocationCache model"""

    def test_location_cache_creation(self, db_session):
        """Test creating location cache entry"""
        location = LocationCache(
            city_name="New York",
            state_province="NY",
            country="USA",
            latitude=40.7128,
            longitude=-74.0060,
            timezone="America/New_York",
            geonames_id=5128581
        )
        db_session.add(location)
        db_session.commit()

        # Verify
        assert location.id is not None
        assert location.location_string == "New York, NY, USA"
        assert "40.71°N" in location.coordinates_string


# ============================================================================
# Interpretation Model Tests
# ============================================================================

class TestInterpretation:
    """Test Interpretation model"""

    def test_interpretation_creation(self, db_session):
        """Test creating interpretation template"""
        interp = Interpretation(
            interpretation_type="planet_in_sign",
            key_identifier="sun_in_aries",
            tradition="western",
            text_content="Sun in Aries people are bold, pioneering, and energetic...",
            source="Modern Astrology Textbook",
            is_user_custom=False
        )
        db_session.add(interp)
        db_session.commit()

        # Verify
        assert interp.id is not None
        assert interp.is_default is True
        assert len(interp.preview_text) <= 100


# ============================================================================
# Run tests
# ============================================================================

if __name__ == '__main__':
    pytest.main([__file__, '-v'])
