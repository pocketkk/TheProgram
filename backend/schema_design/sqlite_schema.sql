-- ============================================================================
-- SQLite Schema for Single-User Astrology Application
-- ============================================================================
-- Migrated from multi-user PostgreSQL to single-user SQLite
-- All user_id foreign keys removed - data implicitly owned by "the user"
-- UUID stored as TEXT, JSONB changed to TEXT (JSON strings)
-- ============================================================================

-- Enable foreign key constraints (MUST be run every time database is opened)
PRAGMA foreign_keys = ON;

-- Enable write-ahead logging for better performance
PRAGMA journal_mode = WAL;

-- ============================================================================
-- TABLE: app_config
-- Purpose: Store application-level configuration including password
-- Note: Single row table - contains ONE configuration record
-- ============================================================================
CREATE TABLE app_config (
    id INTEGER PRIMARY KEY CHECK (id = 1), -- Enforce single row

    -- Authentication
    password_hash TEXT,  -- NULL if no password set

    -- Application metadata
    app_version TEXT NOT NULL DEFAULT '1.0.0',
    database_version INTEGER NOT NULL DEFAULT 1,

    -- Timestamps
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Trigger to auto-update updated_at
CREATE TRIGGER app_config_updated_at
    AFTER UPDATE ON app_config
    FOR EACH ROW
BEGIN
    UPDATE app_config SET updated_at = datetime('now') WHERE id = 1;
END;

-- Insert default config row
INSERT INTO app_config (id) VALUES (1);

-- ============================================================================
-- TABLE: user_preferences
-- Purpose: Store user's default chart calculation settings
-- Note: Single row table - contains ONE preferences record
-- ============================================================================
CREATE TABLE user_preferences (
    id INTEGER PRIMARY KEY CHECK (id = 1), -- Enforce single row

    -- Default chart settings
    default_house_system TEXT NOT NULL DEFAULT 'placidus',
    default_ayanamsa TEXT NOT NULL DEFAULT 'lahiri',
    default_zodiac TEXT NOT NULL DEFAULT 'tropical',

    -- Aspect orbs (JSON string)
    -- Example: {"conjunction": 10, "opposition": 10, "trine": 8, "square": 8, "sextile": 6}
    aspect_orbs TEXT,

    -- Display preferences
    color_scheme TEXT NOT NULL DEFAULT 'light',

    -- Points to display (JSON array)
    -- Example: ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"]
    displayed_points TEXT,

    -- Timestamps
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Trigger to auto-update updated_at
CREATE TRIGGER user_preferences_updated_at
    AFTER UPDATE ON user_preferences
    FOR EACH ROW
BEGIN
    UPDATE user_preferences SET updated_at = datetime('now') WHERE id = 1;
END;

-- Insert default preferences row
INSERT INTO user_preferences (id) VALUES (1);

-- ============================================================================
-- TABLE: clients
-- Purpose: Store client information (even for single user, allows organizing multiple people's charts)
-- Note: Removed user_id foreign key - all clients belong to "the user"
-- ============================================================================
CREATE TABLE clients (
    id TEXT PRIMARY KEY,  -- UUID as TEXT

    -- Client information
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    phone TEXT,

    -- Notes
    notes TEXT,

    -- Timestamps
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Trigger to auto-update updated_at
CREATE TRIGGER clients_updated_at
    AFTER UPDATE ON clients
    FOR EACH ROW
BEGIN
    UPDATE clients SET updated_at = datetime('now') WHERE id = OLD.id;
END;

-- Indexes for common queries
CREATE INDEX idx_clients_last_name ON clients(last_name);
CREATE INDEX idx_clients_created_at ON clients(created_at);

-- ============================================================================
-- TABLE: birth_data
-- Purpose: Store birth information for chart calculations
-- Note: Removed user_id - implicit ownership through client relationship
-- ============================================================================
CREATE TABLE birth_data (
    id TEXT PRIMARY KEY,  -- UUID as TEXT

    -- Foreign key to client
    client_id TEXT NOT NULL,

    -- Birth date and time
    birth_date TEXT NOT NULL,  -- ISO 8601 date format: YYYY-MM-DD
    birth_time TEXT,           -- ISO 8601 time format: HH:MM:SS or NULL if unknown
    time_unknown INTEGER NOT NULL DEFAULT 0,  -- Boolean: 0=false, 1=true

    -- Location (decimal degrees)
    latitude REAL NOT NULL,   -- -90 to +90
    longitude REAL NOT NULL,  -- -180 to +180

    -- Timezone information
    timezone TEXT NOT NULL,     -- IANA timezone name (e.g., "America/New_York")
    utc_offset INTEGER,         -- Offset in minutes from UTC

    -- Location details
    city TEXT,
    state_province TEXT,
    country TEXT,

    -- Data quality (Rodden Rating)
    rodden_rating TEXT,
    -- AA = Accurate from birth certificate
    -- A = Quoted from birth certificate
    -- B = Biography or autobiography
    -- C = Caution, no source
    -- DD = Dirty data, conflicting sources
    -- X = Time unknown

    -- Additional information
    gender TEXT,

    -- Timestamps
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),

    -- Foreign key constraints
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

-- Trigger to auto-update updated_at
CREATE TRIGGER birth_data_updated_at
    AFTER UPDATE ON birth_data
    FOR EACH ROW
BEGIN
    UPDATE birth_data SET updated_at = datetime('now') WHERE id = OLD.id;
END;

-- Indexes for common queries
CREATE INDEX idx_birth_data_client_id ON birth_data(client_id);
CREATE INDEX idx_birth_data_birth_date ON birth_data(birth_date);

-- ============================================================================
-- TABLE: charts
-- Purpose: Store calculated astrological charts
-- Note: Removed user_id - implicit ownership, chart_data stored as JSON TEXT
-- ============================================================================
CREATE TABLE charts (
    id TEXT PRIMARY KEY,  -- UUID as TEXT

    -- Foreign keys
    client_id TEXT,        -- NULL for ephemeris or standalone charts
    birth_data_id TEXT NOT NULL,

    -- Chart metadata
    chart_name TEXT,       -- "Natal Chart", "Solar Return 2025", etc.
    chart_type TEXT NOT NULL,
    -- Chart types: natal, transit, progressed, synastry, composite, return, horary, etc.

    astro_system TEXT NOT NULL,
    -- Systems: western, vedic, human_design

    -- Calculation parameters
    house_system TEXT,     -- placidus, koch, whole_sign, equal, etc.
    ayanamsa TEXT,         -- lahiri, raman, etc. (for Vedic)
    zodiac_type TEXT NOT NULL DEFAULT 'tropical',  -- tropical, sidereal

    -- Additional calculation parameters (JSON string)
    -- Example: {"node_type": "true", "include_asteroids": true, "orbs": {...}}
    calculation_params TEXT,

    -- Calculated chart data (JSON string)
    -- Structure:
    -- {
    --   "planets": {"sun": {"longitude": 123.45, "sign": 4, "house": 1, ...}, ...},
    --   "houses": {"cusps": [0, 30, 60, ...], "ascendant": 45.67, "mc": 135.67},
    --   "aspects": [{"planet1": "sun", "planet2": "moon", "type": "trine", "orb": 2.5}],
    --   "patterns": [{"type": "grand_trine", "planets": ["sun", "moon", "jupiter"]}]
    -- }
    chart_data TEXT NOT NULL,

    -- Viewing tracking
    last_viewed TEXT,

    -- Timestamps
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),

    -- Foreign key constraints
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (birth_data_id) REFERENCES birth_data(id) ON DELETE CASCADE
);

-- Trigger to auto-update updated_at
CREATE TRIGGER charts_updated_at
    AFTER UPDATE ON charts
    FOR EACH ROW
BEGIN
    UPDATE charts SET updated_at = datetime('now') WHERE id = OLD.id;
END;

-- Indexes for common queries
CREATE INDEX idx_charts_client_id ON charts(client_id);
CREATE INDEX idx_charts_birth_data_id ON charts(birth_data_id);
CREATE INDEX idx_charts_chart_type ON charts(chart_type);
CREATE INDEX idx_charts_created_at ON charts(created_at);

-- ============================================================================
-- TABLE: chart_interpretations
-- Purpose: Store AI-generated interpretations for chart elements
-- Note: Removed user_id - all interpretations belong to charts owned by "the user"
-- ============================================================================
CREATE TABLE chart_interpretations (
    id TEXT PRIMARY KEY,  -- UUID as TEXT

    -- Foreign key to chart
    chart_id TEXT NOT NULL,

    -- Element identification
    element_type TEXT NOT NULL,
    -- Types: 'planet', 'house', 'aspect', 'pattern'

    element_key TEXT NOT NULL,
    -- Examples:
    --   planet: "sun", "moon", "mercury"
    --   house: "house_1", "house_2"
    --   aspect: "sun_trine_moon", "mars_square_saturn"
    --   pattern: "grand_trine_1", "t_square_1"

    -- AI-generated content
    ai_description TEXT NOT NULL,

    -- AI metadata
    ai_model TEXT,
    -- Examples: "gpt-4", "claude-3-opus", "custom"

    ai_prompt_version TEXT,
    -- Track which prompt template version was used

    -- Versioning
    version INTEGER NOT NULL DEFAULT 1,
    -- Increment when regenerating for the same element

    -- Quality/validation
    is_approved TEXT DEFAULT 'pending',
    -- Status: "pending", "approved", "rejected", "needs_review"

    -- Timestamps
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),

    -- Foreign key constraints
    FOREIGN KEY (chart_id) REFERENCES charts(id) ON DELETE CASCADE
);

-- Trigger to auto-update updated_at
CREATE TRIGGER chart_interpretations_updated_at
    AFTER UPDATE ON chart_interpretations
    FOR EACH ROW
BEGIN
    UPDATE chart_interpretations SET updated_at = datetime('now') WHERE id = OLD.id;
END;

-- Indexes for efficient lookups
CREATE INDEX idx_chart_interpretations_chart_id ON chart_interpretations(chart_id);
CREATE INDEX idx_chart_interpretations_element_type ON chart_interpretations(element_type);
CREATE INDEX idx_chart_interpretations_lookup ON chart_interpretations(chart_id, element_type, element_key);

-- ============================================================================
-- TABLE: interpretations
-- Purpose: Store reusable astrological interpretation templates
-- Note: Removed user_id - in single-user mode, all interpretations are "system" interpretations
--       User can customize any interpretation, no need for separate ownership
-- ============================================================================
CREATE TABLE interpretations (
    id TEXT PRIMARY KEY,  -- UUID as TEXT

    -- Type and identifier
    interpretation_type TEXT NOT NULL,
    -- Types: planet_in_sign, planet_in_house, aspect, house, nakshatra, gate, etc.

    key_identifier TEXT NOT NULL,
    -- Examples: "sun_in_aries", "sun_trine_moon", "gate_1", "moon_in_rohini"

    -- Tradition/system
    tradition TEXT,
    -- western, vedic, human_design

    -- Interpretation text
    text_content TEXT NOT NULL,

    -- Source attribution
    source TEXT,
    -- Book title, author, or "custom"

    -- Customization flag
    is_user_custom INTEGER NOT NULL DEFAULT 0,  -- Boolean: 0=default, 1=user-customized

    -- Timestamps
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Trigger to auto-update updated_at
CREATE TRIGGER interpretations_updated_at
    AFTER UPDATE ON interpretations
    FOR EACH ROW
BEGIN
    UPDATE interpretations SET updated_at = datetime('now') WHERE id = OLD.id;
END;

-- Indexes for lookups
CREATE INDEX idx_interpretations_type ON interpretations(interpretation_type);
CREATE INDEX idx_interpretations_key ON interpretations(key_identifier);
CREATE INDEX idx_interpretations_lookup ON interpretations(interpretation_type, key_identifier);

-- ============================================================================
-- TABLE: aspect_patterns
-- Purpose: Store auto-detected aspect patterns in charts
-- Note: No user_id needed - patterns belong to charts owned by "the user"
-- ============================================================================
CREATE TABLE aspect_patterns (
    id TEXT PRIMARY KEY,  -- UUID as TEXT

    -- Foreign key to chart
    chart_id TEXT NOT NULL,

    -- Pattern information
    pattern_type TEXT NOT NULL,
    -- Types: grand_trine, t_square, yod, grand_cross, kite, mystic_rectangle, stellium, etc.

    -- Planets involved (JSON array)
    -- Example: ["sun", "moon", "jupiter"]
    planets_involved TEXT NOT NULL,

    -- Description
    description TEXT,

    -- Timestamps
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),

    -- Foreign key constraints
    FOREIGN KEY (chart_id) REFERENCES charts(id) ON DELETE CASCADE
);

-- Trigger to auto-update updated_at
CREATE TRIGGER aspect_patterns_updated_at
    AFTER UPDATE ON aspect_patterns
    FOR EACH ROW
BEGIN
    UPDATE aspect_patterns SET updated_at = datetime('now') WHERE id = OLD.id;
END;

-- Indexes
CREATE INDEX idx_aspect_patterns_chart_id ON aspect_patterns(chart_id);
CREATE INDEX idx_aspect_patterns_pattern_type ON aspect_patterns(pattern_type);

-- ============================================================================
-- TABLE: transit_events
-- Purpose: Track transit aspects over time for notifications and search
-- Note: No user_id needed - transits belong to charts owned by "the user"
-- ============================================================================
CREATE TABLE transit_events (
    id TEXT PRIMARY KEY,  -- UUID as TEXT

    -- Foreign key to chart
    chart_id TEXT NOT NULL,

    -- Event timing
    event_date TEXT NOT NULL,  -- ISO 8601 datetime format

    -- Transit information
    transiting_planet TEXT NOT NULL,
    natal_planet TEXT NOT NULL,
    aspect_type TEXT NOT NULL,  -- conjunction, trine, square, opposition, sextile, etc.

    -- Orb and direction
    orb REAL,              -- Degrees
    is_applying INTEGER,   -- Boolean: 1=applying, 0=separating, NULL=exact

    -- Timestamps
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),

    -- Foreign key constraints
    FOREIGN KEY (chart_id) REFERENCES charts(id) ON DELETE CASCADE
);

-- Trigger to auto-update updated_at
CREATE TRIGGER transit_events_updated_at
    AFTER UPDATE ON transit_events
    FOR EACH ROW
BEGIN
    UPDATE transit_events SET updated_at = datetime('now') WHERE id = OLD.id;
END;

-- Indexes for efficient queries
CREATE INDEX idx_transit_events_chart_id ON transit_events(chart_id);
CREATE INDEX idx_transit_events_event_date ON transit_events(event_date);
CREATE INDEX idx_transit_events_chart_date ON transit_events(chart_id, event_date);

-- ============================================================================
-- TABLE: session_notes
-- Purpose: Store consultation session notes with clients
-- Note: Removed user_id - all sessions belong to "the user"
-- ============================================================================
CREATE TABLE session_notes (
    id TEXT PRIMARY KEY,  -- UUID as TEXT

    -- Foreign key to client
    client_id TEXT NOT NULL,

    -- Session information
    note_date TEXT NOT NULL,  -- ISO 8601 date format: YYYY-MM-DD
    note_content TEXT,

    -- Timestamps
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),

    -- Foreign key constraints
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

-- Trigger to auto-update updated_at
CREATE TRIGGER session_notes_updated_at
    AFTER UPDATE ON session_notes
    FOR EACH ROW
BEGIN
    UPDATE session_notes SET updated_at = datetime('now') WHERE id = OLD.id;
END;

-- Indexes
CREATE INDEX idx_session_notes_client_id ON session_notes(client_id);
CREATE INDEX idx_session_notes_note_date ON session_notes(note_date);

-- ============================================================================
-- TABLE: location_cache
-- Purpose: Cache geocoded locations to reduce API calls
-- Note: Shared resource, no user ownership needed
-- ============================================================================
CREATE TABLE location_cache (
    id TEXT PRIMARY KEY,  -- UUID as TEXT

    -- Location details
    city_name TEXT NOT NULL,
    state_province TEXT,
    country TEXT NOT NULL,

    -- Coordinates
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,

    -- Timezone
    timezone TEXT NOT NULL,

    -- External ID (from GeoNames or similar)
    geonames_id INTEGER UNIQUE,

    -- Timestamps
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Trigger to auto-update updated_at
CREATE TRIGGER location_cache_updated_at
    AFTER UPDATE ON location_cache
    FOR EACH ROW
BEGIN
    UPDATE location_cache SET updated_at = datetime('now') WHERE id = OLD.id;
END;

-- Indexes for location lookups
CREATE INDEX idx_location_cache_city_country ON location_cache(city_name, country);
CREATE INDEX idx_location_cache_geonames ON location_cache(geonames_id);

-- ============================================================================
-- VIEWS: Convenience views for common queries
-- ============================================================================

-- View: Full client information with birth data count
CREATE VIEW client_summary AS
SELECT
    c.id,
    c.first_name,
    c.last_name,
    c.email,
    c.phone,
    c.notes,
    c.created_at,
    c.updated_at,
    COUNT(DISTINCT bd.id) as birth_data_count,
    COUNT(DISTINCT ch.id) as chart_count
FROM clients c
LEFT JOIN birth_data bd ON bd.client_id = c.id
LEFT JOIN charts ch ON ch.client_id = c.id
GROUP BY c.id;

-- View: Recent charts with client info
CREATE VIEW recent_charts AS
SELECT
    ch.id,
    ch.chart_name,
    ch.chart_type,
    ch.astro_system,
    ch.created_at,
    ch.last_viewed,
    c.first_name || ' ' || COALESCE(c.last_name, '') as client_name,
    bd.birth_date,
    bd.city
FROM charts ch
LEFT JOIN clients c ON ch.client_id = c.id
LEFT JOIN birth_data bd ON ch.birth_data_id = bd.id
ORDER BY ch.created_at DESC;

-- ============================================================================
-- TABLE: content_preferences
-- Purpose: Store user content personalization settings for Cosmic Paper
-- Note: Single row table - contains ONE preferences record
-- ============================================================================
CREATE TABLE IF NOT EXISTS content_preferences (
    id TEXT PRIMARY KEY CHECK (id = '1'), -- Enforce single row

    -- Location (for weather)
    location_name TEXT,
    latitude REAL,
    longitude REAL,
    timezone TEXT,

    -- Topics & Interests (JSON array)
    -- Example: [{"topic": "technology", "weight": 1.0}]
    interests TEXT,

    -- Sports Preferences (JSON arrays)
    sports_teams TEXT,    -- [{"name": "Lakers", "league": "NBA", "sport": "basketball"}]
    sports_leagues TEXT,  -- ["NBA", "NFL"]

    -- RSS Feed Settings
    rss_categories TEXT,  -- ["news", "tech", "spiritual"]

    -- Content Filtering (JSON arrays)
    blocked_sources TEXT,
    blocked_keywords TEXT,
    prioritized_topics TEXT,

    -- Truth Algorithm Settings
    enable_truth_filter INTEGER NOT NULL DEFAULT 0,
    truth_focus_topics TEXT,      -- ["consciousness", "spirituality"]
    source_trust_levels TEXT,     -- {"nyt": 0.8, "guardian": 0.9}

    -- Display Preferences
    show_weather INTEGER NOT NULL DEFAULT 1,
    show_sports INTEGER NOT NULL DEFAULT 1,
    show_horoscope_context INTEGER NOT NULL DEFAULT 1,
    show_rss_content INTEGER NOT NULL DEFAULT 1,

    -- Custom Sections (JSON array)
    custom_sections TEXT,  -- [{"name": "My Tech", "topics": ["AI", "coding"]}]

    -- Timestamps
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Trigger to auto-update updated_at
CREATE TRIGGER IF NOT EXISTS content_preferences_updated_at
    AFTER UPDATE ON content_preferences
    FOR EACH ROW
BEGIN
    UPDATE content_preferences SET updated_at = datetime('now') WHERE id = '1';
END;

-- Insert default content preferences row
INSERT OR IGNORE INTO content_preferences (id) VALUES ('1');

-- ============================================================================
-- TABLE: rss_feeds
-- Purpose: Store RSS feed subscriptions for personalized content
-- ============================================================================
CREATE TABLE IF NOT EXISTS rss_feeds (
    id TEXT PRIMARY KEY,  -- UUID as TEXT

    -- Feed Information
    url TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    category TEXT DEFAULT 'news',
    description TEXT,

    -- Status
    is_active INTEGER NOT NULL DEFAULT 1,
    fetch_interval_hours INTEGER NOT NULL DEFAULT 24,

    -- Fetch Status
    last_fetched_at TEXT,
    last_error TEXT,
    entry_count INTEGER DEFAULT 0,

    -- Content Categorization (JSON array)
    topics TEXT,  -- ["technology", "AI"]

    -- Trust Level (stored as TEXT for SQLite)
    trust_level TEXT NOT NULL DEFAULT '0.5',

    -- Historical Support
    supports_historical INTEGER NOT NULL DEFAULT 0,
    historical_url_template TEXT,

    -- Timestamps
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Trigger to auto-update updated_at
CREATE TRIGGER IF NOT EXISTS rss_feeds_updated_at
    AFTER UPDATE ON rss_feeds
    FOR EACH ROW
BEGIN
    UPDATE rss_feeds SET updated_at = datetime('now') WHERE id = OLD.id;
END;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rss_feeds_category ON rss_feeds(category);
CREATE INDEX IF NOT EXISTS idx_rss_feeds_active ON rss_feeds(is_active);

-- ============================================================================
-- TABLE: rss_feed_entries
-- Purpose: Cache RSS feed entries for date-based filtering
-- ============================================================================
CREATE TABLE IF NOT EXISTS rss_feed_entries (
    id TEXT PRIMARY KEY,  -- UUID as TEXT

    -- Foreign key to feed
    feed_id TEXT NOT NULL,

    -- Entry Identification
    guid TEXT NOT NULL,

    -- Content
    title TEXT NOT NULL,
    link TEXT,
    summary TEXT,
    content TEXT,
    author TEXT,

    -- Timestamps for date filtering
    published_at TEXT,
    published_date TEXT,  -- YYYY-MM-DD for efficient queries

    -- Metadata
    categories TEXT,  -- Comma-separated categories
    image_url TEXT,

    -- Timestamps
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),

    -- Foreign key constraints
    FOREIGN KEY (feed_id) REFERENCES rss_feeds(id) ON DELETE CASCADE
);

-- Trigger to auto-update updated_at
CREATE TRIGGER IF NOT EXISTS rss_feed_entries_updated_at
    AFTER UPDATE ON rss_feed_entries
    FOR EACH ROW
BEGIN
    UPDATE rss_feed_entries SET updated_at = datetime('now') WHERE id = OLD.id;
END;

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_rss_entries_published_date ON rss_feed_entries(published_date);
CREATE INDEX IF NOT EXISTS idx_rss_entries_feed_date ON rss_feed_entries(feed_id, published_date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_rss_entries_feed_guid ON rss_feed_entries(feed_id, guid);

-- ============================================================================
-- UTILITY: Database maintenance
-- ============================================================================

-- Vacuum and analyze for optimal performance (run periodically)
-- VACUUM;
-- ANALYZE;
