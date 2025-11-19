# Phase 2: Code Reference & Examples

## Export System Code Snippets

### 1. PNG Export Function

```typescript
// File: src/features/birthchart/utils/export.ts

export async function exportChartAsPNG(
  svgElement: SVGElement,
  options: ExportOptions = {}
): Promise<Blob> {
  const { size = 1200, quality = 0.95, backgroundColor = '#0f0f1e' } = options

  // Clone SVG and set dimensions
  const svgClone = svgElement.cloneNode(true) as SVGElement
  const svgEl = svgElement as SVGSVGElement
  const originalWidth = svgEl.width.baseVal.value
  const originalHeight = svgEl.height.baseVal.value

  svgClone.setAttribute('width', size.toString())
  svgClone.setAttribute('height', size.toString())
  svgClone.setAttribute('viewBox', `0 0 ${originalWidth} ${originalHeight}`)

  // Convert to blob via canvas
  const svgData = new XMLSerializer().serializeToString(svgClone)
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
  const svgUrl = URL.createObjectURL(svgBlob)

  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')

      ctx.fillStyle = backgroundColor
      ctx.fillRect(0, 0, size, size)
      ctx.drawImage(img, 0, 0, size, size)

      canvas.toBlob(blob => {
        URL.revokeObjectURL(svgUrl)
        if (blob) resolve(blob)
        else reject(new Error('Failed to create blob'))
      }, 'image/png', quality)
    }
    img.onerror = () => {
      URL.revokeObjectURL(svgUrl)
      reject(new Error('Failed to load SVG'))
    }
    img.src = svgUrl
  })
}
```

### 2. PDF Export Function

```typescript
// File: src/features/birthchart/utils/exportPDF.ts

export async function exportChartAsPDF(
  chart: BirthChart,
  birthData: BirthData,
  svgElement: SVGElement | null,
  options: PDFExportOptions = {}
): Promise<Blob> {
  const {
    paperSize = 'letter',
    includeWheel = true,
    includePlanets = true,
    includeHouses = true,
    includeAspects = true,
  } = options

  const { width, height } = PAPER_SIZES[paperSize]
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [width, height],
  })

  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 20

  // Page 1: Chart Wheel
  if (includeWheel && svgElement) {
    pdf.setFontSize(18)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Birth Chart', pageWidth / 2, margin, { align: 'center' })

    const blob = await exportChartAsPNG(svgElement, { size: 1200 })
    const imgData = await blobToDataURL(blob)

    const imgSize = 160
    const imgX = (pageWidth - imgSize) / 2
    const imgY = margin + 15

    pdf.addImage(imgData, 'PNG', imgX, imgY, imgSize, imgSize)
  }

  // Page 2: Planetary Positions
  if (includePlanets) {
    pdf.addPage()
    pdf.setFontSize(16)
    pdf.text('Planetary Positions', pageWidth / 2, margin, { align: 'center' })

    let y = margin + 15
    chart.planets.forEach((planet: PlanetPosition) => {
      pdf.text(`${planet.symbol} ${planet.name}`, margin, y)
      pdf.text(`${formatDegree(planet.degree, planet.sign)}`, margin + 50, y)
      pdf.text(`House ${planet.house}`, margin + 110, y)
      pdf.text(planet.isRetrograde ? 'Yes ℞' : 'No', margin + 140, y)
      y += 7
    })
  }

  return pdf.output('blob')
}
```

### 3. Export Dialog Component

```typescript
// File: src/features/birthchart/components/ExportDialog.tsx

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
          <DialogTitle>Export Birth Chart</DialogTitle>
        </DialogHeader>

        {/* Format Selection */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setFormat('png')}
            className={format === 'png' ? 'selected' : ''}
          >
            <FileImage />
            <div>PNG Image</div>
          </button>

          <button
            onClick={() => setFormat('pdf')}
            className={format === 'pdf' ? 'selected' : ''}
          >
            <FileText />
            <div>PDF Document</div>
          </button>
        </div>

        {/* Options based on format */}
        {format === 'png' && (
          <select value={imageSize} onChange={e => setImageSize(Number(e.target.value))}>
            <option value={800}>Small (800px)</option>
            <option value={1200}>Medium (1200px)</option>
            <option value={2000}>Large (2000px)</option>
          </select>
        )}

        {/* Content toggles */}
        <label>
          <input type="checkbox" checked={includeWheel} onChange={...} />
          Chart Wheel
        </label>

        <DialogFooter>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? 'Exporting...' : 'Export'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

### 4. Integration in BirthChartPage

```typescript
// File: src/features/birthchart/BirthChartPage.tsx

export function BirthChartPage() {
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const chartWheelRef = useRef<HTMLDivElement>(null)

  const handleExport = async (settings: ExportSettings) => {
    setIsExporting(true)
    try {
      const svgElement = chartWheelRef.current?.querySelector('svg')
      if (!svgElement) throw new Error('Chart SVG not found')

      if (settings.format === 'png') {
        const blob = await exportChartAsPNG(svgElement, { size: settings.imageSize })
        const filename = generateFilename('birth-chart', 'png')
        downloadBlob(blob, filename)
      } else {
        const blob = await exportChartAsPDF(chart, birthData, svgElement, {
          paperSize: settings.paperSize,
          includeWheel: settings.includeWheel,
          includePlanets: settings.includePlanets,
          includeHouses: settings.includeHouses,
          includeAspects: settings.includeAspects,
        })
        const filename = generateFilename('birth-chart', 'pdf')
        downloadBlob(blob, filename)
      }

      setExportDialogOpen(false)
    } catch (error) {
      console.error('Export failed:', error)
      alert('Failed to export chart')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <>
      <Button onClick={() => setExportDialogOpen(true)}>
        <Download /> Export
      </Button>

      <BirthChartWheel ref={chartWheelRef} chart={chart} />

      <ExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        onExport={handleExport}
        isExporting={isExporting}
      />
    </>
  )
}
```

### 5. ForwardRef for BirthChartWheel

```typescript
// File: src/features/birthchart/components/BirthChartWheel.tsx

import { forwardRef } from 'react'

export const BirthChartWheel = forwardRef<HTMLDivElement, BirthChartWheelProps>(
  ({ chart, showAspects = true, showHouseNumbers = true, size = 600 }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const chartRef = (ref as React.RefObject<HTMLDivElement>) || containerRef

    return (
      <div ref={chartRef} className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size}>
          {/* Chart content */}
        </svg>
      </div>
    )
  }
)

BirthChartWheel.displayName = 'BirthChartWheel'
```

---

## Mobile Responsive Code Snippets

### 1. Responsive Hooks

```typescript
// File: src/features/birthchart/BirthChartPage.tsx

import { useResponsive, useIsMobile } from './utils/responsive'

export function BirthChartPage() {
  const responsiveConfig = useResponsive()
  const isMobile = useIsMobile()

  return (
    <div className={`grid gap-8 ${
      responsiveConfig.stackLayout ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'
    }`}>
      <BirthChartWheel
        chart={chart}
        showAspects={showAspects && responsiveConfig.features.showAspectLines}
        showHouseNumbers={showHouseNumbers && responsiveConfig.features.showHouseNumbers}
        size={responsiveConfig.chartSize}
      />
    </div>
  )
}
```

### 2. Responsive Configuration

```typescript
// File: src/features/birthchart/utils/responsive.ts

export function getResponsiveConfig(width: number): ResponsiveConfig {
  if (width < 640) {
    return {
      breakpoint: 'mobile',
      chartSize: Math.min(width - 32, 400),
      showSidebar: false,
      stackLayout: true,
      features: {
        showAspectLines: false,
        showDegreeMarkers: false,
        enableAnimations: false,
        showTooltips: false,
      },
    }
  }

  if (width < 1024) {
    return {
      breakpoint: 'tablet',
      chartSize: 500,
      stackLayout: true,
      features: {
        showAspectLines: true,
        showDegreeMarkers: true,
        enableAnimations: true,
        showTooltips: true,
      },
    }
  }

  return {
    breakpoint: 'desktop',
    chartSize: 600,
    stackLayout: false,
    features: {
      showAspectLines: true,
      showDegreeMarkers: true,
      enableAnimations: true,
      showTooltips: true,
    },
  }
}

export function useResponsive(): ResponsiveConfig {
  const [config, setConfig] = useState(() => getResponsiveConfig(window.innerWidth))

  useEffect(() => {
    const handleResize = () => setConfig(getResponsiveConfig(window.innerWidth))
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return config
}
```

### 3. Mobile Button Labels

```typescript
// File: src/features/birthchart/BirthChartPage.tsx

<Button
  onClick={() => setShowAspects(!showAspects)}
  title="Toggle aspects"
>
  {showAspects ? <Eye /> : <EyeOff />}
  {!isMobile && <span className="ml-2">Aspects</span>}
</Button>

<Button
  onClick={() => setExportDialogOpen(true)}
  title="Export chart"
>
  <Download />
  {!isMobile && <span className="ml-2">Export</span>}
</Button>
```

---

## Utility Functions

### 1. Filename Generation

```typescript
export function generateFilename(prefix: string, extension: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')
  const date = timestamp[0]
  const time = timestamp[1].split('-').slice(0, 3).join('-')
  return `${prefix}-${date}_${time}.${extension}`
}

// Example output: "birth-chart-2025-11-11_14-30-15.png"
```

### 2. Blob Download

```typescript
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
```

### 3. Blob to Data URL

```typescript
export function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
```

---

## TypeScript Type Definitions

### Export Types

```typescript
export interface ExportOptions {
  size?: number
  quality?: number
  backgroundColor?: string
}

export type PaperSize = 'letter' | 'a4' | 'legal'

export interface PDFExportOptions {
  paperSize?: PaperSize
  includeWheel?: boolean
  includePlanets?: boolean
  includeHouses?: boolean
  includeAspects?: boolean
}

export type ExportFormat = 'png' | 'pdf'

export interface ExportSettings {
  format: ExportFormat
  imageSize: number
  paperSize: PaperSize
  includeWheel: boolean
  includePlanets: boolean
  includeHouses: boolean
  includeAspects: boolean
}
```

### Responsive Types

```typescript
export type Breakpoint = 'mobile' | 'tablet' | 'desktop' | 'ultrawide'

export interface ResponsiveConfig {
  breakpoint: Breakpoint
  chartSize: number
  showSidebar: boolean
  stackLayout: boolean
  fontSize: {
    small: number
    medium: number
    large: number
  }
  spacing: {
    padding: number
    gap: number
  }
  features: {
    showAspectLines: boolean
    showDegreeMarkers: boolean
    showPlanetLabels: boolean
    showHouseNumbers: boolean
    enableAnimations: boolean
    showTooltips: boolean
  }
}
```

---

## Error Handling Patterns

### 1. Export Error Handling

```typescript
const handleExport = async (settings: ExportSettings) => {
  setIsExporting(true)

  try {
    const svgElement = chartWheelRef.current?.querySelector('svg')

    if (!svgElement) {
      throw new Error('Chart SVG not found')
    }

    // Export logic...

    setExportDialogOpen(false)
  } catch (error) {
    console.error('Export failed:', error)

    // User-friendly error message
    const message = error instanceof Error
      ? error.message
      : 'Failed to export chart. Please try again.'

    alert(message)
  } finally {
    setIsExporting(false)
  }
}
```

### 2. Safe LocalStorage

```typescript
useEffect(() => {
  try {
    localStorage.setItem('birthData', JSON.stringify(birthData))
  } catch (err) {
    console.error('Error saving to localStorage:', err)
    // Silently fail - not critical
  }
}, [birthData])
```

---

## Performance Optimizations

### 1. Memoized Responsive Config

```typescript
const responsiveConfig = useMemo(() =>
  getResponsiveConfig(window.innerWidth),
  [window.innerWidth]
)
```

### 2. Async Export (Non-Blocking)

```typescript
// Export runs asynchronously without blocking UI
const blob = await exportChartAsPNG(svgElement, { size: 1200 })

// UI shows loading indicator
{isExporting && <Spinner />}
```

### 3. Conditional Feature Rendering

```typescript
// Don't render aspect lines on mobile
{responsiveConfig.features.showAspectLines && (
  <AspectLines aspects={filteredAspects} />
)}

// Disable animations on mobile for performance
{responsiveConfig.features.enableAnimations && (
  <motion.div {...animations} />
)}
```

---

## Testing Examples

### 1. Manual Test Checklist

**Export PNG:**
- [ ] Click Export button
- [ ] Select PNG format
- [ ] Choose Small (800px)
- [ ] Click Export
- [ ] Verify download (birth-chart-YYYY-MM-DD_HH-MM-SS.png)
- [ ] Open image, verify quality
- [ ] Repeat with Medium and Large

**Export PDF:**
- [ ] Click Export button
- [ ] Select PDF format
- [ ] Choose A4 paper
- [ ] Uncheck "Houses"
- [ ] Click Export
- [ ] Verify download (birth-chart-YYYY-MM-DD_HH-MM-SS.pdf)
- [ ] Open PDF, verify 3 pages (no houses page)
- [ ] Check formatting, symbols, data accuracy

**Mobile Responsive:**
- [ ] Open DevTools
- [ ] Toggle device toolbar
- [ ] Select iPhone 12 Pro (390px width)
- [ ] Verify chart ≤ 400px
- [ ] Verify vertical stack layout
- [ ] Verify icon-only buttons
- [ ] Test on real mobile device
- [ ] Check touch targets (≥ 44px)

### 2. Browser Compatibility

**Tested:**
- Chrome 120+ ✅
- Firefox 121+ ✅
- Safari 17+ ✅
- Edge 120+ ✅

**Mobile:**
- iOS Safari ✅
- Chrome Mobile ✅
- Firefox Mobile ✅

---

**End of Code Reference**
