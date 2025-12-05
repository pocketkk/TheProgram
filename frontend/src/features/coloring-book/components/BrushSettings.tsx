/**
 * Brush Settings Component
 *
 * Fine-tune brush size, opacity, hardness, and other parameters
 */
import { useColoringBookStore } from '../stores/useColoringBookStore'

interface BrushSettingsProps {
  className?: string
}

interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  onChange: (value: number) => void
}

const Slider = ({ label, value, min, max, step = 1, unit = '', onChange }: SliderProps) => (
  <div className="space-y-1">
    <div className="flex justify-between text-xs">
      <span className="text-gray-400">{label}</span>
      <span className="text-gray-300">{value}{unit}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full h-2 bg-cosmic-700 rounded-lg appearance-none cursor-pointer accent-cosmic-500"
    />
  </div>
)

export const BrushSettings = ({ className }: BrushSettingsProps) => {
  const { toolSettings, setToolSettings, currentTool } = useColoringBookStore()

  // Different tools have different available settings
  const showHardness = !['pen', 'pencil', 'eraser', 'fill', 'eyedropper'].includes(currentTool)
  const showFlow = currentTool === 'airbrush'
  const showSmoothing = !['fill', 'eyedropper'].includes(currentTool)
  const showSpacing = !['fill', 'eyedropper', 'blur', 'smudge'].includes(currentTool)
  const showPressure = !['fill', 'eyedropper'].includes(currentTool)

  return (
    <div className={`glass-strong rounded-xl p-3 space-y-4 ${className}`}>
      <h3 className="text-xs font-medium text-gray-400">Brush Settings</h3>

      {/* Size */}
      <Slider
        label="Size"
        value={toolSettings.size}
        min={1}
        max={200}
        unit="px"
        onChange={(size) => setToolSettings({ size })}
      />

      {/* Opacity */}
      <Slider
        label="Opacity"
        value={toolSettings.opacity}
        min={1}
        max={100}
        unit="%"
        onChange={(opacity) => setToolSettings({ opacity })}
      />

      {/* Hardness */}
      {showHardness && (
        <Slider
          label="Hardness"
          value={toolSettings.hardness}
          min={0}
          max={100}
          unit="%"
          onChange={(hardness) => setToolSettings({ hardness })}
        />
      )}

      {/* Flow (Airbrush only) */}
      {showFlow && (
        <Slider
          label="Flow"
          value={toolSettings.flow}
          min={1}
          max={100}
          unit="%"
          onChange={(flow) => setToolSettings({ flow })}
        />
      )}

      {/* Spacing */}
      {showSpacing && (
        <Slider
          label="Spacing"
          value={toolSettings.spacing}
          min={1}
          max={100}
          unit="%"
          onChange={(spacing) => setToolSettings({ spacing })}
        />
      )}

      {/* Smoothing */}
      {showSmoothing && (
        <Slider
          label="Smoothing"
          value={toolSettings.smoothing}
          min={0}
          max={100}
          unit="%"
          onChange={(smoothing) => setToolSettings({ smoothing })}
        />
      )}

      {/* Pressure Sensitivity Toggle */}
      {showPressure && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">Pressure Sensitivity</span>
          <button
            onClick={() => setToolSettings({ pressure: !toolSettings.pressure })}
            className={`
              relative w-10 h-5 rounded-full transition-colors
              ${toolSettings.pressure ? 'bg-cosmic-500' : 'bg-cosmic-700'}
            `}
          >
            <span
              className={`
                absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform
                ${toolSettings.pressure ? 'translate-x-5' : ''}
              `}
            />
          </button>
        </div>
      )}

      {/* Brush Preview */}
      <div className="pt-2 border-t border-cosmic-700">
        <p className="text-xs text-gray-400 mb-2">Preview</p>
        <div className="h-16 bg-white rounded-lg flex items-center justify-center">
          <div
            className="rounded-full transition-all"
            style={{
              width: Math.min(toolSettings.size, 60),
              height: Math.min(toolSettings.size, 60),
              backgroundColor: toolSettings.color,
              opacity: toolSettings.opacity / 100,
              boxShadow: toolSettings.hardness < 50
                ? `0 0 ${(100 - toolSettings.hardness) / 5}px ${toolSettings.color}`
                : 'none',
            }}
          />
        </div>
      </div>
    </div>
  )
}
