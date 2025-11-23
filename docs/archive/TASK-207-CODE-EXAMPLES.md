# TASK-207: Export UI - Code Examples

## Usage Examples

### 1. Using ExportButton in Any Component

```typescript
import { ExportButton } from '@/features/data-portability'
import { ExportType } from '@/types/export'

function MyComponent() {
  return (
    <ExportButton
      exportType={ExportType.FULL}
      variant="primary"
      label="Export All Data"
      onExportComplete={(filename) => {
        console.log('Export completed:', filename)
        showNotification('Data exported successfully!')
      }}
    />
  )
}
```

### 2. Export Selected Items

```typescript
import { ExportButton } from '@/features/data-portability'
import { ExportType } from '@/types/export'

function ClientList({ selectedClientIds }: { selectedClientIds: string[] }) {
  return (
    <ExportButton
      exportType={ExportType.CLIENTS}
      clientIds={selectedClientIds}
      label={`Export ${selectedClientIds.length} Clients`}
      disabled={selectedClientIds.length === 0}
    />
  )
}
```

### 3. Using useExport Hook Directly

```typescript
import { useExport } from '@/features/data-portability'
import { ExportType, ExportFormat } from '@/types/export'

function CustomExportComponent() {
  const { isExporting, error, downloadExport } = useExport()

  const handleExport = async () => {
    try {
      await downloadExport({
        type: ExportType.FULL,
        format: ExportFormat.JSON,
        includeMetadata: true,
        compress: true,
        pretty: true,
      })
      console.log('Export successful!')
    } catch (err) {
      console.error('Export failed:', err)
    }
  }

  return (
    <div>
      <button onClick={handleExport} disabled={isExporting}>
        {isExporting ? 'Exporting...' : 'Export Data'}
      </button>
      {error && <p className="error">{error}</p>}
    </div>
  )
}
```

### 4. API Client Usage

```typescript
import {
  exportFullDatabase,
  exportClients,
  downloadData,
  formatFileSize,
} from '@/lib/api/export'
import { ExportFormat } from '@/types/export'

// Export full database
async function exportAll() {
  const result = await exportFullDatabase({
    format: ExportFormat.JSON,
    include_metadata: true,
    compress: false,
    pretty: true,
  })

  // Trigger download
  if (result.data && result.download_filename) {
    downloadData(result.data, result.download_filename)
  }

  console.log(`Exported ${result.record_count} records`)
  console.log(`File size: ${formatFileSize(result.file_size || 0)}`)
}

// Export specific clients
async function exportMyClients() {
  const result = await exportClients({
    client_ids: ['uuid-1', 'uuid-2', 'uuid-3'],
    format: ExportFormat.CSV,
    include_related: true,
    pretty: false,
  })

  console.log(`Exported ${result.record_count} records`)
}
```

## Component Examples

### 5. ExportDialog Configuration

```typescript
import { ExportDialog } from '@/features/data-portability'
import { ExportType } from '@/types/export'
import { useState } from 'react'

function MyFeature() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  return (
    <>
      <button onClick={() => setDialogOpen(true)}>
        Export Data
      </button>

      <ExportDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultType={ExportType.CLIENTS}
        defaultClientIds={selectedIds}
        onExportComplete={(filename) => {
          console.log('Downloaded:', filename)
          setDialogOpen(false)
        }}
      />
    </>
  )
}
```

### 6. Custom Export Preview

```typescript
import { ExportPreview, useExportPreview } from '@/features/data-portability'
import { ExportFormat } from '@/types/export'
import { useEffect, useState } from 'react'

function MyExportPreview() {
  const { getPreview } = useExportPreview()
  const [preview, setPreview] = useState(null)

  useEffect(() => {
    getPreview(
      {
        type: ExportType.FULL,
        format: ExportFormat.JSON,
        compress: true,
        // ... other config
      },
      {
        clients: 150,
        charts: 300,
        birth_data: 200,
      }
    ).then(setPreview)
  }, [getPreview])

  if (!preview) return <div>Loading preview...</div>

  return (
    <ExportPreview
      preview={preview}
      format={ExportFormat.JSON}
      compressed={true}
    />
  )
}
```

## Integration Examples

### 7. Adding Export to a Detail Page

```typescript
import { ExportButton } from '@/features/data-portability'
import { ExportType } from '@/types/export'

function ClientDetailPage({ clientId }: { clientId: string }) {
  return (
    <div className="client-detail">
      <h1>Client Details</h1>

      <div className="actions">
        <ExportButton
          exportType={ExportType.CLIENTS}
          clientIds={[clientId]}
          variant="outline"
          label="Export This Client"
          size="sm"
        />
      </div>

      {/* Rest of client details */}
    </div>
  )
}
```

### 8. Chart Export Integration

```typescript
import { ExportButton } from '@/features/data-portability'
import { ExportType } from '@/types/export'

function BirthChartPage({ chartId }: { chartId: string }) {
  return (
    <div className="chart-page">
      <div className="chart-header">
        <h1>Birth Chart</h1>

        <ExportButton
          exportType={ExportType.CHARTS}
          chartIds={[chartId]}
          variant="secondary"
          label="Export Chart"
        />
      </div>

      {/* Chart visualization */}
    </div>
  )
}
```

## Advanced Examples

### 9. Batch Export with Progress

```typescript
import { useExport } from '@/features/data-portability'
import { ExportType, ExportFormat } from '@/types/export'
import { useState } from 'react'

function BatchExportComponent({ clientGroups }: { clientGroups: string[][] }) {
  const { downloadExport, isExporting } = useExport()
  const [progress, setProgress] = useState(0)

  const exportAllGroups = async () => {
    for (let i = 0; i < clientGroups.length; i++) {
      await downloadExport({
        type: ExportType.CLIENTS,
        format: ExportFormat.JSON,
        clientIds: clientGroups[i],
        includeRelated: true,
        compress: true,
        pretty: false,
      })

      setProgress(((i + 1) / clientGroups.length) * 100)
    }
  }

  return (
    <div>
      <button onClick={exportAllGroups} disabled={isExporting}>
        Export {clientGroups.length} Groups
      </button>
      {isExporting && (
        <div className="progress-bar">
          <div style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  )
}
```

### 10. Custom Export with Validation

```typescript
import { useExport } from '@/features/data-portability'
import { ExportType, ExportFormat } from '@/types/export'

function ValidatedExport({ clientIds }: { clientIds: string[] }) {
  const { downloadExport, error } = useExport()

  const handleExport = async () => {
    // Validate before export
    if (clientIds.length === 0) {
      alert('Please select at least one client')
      return
    }

    if (clientIds.length > 100) {
      const confirmed = confirm(
        `You are about to export ${clientIds.length} clients. This may take a while. Continue?`
      )
      if (!confirmed) return
    }

    try {
      await downloadExport({
        type: ExportType.CLIENTS,
        format: ExportFormat.JSON,
        clientIds,
        includeRelated: true,
        compress: clientIds.length > 50, // Auto-compress large exports
        pretty: clientIds.length <= 10, // Pretty print only for small exports
      })
    } catch (err) {
      console.error('Export failed:', err)
    }
  }

  return (
    <div>
      <button onClick={handleExport}>
        Export {clientIds.length} Clients
      </button>
      {error && <div className="error">{error}</div>}
    </div>
  )
}
```

## Type Examples

### 11. TypeScript Type Usage

```typescript
import type {
  ExportConfig,
  ExportType,
  ExportFormat,
  ExportResult,
  ExportPreview,
} from '@/types/export'

// Define export configuration
const config: ExportConfig = {
  type: ExportType.FULL,
  format: ExportFormat.JSON,
  includeMetadata: true,
  compress: false,
  pretty: true,
}

// Handle export result
function handleExportResult(result: ExportResult) {
  console.log(`Export successful: ${result.filename}`)
  console.log(`Records exported: ${result.recordCount}`)

  if (result.tableCounts) {
    Object.entries(result.tableCounts).forEach(([table, count]) => {
      console.log(`  ${table}: ${count} records`)
    })
  }
}

// Preview data type
interface PreviewProps {
  preview: ExportPreview
  onConfirm: () => void
}

function PreviewComponent({ preview, onConfirm }: PreviewProps) {
  return (
    <div>
      <p>Estimated records: {preview.estimatedRecords}</p>
      <p>Estimated size: {preview.estimatedSize}</p>
      <ul>
        {preview.tables.map((table) => (
          <li key={table}>
            {table}: {preview.tableCounts[table]} records
          </li>
        ))}
      </ul>
      <button onClick={onConfirm}>Confirm Export</button>
    </div>
  )
}
```

## Helper Function Examples

### 12. File Size Formatting

```typescript
import { formatFileSize, estimateExportSize } from '@/lib/api/export'
import { ExportFormat } from '@/types/export'

// Format bytes to human-readable
console.log(formatFileSize(1024)) // "1.00 KB"
console.log(formatFileSize(1048576)) // "1.00 MB"
console.log(formatFileSize(1073741824)) // "1.00 GB"

// Estimate export size
const recordCount = 1000
const size = estimateExportSize(recordCount, ExportFormat.JSON, false)
console.log(`Estimated size: ${size}`) // "488.28 KB"

const compressedSize = estimateExportSize(recordCount, ExportFormat.JSON, true)
console.log(`Compressed size: ${compressedSize}`) // "122.07 KB"
```

### 13. Filename Generation

```typescript
import { generateExportFilename } from '@/lib/api/export'
import { ExportFormat } from '@/types/export'

// Generate timestamped filenames
const filename1 = generateExportFilename('full', ExportFormat.JSON, false)
// "theprogram_full_export_2025-11-16T12-30-45.json"

const filename2 = generateExportFilename('clients', ExportFormat.CSV, true)
// "theprogram_clients_export_2025-11-16T12-30-45.csv.gz"
```

## Error Handling Examples

### 14. Comprehensive Error Handling

```typescript
import { useExport } from '@/features/data-portability'
import { getErrorMessage } from '@/lib/api/client'

function RobustExportComponent() {
  const { downloadExport, error, clearError } = useExport()

  const handleExport = async () => {
    clearError()

    try {
      await downloadExport({
        type: ExportType.FULL,
        format: ExportFormat.JSON,
        includeMetadata: true,
        compress: false,
        pretty: true,
      })

      // Success notification
      showSuccessToast('Export completed successfully!')
    } catch (err) {
      // Error already set in hook, but can also handle here
      const errorMsg = getErrorMessage(err)
      console.error('Export error:', errorMsg)

      // Show error notification
      showErrorToast(errorMsg)

      // Log to error tracking service
      logError('export_failed', {
        error: errorMsg,
        exportType: ExportType.FULL,
      })
    }
  }

  return (
    <div>
      <button onClick={handleExport}>Export</button>
      {error && (
        <div className="error-banner">
          <p>{error}</p>
          <button onClick={clearError}>Dismiss</button>
        </div>
      )}
    </div>
  )
}
```

## Best Practices

### 15. Recommended Patterns

```typescript
// ✅ DO: Use ExportButton for simple cases
<ExportButton exportType={ExportType.FULL} />

// ✅ DO: Provide clear labels
<ExportButton
  label={`Export ${count} Clients`}
  exportType={ExportType.CLIENTS}
  clientIds={ids}
/>

// ✅ DO: Handle export completion
<ExportButton
  onExportComplete={(filename) => {
    trackAnalytics('export_completed', { filename })
    showNotification('Export successful!')
  }}
/>

// ✅ DO: Disable when no data
<ExportButton
  disabled={clients.length === 0}
  label="Export Clients"
/>

// ❌ DON'T: Perform long operations without feedback
// Instead, use loading states and progress indicators

// ❌ DON'T: Export without validation
// Instead, check data exists and user has confirmed

// ❌ DON'T: Ignore errors
// Instead, display user-friendly error messages
```

---

These examples demonstrate the flexibility and power of the export UI implementation. All patterns are production-ready and follow React/TypeScript best practices.
