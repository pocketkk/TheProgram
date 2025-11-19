# SQLite Schema Design Decisions

## Executive Summary

This document explains the key design decisions made when migrating from a multi-user PostgreSQL schema to a single-user SQLite schema for the astrology application. The primary goal was to simplify the schema by removing multi-tenancy while preserving all data and functionality.

## Design Principles Applied

1. **Simplicity First**: Remove anything not needed for single-user operation
2. **Data Preservation**: Ensure no existing chart or interpretation data is lost
3. **SQLite Best Practices**: Use appropriate SQLite data types and features
4. **Future-Proof**: Design should support potential future offline features
5. **Performance**: Consider query patterns and add appropriate indexes

## Major Design Decisions

### 1. UUID Strategy: Keep UUIDs as TEXT

**Decision**: Store UUIDs as TEXT strings instead of converting to INTEGER.

**Rationale**:
- **Migration Simplicity**: Existing PostgreSQL data uses UUIDs. Converting to integers would require complex ID remapping across all related tables.
- **Data Portability**: UUID-as-TEXT allows easier data synchronization or backup/restore operations.
- **Future Compatibility**: If we ever need to sync with a server or migrate back to PostgreSQL, UUIDs make this trivial.
- **Collision-Free**: UUIDs guarantee uniqueness even if generating IDs offline or across multiple devices.

**Trade-offs**:
- **Storage Size**: TEXT UUIDs (36 chars) use more space than INTEGER (8 bytes max), but this is negligible for a single-user database.
- **Index Performance**: TEXT indexes are slightly slower than INTEGER, but still very fast for SQLite's use case.
- **Human Readability**: UUIDs are harder to read/debug, but this is a minor concern for an end-user application.

**Alternative Considered**: INTEGER PRIMARY KEY AUTOINCREMENT
- Would be more "SQLite-native" and slightly more performant
- Rejected due to migration complexity and loss of portability

### 2. Password Storage: New app_config Table

**Decision**: Create a new `app_config` singleton table to store password hash and application metadata.

**Rationale**:
- **Conceptual Clarity**: Application-level config should be separate from user data.
- **Singleton Pattern**: Enforce single-row with `CHECK (id = 1)` constraint.
- **Extensibility**: Provides a place for future app-level settings (database version, feature flags, etc.).
- **No User Table Needed**: Since there's only one user, a full `users` table is overkill.

**Trade-offs**:
- **New Table**: Adds one more table to the schema, but it's simpler than keeping the entire `users` table.
- **Migration Complexity**: Requires extracting password from `users` table during migration.

**Alternative Considered**: Keep a simplified `users` table with one row
- Would be more similar to original schema
- Rejected because it doesn't simplify the schema enough and carries unnecessary baggage

### 3. User Preferences: Singleton Table

**Decision**: Convert `user_preferences` to a singleton table (constrained to id=1) instead of removing it.

**Rationale**:
- **Functional Necessity**: User needs to customize default chart settings.
- **Consistency**: Maintains the existing structure, just removes user_id foreign key.
- **Type Safety**: Keeps preferences in dedicated table rather than mixing with app_config.
- **Schema Clarity**: Clear separation between app config and user preferences.

**Trade-offs**:
- **Table Count**: Adds to total table count, but organization is worth it.

**Alternative Considered**: Merge preferences into app_config
- Would reduce table count by one
- Rejected due to poor separation of concerns

### 4. Client Model: Keep It for Organization

**Decision**: Retain the `clients` table despite single-user mode.

**Rationale**:
- **Multiple People's Charts**: User may want charts for themselves, family members, friends.
- **Organization**: Provides a way to group birth data and charts by person.
- **Session Notes**: Session notes are tied to clients, so we need this abstraction.
- **Future Features**: Allows for potential future features like "sharing a chart" or "chart for a friend".

**Trade-offs**:
- **Extra Abstraction**: Could theoretically merge clients into birth_data, but loses organizational benefits.

**Alternative Considered**: Remove clients table, make birth_data the top-level entity
- Would simplify schema slightly
- Rejected because it would make organizing multiple charts for the same person difficult

### 5. Data Type Mapping: SQLite Native Types

**Decision**: Map PostgreSQL types to SQLite types following these rules:
- UUID → TEXT
- String/VARCHAR → TEXT
- Date/Time/DateTime → TEXT (ISO 8601 format)
- Boolean → INTEGER (0/1)
- JSONB → TEXT (JSON strings)
- Numeric → REAL
- Integer → INTEGER

**Rationale**:
- **SQLite Affinity**: SQLite uses type affinity, not strict types. These mappings work well with SQLite's type system.
- **ISO 8601 for Dates**: TEXT storage of dates in ISO 8601 format is SQLite best practice. It's sortable, human-readable, and easy to parse.
- **JSON as TEXT**: SQLite has JSON functions that work with TEXT, making this the standard approach.
- **Boolean as INTEGER**: SQLite doesn't have a native BOOLEAN type. INTEGER (0/1) is the standard approach.

**Trade-offs**:
- **Type Safety**: SQLite's dynamic typing is less strict than PostgreSQL, but Python/SQLAlchemy can enforce types at the application layer.
- **Precision**: REAL (floating-point) for Numeric may lose some precision, but it's acceptable for latitude/longitude.

**Alternative Considered**: Use SQLite's built-in DATE/DATETIME functions with Julian day numbers
- More "native" to SQLite
- Rejected because ISO 8601 TEXT is more portable and human-readable

### 6. Foreign Key Constraints: Always CASCADE

**Decision**: All foreign keys use `ON DELETE CASCADE`.

**Rationale**:
- **Data Integrity**: Ensures no orphaned records when a parent is deleted.
- **User Expectation**: If user deletes a client, they expect all associated data (birth data, charts, notes) to be deleted too.
- **Simplicity**: Application code doesn't need to manually clean up related records.

**Trade-offs**:
- **Accidental Deletion**: User could accidentally delete a client and lose all charts. Mitigation: Implement soft-delete or confirmation dialogs in the UI.

**Alternative Considered**: ON DELETE RESTRICT or SET NULL
- Would prevent accidental data loss
- Rejected because it complicates the user experience and leaves orphaned data

### 7. Indexes: Query-Driven Design

**Decision**: Create indexes based on expected query patterns:
- Foreign keys (for joins)
- Date fields (for sorting/filtering)
- Type fields (for filtering by chart type, element type, etc.)
- Composite indexes for common lookups (chart_id + element_type + element_key)

**Rationale**:
- **Performance**: SQLite benefits significantly from indexes on frequently queried columns.
- **Foreign Key Joins**: Indexing foreign keys speeds up cascade operations and joins.
- **Date Sorting**: Users will frequently sort by creation date, last viewed, etc.
- **Type Filtering**: Filtering by chart_type, element_type, etc. is common.

**Trade-offs**:
- **Storage**: Indexes take up space, but the performance benefit far outweighs the cost.
- **Write Performance**: Indexes slow down inserts/updates slightly, but reads are much more common in this app.

**Alternative Considered**: Minimal indexes (only primary keys)
- Would save space and speed up writes
- Rejected because read performance is critical for good UX

### 8. Auto-Update Triggers: Consistent Timestamps

**Decision**: Create triggers to automatically update `updated_at` on every UPDATE.

**Rationale**:
- **Consistency**: Ensures timestamps are always accurate without application code.
- **SQLite Best Practice**: Triggers are the standard way to implement auto-update timestamps in SQLite.
- **Audit Trail**: Provides a simple audit trail of when records were last modified.

**Trade-offs**:
- **Complexity**: Adds triggers to the schema, but they're simple and standard.
- **Performance**: Trigger execution adds minimal overhead.

**Alternative Considered**: Let application code manage updated_at
- Would simplify schema
- Rejected because it's error-prone and easy to forget

### 9. JSON Storage: TEXT with Application-Layer Parsing

**Decision**: Store JSON as TEXT strings, parse in Python application layer.

**Rationale**:
- **SQLite JSON Support**: SQLite has built-in JSON functions (json_extract, etc.) that work with TEXT.
- **Flexibility**: JSON structure can evolve without schema migrations.
- **PostgreSQL Parity**: Maintains the same flexible data structure as JSONB in PostgreSQL.

**Trade-offs**:
- **Validation**: JSON structure is not enforced by database schema. Application must validate.
- **Querying**: Querying nested JSON is less efficient than normalized tables, but acceptable for chart data.

**Alternative Considered**: Normalize chart_data into separate tables
- Would improve query performance for specific planetary positions
- Rejected due to schema complexity and inflexibility for different chart types

### 10. Views: Convenience for Common Queries

**Decision**: Create convenience views for common queries (client_summary, recent_charts).

**Rationale**:
- **Developer Experience**: Simplifies common queries in application code.
- **Performance**: Views are query shortcuts, not materialized, so they don't add storage overhead.
- **Maintainability**: Encapsulates complex joins in one place.

**Trade-offs**:
- **Schema Complexity**: Adds to the overall schema definition.
- **Not Used by ORM**: SQLAlchemy may not use views directly, but they're useful for raw SQL queries.

**Alternative Considered**: No views, write JOINs in application code
- Would simplify schema
- Kept views because they're useful for debugging and future features

## SQLite-Specific Optimizations

### 1. PRAGMA Settings

**Recommended settings** (to be set when opening database):

```sql
PRAGMA foreign_keys = ON;           -- Enable FK constraints (MUST be set every time)
PRAGMA journal_mode = WAL;          -- Write-Ahead Logging for better concurrency
PRAGMA synchronous = NORMAL;        -- Good balance of safety and performance
PRAGMA cache_size = -2000;          -- 2MB cache (negative = KB)
PRAGMA temp_store = MEMORY;         -- Store temp tables in memory
```

**Rationale**:
- **foreign_keys**: Must be explicitly enabled in SQLite (not on by default).
- **WAL mode**: Allows readers and writers to operate concurrently, better for single-user desktop app.
- **synchronous = NORMAL**: Good balance for a local database. FULL is safer but slower.
- **cache_size**: Larger cache improves performance for complex queries.

### 2. Auto-Vacuum

**Decision**: Enable auto-vacuum to reclaim space when data is deleted.

```sql
PRAGMA auto_vacuum = INCREMENTAL;
```

**Rationale**:
- **Space Management**: Single-user app should clean up after deletions automatically.
- **Incremental**: Less disruptive than FULL auto-vacuum.

### 3. Periodic Maintenance

**Recommendation**: Run `VACUUM` and `ANALYZE` periodically (e.g., on app startup or weekly).

**Rationale**:
- **VACUUM**: Defragments database and reclaims space.
- **ANALYZE**: Updates query planner statistics for optimal query plans.

## Security Considerations

### 1. Password Hash Storage

**Decision**: Store bcrypt hash in `app_config.password_hash`.

**Rationale**:
- **Proven Algorithm**: Bcrypt is industry-standard for password hashing.
- **Nullable Field**: Allows for "no password" mode if desired.

**Trade-offs**:
- **No Encryption at Rest**: SQLite database is not encrypted. For sensitive data, consider SQLCipher.

### 2. Database Encryption

**Decision**: Not implemented in base schema, but recommended for production.

**Recommendation**: Use SQLCipher for transparent database encryption.

**Rationale**:
- **Sensitive Data**: Birth data and charts may be considered sensitive.
- **Regulatory Compliance**: May be required for GDPR or similar regulations.

### 3. SQL Injection Prevention

**Decision**: Always use parameterized queries (application layer concern).

**Rationale**:
- **Standard Practice**: SQLite is as vulnerable to SQL injection as any SQL database.
- **ORM Protection**: SQLAlchemy provides built-in protection if used correctly.

## Performance Considerations

### 1. Expected Database Size

**Estimates** for a single power user:
- 100 clients → ~100 KB
- 100 birth data records → ~200 KB
- 500 charts → ~50 MB (with full chart_data JSON)
- 5,000 chart interpretations → ~10 MB
- 1,000 session notes → ~2 MB
- **Total: ~62 MB**

**Rationale**:
- Single-user SQLite easily handles databases under 1 GB.
- This schema should scale to thousands of charts without performance issues.

### 2. Query Performance

**Expected query times** (on modern hardware):
- Fetch client list: < 1ms
- Load chart with interpretations: < 10ms
- Search charts by date range: < 50ms
- Full-text search across notes: < 100ms (with FTS5 index)

**Rationale**:
- SQLite is extremely fast for reads on small-to-medium datasets.
- Indexes ensure joins and filters are efficient.

### 3. Write Performance

**Expected write times**:
- Insert new chart: < 5ms
- Update chart interpretation: < 2ms
- Delete client (cascade): < 50ms

**Rationale**:
- Cascade deletes are the slowest operation, but still very fast for reasonable data volumes.

## Future-Proofing

### 1. Offline-First Design

**Decision**: Schema is designed to work entirely offline.

**Benefits**:
- User can work without internet connection.
- No dependency on backend servers.
- Fast, responsive UI.

**Future Enhancement**: Could add sync fields (last_synced_at, sync_status) if cloud backup is added.

### 2. Schema Versioning

**Decision**: Include `database_version` in `app_config` table.

**Rationale**:
- **Migration Support**: Application can detect schema version and run migrations as needed.
- **Upgrade Path**: Allows for graceful schema evolution over time.

**Recommendation**: Increment version on every schema change and maintain migration scripts.

### 3. Extensibility

**Design allows for future features**:
- **Composite Charts**: Already supported via `chart_type` and `calculation_params`.
- **Transit Notifications**: `transit_events` table is ready for notification system.
- **Custom Interpretations**: `interpretations` table supports user customization.
- **AI Enhancements**: `chart_interpretations` tracks AI model and version for future improvements.

## Risks and Mitigations

### Risk 1: Data Loss from Accidental Deletion

**Risk**: CASCADE deletes could cause user to lose data accidentally.

**Mitigation**:
- Implement confirmation dialogs in UI before deletions.
- Consider soft-delete pattern (add `deleted_at` column).
- Implement automatic backups (daily SQLite file copy).
- Add "undo" functionality for recent deletions.

### Risk 2: Database Corruption

**Risk**: SQLite file could become corrupted (power loss, disk failure, etc.).

**Mitigation**:
- Use `PRAGMA journal_mode = WAL` for better corruption resistance.
- Implement automatic backups.
- Provide database integrity check on startup (`PRAGMA integrity_check`).
- Educate user to keep backups.

### Risk 3: JSON Schema Evolution

**Risk**: JSON structure in `chart_data` could change over time, breaking older charts.

**Mitigation**:
- Maintain backward compatibility in JSON structure.
- Version the JSON schema (include version field in JSON).
- Write migration code to upgrade old JSON structures on load.
- Validate JSON structure in application layer.

### Risk 4: Performance Degradation with Large Datasets

**Risk**: Database could slow down with thousands of charts and interpretations.

**Mitigation**:
- Indexes are already in place for common queries.
- Run `ANALYZE` periodically to keep query plans optimal.
- Consider pagination for large lists in UI.
- Archive old charts if database grows beyond 1 GB.

### Risk 5: Migration Failures

**Risk**: PostgreSQL → SQLite migration could fail or lose data.

**Mitigation**:
- Write comprehensive migration script with validation.
- Test migration on sample data before production use.
- Verify record counts match before and after.
- Keep PostgreSQL database as backup until migration is verified.
- Implement rollback procedure if migration fails.

## Testing Recommendations

### Unit Tests
- Test foreign key cascade behavior.
- Test trigger functionality (updated_at).
- Test constraint validation (singleton tables, CHECK constraints).
- Test JSON serialization/deserialization.

### Integration Tests
- Test migration script with real PostgreSQL data.
- Test concurrent access (WAL mode).
- Test backup/restore procedures.
- Test database integrity checks.

### Performance Tests
- Benchmark query performance with realistic data volumes.
- Test cascade delete performance with deep hierarchies.
- Test bulk insert performance.

## Conclusion

This SQLite schema successfully simplifies the original PostgreSQL schema by removing multi-tenancy while preserving all functionality. Key decisions include:

1. **UUIDs as TEXT** for migration simplicity and future portability
2. **Singleton tables** for app config and user preferences
3. **Cascade deletes** for data integrity and user expectations
4. **ISO 8601 TEXT** for all dates/times
5. **JSON as TEXT** for flexible chart data storage
6. **Comprehensive indexes** for query performance
7. **Auto-update triggers** for timestamp consistency

The schema is designed to be:
- **Simple** to understand and maintain
- **Performant** for single-user workloads
- **Extensible** for future features
- **Safe** with proper constraints and cascades

The main trade-offs are:
- Slightly larger storage due to UUIDs as TEXT (acceptable)
- Less type safety than PostgreSQL (mitigated by application layer)
- Risk of cascade deletion data loss (mitigated by UI confirmations and backups)

Overall, this design provides a solid foundation for a fast, offline-first single-user astrology application.
