"""
Migration: Add Content Preferences Tables

Adds tables for personalized Cosmic Paper:
- content_preferences: User content personalization settings
- rss_feeds: RSS feed subscriptions
- rss_feed_entries: Cached RSS entries for date filtering

Run this migration to add the new tables to an existing database.
"""
import sqlite3
import sys
from pathlib import Path


def run_migration(db_path: str):
    """Run the migration to add content preferences tables"""
    print(f"Running migration on: {db_path}")

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # Enable foreign keys
        cursor.execute("PRAGMA foreign_keys = ON")

        # =====================================================================
        # Create content_preferences table
        # =====================================================================
        print("Creating content_preferences table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS content_preferences (
                id TEXT PRIMARY KEY CHECK (id = '1'),

                -- Location (for weather)
                location_name TEXT,
                latitude REAL,
                longitude REAL,
                timezone TEXT,

                -- Topics & Interests (JSON array)
                interests TEXT,

                -- Sports Preferences (JSON arrays)
                sports_teams TEXT,
                sports_leagues TEXT,

                -- RSS Feed Settings
                rss_categories TEXT,

                -- Content Filtering (JSON arrays)
                blocked_sources TEXT,
                blocked_keywords TEXT,
                prioritized_topics TEXT,

                -- Truth Algorithm Settings
                enable_truth_filter INTEGER NOT NULL DEFAULT 0,
                truth_focus_topics TEXT,
                source_trust_levels TEXT,

                -- Display Preferences
                show_weather INTEGER NOT NULL DEFAULT 1,
                show_sports INTEGER NOT NULL DEFAULT 1,
                show_horoscope_context INTEGER NOT NULL DEFAULT 1,
                show_rss_content INTEGER NOT NULL DEFAULT 1,

                -- Custom Sections (JSON array)
                custom_sections TEXT,

                -- Timestamps
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
        """)

        # Create trigger
        cursor.execute("""
            CREATE TRIGGER IF NOT EXISTS content_preferences_updated_at
                AFTER UPDATE ON content_preferences
                FOR EACH ROW
            BEGIN
                UPDATE content_preferences SET updated_at = datetime('now') WHERE id = '1';
            END
        """)

        # Insert default row
        cursor.execute("INSERT OR IGNORE INTO content_preferences (id) VALUES ('1')")
        print("  ✓ content_preferences table created")

        # =====================================================================
        # Create rss_feeds table
        # =====================================================================
        print("Creating rss_feeds table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS rss_feeds (
                id TEXT PRIMARY KEY,
                url TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL,
                category TEXT DEFAULT 'news',
                description TEXT,
                is_active INTEGER NOT NULL DEFAULT 1,
                fetch_interval_hours INTEGER NOT NULL DEFAULT 24,
                last_fetched_at TEXT,
                last_error TEXT,
                entry_count INTEGER DEFAULT 0,
                topics TEXT,
                trust_level TEXT NOT NULL DEFAULT '0.5',
                supports_historical INTEGER NOT NULL DEFAULT 0,
                historical_url_template TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
        """)

        # Create trigger
        cursor.execute("""
            CREATE TRIGGER IF NOT EXISTS rss_feeds_updated_at
                AFTER UPDATE ON rss_feeds
                FOR EACH ROW
            BEGIN
                UPDATE rss_feeds SET updated_at = datetime('now') WHERE id = OLD.id;
            END
        """)

        # Create indexes
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_rss_feeds_category ON rss_feeds(category)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_rss_feeds_active ON rss_feeds(is_active)")
        print("  ✓ rss_feeds table created")

        # =====================================================================
        # Create rss_feed_entries table
        # =====================================================================
        print("Creating rss_feed_entries table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS rss_feed_entries (
                id TEXT PRIMARY KEY,
                feed_id TEXT NOT NULL,
                guid TEXT NOT NULL,
                title TEXT NOT NULL,
                link TEXT,
                summary TEXT,
                content TEXT,
                author TEXT,
                published_at TEXT,
                published_date TEXT,
                categories TEXT,
                image_url TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (feed_id) REFERENCES rss_feeds(id) ON DELETE CASCADE
            )
        """)

        # Create trigger
        cursor.execute("""
            CREATE TRIGGER IF NOT EXISTS rss_feed_entries_updated_at
                AFTER UPDATE ON rss_feed_entries
                FOR EACH ROW
            BEGIN
                UPDATE rss_feed_entries SET updated_at = datetime('now') WHERE id = OLD.id;
            END
        """)

        # Create indexes
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_rss_entries_published_date ON rss_feed_entries(published_date)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_rss_entries_feed_date ON rss_feed_entries(feed_id, published_date)")
        cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_rss_entries_feed_guid ON rss_feed_entries(feed_id, guid)")
        print("  ✓ rss_feed_entries table created")

        # Commit all changes
        conn.commit()
        print("\n✅ Migration completed successfully!")

    except Exception as e:
        conn.rollback()
        print(f"\n❌ Migration failed: {e}")
        raise

    finally:
        conn.close()


def main():
    # Default database path
    default_db_path = Path(__file__).parent.parent / "data" / "theprogram.db"

    if len(sys.argv) > 1:
        db_path = sys.argv[1]
    else:
        db_path = str(default_db_path)

    if not Path(db_path).exists():
        print(f"Database not found: {db_path}")
        print("The database will be created when the application starts.")
        print("Run the application first, then run this migration if needed.")
        sys.exit(1)

    run_migration(db_path)


if __name__ == "__main__":
    main()
