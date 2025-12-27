/**
 * PDF Export Utilities
 * Functions for exporting birth charts as multi-page PDF documents
 */

import jsPDF from 'jspdf'
import type { BirthChart, BirthData, PlanetPosition, Aspect } from '@/lib/astrology/types'
import { exportChartAsPNG, blobToDataURL } from './export'

export type PaperSize = 'letter' | 'a4' | 'legal'

export interface PDFExportOptions {
  paperSize?: PaperSize
  includeWheel?: boolean
  includePlanets?: boolean
  includeHouses?: boolean
  includeAspects?: boolean
  includeCharts?: boolean
}

const PAPER_SIZES = {
  letter: { width: 215.9, height: 279.4 }, // 8.5" x 11" in mm
  a4: { width: 210, height: 297 },
  legal: { width: 215.9, height: 355.6 }, // 8.5" x 14" in mm
}

/**
 * Format birth data for display
 */
function formatBirthInfo(birthData: BirthData): string {
  const date = birthData.date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const time = birthData.date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
  return `${date} at ${time}`
}

/**
 * Format planet degree for display
 */
function formatDegree(degree: number, sign: string): string {
  const deg = Math.floor(degree)
  const min = Math.floor((degree - deg) * 60)
  return `${deg}°${min}' ${sign}`
}

/**
 * Export birth chart as multi-page PDF
 */
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

  let currentPage = 1

  // Page 1: Chart Wheel
  if (includeWheel && svgElement) {
    pdf.setFontSize(18)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Birth Chart', pageWidth / 2, margin, { align: 'center' })

    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    pdf.text(formatBirthInfo(birthData), pageWidth / 2, margin + 8, { align: 'center' })

    try {
      // Export chart as PNG and add to PDF
      const blob = await exportChartAsPNG(svgElement, { size: 1200 })
      const imgData = await blobToDataURL(blob)

      const imgSize = 160 // Size in mm
      const imgX = (pageWidth - imgSize) / 2
      const imgY = margin + 15

      pdf.addImage(imgData, 'PNG', imgX, imgY, imgSize, imgSize)
    } catch (error) {
      console.error('Failed to export chart wheel:', error)
      pdf.setFontSize(10)
      pdf.text('Error: Failed to export chart image', pageWidth / 2, 100, { align: 'center' })
    }

    currentPage++
  }

  // Page 2: Planet Positions
  if (includePlanets) {
    if (currentPage > 1) pdf.addPage()

    pdf.setFontSize(16)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Planetary Positions', pageWidth / 2, margin, { align: 'center' })

    pdf.setFontSize(9)
    pdf.setFont('helvetica', 'normal')

    let y = margin + 15
    const lineHeight = 7

    // Table header
    pdf.setFont('helvetica', 'bold')
    pdf.text('Planet', margin, y)
    pdf.text('Position', margin + 50, y)
    pdf.text('House', margin + 110, y)
    pdf.text('Retrograde', margin + 140, y)

    y += lineHeight
    pdf.setLineWidth(0.5)
    pdf.line(margin, y, pageWidth - margin, y)
    y += lineHeight

    pdf.setFont('helvetica', 'normal')

    // Planet rows
    chart.planets.forEach((planet: PlanetPosition) => {
      if (y > pageHeight - margin) {
        pdf.addPage()
        y = margin + 10
      }

      pdf.text(`${planet.symbol} ${planet.name}`, margin, y)
      pdf.text(formatDegree(planet.degree, planet.sign), margin + 50, y)
      pdf.text(`House ${planet.house}`, margin + 110, y)
      pdf.text(planet.isRetrograde ? 'Yes ℞' : 'No', margin + 140, y)

      y += lineHeight
    })

    currentPage++
  }

  // Page 3: House Positions
  if (includeHouses) {
    pdf.addPage()

    pdf.setFontSize(16)
    pdf.setFont('helvetica', 'bold')
    pdf.text('House Cusps', pageWidth / 2, margin, { align: 'center' })

    pdf.setFontSize(9)
    pdf.setFont('helvetica', 'normal')

    let y = margin + 15
    const lineHeight = 7

    // Table header
    pdf.setFont('helvetica', 'bold')
    pdf.text('House', margin, y)
    pdf.text('Sign', margin + 40, y)
    pdf.text('Cusp Position', margin + 100, y)

    y += lineHeight
    pdf.setLineWidth(0.5)
    pdf.line(margin, y, pageWidth - margin, y)
    y += lineHeight

    pdf.setFont('helvetica', 'normal')

    // House rows
    chart.houses.forEach(house => {
      if (y > pageHeight - margin) {
        pdf.addPage()
        y = margin + 10
      }

      pdf.text(`${house.number}`, margin + 5, y)
      pdf.text(house.sign, margin + 40, y)
      pdf.text(`${Math.floor(house.cusp)}°`, margin + 100, y)

      y += lineHeight
    })

    currentPage++
  }

  // Page 4+: Aspects
  if (includeAspects) {
    pdf.addPage()

    pdf.setFontSize(16)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Aspects', pageWidth / 2, margin, { align: 'center' })

    pdf.setFontSize(9)
    pdf.setFont('helvetica', 'normal')

    let y = margin + 15
    const lineHeight = 7

    // Table header
    pdf.setFont('helvetica', 'bold')
    pdf.text('Planet 1', margin, y)
    pdf.text('Aspect', margin + 40, y)
    pdf.text('Planet 2', margin + 80, y)
    pdf.text('Angle', margin + 120, y)
    pdf.text('Orb', margin + 150, y)

    y += lineHeight
    pdf.setLineWidth(0.5)
    pdf.line(margin, y, pageWidth - margin, y)
    y += lineHeight

    pdf.setFont('helvetica', 'normal')

    // Aspect rows
    chart.aspects.forEach((aspect: Aspect) => {
      if (y > pageHeight - margin) {
        pdf.addPage()
        y = margin + 10
      }

      const planet1 = chart.planets.find(p => p.name === aspect.planet1)
      const planet2 = chart.planets.find(p => p.name === aspect.planet2)

      pdf.text(planet1?.symbol || aspect.planet1, margin, y)
      pdf.text(aspect.type, margin + 40, y)
      pdf.text(planet2?.symbol || aspect.planet2, margin + 80, y)
      pdf.text(`${aspect.angle}°`, margin + 120, y)
      pdf.text(`${aspect.orb.toFixed(2)}°`, margin + 150, y)

      y += lineHeight
    })
  }

  // Convert to blob
  return pdf.output('blob')
}
