/**
 * Screenshot capture utility for the Guide agent
 * Uses html2canvas to capture DOM elements as images
 */

import html2canvas from 'html2canvas'

export interface ScreenshotOptions {
  /** CSS selector for the element to capture */
  selector?: string
  /** Quality for JPEG output (0-1), ignored for PNG */
  quality?: number
  /** Output format */
  format?: 'png' | 'jpeg'
  /** Scale factor (default 1, use 0.5 for smaller images) */
  scale?: number
  /** Maximum width in pixels (will scale down if larger) */
  maxWidth?: number
}

export interface ScreenshotResult {
  success: boolean
  /** Base64 encoded image data (without data: prefix) */
  image?: string
  /** MIME type of the image */
  mimeType?: string
  /** Width of the captured image */
  width?: number
  /** Height of the captured image */
  height?: number
  /** Error message if capture failed */
  error?: string
}

/**
 * Capture a screenshot of a DOM element or the entire viewport
 */
export async function captureScreenshot(
  options: ScreenshotOptions = {}
): Promise<ScreenshotResult> {
  const {
    selector,
    quality = 0.85,
    format = 'jpeg', // JPEG is smaller, good for sending to API
    scale = 1,
    maxWidth = 1200,
  } = options

  try {
    // Find the element to capture
    let element: HTMLElement
    if (selector) {
      const found = document.querySelector(selector) as HTMLElement
      if (!found) {
        return {
          success: false,
          error: `Element not found: ${selector}`,
        }
      }
      element = found
    } else {
      // Capture the main content area by default
      element = document.querySelector('main') as HTMLElement ||
                document.querySelector('#root') as HTMLElement ||
                document.body
    }

    // Capture with html2canvas
    const canvas = await html2canvas(element, {
      scale: scale,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#0f0a1e', // Match app background
      logging: false,
    })

    // Scale down if needed
    let finalCanvas = canvas
    if (canvas.width > maxWidth) {
      const scaleFactor = maxWidth / canvas.width
      const scaledCanvas = document.createElement('canvas')
      scaledCanvas.width = Math.round(canvas.width * scaleFactor)
      scaledCanvas.height = Math.round(canvas.height * scaleFactor)
      const ctx = scaledCanvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(canvas, 0, 0, scaledCanvas.width, scaledCanvas.height)
        finalCanvas = scaledCanvas
      }
    }

    // Convert to base64
    const mimeType = format === 'png' ? 'image/png' : 'image/jpeg'
    const dataUrl = finalCanvas.toDataURL(mimeType, quality)

    // Extract just the base64 part (remove "data:image/jpeg;base64," prefix)
    const base64 = dataUrl.split(',')[1]

    return {
      success: true,
      image: base64,
      mimeType,
      width: finalCanvas.width,
      height: finalCanvas.height,
    }
  } catch (error) {
    console.error('Screenshot capture failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Capture the birth chart wheel specifically
 */
export async function captureChartWheel(): Promise<ScreenshotResult> {
  // Try various selectors for the chart
  const selectors = [
    '[data-chart-container]',
    '.birth-chart-wheel',
    '[class*="BirthChartWheel"]',
    'svg[class*="chart"]',
    'main > div > div:first-child', // Common layout pattern
  ]

  for (const selector of selectors) {
    const element = document.querySelector(selector)
    if (element) {
      return captureScreenshot({ selector, maxWidth: 800 })
    }
  }

  // Fall back to capturing the main content
  return captureScreenshot({ maxWidth: 1000 })
}

/**
 * Capture the current page view
 */
export async function captureCurrentView(): Promise<ScreenshotResult> {
  return captureScreenshot({ maxWidth: 1200 })
}
