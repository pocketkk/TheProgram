"""
Comprehensive tests for all database models
Tests model creation, relationships, and business logic
"""
import pytest
from datetime import datetime, date, time
from decimal import Decimal
import uuid

# Models
from app.models import (
    User, Client, BirthData, Chart, Interpretation,
    SessionNote, UserPreferences, LocationCache,
    AspectPattern, TransitEvent
)
from app.core.database import Base, SessionLocal, engine


# =============================================================================
# Fixtures
# =============================================================================

@pytest.fixture(scope="function")
def db_session():
    """
    Create a new database session for a test

    Creates all tables, yields session, then drops all tables
    """
    # Create tables
    Base.metadata.create_all(bind=engine)

    # Create session
    session = SessionLocal()

    try:
        yield session
    finally:
        session.close()
        # Drop all tables
        Base.metadata.drop_all(bind=engine)


@pytest.fixture
def sample_user(db_session):
    """Create a sample user for testing"""
    user = User(
        email="test@example.com",
        password_hash="hashed_password",
        full_name="Test User",
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def sample_client(db_session, sample_user):
    """Create a sample client for testing"""
    client = Client(
        user_id=sample_user.id,
        first_name="John",
        last_name="Doe",
        email="john.doe@example.com"
    )
    db_session.add(client)
    db_session.commit()
    db_session.refresh(client)
    return client


@pytest.fixture
def sample_birth_data(db_session, sample_client):
    """Create sample birth data for testing"""
    birth_data = BirthData(
        client_id=sample_client.id,
        birth_date=date(1990, 1, 15),
        birth_time=time(14, 30),
        latitude=Decimal("40.7128"),
        longitude=Decimal("-74.0060"),
        timezone="America/New_York",
        city="New York",
        country="USA",
        rodden_rating="AA"
    )
    db_session.add(birth_data)
    db_session.commit()
    db_session.refresh(birth_data)
    return birth_data


# =============================================================================
# User Model Tests
# =============================================================================

class TestUserModel:
    """Test User model"""

    @pytest.mark.database
    def test_create_user(self, db_session):
        """Test creating a user"""
        user = User(
            email="newuser@example.com",
            password_hash="hashed_password",
            full_name="New User"
        )
        db_session.add(user)
        db_session.commit()

        assert user.id is not None
        assert user.email == "newuser@example.com"
        assert user.is_active is True
        assert user.created_at is not None

    @pytest.mark.database
    def test_user_unique_email(self, db_session, sample_user):
        """Test that email must be unique"""
        duplicate_user = User(
            email=sample_user.email,  # Same email
            password_hash="another_hash"
        )
        db_session.add(duplicate_user)

        with pytest.raises(Exception):  # IntegrityError
            db_session.commit()

    @pytest.mark.database
    def test_user_is_premium_property(self, db_session):
        """Test is_premium property"""
        free_user = User(
            email="free@example.com",
            password_hash="hash",
            subscription_tier="free"
        )
        db_session.add(free_user)

        pro_user = User(
            email="pro@example.com",
            password_hash="hash",
            subscription_tier="pro"
        )
        db_session.add(pro_user)
        db_session.commit()

        assert free_user.is_premium is False
        assert pro_user.is_premium is True

    @pytest.mark.database
    def test_user_update_last_login(self, db_session, sample_user):
        """Test updating last login"""
        assert sample_user.last_login is None

        sample_user.update_last_login()
        db_session.commit()

        assert sample_user.last_login is not None
        assert isinstance(sample_user.last_login, datetime)


# =============================================================================
# Client Model Tests
# =============================================================================

class TestClientModel:
    """Test Client model"""

    @pytest.mark.database
    def test_create_client(self, db_session, sample_user):
        """Test creating a client"""
        client = Client(
            user_id=sample_user.id,
            first_name="Jane",
            last_name="Smith",
            email="jane@example.com"
        )
        db_session.add(client)
        db_session.commit()

        assert client.id is not None
        assert client.user_id == sample_user.id
        assert client.full_name == "Jane Smith"

    @pytest.mark.database
    def test_client_full_name_property(self, db_session, sample_user):
        """Test full_name property"""
        # Both names
        client1 = Client(
            user_id=sample_user.id,
            first_name="John",
            last_name="Doe"
        )

        # First name only
        client2 = Client(
            user_id=sample_user.id,
            first_name="John"
        )

        # No names
        client3 = Client(user_id=sample_user.id)

        assert client1.full_name == "John Doe"
        assert client2.full_name == "John"
        assert client3.full_name == "Unnamed Client"

    @pytest.mark.database
    def test_client_user_relationship(self, db_session, sample_user):
        """Test client-user relationship"""
        client = Client(
            user_id=sample_user.id,
            first_name="Test"
        )
        db_session.add(client)
        db_session.commit()

        # Access user from client
        assert client.user.id == sample_user.id
        assert client.user.email == sample_user.email

        # Access clients from user
        user_clients = sample_user.clients.all()
        assert len(user_clients) >= 1
        assert any(c.id == client.id for c in user_clients)


# =============================================================================
# BirthData Model Tests
# =============================================================================

class TestBirthDataModel:
    """Test BirthData model"""

    @pytest.mark.database
    def test_create_birth_data(self, db_session, sample_client):
        """Test creating birth data"""
        birth_data = BirthData(
            client_id=sample_client.id,
            birth_date=date(1985, 7, 4),
            birth_time=time(8, 15),
            latitude=Decimal("34.0522"),
            longitude=Decimal("-118.2437"),
            timezone="America/Los_Angeles",
            city="Los Angeles"
        )
        db_session.add(birth_data)
        db_session.commit()

        assert birth_data.id is not None
        assert birth_data.birth_date == date(1985, 7, 4)
        assert birth_data.is_time_known is True

    @pytest.mark.database
    def test_birth_data_time_unknown(self, db_session, sample_client):
        """Test birth data with unknown time"""
        birth_data = BirthData(
            client_id=sample_client.id,
            birth_date=date(2000, 1, 1),
            time_unknown=True,
            latitude=Decimal("51.5074"),
            longitude=Decimal("-0.1278"),
            timezone="Europe/London"
        )
        db_session.add(birth_data)
        db_session.commit()

        assert birth_data.is_time_known is False

    @pytest.mark.database
    def test_birth_data_validate_coordinates(self, db_session, sample_client):
        """Test coordinate validation"""
        valid_data = BirthData(
            client_id=sample_client.id,
            birth_date=date(2000, 1, 1),
            latitude=Decimal("40.7128"),
            longitude=Decimal("-74.0060"),
            timezone="America/New_York"
        )

        assert valid_data.validate_coordinates() is True

        # Invalid coordinates
        invalid_data = BirthData(
            client_id=sample_client.id,
            birth_date=date(2000, 1, 1),
            latitude=Decimal("100"),  # > 90
            longitude=Decimal("-74.0060"),
            timezone="America/New_York"
        )

        assert invalid_data.validate_coordinates() is False

    @pytest.mark.database
    def test_birth_data_location_string(self, db_session, sample_client):
        """Test location_string property"""
        birth_data = BirthData(
            client_id=sample_client.id,
            birth_date=date(2000, 1, 1),
            latitude=Decimal("40.7128"),
            longitude=Decimal("-74.0060"),
            timezone="America/New_York",
            city="New York",
            state_province="NY",
            country="USA"
        )

        assert "New York" in birth_data.location_string
        assert "USA" in birth_data.location_string


# =============================================================================
# Chart Model Tests
# =============================================================================

class TestChartModel:
    """Test Chart model"""

    @pytest.mark.database
    def test_create_chart(self, db_session, sample_user, sample_client, sample_birth_data):
        """Test creating a chart"""
        chart = Chart(
            user_id=sample_user.id,
            client_id=sample_client.id,
            birth_data_id=sample_birth_data.id,
            chart_type="natal",
            astro_system="western",
            house_system="placidus",
            zodiac_type="tropical",
            chart_data={
                "planets": {"sun": {"longitude": 294.5}},
                "houses": {"cusps": [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330]}
            }
        )
        db_session.add(chart)
        db_session.commit()

        assert chart.id is not None
        assert chart.chart_type == "natal"
        assert chart.chart_data is not None

    @pytest.mark.database
    def test_chart_get_planet_position(self, db_session, sample_user, sample_client, sample_birth_data):
        """Test getting planet position from chart data"""
        chart = Chart(
            user_id=sample_user.id,
            client_id=sample_client.id,
            birth_data_id=sample_birth_data.id,
            chart_type="natal",
            astro_system="western",
            chart_data={
                "planets": {
                    "sun": {"longitude": 294.5, "sign": 9},
                    "moon": {"longitude": 123.4, "sign": 4}
                }
            }
        )
        db_session.add(chart)
        db_session.commit()

        sun_pos = chart.get_planet_position("sun")
        assert sun_pos is not None
        assert sun_pos["longitude"] == 294.5

        mars_pos = chart.get_planet_position("mars")
        assert mars_pos is None

    @pytest.mark.database
    def test_chart_update_last_viewed(self, db_session, sample_user, sample_client, sample_birth_data):
        """Test updating last viewed timestamp"""
        chart = Chart(
            user_id=sample_user.id,
            client_id=sample_client.id,
            birth_data_id=sample_birth_data.id,
            chart_type="natal",
            astro_system="western",
            chart_data={}
        )
        db_session.add(chart)
        db_session.commit()

        assert chart.last_viewed is None

        chart.update_last_viewed()
        db_session.commit()

        assert chart.last_viewed is not None


# =============================================================================
# UserPreferences Model Tests
# =============================================================================

class TestUserPreferencesModel:
    """Test UserPreferences model"""

    @pytest.mark.database
    def test_create_user_preferences(self, db_session, sample_user):
        """Test creating user preferences"""
        prefs = UserPreferences(
            user_id=sample_user.id,
            default_house_system="koch",
            aspect_orbs={"conjunction": 10, "trine": 8}
        )
        db_session.add(prefs)
        db_session.commit()

        assert prefs.id is not None
        assert prefs.default_house_system == "koch"

    @pytest.mark.database
    def test_preferences_get_aspect_orb(self, db_session, sample_user):
        """Test getting aspect orb"""
        prefs = UserPreferences(
            user_id=sample_user.id,
            aspect_orbs={"conjunction": 10.5, "trine": 8.0}
        )
        db_session.add(prefs)
        db_session.commit()

        assert prefs.get_aspect_orb("conjunction") == 10.5
        assert prefs.get_aspect_orb("square") is None

    @pytest.mark.database
    def test_preferences_set_aspect_orb(self, db_session, sample_user):
        """Test setting aspect orb"""
        prefs = UserPreferences(user_id=sample_user.id)
        db_session.add(prefs)
        db_session.commit()

        prefs.set_aspect_orb("trine", 7.5)
        assert prefs.aspect_orbs["trine"] == 7.5


# =============================================================================
# Cascade Delete Tests
# =============================================================================

class TestCascadeDeletes:
    """Test cascade delete behavior"""

    @pytest.mark.database
    def test_delete_user_cascades(self, db_session, sample_user, sample_client):
        """Test that deleting user deletes related records"""
        client_id = sample_client.id

        # Delete user
        db_session.delete(sample_user)
        db_session.commit()

        # Client should be deleted
        client = db_session.query(Client).filter_by(id=client_id).first()
        assert client is None

    @pytest.mark.database
    def test_delete_client_cascades(self, db_session, sample_client, sample_birth_data):
        """Test that deleting client deletes birth data"""
        birth_data_id = sample_birth_data.id

        # Delete client
        db_session.delete(sample_client)
        db_session.commit()

        # Birth data should be deleted
        birth_data = db_session.query(BirthData).filter_by(id=birth_data_id).first()
        assert birth_data is None


# =============================================================================
# Timestamp Tests
# =============================================================================

class TestTimestamps:
    """Test automatic timestamps"""

    @pytest.mark.database
    def test_created_at_auto_set(self, db_session):
        """Test that created_at is automatically set"""
        user = User(
            email="timestamp@example.com",
            password_hash="hash"
        )
        db_session.add(user)
        db_session.commit()

        assert user.created_at is not None
        assert isinstance(user.created_at, datetime)

    @pytest.mark.database
    def test_updated_at_auto_set(self, db_session):
        """Test that updated_at is automatically set"""
        user = User(
            email="update@example.com",
            password_hash="hash"
        )
        db_session.add(user)
        db_session.commit()

        original_updated = user.updated_at

        # Update user
        user.full_name = "Updated Name"
        db_session.commit()

        # updated_at should change
        assert user.updated_at != original_updated


# =============================================================================
# Model Method Tests
# =============================================================================

class TestModelMethods:
    """Test model helper methods"""

    @pytest.mark.database
    def test_to_dict_method(self, db_session, sample_user):
        """Test to_dict method"""
        user_dict = sample_user.to_dict()

        assert isinstance(user_dict, dict)
        assert "email" in user_dict
        assert user_dict["email"] == sample_user.email
        # UUID should be converted to string
        assert isinstance(user_dict["id"], str)

    @pytest.mark.database
    def test_repr_methods(self, db_session, sample_user, sample_client):
        """Test __repr__ methods"""
        user_repr = repr(sample_user)
        assert "User" in user_repr
        assert str(sample_user.id) in user_repr

        client_repr = repr(sample_client)
        assert "Client" in client_repr
