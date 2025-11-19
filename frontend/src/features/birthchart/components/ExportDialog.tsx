/**
 * Export Dialog Component
 * Dialog for configuring and exporting birth charts as PNG or PDF
 */

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui'
import { Download, FileImage, FileText } from 'lucide-react'
import type { PaperSize } from '../utils/exportPDF'

export type ExportFormat = 'png' | 'pdf'

export interface ExportSettings {
  format: ExportFormat
  // PNG options
  imageSize: number
  // PDF options
  paperSize: PaperSize
  // Content options
  includeWheel: boolean
  includePlanets: boolean
  includeHouses: boolean
  includeAspects: boolean
}

interface ExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onExport: (settings: ExportSettings) => void
  isExporting?: boolean
}

export function ExportDialog({ open, onOpenChange, onExport, isExporting }: ExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>('png')
  const [imageSize, setImageSize] = useState(1200)
  const [paperSize, setPaperSize] = useState<PaperSize>('letter')
  const [includeWheel, setIncludeWheel] = useState(true)
  const [includePlanets, setIncludePlanets] = useState(true)
  const [includeHouses, setIncludeHouses] = useState(true)
  const [includeAspects, setIncludeAspects] = useState(true)

  const handleExport = () => {
    onExport({
      format,
      imageSize,
      paperSize,
      includeWheel,
      includePlanets,
      includeHouses,
      includeAspects,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 text-cosmic-400" />
            Export Birth Chart
          </DialogTitle>
          <DialogDescription>
            Choose export format and customize what to include
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Format Selection */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-cosmic-200">Export Format</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setFormat('png')}
                className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                  format === 'png'
                    ? 'border-cosmic-500 bg-cosmic-500/20'
                    : 'border-cosmic-700/50 bg-cosmic-900/30 hover:border-cosmic-600'
                }`}
              >
                <FileImage className="w-5 h-5 text-cosmic-400" />
                <div className="text-left">
                  <div className="font-semibold text-sm">PNG Image</div>
                  <div className="text-xs text-cosmic-400">High quality raster</div>
                </div>
              </button>

              <button
                onClick={() => setFormat('pdf')}
                className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                  format === 'pdf'
                    ? 'border-cosmic-500 bg-cosmic-500/20'
                    : 'border-cosmic-700/50 bg-cosmic-900/30 hover:border-cosmic-600'
                }`}
              >
                <FileText className="w-5 h-5 text-cosmic-400" />
                <div className="text-left">
                  <div className="font-semibold text-sm">PDF Document</div>
                  <div className="text-xs text-cosmic-400">Multi-page report</div>
                </div>
              </button>
            </div>
          </div>

          {/* PNG Options */}
          {format === 'png' && (
            <div className="space-y-3">
              <label className="text-sm font-semibold text-cosmic-200">Image Size</label>
              <select
                value={imageSize}
                onChange={e => setImageSize(Number(e.target.value))}
                className="w-full px-4 py-2 rounded-lg bg-cosmic-900/50 border border-cosmic-700/50 text-cosmic-200 focus:border-cosmic-500 focus:outline-none focus:ring-2 focus:ring-cosmic-500/50"
              >
                <option value={800}>Small (800px)</option>
                <option value={1200}>Medium (1200px)</option>
                <option value={2000}>Large (2000px)</option>
              </select>
            </div>
          )}

          {/* PDF Options */}
          {format === 'pdf' && (
            <div className="space-y-3">
              <label className="text-sm font-semibold text-cosmic-200">Paper Size</label>
              <select
                value={paperSize}
                onChange={e => setPaperSize(e.target.value as PaperSize)}
                className="w-full px-4 py-2 rounded-lg bg-cosmic-900/50 border border-cosmic-700/50 text-cosmic-200 focus:border-cosmic-500 focus:outline-none focus:ring-2 focus:ring-cosmic-500/50"
              >
                <option value="letter">Letter (8.5" × 11")</option>
                <option value="a4">A4 (210mm × 297mm)</option>
                <option value="legal">Legal (8.5" × 14")</option>
              </select>
            </div>
          )}

          {/* Content Options */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-cosmic-200">Include</label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 rounded-lg bg-cosmic-900/30 border border-cosmic-700/30 hover:bg-cosmic-900/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeWheel}
                  onChange={e => setIncludeWheel(e.target.checked)}
                  className="w-4 h-4 rounded border-cosmic-600 text-cosmic-500 focus:ring-cosmic-500 focus:ring-offset-0"
                />
                <div>
                  <div className="text-sm font-medium text-cosmic-200">Chart Wheel</div>
                  <div className="text-xs text-cosmic-400">The main circular chart diagram</div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-lg bg-cosmic-900/30 border border-cosmic-700/30 hover:bg-cosmic-900/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includePlanets}
                  onChange={e => setIncludePlanets(e.target.checked)}
                  className="w-4 h-4 rounded border-cosmic-600 text-cosmic-500 focus:ring-cosmic-500 focus:ring-offset-0"
                />
                <div>
                  <div className="text-sm font-medium text-cosmic-200">Planet Positions</div>
                  <div className="text-xs text-cosmic-400">Detailed planetary placement table</div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-lg bg-cosmic-900/30 border border-cosmic-700/30 hover:bg-cosmic-900/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeHouses}
                  onChange={e => setIncludeHouses(e.target.checked)}
                  className="w-4 h-4 rounded border-cosmic-600 text-cosmic-500 focus:ring-cosmic-500 focus:ring-offset-0"
                />
                <div>
                  <div className="text-sm font-medium text-cosmic-200">House Positions</div>
                  <div className="text-xs text-cosmic-400">House cusps and signs</div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-lg bg-cosmic-900/30 border border-cosmic-700/30 hover:bg-cosmic-900/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeAspects}
                  onChange={e => setIncludeAspects(e.target.checked)}
                  className="w-4 h-4 rounded border-cosmic-600 text-cosmic-500 focus:ring-cosmic-500 focus:ring-offset-0"
                />
                <div>
                  <div className="text-sm font-medium text-cosmic-200">Aspects</div>
                  <div className="text-xs text-cosmic-400">Planetary aspect list</div>
                </div>
              </label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={() => onOpenChange(false)}
            variant="ghost"
            disabled={isExporting}
            className="text-cosmic-300 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting}
            className="bg-gradient-to-r from-cosmic-600 to-cosmic-500 hover:from-cosmic-500 hover:to-cosmic-400"
          >
            {isExporting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Export {format.toUpperCase()}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
