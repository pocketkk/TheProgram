/**
 * ExportPreview Component
 *
 * Shows a preview of what will be exported before performing the export.
 */
import React from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { motion } from 'framer-motion'
import { Database, FileText, AlertTriangle, CheckCircle2 } from 'lucide-react'
import type { ExportPreview as ExportPreviewData, ExportFormat } from '@/types/export'
import { cn } from '@/lib/utils'

interface ExportPreviewProps {
  preview: ExportPreviewData
  format: ExportFormat
  compressed: boolean
  className?: string
}

export function ExportPreview({
  preview,
  format,
  compressed,
  className,
}: ExportPreviewProps) {
  const { estimatedRecords, estimatedSize, tables, tableCounts, warnings } = preview

  return (
    <Card className={cn('glass-medium border-cosmic-600', className)}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3 pb-3 border-b border-cosmic-700">
          <Database className="h-5 w-5 text-cosmic-400" />
          <h3 className="text-lg font-heading font-semibold text-white">
            Export Preview
          </h3>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-strong p-4 rounded-lg border border-cosmic-600"
          >
            <div className="text-sm text-gray-400 mb-1">Total Records</div>
            <div className="text-2xl font-bold text-white">
              {estimatedRecords.toLocaleString()}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-strong p-4 rounded-lg border border-cosmic-600"
          >
            <div className="text-sm text-gray-400 mb-1">Estimated Size</div>
            <div className="text-2xl font-bold text-white">{estimatedSize}</div>
          </motion.div>
        </div>

        {/* Format Info */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-cosmic-200 border-cosmic-500">
            <FileText className="h-3 w-3 mr-1" />
            {format.toUpperCase()}
          </Badge>
          {compressed && (
            <Badge variant="outline" className="text-cosmic-200 border-cosmic-500">
              Compressed (gzip)
            </Badge>
          )}
        </div>

        {/* Tables */}
        {tables.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-300">
              Tables to Export ({tables.length})
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {tables.map((table, index) => (
                <motion.div
                  key={table}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * index }}
                  className="flex items-center justify-between p-2 glass-strong rounded border border-cosmic-700 hover:border-cosmic-600 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-400" />
                    <span className="text-sm text-white font-mono">{table}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {tableCounts[table]?.toLocaleString() || 0} records
                  </Badge>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Warnings */}
        {warnings && warnings.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-yellow-400">
              <AlertTriangle className="h-4 w-4" />
              Warnings
            </div>
            <div className="space-y-1">
              {warnings.map((warning, index) => (
                <div
                  key={index}
                  className="p-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-sm text-yellow-200"
                >
                  {warning}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {estimatedRecords === 0 && (
          <div className="text-center py-6 text-gray-400">
            <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No data to export</p>
          </div>
        )}
      </div>
    </Card>
  )
}
