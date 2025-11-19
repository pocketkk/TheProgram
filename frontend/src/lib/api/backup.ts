/**
 * Backup API client
 *
 * Provides functions to interact with backup endpoints at /api/v1/backups
 */
import { apiClient, getErrorMessage } from './client'
import type {
  Backup,
  BackupOptions,
  RestoreOptions,
  BackupCreateResponse,
  BackupListResponse,
  BackupVerificationResult,
  BackupRestoreResponse,
  BackupDeleteResponse,
  BackupCleanupOptions,
  BackupCleanupResponse,
  BackupStatus,
  BackupStats,
  BackupFilters,
} from '@/types/backup'

/**
 * Create a new backup
 *
 * @param options - Backup creation options
 * @returns Backup metadata
 */
export async function createBackup(options?: BackupOptions): Promise<BackupCreateResponse> {
  try {
    const response = await apiClient.post<BackupCreateResponse>('/backups/create', options || {})
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * List available backups
 *
 * @param filters - Filtering and pagination options
 * @returns List of backups
 */
export async function listBackups(filters?: BackupFilters): Promise<Backup[]> {
  try {
    const response = await apiClient.get<Backup[]>('/backups/list', {
      params: filters,
    })
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Get details for a specific backup
 *
 * @param backupId - Backup identifier
 * @returns Backup metadata
 */
export async function getBackupDetails(backupId: string): Promise<Backup> {
  try {
    const response = await apiClient.get<Backup>(`/api/v1/backups/${backupId}`)
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Verify backup integrity
 *
 * Performs checksum validation, encryption test, decompression test,
 * and SQLite integrity check.
 *
 * @param backupId - Backup identifier
 * @returns Verification result
 */
export async function verifyBackup(backupId: string): Promise<BackupVerificationResult> {
  try {
    const response = await apiClient.post<BackupVerificationResult>(
      `/api/v1/backups/${backupId}/verify`
    )
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Restore database from backup
 *
 * WARNING: This is a destructive operation that replaces all current data.
 *
 * @param backupId - Backup identifier
 * @param options - Restore options
 * @returns Restore result
 */
export async function restoreBackup(
  backupId: string,
  options?: RestoreOptions
): Promise<BackupRestoreResponse> {
  try {
    const response = await apiClient.post<BackupRestoreResponse>(
      `/api/v1/backups/${backupId}/restore`,
      options || {}
    )
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Delete a backup permanently
 *
 * @param backupId - Backup identifier
 * @returns Deletion result
 */
export async function deleteBackup(backupId: string): Promise<BackupDeleteResponse> {
  try {
    const response = await apiClient.delete<BackupDeleteResponse>(`/api/v1/backups/${backupId}`)
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Cleanup old backups based on retention criteria
 *
 * @param options - Cleanup criteria
 * @returns Cleanup result
 */
export async function cleanupBackups(
  options?: BackupCleanupOptions
): Promise<BackupCleanupResponse> {
  try {
    const response = await apiClient.post<BackupCleanupResponse>(
      '/backups/cleanup',
      options || {}
    )
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Get backup system status
 *
 * @returns System status including last backup, storage usage, etc.
 */
export async function getBackupStatus(): Promise<BackupStatus> {
  try {
    const response = await apiClient.get<BackupStatus>('/backups/status')
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Get backup statistics
 *
 * @returns Detailed backup statistics
 */
export async function getBackupStats(): Promise<BackupStats> {
  try {
    const response = await apiClient.get<BackupStats>('/backups/stats')
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Download a backup file
 *
 * @param backupId - Backup identifier
 * @returns Blob for download
 */
export async function downloadBackup(backupId: string): Promise<Blob> {
  try {
    const response = await apiClient.get(`/api/v1/backups/${backupId}/download`, {
      responseType: 'blob',
    })
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}
