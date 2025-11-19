# Database Layer Documentation - The Program

## Overview

Complete database layer implementation with SQLAlchemy ORM, Alembic migrations, and comprehensive test coverage for all astrological data models.

---

## 📊 Database Architecture

### Technology Stack

- **Database**: PostgreSQL 14+
- **ORM**: SQLAlchemy 2.0
- **Migrations**: Alembic
- **Connection Pooling**: Built-in SQLAlchemy pooling
- **Data Types**: PostgreSQL native types (UUID, JSONB, Numeric)

### Design Principles

1. **UUID Primary Keys** - Better for distributed systems, no sequential leakage
2. **JSONB for Flexibility** - Chart data stored as JSON for schema flexibility
3. **Cascading Deletes** - Automatic cleanup of related records
4. **Timestamps** - Automatic created_at/updated_at tracking
5. **Type Safety** - Strong typing with Python type hints

---

## 📁 Models Overview

### Core Models

| Model | Purpose | Key Fields |
|-------|---------|------------|
| **User** | Authentication & account management | email, password_hash, subscription_tier |
| **Client** | Client/customer records | first_name, last_name, user_id |
| **BirthData** | Birth information for calculations | birth_date, birth_time, latitude, longitude |
| **Chart** | Calculated astrological charts | chart_type, astro_system, chart_data (JSONB) |

### Supporting Models

| Model | Purpose | Key Fields |
|-------|---------|------------|
| **Interpretation** | Astrological interpretation texts | interpretation_type, key_identifier, text_content |
| **SessionNote** | Consultation session notes | note_date, note_content, client_id |
| **UserPreferences** | User default settings | default_house_system, aspect_orbs (JSONB) |
| **LocationCache** | Geocoded location cache | city_name, latitude, longitude, timezone |
| **AspectPattern** | Detected chart patterns | pattern_type, planets_involved (JSONB) |
| **TransitEvent** | Transit tracking | event_date, transiting_planet, aspect_type |

---

## 🔗 Relationships Diagram

```
User
├── clients (one-to-many)
│   ├── birth_data (one-to-many)
│   │   └── charts (one-to-many)
│   │       ├── aspect_patterns (one-to-many)
│   │       └── transit_events (one-to-many)
│   └── session_notes (one-to-many)
├── charts (one-to-many)
├── session_notes (one-to-many)
├── preferences (one-to-one)
└── custom_interpretations (one-to-many)
```

---

## 💾 Model Details

### User Model

**Purpose**: Authentication and user account management

**Fields**:
```python
id: UUID                    # Primary key
email: String(255)          # Unique, indexed
password_hash: String(255)  # Hashed password
full_name: String(255)      # Optional
business_name: String(255)  # Optional
is_active: Boolean          # Account active status
is_verified: Boolean        # Email verified
is_superuser: Boolean       # Admin privileges
subscription_tier: String   # free, pro, professional
last_login: DateTime        # Last login timestamp
created_at: DateTime        # Auto-generated
updated_at: DateTime        # Auto-updated
```

**Relationships**:
- `clients`: All clients belonging to this user
- `charts`: All charts created by this user
- `session_notes`: All session notes by this user
- `preferences`: User's default settings (one-to-one)
- `custom_interpretations`: User's custom interpretations

**Business Logic**:
- `is_premium` property: Checks if user has premium subscription
- `update_last_login()`: Updates last_login timestamp

---

### Client Model

**Purpose**: Store client/customer information

**Fields**:
```python
id: UUID                  # Primary key
user_id: UUID             # Foreign key to User
first_name: String(100)   # Optional
last_name: String(100)    # Optional
email: String(255)        # Optional
phone: String(50)         # Optional
notes: Text               # Free-form notes
created_at: DateTime      # Auto-generated
updated_at: DateTime      # Auto-updated
```

**Relationships**:
- `user`: The user who owns this client
- `birth_data`: Birth data records for this client
- `charts`: Charts for this client
- `session_notes`: Session notes for this client

**Business Logic**:
- `full_name` property: Concatenates first and last name
- `primary_birth_data` property: Gets first birth data record

---

### BirthData Model

**Purpose**: Store birth information for chart calculations

**Fields**:
```python
id: UUID                     # Primary key
client_id: UUID              # Foreign key to Client
birth_date: Date             # Birth date (required)
birth_time: Time             # Birth time (optional)
time_unknown: Boolean        # Flag for unknown time
latitude: Numeric(10,7)      # Geographic latitude (-90 to +90)
longitude: Numeric(10,7)     # Geographic longitude (-180 to +180)
timezone: String(100)        # IANA timezone name
utc_offset: Integer          # UTC offset in minutes
city: String(255)            # City name
state_province: String(255)  # State/province
country: String(100)         # Country
rodden_rating: String(2)     # Data quality (AA, A, B, C, DD, X)
gender: String(20)           # Optional
created_at: DateTime         # Auto-generated
updated_at: DateTime         # Auto-updated
```

**Relationships**:
- `client`: The client this birth data belongs to
- `charts`: Charts calculated from this birth data

**Business Logic**:
- `is_time_known` property: Checks if birth time is available
- `location_string` property: Formatted location string
- `data_quality` property: Human-readable Rodden rating
- `validate_coordinates()`: Validates lat/long ranges

**Rodden Ratings**:
- **AA**: Accurate (from birth certificate)
- **A**: Quoted (from birth certificate)
- **B**: Biography or autobiography
- **C**: Caution (no source)
- **DD**: Dirty data (conflicting sources)
- **X**: Time unknown

---

### Chart Model

**Purpose**: Store calculated astrological charts

**Fields**:
```python
id: UUID                      # Primary key
user_id: UUID                 # Foreign key to User
client_id: UUID               # Foreign key to Client (optional)
birth_data_id: UUID           # Foreign key to BirthData
chart_name: String(255)       # Custom name
chart_type: String(50)        # natal, transit, progressed, etc.
astro_system: String(50)      # western, vedic, human_design
house_system: String(50)      # placidus, koch, etc.
ayanamsa: String(50)          # lahiri, raman, etc. (for Vedic)
zodiac_type: String(50)       # tropical, sidereal
calculation_params: JSONB     # Additional parameters
chart_data: JSONB             # Calculated chart data
last_viewed: DateTime         # Last access timestamp
created_at: DateTime          # Auto-generated
updated_at: DateTime          # Auto-updated
```

**Chart Data Structure (JSONB)**:
```json
{
  "planets": {
    "sun": {"longitude": 294.5, "sign": 9, "retrograde": false, ...},
    "moon": {"longitude": 123.4, "sign": 4, ...},
    ...
  },
  "houses": {
    "cusps": [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330],
    "ascendant": 45.67,
    "mc": 135.89,
    ...
  },
  "aspects": [
    {"planet1": "sun", "planet2": "moon", "type": "trine", "orb": 2.5},
    ...
  ]
}
```

**Relationships**:
- `user`: User who created this chart
- `client`: Client this chart belongs to (optional)
- `birth_data`: Birth data used for calculation
- `aspect_patterns`: Detected aspect patterns
- `transit_events`: Tracked transit events

**Business Logic**:
- `display_name` property: Returns chart_name or default
- `update_last_viewed()`: Updates last_viewed timestamp
- `get_planet_position(planet)`: Retrieves planet data from JSONB
- `get_house_cusp(number)`: Gets specific house cusp
- `get_aspects(planet)`: Gets aspects, optionally filtered

---

### UserPreferences Model

**Purpose**: Store user's default chart preferences

**Fields**:
```python
id: UUID                        # Primary key
user_id: UUID                   # Foreign key to User (unique)
default_house_system: String    # Default house system
default_ayanamsa: String        # Default ayanamsa (Vedic)
default_zodiac: String          # tropical or sidereal
aspect_orbs: JSONB              # Custom aspect orbs
color_scheme: String            # light or dark
displayed_points: JSONB         # Array of points to display
updated_at: DateTime            # Auto-updated
```

**Aspect Orbs Structure (JSONB)**:
```json
{
  "conjunction": 10,
  "opposition": 10,
  "trine": 8,
  "square": 7,
  "sextile": 6
}
```

**Relationships**:
- `user`: User these preferences belong to (one-to-one)

**Business Logic**:
- `get_aspect_orb(type)`: Get orb for specific aspect
- `set_aspect_orb(type, orb)`: Set orb for specific aspect

---

## 🔧 Database Operations

### Creating Records

```python
from app.core.database import SessionLocal
from app.models import User

# Create session
db = SessionLocal()

# Create user
user = User(
    email="user@example.com",
    password_hash="hashed_password",
    full_name="John Doe"
)
db.add(user)
db.commit()
db.refresh(user)  # Get updated fields (id, timestamps)
```

### Querying Records

```python
# Get by ID
user = db.query(User).filter(User.id == user_id).first()

# Get by email
user = db.query(User).filter(User.email == "user@example.com").first()

# Get all
users = db.query(User).all()

# With pagination
users = db.query(User).offset(0).limit(10).all()

# With filtering
active_users = db.query(User).filter(User.is_active == True).all()
```

### Updating Records

```python
user = db.query(User).filter(User.id == user_id).first()
user.full_name = "Updated Name"
db.commit()
```

### Deleting Records

```python
user = db.query(User).filter(User.id == user_id).first()
db.delete(user)
db.commit()
# All related records will be cascade deleted
```

### Using Relationships

```python
# Access related records
user = db.query(User).filter(User.id == user_id).first()
clients = user.clients.all()  # Get all clients

client = clients[0]
birth_data = client.birth_data.first()  # Get first birth data
charts = birth_data.charts.all()  # Get all charts
```

---

## 🔄 Database Migrations with Alembic

### Initial Setup

```bash
# Alembic is already configured
# Configuration files:
# - alembic.ini
# - alembic/env.py
# - alembic/script.py.mako
```

### Creating Migrations

```bash
# Auto-generate migration from model changes
alembic revision --autogenerate -m "Description of changes"

# Create empty migration (for data migrations)
alembic revision -m "Add default interpretations"
```

### Applying Migrations

```bash
# Upgrade to latest
alembic upgrade head

# Upgrade to specific version
alembic upgrade abc123

# Downgrade one version
alembic downgrade -1

# Downgrade to specific version
alembic downgrade abc123

# Show current version
alembic current

# Show migration history
alembic history
```

### Migration File Structure

```python
"""Add user preferences

Revision ID: abc123
Revises: def456
Create Date: 2025-10-19 12:00:00
"""

def upgrade():
    # SQL for upgrading
    op.create_table(
        'user_preferences',
        sa.Column('id', UUID(), nullable=False),
        ...
    )

def downgrade():
    # SQL for downgrading
    op.drop_table('user_preferences')
```

---

## 🧪 Testing Database Models

### Test Configuration

```python
@pytest.fixture(scope="function")
def db_session():
    """Create test database session"""
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)
```

### Example Tests

```python
def test_create_user(db_session):
    """Test creating a user"""
    user = User(
        email="test@example.com",
        password_hash="hashed"
    )
    db_session.add(user)
    db_session.commit()

    assert user.id is not None
    assert user.email == "test@example.com"
    assert user.created_at is not None
```

### Running Tests

```bash
# Run all database tests
pytest tests/test_models/ -v

# Run with database marker
pytest -m database

# With coverage
pytest tests/test_models/ --cov=app.models
```

---

## 🔒 Security Considerations

### Sensitive Data

1. **Password Storage**
   - Never store plain passwords
   - Use bcrypt or argon2 for hashing
   - Store only hashed passwords

2. **Birth Data Encryption** (Future Enhancement)
   - Consider encrypting latitude/longitude
   - Encrypt personal details (name, email)
   - Use application-level encryption

3. **Database Access**
   - Use connection pooling
   - Limit connection count
   - Use read-only users for reports

### SQL Injection Prevention

- ✅ **SQLAlchemy ORM**: Automatic parameterization
- ✅ **No Raw SQL**: Use ORM methods
- ✅ **Validated Input**: Pydantic schemas validate input

---

## 📊 Performance Optimization

### Indexes

Current indexes:
- `users.email` - Unique index for login
- `clients.user_id` - Foreign key index
- `birth_data.client_id` - Foreign key index
- `birth_data.birth_date` - Date filtering
- `charts.user_id`, `charts.client_id`, `charts.chart_type` - Filtering
- `transit_events.event_date` - Date range queries
- Composite index on `location_cache(city_name, country)`

### Query Optimization

```python
# Bad: N+1 query problem
users = db.query(User).all()
for user in users:
    clients = user.clients.all()  # Separate query per user

# Good: Eager loading
from sqlalchemy.orm import joinedload

users = db.query(User).options(joinedload(User.clients)).all()
for user in users:
    clients = user.clients  # No additional query
```

### Connection Pooling

```python
# Configured in app/core/database.py
engine = create_engine(
    DATABASE_URL,
    pool_size=20,        # Number of persistent connections
    max_overflow=10,     # Additional connections when busy
    pool_pre_ping=True   # Verify connections before use
)
```

---

## 🚀 Usage Examples

### Complete Workflow Example

```python
from app.core.database import SessionLocal
from app.models import User, Client, BirthData, Chart
from datetime import date, time
from decimal import Decimal

# Create session
db = SessionLocal()

try:
    # 1. Create user
    user = User(
        email="astrologer@example.com",
        password_hash="hashed_password",
        full_name="Professional Astrologer"
    )
    db.add(user)
    db.commit()

    # 2. Create client
    client = Client(
        user_id=user.id,
        first_name="Jane",
        last_name="Doe",
        email="jane@example.com"
    )
    db.add(client)
    db.commit()

    # 3. Add birth data
    birth_data = BirthData(
        client_id=client.id,
        birth_date=date(1990, 1, 15),
        birth_time=time(14, 30),
        latitude=Decimal("40.7128"),
        longitude=Decimal("-74.0060"),
        timezone="America/New_York",
        city="New York",
        country="USA",
        rodden_rating="AA"
    )
    db.add(birth_data)
    db.commit()

    # 4. Create chart
    chart = Chart(
        user_id=user.id,
        client_id=client.id,
        birth_data_id=birth_data.id,
        chart_type="natal",
        astro_system="western",
        house_system="placidus",
        zodiac_type="tropical",
        chart_data={
            "planets": {"sun": {"longitude": 294.5, "sign": 9}},
            "houses": {"cusps": [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330]}
        }
    )
    db.add(chart)
    db.commit()

    print(f"Created chart {chart.id} for client {client.full_name}")

finally:
    db.close()
```

---

## 📚 Additional Resources

### Documentation
- **SQLAlchemy**: https://docs.sqlalchemy.org/
- **Alembic**: https://alembic.sqlalchemy.org/
- **PostgreSQL**: https://www.postgresql.org/docs/

### Related Files
- `app/core/database.py` - Database connection
- `app/models/` - All model definitions
- `alembic/` - Migration scripts
- `tests/test_models/` - Model tests

---

**Database Layer Status**: ✅ Complete
**Last Updated**: October 19, 2025
**Models**: 10 core models
**Relationships**: Fully mapped
**Migrations**: Configured
**Tests**: Comprehensive coverage
