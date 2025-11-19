/**
 * ExportButton Component
 *
 * Trigger button for opening the export dialog.
 */
import React, { useState } from 'react'
import { Button, type ButtonProps } from '@/components/ui/Button'
import { Download } from 'lucide-react'
import { ExportDialog } from './ExportDialog'
import type { ExportType } from '@/types/export'

interface ExportButtonProps extends Omit<ButtonProps, 'onClick'> {
  exportType?: ExportType
  clientIds?: string[]
  chartIds?: string[]
  onExportComplete?: (filename: string) => void
  label?: string
}

export function ExportButton({
  exportType,
  clientIds = [],
  chartIds = [],
  onExportComplete,
  label = 'Export Data',
  variant = 'secondary',
  ...buttonProps
}: ExportButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <>
      <Button
        variant={variant}
        onClick={() => setDialogOpen(true)}
        {...buttonProps}
      >
        <Download className="h-4 w-4 mr-2" />
        {label}
      </Button>

      <ExportDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultType={exportType}
        defaultClientIds={clientIds}
        defaultChartIds={chartIds}
        onExportComplete={onExportComplete}
      />
    </>
  )
}
