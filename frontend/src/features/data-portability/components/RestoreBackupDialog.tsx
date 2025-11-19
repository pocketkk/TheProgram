/**
 * Restore Backup Dialog Component
 *
 * Multi-step wizard for restoring from backup with safety checks
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
import { Badge } from '@/components/ui/Badge'
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  RotateCcw,
  Shield,
  Database,
  Lock,
  Archive,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react'
import type { Backup } from '@/types/backup'
import { formatBytes, formatDistanceToNow } from '@/lib/utils'

interface RestoreBackupDialogProps {
  backups: Backup[]
  open: boolean
  onClose: () => void
  onRestore: (backupId: string, createSafetyBackup: boolean) => Promise<void>
  onVerify: (backupId: string) => Promise<boolean>
}

type RestoreStep = 'select' | 'verify' | 'confirm' | 'executing' | 'complete'

export function RestoreBackupDialog({
  backups,
  open,
  onClose,
  onRestore,
  onVerify,
}: RestoreBackupDialogProps) {
  const [step, setStep] = useState<RestoreStep>('select')
  const [selectedBackup, setSelectedBackup] = useState<Backup | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [verificationResult, setVerificationResult] = useState<boolean | null>(null)
  const [createSafetyBackup, setCreateSafetyBackup] = useState(true)
  const [confirmUnderstand, setConfirmUnderstand] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Filter only completed and verified backups
  const availableBackups = backups.filter(
    (b) => b.status === 'completed' && b.verified
  )

  const handleSelectBackup = (backup: Backup) => {
    setSelectedBackup(backup)
  }

  const handleNext = async () => {
    if (step === 'select' && selectedBackup) {
      // If backup not verified, verify it first
      if (!selectedBackup.verified) {
        setStep('verify')
        await handleVerify()
      } else {
        setStep('confirm')
      }
    } else if (step === 'verify') {
      if (verificationResult) {
        setStep('confirm')
      }
    } else if (step === 'confirm') {
      await handleRestore()
    }
  }

  const handleBack = () => {
    if (step === 'confirm') {
      setStep('select')
    } else if (step === 'verify') {
      setStep('select')
    }
    setError(null)
  }

  const handleVerify = async () => {
    if (!selectedBackup) return

    try {
      setVerifying(true)
      setError(null)
      const result = await onVerify(selectedBackup.backup_id)
      setVerificationResult(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed')
      setVerificationResult(false)
    } finally {
      setVerifying(false)
    }
  }

  const handleRestore = async () => {
    if (!selectedBackup) return

    if (!confirmUnderstand) {
      setError('Please confirm you understand this will replace all data')
      return
    }

    try {
      setRestoring(true)
      setError(null)
      setStep('executing')
      await onRestore(selectedBackup.backup_id, createSafetyBackup)
      setSuccess(true)
      setStep('complete')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Restore failed')
      setStep('confirm')
    } finally {
      setRestoring(false)
    }
  }

  const handleClose = () => {
    setStep('select')
    setSelectedBackup(null)
    setVerifying(false)
    setVerificationResult(null)
    setCreateSafetyBackup(true)
    setConfirmUnderstand(false)
    setRestoring(false)
    setError(null)
    setSuccess(false)
    onClose()
  }

  const renderStep = () => {
    switch (step) {
      case 'select':
        return (
          <div className="space-y-4">
            <p className="text-sm text-gray-400">
              Select a backup to restore. Only verified backups are shown.
            </p>

            {availableBackups.length === 0 ? (
              <div className="text-center py-8">
                <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                <p className="text-gray-400">No verified backups available</p>
                <p className="text-sm text-gray-500 mt-2">
                  Please verify existing backups before restoring
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {availableBackups.map((backup) => (
                  <div
                    key={backup.backup_id}
                    onClick={() => handleSelectBackup(backup)}
                    className={`p-4 rounded-lg cursor-pointer transition-all ${
                      selectedBackup?.backup_id === backup.backup_id
                        ? 'bg-celestial-cyan/20 border-2 border-celestial-cyan'
                        : 'glass hover:bg-cosmic-800 border border-cosmic-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="font-medium">
                            {formatDistanceToNow(new Date(backup.created_at))}
                          </p>
                          <div className="flex gap-1">
                            {backup.encrypted && <Lock className="h-3 w-3 text-celestial-cyan" />}
                            {backup.compressed && <Archive className="h-3 w-3 text-celestial-pink" />}
                            {backup.verified && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                          </div>
                        </div>
                        <p className="text-xs text-gray-500">
                          {new Date(backup.created_at).toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-400 mt-1">
                          {formatBytes(backup.compressed_size || backup.original_size)} • {backup.total_records.toLocaleString()} records
                        </p>
                        {backup.description && (
                          <p className="text-sm text-gray-400 mt-2">{backup.description}</p>
                        )}
                      </div>
                      {selectedBackup?.backup_id === backup.backup_id && (
                        <CheckCircle2 className="h-5 w-5 text-celestial-cyan flex-shrink-0" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )

      case 'verify':
        return (
          <div className="space-y-4 py-8">
            <div className="text-center">
              {verifying ? (
                <>
                  <Loader2 className="h-16 w-16 text-celestial-cyan mx-auto mb-4 animate-spin" />
                  <h3 className="text-lg font-semibold mb-2">Verifying Backup...</h3>
                  <p className="text-sm text-gray-400">
                    Checking integrity, checksums, and data validity
                  </p>
                </>
              ) : verificationResult === true ? (
                <>
                  <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Backup Verified Successfully</h3>
                  <p className="text-sm text-gray-400">
                    The backup passed all integrity checks
                  </p>
                </>
              ) : verificationResult === false ? (
                <>
                  <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Verification Failed</h3>
                  <p className="text-sm text-gray-400">
                    This backup may be corrupted. We recommend creating a new backup.
                  </p>
                </>
              ) : null}
            </div>
          </div>
        )

      case 'confirm':
        return (
          <div className="space-y-6">
            {/* Warning Banner */}
            <div className="p-4 rounded-lg bg-red-500/10 border-2 border-red-500/50">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-6 w-6 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-red-500 mb-2">
                    This Will Replace ALL Current Data
                  </h4>
                  <p className="text-sm text-red-400">
                    Restoring from backup will permanently delete all current data and replace it
                    with the backup data. This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>

            {/* Selected Backup Info */}
            {selectedBackup && (
              <div className="p-4 rounded-lg glass border border-cosmic-700">
                <h4 className="font-medium mb-2">Selected Backup</h4>
                <div className="space-y-1 text-sm">
                  <p className="text-gray-400">
                    Created: {formatDistanceToNow(new Date(selectedBackup.created_at))}
                  </p>
                  <p className="text-gray-400">
                    Size: {formatBytes(selectedBackup.compressed_size || selectedBackup.original_size)}
                  </p>
                  <p className="text-gray-400">
                    Records: {selectedBackup.total_records.toLocaleString()}
                  </p>
                </div>
              </div>
            )}

            {/* Safety Options */}
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 rounded-lg glass border-2 border-celestial-gold/50">
                <input
                  type="checkbox"
                  checked={createSafetyBackup}
                  onChange={(e) => setCreateSafetyBackup(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-cosmic-600 bg-cosmic-800 text-celestial-cyan"
                  disabled
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-celestial-gold" />
                    <p className="font-medium">Create Safety Backup Before Restore</p>
                    <Badge variant="secondary" className="bg-celestial-gold/20 text-celestial-gold text-xs">
                      Required
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    A backup of current data will be created before restoring
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg glass hover:bg-cosmic-800 cursor-pointer" onClick={() => setConfirmUnderstand(!confirmUnderstand)}>
                <input
                  type="checkbox"
                  checked={confirmUnderstand}
                  onChange={(e) => setConfirmUnderstand(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-cosmic-600 bg-cosmic-800 text-celestial-cyan"
                />
                <div className="flex-1">
                  <p className="font-medium">I understand this cannot be undone</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Confirm you understand the risks of restoring from backup
                  </p>
                </div>
              </div>
            </div>
          </div>
        )

      case 'executing':
        return (
          <div className="space-y-4 py-8 text-center">
            <Loader2 className="h-16 w-16 text-celestial-cyan mx-auto mb-4 animate-spin" />
            <h3 className="text-lg font-semibold mb-2">Restoring Database...</h3>
            <p className="text-sm text-gray-400">
              Please wait while we restore your data from backup
            </p>
            <p className="text-xs text-gray-500">This may take a few moments</p>
          </div>
        )

      case 'complete':
        return (
          <div className="space-y-4 py-8 text-center">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Restore Complete!</h3>
            <p className="text-sm text-gray-400">
              Your database has been successfully restored from backup
            </p>
            <div className="p-4 rounded-lg bg-celestial-gold/10 border border-celestial-gold/50 mt-4">
              <p className="text-sm text-celestial-gold">
                The application will reload to reflect the restored data
              </p>
            </div>
          </div>
        )
    }
  }

  const canProceed = () => {
    switch (step) {
      case 'select':
        return selectedBackup !== null
      case 'verify':
        return verificationResult === true
      case 'confirm':
        return confirmUnderstand && createSafetyBackup
      default:
        return false
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-celestial-cyan" />
            Restore from Backup
          </DialogTitle>
          <DialogDescription>
            {step === 'select' && 'Select a backup to restore'}
            {step === 'verify' && 'Verifying backup integrity'}
            {step === 'confirm' && 'Confirm restore operation'}
            {step === 'executing' && 'Restoring database'}
            {step === 'complete' && 'Restore completed successfully'}
          </DialogDescription>
        </DialogHeader>

        {/* Progress Indicator */}
        {step !== 'executing' && step !== 'complete' && (
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className={`h-2 w-2 rounded-full ${step === 'select' ? 'bg-celestial-cyan' : 'bg-gray-600'}`} />
            <div className={`h-0.5 w-8 ${step !== 'select' ? 'bg-celestial-cyan' : 'bg-gray-600'}`} />
            <div className={`h-2 w-2 rounded-full ${step === 'verify' ? 'bg-celestial-cyan' : 'bg-gray-600'}`} />
            <div className={`h-0.5 w-8 ${step === 'confirm' || step === 'executing' || step === 'complete' ? 'bg-celestial-cyan' : 'bg-gray-600'}`} />
            <div className={`h-2 w-2 rounded-full ${step === 'confirm' ? 'bg-celestial-cyan' : 'bg-gray-600'}`} />
          </div>
        )}

        <div className="py-4">
          {renderStep()}

          {/* Error Message */}
          {error && step !== 'complete' && (
            <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/50">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          {step === 'complete' ? (
            <Button
              onClick={() => {
                handleClose()
                window.location.reload()
              }}
              variant="primary"
            >
              Reload Application
            </Button>
          ) : step === 'executing' ? null : (
            <>
              <Button variant="ghost" onClick={handleClose} disabled={restoring}>
                Cancel
              </Button>
              {step !== 'select' && (
                <Button variant="outline" onClick={handleBack} disabled={restoring}>
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </Button>
              )}
              <Button
                onClick={handleNext}
                disabled={!canProceed() || restoring || verifying}
                variant="danger"
              >
                {step === 'confirm' ? (
                  <>
                    <RotateCcw className="h-4 w-4" />
                    Restore Database
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
