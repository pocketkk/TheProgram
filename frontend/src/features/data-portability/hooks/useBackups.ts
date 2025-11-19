/**
 * React hook for managing backup operations
 *
 * Provides state management and operations for the backup system
 */
import { useState, useEffect, useCallback } from 'react'
import {
  listBackups,
  getBackupStatus,
  getBackupStats,
  createBackup,
  verifyBackup,
  restoreBackup,
  deleteBackup,
  cleanupBackups,
} from '@/lib/api/backup'
import type {
  Backup,
  BackupOptions,
  RestoreOptions,
  BackupCleanupOptions,
  BackupStatus,
  BackupStats,
  BackupFilters,
} from '@/types/backup'

interface UseBackupsResult {
  // State
  backups: Backup[]
  status: BackupStatus | null
  stats: BackupStats | null
  loading: boolean
  error: string | null

  // Operations
  refreshBackups: () => Promise<void>
  refreshStatus: () => Promise<void>
  refreshStats: () => Promise<void>
  createNewBackup: (options?: BackupOptions) => Promise<Backup>
  verifyBackupById: (backupId: string) => Promise<void>
  restoreBackupById: (backupId: string, options?: RestoreOptions) => Promise<void>
  deleteBackupById: (backupId: string) => Promise<void>
  cleanupOldBackups: (options?: BackupCleanupOptions) => Promise<void>
}

/**
 * Custom hook for backup management
 *
 * @param autoRefresh - Auto-refresh interval in milliseconds (0 to disable)
 * @param filters - Initial filters for backup list
 */
export function useBackups(
  autoRefresh: number = 0,
  filters?: BackupFilters
): UseBackupsResult {
  const [backups, setBackups] = useState<Backup[]>([])
  const [status, setStatus] = useState<BackupStatus | null>(null)
  const [stats, setStats] = useState<BackupStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Refresh backup list
   */
  const refreshBackups = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await listBackups(filters)
      setBackups(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch backups')
      console.error('Error fetching backups:', err)
    } finally {
      setLoading(false)
    }
  }, [filters])

  /**
   * Refresh system status
   */
  const refreshStatus = useCallback(async () => {
    try {
      const data = await getBackupStatus()
      setStatus(data)
    } catch (err) {
      console.error('Error fetching backup status:', err)
    }
  }, [])

  /**
   * Refresh statistics
   */
  const refreshStats = useCallback(async () => {
    try {
      const data = await getBackupStats()
      setStats(data)
    } catch (err) {
      console.error('Error fetching backup stats:', err)
    }
  }, [])

  /**
   * Create a new backup
   */
  const createNewBackup = useCallback(
    async (options?: BackupOptions): Promise<Backup> => {
      try {
        setLoading(true)
        setError(null)
        const backup = await createBackup(options)
        await refreshBackups()
        await refreshStatus()
        await refreshStats()
        return backup
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to create backup'
        setError(errorMsg)
        throw new Error(errorMsg)
      } finally {
        setLoading(false)
      }
    },
    [refreshBackups, refreshStatus, refreshStats]
  )

  /**
   * Verify a backup
   */
  const verifyBackupById = useCallback(
    async (backupId: string): Promise<void> => {
      try {
        setLoading(true)
        setError(null)
        await verifyBackup(backupId)
        await refreshBackups()
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to verify backup'
        setError(errorMsg)
        throw new Error(errorMsg)
      } finally {
        setLoading(false)
      }
    },
    [refreshBackups]
  )

  /**
   * Restore from backup
   */
  const restoreBackupById = useCallback(
    async (backupId: string, options?: RestoreOptions): Promise<void> => {
      try {
        setLoading(true)
        setError(null)
        await restoreBackup(backupId, options)
        await refreshBackups()
        await refreshStatus()
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to restore backup'
        setError(errorMsg)
        throw new Error(errorMsg)
      } finally {
        setLoading(false)
      }
    },
    [refreshBackups, refreshStatus]
  )

  /**
   * Delete a backup
   */
  const deleteBackupById = useCallback(
    async (backupId: string): Promise<void> => {
      try {
        setLoading(true)
        setError(null)
        await deleteBackup(backupId)
        await refreshBackups()
        await refreshStatus()
        await refreshStats()
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to delete backup'
        setError(errorMsg)
        throw new Error(errorMsg)
      } finally {
        setLoading(false)
      }
    },
    [refreshBackups, refreshStatus, refreshStats]
  )

  /**
   * Cleanup old backups
   */
  const cleanupOldBackups = useCallback(
    async (options?: BackupCleanupOptions): Promise<void> => {
      try {
        setLoading(true)
        setError(null)
        await cleanupBackups(options)
        await refreshBackups()
        await refreshStatus()
        await refreshStats()
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to cleanup backups'
        setError(errorMsg)
        throw new Error(errorMsg)
      } finally {
        setLoading(false)
      }
    },
    [refreshBackups, refreshStatus, refreshStats]
  )

  // Initial data fetch
  useEffect(() => {
    refreshBackups()
    refreshStatus()
    refreshStats()
  }, [refreshBackups, refreshStatus, refreshStats])

  // Auto-refresh timer
  useEffect(() => {
    if (autoRefresh > 0) {
      const interval = setInterval(() => {
        refreshBackups()
        refreshStatus()
      }, autoRefresh)

      return () => clearInterval(interval)
    }
  }, [autoRefresh, refreshBackups, refreshStatus])

  return {
    backups,
    status,
    stats,
    loading,
    error,
    refreshBackups,
    refreshStatus,
    refreshStats,
    createNewBackup,
    verifyBackupById,
    restoreBackupById,
    deleteBackupById,
    cleanupOldBackups,
  }
}
