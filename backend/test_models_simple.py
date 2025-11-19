#!/usr/bin/env python3
"""
Simple test script to verify SQLite models work correctly
Does not require pytest - can run standalone
"""
import sys
from pathlib import Path

# Add app to path
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.pool import StaticPool

from app.models_sqlite import (
    Base,
    AppConfig, UserPreferences,
    Client, BirthData, Chart,
    ChartInterpretation, Interpretation,
    AspectPattern, TransitEvent, SessionNote,
    LocationCache
)


def setup_test_db():
    """Create in-memory test database"""
    engine = create_engine(
        'sqlite:///:memory:',
        connect_args={'check_same_thread': False},
        poolclass=StaticPool,
        echo=False
    )

    # Enable foreign keys
    @event.listens_for(Engine, "connect")
    def set_sqlite_pragma(dbapi_conn, connection_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    # Create all tables
    Base.metadata.create_all(bind=engine)

    return engine


def test_singleton_models(session):
    """Test AppConfig and UserPreferences"""
    print("Testing singleton models...")

    # Create singletons
    config = AppConfig(id='1')
    prefs = UserPreferences(id='1')
    session.add(config)
    session.add(prefs)
    session.commit()

    # Verify AppConfig
    config = session.query(AppConfig).filter_by(id='1').first()
    assert config is not None, "AppConfig not created"
    assert config.app_version == '1.0.0', "AppConfig version incorrect"
    assert not config.has_password, "AppConfig should not have password"

    # Verify UserPreferences
    prefs = session.query(UserPreferences).filter_by(id='1').first()
    assert prefs is not None, "UserPreferences not created"
    assert prefs.default_house_system == 'placidus', "Wrong house system"

    print("  ✓ Singleton models work correctly")


def test_client_model(session):
    """Test Client model"""
    print("Testing Client model...")

    client = Client(
        first_name="John",
        last_name="Doe",
        email="john@example.com"
    )
    session.add(client)
    session.commit()

    assert client.id is not None, "Client ID not generated"
    assert client.full_name == "John Doe", "Full name incorrect"

    print("  ✓ Client model works correctly")
    return client


def test_birth_data_model(session, client):
    """Test BirthData model and relationships"""
    print("Testing BirthData model...")

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
        country="USA"
    )
    session.add(birth_data)
    session.commit()

    assert birth_data.id is not None, "BirthData ID not generated"
    assert birth_data.has_time is True, "Should have time"
    assert birth_data.location_string == "New York, NY, USA", "Location string incorrect"
    assert birth_data.client.id == client.id, "Relationship not working"

    print("  ✓ BirthData model works correctly")
    return birth_data


def test_chart_model(session, client, birth_data):
    """Test Chart model with JSON fields"""
    print("Testing Chart model...")

    chart = Chart(
        client_id=client.id,
        birth_data_id=birth_data.id,
        chart_name="Natal Chart",
        chart_type="natal",
        astro_system="western",
        house_system="placidus",
        zodiac_type="tropical",
        chart_data={
            'planets': {
                'sun': {'longitude': 294.5, 'sign': 9},
                'moon': {'longitude': 120.0, 'sign': 3}
            },
            'houses': {'cusps': [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330]},
            'aspects': [
                {'planet1': 'sun', 'planet2': 'moon', 'type': 'trine', 'orb': 5.5}
            ]
        },
        calculation_params={
            'node_type': 'true',
            'include_asteroids': True
        }
    )
    session.add(chart)
    session.commit()

    # Verify JSON serialization
    chart = session.query(Chart).first()
    assert chart.id is not None, "Chart ID not generated"
    assert isinstance(chart.chart_data, dict), "chart_data not deserialized"
    assert len(chart.planets) == 2, "Planets not loaded correctly"
    assert chart.planets['sun']['longitude'] == 294.5, "Planet data incorrect"
    assert len(chart.aspects) == 1, "Aspects not loaded"
    assert chart.calculation_params['node_type'] == 'true', "Calculation params incorrect"

    print("  ✓ Chart model with JSON fields works correctly")
    return chart


def test_cascade_delete(session, client):
    """Test cascade delete functionality"""
    print("Testing cascade delete...")

    # Create birth data and chart
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
    session.add_all([birth_data, chart])
    session.commit()

    birth_data_id = birth_data.id
    chart_id = chart.id

    # Delete client - should cascade
    session.delete(client)
    session.commit()

    # Verify cascade
    assert session.query(BirthData).filter_by(id=birth_data_id).first() is None, "BirthData not deleted"
    assert session.query(Chart).filter_by(id=chart_id).first() is None, "Chart not deleted"

    print("  ✓ Cascade delete works correctly")


def test_aspect_pattern(session):
    """Test AspectPattern with JSON list"""
    print("Testing AspectPattern model...")

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
        pattern_type="grand_trine",
        planets_involved=["sun", "moon", "jupiter"],
        description="Grand Trine in Fire"
    )
    session.add_all([client, birth_data, chart, pattern])
    session.commit()

    # Verify
    pattern = session.query(AspectPattern).first()
    assert isinstance(pattern.planets_involved, list), "planets_involved not a list"
    assert len(pattern.planets_involved) == 3, "Wrong number of planets"
    assert pattern.planet_count == 3, "planet_count property wrong"

    print("  ✓ AspectPattern model works correctly")


def test_all_models():
    """Run all tests"""
    print("\n" + "="*60)
    print("TESTING SQLite MODELS")
    print("="*60 + "\n")

    # Setup
    engine = setup_test_db()
    from sqlalchemy.orm import sessionmaker
    Session = sessionmaker(bind=engine)
    session = Session()

    try:
        # Run tests
        test_singleton_models(session)
        client = test_client_model(session)
        birth_data = test_birth_data_model(session, client)
        chart = test_chart_model(session, client, birth_data)
        test_aspect_pattern(session)

        # Reset for cascade test
        session.close()
        session = Session()

        # Initialize singletons again
        config = AppConfig(id='1')
        prefs = UserPreferences(id='1')
        session.add_all([config, prefs])
        session.commit()

        # Test cascade
        client = Client(first_name="Test")
        session.add(client)
        session.commit()
        test_cascade_delete(session, client)

        print("\n" + "="*60)
        print("ALL TESTS PASSED!")
        print("="*60 + "\n")

        return True

    except AssertionError as e:
        print(f"\n❌ TEST FAILED: {e}\n")
        return False

    except Exception as e:
        print(f"\n❌ ERROR: {e}\n")
        import traceback
        traceback.print_exc()
        return False

    finally:
        session.close()


if __name__ == '__main__':
    success = test_all_models()
    sys.exit(0 if success else 1)
