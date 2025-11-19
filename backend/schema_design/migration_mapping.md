# PostgreSQL to SQLite Migration Mapping

## Overview

This document details the complete mapping from the multi-user PostgreSQL schema to the single-user SQLite schema. It includes table mappings, field transformations, removed elements, and data transformation rules.

## Table-Level Changes

### Removed Tables

| PostgreSQL Table | Reason for Removal |
|-----------------|-------------------|
| `users` | Multi-user functionality removed. Authentication moved to `app_config` table. |

### Simplified Tables

| PostgreSQL Table | SQLite Table | Changes |
|-----------------|--------------|---------|
| `user_preferences` | `user_preferences` | Removed `user_id` foreign key. Now single-row table with `CHECK (id = 1)`. |

### New Tables

| SQLite Table | Purpose |
|--------------|---------|
| `app_config` | Stores application-level configuration including password hash. Single-row table. |

### Preserved Tables (with modifications)

| PostgreSQL Table | SQLite Table | Key Changes |
|-----------------|--------------|-------------|
| `clients` | `clients` | Removed `user_id` foreign key |
| `birth_data` | `birth_data` | UUID → TEXT, Date/Time → ISO 8601 TEXT, Numeric → REAL |
| `charts` | `charts` | Removed `user_id`, JSONB → TEXT (JSON string) |
| `chart_interpretations` | `chart_interpretations` | Removed implicit user ownership |
| `interpretations` | `interpretations` | Removed `user_id`, simplified to single ownership model |
| `aspect_patterns` | `aspect_patterns` | JSONB → TEXT |
| `transit_events` | `transit_events` | DateTime → ISO 8601 TEXT |
| `session_notes` | `session_notes` | Removed `user_id` |
| `location_cache` | `location_cache` | No ownership changes (shared resource) |

## Field-Level Mapping

### app_config (NEW)

| SQLite Field | Type | Source | Notes |
|--------------|------|--------|-------|
| `id` | INTEGER | N/A | Primary key, constrained to value 1 |
| `password_hash` | TEXT | `users.password_hash` | Nullable - no password if NULL |
| `app_version` | TEXT | N/A | New field for app versioning |
| `database_version` | INTEGER | N/A | New field for schema versioning |
| `created_at` | TEXT | N/A | ISO 8601 datetime |
| `updated_at` | TEXT | N/A | ISO 8601 datetime |

**Migration Rule**: Copy `password_hash` from the single user record in PostgreSQL `users` table.

### user_preferences

| SQLite Field | Type | PostgreSQL Field | Type Change | Notes |
|--------------|------|-----------------|-------------|-------|
| `id` | INTEGER | `id` (UUID) | UUID → INTEGER | Constrained to value 1 |
| `default_house_system` | TEXT | `default_house_system` | String → TEXT | Direct copy |
| `default_ayanamsa` | TEXT | `default_ayanamsa` | String → TEXT | Direct copy |
| `default_zodiac` | TEXT | `default_zodiac` | String → TEXT | Direct copy |
| `aspect_orbs` | TEXT | `aspect_orbs` | JSONB → TEXT | JSON.stringify() |
| `color_scheme` | TEXT | `color_scheme` | String → TEXT | Direct copy |
| `displayed_points` | TEXT | `displayed_points` | JSONB → TEXT | JSON.stringify() |
| `created_at` | TEXT | `created_at` | DateTime → TEXT | ISO 8601 format |
| `updated_at` | TEXT | `updated_at` | DateTime → TEXT | ISO 8601 format |

**Removed Fields**:
- `user_id` (UUID) - No longer needed in single-user model

**Migration Rule**: Copy preferences from the single user record, convert UUIDs to strings, serialize JSON fields.

### clients

| SQLite Field | Type | PostgreSQL Field | Type Change | Notes |
|--------------|------|-----------------|-------------|-------|
| `id` | TEXT | `id` | UUID → TEXT | Convert UUID to string |
| `first_name` | TEXT | `first_name` | String → TEXT | Direct copy |
| `last_name` | TEXT | `last_name` | String → TEXT | Direct copy |
| `email` | TEXT | `email` | String → TEXT | Direct copy |
| `phone` | TEXT | `phone` | String → TEXT | Direct copy |
| `notes` | TEXT | `notes` | Text → TEXT | Direct copy |
| `created_at` | TEXT | `created_at` | DateTime → TEXT | ISO 8601 format |
| `updated_at` | TEXT | `updated_at` | DateTime → TEXT | ISO 8601 format |

**Removed Fields**:
- `user_id` (UUID) - Multi-tenancy removed

**Migration Rule**:
```python
# Filter clients for the single user
clients = session.query(Client).filter_by(user_id=user.id).all()
for client in clients:
    sqlite_client = {
        'id': str(client.id),
        'first_name': client.first_name,
        'last_name': client.last_name,
        'email': client.email,
        'phone': client.phone,
        'notes': client.notes,
        'created_at': client.created_at.isoformat(),
        'updated_at': client.updated_at.isoformat()
    }
```

### birth_data

| SQLite Field | Type | PostgreSQL Field | Type Change | Notes |
|--------------|------|-----------------|-------------|-------|
| `id` | TEXT | `id` | UUID → TEXT | Convert UUID to string |
| `client_id` | TEXT | `client_id` | UUID → TEXT | Convert UUID to string |
| `birth_date` | TEXT | `birth_date` | Date → TEXT | Format: YYYY-MM-DD |
| `birth_time` | TEXT | `birth_time` | Time → TEXT | Format: HH:MM:SS or NULL |
| `time_unknown` | INTEGER | `time_unknown` | Boolean → INTEGER | 0=false, 1=true |
| `latitude` | REAL | `latitude` | Numeric(10,7) → REAL | Direct copy |
| `longitude` | REAL | `longitude` | Numeric(10,7) → REAL | Direct copy |
| `timezone` | TEXT | `timezone` | String → TEXT | Direct copy |
| `utc_offset` | INTEGER | `utc_offset` | Integer → INTEGER | Direct copy |
| `city` | TEXT | `city` | String → TEXT | Direct copy |
| `state_province` | TEXT | `state_province` | String → TEXT | Direct copy |
| `country` | TEXT | `country` | String → TEXT | Direct copy |
| `rodden_rating` | TEXT | `rodden_rating` | String → TEXT | Direct copy |
| `gender` | TEXT | `gender` | String → TEXT | Direct copy |
| `created_at` | TEXT | `created_at` | DateTime → TEXT | ISO 8601 format |
| `updated_at` | TEXT | `updated_at` | DateTime → TEXT | ISO 8601 format |

**Migration Rule**:
```python
sqlite_birth_data = {
    'id': str(birth_data.id),
    'client_id': str(birth_data.client_id),
    'birth_date': birth_data.birth_date.isoformat(),  # YYYY-MM-DD
    'birth_time': birth_data.birth_time.isoformat() if birth_data.birth_time else None,  # HH:MM:SS
    'time_unknown': 1 if birth_data.time_unknown else 0,
    'latitude': float(birth_data.latitude),
    'longitude': float(birth_data.longitude),
    'timezone': birth_data.timezone,
    'utc_offset': birth_data.utc_offset,
    'city': birth_data.city,
    'state_province': birth_data.state_province,
    'country': birth_data.country,
    'rodden_rating': birth_data.rodden_rating,
    'gender': birth_data.gender,
    'created_at': birth_data.created_at.isoformat(),
    'updated_at': birth_data.updated_at.isoformat()
}
```

### charts

| SQLite Field | Type | PostgreSQL Field | Type Change | Notes |
|--------------|------|-----------------|-------------|-------|
| `id` | TEXT | `id` | UUID → TEXT | Convert UUID to string |
| `client_id` | TEXT | `client_id` | UUID → TEXT | Convert UUID to string |
| `birth_data_id` | TEXT | `birth_data_id` | UUID → TEXT | Convert UUID to string |
| `chart_name` | TEXT | `chart_name` | String → TEXT | Direct copy |
| `chart_type` | TEXT | `chart_type` | String → TEXT | Direct copy |
| `astro_system` | TEXT | `astro_system` | String → TEXT | Direct copy |
| `house_system` | TEXT | `house_system` | String → TEXT | Direct copy |
| `ayanamsa` | TEXT | `ayanamsa` | String → TEXT | Direct copy |
| `zodiac_type` | TEXT | `zodiac_type` | String → TEXT | Direct copy |
| `calculation_params` | TEXT | `calculation_params` | JSONB → TEXT | JSON.stringify() |
| `chart_data` | TEXT | `chart_data` | JSONB → TEXT | JSON.stringify() |
| `last_viewed` | TEXT | `last_viewed` | DateTime → TEXT | ISO 8601 or NULL |
| `created_at` | TEXT | `created_at` | DateTime → TEXT | ISO 8601 format |
| `updated_at` | TEXT | `updated_at` | DateTime → TEXT | ISO 8601 format |

**Removed Fields**:
- `user_id` (UUID) - Multi-tenancy removed

**Migration Rule**:
```python
import json

sqlite_chart = {
    'id': str(chart.id),
    'client_id': str(chart.client_id) if chart.client_id else None,
    'birth_data_id': str(chart.birth_data_id),
    'chart_name': chart.chart_name,
    'chart_type': chart.chart_type,
    'astro_system': chart.astro_system,
    'house_system': chart.house_system,
    'ayanamsa': chart.ayanamsa,
    'zodiac_type': chart.zodiac_type,
    'calculation_params': json.dumps(chart.calculation_params) if chart.calculation_params else None,
    'chart_data': json.dumps(chart.chart_data),  # Required field
    'last_viewed': chart.last_viewed.isoformat() if chart.last_viewed else None,
    'created_at': chart.created_at.isoformat(),
    'updated_at': chart.updated_at.isoformat()
}
```

### chart_interpretations

| SQLite Field | Type | PostgreSQL Field | Type Change | Notes |
|--------------|------|-----------------|-------------|-------|
| `id` | TEXT | `id` | UUID → TEXT | Convert UUID to string |
| `chart_id` | TEXT | `chart_id` | UUID → TEXT | Convert UUID to string |
| `element_type` | TEXT | `element_type` | String → TEXT | Direct copy |
| `element_key` | TEXT | `element_key` | String → TEXT | Direct copy |
| `ai_description` | TEXT | `ai_description` | Text → TEXT | Direct copy |
| `ai_model` | TEXT | `ai_model` | String → TEXT | Direct copy |
| `ai_prompt_version` | TEXT | `ai_prompt_version` | String → TEXT | Direct copy |
| `version` | INTEGER | `version` | Integer → INTEGER | Direct copy |
| `is_approved` | TEXT | `is_approved` | String → TEXT | Direct copy |
| `created_at` | TEXT | `created_at` | DateTime → TEXT | ISO 8601 format |
| `updated_at` | TEXT | `updated_at` | DateTime → TEXT | ISO 8601 format |

**Migration Rule**: Direct copy with UUID/datetime conversions. No user filtering needed.

### interpretations

| SQLite Field | Type | PostgreSQL Field | Type Change | Notes |
|--------------|------|-----------------|-------------|-------|
| `id` | TEXT | `id` | UUID → TEXT | Convert UUID to string |
| `interpretation_type` | TEXT | `interpretation_type` | String → TEXT | Direct copy |
| `key_identifier` | TEXT | `key_identifier` | String → TEXT | Direct copy |
| `tradition` | TEXT | `tradition` | String → TEXT | Direct copy |
| `text_content` | TEXT | `text_content` | Text → TEXT | Direct copy |
| `source` | TEXT | `source` | String → TEXT | Direct copy |
| `is_user_custom` | INTEGER | `is_user_custom` | Boolean → INTEGER | 0=false, 1=true |
| `created_at` | TEXT | `created_at` | DateTime → TEXT | ISO 8601 format |
| `updated_at` | TEXT | `updated_at` | DateTime → TEXT | ISO 8601 format |

**Removed Fields**:
- `user_id` (UUID) - In single-user mode, all custom interpretations belong to "the user"

**Migration Rule**:
```python
# Migrate both default interpretations (user_id=NULL) and user's custom interpretations
interpretations = session.query(Interpretation).filter(
    (Interpretation.user_id == None) | (Interpretation.user_id == user.id)
).all()

for interp in interpretations:
    sqlite_interp = {
        'id': str(interp.id),
        'interpretation_type': interp.interpretation_type,
        'key_identifier': interp.key_identifier,
        'tradition': interp.tradition,
        'text_content': interp.text_content,
        'source': interp.source,
        'is_user_custom': 1 if interp.is_user_custom else 0,
        'created_at': interp.created_at.isoformat(),
        'updated_at': interp.updated_at.isoformat()
    }
```

### aspect_patterns

| SQLite Field | Type | PostgreSQL Field | Type Change | Notes |
|--------------|------|-----------------|-------------|-------|
| `id` | TEXT | `id` | UUID → TEXT | Convert UUID to string |
| `chart_id` | TEXT | `chart_id` | UUID → TEXT | Convert UUID to string |
| `pattern_type` | TEXT | `pattern_type` | String → TEXT | Direct copy |
| `planets_involved` | TEXT | `planets_involved` | JSONB → TEXT | JSON.stringify() |
| `description` | TEXT | `description` | Text → TEXT | Direct copy |
| `created_at` | TEXT | `created_at` | DateTime → TEXT | ISO 8601 format |
| `updated_at` | TEXT | `updated_at` | DateTime → TEXT | ISO 8601 format |

**Migration Rule**:
```python
import json

sqlite_pattern = {
    'id': str(pattern.id),
    'chart_id': str(pattern.chart_id),
    'pattern_type': pattern.pattern_type,
    'planets_involved': json.dumps(pattern.planets_involved),
    'description': pattern.description,
    'created_at': pattern.created_at.isoformat(),
    'updated_at': pattern.updated_at.isoformat()
}
```

### transit_events

| SQLite Field | Type | PostgreSQL Field | Type Change | Notes |
|--------------|------|-----------------|-------------|-------|
| `id` | TEXT | `id` | UUID → TEXT | Convert UUID to string |
| `chart_id` | TEXT | `chart_id` | UUID → TEXT | Convert UUID to string |
| `event_date` | TEXT | `event_date` | DateTime → TEXT | ISO 8601 datetime |
| `transiting_planet` | TEXT | `transiting_planet` | String → TEXT | Direct copy |
| `natal_planet` | TEXT | `natal_planet` | String → TEXT | Direct copy |
| `aspect_type` | TEXT | `aspect_type` | String → TEXT | Direct copy |
| `orb` | REAL | `orb` | Numeric(5,2) → REAL | Direct copy |
| `is_applying` | INTEGER | `is_applying` | Boolean → INTEGER | 1=true, 0=false, NULL=exact |
| `created_at` | TEXT | `created_at` | DateTime → TEXT | ISO 8601 format |
| `updated_at` | TEXT | `updated_at` | DateTime → TEXT | ISO 8601 format |

**Migration Rule**:
```python
sqlite_transit = {
    'id': str(transit.id),
    'chart_id': str(transit.chart_id),
    'event_date': transit.event_date.isoformat(),
    'transiting_planet': transit.transiting_planet,
    'natal_planet': transit.natal_planet,
    'aspect_type': transit.aspect_type,
    'orb': float(transit.orb) if transit.orb else None,
    'is_applying': 1 if transit.is_applying is True else (0 if transit.is_applying is False else None),
    'created_at': transit.created_at.isoformat(),
    'updated_at': transit.updated_at.isoformat()
}
```

### session_notes

| SQLite Field | Type | PostgreSQL Field | Type Change | Notes |
|--------------|------|-----------------|-------------|-------|
| `id` | TEXT | `id` | UUID → TEXT | Convert UUID to string |
| `client_id` | TEXT | `client_id` | UUID → TEXT | Convert UUID to string |
| `note_date` | TEXT | `note_date` | Date → TEXT | Format: YYYY-MM-DD |
| `note_content` | TEXT | `note_content` | Text → TEXT | Direct copy |
| `created_at` | TEXT | `created_at` | DateTime → TEXT | ISO 8601 format |
| `updated_at` | TEXT | `updated_at` | DateTime → TEXT | ISO 8601 format |

**Removed Fields**:
- `user_id` (UUID) - Multi-tenancy removed

**Migration Rule**:
```python
sqlite_note = {
    'id': str(note.id),
    'client_id': str(note.client_id),
    'note_date': note.note_date.isoformat(),  # YYYY-MM-DD
    'note_content': note.note_content,
    'created_at': note.created_at.isoformat(),
    'updated_at': note.updated_at.isoformat()
}
```

### location_cache

| SQLite Field | Type | PostgreSQL Field | Type Change | Notes |
|--------------|------|-----------------|-------------|-------|
| `id` | TEXT | `id` | UUID → TEXT | Convert UUID to string |
| `city_name` | TEXT | `city_name` | String → TEXT | Direct copy |
| `state_province` | TEXT | `state_province` | String → TEXT | Direct copy |
| `country` | TEXT | `country` | String → TEXT | Direct copy |
| `latitude` | REAL | `latitude` | Numeric(10,7) → REAL | Direct copy |
| `longitude` | REAL | `longitude` | Numeric(10,7) → REAL | Direct copy |
| `timezone` | TEXT | `timezone` | String → TEXT | Direct copy |
| `geonames_id` | INTEGER | `geonames_id` | Integer → INTEGER | Direct copy |
| `created_at` | TEXT | `created_at` | DateTime → TEXT | ISO 8601 format |
| `updated_at` | TEXT | `updated_at` | DateTime → TEXT | ISO 8601 format |

**Migration Rule**: Direct copy with type conversions. No filtering needed (shared resource).

## Data Type Conversion Rules

### UUID → TEXT
```python
# PostgreSQL UUID object
uuid_value = uuid.UUID('550e8400-e29b-41d4-a716-446655440000')

# SQLite TEXT
sqlite_value = str(uuid_value)  # '550e8400-e29b-41d4-a716-446655440000'
```

### DateTime → TEXT (ISO 8601)
```python
from datetime import datetime

# PostgreSQL DateTime
dt = datetime(2025, 11, 15, 14, 30, 45)

# SQLite TEXT
sqlite_value = dt.isoformat()  # '2025-11-15T14:30:45'
```

### Date → TEXT (ISO 8601)
```python
from datetime import date

# PostgreSQL Date
d = date(1990, 5, 15)

# SQLite TEXT
sqlite_value = d.isoformat()  # '1990-05-15'
```

### Time → TEXT (ISO 8601)
```python
from datetime import time

# PostgreSQL Time
t = time(14, 30, 0)

# SQLite TEXT
sqlite_value = t.isoformat()  # '14:30:00'
```

### Boolean → INTEGER
```python
# PostgreSQL Boolean
bool_value = True

# SQLite INTEGER
sqlite_value = 1 if bool_value else 0
```

### JSONB → TEXT
```python
import json

# PostgreSQL JSONB
jsonb_value = {"key": "value", "array": [1, 2, 3]}

# SQLite TEXT
sqlite_value = json.dumps(jsonb_value)  # '{"key": "value", "array": [1, 2, 3]}'
```

### Numeric → REAL
```python
from decimal import Decimal

# PostgreSQL Numeric
numeric_value = Decimal('123.4567890')

# SQLite REAL
sqlite_value = float(numeric_value)  # 123.456789
```

## Summary of Removed Fields

| Table | Removed Field | Reason |
|-------|--------------|--------|
| `clients` | `user_id` | Multi-tenancy removed |
| `birth_data` | N/A | None |
| `charts` | `user_id` | Multi-tenancy removed |
| `chart_interpretations` | N/A | None (user ownership implicit via chart) |
| `interpretations` | `user_id` | Single-user mode - all custom interpretations belong to "the user" |
| `aspect_patterns` | N/A | None (ownership implicit via chart) |
| `transit_events` | N/A | None (ownership implicit via chart) |
| `session_notes` | `user_id` | Multi-tenancy removed |
| `user_preferences` | `user_id` | Single-row table, no foreign key needed |

## Migration Example: Complete Flow

```python
import json
from datetime import datetime
import sqlite3
from sqlalchemy.orm import Session as PGSession

def migrate_user_data(pg_session: PGSession, user_id: str, sqlite_conn: sqlite3.Connection):
    """
    Migrate all data for a single user from PostgreSQL to SQLite
    """
    cursor = sqlite_conn.cursor()

    # 1. Get user and migrate password to app_config
    user = pg_session.query(User).filter_by(id=user_id).one()
    cursor.execute(
        "UPDATE app_config SET password_hash = ? WHERE id = 1",
        (user.password_hash,)
    )

    # 2. Migrate user preferences
    if user.preferences:
        prefs = user.preferences
        cursor.execute("""
            UPDATE user_preferences SET
                default_house_system = ?,
                default_ayanamsa = ?,
                default_zodiac = ?,
                aspect_orbs = ?,
                color_scheme = ?,
                displayed_points = ?
            WHERE id = 1
        """, (
            prefs.default_house_system,
            prefs.default_ayanamsa,
            prefs.default_zodiac,
            json.dumps(prefs.aspect_orbs) if prefs.aspect_orbs else None,
            prefs.color_scheme,
            json.dumps(prefs.displayed_points) if prefs.displayed_points else None
        ))

    # 3. Migrate clients
    clients = pg_session.query(Client).filter_by(user_id=user_id).all()
    for client in clients:
        cursor.execute("""
            INSERT INTO clients (id, first_name, last_name, email, phone, notes, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            str(client.id),
            client.first_name,
            client.last_name,
            client.email,
            client.phone,
            client.notes,
            client.created_at.isoformat(),
            client.updated_at.isoformat()
        ))

        # 4. Migrate birth data for this client
        birth_data_records = pg_session.query(BirthData).filter_by(client_id=client.id).all()
        for bd in birth_data_records:
            cursor.execute("""
                INSERT INTO birth_data (
                    id, client_id, birth_date, birth_time, time_unknown,
                    latitude, longitude, timezone, utc_offset,
                    city, state_province, country, rodden_rating, gender,
                    created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                str(bd.id),
                str(bd.client_id),
                bd.birth_date.isoformat(),
                bd.birth_time.isoformat() if bd.birth_time else None,
                1 if bd.time_unknown else 0,
                float(bd.latitude),
                float(bd.longitude),
                bd.timezone,
                bd.utc_offset,
                bd.city,
                bd.state_province,
                bd.country,
                bd.rodden_rating,
                bd.gender,
                bd.created_at.isoformat(),
                bd.updated_at.isoformat()
            ))

    # 5. Migrate charts (all charts for this user)
    charts = pg_session.query(Chart).filter_by(user_id=user_id).all()
    for chart in charts:
        cursor.execute("""
            INSERT INTO charts (
                id, client_id, birth_data_id, chart_name, chart_type,
                astro_system, house_system, ayanamsa, zodiac_type,
                calculation_params, chart_data, last_viewed,
                created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            str(chart.id),
            str(chart.client_id) if chart.client_id else None,
            str(chart.birth_data_id),
            chart.chart_name,
            chart.chart_type,
            chart.astro_system,
            chart.house_system,
            chart.ayanamsa,
            chart.zodiac_type,
            json.dumps(chart.calculation_params) if chart.calculation_params else None,
            json.dumps(chart.chart_data),
            chart.last_viewed.isoformat() if chart.last_viewed else None,
            chart.created_at.isoformat(),
            chart.updated_at.isoformat()
        ))

        # 6. Migrate chart interpretations
        interpretations = pg_session.query(ChartInterpretation).filter_by(chart_id=chart.id).all()
        for interp in interpretations:
            cursor.execute("""
                INSERT INTO chart_interpretations (
                    id, chart_id, element_type, element_key, ai_description,
                    ai_model, ai_prompt_version, version, is_approved,
                    created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                str(interp.id),
                str(interp.chart_id),
                interp.element_type,
                interp.element_key,
                interp.ai_description,
                interp.ai_model,
                interp.ai_prompt_version,
                interp.version,
                interp.is_approved,
                interp.created_at.isoformat(),
                interp.updated_at.isoformat()
            ))

        # 7. Migrate aspect patterns
        patterns = pg_session.query(AspectPattern).filter_by(chart_id=chart.id).all()
        for pattern in patterns:
            cursor.execute("""
                INSERT INTO aspect_patterns (
                    id, chart_id, pattern_type, planets_involved, description,
                    created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                str(pattern.id),
                str(pattern.chart_id),
                pattern.pattern_type,
                json.dumps(pattern.planets_involved),
                pattern.description,
                pattern.created_at.isoformat(),
                pattern.updated_at.isoformat()
            ))

        # 8. Migrate transit events
        transits = pg_session.query(TransitEvent).filter_by(chart_id=chart.id).all()
        for transit in transits:
            cursor.execute("""
                INSERT INTO transit_events (
                    id, chart_id, event_date, transiting_planet, natal_planet,
                    aspect_type, orb, is_applying, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                str(transit.id),
                str(transit.chart_id),
                transit.event_date.isoformat(),
                transit.transiting_planet,
                transit.natal_planet,
                transit.aspect_type,
                float(transit.orb) if transit.orb else None,
                1 if transit.is_applying is True else (0 if transit.is_applying is False else None),
                transit.created_at.isoformat(),
                transit.updated_at.isoformat()
            ))

    # 9. Migrate session notes
    notes = pg_session.query(SessionNote).filter_by(user_id=user_id).all()
    for note in notes:
        cursor.execute("""
            INSERT INTO session_notes (
                id, client_id, note_date, note_content, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            str(note.id),
            str(note.client_id),
            note.note_date.isoformat(),
            note.note_content,
            note.created_at.isoformat(),
            note.updated_at.isoformat()
        ))

    # 10. Migrate interpretations (default + user custom)
    interpretations = pg_session.query(Interpretation).filter(
        (Interpretation.user_id == None) | (Interpretation.user_id == user_id)
    ).all()
    for interp in interpretations:
        cursor.execute("""
            INSERT INTO interpretations (
                id, interpretation_type, key_identifier, tradition,
                text_content, source, is_user_custom, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            str(interp.id),
            interp.interpretation_type,
            interp.key_identifier,
            interp.tradition,
            interp.text_content,
            interp.source,
            1 if interp.is_user_custom else 0,
            interp.created_at.isoformat(),
            interp.updated_at.isoformat()
        ))

    # 11. Migrate location cache (shared, no filtering)
    locations = pg_session.query(LocationCache).all()
    for loc in locations:
        cursor.execute("""
            INSERT OR IGNORE INTO location_cache (
                id, city_name, state_province, country,
                latitude, longitude, timezone, geonames_id,
                created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            str(loc.id),
            loc.city_name,
            loc.state_province,
            loc.country,
            float(loc.latitude),
            float(loc.longitude),
            loc.timezone,
            loc.geonames_id,
            loc.created_at.isoformat(),
            loc.updated_at.isoformat()
        ))

    sqlite_conn.commit()
    print(f"Migration complete for user {user.email}")
```

## Before/After Example Data

### Before (PostgreSQL)

**users table:**
```
id: 550e8400-e29b-41d4-a716-446655440000
email: astrologer@example.com
password_hash: $2b$12$abcd...
full_name: Jane Astrologer
```

**clients table:**
```
id: 123e4567-e89b-12d3-a456-426614174000
user_id: 550e8400-e29b-41d4-a716-446655440000  ← REMOVED
first_name: John
last_name: Doe
```

**birth_data table:**
```
id: 789e4567-e89b-12d3-a456-426614174111
client_id: 123e4567-e89b-12d3-a456-426614174000
birth_date: 1990-05-15  (PostgreSQL Date type)
birth_time: 14:30:00  (PostgreSQL Time type)
latitude: 40.7128000  (Numeric(10,7))
created_at: 2025-01-10 15:30:45.123456  (DateTime)
```

### After (SQLite)

**app_config table:**
```
id: 1
password_hash: $2b$12$abcd...  ← FROM users table
app_version: 1.0.0
database_version: 1
```

**clients table:**
```
id: 123e4567-e89b-12d3-a456-426614174000  ← UUID as TEXT
                                          ← user_id REMOVED
first_name: John
last_name: Doe
```

**birth_data table:**
```
id: 789e4567-e89b-12d3-a456-426614174111  ← UUID as TEXT
client_id: 123e4567-e89b-12d3-a456-426614174000  ← UUID as TEXT
birth_date: 1990-05-15  ← ISO 8601 TEXT
birth_time: 14:30:00  ← ISO 8601 TEXT
latitude: 40.7128  ← REAL
created_at: 2025-01-10T15:30:45.123456  ← ISO 8601 TEXT
```

## Validation Checklist

After migration, verify:

- [ ] Password hash copied from users table to app_config
- [ ] User preferences copied and JSON fields serialized
- [ ] All clients for the user migrated (no user_id in SQLite)
- [ ] All birth_data records preserved with correct client_id references
- [ ] All charts migrated with JSON data properly serialized
- [ ] All chart interpretations preserved
- [ ] All interpretations (default + user custom) migrated
- [ ] All aspect patterns with JSON arrays serialized
- [ ] All transit events with correct datetime formatting
- [ ] All session notes migrated
- [ ] Location cache populated (shared resource)
- [ ] Foreign key constraints working (test with deletion)
- [ ] Timestamps in ISO 8601 format and parseable
- [ ] UUIDs as TEXT are valid UUID format
- [ ] No NULL values where NOT NULL specified
- [ ] Indexes created for performance
