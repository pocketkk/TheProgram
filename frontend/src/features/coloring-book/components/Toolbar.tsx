/**
 * Toolbar Component
 *
 * Tool selection and brush presets for the art canvas
 */
import { motion } from 'framer-motion'
import {
  Paintbrush,
  Pencil,
  PenTool,
  Highlighter,
  Eraser,
  PaintBucket,
  Pipette,
  Undo2,
  Redo2,
  Trash2,
  Download,
  Save,
  ZoomIn,
  ZoomOut,
  Grid3X3,
  RotateCcw,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui'
import { useColoringBookStore } from '../stores/useColoringBookStore'
import type { ToolType } from '../types'
import { BRUSH_PRESETS } from '../types'

interface ToolbarProps {
  onUndo: () => void
  onRedo: () => void
  onClear: () => void
  onSave: () => void
  onDownload: () => void
  className?: string
}

interface ToolButtonProps {
  tool: ToolType
  icon: LucideIcon
  label: string
  isActive: boolean
  onClick: () => void
}

const ToolButton = ({ tool, icon: Icon, label, isActive, onClick }: ToolButtonProps) => (
  <motion.button
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    className={`
      p-2 rounded-lg transition-all relative group
      ${isActive
        ? 'bg-gradient-to-r from-cosmic-600 to-cosmic-500 text-white shadow-lg'
        : 'bg-cosmic-800/50 text-gray-400 hover:text-white hover:bg-cosmic-700/50'
      }
    `}
    title={label}
  >
    <Icon className="h-5 w-5" />
    <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs bg-cosmic-900 text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
      {label}
    </span>
  </motion.button>
)

// Custom icons for tools we don't have in Lucide
const AirbrushIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
    <circle cx="8" cy="8" r="2" opacity="0.3" />
    <circle cx="12" cy="6" r="1.5" opacity="0.4" />
    <circle cx="6" cy="12" r="1" opacity="0.2" />
    <circle cx="10" cy="10" r="2.5" opacity="0.5" />
    <path d="M14 14 L20 20" />
    <path d="M18 14 L22 10" />
  </svg>
)

const CharcoalIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
    <path d="M4 20 L8 4 L12 20" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M6 14 L10 14" />
    <path d="M14 12 C14 12 16 8 18 12 S22 16 20 18" strokeLinecap="round" />
  </svg>
)

const WatercolorIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
    <path d="M12 2 C12 2 6 10 6 14 C6 18 8.7 20 12 20 C15.3 20 18 18 18 14 C18 10 12 2 12 2" />
    <path d="M9 12 Q12 16 15 12" opacity="0.5" />
  </svg>
)

const CrayonIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
    <path d="M6 4 L6 16 L12 22 L18 16 L18 4 Z" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M6 8 L18 8" />
    <path d="M10 22 L10 16" opacity="0.5" />
    <path d="M14 22 L14 16" opacity="0.5" />
  </svg>
)

const MarkerIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
    <path d="M8 4 L16 4 L18 8 L18 18 L14 22 L10 22 L6 18 L6 8 Z" />
    <path d="M6 10 L18 10" />
    <rect x="10" y="22" width="4" height="2" rx="1" />
  </svg>
)

const BlurIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
    <circle cx="12" cy="12" r="8" opacity="0.2" />
    <circle cx="12" cy="12" r="5" opacity="0.4" />
    <circle cx="12" cy="12" r="2" opacity="0.6" />
  </svg>
)

const SmudgeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
    <path d="M4 12 Q8 8 12 12 T20 12" strokeLinecap="round" />
    <path d="M4 16 Q8 12 12 16 T20 16" strokeLinecap="round" opacity="0.5" />
  </svg>
)

// Tool definitions with icons
const TOOLS: { tool: ToolType; icon: LucideIcon | (() => JSX.Element); label: string }[] = [
  { tool: 'brush', icon: Paintbrush, label: 'Brush' },
  { tool: 'pencil', icon: Pencil, label: 'Pencil' },
  { tool: 'pen', icon: PenTool, label: 'Pen' },
  { tool: 'marker', icon: MarkerIcon, label: 'Marker' },
  { tool: 'airbrush', icon: AirbrushIcon, label: 'Airbrush' },
  { tool: 'charcoal', icon: CharcoalIcon, label: 'Charcoal' },
  { tool: 'watercolor', icon: WatercolorIcon, label: 'Watercolor' },
  { tool: 'crayon', icon: CrayonIcon, label: 'Crayon' },
  { tool: 'eraser', icon: Eraser, label: 'Eraser' },
  { tool: 'fill', icon: PaintBucket, label: 'Fill' },
  { tool: 'eyedropper', icon: Pipette, label: 'Eyedropper' },
  { tool: 'blur', icon: BlurIcon, label: 'Blur' },
  { tool: 'smudge', icon: SmudgeIcon, label: 'Smudge' },
]

export const Toolbar = ({
  onUndo,
  onRedo,
  onClear,
  onSave,
  onDownload,
  className,
}: ToolbarProps) => {
  const {
    currentTool,
    setTool,
    canUndo,
    canRedo,
    zoom,
    setZoom,
    showGrid,
    toggleGrid,
    resetView,
  } = useColoringBookStore()

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {/* Drawing Tools */}
      <div className="glass-strong rounded-xl p-3">
        <h3 className="text-xs font-medium text-gray-400 mb-2 px-1">Drawing Tools</h3>
        <div className="grid grid-cols-3 gap-1">
          {TOOLS.map(({ tool, icon: Icon, label }) => (
            <ToolButton
              key={tool}
              tool={tool}
              icon={typeof Icon === 'function' ? Icon : Icon}
              label={label}
              isActive={currentTool === tool}
              onClick={() => setTool(tool)}
            />
          ))}
        </div>
      </div>

      {/* Brush Presets */}
      <div className="glass-strong rounded-xl p-3">
        <h3 className="text-xs font-medium text-gray-400 mb-2 px-1">Presets</h3>
        <div className="flex flex-wrap gap-1">
          {BRUSH_PRESETS.slice(0, 6).map((preset) => (
            <motion.button
              key={preset.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setTool(preset.tool)
                useColoringBookStore.getState().setToolSettings(preset.settings)
              }}
              className={`
                px-2 py-1 rounded text-xs font-medium transition-all
                ${currentTool === preset.tool
                  ? 'bg-cosmic-600 text-white'
                  : 'bg-cosmic-800/50 text-gray-400 hover:text-white'
                }
              `}
            >
              {preset.name}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Canvas Controls */}
      <div className="glass-strong rounded-xl p-3">
        <h3 className="text-xs font-medium text-gray-400 mb-2 px-1">Canvas</h3>
        <div className="flex flex-col gap-2">
          {/* Zoom controls */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setZoom(zoom - 0.25)}
              className="p-1"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-xs text-gray-400 w-12 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setZoom(zoom + 0.25)}
              className="p-1"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>

          {/* Grid and reset */}
          <div className="flex gap-1">
            <Button
              variant={showGrid ? 'primary' : 'ghost'}
              size="sm"
              onClick={toggleGrid}
              className="flex-1 p-1"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetView}
              className="flex-1 p-1"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* History Controls */}
      <div className="glass-strong rounded-xl p-3">
        <h3 className="text-xs font-medium text-gray-400 mb-2 px-1">History</h3>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onUndo}
            disabled={!canUndo}
            className="flex-1"
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRedo}
            disabled={!canRedo}
            className="flex-1"
          >
            <Redo2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="flex-1 text-red-400 hover:text-red-300"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Save Controls */}
      <div className="glass-strong rounded-xl p-3">
        <h3 className="text-xs font-medium text-gray-400 mb-2 px-1">Save</h3>
        <div className="flex flex-col gap-1">
          <Button
            variant="primary"
            size="sm"
            onClick={onSave}
            className="w-full"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Artwork
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDownload}
            className="w-full"
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>
      </div>
    </div>
  )
}
