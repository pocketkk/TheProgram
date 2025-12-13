#!/usr/bin/env python3
"""
Migration script to add contemplative cosmic paper tables.

This adds the following tables:
- lineage_members: Family/ancestor tracking for Lineage Mode
- dream_entries: Dream journal for dream integration
- unread_archive: "Not ready yet" saved articles
- witness_entries: Witness Log for recording responses to news
- synchronicities: Tracking meaningful coincidences

Also adds contemplative columns to content_preferences.

Usage:
    python migration_scripts/add_contemplative_tables.py
"""
import sys
import sqlite3
from pathlib import Path

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))


def run_migration(db_path: str = "data/theprogram.db"):
    """Run the migration to add contemplative tables."""
    print(f"Running contemplative tables migration on: {db_path}")

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # =============================================================
        # 1. Lineage Members Table
        # =============================================================
        print("Creating lineage_members table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS lineage_members (
                id TEXT PRIMARY KEY NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                name TEXT NOT NULL,
                relationship TEXT NOT NULL,
                birth_date TEXT,
                birth_year INTEGER,
                death_date TEXT,
                death_year INTEGER,
                birth_location TEXT,
                latitude REAL,
                longitude REAL,
                timezone TEXT,
                notes TEXT,
                life_events TEXT DEFAULT '[]',
                generation INTEGER DEFAULT 0,
                is_ancestor INTEGER DEFAULT 1,
                is_living INTEGER DEFAULT 1,
                birth_data_id TEXT REFERENCES birth_data(id) ON DELETE SET NULL
            )
        """)

        cursor.execute("CREATE INDEX IF NOT EXISTS idx_lineage_relationship ON lineage_members(relationship)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_lineage_birth_year ON lineage_members(birth_year)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_lineage_generation ON lineage_members(generation)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_lineage_is_ancestor ON lineage_members(is_ancestor)")
        print("  ✓ lineage_members table created")

        # =============================================================
        # 2. Dream Entries Table
        # =============================================================
        print("Creating dream_entries table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS dream_entries (
                id TEXT PRIMARY KEY NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                dream_date TEXT NOT NULL,
                title TEXT,
                narrative TEXT NOT NULL,
                symbols TEXT DEFAULT '[]',
                themes TEXT DEFAULT '[]',
                emotions TEXT DEFAULT '[]',
                characters TEXT DEFAULT '[]',
                locations TEXT DEFAULT '[]',
                colors TEXT DEFAULT '[]',
                lucidity_level INTEGER,
                vividness INTEGER,
                emotional_intensity INTEGER,
                recurring INTEGER DEFAULT 0,
                recurring_pattern TEXT,
                interpretation TEXT,
                ai_interpretation TEXT,
                transit_context TEXT,
                moon_phase TEXT,
                correlations TEXT DEFAULT '[]',
                mood_before_sleep TEXT,
                mood_upon_waking TEXT,
                sleep_quality INTEGER
            )
        """)

        cursor.execute("CREATE INDEX IF NOT EXISTS idx_dream_date ON dream_entries(dream_date)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_dream_recurring ON dream_entries(recurring)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_dream_lucidity ON dream_entries(lucidity_level)")
        print("  ✓ dream_entries table created")

        # =============================================================
        # 3. Unread Archive Table
        # =============================================================
        print("Creating unread_archive table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS unread_archive (
                id TEXT PRIMARY KEY NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                article_id TEXT,
                source TEXT,
                source_date TEXT,
                headline TEXT NOT NULL,
                content TEXT,
                url TEXT,
                section TEXT,
                tags TEXT DEFAULT '[]',
                article_metadata TEXT DEFAULT '{}',
                saved_date TEXT NOT NULL,
                reason TEXT,
                feelings TEXT,
                not_ready_note TEXT,
                revisit_after TEXT,
                revisit_count INTEGER DEFAULT 0,
                last_revisited TEXT,
                ready_now INTEGER DEFAULT 0,
                engaged_date TEXT,
                initial_reaction TEXT,
                later_reaction TEXT,
                insights TEXT,
                is_archived INTEGER DEFAULT 0
            )
        """)

        cursor.execute("CREATE INDEX IF NOT EXISTS idx_unread_saved_date ON unread_archive(saved_date)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_unread_source_date ON unread_archive(source_date)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_unread_revisit_after ON unread_archive(revisit_after)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_unread_ready ON unread_archive(ready_now)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_unread_archived ON unread_archive(is_archived)")
        print("  ✓ unread_archive table created")

        # =============================================================
        # 4. Witness Entries Table
        # =============================================================
        print("Creating witness_entries table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS witness_entries (
                id TEXT PRIMARY KEY NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                witness_date TEXT NOT NULL,
                article_date TEXT,
                article_headline TEXT,
                article_source TEXT,
                article_url TEXT,
                article_section TEXT,
                initial_reaction TEXT,
                body_sensations TEXT DEFAULT '[]',
                emotions TEXT DEFAULT '[]',
                thoughts TEXT DEFAULT '[]',
                judgments TEXT DEFAULT '[]',
                personal_connection TEXT,
                memories_triggered TEXT,
                beliefs_questioned TEXT,
                growth_edge TEXT,
                breath_count INTEGER,
                pause_taken INTEGER DEFAULT 0,
                action_impulse TEXT,
                chosen_response TEXT,
                gratitude_found TEXT,
                lesson TEXT,
                blessing TEXT,
                similar_entries TEXT DEFAULT '[]',
                recurring_theme TEXT,
                intensity INTEGER,
                category TEXT,
                transit_context TEXT
            )
        """)

        cursor.execute("CREATE INDEX IF NOT EXISTS idx_witness_date ON witness_entries(witness_date)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_witness_article_date ON witness_entries(article_date)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_witness_intensity ON witness_entries(intensity)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_witness_category ON witness_entries(category)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_witness_theme ON witness_entries(recurring_theme)")
        print("  ✓ witness_entries table created")

        # =============================================================
        # 5. Synchronicities Table
        # =============================================================
        print("Creating synchronicities table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS synchronicities (
                id TEXT PRIMARY KEY NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                theme TEXT NOT NULL,
                description TEXT,
                pattern_type TEXT NOT NULL DEFAULT 'recurring_symbol',
                first_noticed TEXT,
                occurrences TEXT DEFAULT '[]',
                dream_ids TEXT DEFAULT '[]',
                witness_ids TEXT DEFAULT '[]',
                article_references TEXT DEFAULT '[]',
                personal_events TEXT DEFAULT '[]',
                transit_correlations TEXT DEFAULT '[]',
                planets_involved TEXT DEFAULT '[]',
                user_interpretation TEXT,
                ai_interpretation TEXT,
                questions_raised TEXT DEFAULT '[]',
                significance INTEGER DEFAULT 5,
                active INTEGER DEFAULT 1,
                resolved INTEGER DEFAULT 0,
                resolution_note TEXT,
                occurrence_count INTEGER DEFAULT 0,
                last_occurrence TEXT,
                avg_frequency_days REAL,
                keywords TEXT DEFAULT '[]'
            )
        """)

        cursor.execute("CREATE INDEX IF NOT EXISTS idx_sync_theme ON synchronicities(theme)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_sync_type ON synchronicities(pattern_type)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_sync_active ON synchronicities(active)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_sync_significance ON synchronicities(significance)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_sync_last_occurrence ON synchronicities(last_occurrence)")
        print("  ✓ synchronicities table created")

        # =============================================================
        # 6. Add contemplative columns to content_preferences
        # =============================================================
        print("Adding contemplative columns to content_preferences...")

        # Get existing columns
        cursor.execute("PRAGMA table_info(content_preferences)")
        existing_cols = {row[1] for row in cursor.fetchall()}

        new_columns = [
            ("contemplative_depth", "TEXT DEFAULT 'balanced'"),
            ("show_lineage", "INTEGER DEFAULT 1"),
            ("show_dreams", "INTEGER DEFAULT 1"),
            ("show_synchronicities", "INTEGER DEFAULT 1"),
            ("show_chart_weather", "INTEGER DEFAULT 1"),
            ("show_questions", "INTEGER DEFAULT 1"),
            ("show_silence", "INTEGER DEFAULT 1"),
            ("show_collective_weather", "INTEGER DEFAULT 1"),
            ("show_seasonal", "INTEGER DEFAULT 1"),
        ]

        for col_name, col_def in new_columns:
            if col_name not in existing_cols:
                cursor.execute(f"ALTER TABLE content_preferences ADD COLUMN {col_name} {col_def}")
                print(f"  ✓ Added column: {col_name}")
            else:
                print(f"  - Column already exists: {col_name}")

        conn.commit()
        print("\n✓ Migration completed successfully!")

    except Exception as e:
        conn.rollback()
        print(f"\n✗ Migration failed: {e}")
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Add contemplative tables to database")
    parser.add_argument(
        "--db",
        default="data/theprogram.db",
        help="Path to SQLite database"
    )
    args = parser.parse_args()

    run_migration(args.db)
