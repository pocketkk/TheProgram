/**
 * Import Dialog Component
 *
 * Dialog for importing location history from various sources.
 */
import { useState, useRef } from 'react'
import { Upload, FileJson, Map, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { useLocationHistoryStore } from '../stores/locationHistoryStore'

interface ImportDialogProps {
  isOpen: boolean
  onClose: () => void
}

type ImportSource = 'google_takeout' | 'apple' | 'gpx'

interface SourceOption {
  id: ImportSource
  name: string
  description: string
  icon: React.ReactNode
  acceptedFormats: string
  instructions: string[]
}

const sourceOptions: SourceOption[] = [
  {
    id: 'google_takeout',
    name: 'Google Takeout',
    description: 'Import from Google Location History',
    icon: <FileJson className="w-6 h-6" />,
    acceptedFormats: '.json',
    instructions: [
      'Go to takeout.google.com',
      'Select "Location History" and export',
      'Extract the ZIP file',
      'Upload Records.json or Location History.json',
    ],
  },
  {
    id: 'apple',
    name: 'Apple Location',
    description: 'Import from Apple Location Services',
    icon: <Map className="w-6 h-6" />,
    acceptedFormats: '.json',
    instructions: [
      'Go to Settings > Privacy > Location Services',
      'Request your location data export',
      'Upload the exported JSON file',
    ],
  },
  {
    id: 'gpx',
    name: 'GPX File',
    description: 'Import from GPS/fitness apps',
    icon: <Map className="w-6 h-6" />,
    acceptedFormats: '.gpx',
    instructions: [
      'Export GPX file from your fitness app',
      'Works with Strava, Garmin, etc.',
      'Upload the .gpx file',
    ],
  },
]

export function ImportDialog({ isOpen, onClose }: ImportDialogProps) {
  const [selectedSource, setSelectedSource] = useState<ImportSource | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [result, setResult] = useState<{
    success: boolean
    imported: number
    skipped: number
    errors: string[]
    warnings: string[]
  } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const { importFile, isImporting, error, clearError } = useLocationHistoryStore()

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setResult(null)
    }
  }

  const handleImport = async () => {
    if (!file || !selectedSource) return

    try {
      const importResult = await importFile(file, selectedSource, {
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      })

      setResult({
        success: importResult.success,
        imported: importResult.imported_records,
        skipped: importResult.skipped_records,
        errors: importResult.errors,
        warnings: importResult.warnings,
      })
    } catch {
      // Error is handled by the store
    }
  }

  const handleClose = () => {
    setSelectedSource(null)
    setFile(null)
    setDateFrom('')
    setDateTo('')
    setResult(null)
    clearError()
    onClose()
  }

  const selectedSourceOption = sourceOptions.find((s) => s.id === selectedSource)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4">Import Location History</h2>

          {/* Result Display */}
          {result && (
            <div
              className={`mb-6 p-4 rounded-lg ${
                result.success
                  ? 'bg-green-50 dark:bg-green-900/30'
                  : 'bg-red-50 dark:bg-red-900/30'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                {result.success ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600" />
                )}
                <span className="font-semibold">
                  {result.success ? 'Import Complete' : 'Import Failed'}
                </span>
              </div>
              {result.success && (
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  <p>Imported: {result.imported.toLocaleString()} records</p>
                  <p>Skipped: {result.skipped.toLocaleString()} records</p>
                </div>
              )}
              {result.errors.length > 0 && (
                <div className="mt-2 text-sm text-red-600">
                  {result.errors.map((err, i) => (
                    <p key={i}>{err}</p>
                  ))}
                </div>
              )}
              {result.warnings.length > 0 && (
                <details className="mt-2">
                  <summary className="text-sm text-yellow-600 cursor-pointer">
                    {result.warnings.length} warnings
                  </summary>
                  <div className="mt-1 text-xs text-gray-500 max-h-32 overflow-y-auto">
                    {result.warnings.slice(0, 50).map((warn, i) => (
                      <p key={i}>{warn}</p>
                    ))}
                    {result.warnings.length > 50 && (
                      <p>... and {result.warnings.length - 50} more</p>
                    )}
                  </div>
                </details>
              )}
            </div>
          )}

          {/* Error Display */}
          {error && !result && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 rounded-lg">
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="w-5 h-5" />
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Source Selection */}
          {!selectedSource && !result && (
            <div className="space-y-4">
              <p className="text-gray-600 dark:text-gray-300">
                Choose the source of your location data:
              </p>
              <div className="grid gap-4">
                {sourceOptions.map((source) => (
                  <button
                    key={source.id}
                    onClick={() => setSelectedSource(source.id)}
                    className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                  >
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
                      {source.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold">{source.name}</h3>
                      <p className="text-sm text-gray-500">{source.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* File Upload */}
          {selectedSource && selectedSourceOption && !result && (
            <div className="space-y-6">
              <button
                onClick={() => setSelectedSource(null)}
                className="text-sm text-indigo-600 hover:underline"
              >
                &larr; Choose different source
              </button>

              {/* Instructions */}
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">How to export from {selectedSourceOption.name}:</h3>
                <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600 dark:text-gray-300">
                  {selectedSourceOption.instructions.map((instruction, i) => (
                    <li key={i}>{instruction}</li>
                  ))}
                </ol>
              </div>

              {/* File Input */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={selectedSourceOption.acceptedFormats}
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full p-8 border-2 border-dashed rounded-lg hover:border-indigo-500 transition-colors"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8 text-gray-400" />
                    {file ? (
                      <span className="text-indigo-600">{file.name}</span>
                    ) : (
                      <span className="text-gray-500">
                        Click to select {selectedSourceOption.acceptedFormats} file
                      </span>
                    )}
                  </div>
                </button>
              </div>

              {/* Date Filters */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    From Date (optional)
                  </label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    To Date (optional)
                  </label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
                  />
                </div>
              </div>

              {/* Import Button */}
              <button
                onClick={handleImport}
                disabled={!file || isImporting}
                className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    Import Location History
                  </>
                )}
              </button>
            </div>
          )}

          {/* Close Button */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              {result ? 'Done' : 'Cancel'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
