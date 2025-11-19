/**
 * Chart Export Utilities
 * Functions for exporting birth charts as PNG images
 */

export interface ExportOptions {
  size?: number
  quality?: number
  backgroundColor?: string
}

/**
 * Convert SVG element to PNG blob
 * @param svgElement - The SVG element to export
 * @param options - Export options (size, quality, background color)
 * @returns Promise that resolves to a Blob
 */
export async function exportChartAsPNG(
  svgElement: SVGElement,
  options: ExportOptions = {}
): Promise<Blob> {
  const { size = 1200, quality = 0.95, backgroundColor = '#0f0f1e' } = options

  // Clone the SVG to avoid modifying the original
  const svgClone = svgElement.cloneNode(true) as SVGElement

  // Get the original dimensions
  const svgEl = svgElement as SVGSVGElement
  const originalWidth = svgEl.width.baseVal.value
  const originalHeight = svgEl.height.baseVal.value

  // Set explicit dimensions on the clone
  svgClone.setAttribute('width', size.toString())
  svgClone.setAttribute('height', size.toString())
  svgClone.setAttribute('viewBox', `0 0 ${originalWidth} ${originalHeight}`)

  // Serialize the SVG to a string
  const svgData = new XMLSerializer().serializeToString(svgClone)

  // Create a blob from the SVG data
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
  const svgUrl = URL.createObjectURL(svgBlob)

  return new Promise((resolve, reject) => {
    const img = new Image()

    img.onload = () => {
      try {
        // Create canvas with the desired size
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')

        if (!ctx) {
          throw new Error('Failed to get canvas context')
        }

        // Fill background
        ctx.fillStyle = backgroundColor
        ctx.fillRect(0, 0, size, size)

        // Draw the SVG image
        ctx.drawImage(img, 0, 0, size, size)

        // Convert to blob
        canvas.toBlob(
          blob => {
            URL.revokeObjectURL(svgUrl)
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error('Failed to create blob from canvas'))
            }
          },
          'image/png',
          quality
        )
      } catch (error) {
        URL.revokeObjectURL(svgUrl)
        reject(error)
      }
    }

    img.onerror = () => {
      URL.revokeObjectURL(svgUrl)
      reject(new Error('Failed to load SVG image'))
    }

    img.src = svgUrl
  })
}

/**
 * Convert blob to data URL
 * @param blob - The blob to convert
 * @returns Promise that resolves to a data URL string
 */
export function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * Trigger a download of a blob
 * @param blob - The blob to download
 * @param filename - The filename for the download
 */
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

/**
 * Generate a timestamp-based filename
 * @param prefix - Prefix for the filename
 * @param extension - File extension (without dot)
 * @returns Filename with timestamp
 */
export function generateFilename(prefix: string, extension: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')
  const date = timestamp[0]
  const time = timestamp[1].split('-').slice(0, 3).join('-')
  return `${prefix}-${date}_${time}.${extension}`
}
