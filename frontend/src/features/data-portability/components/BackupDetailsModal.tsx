/**
 * Backup Details Modal Component
 *
 * Displays detailed metadata for a specific backup
 */
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  Database,
  Lock,
  Archive,
  CheckCircle2,
  XCircle,
  Calendar,
  HardDrive,
  FileText,
  Download,
  RotateCcw,
  Trash2,
  Shield,
} from 'lucide-react'
import type { Backup } from '@/types/backup'
import { formatBytes, formatDistanceToNow } from '@/lib/utils'

interface BackupDetailsModalProps {
  backup: Backup | null
  open: boolean
  onClose: () => void
  onVerify?: (backupId: string) => void
  onRestore?: (backupId: string) => void
  onDelete?: (backupId: string) => void
  onDownload?: (backupId: string) => void
}

export function BackupDetailsModal({
  backup,
  open,
  onClose,
  onVerify,
  onRestore,
  onDelete,
  onDownload,
}: BackupDetailsModalProps) {
  if (!backup) return null

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-500'
      case 'failed':
      case 'corrupted':
        return 'text-red-500'
      case 'in_progress':
        return 'text-yellow-500'
      default:
        return 'text-gray-500'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4" />
      case 'failed':
      case 'corrupted':
        return <XCircle className="h-4 w-4" />
      default:
        return <Database className="h-4 w-4" />
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-celestial-cyan" />
            Backup Details
          </DialogTitle>
          <DialogDescription>
            Complete metadata for backup {backup.backup_id}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Status Section */}
          <div className="flex items-center justify-between p-4 rounded-lg glass">
            <div className="flex items-center gap-3">
              <div className={getStatusColor(backup.status)}>
                {getStatusIcon(backup.status)}
              </div>
              <div>
                <p className="font-medium">Status</p>
                <p className="text-sm text-gray-400 capitalize">{backup.status}</p>
              </div>
            </div>
            <div className="flex gap-2">
              {backup.encrypted && (
                <Badge variant="secondary" className="bg-celestial-cyan/20 text-celestial-cyan">
                  <Lock className="h-3 w-3 mr-1" />
                  Encrypted
                </Badge>
              )}
              {backup.compressed && (
                <Badge variant="secondary" className="bg-celestial-pink/20 text-celestial-pink">
                  <Archive className="h-3 w-3 mr-1" />
                  Compressed
                </Badge>
              )}
              {backup.verified && (
                <Badge variant="secondary" className="bg-green-500/20 text-green-500">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Verified
                </Badge>
              )}
            </div>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <Calendar className="h-4 w-4" />
                Created
              </div>
              <p className="text-sm font-medium">
                {formatDistanceToNow(new Date(backup.created_at))}
              </p>
              <p className="text-xs text-gray-500">
                {new Date(backup.created_at).toLocaleString()}
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <HardDrive className="h-4 w-4" />
                Size
              </div>
              <p className="text-sm font-medium">
                {formatBytes(backup.compressed_size || backup.original_size)}
              </p>
              {backup.compressed && backup.compressed_size && (
                <p className="text-xs text-gray-500">
                  Original: {formatBytes(backup.original_size)}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <FileText className="h-4 w-4" />
                Type
              </div>
              <p className="text-sm font-medium capitalize">{backup.backup_type}</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <Database className="h-4 w-4" />
                Total Records
              </div>
              <p className="text-sm font-medium">{backup.total_records.toLocaleString()}</p>
            </div>
          </div>

          {/* Record Counts by Table */}
          {Object.keys(backup.table_counts).length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-400">Records by Table</h4>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(backup.table_counts).map(([table, count]) => (
                  <div
                    key={table}
                    className="flex items-center justify-between p-2 rounded glass text-sm"
                  >
                    <span className="capitalize">{table}</span>
                    <span className="font-medium">{count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Security Info */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Security & Integrity
            </h4>
            <div className="space-y-2 p-3 rounded-lg glass">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Checksum ({backup.checksum_algorithm})</span>
                <span className="font-mono text-xs">{backup.checksum.substring(0, 16)}...</span>
              </div>
              {backup.schema_version && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Schema Version</span>
                  <span className="font-mono text-xs">{backup.schema_version}</span>
                </div>
              )}
              {backup.verification_date && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Last Verified</span>
                  <span className="text-xs">
                    {formatDistanceToNow(new Date(backup.verification_date))}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          {backup.description && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-400">Description</h4>
              <p className="text-sm p-3 rounded-lg glass">{backup.description}</p>
            </div>
          )}

          {/* Tags */}
          {backup.tags && backup.tags.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-400">Tags</h4>
              <div className="flex flex-wrap gap-2">
                {backup.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <div className="flex gap-2 flex-1">
            {onDelete && (
              <Button variant="danger" size="sm" onClick={() => onDelete(backup.backup_id)}>
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {onDownload && (
              <Button variant="outline" size="sm" onClick={() => onDownload(backup.backup_id)}>
                <Download className="h-4 w-4" />
                Download
              </Button>
            )}
            {onVerify && !backup.verified && (
              <Button variant="secondary" size="sm" onClick={() => onVerify(backup.backup_id)}>
                <Shield className="h-4 w-4" />
                Verify
              </Button>
            )}
            {onRestore && backup.verified && (
              <Button variant="primary" size="sm" onClick={() => onRestore(backup.backup_id)}>
                <RotateCcw className="h-4 w-4" />
                Restore
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
