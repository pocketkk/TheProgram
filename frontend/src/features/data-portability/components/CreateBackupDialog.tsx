/**
 * Create Backup Dialog Component
 *
 * Dialog for creating a new backup with options for encryption,
 * compression, and verification.
 */
import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { CheckCircle2, AlertCircle, Loader2, Database, Lock, Archive, CheckSquare } from 'lucide-react'
import type { BackupOptions } from '@/types/backup'

interface CreateBackupDialogProps {
  open: boolean
  onClose: () => void
  onCreateBackup: (options: BackupOptions) => Promise<void>
}

export function CreateBackupDialog({ open, onClose, onCreateBackup }: CreateBackupDialogProps) {
  const [encrypt, setEncrypt] = useState(true)
  const [compress, setCompress] = useState(true)
  const [verify, setVerify] = useState(true)
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [backupId, setBackupId] = useState<string | null>(null)

  const handleCreate = async () => {
    try {
      setLoading(true)
      setError(null)

      const options: BackupOptions = {
        encrypt,
        compress,
        verify,
        description: description.trim() || undefined,
      }

      const result = await onCreateBackup(options)
      setSuccess(true)
      setBackupId((result as any).backup_id || null)

      // Auto-close after 2 seconds on success
      setTimeout(() => {
        handleClose()
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create backup')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setEncrypt(true)
    setCompress(true)
    setVerify(true)
    setDescription('')
    setLoading(false)
    setError(null)
    setSuccess(false)
    setBackupId(null)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-celestial-cyan" />
            Create Backup
          </DialogTitle>
          <DialogDescription>
            Create a manual backup of your entire database. This backup can be used to restore your
            data later.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-8 text-center">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Backup Created Successfully!</h3>
            {backupId && (
              <p className="text-sm text-gray-400">Backup ID: {backupId}</p>
            )}
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Backup Options */}
            <div className="space-y-4">
              {/* Encrypt */}
              <div className="flex items-start gap-3 p-3 rounded-lg glass hover:bg-cosmic-800 cursor-pointer" onClick={() => setEncrypt(!encrypt)}>
                <div className="flex items-center h-5">
                  <input
                    type="checkbox"
                    checked={encrypt}
                    onChange={(e) => setEncrypt(e.target.checked)}
                    className="h-4 w-4 rounded border-cosmic-600 bg-cosmic-800 text-celestial-cyan focus:ring-celestial-cyan"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-celestial-cyan" />
                    <Label className="font-medium">Encrypt Backup</Label>
                    <span className="text-xs text-celestial-gold">Recommended</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Encrypt backup with AES-256 encryption for security
                  </p>
                </div>
              </div>

              {/* Compress */}
              <div className="flex items-start gap-3 p-3 rounded-lg glass hover:bg-cosmic-800 cursor-pointer" onClick={() => setCompress(!compress)}>
                <div className="flex items-center h-5">
                  <input
                    type="checkbox"
                    checked={compress}
                    onChange={(e) => setCompress(e.target.checked)}
                    className="h-4 w-4 rounded border-cosmic-600 bg-cosmic-800 text-celestial-cyan focus:ring-celestial-cyan"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Archive className="h-4 w-4 text-celestial-pink" />
                    <Label className="font-medium">Compress Backup</Label>
                    <span className="text-xs text-celestial-gold">Recommended</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Compress backup to save storage space (typically 50% reduction)
                  </p>
                </div>
              </div>

              {/* Verify */}
              <div className="flex items-start gap-3 p-3 rounded-lg glass hover:bg-cosmic-800 cursor-pointer" onClick={() => setVerify(!verify)}>
                <div className="flex items-center h-5">
                  <input
                    type="checkbox"
                    checked={verify}
                    onChange={(e) => setVerify(e.target.checked)}
                    className="h-4 w-4 rounded border-cosmic-600 bg-cosmic-800 text-celestial-cyan focus:ring-celestial-cyan"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="h-4 w-4 text-green-500" />
                    <Label className="font-medium">Verify After Creation</Label>
                    <span className="text-xs text-celestial-gold">Recommended</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Automatically verify backup integrity after creation
                  </p>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                placeholder="e.g., Before major update, weekly backup, etc."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={loading}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/50">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose} disabled={loading}>
            {success ? 'Close' : 'Cancel'}
          </Button>
          {!success && (
            <Button onClick={handleCreate} disabled={loading} variant="primary">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Database className="h-4 w-4" />
                  Create Backup
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
