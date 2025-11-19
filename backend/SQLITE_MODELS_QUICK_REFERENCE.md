# SQLite Models Quick Reference

Fast reference for using the SQLite database models in TheProgram.

## Import Models

```python
from app.models_sqlite import (
    # Singletons
    AppConfig, UserPreferences,

    # Data models
    Client, BirthData, Chart,
    ChartInterpretation, Interpretation,
    AspectPattern, TransitEvent, SessionNote,
    LocationCache
)

from app.core.database_sqlite import get_db, init_db
```

## Database Session

```python
# In FastAPI endpoints
from fastapi import Depends
from sqlalchemy.orm import Session
from app.core.database_sqlite import get_db

@app.get("/clients")
def get_clients(db: Session = Depends(get_db)):
    return db.query(Client).all()
```

```python
# In scripts/services
from app.core.database_sqlite import DatabaseSession

with DatabaseSession() as db:
    client = db.query(Client).first()
    print(client.full_name)
```

## Common Queries

### Get Singletons

```python
# Always id='1' for singletons
config = db.query(AppConfig).filter_by(id='1').first()
prefs = db.query(UserPreferences).filter_by(id='1').first()
```

### Create Client

```python
client = Client(
    first_name="John",
    last_name="Doe",
    email="john@example.com",
    phone="+1-555-0123",
    notes="New client from referral"
)
db.add(client)
db.commit()
db.refresh(client)  # Get ID and timestamps
```

### Create Birth Data

```python
birth_data = BirthData(
    client_id=client.id,
    birth_date="1990-01-15",          # ISO 8601: YYYY-MM-DD
    birth_time="14:30:00",            # ISO 8601: HH:MM:SS
    time_unknown=False,
    latitude=40.7128,
    longitude=-74.0060,
    timezone="America/New_York",      # IANA timezone
    city="New York",
    state_province="NY",
    country="USA",
    rodden_rating="A"
)
db.add(birth_data)
db.commit()
```

### Create Chart

```python
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
            'sun': {'longitude': 294.5, 'sign': 9, 'house': 10},
            'moon': {'longitude': 120.0, 'sign': 3, 'house': 4}
        },
        'houses': {
            'cusps': [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330],
            'ascendant': 0.0,
            'mc': 270.0
        },
        'aspects': [
            {
                'planet1': 'sun',
                'planet2': 'moon',
                'type': 'trine',
                'orb': 5.5
            }
        ]
    },
    calculation_params={
        'node_type': 'true',
        'include_asteroids': True
    }
)
db.add(chart)
db.commit()
```

### Query with Relationships

```python
# Get client with all birth data
client = db.query(Client).filter_by(id=client_id).first()
for bd in client.birth_data:
    print(f"Birth: {bd.birth_date} in {bd.location_string}")

# Get chart with interpretations
chart = db.query(Chart).filter_by(id=chart_id).first()
for interp in chart.interpretations:
    print(f"{interp.element_type}: {interp.preview_text}")
```

### Update Records

```python
# Method 1: Direct attribute assignment
client = db.query(Client).filter_by(id=client_id).first()
client.email = "newemail@example.com"
db.commit()

# Method 2: Using update_from_dict
client.update_from_dict({
    'email': 'newemail@example.com',
    'phone': '+1-555-9999'
})
db.commit()
```

### Delete with Cascade

```python
# Delete client - automatically deletes all related records
client = db.query(Client).filter_by(id=client_id).first()
db.delete(client)
db.commit()

# This will cascade delete:
# - All BirthData records for this client
# - All Charts for this client
# - All SessionNotes for this client
# - All ChartInterpretations for those charts
# - All AspectPatterns for those charts
# - All TransitEvents for those charts
```

## Model Properties

### Client

```python
client.full_name              # "John Doe"
client.to_dict()              # Dict with all fields + full_name
```

### BirthData

```python
birth_data.location_string    # "New York, NY, USA"
birth_data.coordinates_string # "40.71°N, 74.01°W"
birth_data.has_time           # True if time is known
```

### Chart

```python
chart.display_name            # Chart name or default based on type
chart.planets                 # Dict of planet data from chart_data
chart.houses                  # Dict of house data from chart_data
chart.aspects                 # List of aspects from chart_data
```

### ChartInterpretation

```python
interp.is_pending             # True if status is 'pending'
interp.is_approved_status     # True if status is 'approved'
interp.preview_text           # First 100 chars of description
```

### AspectPattern

```python
pattern.planet_count          # Number of planets involved
pattern.planet_names_string   # "Sun, Moon, Jupiter"
```

### TransitEvent

```python
event.description             # "Jupiter trine Sun"
event.is_exact                # True if orb <= 1.0
event.direction_string        # "applying", "separating", or "exact"
```

## JSON Fields

JSON fields are automatically serialized/deserialized:

```python
# Writing JSON
chart.chart_data = {
    'planets': {...},
    'aspects': [...]
}
db.commit()

# Reading JSON
planets = chart.chart_data['planets']
sun_longitude = chart.chart_data['planets']['sun']['longitude']

# JSON arrays
pattern.planets_involved = ["sun", "moon", "jupiter"]
db.commit()

# Later...
for planet in pattern.planets_involved:
    print(planet)  # "sun", "moon", "jupiter"
```

## Filtering and Search

```python
# By exact match
clients = db.query(Client).filter_by(last_name="Doe").all()

# By date range
from datetime import date
charts = db.query(Chart).filter(
    Chart.created_at >= "2025-01-01"
).all()

# With relationships (eager loading)
from sqlalchemy.orm import joinedload

client = db.query(Client).options(
    joinedload(Client.birth_data),
    joinedload(Client.charts)
).filter_by(id=client_id).first()

# Count
chart_count = db.query(Chart).filter_by(client_id=client_id).count()

# Order by
recent_charts = db.query(Chart).order_by(Chart.created_at.desc()).limit(10).all()
```

## Validation

### Coordinate Constraints

```python
# These will raise exceptions:
birth_data.latitude = 100.0   # Must be -90 to 90
birth_data.longitude = 200.0  # Must be -180 to 180
```

### Singleton Enforcement

```python
# Only id='1' allowed for singletons
config = AppConfig(id='1')     # OK
config = AppConfig(id='2')     # Will fail CHECK constraint
```

### Foreign Key Constraints

```python
# Foreign keys are enforced
chart = Chart(
    client_id="non-existent-uuid",  # Will fail on commit
    birth_data_id=birth_data.id,
    ...
)
db.add(chart)
db.commit()  # Raises IntegrityError
```

## Data Types Reference

| Model Field | Python Type | SQLite Type | Notes |
|-------------|-------------|-------------|-------|
| id | str | TEXT | UUID as string |
| created_at | str | TEXT | ISO 8601 datetime |
| updated_at | str | TEXT | ISO 8601 datetime |
| chart_data | dict | TEXT | JSON as string |
| planets_involved | list | TEXT | JSON array as string |
| latitude | float | REAL | -90 to 90 |
| longitude | float | REAL | -180 to 180 |
| time_unknown | bool | INTEGER | 0=False, 1=True |

## Database Initialization

```python
from app.core.database_sqlite import init_db, drop_db, check_db_connection

# First time setup
init_db()  # Creates tables and singleton records

# Reset database (DESTRUCTIVE!)
drop_db()
init_db()

# Health check
if check_db_connection():
    print("✓ Database ready")
    print(f"  Foreign keys: enabled")
    print(f"  Journal mode: WAL")
```

## Common Patterns

### Get or Create

```python
def get_or_create_client(db, email):
    client = db.query(Client).filter_by(email=email).first()
    if not client:
        client = Client(email=email)
        db.add(client)
        db.commit()
        db.refresh(client)
    return client
```

### Bulk Insert

```python
clients = [
    Client(first_name="John", last_name="Doe"),
    Client(first_name="Jane", last_name="Smith"),
    Client(first_name="Bob", last_name="Johnson")
]
db.bulk_save_objects(clients)
db.commit()
```

### Transaction Rollback

```python
try:
    client = Client(first_name="Test")
    db.add(client)
    db.commit()

    # Something goes wrong
    raise Exception("Oops!")

except Exception:
    db.rollback()  # Undo changes
    raise
```

## Chart Types Reference

Common values for `chart.chart_type`:

- `natal` - Birth chart
- `transit` - Current planetary positions
- `progressed` - Progressed chart
- `solar_return` - Solar return chart
- `synastry` - Relationship chart
- `composite` - Composite chart
- `horary` - Question chart

## House Systems Reference

Common values for `chart.house_system`:

- `placidus` - Placidus (most common)
- `koch` - Koch
- `whole_sign` - Whole Sign
- `equal` - Equal House
- `campanus` - Campanus
- `regiomontanus` - Regiomontanus

## Ayanamsa Reference (Vedic)

Common values for `chart.ayanamsa`:

- `lahiri` - Lahiri (most common)
- `raman` - Raman
- `krishnamurti` - KP
- `yukteshwar` - Yukteshwar

## Troubleshooting

### Foreign Keys Not Working

```python
# Make sure PRAGMA is set on connection
from app.core.database_sqlite import check_db_connection
check_db_connection()  # Will warn if FK not enabled
```

### JSON Not Deserializing

```python
# Make sure you're using the right column type
from app.core.json_helpers import JSONEncodedDict, JSONEncodedList

# Correct:
chart_data = Column(JSONEncodedDict)

# Wrong:
chart_data = Column(String)  # Will store as string, not deserialize
```

### Cascade Delete Not Working

```python
# Make sure relationship has cascade set
birth_data = relationship(
    'BirthData',
    back_populates='client',
    cascade='all, delete-orphan'  # Required!
)

# And foreign key has ondelete
client_id = Column(
    String,
    ForeignKey('clients.id', ondelete='CASCADE')  # Required!
)
```

---

**Quick Start**: Import models → Get session → Query/Create → Commit → Done!
