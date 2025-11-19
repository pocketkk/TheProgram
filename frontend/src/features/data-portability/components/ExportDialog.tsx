/**
 * ExportDialog Component
 *
 * Main dialog for configuring and performing data exports.
 */
import React, { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Label } from '@/components/ui/Label'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Download,
  FileJson,
  FileSpreadsheet,
  Database,
  Users,
  FileText,
  Table,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { ExportPreview } from './ExportPreview'
import { useExport, useExportPreview } from '../hooks/useExport'
import type {
  ExportConfig,
  ExportType,
  ExportFormat,
  ExportPreview as ExportPreviewData,
} from '@/types/export'
import { cn } from '@/lib/utils'

interface ExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultType?: ExportType
  defaultClientIds?: string[]
  defaultChartIds?: string[]
  onExportComplete?: (filename: string) => void
}

export function ExportDialog({
  open,
  onOpenChange,
  defaultType = ExportType.FULL,
  defaultClientIds = [],
  defaultChartIds = [],
  onExportComplete,
}: ExportDialogProps) {
  const { isExporting, error, lastExport, downloadExport, clearError, reset } = useExport()
  const { getPreview } = useExportPreview()

  const [exportType, setExportType] = useState<ExportType>(defaultType)
  const [format, setFormat] = useState<ExportFormat>(ExportFormat.JSON)
  const [includeMetadata, setIncludeMetadata] = useState(true)
  const [compress, setCompress] = useState(false)
  const [pretty, setPretty] = useState(true)
  const [preview, setPreview] = useState<ExportPreviewData | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      reset()
      setShowSuccess(false)
      setExportType(defaultType)
    }
  }, [open, defaultType, reset])

  // Generate preview when config changes
  useEffect(() => {
    if (open) {
      const config: ExportConfig = {
        type: exportType,
        format,
        includeMetadata,
        compress,
        pretty,
        clientIds: defaultClientIds,
        chartIds: defaultChartIds,
      }

      // Mock preview data - in production, you'd fetch actual counts
      const mockTableCounts = getMockTableCounts(exportType, defaultClientIds.length, defaultChartIds.length)
      getPreview(config, mockTableCounts).then(setPreview).catch(console.error)
    }
  }, [open, exportType, format, compress, defaultClientIds, defaultChartIds, includeMetadata, pretty, getPreview])

  const handleExport = async () => {
    const config: ExportConfig = {
      type: exportType,
      format,
      includeMetadata,
      compress,
      pretty,
      clientIds: defaultClientIds.length > 0 ? defaultClientIds : undefined,
      chartIds: defaultChartIds.length > 0 ? defaultChartIds : undefined,
      includeRelated: exportType === ExportType.CLIENTS,
      includeInterpretations: exportType === ExportType.CHARTS,
    }

    try {
      await downloadExport(config)
      setShowSuccess(true)
      if (lastExport && onExportComplete) {
        onExportComplete(lastExport.filename)
      }
      setTimeout(() => {
        onOpenChange(false)
      }, 2000)
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  const canExport = useMemo(() => {
    if (exportType === ExportType.CLIENTS && defaultClientIds.length === 0) {
      return false
    }
    if (exportType === ExportType.CHARTS && defaultChartIds.length === 0) {
      return false
    }
    return preview && preview.estimatedRecords > 0
  }, [exportType, defaultClientIds, defaultChartIds, preview])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-cosmic-400" />
            Export Data
          </DialogTitle>
          <DialogDescription>
            Export your astrology data in various formats for backup or migration.
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {showSuccess ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="py-12 text-center"
            >
              <CheckCircle2 className="h-16 w-16 text-green-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Export Complete!</h3>
              <p className="text-gray-400">
                Your data has been downloaded successfully.
              </p>
              {lastExport && (
                <div className="mt-4 p-3 glass-strong rounded border border-cosmic-600">
                  <p className="text-sm text-gray-300">
                    <span className="font-mono text-cosmic-300">{lastExport.filename}</span>
                    <br />
                    {lastExport.recordCount.toLocaleString()} records exported
                  </p>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Export Type Selection */}
              <div className="space-y-3">
                <Label className="text-white">Export Type</Label>
                <div className="grid grid-cols-2 gap-3">
                  <ExportTypeButton
                    icon={Database}
                    label="Full Database"
                    description="All data"
                    active={exportType === ExportType.FULL}
                    onClick={() => setExportType(ExportType.FULL)}
                    disabled={isExporting}
                  />
                  <ExportTypeButton
                    icon={Users}
                    label="Clients"
                    description={`${defaultClientIds.length} selected`}
                    active={exportType === ExportType.CLIENTS}
                    onClick={() => setExportType(ExportType.CLIENTS)}
                    disabled={isExporting || defaultClientIds.length === 0}
                  />
                  <ExportTypeButton
                    icon={FileText}
                    label="Charts"
                    description={`${defaultChartIds.length} selected`}
                    active={exportType === ExportType.CHARTS}
                    onClick={() => setExportType(ExportType.CHARTS)}
                    disabled={isExporting || defaultChartIds.length === 0}
                  />
                  <ExportTypeButton
                    icon={Table}
                    label="Table"
                    description="Single table"
                    active={exportType === ExportType.TABLE}
                    onClick={() => setExportType(ExportType.TABLE)}
                    disabled={true} // Not implemented in this UI
                  />
                </div>
              </div>

              {/* Format Selection */}
              <div className="space-y-3">
                <Label className="text-white">Format</Label>
                <div className="grid grid-cols-2 gap-3">
                  <FormatButton
                    icon={FileJson}
                    label="JSON"
                    description="Structured data"
                    active={format === ExportFormat.JSON}
                    onClick={() => setFormat(ExportFormat.JSON)}
                    disabled={isExporting}
                  />
                  <FormatButton
                    icon={FileSpreadsheet}
                    label="CSV"
                    description="Spreadsheet"
                    active={format === ExportFormat.CSV}
                    onClick={() => setFormat(ExportFormat.CSV)}
                    disabled={isExporting}
                  />
                </div>
              </div>

              {/* Options */}
              <div className="space-y-3">
                <Label className="text-white">Options</Label>
                <div className="space-y-2">
                  {exportType === ExportType.FULL && (
                    <CheckboxOption
                      label="Include Metadata"
                      description="Export timestamp, table counts, etc."
                      checked={includeMetadata}
                      onChange={setIncludeMetadata}
                      disabled={isExporting}
                    />
                  )}
                  <CheckboxOption
                    label="Compress (gzip)"
                    description="Reduce file size by ~75%"
                    checked={compress}
                    onChange={setCompress}
                    disabled={isExporting}
                  />
                  {format === ExportFormat.JSON && (
                    <CheckboxOption
                      label="Pretty Print"
                      description="Format JSON for readability"
                      checked={pretty}
                      onChange={setPretty}
                      disabled={isExporting}
                    />
                  )}
                </div>
              </div>

              {/* Preview */}
              {preview && (
                <ExportPreview
                  preview={preview}
                  format={format}
                  compressed={compress}
                />
              )}

              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded text-sm text-red-200"
                >
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold mb-1">Export Failed</div>
                    <div>{error}</div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {!showSuccess && (
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isExporting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleExport}
              disabled={!canExport || isExporting}
              loading={isExporting}
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export & Download
                </>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ==================== Helper Components ====================

interface ExportTypeButtonProps {
  icon: React.ElementType
  label: string
  description: string
  active: boolean
  onClick: () => void
  disabled?: boolean
}

function ExportTypeButton({
  icon: Icon,
  label,
  description,
  active,
  onClick,
  disabled,
}: ExportTypeButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'p-4 rounded-lg border-2 transition-all text-left',
        'hover:border-cosmic-400 hover:glow-purple',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-cosmic-700',
        active
          ? 'border-cosmic-400 glass-strong glow-purple'
          : 'border-cosmic-700 glass-medium'
      )}
    >
      <div className="flex items-start gap-3">
        <Icon className={cn('h-5 w-5 mt-0.5', active ? 'text-cosmic-300' : 'text-gray-400')} />
        <div className="flex-1 min-w-0">
          <div className={cn('font-semibold mb-0.5', active ? 'text-white' : 'text-gray-300')}>
            {label}
          </div>
          <div className="text-xs text-gray-400">{description}</div>
        </div>
      </div>
    </button>
  )
}

interface FormatButtonProps {
  icon: React.ElementType
  label: string
  description: string
  active: boolean
  onClick: () => void
  disabled?: boolean
}

function FormatButton({
  icon: Icon,
  label,
  description,
  active,
  onClick,
  disabled,
}: FormatButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'p-3 rounded-lg border-2 transition-all text-left',
        'hover:border-cosmic-400 hover:glow-purple',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        active
          ? 'border-cosmic-400 glass-strong glow-purple'
          : 'border-cosmic-700 glass-medium'
      )}
    >
      <div className="flex items-center gap-2">
        <Icon className={cn('h-4 w-4', active ? 'text-cosmic-300' : 'text-gray-400')} />
        <div className="flex-1">
          <div className={cn('text-sm font-semibold', active ? 'text-white' : 'text-gray-300')}>
            {label}
          </div>
          <div className="text-xs text-gray-500">{description}</div>
        </div>
      </div>
    </button>
  )
}

interface CheckboxOptionProps {
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

function CheckboxOption({
  label,
  description,
  checked,
  onChange,
  disabled,
}: CheckboxOptionProps) {
  return (
    <label
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors',
        'hover:bg-cosmic-800/30',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="mt-0.5 h-4 w-4 rounded border-cosmic-600 bg-cosmic-900 text-cosmic-500 focus:ring-2 focus:ring-cosmic-500 focus:ring-offset-0 disabled:cursor-not-allowed"
      />
      <div className="flex-1">
        <div className="text-sm font-medium text-white">{label}</div>
        <div className="text-xs text-gray-400">{description}</div>
      </div>
    </label>
  )
}

// ==================== Mock Data Helper ====================

function getMockTableCounts(
  exportType: ExportType,
  clientCount: number,
  chartCount: number
): Record<string, number> {
  switch (exportType) {
    case ExportType.FULL:
      return {
        clients: 150,
        birth_data: 200,
        charts: 180,
        chart_interpretations: 180,
        interpretations: 50,
        aspect_patterns: 420,
        transit_events: 300,
        session_notes: 75,
        app_config: 10,
        user_preferences: 5,
      }
    case ExportType.CLIENTS:
      return {
        clients: clientCount,
        birth_data: clientCount * 1.5,
        charts: clientCount * 2,
        session_notes: clientCount * 0.5,
      }
    case ExportType.CHARTS:
      return {
        charts: chartCount,
        chart_interpretations: chartCount,
        aspect_patterns: chartCount * 3,
      }
    default:
      return {}
  }
}
