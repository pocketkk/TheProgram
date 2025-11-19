/**
 * Backup Dashboard Page
 *
 * Main dashboard for managing backups, restores, and scheduling
 */
import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  AnimatedCard,
} from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  Database,
  Plus,
  RotateCcw,
  Clock,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  Settings,
  Download,
  Trash2,
} from 'lucide-react'
import { useBackups } from './hooks/useBackups'
import { CreateBackupDialog } from './components/CreateBackupDialog'
import { RestoreBackupDialog } from './components/RestoreBackupDialog'
import { BackupDetailsModal } from './components/BackupDetailsModal'
import { BackupList } from './components/BackupList'
import { BackupStorageChart } from './components/BackupStorageChart'
import { BackupScheduleSettings } from './components/BackupScheduleSettings'
import { downloadBackup, cleanupBackups } from '@/lib/api/backup'
import { formatDistanceToNow, formatBytes } from '@/lib/utils'
import type { Backup, BackupScheduleConfig } from '@/types/backup'

export function BackupDashboard() {
  const {
    backups,
    status,
    stats,
    loading,
    error,
    refreshBackups,
    createNewBackup,
    verifyBackupById,
    restoreBackupById,
    deleteBackupById,
    cleanupOldBackups,
  } = useBackups(30000) // Auto-refresh every 30 seconds

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false)
  const [scheduleSettingsOpen, setScheduleSettingsOpen] = useState(false)
  const [selectedBackup, setSelectedBackup] = useState<Backup | null>(null)
  const [detailsModalOpen, setDetailsModalOpen] = useState(false)

  const handleCreateBackup = async (options: any) => {
    const backup = await createNewBackup(options)
    return backup
  }

  const handleRestore = async (backupId: string, createSafetyBackup: boolean) => {
    await restoreBackupById(backupId, {
      verify_first: true,
      create_safety_backup: createSafetyBackup,
    })
  }

  const handleVerify = async (backupId: string): Promise<boolean> => {
    try {
      await verifyBackupById(backupId)
      return true
    } catch {
      return false
    }
  }

  const handleDelete = async (backupId: string) => {
    if (confirm('Are you sure you want to delete this backup? This cannot be undone.')) {
      await deleteBackupById(backupId)
    }
  }

  const handleDownload = async (backupId: string) => {
    try {
      const blob = await downloadBackup(backupId)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `backup_${backupId}.db`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Download failed:', err)
      alert('Failed to download backup')
    }
  }

  const handleCleanup = async () => {
    if (confirm('This will delete old backups according to retention policy. Continue?')) {
      await cleanupOldBackups({ keep_count: 30 })
    }
  }

  const handleViewDetails = (backup: Backup) => {
    setSelectedBackup(backup)
    setDetailsModalOpen(true)
  }

  const handleSaveSchedule = async (config: BackupScheduleConfig) => {
    // TODO: Implement schedule save API call
    console.log('Save schedule:', config)
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-4xl font-heading font-bold text-gradient-celestial mb-2">
            Backup & Restore
          </h1>
          <p className="text-gray-400">
            Manage your database backups, restore points, and automatic scheduling
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setScheduleSettingsOpen(true)}>
            <Settings className="h-4 w-4" />
            Schedule
          </Button>
          <Button variant="secondary" onClick={() => setRestoreDialogOpen(true)}>
            <RotateCcw className="h-4 w-4" />
            Restore
          </Button>
          <Button variant="celestial" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Create Backup
          </Button>
        </div>
      </motion.div>

      {/* Error Banner */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-lg bg-red-500/10 border border-red-500/50 flex items-center gap-3"
        >
          <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </motion.div>
      )}

      {/* Status Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <AnimatedCard>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="rounded-lg bg-cosmic-800 p-3 text-celestial-cyan">
                  <Database className="h-6 w-6" />
                </div>
                <Badge variant="secondary">
                  {status?.last_backup ? 'Active' : 'No backups'}
                </Badge>
              </div>
              <h3 className="text-3xl font-bold mb-1">
                {status?.backup_count || 0}
              </h3>
              <p className="text-sm text-gray-400">Total Backups</p>
            </CardContent>
          </AnimatedCard>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <AnimatedCard>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="rounded-lg bg-cosmic-800 p-3 text-green-500">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <Badge variant="secondary" className="bg-green-500/20 text-green-500">
                  Verified
                </Badge>
              </div>
              <h3 className="text-3xl font-bold mb-1">
                {status?.verified_count || 0}
              </h3>
              <p className="text-sm text-gray-400">Verified Backups</p>
            </CardContent>
          </AnimatedCard>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <AnimatedCard>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="rounded-lg bg-cosmic-800 p-3 text-celestial-pink">
                  <HardDrive className="h-6 w-6" />
                </div>
                <Badge variant="secondary">
                  {status?.storage_used ? formatBytes(status.storage_used) : '0 B'}
                </Badge>
              </div>
              <h3 className="text-3xl font-bold mb-1">
                {stats ? formatBytes(stats.total_storage_used) : '0 B'}
              </h3>
              <p className="text-sm text-gray-400">Storage Used</p>
            </CardContent>
          </AnimatedCard>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <AnimatedCard>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="rounded-lg bg-cosmic-800 p-3 text-celestial-gold">
                  <Clock className="h-6 w-6" />
                </div>
                <Badge variant="secondary">
                  {status?.enabled ? 'Enabled' : 'Manual'}
                </Badge>
              </div>
              <h3 className="text-xl font-bold mb-1">
                {status?.last_backup
                  ? formatDistanceToNow(new Date(status.last_backup))
                  : 'Never'}
              </h3>
              <p className="text-sm text-gray-400">Last Backup</p>
            </CardContent>
          </AnimatedCard>
        </motion.div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Backup List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="lg:col-span-2"
        >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Backup History</CardTitle>
                  <CardDescription>
                    Recent backups and restore points
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={handleCleanup}>
                    <Trash2 className="h-4 w-4" />
                    Cleanup
                  </Button>
                  <Button variant="ghost" size="sm" onClick={refreshBackups}>
                    Refresh
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading && backups.length === 0 ? (
                <div className="text-center py-12">
                  <div className="h-8 w-8 border-2 border-celestial-cyan/30 border-t-celestial-cyan rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-gray-400">Loading backups...</p>
                </div>
              ) : (
                <BackupList
                  backups={backups}
                  onView={handleViewDetails}
                  onVerify={handleVerify}
                  onRestore={(id) => {
                    const backup = backups.find((b) => b.backup_id === id)
                    if (backup) {
                      setSelectedBackup(backup)
                      setRestoreDialogOpen(true)
                    }
                  }}
                  onDelete={handleDelete}
                  onDownload={handleDownload}
                />
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Storage Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <BackupStorageChart stats={stats} />
        </motion.div>
      </div>

      {/* Schedule Settings (Collapsible) */}
      {scheduleSettingsOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <BackupScheduleSettings onSave={handleSaveSchedule} />
        </motion.div>
      )}

      {/* Dialogs */}
      <CreateBackupDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onCreateBackup={handleCreateBackup}
      />

      <RestoreBackupDialog
        backups={backups}
        open={restoreDialogOpen}
        onClose={() => setRestoreDialogOpen(false)}
        onRestore={handleRestore}
        onVerify={handleVerify}
      />

      <BackupDetailsModal
        backup={selectedBackup}
        open={detailsModalOpen}
        onClose={() => {
          setDetailsModalOpen(false)
          setSelectedBackup(null)
        }}
        onVerify={handleVerify}
        onRestore={(id) => {
          setDetailsModalOpen(false)
          setRestoreDialogOpen(true)
        }}
        onDelete={handleDelete}
        onDownload={handleDownload}
      />
    </div>
  )
}
