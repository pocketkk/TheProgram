# SQLite Schema Diagram

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       SINGLE-USER SQLITE SCHEMA                             │
│                     (All data owned by "the user")                          │
└─────────────────────────────────────────────────────────────────────────────┘


┌──────────────────────────┐
│     app_config           │  ← SINGLETON (id constrained to 1)
├──────────────────────────┤
│ PK  id: INTEGER (=1)     │
│     password_hash: TEXT  │
│     app_version: TEXT    │
│     database_version: INT│
│     created_at: TEXT     │
│     updated_at: TEXT     │
└──────────────────────────┘


┌────────────────────────────┐
│   user_preferences         │  ← SINGLETON (id constrained to 1)
├────────────────────────────┤
│ PK  id: INTEGER (=1)       │
│     default_house_system   │
│     default_ayanamsa       │
│     default_zodiac         │
│     aspect_orbs (JSON)     │
│     color_scheme           │
│     displayed_points (JSON)│
│     created_at: TEXT       │
│     updated_at: TEXT       │
└────────────────────────────┘


┌────────────────────────────┐
│       clients              │
├────────────────────────────┤
│ PK  id: TEXT (UUID)        │
│     first_name: TEXT       │
│     last_name: TEXT        │
│     email: TEXT            │
│     phone: TEXT            │
│     notes: TEXT            │
│     created_at: TEXT       │
│     updated_at: TEXT       │
└────────────────────────────┘
             │
             │ 1:N
             ▼
┌────────────────────────────┐
│      birth_data            │
├────────────────────────────┤
│ PK  id: TEXT (UUID)        │
│ FK  client_id: TEXT ───────┼── ON DELETE CASCADE
│     birth_date: TEXT       │
│     birth_time: TEXT       │
│     time_unknown: INTEGER  │
│     latitude: REAL         │
│     longitude: REAL        │
│     timezone: TEXT         │
│     utc_offset: INTEGER    │
│     city: TEXT             │
│     state_province: TEXT   │
│     country: TEXT          │
│     rodden_rating: TEXT    │
│     gender: TEXT           │
│     created_at: TEXT       │
│     updated_at: TEXT       │
└────────────────────────────┘
             │
             │ 1:N
             ▼
┌────────────────────────────────────┐
│          charts                    │
├────────────────────────────────────┤
│ PK  id: TEXT (UUID)                │
│ FK  client_id: TEXT ───────────────┼── ON DELETE CASCADE (nullable)
│ FK  birth_data_id: TEXT ───────────┼── ON DELETE CASCADE
│     chart_name: TEXT               │
│     chart_type: TEXT               │
│     astro_system: TEXT             │
│     house_system: TEXT             │
│     ayanamsa: TEXT                 │
│     zodiac_type: TEXT              │
│     calculation_params: TEXT (JSON)│
│     chart_data: TEXT (JSON)        │
│     last_viewed: TEXT              │
│     created_at: TEXT               │
│     updated_at: TEXT               │
└────────────────────────────────────┘
             │
             ├──────────────┬─────────────┬────────────────┐
             │              │             │                │
             │ 1:N          │ 1:N         │ 1:N            │ 1:N
             ▼              ▼             ▼                ▼
┌──────────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ chart_interpretations│  │ aspect_patterns  │  │  transit_events  │
├──────────────────────┤  ├──────────────────┤  ├──────────────────┤
│PK id: TEXT (UUID)    │  │PK id: TEXT (UUID)│  │PK id: TEXT (UUID)│
│FK chart_id: TEXT ────┼──│FK chart_id: TEXT─┼──│FK chart_id: TEXT─┼── CASCADE
│  element_type: TEXT  │  │  pattern_type    │  │  event_date      │
│  element_key: TEXT   │  │  planets_involved│  │  transiting_planet│
│  ai_description: TEXT│  │  (JSON)          │  │  natal_planet    │
│  ai_model: TEXT      │  │  description     │  │  aspect_type     │
│  ai_prompt_version   │  │  created_at      │  │  orb: REAL       │
│  version: INTEGER    │  │  updated_at      │  │  is_applying: INT│
│  is_approved: TEXT   │  └──────────────────┘  │  created_at      │
│  created_at: TEXT    │                        │  updated_at      │
│  updated_at: TEXT    │                        └──────────────────┘
└──────────────────────┘


┌────────────────────────────┐
│    clients (again)         │
└────────────────────────────┘
             │
             │ 1:N
             ▼
┌────────────────────────────┐
│     session_notes          │
├────────────────────────────┤
│ PK  id: TEXT (UUID)        │
│ FK  client_id: TEXT ───────┼── ON DELETE CASCADE
│     note_date: TEXT        │
│     note_content: TEXT     │
│     created_at: TEXT       │
│     updated_at: TEXT       │
└────────────────────────────┘


┌────────────────────────────┐
│    interpretations         │  ← SHARED RESOURCE (no ownership)
├────────────────────────────┤    Contains both default and custom
│ PK  id: TEXT (UUID)        │    interpretations
│     interpretation_type    │
│     key_identifier: TEXT   │
│     tradition: TEXT        │
│     text_content: TEXT     │
│     source: TEXT           │
│     is_user_custom: INT    │
│     created_at: TEXT       │
│     updated_at: TEXT       │
└────────────────────────────┘


┌────────────────────────────┐
│    location_cache          │  ← SHARED RESOURCE (no ownership)
├────────────────────────────┤    Cached geocoding results
│ PK  id: TEXT (UUID)        │
│     city_name: TEXT        │
│     state_province: TEXT   │
│     country: TEXT          │
│     latitude: REAL         │
│     longitude: REAL        │
│     timezone: TEXT         │
│     geonames_id: INTEGER   │
│     created_at: TEXT       │
│     updated_at: TEXT       │
└────────────────────────────┘
```

## Cascade Deletion Hierarchy

```
DELETE client
    ↓
    ├── Cascades to birth_data
    │       ↓
    │       └── Cascades to charts
    │               ↓
    │               ├── Cascades to chart_interpretations
    │               ├── Cascades to aspect_patterns
    │               └── Cascades to transit_events
    │
    └── Cascades to session_notes
```

## Detailed Table Structures

### Configuration & Preferences

#### app_config (SINGLETON)
```
┌──────────────────────┬──────────┬──────────┬─────────────────────┐
│ Column               │ Type     │ NULL     │ Notes               │
├──────────────────────┼──────────┼──────────┼─────────────────────┤
│ id                   │ INTEGER  │ NO       │ PK, CHECK (id = 1)  │
│ password_hash        │ TEXT     │ YES      │ Bcrypt hash         │
│ app_version          │ TEXT     │ NO       │ Default: '1.0.0'    │
│ database_version     │ INTEGER  │ NO       │ Default: 1          │
│ created_at           │ TEXT     │ NO       │ ISO 8601            │
│ updated_at           │ TEXT     │ NO       │ ISO 8601, trigger   │
└──────────────────────┴──────────┴──────────┴─────────────────────┘
```

#### user_preferences (SINGLETON)
```
┌──────────────────────┬──────────┬──────────┬─────────────────────┐
│ Column               │ Type     │ NULL     │ Notes               │
├──────────────────────┼──────────┼──────────┼─────────────────────┤
│ id                   │ INTEGER  │ NO       │ PK, CHECK (id = 1)  │
│ default_house_system │ TEXT     │ NO       │ Default: 'placidus' │
│ default_ayanamsa     │ TEXT     │ NO       │ Default: 'lahiri'   │
│ default_zodiac       │ TEXT     │ NO       │ Default: 'tropical' │
│ aspect_orbs          │ TEXT     │ YES      │ JSON: {aspect: orb} │
│ color_scheme         │ TEXT     │ NO       │ Default: 'light'    │
│ displayed_points     │ TEXT     │ YES      │ JSON: [planets]     │
│ created_at           │ TEXT     │ NO       │ ISO 8601            │
│ updated_at           │ TEXT     │ NO       │ ISO 8601, trigger   │
└──────────────────────┴──────────┴──────────┴─────────────────────┘
```

### Client Data

#### clients
```
┌──────────────────────┬──────────┬──────────┬─────────────────────┐
│ Column               │ Type     │ NULL     │ Notes               │
├──────────────────────┼──────────┼──────────┼─────────────────────┤
│ id                   │ TEXT     │ NO       │ PK, UUID as string  │
│ first_name           │ TEXT     │ YES      │                     │
│ last_name            │ TEXT     │ YES      │                     │
│ email                │ TEXT     │ YES      │                     │
│ phone                │ TEXT     │ YES      │                     │
│ notes                │ TEXT     │ YES      │                     │
│ created_at           │ TEXT     │ NO       │ ISO 8601            │
│ updated_at           │ TEXT     │ NO       │ ISO 8601, trigger   │
└──────────────────────┴──────────┴──────────┴─────────────────────┘

Indexes:
  - idx_clients_last_name ON (last_name)
  - idx_clients_created_at ON (created_at)
```

#### birth_data
```
┌──────────────────────┬──────────┬──────────┬─────────────────────┐
│ Column               │ Type     │ NULL     │ Notes               │
├──────────────────────┼──────────┼──────────┼─────────────────────┤
│ id                   │ TEXT     │ NO       │ PK, UUID as string  │
│ client_id            │ TEXT     │ NO       │ FK → clients(id)    │
│ birth_date           │ TEXT     │ NO       │ YYYY-MM-DD          │
│ birth_time           │ TEXT     │ YES      │ HH:MM:SS or NULL    │
│ time_unknown         │ INTEGER  │ NO       │ 0=false, 1=true     │
│ latitude             │ REAL     │ NO       │ -90 to +90          │
│ longitude            │ REAL     │ NO       │ -180 to +180        │
│ timezone             │ TEXT     │ NO       │ IANA timezone       │
│ utc_offset           │ INTEGER  │ YES      │ Minutes from UTC    │
│ city                 │ TEXT     │ YES      │                     │
│ state_province       │ TEXT     │ YES      │                     │
│ country              │ TEXT     │ YES      │                     │
│ rodden_rating        │ TEXT     │ YES      │ AA, A, B, C, DD, X  │
│ gender               │ TEXT     │ YES      │                     │
│ created_at           │ TEXT     │ NO       │ ISO 8601            │
│ updated_at           │ TEXT     │ NO       │ ISO 8601, trigger   │
└──────────────────────┴──────────┴──────────┴─────────────────────┘

Indexes:
  - idx_birth_data_client_id ON (client_id)
  - idx_birth_data_birth_date ON (birth_date)

Foreign Keys:
  - client_id → clients(id) ON DELETE CASCADE
```

### Chart Data

#### charts
```
┌──────────────────────┬──────────┬──────────┬─────────────────────┐
│ Column               │ Type     │ NULL     │ Notes               │
├──────────────────────┼──────────┼──────────┼─────────────────────┤
│ id                   │ TEXT     │ NO       │ PK, UUID as string  │
│ client_id            │ TEXT     │ YES      │ FK → clients(id)    │
│ birth_data_id        │ TEXT     │ NO       │ FK → birth_data(id) │
│ chart_name           │ TEXT     │ YES      │ Display name        │
│ chart_type           │ TEXT     │ NO       │ natal, transit, etc │
│ astro_system         │ TEXT     │ NO       │ western, vedic, etc │
│ house_system         │ TEXT     │ YES      │ placidus, koch, etc │
│ ayanamsa             │ TEXT     │ YES      │ For Vedic charts    │
│ zodiac_type          │ TEXT     │ NO       │ tropical, sidereal  │
│ calculation_params   │ TEXT     │ YES      │ JSON object         │
│ chart_data           │ TEXT     │ NO       │ JSON object         │
│ last_viewed          │ TEXT     │ YES      │ ISO 8601 datetime   │
│ created_at           │ TEXT     │ NO       │ ISO 8601            │
│ updated_at           │ TEXT     │ NO       │ ISO 8601, trigger   │
└──────────────────────┴──────────┴──────────┴─────────────────────┘

Indexes:
  - idx_charts_client_id ON (client_id)
  - idx_charts_birth_data_id ON (birth_data_id)
  - idx_charts_chart_type ON (chart_type)
  - idx_charts_created_at ON (created_at)

Foreign Keys:
  - client_id → clients(id) ON DELETE CASCADE
  - birth_data_id → birth_data(id) ON DELETE CASCADE
```

#### chart_interpretations
```
┌──────────────────────┬──────────┬──────────┬─────────────────────┐
│ Column               │ Type     │ NULL     │ Notes               │
├──────────────────────┼──────────┼──────────┼─────────────────────┤
│ id                   │ TEXT     │ NO       │ PK, UUID as string  │
│ chart_id             │ TEXT     │ NO       │ FK → charts(id)     │
│ element_type         │ TEXT     │ NO       │ planet, house, etc  │
│ element_key          │ TEXT     │ NO       │ sun, house_1, etc   │
│ ai_description       │ TEXT     │ NO       │ Generated text      │
│ ai_model             │ TEXT     │ YES      │ gpt-4, claude, etc  │
│ ai_prompt_version    │ TEXT     │ YES      │ Template version    │
│ version              │ INTEGER  │ NO       │ Default: 1          │
│ is_approved          │ TEXT     │ YES      │ pending, approved   │
│ created_at           │ TEXT     │ NO       │ ISO 8601            │
│ updated_at           │ TEXT     │ NO       │ ISO 8601, trigger   │
└──────────────────────┴──────────┴──────────┴─────────────────────┘

Indexes:
  - idx_chart_interpretations_chart_id ON (chart_id)
  - idx_chart_interpretations_element_type ON (element_type)
  - idx_chart_interpretations_lookup ON (chart_id, element_type, element_key)

Foreign Keys:
  - chart_id → charts(id) ON DELETE CASCADE
```

#### aspect_patterns
```
┌──────────────────────┬──────────┬──────────┬─────────────────────┐
│ Column               │ Type     │ NULL     │ Notes               │
├──────────────────────┼──────────┼──────────┼─────────────────────┤
│ id                   │ TEXT     │ NO       │ PK, UUID as string  │
│ chart_id             │ TEXT     │ NO       │ FK → charts(id)     │
│ pattern_type         │ TEXT     │ NO       │ grand_trine, etc    │
│ planets_involved     │ TEXT     │ NO       │ JSON array          │
│ description          │ TEXT     │ YES      │                     │
│ created_at           │ TEXT     │ NO       │ ISO 8601            │
│ updated_at           │ TEXT     │ NO       │ ISO 8601, trigger   │
└──────────────────────┴──────────┴──────────┴─────────────────────┘

Indexes:
  - idx_aspect_patterns_chart_id ON (chart_id)
  - idx_aspect_patterns_pattern_type ON (pattern_type)

Foreign Keys:
  - chart_id → charts(id) ON DELETE CASCADE
```

#### transit_events
```
┌──────────────────────┬──────────┬──────────┬─────────────────────┐
│ Column               │ Type     │ NULL     │ Notes               │
├──────────────────────┼──────────┼──────────┼─────────────────────┤
│ id                   │ TEXT     │ NO       │ PK, UUID as string  │
│ chart_id             │ TEXT     │ NO       │ FK → charts(id)     │
│ event_date           │ TEXT     │ NO       │ ISO 8601 datetime   │
│ transiting_planet    │ TEXT     │ NO       │ Planet name         │
│ natal_planet         │ TEXT     │ NO       │ Planet name         │
│ aspect_type          │ TEXT     │ NO       │ conjunction, etc    │
│ orb                  │ REAL     │ YES      │ Degrees             │
│ is_applying          │ INTEGER  │ YES      │ 1=yes, 0=no, NULL   │
│ created_at           │ TEXT     │ NO       │ ISO 8601            │
│ updated_at           │ TEXT     │ NO       │ ISO 8601, trigger   │
└──────────────────────┴──────────┴──────────┴─────────────────────┘

Indexes:
  - idx_transit_events_chart_id ON (chart_id)
  - idx_transit_events_event_date ON (event_date)
  - idx_transit_events_chart_date ON (chart_id, event_date)

Foreign Keys:
  - chart_id → charts(id) ON DELETE CASCADE
```

### Session & Interpretation Data

#### session_notes
```
┌──────────────────────┬──────────┬──────────┬─────────────────────┐
│ Column               │ Type     │ NULL     │ Notes               │
├──────────────────────┼──────────┼──────────┼─────────────────────┤
│ id                   │ TEXT     │ NO       │ PK, UUID as string  │
│ client_id            │ TEXT     │ NO       │ FK → clients(id)    │
│ note_date            │ TEXT     │ NO       │ YYYY-MM-DD          │
│ note_content         │ TEXT     │ YES      │                     │
│ created_at           │ TEXT     │ NO       │ ISO 8601            │
│ updated_at           │ TEXT     │ NO       │ ISO 8601, trigger   │
└──────────────────────┴──────────┴──────────┴─────────────────────┘

Indexes:
  - idx_session_notes_client_id ON (client_id)
  - idx_session_notes_note_date ON (note_date)

Foreign Keys:
  - client_id → clients(id) ON DELETE CASCADE
```

#### interpretations
```
┌──────────────────────┬──────────┬──────────┬─────────────────────┐
│ Column               │ Type     │ NULL     │ Notes               │
├──────────────────────┼──────────┼──────────┼─────────────────────┤
│ id                   │ TEXT     │ NO       │ PK, UUID as string  │
│ interpretation_type  │ TEXT     │ NO       │ planet_in_sign, etc │
│ key_identifier       │ TEXT     │ NO       │ sun_in_aries, etc   │
│ tradition            │ TEXT     │ YES      │ western, vedic, etc │
│ text_content         │ TEXT     │ NO       │ The interpretation  │
│ source               │ TEXT     │ YES      │ Book, author, etc   │
│ is_user_custom       │ INTEGER  │ NO       │ 0=default, 1=custom │
│ created_at           │ TEXT     │ NO       │ ISO 8601            │
│ updated_at           │ TEXT     │ NO       │ ISO 8601, trigger   │
└──────────────────────┴──────────┴──────────┴─────────────────────┘

Indexes:
  - idx_interpretations_type ON (interpretation_type)
  - idx_interpretations_key ON (key_identifier)
  - idx_interpretations_lookup ON (interpretation_type, key_identifier)
```

### Cache Data

#### location_cache
```
┌──────────────────────┬──────────┬──────────┬─────────────────────┐
│ Column               │ Type     │ NULL     │ Notes               │
├──────────────────────┼──────────┼──────────┼─────────────────────┤
│ id                   │ TEXT     │ NO       │ PK, UUID as string  │
│ city_name            │ TEXT     │ NO       │                     │
│ state_province       │ TEXT     │ YES      │                     │
│ country              │ TEXT     │ NO       │                     │
│ latitude             │ REAL     │ NO       │ -90 to +90          │
│ longitude            │ REAL     │ NO       │ -180 to +180        │
│ timezone             │ TEXT     │ NO       │ IANA timezone       │
│ geonames_id          │ INTEGER  │ YES      │ UNIQUE constraint   │
│ created_at           │ TEXT     │ NO       │ ISO 8601            │
│ updated_at           │ TEXT     │ NO       │ ISO 8601, trigger   │
└──────────────────────┴──────────┴──────────┴─────────────────────┘

Indexes:
  - idx_location_cache_city_country ON (city_name, country)
  - idx_location_cache_geonames ON (geonames_id)
```

## Key Design Patterns

### 1. Singleton Tables
Two tables use the singleton pattern with `CHECK (id = 1)`:
- `app_config` - Application-level configuration
- `user_preferences` - User's default preferences

### 2. UUID as TEXT
All entity IDs use UUID stored as TEXT for:
- Compatibility with existing PostgreSQL data
- Globally unique identifiers
- Easy data synchronization in future

### 3. JSON Storage
JSON data stored as TEXT strings in:
- `user_preferences.aspect_orbs`
- `user_preferences.displayed_points`
- `charts.calculation_params`
- `charts.chart_data`
- `aspect_patterns.planets_involved`

### 4. ISO 8601 Datetime Storage
All dates/times stored as TEXT in ISO 8601 format:
- Dates: `YYYY-MM-DD`
- Times: `HH:MM:SS`
- DateTimes: `YYYY-MM-DDTHH:MM:SS` or `YYYY-MM-DDTHH:MM:SS.ffffff`

### 5. Cascade Deletion
All foreign keys use `ON DELETE CASCADE` to maintain referential integrity:
- Deleting a client removes all their birth data, charts, and notes
- Deleting a chart removes all interpretations, patterns, and transit events

### 6. Auto-Update Triggers
Every table (except singletons) has an `updated_at` trigger that automatically updates the timestamp on any UPDATE operation.
