# Phase 2: Data Portability - Project Plan

**The Program - Astrology Application**

## Executive Summary

Phase 2 transforms The Program into a truly user-owned application by implementing comprehensive data portability features. Users will be able to export, import, backup, and migrate their astrology data across different formats and storage locations.

### Phase Context

- **Phase 1 Status**: COMPLETE - Successfully migrated from PostgreSQL multi-user SaaS to SQLite single-user application
- **Current State**:
  - SQLite database with 12 tables (Client, BirthData, Chart, ChartInterpretation, Interpretation, AspectPattern, TransitEvent, SessionNote, LocationCache, AppConfig, UserPreferences)
  - Basic backup scripts exist (`/scripts/db-backup.sh`, `/scripts/db-restore.sh`)
  - 446 comprehensive tests
  - FastAPI backend with SQLAlchemy ORM
  - React/TypeScript frontend

### Phase 2 Objectives

1. Enable full data export in portable formats (JSON, CSV)
2. Support data import with validation and conflict resolution
3. Enhance backup system with automation and cloud integration
4. Create data format converters and utilities
5. Build user-friendly data management UI

---

## Project Overview

### Success Criteria

- [ ] Users can export all data to JSON/CSV formats
- [ ] Users can import data from exported formats
- [ ] Automated daily backups with configurable retention
- [ ] Optional cloud storage integration (Dropbox, Google Drive, S3)
- [ ] Data integrity validation and verification
- [ ] User-friendly UI for all data management operations
- [ ] Comprehensive testing (90%+ coverage)
- [ ] Complete documentation

### Estimated Timeline

- **Total Duration**: 3-4 weeks
- **Parallel Execution**: Up to 3 agents working simultaneously
- **Critical Path**: 10-12 working days

### Complexity Assessment

**Overall Complexity**: Medium-High

**Risk Areas**:
- Cloud storage API integration (multiple providers)
- Data conflict resolution logic
- Large dataset export performance
- Backup encryption implementation
- Cross-platform file path handling

---

## Task Breakdown

### TASK-201: Export Service Implementation (Backend)

**Description**: Create a comprehensive export service that can export individual charts, client data, or complete database dumps to JSON and CSV formats.

**Dependencies**: None (can start immediately)

**Estimated Effort**: Large (8-10 hours)

**Risk Level**: Medium

**Recommended Agent**: backend-specialist

**Deliverables**:
- `/backend/app/services/export_service.py` - Main export service
- `/backend/app/schemas/export_schemas.py` - Pydantic schemas for export formats
- `/backend/app/utils/format_converters.py` - JSON/CSV conversion utilities
- Unit tests for all export functions

**Implementation Details**:

1. **Export Modes**:
   - Single chart export (JSON/CSV)
   - Single client export with all related data (JSON/CSV)
   - Full database export (JSON only, preserves relationships)
   - Selective export by date range or criteria

2. **Export Formats**:
   - **JSON**:
     - Preserves all relationships
     - Includes metadata (export_date, version, schema_version)
     - Pretty-printed option for human readability
     - Compressed option for large datasets
   - **CSV**:
     - Separate CSV files per table
     - Includes header row with column names
     - UTF-8 encoding with BOM
     - Handles special characters and commas properly

3. **Features**:
   - Streaming for large datasets (avoid memory issues)
   - Progress callbacks for UI updates
   - Export validation (verify exported data completeness)
   - Configurable field inclusion/exclusion
   - Anonymization options (remove PII)

**Acceptance Criteria**:
- Export single chart to JSON with all relationships
- Export single chart to CSV (flattened structure)
- Export client with all charts, birth data, and notes
- Export entire database to JSON (preserving foreign keys)
- Export creates valid, re-importable files
- Large datasets (1000+ charts) export without memory issues
- Exports include version metadata for compatibility checking

**Test Requirements**:
- Unit tests for each export mode
- Integration tests with real database data
- Performance tests with large datasets
- Format validation tests (JSON schema, CSV structure)

---

### TASK-202: Import Service Implementation (Backend)

**Description**: Create an import service that can restore data from exported JSON/CSV files, with validation, conflict resolution, and error handling.

**Dependencies**: TASK-201 (needs export schemas and format understanding)

**Estimated Effort**: Large (10-12 hours)

**Risk Level**: High

**Recommended Agent**: backend-specialist

**Deliverables**:
- `/backend/app/services/import_service.py` - Main import service
- `/backend/app/services/conflict_resolver.py` - Conflict resolution logic
- `/backend/app/utils/validators.py` - Import data validation
- Integration tests for import scenarios

**Implementation Details**:

1. **Import Modes**:
   - Import single chart (merge or replace)
   - Import client data (with conflict resolution)
   - Full database restore (wipes existing data - requires confirmation)
   - Incremental import (merge new data only)

2. **Validation**:
   - Schema version compatibility checking
   - Data type validation (dates, UUIDs, enums)
   - Foreign key integrity validation
   - Birth data validation (date ranges, coordinates)
   - Duplicate detection

3. **Conflict Resolution**:
   - **Strategy Options**:
     - Skip (keep existing, ignore import)
     - Replace (overwrite existing with import)
     - Merge (update fields, keep relationships)
     - Rename (create new with suffix)
     - Prompt user (for UI-driven imports)
   - Conflict detection by UUID, name+birthdate, or custom key
   - Dry-run mode (preview conflicts without importing)

4. **Error Handling**:
   - Transaction rollback on validation failure
   - Detailed error reporting with line numbers
   - Partial import recovery (save what's valid)
   - Import log generation

**Acceptance Criteria**:
- Import exported JSON data successfully
- Import exported CSV data successfully
- Detect and resolve duplicate clients
- Validate data integrity before committing
- Roll back on critical errors
- Generate detailed import report
- Handle malformed data gracefully
- Support dry-run preview mode

**Test Requirements**:
- Unit tests for validation logic
- Integration tests for each conflict scenario
- Edge case tests (missing fields, invalid data)
- Performance tests with large imports
- Rollback tests (ensure data integrity)

---

### TASK-203: API Endpoints for Export/Import

**Description**: Create REST API endpoints for export and import operations, with streaming support for large files.

**Dependencies**: TASK-201, TASK-202

**Estimated Effort**: Medium (4-6 hours)

**Risk Level**: Low

**Recommended Agent**: api-developer

**Deliverables**:
- `/backend/app/api/routes_sqlite/data_export.py` - Export endpoints
- `/backend/app/api/routes_sqlite/data_import.py` - Import endpoints
- API documentation updates
- Integration tests for API endpoints

**Implementation Details**:

1. **Export Endpoints**:
   ```
   POST /api/data/export/chart/{chart_id}
     - Query params: format (json/csv), include_interpretations (bool)
     - Returns: StreamingResponse with file download

   POST /api/data/export/client/{client_id}
     - Query params: format (json/csv)
     - Returns: StreamingResponse with file download

   POST /api/data/export/full
     - Query params: format (json), compress (bool)
     - Returns: StreamingResponse with file download

   POST /api/data/export/selective
     - Body: SelectiveExportRequest (date_range, client_ids, etc.)
     - Returns: StreamingResponse with file download
   ```

2. **Import Endpoints**:
   ```
   POST /api/data/import/validate
     - Body: File upload (multipart/form-data)
     - Returns: ValidationReport (errors, warnings, conflicts)

   POST /api/data/import/preview
     - Body: File upload + conflict_strategy
     - Returns: ImportPreview (what will be imported, conflicts)

   POST /api/data/import/execute
     - Body: File upload + conflict_strategy + options
     - Returns: ImportResult (success, errors, summary)

   POST /api/data/import/status/{job_id}
     - Returns: ImportStatus (for async imports)
   ```

3. **Features**:
   - Streaming file downloads (avoid memory issues)
   - Async import processing for large files
   - WebSocket support for progress updates
   - Rate limiting for export operations
   - File size limits and validation

**Acceptance Criteria**:
- Export endpoints return properly formatted files
- Import endpoints validate files before processing
- Large files stream without timeout issues
- API includes proper error responses
- OpenAPI documentation is complete
- Authentication is required for all endpoints

**Test Requirements**:
- Integration tests for each endpoint
- File upload/download tests
- Error handling tests
- Authentication tests

---

### TASK-204: Enhanced Backup System (Backend)

**Description**: Enhance the existing backup scripts with automation, scheduling, encryption, verification, and backup history management.

**Dependencies**: None (can start immediately, parallel with TASK-201)

**Estimated Effort**: Medium (6-8 hours)

**Risk Level**: Medium

**Recommended Agent**: devops-specialist

**Deliverables**:
- `/backend/app/services/backup_service.py` - Automated backup service
- `/backend/app/utils/encryption.py` - Backup encryption utilities
- `/scripts/backup-scheduler.py` - Cron/scheduled task integration
- Enhanced backup scripts with encryption support
- Backup verification utilities

**Implementation Details**:

1. **Automation Features**:
   - Scheduled backups (daily, weekly, monthly)
   - Configurable retention policies (keep N backups)
   - Automatic cleanup of old backups
   - Pre-backup hooks (stop services, flush caches)
   - Post-backup hooks (restart services, verify backup)

2. **Backup Encryption**:
   - AES-256 encryption with user password or key file
   - Encrypted backups have `.encrypted` suffix
   - Decryption utility for restore
   - Key derivation with PBKDF2 or Argon2

3. **Backup Verification**:
   - SQLite integrity check before backup
   - Checksum generation (SHA-256) for each backup
   - Verification command to test backup integrity
   - Automated verification after each backup

4. **Backup Metadata**:
   - JSON manifest for each backup (`.manifest.json`)
   - Includes: timestamp, size, checksum, schema_version, row_counts
   - Backup history log (all backups with metadata)

5. **Configuration**:
   - Environment variables or config file
   - Backup schedule (cron expression)
   - Retention policy (days, count)
   - Encryption settings
   - Notification settings (email on failure)

**Acceptance Criteria**:
- Automated daily backups run successfully
- Encrypted backups can be decrypted and restored
- Backup verification detects corruption
- Old backups are automatically cleaned up
- Backup history is maintained
- Manual backup triggers work
- Cross-platform compatibility (Linux, macOS, Windows)

**Test Requirements**:
- Unit tests for encryption/decryption
- Integration tests for scheduled backups
- Verification tests
- Restoration tests from encrypted backups

---

### TASK-205: Cloud Storage Integration (Backend)

**Description**: Integrate cloud storage providers (Dropbox, Google Drive, AWS S3) for automatic backup uploads and synchronization.

**Dependencies**: TASK-204 (builds on backup service)

**Estimated Effort**: Large (10-12 hours)

**Risk Level**: High

**Recommended Agent**: integration-specialist

**Deliverables**:
- `/backend/app/services/cloud_storage/` - Cloud storage abstractions
  - `base.py` - Abstract base class
  - `dropbox_storage.py` - Dropbox integration
  - `google_drive_storage.py` - Google Drive integration
  - `s3_storage.py` - AWS S3 integration
- `/backend/app/api/routes_sqlite/cloud_storage.py` - OAuth and management endpoints
- Cloud provider authentication flows
- Integration tests with cloud providers

**Implementation Details**:

1. **Storage Provider Abstraction**:
   ```python
   class CloudStorageProvider(ABC):
       def authenticate(self, credentials) -> bool
       def upload_file(self, local_path, remote_path) -> str
       def download_file(self, remote_path, local_path) -> bool
       def list_files(self, remote_path) -> List[FileInfo]
       def delete_file(self, remote_path) -> bool
       def get_quota(self) -> QuotaInfo
   ```

2. **Supported Providers**:
   - **Dropbox**: OAuth 2.0, /Apps/TheProgram/ folder
   - **Google Drive**: OAuth 2.0, dedicated folder
   - **AWS S3**: Access key + secret, dedicated bucket
   - **Local Network**: SMB/NFS mount support (stretch goal)

3. **Features**:
   - Automatic backup upload after creation
   - Backup retention in cloud (configurable)
   - Download backup from cloud for restore
   - Sync status tracking (last sync, errors)
   - Multi-provider support (upload to multiple clouds)

4. **Configuration**:
   - Per-provider credentials in config
   - Enable/disable each provider
   - Upload schedule (immediate, daily, weekly)
   - Retention policy per provider

5. **OAuth Flow**:
   - API endpoints for OAuth initiation
   - Callback handling and token storage
   - Token refresh logic
   - Secure credential storage (encrypted)

**Acceptance Criteria**:
- Successfully authenticate with each cloud provider
- Upload backup files automatically after creation
- Download backup files for restoration
- Manage backup retention in cloud storage
- Handle OAuth token expiration gracefully
- Provide connection status UI
- Support optional cloud sync (not mandatory)

**Test Requirements**:
- Mock tests for each provider (no real API calls)
- Integration tests with real providers (optional, in CI)
- OAuth flow tests
- Upload/download tests
- Error handling tests (network failures, quota exceeded)

---

### TASK-206: Data Format Converters (Backend)

**Description**: Create utilities to convert between data formats (JSON ↔ CSV) and provide compression/decompression capabilities.

**Dependencies**: TASK-201 (shares format knowledge)

**Estimated Effort**: Small (3-4 hours)

**Risk Level**: Low

**Recommended Agent**: backend-specialist

**Deliverables**:
- `/backend/app/utils/format_converters.py` - Enhanced format converters
- `/backend/app/utils/compression.py` - Compression utilities
- `/scripts/convert-format.py` - CLI tool for format conversion
- Unit tests for converters

**Implementation Details**:

1. **Format Conversions**:
   - JSON → CSV (flattening relationships)
   - CSV → JSON (with schema inference)
   - JSON → Pretty JSON (human-readable)
   - JSON → Minified JSON (compact)

2. **Compression Support**:
   - Gzip compression (.json.gz, .csv.gz)
   - Zip archives (.zip with multiple files)
   - Compression level configuration (fast vs. best)
   - Automatic decompression on import

3. **Utilities**:
   - Schema inference from CSV headers
   - Data type detection (dates, numbers, booleans)
   - Charset detection and conversion (UTF-8, Latin-1)
   - BOM handling

4. **CLI Tool**:
   ```bash
   # Convert JSON to CSV
   python scripts/convert-format.py --input data.json --output data.csv

   # Convert CSV to JSON
   python scripts/convert-format.py --input data.csv --output data.json --schema chart

   # Compress JSON
   python scripts/convert-format.py --input data.json --compress --output data.json.gz
   ```

**Acceptance Criteria**:
- Convert JSON exports to CSV successfully
- Convert CSV imports to JSON with validation
- Compress and decompress files without data loss
- Handle large files efficiently (streaming)
- CLI tool works on all platforms
- Proper error messages for invalid formats

**Test Requirements**:
- Unit tests for each conversion type
- Round-trip tests (JSON→CSV→JSON)
- Compression/decompression tests
- Large file tests
- Edge case tests (empty files, special characters)

---

### TASK-207: Frontend Export UI Component

**Description**: Create React components for export functionality with format selection, preview, and download capabilities.

**Dependencies**: TASK-203 (needs API endpoints)

**Estimated Effort**: Medium (5-6 hours)

**Risk Level**: Low

**Recommended Agent**: frontend-developer

**Deliverables**:
- `/frontend/src/components/DataExport/ExportDialog.tsx` - Main export dialog
- `/frontend/src/components/DataExport/ExportPreview.tsx` - Export preview
- `/frontend/src/components/DataExport/FormatSelector.tsx` - Format selection
- `/frontend/src/services/exportService.ts` - API integration
- Component tests

**Implementation Details**:

1. **Export Dialog Features**:
   - Export type selection (chart, client, full database)
   - Format selection (JSON, CSV)
   - Options checkboxes (include interpretations, compress, etc.)
   - Preview of what will be exported
   - Progress indicator for large exports
   - Download button

2. **User Experience**:
   - Context menu on charts: "Export Chart..."
   - Context menu on clients: "Export Client Data..."
   - Main menu: "Export All Data..."
   - Keyboard shortcuts (Ctrl+Shift+E for export)
   - Toast notifications on success/failure

3. **Preview Component**:
   - Show item counts (X charts, Y clients, etc.)
   - Estimated file size
   - JSON preview (first 50 lines)
   - CSV preview (first 10 rows)

4. **Download Handling**:
   - Browser download API (trigger download)
   - Suggested filename (TheProgram_Export_2025-11-16.json)
   - Large file streaming (progress bar)

**Acceptance Criteria**:
- Users can export a single chart from chart view
- Users can export a client with all data from client view
- Users can export entire database from settings
- Format selection works correctly
- Preview shows accurate information
- Download triggers properly in all browsers
- Progress indicator shows for large exports
- Error messages are user-friendly

**Test Requirements**:
- Unit tests for components
- Integration tests with mocked API
- E2E tests for export workflow
- Cross-browser compatibility tests

---

### TASK-208: Frontend Import UI Component

**Description**: Create React components for import functionality with file upload, validation preview, conflict resolution, and import execution.

**Dependencies**: TASK-203 (needs API endpoints)

**Estimated Effort**: Large (7-8 hours)

**Risk Level**: Medium

**Recommended Agent**: frontend-developer

**Deliverables**:
- `/frontend/src/components/DataImport/ImportDialog.tsx` - Main import dialog
- `/frontend/src/components/DataImport/FileUploader.tsx` - File upload component
- `/frontend/src/components/DataImport/ValidationReport.tsx` - Validation results
- `/frontend/src/components/DataImport/ConflictResolver.tsx` - Conflict resolution UI
- `/frontend/src/components/DataImport/ImportProgress.tsx` - Progress tracker
- `/frontend/src/services/importService.ts` - API integration
- Component tests

**Implementation Details**:

1. **Import Workflow**:
   - Step 1: File Upload (drag-drop or browse)
   - Step 2: Validation (show errors/warnings)
   - Step 3: Conflict Resolution (if conflicts detected)
   - Step 4: Import Options (merge strategy, etc.)
   - Step 5: Execute Import
   - Step 6: Results Summary

2. **File Upload**:
   - Drag-and-drop zone
   - File browser button
   - File type validation (.json, .csv, .zip, .json.gz)
   - File size validation (warn for > 10MB)
   - Multiple file support (CSV imports)

3. **Validation Report**:
   - Error list (blocking issues)
   - Warning list (non-blocking issues)
   - Preview of data to be imported
   - Item counts and statistics
   - "Fix Issues" button (for correctable problems)

4. **Conflict Resolution UI**:
   - Table showing conflicts
   - Columns: Item, Conflict Type, Existing, Incoming, Action
   - Per-row action selector (Skip, Replace, Merge, Rename)
   - Bulk action selector (apply to all)
   - Preview of resolution outcome

5. **Progress Tracking**:
   - Progress bar (0-100%)
   - Current operation (Validating... Importing charts... 15/50)
   - Estimated time remaining
   - Cancel button (with confirmation)
   - Log of operations

6. **Results Summary**:
   - Success count (X items imported)
   - Skipped count (Y items skipped)
   - Error count (Z errors)
   - Detailed log (expandable)
   - "View Imported Data" button

**Acceptance Criteria**:
- Users can upload files via drag-drop or browse
- Validation report shows errors and warnings clearly
- Conflicts are presented with clear options
- Users can choose conflict resolution strategy
- Import progress is visible and cancellable
- Results summary is comprehensive
- All errors are user-friendly
- Dry-run mode works (preview without import)

**Test Requirements**:
- Unit tests for each component
- Integration tests with mocked API
- E2E tests for complete import workflow
- Error handling tests
- Conflict resolution tests

---

### TASK-209: Frontend Backup Management UI

**Description**: Create a backup management dashboard for viewing, creating, restoring, and managing backups, including cloud storage configuration.

**Dependencies**: TASK-204, TASK-205 (needs backend services)

**Estimated Effort**: Large (8-10 hours)

**Risk Level**: Medium

**Recommended Agent**: frontend-developer

**Deliverables**:
- `/frontend/src/components/BackupManagement/BackupDashboard.tsx` - Main dashboard
- `/frontend/src/components/BackupManagement/BackupList.tsx` - Backup history list
- `/frontend/src/components/BackupManagement/BackupSettings.tsx` - Configuration panel
- `/frontend/src/components/BackupManagement/CloudStorageConfig.tsx` - Cloud integration
- `/frontend/src/components/BackupManagement/RestoreDialog.tsx` - Restore workflow
- `/frontend/src/services/backupService.ts` - API integration
- Component tests

**Implementation Details**:

1. **Backup Dashboard Layout**:
   - Header: Last backup time, next scheduled backup
   - Actions: Create Backup Now, Restore Backup, Configure
   - Backup List: Table of recent backups
   - Cloud Status: Connection status for each provider
   - Storage Usage: Local and cloud storage statistics

2. **Backup List**:
   - Columns: Date, Size, Type (Manual/Auto), Encrypted, Location (Local/Cloud), Actions
   - Actions: Download, Restore, Verify, Delete
   - Sorting and filtering
   - Color coding (recent: green, old: yellow, expired: red)
   - Pagination for large history

3. **Backup Settings**:
   - Schedule configuration (enable auto-backup, frequency)
   - Retention policy (keep N backups, days to keep)
   - Encryption settings (enable, change password)
   - Notification settings (email on failure)
   - Backup location (local path, cloud providers)

4. **Cloud Storage Configuration**:
   - Provider list (Dropbox, Google Drive, AWS S3)
   - Connect/Disconnect buttons (triggers OAuth)
   - Status indicators (connected, syncing, error)
   - Quota display (used / total)
   - Test connection button
   - Configure button (upload schedule, retention)

5. **Restore Dialog**:
   - Backup selection (dropdown or list)
   - Restore options (full restore, selective restore)
   - Warning messages (will overwrite existing data)
   - Confirmation checkbox
   - Progress indicator
   - Success/failure notification

6. **Create Backup Dialog**:
   - Backup type (full, selective)
   - Options (encrypt, compress)
   - Destination (local, cloud, both)
   - Progress indicator
   - Success notification with file size

**Acceptance Criteria**:
- Dashboard shows accurate backup status
- Users can create manual backups
- Users can restore from backups with confirmation
- Backup history displays correctly
- Cloud storage can be configured via OAuth
- Settings persist correctly
- All actions have proper feedback
- Errors are handled gracefully

**Test Requirements**:
- Unit tests for components
- Integration tests with mocked API
- E2E tests for backup/restore workflow
- OAuth flow tests
- Settings persistence tests

---

### TASK-210: Data Statistics and Visualization

**Description**: Create analytics and visualization components to show users insights about their data (chart counts, storage usage, trends).

**Dependencies**: None (can run in parallel)

**Estimated Effort**: Medium (5-6 hours)

**Risk Level**: Low

**Recommended Agent**: frontend-developer

**Deliverables**:
- `/frontend/src/components/DataStats/StatsOverview.tsx` - Statistics dashboard
- `/frontend/src/components/DataStats/StorageChart.tsx` - Storage usage visualization
- `/frontend/src/components/DataStats/ActivityTimeline.tsx` - Activity over time
- `/frontend/src/services/statsService.ts` - Statistics API integration
- Component tests

**Implementation Details**:

1. **Statistics Overview**:
   - Card layout with key metrics
   - Metrics: Total Charts, Total Clients, Total Interpretations, Storage Used
   - Growth indicators (vs. last month)
   - Quick actions (Export All, Create Backup)

2. **Storage Visualization**:
   - Pie chart: Storage by type (Charts, Backups, Cache, etc.)
   - Bar chart: Storage over time
   - Total storage used vs. available (disk space)
   - Cleanup suggestions (old backups, cache)

3. **Activity Timeline**:
   - Line chart: Charts created over time
   - Activity heatmap (by day of week, hour)
   - Recent activity list (last 10 actions)

4. **Data Quality Metrics**:
   - Completeness score (charts with interpretations)
   - Duplicate detection results
   - Data validation issues

**Acceptance Criteria**:
- Statistics display accurate data
- Charts render correctly
- Responsive design (mobile-friendly)
- Data updates in real-time
- Performance is good (< 1s load time)

**Test Requirements**:
- Unit tests for statistics calculations
- Component tests with mock data
- Visual regression tests for charts

---

### TASK-211: Backend API Endpoints for Backup Management

**Description**: Create REST API endpoints for backup operations, cloud storage configuration, and backup history.

**Dependencies**: TASK-204, TASK-205

**Estimated Effort**: Medium (4-5 hours)

**Risk Level**: Low

**Recommended Agent**: api-developer

**Deliverables**:
- `/backend/app/api/routes_sqlite/backup.py` - Backup management endpoints
- API documentation updates
- Integration tests

**Implementation Details**:

1. **Backup Endpoints**:
   ```
   POST /api/backup/create
     - Body: BackupRequest (encrypt, compress, cloud_upload)
     - Returns: BackupInfo (id, path, size, checksum)

   GET /api/backup/list
     - Query params: limit, offset
     - Returns: List[BackupInfo]

   GET /api/backup/{backup_id}
     - Returns: BackupInfo with metadata

   POST /api/backup/{backup_id}/restore
     - Body: RestoreOptions (confirm, selective)
     - Returns: RestoreResult

   DELETE /api/backup/{backup_id}
     - Returns: DeleteResult

   POST /api/backup/{backup_id}/verify
     - Returns: VerificationResult (valid, checksum_match, integrity_ok)

   GET /api/backup/{backup_id}/download
     - Returns: StreamingResponse with backup file
   ```

2. **Cloud Storage Endpoints**:
   ```
   GET /api/cloud-storage/providers
     - Returns: List[CloudProvider] (name, status, connected)

   POST /api/cloud-storage/{provider}/auth/initiate
     - Returns: AuthURL (OAuth URL for user to visit)

   GET /api/cloud-storage/{provider}/auth/callback
     - Query params: code, state (OAuth callback)
     - Returns: ConnectionStatus

   POST /api/cloud-storage/{provider}/disconnect
     - Returns: DisconnectionResult

   GET /api/cloud-storage/{provider}/status
     - Returns: ProviderStatus (connected, quota, last_sync)

   POST /api/cloud-storage/{provider}/upload/{backup_id}
     - Returns: UploadResult (uploaded, remote_path)

   GET /api/cloud-storage/{provider}/list
     - Returns: List[RemoteBackupInfo]

   POST /api/cloud-storage/{provider}/download/{remote_path}
     - Returns: StreamingResponse or local backup_id
   ```

3. **Settings Endpoints**:
   ```
   GET /api/backup/settings
     - Returns: BackupSettings

   PUT /api/backup/settings
     - Body: BackupSettings (schedule, retention, encryption)
     - Returns: UpdatedSettings
   ```

**Acceptance Criteria**:
- All endpoints work correctly
- OAuth flow completes successfully
- File uploads/downloads stream properly
- Settings persist correctly
- Error handling is comprehensive
- API documentation is complete

**Test Requirements**:
- Integration tests for each endpoint
- OAuth flow tests
- File streaming tests
- Settings persistence tests

---

### TASK-212: Documentation and User Guide

**Description**: Create comprehensive documentation for all Phase 2 features, including user guides, API references, and troubleshooting guides.

**Dependencies**: All other tasks (documents completed features)

**Estimated Effort**: Medium (6-8 hours)

**Risk Level**: Low

**Recommended Agent**: technical-writer

**Deliverables**:
- `/docs/DATA_PORTABILITY_GUIDE.md` - User guide for export/import/backup
- `/docs/BACKUP_SETUP.md` - Backup configuration and automation guide
- `/docs/CLOUD_STORAGE_SETUP.md` - Cloud storage integration guide
- `/docs/API_DATA_MANAGEMENT.md` - API reference for data management endpoints
- `/docs/TROUBLESHOOTING_DATA.md` - Common issues and solutions
- Update `/README.md` with Phase 2 features
- Update `/docs/USER_GUIDE.md` with new sections

**Documentation Sections**:

1. **Data Portability Guide**:
   - Exporting data (formats, options)
   - Importing data (validation, conflicts)
   - Format conversion utilities
   - Use cases and examples

2. **Backup Setup**:
   - Manual backup creation
   - Automated backup configuration
   - Backup encryption setup
   - Backup verification
   - Restoration procedures
   - Best practices

3. **Cloud Storage Setup**:
   - Provider setup (Dropbox, Google Drive, S3)
   - OAuth authentication
   - Automatic sync configuration
   - Troubleshooting connection issues
   - Security considerations

4. **API Reference**:
   - Export endpoints with examples
   - Import endpoints with examples
   - Backup endpoints with examples
   - Cloud storage endpoints with examples
   - Request/response schemas

5. **Troubleshooting**:
   - Export/import errors
   - Backup failures
   - Cloud storage issues
   - Performance optimization
   - Data recovery procedures

**Acceptance Criteria**:
- All features are documented
- Step-by-step guides are clear
- Screenshots and examples are included
- API documentation matches implementation
- Troubleshooting covers common issues
- Documentation is reviewed and proofread

---

### TASK-213: Testing and Quality Assurance

**Description**: Comprehensive testing of all Phase 2 features, including unit tests, integration tests, E2E tests, and performance tests.

**Dependencies**: All implementation tasks (TASK-201 through TASK-211)

**Estimated Effort**: Large (8-10 hours)

**Risk Level**: Medium

**Recommended Agent**: qa-specialist

**Deliverables**:
- Complete test suite for export/import services
- Integration tests for backup automation
- E2E tests for UI workflows
- Performance tests for large datasets
- Security tests for encryption and cloud storage
- Test coverage report (target: 90%+)
- Bug fixes for discovered issues

**Testing Scope**:

1. **Unit Tests** (Backend):
   - Export service (all formats and modes)
   - Import service (validation, conflict resolution)
   - Backup service (encryption, verification)
   - Cloud storage providers (mocked)
   - Format converters
   - Validators

2. **Integration Tests** (Backend):
   - Export → Import round-trip
   - Backup → Restore round-trip
   - Cloud upload → Download round-trip
   - API endpoints (all routes)
   - OAuth flows (mocked)

3. **E2E Tests** (Frontend + Backend):
   - Export chart workflow
   - Import data workflow
   - Create backup workflow
   - Restore backup workflow
   - Configure cloud storage workflow
   - Conflict resolution workflow

4. **Performance Tests**:
   - Export 1000 charts (time, memory)
   - Import 1000 charts (time, memory)
   - Backup 100MB database (time)
   - Stream large file download (no timeout)
   - Concurrent operations (multiple exports)

5. **Security Tests**:
   - Encryption strength validation
   - OAuth token security
   - Cloud credentials storage
   - SQL injection prevention
   - Path traversal prevention
   - File upload validation

6. **Cross-Platform Tests**:
   - Linux (Ubuntu 24.04)
   - macOS (14+)
   - Windows (10/11)
   - Different Python versions (3.10, 3.11, 3.12)

**Acceptance Criteria**:
- Test coverage ≥ 90% for new code
- All tests pass on all platforms
- No critical bugs remain
- Performance benchmarks met
- Security vulnerabilities addressed
- Documentation reflects test results

**Test Requirements**:
- Automated test suite runs in CI/CD
- Test data fixtures for all scenarios
- Performance benchmarks documented
- Security audit report generated

---

## Execution Plan

### Phase 1: Backend Foundation (Parallel Execution)

**Duration**: 1 week (5-7 days)

**Parallel Tasks**:
- **Agent 1**: TASK-201 (Export Service)
- **Agent 2**: TASK-204 (Enhanced Backup System)
- **Agent 3**: TASK-206 (Format Converters)

**Outcome**: Core backend services ready for API integration

---

### Phase 2: Backend Integration (Sequential + Parallel)

**Duration**: 1 week (5-7 days)

**Week 1**:
- **Agent 1**: TASK-202 (Import Service) - depends on TASK-201
- **Agent 2**: TASK-205 (Cloud Storage) - depends on TASK-204
- **Agent 3**: Can start TASK-210 (Data Stats) in parallel

**Week 1 Continued**:
- **Agent 1**: TASK-203 (Export/Import API) - after TASK-202 completes
- **Agent 2**: TASK-211 (Backup API) - after TASK-205 completes

**Outcome**: All backend APIs ready for frontend integration

---

### Phase 3: Frontend Development (Parallel Execution)

**Duration**: 1 week (5-7 days)

**Parallel Tasks**:
- **Agent 1**: TASK-207 (Export UI)
- **Agent 2**: TASK-208 (Import UI)
- **Agent 3**: TASK-209 (Backup Management UI)

**Outcome**: Complete UI for all data management features

---

### Phase 4: Testing and Documentation (Parallel)

**Duration**: 3-5 days

**Parallel Tasks**:
- **Agent 1**: TASK-213 (Testing and QA)
- **Agent 2**: TASK-212 (Documentation)

**Outcome**: Fully tested and documented Phase 2 features

---

## Critical Path

The critical path (longest sequence of dependent tasks) is:

1. **TASK-201**: Export Service (8-10 hours)
2. **TASK-202**: Import Service (10-12 hours) - depends on TASK-201
3. **TASK-203**: Export/Import API (4-6 hours) - depends on TASK-202
4. **TASK-208**: Import UI (7-8 hours) - depends on TASK-203
5. **TASK-213**: Testing (8-10 hours) - depends on TASK-208

**Total Critical Path Duration**: ~37-46 hours (approximately 1.5-2 weeks of focused work)

---

## Dependency Graph

```
TASK-201 (Export Service)
    ↓
TASK-202 (Import Service)
    ↓
TASK-203 (Export/Import API)
    ↓
TASK-207 (Export UI)
TASK-208 (Import UI)

TASK-204 (Backup System)
    ↓
TASK-205 (Cloud Storage)
    ↓
TASK-211 (Backup API)
    ↓
TASK-209 (Backup UI)

TASK-206 (Converters) ─── (Independent)

TASK-210 (Data Stats) ─── (Independent)

All tasks → TASK-213 (Testing)
All tasks → TASK-212 (Documentation)
```

---

## Risk Assessment and Mitigation

### High-Risk Areas

1. **Cloud Storage Integration (TASK-205)**
   - **Risk**: OAuth complexity, provider API changes, rate limiting
   - **Mitigation**:
     - Thorough mocking and testing
     - Graceful degradation (app works without cloud)
     - Clear error messages for users
     - Documentation for each provider

2. **Import Conflict Resolution (TASK-202)**
   - **Risk**: Complex logic, edge cases, data corruption
   - **Mitigation**:
     - Extensive unit tests for all scenarios
     - Dry-run mode for testing
     - Transaction rollback on errors
     - Backup before import (automatic safety backup)

3. **Large Dataset Performance (TASK-201, TASK-202)**
   - **Risk**: Memory issues, timeouts, slow operations
   - **Mitigation**:
     - Streaming for all large operations
     - Chunked processing
     - Progress indicators
     - Performance tests with realistic data

### Medium-Risk Areas

1. **Backup Encryption (TASK-204)**
   - **Risk**: Weak encryption, key management issues
   - **Mitigation**:
     - Use proven libraries (cryptography, pycryptodome)
     - AES-256 encryption standard
     - Secure key derivation (PBKDF2/Argon2)
     - Documentation on key management

2. **Cross-Platform Compatibility (All Tasks)**
   - **Risk**: Path issues, file system differences
   - **Mitigation**:
     - Use pathlib for all file operations
     - Test on all platforms
     - Handle case-sensitivity differences
     - Docker testing environment

3. **UI Complexity (TASK-208, TASK-209)**
   - **Risk**: Confusing UX, too many options
   - **Mitigation**:
     - User testing with mock-ups
     - Progressive disclosure (advanced options hidden)
     - Tooltips and help text
     - Sensible defaults

---

## Testing Strategy

### Test Coverage Goals

- **Backend**: 90%+ code coverage
- **Frontend**: 85%+ code coverage
- **Integration**: All major workflows
- **E2E**: Critical user journeys

### Test Types

1. **Unit Tests**: All services and utilities
2. **Integration Tests**: API endpoints and database operations
3. **E2E Tests**: Complete user workflows
4. **Performance Tests**: Large dataset handling
5. **Security Tests**: Encryption, OAuth, input validation
6. **Cross-Platform Tests**: Linux, macOS, Windows

### Continuous Integration

- Run all tests on every commit
- Performance benchmarks on PR
- Security scans (bandit, safety)
- Code coverage reports
- Cross-platform matrix testing

---

## Success Metrics

### Functional Metrics

- [ ] 100% of planned features implemented
- [ ] All acceptance criteria met
- [ ] Zero critical bugs in production
- [ ] Test coverage ≥ 90% backend, ≥ 85% frontend

### Performance Metrics

- [ ] Export 1000 charts in < 30 seconds
- [ ] Import 1000 charts in < 60 seconds
- [ ] Backup creation in < 10 seconds (100MB database)
- [ ] Cloud upload in < 60 seconds (100MB file)
- [ ] UI response time < 1 second for all operations

### User Experience Metrics

- [ ] Export workflow: ≤ 3 clicks to download
- [ ] Import workflow: ≤ 5 clicks to complete
- [ ] Backup workflow: ≤ 2 clicks for manual backup
- [ ] Cloud setup: ≤ 5 minutes total
- [ ] Documentation: All features explained clearly

### Quality Metrics

- [ ] Zero data loss incidents
- [ ] Zero data corruption incidents
- [ ] Encryption strength verified (AES-256)
- [ ] OAuth security best practices followed
- [ ] All file paths handle special characters

---

## Deliverable Checklist

### Code Deliverables

- [ ] Export service with JSON/CSV support
- [ ] Import service with validation and conflict resolution
- [ ] Enhanced backup system with automation
- [ ] Cloud storage integration (3 providers)
- [ ] Format conversion utilities
- [ ] REST API endpoints for all features
- [ ] React UI components for export/import/backup
- [ ] Data statistics and visualization

### Testing Deliverables

- [ ] Unit test suite (90%+ coverage)
- [ ] Integration test suite
- [ ] E2E test suite
- [ ] Performance test suite
- [ ] Security test suite
- [ ] Cross-platform test results

### Documentation Deliverables

- [ ] Data Portability Guide
- [ ] Backup Setup Guide
- [ ] Cloud Storage Setup Guide
- [ ] API Reference (data management)
- [ ] Troubleshooting Guide
- [ ] Updated README and User Guide

---

## Agent Recommendations

### Suggested Agent Roles

1. **backend-specialist**: Python/FastAPI expert for services (TASK-201, TASK-202, TASK-206)
2. **api-developer**: API endpoint specialist (TASK-203, TASK-211)
3. **devops-specialist**: Backup automation and scheduling (TASK-204)
4. **integration-specialist**: Cloud storage and OAuth (TASK-205)
5. **frontend-developer**: React/TypeScript expert (TASK-207, TASK-208, TASK-209, TASK-210)
6. **qa-specialist**: Testing and quality assurance (TASK-213)
7. **technical-writer**: Documentation specialist (TASK-212)

### Maximum Parallelism

**Week 1**: 3 agents simultaneously
- Agent 1: TASK-201
- Agent 2: TASK-204
- Agent 3: TASK-206

**Week 2**: 3 agents simultaneously
- Agent 1: TASK-202
- Agent 2: TASK-205
- Agent 3: TASK-210

**Week 3**: 3 agents simultaneously
- Agent 1: TASK-207
- Agent 2: TASK-208
- Agent 3: TASK-209

**Week 4**: 2 agents simultaneously
- Agent 1: TASK-213
- Agent 2: TASK-212

---

## Timeline Summary

### Optimistic Timeline (Maximum Parallelism)

- **Week 1**: Backend foundation (TASK-201, TASK-204, TASK-206)
- **Week 2**: Backend integration (TASK-202, TASK-205, TASK-203, TASK-211)
- **Week 3**: Frontend development (TASK-207, TASK-208, TASK-209, TASK-210)
- **Week 4**: Testing and documentation (TASK-213, TASK-212)

**Total Duration**: 4 weeks

### Conservative Timeline (Sequential with Some Parallelism)

- **Week 1-2**: Backend services (TASK-201 → TASK-202 → TASK-203)
- **Week 2-3**: Backup and cloud (TASK-204 → TASK-205 → TASK-211)
- **Week 3-4**: Frontend (TASK-207 → TASK-208 → TASK-209)
- **Week 5**: Testing, documentation, utilities (TASK-213, TASK-212, TASK-206, TASK-210)

**Total Duration**: 5 weeks

---

## Integration Points

### Between Backend and Frontend

1. **After TASK-203**: Export/Import API ready for frontend (TASK-207, TASK-208)
2. **After TASK-211**: Backup API ready for frontend (TASK-209)
3. **Testing Phase**: Full integration testing of all workflows

### Between Backup and Cloud Storage

1. **TASK-204** provides base backup service
2. **TASK-205** extends it with cloud upload capabilities
3. **TASK-211** exposes both via API
4. **TASK-209** presents unified UI

### Between Export and Import

1. **TASK-201** defines export schemas
2. **TASK-202** uses those schemas for import validation
3. **TASK-203** provides unified API
4. **TASK-207 + TASK-208** provide consistent UI/UX

---

## Validation and Review Points

### After Backend Foundation (Week 1)

**Review**:
- Export service produces valid files
- Backup system creates verifiable backups
- Format converters work correctly

**Validation**:
- Manual testing of export to JSON/CSV
- Manual testing of backup creation
- Round-trip testing (export → convert → import)

### After Backend Integration (Week 2)

**Review**:
- Import service handles all export formats
- Cloud storage uploads work
- API endpoints are complete

**Validation**:
- API documentation review
- Postman/curl testing of all endpoints
- OAuth flow testing with real providers

### After Frontend Development (Week 3)

**Review**:
- UI components match design
- User workflows are intuitive
- Error handling is user-friendly

**Validation**:
- UX review with stakeholders
- Accessibility testing
- Cross-browser testing

### Final Review (Week 4)

**Review**:
- All features complete
- Documentation complete
- Test coverage meets goals

**Validation**:
- User acceptance testing
- Performance benchmarking
- Security audit

---

## Rollout Strategy

### Phase 2 Release Approach

1. **Beta Release** (Internal Testing)
   - Deploy to staging environment
   - Test with real user data
   - Gather feedback on UI/UX
   - Fix critical bugs

2. **Feature Flags** (Gradual Rollout)
   - Export: Enable immediately (low risk)
   - Import: Enable after validation tests
   - Cloud Storage: Enable as optional feature
   - Automated Backups: Enable with user consent

3. **Production Release**
   - Update to version 2.1.0
   - Migration guide for existing users
   - Announcement and documentation
   - Monitor for issues

4. **Post-Release**
   - Collect user feedback
   - Monitor error logs
   - Performance monitoring
   - Iterate on improvements

---

## Contingency Plans

### If Cloud Storage Proves Too Complex

- **Option 1**: Release without cloud storage (TASK-205 becomes stretch goal)
- **Option 2**: Implement only one provider (Dropbox) initially
- **Option 3**: Provide WebDAV support (simpler than OAuth)

### If Import Conflict Resolution Is Too Complex

- **Option 1**: Start with "replace all" strategy only
- **Option 2**: Implement basic conflict detection with manual resolution
- **Option 3**: Require users to clean data before import

### If Performance Issues Arise

- **Option 1**: Implement pagination for large exports
- **Option 2**: Add background job processing for imports
- **Option 3**: Provide chunked export (multiple files)

---

## Phase 2 Completion Criteria

Phase 2 will be considered complete when:

1. **All 13 tasks are completed** with acceptance criteria met
2. **Test coverage goals achieved** (90% backend, 85% frontend)
3. **Documentation is complete** and reviewed
4. **User acceptance testing** passes all scenarios
5. **Performance benchmarks** are met
6. **Security audit** passes with no critical issues
7. **Cross-platform testing** confirms compatibility
8. **Production deployment** is successful
9. **User feedback** is positive (no major usability issues)
10. **Monitoring** shows stable operation for 1 week

---

## Next Steps

1. **Review this plan** with stakeholders
2. **Assign agents** to tasks
3. **Set up project tracking** (GitHub issues, project board)
4. **Create feature branch**: `feature/phase-2-data-portability`
5. **Begin with Phase 1 tasks** (TASK-201, TASK-204, TASK-206)
6. **Daily standups** to track progress and blockers
7. **Weekly reviews** at each integration point

---

## Appendix: Task Summary Table

| Task | Name | Effort | Risk | Dependencies | Duration | Agent |
|------|------|--------|------|--------------|----------|-------|
| TASK-201 | Export Service | Large | Medium | None | 8-10h | backend-specialist |
| TASK-202 | Import Service | Large | High | TASK-201 | 10-12h | backend-specialist |
| TASK-203 | Export/Import API | Medium | Low | TASK-201, TASK-202 | 4-6h | api-developer |
| TASK-204 | Enhanced Backup | Medium | Medium | None | 6-8h | devops-specialist |
| TASK-205 | Cloud Storage | Large | High | TASK-204 | 10-12h | integration-specialist |
| TASK-206 | Format Converters | Small | Low | TASK-201 | 3-4h | backend-specialist |
| TASK-207 | Export UI | Medium | Low | TASK-203 | 5-6h | frontend-developer |
| TASK-208 | Import UI | Large | Medium | TASK-203 | 7-8h | frontend-developer |
| TASK-209 | Backup UI | Large | Medium | TASK-204, TASK-205 | 8-10h | frontend-developer |
| TASK-210 | Data Stats UI | Medium | Low | None | 5-6h | frontend-developer |
| TASK-211 | Backup API | Medium | Low | TASK-204, TASK-205 | 4-5h | api-developer |
| TASK-212 | Documentation | Medium | Low | All tasks | 6-8h | technical-writer |
| TASK-213 | Testing & QA | Large | Medium | All tasks | 8-10h | qa-specialist |

**Total Estimated Effort**: 84-105 hours

**With 3 agents working in parallel**: 3-4 weeks

---

**End of Phase 2 Project Plan**

*Last Updated: November 16, 2025*
*Plan Version: 1.0*
*Status: Ready for Execution*
