/**
 * Backup List Component
 *
 * Displays list of backups in a table format with actions
 */
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  Lock,
  Archive,
  CheckCircle2,
  XCircle,
  MoreVertical,
  Download,
  RotateCcw,
  Trash2,
  Shield,
  Eye,
  AlertCircle,
} from 'lucide-react'
import type { Backup } from '@/types/backup'
import { formatBytes, formatDistanceToNow } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface BackupListProps {
  backups: Backup[]
  onView?: (backup: Backup) => void
  onVerify?: (backupId: string) => void
  onRestore?: (backupId: string) => void
  onDelete?: (backupId: string) => void
  onDownload?: (backupId: string) => void
}

export function BackupList({
  backups,
  onView,
  onVerify,
  onRestore,
  onDelete,
  onDownload,
}: BackupListProps) {
  const [selectedBackups, setSelectedBackups] = useState<Set<string>>(new Set())
  const [expandedBackupId, setExpandedBackupId] = useState<string | null>(null)

  const toggleSelect = (backupId: string) => {
    const newSelected = new Set(selectedBackups)
    if (newSelected.has(backupId)) {
      newSelected.delete(backupId)
    } else {
      newSelected.add(backupId)
    }
    setSelectedBackups(newSelected)
  }

  const toggleExpand = (backupId: string) => {
    setExpandedBackupId(expandedBackupId === backupId ? null : backupId)
  }

  const getStatusBadge = (backup: Backup) => {
    switch (backup.status) {
      case 'completed':
        return (
          <Badge variant="secondary" className="bg-green-500/20 text-green-500">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        )
      case 'failed':
      case 'corrupted':
        return (
          <Badge variant="secondary" className="bg-red-500/20 text-red-500">
            <XCircle className="h-3 w-3 mr-1" />
            {backup.status}
          </Badge>
        )
      case 'in_progress':
        return (
          <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-500">
            In Progress
          </Badge>
        )
      default:
        return <Badge variant="secondary">{backup.status}</Badge>
    }
  }

  if (backups.length === 0) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-gray-500 mx-auto mb-4" />
        <p className="text-gray-400">No backups found</p>
        <p className="text-sm text-gray-500 mt-2">
          Create your first backup to get started
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Bulk Actions */}
      {selectedBackups.size > 0 && (
        <div className="flex items-center justify-between p-3 rounded-lg glass border border-celestial-cyan/50">
          <p className="text-sm">
            {selectedBackups.size} backup{selectedBackups.size !== 1 ? 's' : ''} selected
          </p>
          <div className="flex gap-2">
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                if (onDelete) {
                  selectedBackups.forEach((id) => onDelete(id))
                  setSelectedBackups(new Set())
                }
              }}
            >
              <Trash2 className="h-4 w-4" />
              Delete Selected
            </Button>
          </div>
        </div>
      )}

      {/* Backup Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-cosmic-700">
              <th className="text-left p-3 text-sm font-medium text-gray-400">
                <input
                  type="checkbox"
                  checked={selectedBackups.size === backups.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedBackups(new Set(backups.map((b) => b.backup_id)))
                    } else {
                      setSelectedBackups(new Set())
                    }
                  }}
                  className="rounded border-cosmic-600 bg-cosmic-800"
                />
              </th>
              <th className="text-left p-3 text-sm font-medium text-gray-400">Date/Time</th>
              <th className="text-left p-3 text-sm font-medium text-gray-400">Size</th>
              <th className="text-left p-3 text-sm font-medium text-gray-400">Status</th>
              <th className="text-left p-3 text-sm font-medium text-gray-400">Properties</th>
              <th className="text-right p-3 text-sm font-medium text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {backups.map((backup) => (
              <tr
                key={backup.backup_id}
                className={cn(
                  'border-b border-cosmic-800 hover:bg-cosmic-800/50 cursor-pointer transition-colors',
                  selectedBackups.has(backup.backup_id) && 'bg-cosmic-800/30'
                )}
                onClick={() => onView && onView(backup)}
              >
                <td className="p-3" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedBackups.has(backup.backup_id)}
                    onChange={() => toggleSelect(backup.backup_id)}
                    className="rounded border-cosmic-600 bg-cosmic-800"
                  />
                </td>
                <td className="p-3">
                  <div>
                    <p className="text-sm font-medium">
                      {formatDistanceToNow(new Date(backup.created_at))}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(backup.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </td>
                <td className="p-3">
                  <div>
                    <p className="text-sm">
                      {formatBytes(backup.compressed_size || backup.original_size)}
                    </p>
                    {backup.compressed && backup.compressed_size && (
                      <p className="text-xs text-gray-500">
                        {Math.round((backup.compressed_size / backup.original_size) * 100)}% of original
                      </p>
                    )}
                  </div>
                </td>
                <td className="p-3">{getStatusBadge(backup)}</td>
                <td className="p-3">
                  <div className="flex gap-1">
                    {backup.encrypted && (
                      <div className="group relative">
                        <Lock className="h-4 w-4 text-celestial-cyan" />
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-xs bg-cosmic-900 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          Encrypted
                        </span>
                      </div>
                    )}
                    {backup.compressed && (
                      <div className="group relative">
                        <Archive className="h-4 w-4 text-celestial-pink" />
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-xs bg-cosmic-900 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          Compressed
                        </span>
                      </div>
                    )}
                    {backup.verified && (
                      <div className="group relative">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-xs bg-cosmic-900 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          Verified
                        </span>
                      </div>
                    )}
                  </div>
                </td>
                <td className="p-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex gap-1 justify-end">
                    {onView && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onView(backup)}
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    {onVerify && !backup.verified && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onVerify(backup.backup_id)}
                        title="Verify"
                      >
                        <Shield className="h-4 w-4" />
                      </Button>
                    )}
                    {onDownload && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDownload(backup.backup_id)}
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                    {onRestore && backup.status === 'completed' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onRestore(backup.backup_id)}
                        title="Restore"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(backup.backup_id)}
                        title="Delete"
                        className="text-red-500 hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
