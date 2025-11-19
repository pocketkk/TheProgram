/**
 * FileUpload Component
 *
 * Drag-and-drop file upload with file validation
 */
import { useCallback, useState, type DragEvent, type ChangeEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, File, X, FileJson, FileSpreadsheet, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'
import type { UploadedFile } from '@/types/import'

interface FileUploadProps {
  onFileSelect: (file: File) => void
  uploadedFile?: UploadedFile | null
  onRemove?: () => void
  isLoading?: boolean
  error?: string | null
}

export function FileUpload({
  onFileSelect,
  uploadedFile,
  onRemove,
  isLoading = false,
  error = null,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      const files = Array.from(e.dataTransfer.files)
      if (files.length > 0) {
        onFileSelect(files[0])
      }
    },
    [onFileSelect]
  )

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files && files.length > 0) {
        onFileSelect(files[0])
      }
    },
    [onFileSelect]
  )

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getFileIcon = (fileName: string) => {
    if (fileName.endsWith('.json') || fileName.includes('.json.')) {
      return FileJson
    }
    if (fileName.endsWith('.csv') || fileName.includes('.csv.')) {
      return FileSpreadsheet
    }
    return File
  }

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      {!uploadedFile ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            'relative rounded-xl border-2 border-dashed p-12 transition-all',
            isDragging
              ? 'border-cosmic-400 bg-cosmic-800/50 scale-105'
              : 'border-cosmic-700/50 bg-cosmic-900/20 hover:border-cosmic-600/50 hover:bg-cosmic-900/30',
            error && 'border-red-500/50 bg-red-950/10'
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center gap-4 text-center">
            {/* Upload Icon */}
            <motion.div
              animate={{
                y: isDragging ? -10 : 0,
                scale: isDragging ? 1.1 : 1,
              }}
              className={cn(
                'rounded-xl p-6 transition-colors',
                isDragging ? 'bg-cosmic-600/30' : 'bg-cosmic-700/20'
              )}
            >
              <Upload
                className={cn(
                  'h-12 w-12 transition-colors',
                  isDragging ? 'text-cosmic-400' : 'text-cosmic-500'
                )}
              />
            </motion.div>

            {/* Instructions */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-white">
                {isDragging ? 'Drop your file here' : 'Upload import file'}
              </h3>
              <p className="text-sm text-gray-400">
                Drag and drop your file here, or click to browse
              </p>
            </div>

            {/* File Input */}
            <label htmlFor="file-upload">
              <Button
                type="button"
                variant="outline"
                disabled={isLoading}
                loading={isLoading}
                onClick={() => document.getElementById('file-upload')?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Choose File
              </Button>
              <input
                id="file-upload"
                type="file"
                className="hidden"
                accept=".json,.csv,.json.gz,.csv.gz,.json.bz2,.csv.bz2"
                onChange={handleFileChange}
                disabled={isLoading}
              />
            </label>

            {/* Supported Formats */}
            <div className="text-xs text-gray-500 space-y-1">
              <p>Supported formats: JSON, CSV</p>
              <p>Compression: .gz, .bz2 (optional)</p>
              <p>Maximum size: 100 MB</p>
            </div>
          </div>
        </motion.div>
      ) : (
        /* File Preview */
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-medium rounded-xl border border-cosmic-700/30 p-6"
        >
          <div className="flex items-start gap-4">
            {/* File Icon */}
            <div className="rounded-lg bg-cosmic-600/20 p-3">
              {(() => {
                const Icon = getFileIcon(uploadedFile.name)
                return <Icon className="h-8 w-8 text-cosmic-400" />
              })()}
            </div>

            {/* File Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-white truncate">
                    {uploadedFile.name}
                  </h4>
                  <div className="flex items-center gap-3 mt-1 text-sm text-gray-400">
                    <span>{formatFileSize(uploadedFile.size)}</span>
                    {uploadedFile.format && (
                      <>
                        <span className="text-cosmic-600">•</span>
                        <span className="uppercase">{uploadedFile.format}</span>
                      </>
                    )}
                    <span className="text-cosmic-600">•</span>
                    <span>
                      Uploaded {uploadedFile.uploadedAt.toLocaleTimeString()}
                    </span>
                  </div>
                </div>

                {/* Remove Button */}
                {onRemove && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onRemove}
                    disabled={isLoading}
                    className="flex-shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Success Message */}
              {!error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 flex items-center gap-2 text-sm text-green-400"
                >
                  <div className="h-2 w-2 rounded-full bg-green-400" />
                  <span>File uploaded successfully</span>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-start gap-3 rounded-lg bg-red-950/20 border border-red-500/30 p-4"
          >
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-400">Upload Error</p>
              <p className="text-sm text-red-300/80 mt-1">{error}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
