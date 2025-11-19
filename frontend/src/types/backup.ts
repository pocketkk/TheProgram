/**
 * TypeScript types for backup system
 *
 * These types match the backend API schemas from:
 * /backend/app/schemas_sqlite/data_portability.py
 */

/**
 * Backup metadata returned from API
 */
export interface Backup {
  backup_id: string
  filename: string
  created_at: string
  backup_type: 'manual' | 'scheduled' | 'automatic'
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'corrupted'
  original_size: number
  compressed_size: number | null
  encrypted: boolean
  compressed: boolean
  checksum: string
  checksum_algorithm: string
  schema_version: string | null
  table_counts: Record<string, number>
  total_records: number
  description: string | null
  tags: string[]
  verified: boolean
  verification_date: string | null
}

/**
 * Options for creating a new backup
 */
export interface BackupOptions {
  encrypt?: boolean
  compress?: boolean
  verify?: boolean
  description?: string
  tags?: string[]
}

/**
 * Options for restoring from backup
 */
export interface RestoreOptions {
  verify_first?: boolean
  create_safety_backup?: boolean
}

/**
 * Backup creation response
 */
export interface BackupCreateResponse extends Backup {
  message?: string
}

/**
 * Backup list response
 */
export interface BackupListResponse {
  backups: Backup[]
  total: number
  limit: number
  offset: number
}

/**
 * Backup verification result
 */
export interface BackupVerificationResult {
  backup_id: string
  verified: boolean
  verification_date: string
  errors: string[]
  checks_performed: string[]
  details?: {
    file_exists?: boolean
    checksum_valid?: boolean
    decryption_ok?: boolean
    decompression_ok?: boolean
    sqlite_integrity_ok?: boolean
  }
}

/**
 * Backup restore response
 */
export interface BackupRestoreResponse {
  success: boolean
  message: string
  backup_id: string
  safety_backup_id: string | null
  records_restored: number
  restore_timestamp: string
}

/**
 * Backup deletion response
 */
export interface BackupDeleteResponse {
  success: boolean
  message: string
  backup_id: string
}

/**
 * Backup cleanup options
 */
export interface BackupCleanupOptions {
  keep_count?: number
  older_than_days?: number
  delete_unverified?: boolean
  delete_failed?: boolean
}

/**
 * Backup cleanup response
 */
export interface BackupCleanupResponse {
  success: boolean
  message: string
  deleted_count: number
  freed_space: number
  deleted_backup_ids: string[]
}

/**
 * Backup system status
 */
export interface BackupStatus {
  enabled: boolean
  last_backup: string | null
  next_scheduled: string | null
  storage_path: string
  storage_used: number
  backup_count: number
  verified_count: number
  failed_count: number
}

/**
 * Backup statistics
 */
export interface BackupStats {
  total_backups: number
  encrypted_backups: number
  compressed_backups: number
  verified_backups: number
  failed_backups: number
  total_storage_used: number
  average_backup_size: number
  oldest_backup_date: string | null
  newest_backup_date: string | null
  backups_per_type: Record<string, number>
  storage_trend: {
    date: string
    size: number
  }[]
}

/**
 * Backup filters for listing
 */
export interface BackupFilters {
  limit?: number
  offset?: number
  encrypted_only?: boolean
  verified_only?: boolean
  backup_type?: 'manual' | 'scheduled' | 'automatic'
  status?: 'pending' | 'in_progress' | 'completed' | 'failed' | 'corrupted'
  tags?: string[]
}

/**
 * Backup schedule configuration
 */
export interface BackupScheduleConfig {
  enabled: boolean
  frequency: 'hourly' | 'daily' | 'weekly' | 'custom'
  hour?: number // 0-23, for daily/weekly
  day?: number // 0-6 (Sunday-Saturday), for weekly
  cron_expression?: string // for custom
  encrypt: boolean
  compress: boolean
  verify: boolean
  retention_count?: number // keep last N backups
  retention_days?: number // keep backups for N days
}
