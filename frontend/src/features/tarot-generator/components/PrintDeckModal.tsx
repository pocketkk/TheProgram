/**
 * PrintDeckModal - Configure and submit deck for printing at The Game Crafter
 */
import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Input,
  Label,
} from '@/components/ui'
import { Printer, ExternalLink, AlertCircle, CheckCircle, Loader2, Settings } from 'lucide-react'
import {
  getTGCStatus,
  setTGCCredentials,
  testTGCConnection,
  submitDeckForPrinting,
  type TGCCredentialsStatus,
  type TGCPrintResponse,
} from '@/lib/api/printing'

interface PrintDeckModalProps {
  isOpen: boolean
  onClose: () => void
  deckId: string
  deckName: string
  cardCount: number
}

type Step = 'check-credentials' | 'configure-credentials' | 'configure-print' | 'submitting' | 'success' | 'error'

export function PrintDeckModal({
  isOpen,
  onClose,
  deckId,
  deckName,
  cardCount,
}: PrintDeckModalProps) {
  const [step, setStep] = useState<Step>('check-credentials')
  const [credentialsStatus, setCredentialsStatus] = useState<TGCCredentialsStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [printResult, setPrintResult] = useState<TGCPrintResponse | null>(null)

  // Credentials form
  const [apiKeyId, setApiKeyId] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isTestingConnection, setIsTestingConnection] = useState(false)

  // Print configuration
  const [printDeckName, setPrintDeckName] = useState(deckName)
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Check credentials on mount
  useEffect(() => {
    if (isOpen) {
      checkCredentials()
    }
  }, [isOpen])

  const checkCredentials = async () => {
    setStep('check-credentials')
    setError(null)
    try {
      const status = await getTGCStatus()
      setCredentialsStatus(status)
      if (status.configured) {
        setStep('configure-print')
      } else {
        setStep('configure-credentials')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check credentials')
      setStep('configure-credentials')
    }
  }

  const handleSaveCredentials = async () => {
    if (!apiKeyId.trim() || !username.trim() || !password.trim()) {
      setError('All fields are required')
      return
    }

    setIsTestingConnection(true)
    setError(null)

    try {
      // Save credentials
      await setTGCCredentials({
        api_key_id: apiKeyId.trim(),
        username: username.trim(),
        password: password.trim(),
      })

      // Test connection
      const testResult = await testTGCConnection()
      if (testResult.success) {
        setCredentialsStatus({ configured: true, username: username.trim() })
        setStep('configure-print')
      } else {
        setError('Connection test failed. Please check your credentials.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save credentials')
    } finally {
      setIsTestingConnection(false)
    }
  }

  const handleSubmitForPrinting = async () => {
    if (!printDeckName.trim()) {
      setError('Deck name is required')
      return
    }

    setIsSubmitting(true)
    setStep('submitting')
    setError(null)

    try {
      const result = await submitDeckForPrinting({
        collection_id: deckId,
        deck_name: printDeckName.trim(),
        description: description.trim() || undefined,
      })

      setPrintResult(result)

      if (result.success) {
        setStep('success')
      } else {
        setError(result.error || 'Print submission failed')
        setStep('error')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Print submission failed')
      setStep('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    // Reset state on close
    setStep('check-credentials')
    setError(null)
    setPrintResult(null)
    setApiKeyId('')
    setUsername('')
    setPassword('')
    setPrintDeckName(deckName)
    setDescription('')
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-celestial-purple" />
            Print Tarot Deck
          </DialogTitle>
          <DialogDescription>
            Order a physical print of your tarot deck from The Game Crafter
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Loading/Check Credentials */}
          {step === 'check-credentials' && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-celestial-purple" />
              <span className="ml-3 text-gray-400">Checking configuration...</span>
            </div>
          )}

          {/* Configure Credentials */}
          {step === 'configure-credentials' && (
            <div className="space-y-4">
              <div className="p-4 bg-amber-900/20 border border-amber-700/50 rounded-lg">
                <div className="flex items-start gap-3">
                  <Settings className="w-5 h-5 text-amber-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-400">Account Required</p>
                    <p className="text-sm text-gray-400 mt-1">
                      You need a{' '}
                      <a
                        href="https://www.thegamecrafter.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-celestial-purple hover:underline"
                      >
                        The Game Crafter
                      </a>{' '}
                      account to print decks. Create an account and get your API key from{' '}
                      <a
                        href="https://www.thegamecrafter.com/account/apikeys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-celestial-purple hover:underline"
                      >
                        Account &gt; API Keys
                      </a>
                      .
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="tgc-api-key">API Key ID</Label>
                  <Input
                    id="tgc-api-key"
                    value={apiKeyId}
                    onChange={(e) => setApiKeyId(e.target.value)}
                    placeholder="Your TGC API Key ID"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="tgc-username">Username</Label>
                  <Input
                    id="tgc-username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Your TGC username"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="tgc-password">Password</Label>
                  <Input
                    id="tgc-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your TGC password"
                    className="mt-1"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-900/20 border border-red-700/50 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 mt-0.5" />
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={handleClose}>
                  Cancel
                </Button>
                <Button onClick={handleSaveCredentials} disabled={isTestingConnection}>
                  {isTestingConnection ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    'Save & Continue'
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Configure Print */}
          {step === 'configure-print' && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-800 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Connected as</p>
                    <p className="font-medium">{credentialsStatus?.username}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setStep('configure-credentials')}
                  >
                    Change Account
                  </Button>
                </div>
              </div>

              <div className="p-4 bg-celestial-purple/10 border border-celestial-purple/30 rounded-lg">
                <p className="text-sm">
                  <span className="font-medium text-celestial-purple">{cardCount} cards</span> will
                  be uploaded and configured as a TarotDeck product on The Game Crafter.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="print-deck-name">Deck Name</Label>
                  <Input
                    id="print-deck-name"
                    value={printDeckName}
                    onChange={(e) => setPrintDeckName(e.target.value)}
                    placeholder="Name for your printed deck"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="print-description">Description (optional)</Label>
                  <textarea
                    id="print-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="A brief description of your deck..."
                    rows={3}
                    className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-celestial-purple focus:outline-none text-sm resize-none"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-900/20 border border-red-700/50 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 mt-0.5" />
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={handleClose}>
                  Cancel
                </Button>
                <Button onClick={handleSubmitForPrinting}>
                  <Printer className="w-4 h-4 mr-2" />
                  Submit for Printing
                </Button>
              </div>
            </div>
          )}

          {/* Submitting */}
          {step === 'submitting' && (
            <div className="py-8 text-center">
              <Loader2 className="w-12 h-12 animate-spin text-celestial-purple mx-auto mb-4" />
              <p className="text-lg font-medium">Uploading your deck...</p>
              <p className="text-sm text-gray-400 mt-2">
                This may take a few minutes while we upload {cardCount} card images.
              </p>
            </div>
          )}

          {/* Success */}
          {step === 'success' && printResult && (
            <div className="space-y-4">
              <div className="text-center py-4">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <p className="text-lg font-medium">Deck Submitted Successfully!</p>
                <p className="text-sm text-gray-400 mt-2">
                  {printResult.cards_uploaded} cards were uploaded to The Game Crafter.
                </p>
              </div>

              <div className="space-y-2">
                {printResult.game_url && (
                  <a
                    href={printResult.game_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <span>View Product on TGC</span>
                    <ExternalLink className="w-4 h-4 text-gray-400" />
                  </a>
                )}
                {printResult.checkout_url && (
                  <a
                    href={printResult.checkout_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 bg-celestial-purple rounded-lg hover:bg-celestial-purple/80 transition-colors"
                  >
                    <span className="font-medium">Add to Cart & Purchase</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={handleClose}>Done</Button>
              </div>
            </div>
          )}

          {/* Error */}
          {step === 'error' && (
            <div className="space-y-4">
              <div className="text-center py-4">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <p className="text-lg font-medium">Submission Failed</p>
                <p className="text-sm text-red-400 mt-2">{error}</p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={handleClose}>
                  Close
                </Button>
                <Button onClick={() => setStep('configure-print')}>Try Again</Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
