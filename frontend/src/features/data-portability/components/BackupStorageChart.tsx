/**
 * Backup Storage Chart Component
 *
 * Visualizes backup storage usage with a simple chart
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { HardDrive, TrendingUp, Calendar } from 'lucide-react'
import type { BackupStats } from '@/types/backup'
import { formatBytes } from '@/lib/utils'

interface BackupStorageChartProps {
  stats: BackupStats | null
}

export function BackupStorageChart({ stats }: BackupStorageChartProps) {
  if (!stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5 text-celestial-cyan" />
            Storage Usage
          </CardTitle>
          <CardDescription>Loading storage statistics...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-center justify-center">
            <p className="text-gray-500">No data available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const averageSize = stats.average_backup_size
  const totalStorage = stats.total_storage_used
  const totalBackups = stats.total_backups

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HardDrive className="h-5 w-5 text-celestial-cyan" />
          Storage Usage
        </CardTitle>
        <CardDescription>
          Backup storage overview and statistics
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Total Storage */}
        <div className="text-center p-6 rounded-lg glass border border-cosmic-700">
          <p className="text-sm text-gray-400 mb-2">Total Storage Used</p>
          <p className="text-4xl font-bold text-gradient-celestial mb-1">
            {formatBytes(totalStorage)}
          </p>
          <p className="text-sm text-gray-500">
            {totalBackups} backup{totalBackups !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-lg glass">
            <div className="flex items-center gap-2 text-gray-400 mb-2">
              <TrendingUp className="h-4 w-4" />
              <p className="text-sm">Average Size</p>
            </div>
            <p className="text-2xl font-bold">{formatBytes(averageSize)}</p>
          </div>

          <div className="p-4 rounded-lg glass">
            <div className="flex items-center gap-2 text-gray-400 mb-2">
              <Calendar className="h-4 w-4" />
              <p className="text-sm">Total Backups</p>
            </div>
            <p className="text-2xl font-bold">{totalBackups}</p>
          </div>
        </div>

        {/* Backup Types Breakdown */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-400">Backup Properties</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 rounded glass">
              <span className="text-sm">Encrypted</span>
              <span className="font-medium text-celestial-cyan">
                {stats.encrypted_backups}
              </span>
            </div>
            <div className="flex items-center justify-between p-2 rounded glass">
              <span className="text-sm">Compressed</span>
              <span className="font-medium text-celestial-pink">
                {stats.compressed_backups}
              </span>
            </div>
            <div className="flex items-center justify-between p-2 rounded glass">
              <span className="text-sm">Verified</span>
              <span className="font-medium text-green-500">
                {stats.verified_backups}
              </span>
            </div>
            {stats.failed_backups > 0 && (
              <div className="flex items-center justify-between p-2 rounded glass">
                <span className="text-sm">Failed</span>
                <span className="font-medium text-red-500">
                  {stats.failed_backups}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Date Range */}
        {stats.oldest_backup_date && stats.newest_backup_date && (
          <div className="pt-4 border-t border-cosmic-700">
            <div className="flex items-center justify-between text-sm">
              <div>
                <p className="text-gray-500">Oldest</p>
                <p className="font-medium">
                  {new Date(stats.oldest_backup_date).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-gray-500">Newest</p>
                <p className="font-medium">
                  {new Date(stats.newest_backup_date).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
