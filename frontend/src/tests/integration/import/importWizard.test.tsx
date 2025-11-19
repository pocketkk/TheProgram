/**
 * Import Wizard Integration Tests
 *
 * Tests the entire import workflow from file upload to completion
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ImportWizard } from '@/features/data-portability'
import * as importApi from '@/lib/api/import'
import type { ValidationResult, DryRunResult, ImportResult } from '@/types/import'

// Mock the import API
vi.mock('@/lib/api/import', () => ({
  validateImport: vi.fn(),
  dryRunImport: vi.fn(),
  executeImport: vi.fn(),
}))

describe('ImportWizard', () => {
  const mockValidationResult: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    recordCount: 10,
    previewRecords: [
      { id: '1', first_name: 'John', last_name: 'Doe', email: 'john@example.com' },
      { id: '2', first_name: 'Jane', last_name: 'Smith', email: 'jane@example.com' },
    ],
    detectedFormat: 'json',
    estimatedDuration: 5000,
  }

  const mockDryRunResult: DryRunResult = {
    success: true,
    insertedCount: 8,
    updatedCount: 2,
    skippedCount: 0,
    conflicts: [],
    affectedTables: ['clients', 'birth_data'],
    estimatedDuration: 5000,
    warnings: [],
  }

  const mockImportResult: ImportResult = {
    success: true,
    insertedRecords: 8,
    updatedRecords: 2,
    skippedRecords: 0,
    errors: [],
    warnings: [],
    duration: 4850,
    backupPath: '/backups/backup-2025-11-16.sql',
    importId: 'import-123',
    summary: {
      clients: 10,
      birthData: 5,
      charts: 3,
      sessionNotes: 2,
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the upload step initially', () => {
    render(<ImportWizard />)

    expect(screen.getByText('Import Data')).toBeInTheDocument()
    expect(screen.getByText('Upload import file')).toBeInTheDocument()
    expect(screen.getByText('Choose File')).toBeInTheDocument()
  })

  it('uploads a file and progresses through validation', async () => {
    const user = userEvent.setup()

    vi.mocked(importApi.validateImport).mockResolvedValue(mockValidationResult)
    vi.mocked(importApi.dryRunImport).mockResolvedValue(mockDryRunResult)

    render(<ImportWizard />)

    // Create a test file
    const file = new File(['{"clients": []}'], 'test-import.json', {
      type: 'application/json',
    })

    // Find file input and upload
    const input = screen.getByLabelText(/choose file/i) as HTMLInputElement
    await user.upload(input, file)

    // Wait for validation to complete
    await waitFor(() => {
      expect(importApi.validateImport).toHaveBeenCalledWith(file)
    })

    // Should show validation passed
    await waitFor(() => {
      expect(screen.getByText('Validation Passed')).toBeInTheDocument()
    })

    // Should automatically proceed to dry run
    await waitFor(() => {
      expect(importApi.dryRunImport).toHaveBeenCalledWith(file, 'merge')
    })
  })

  it('shows validation errors when file is invalid', async () => {
    const user = userEvent.setup()

    const invalidResult: ValidationResult = {
      isValid: false,
      errors: [
        {
          type: 'validation',
          field: 'email',
          lineNumber: 5,
          message: 'Invalid email format',
          details: 'Email must be in format: user@domain.com',
          severity: 'error',
        },
      ],
      warnings: [],
      recordCount: 0,
      previewRecords: [],
    }

    vi.mocked(importApi.validateImport).mockResolvedValue(invalidResult)

    render(<ImportWizard />)

    const file = new File(['invalid data'], 'test.json', { type: 'application/json' })
    const input = screen.getByLabelText(/choose file/i) as HTMLInputElement
    await user.upload(input, file)

    await waitFor(() => {
      expect(screen.getByText('Validation Failed')).toBeInTheDocument()
      expect(screen.getByText('Invalid email format')).toBeInTheDocument()
    })
  })

  it('displays preview and allows mode selection', async () => {
    const user = userEvent.setup()

    vi.mocked(importApi.validateImport).mockResolvedValue(mockValidationResult)
    vi.mocked(importApi.dryRunImport).mockResolvedValue(mockDryRunResult)

    render(<ImportWizard />)

    const file = new File(['{"clients": []}'], 'test.json', { type: 'application/json' })
    const input = screen.getByLabelText(/choose file/i) as HTMLInputElement
    await user.upload(input, file)

    // Wait for preview step
    await waitFor(() => {
      expect(screen.getByText('Import Mode')).toBeInTheDocument()
    })

    // Should show mode options
    expect(screen.getByText('Merge')).toBeInTheDocument()
    expect(screen.getByText('Update')).toBeInTheDocument()
    expect(screen.getByText('Replace')).toBeInTheDocument()

    // Should show preview stats
    expect(screen.getByText('Will Insert')).toBeInTheDocument()
    expect(screen.getByText('8')).toBeInTheDocument() // insertedCount
  })

  it('handles conflicts and resolution', async () => {
    const user = userEvent.setup()

    const resultWithConflicts: DryRunResult = {
      ...mockDryRunResult,
      conflicts: [
        {
          id: 'conflict-1',
          type: 'duplicate_id',
          table: 'clients',
          field: 'id',
          recordId: '123',
          existingValue: { id: '123', name: 'Old Name' },
          importValue: { id: '123', name: 'New Name' },
        },
      ],
    }

    vi.mocked(importApi.validateImport).mockResolvedValue(mockValidationResult)
    vi.mocked(importApi.dryRunImport).mockResolvedValue(resultWithConflicts)

    render(<ImportWizard />)

    const file = new File(['{"clients": []}'], 'test.json', { type: 'application/json' })
    const input = screen.getByLabelText(/choose file/i) as HTMLInputElement
    await user.upload(input, file)

    // Wait for conflicts step
    await waitFor(() => {
      expect(screen.getByText('Resolve Conflicts')).toBeInTheDocument()
    })

    // Should show conflict
    expect(screen.getByText('Duplicate ID')).toBeInTheDocument()
    expect(screen.getByText('clients.id')).toBeInTheDocument()

    // Can resolve conflict
    const keepExistingButton = screen.getByRole('button', { name: /keep existing/i })
    await user.click(keepExistingButton)

    // Should show resolution applied
    await waitFor(() => {
      expect(screen.getByText(/keep existing/i)).toBeInTheDocument()
    })
  })

  it('completes full import workflow', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()

    vi.mocked(importApi.validateImport).mockResolvedValue(mockValidationResult)
    vi.mocked(importApi.dryRunImport).mockResolvedValue(mockDryRunResult)
    vi.mocked(importApi.executeImport).mockResolvedValue(mockImportResult)

    render(<ImportWizard onComplete={onComplete} />)

    // Upload file
    const file = new File(['{"clients": []}'], 'test.json', { type: 'application/json' })
    const input = screen.getByLabelText(/choose file/i) as HTMLInputElement
    await user.upload(input, file)

    // Wait for preview
    await waitFor(() => {
      expect(screen.getByText('Import Mode')).toBeInTheDocument()
    })

    // Click Next to confirm
    const nextButton = screen.getByRole('button', { name: /next/i })
    await user.click(nextButton)

    // Should show confirmation step
    await waitFor(() => {
      expect(screen.getByText('Ready to Import')).toBeInTheDocument()
    })

    // Start import
    const startButton = screen.getByRole('button', { name: /start import/i })
    await user.click(startButton)

    // Should execute import
    await waitFor(() => {
      expect(importApi.executeImport).toHaveBeenCalledWith(
        file,
        'merge',
        expect.objectContaining({
          createBackup: true,
        })
      )
    })

    // Should show completion
    await waitFor(() => {
      expect(screen.getByText('Import Complete!')).toBeInTheDocument()
    })

    // Should call onComplete
    expect(onComplete).toHaveBeenCalledWith(mockImportResult)
  })

  it('prevents replace mode without confirmation', async () => {
    const user = userEvent.setup()

    vi.mocked(importApi.validateImport).mockResolvedValue(mockValidationResult)
    vi.mocked(importApi.dryRunImport).mockResolvedValue(mockDryRunResult)

    render(<ImportWizard />)

    const file = new File(['{"clients": []}'], 'test.json', { type: 'application/json' })
    const input = screen.getByLabelText(/choose file/i) as HTMLInputElement
    await user.upload(input, file)

    // Wait for preview
    await waitFor(() => {
      expect(screen.getByText('Import Mode')).toBeInTheDocument()
    })

    // Select Replace mode
    const replaceButton = screen.getByRole('button', { name: /replace/i })
    await user.click(replaceButton)

    // Go to confirmation
    const nextButton = screen.getByRole('button', { name: /next/i })
    await user.click(nextButton)

    await waitFor(() => {
      expect(screen.getByText('Ready to Import')).toBeInTheDocument()
    })

    // Start Import button should be disabled without confirmation
    const startButton = screen.getByRole('button', { name: /start import/i })
    expect(startButton).toBeDisabled()

    // Check the danger confirmation
    const dangerCheckbox = screen.getByRole('checkbox', {
      name: /i understand and want to proceed/i,
    })
    await user.click(dangerCheckbox)

    // Now button should be enabled
    expect(startButton).not.toBeDisabled()
  })

  it('handles import errors gracefully', async () => {
    const user = userEvent.setup()

    vi.mocked(importApi.validateImport).mockResolvedValue(mockValidationResult)
    vi.mocked(importApi.dryRunImport).mockResolvedValue(mockDryRunResult)
    vi.mocked(importApi.executeImport).mockRejectedValue(new Error('Import failed: Database error'))

    render(<ImportWizard />)

    const file = new File(['{"clients": []}'], 'test.json', { type: 'application/json' })
    const input = screen.getByLabelText(/choose file/i) as HTMLInputElement
    await user.upload(input, file)

    await waitFor(() => {
      expect(screen.getByText('Ready to Import')).toBeInTheDocument()
    })

    const startButton = screen.getByRole('button', { name: /start import/i })
    await user.click(startButton)

    // Should show error
    await waitFor(() => {
      expect(screen.getByText(/import failed/i)).toBeInTheDocument()
      expect(screen.getByText(/database error/i)).toBeInTheDocument()
    })
  })

  it('allows cancellation at any step', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()

    vi.mocked(importApi.validateImport).mockResolvedValue(mockValidationResult)
    vi.mocked(importApi.dryRunImport).mockResolvedValue(mockDryRunResult)

    render(<ImportWizard onCancel={onCancel} />)

    const file = new File(['{"clients": []}'], 'test.json', { type: 'application/json' })
    const input = screen.getByLabelText(/choose file/i) as HTMLInputElement
    await user.upload(input, file)

    await waitFor(() => {
      expect(screen.getByText('Import Mode')).toBeInTheDocument()
    })

    // Click Cancel
    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    await user.click(cancelButton)

    // Should confirm
    // Note: window.confirm is mocked in test setup
    await waitFor(() => {
      expect(onCancel).toHaveBeenCalled()
    })
  })
})
