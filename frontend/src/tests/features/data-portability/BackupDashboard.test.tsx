/**
 * Backup Dashboard Component Tests
 *
 * Tests for backup management UI components
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BackupDashboard } from '@/features/data-portability/BackupDashboard'
import * as backupApi from '@/lib/api/backup'
import type { Backup, BackupStatus, BackupStats } from '@/types/backup'

// Mock the API
vi.mock('@/lib/api/backup')

const mockBackup: Backup = {
  backup_id: 'backup_123',
  filename: 'backup_123.db.gz.enc',
  created_at: new Date().toISOString(),
  backup_type: 'manual',
  status: 'completed',
  original_size: 1048576,
  compressed_size: 524288,
  encrypted: true,
  compressed: true,
  checksum: 'e3b0c442...',
  checksum_algorithm: 'sha256',
  schema_version: '1.0.0',
  table_counts: { clients: 10, charts: 50 },
  total_records: 60,
  description: 'Test backup',
  tags: ['test'],
  verified: true,
  verification_date: new Date().toISOString(),
}

const mockStatus: BackupStatus = {
  enabled: true,
  last_backup: new Date().toISOString(),
  next_scheduled: null,
  storage_path: '/app/data/backups',
  storage_used: 524288,
  backup_count: 1,
  verified_count: 1,
  failed_count: 0,
}

const mockStats: BackupStats = {
  total_backups: 1,
  encrypted_backups: 1,
  compressed_backups: 1,
  verified_backups: 1,
  failed_backups: 0,
  total_storage_used: 524288,
  average_backup_size: 524288,
  oldest_backup_date: new Date().toISOString(),
  newest_backup_date: new Date().toISOString(),
  backups_per_type: { manual: 1 },
  storage_trend: [],
}

describe('BackupDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(backupApi.listBackups).mockResolvedValue([mockBackup])
    vi.mocked(backupApi.getBackupStatus).mockResolvedValue(mockStatus)
    vi.mocked(backupApi.getBackupStats).mockResolvedValue(mockStats)
  })

  it('renders backup dashboard', async () => {
    render(<BackupDashboard />)

    expect(screen.getByText('Backup & Restore')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('Total Backups')).toBeInTheDocument()
    })
  })

  it('displays backup statistics', async () => {
    render(<BackupDashboard />)

    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument() // Total backups
      expect(screen.getByText('Verified Backups')).toBeInTheDocument()
    })
  })

  it('opens create backup dialog', async () => {
    render(<BackupDashboard />)

    const createButton = screen.getByRole('button', { name: /create backup/i })
    fireEvent.click(createButton)

    await waitFor(() => {
      expect(screen.getByText(/encrypt backup/i)).toBeInTheDocument()
    })
  })

  it('opens restore dialog', async () => {
    render(<BackupDashboard />)

    const restoreButton = screen.getByRole('button', { name: /restore/i })
    fireEvent.click(restoreButton)

    await waitFor(() => {
      expect(screen.getByText(/restore from backup/i)).toBeInTheDocument()
    })
  })

  it('creates a new backup', async () => {
    const mockCreateResponse = { ...mockBackup, backup_id: 'new_backup_123' }
    vi.mocked(backupApi.createBackup).mockResolvedValue(mockCreateResponse)

    render(<BackupDashboard />)

    // Open dialog
    const createButton = screen.getByRole('button', { name: /create backup/i })
    fireEvent.click(createButton)

    await waitFor(() => {
      expect(screen.getByText(/create backup/i)).toBeInTheDocument()
    })

    // Click create button in dialog
    const dialogCreateButton = screen.getAllByRole('button', { name: /create backup/i })[1]
    fireEvent.click(dialogCreateButton)

    await waitFor(() => {
      expect(backupApi.createBackup).toHaveBeenCalled()
    })
  })

  it('deletes a backup with confirmation', async () => {
    vi.mocked(backupApi.deleteBackup).mockResolvedValue({
      success: true,
      message: 'Backup deleted',
      backup_id: 'backup_123',
    })

    // Mock window.confirm
    global.confirm = vi.fn(() => true)

    render(<BackupDashboard />)

    await waitFor(() => {
      expect(screen.getByText('Backup History')).toBeInTheDocument()
    })

    // Find and click delete button
    const deleteButtons = screen.getAllByTitle('Delete')
    fireEvent.click(deleteButtons[0])

    await waitFor(() => {
      expect(backupApi.deleteBackup).toHaveBeenCalledWith('backup_123')
    })
  })

  it('handles API errors gracefully', async () => {
    vi.mocked(backupApi.listBackups).mockRejectedValue(new Error('API Error'))

    render(<BackupDashboard />)

    await waitFor(() => {
      expect(screen.getByText(/API Error/i)).toBeInTheDocument()
    })
  })
})
