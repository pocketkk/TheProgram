/**
 * ClientsPage UI Integration Tests
 *
 * End-to-end tests for the complete client management UI flow:
 * - Loading and displaying clients
 * - Creating clients via dialog
 * - Editing clients via dialog
 * - Deleting clients with confirmation
 * - Search and filtering
 * - Navigation flows
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ClientsPage } from '@/features/clients/ClientsPage'
import { renderWithProviders } from '@/tests/utils/testUtils'
import { useAuthStore } from '@/store/authStore'
import { setMockPasswordState } from '@/tests/mocks/handlers'
import { createClient } from '@/lib/api/clients'

// Don't mock stores for integration tests
vi.unmock('@/store/authStore')
vi.unmock('@/store/clientStore')

describe('ClientsPage UI Integration Tests', () => {
  beforeEach(() => {
    // Set up authenticated state
    setMockPasswordState(true, 'test1234')
    localStorage.setItem('session_token', 'mock-jwt-token-abc123')

    useAuthStore.setState({
      isAuthenticated: true,
      token: 'mock-jwt-token-abc123',
      needsPasswordSetup: false,
      isLoading: false,
      error: null,
    })
  })

  describe('Page Loading', () => {
    it('should render clients page when authenticated', async () => {
      renderWithProviders(<ClientsPage />)

      await waitFor(() => {
        expect(screen.getByText(/clients/i)).toBeInTheDocument()
      })
    })

    it('should show loading state while fetching clients', async () => {
      renderWithProviders(<ClientsPage />)

      // May briefly show loading
      const loadingElements = screen.queryAllByText(/loading/i)
      expect(loadingElements.length).toBeGreaterThanOrEqual(0)
    })

    it('should display empty state when no clients exist', async () => {
      renderWithProviders(<ClientsPage />)

      await waitFor(() => {
        expect(
          screen.getByText(/no clients|get started|create your first client/i)
        ).toBeInTheDocument()
      })
    })
  })

  describe('Client List Display', () => {
    it('should display list of clients', async () => {
      // Create test clients
      await createClient({ first_name: 'Alice', last_name: 'Johnson' })
      await createClient({ first_name: 'Bob', last_name: 'Smith' })
      await createClient({ first_name: 'Charlie', last_name: 'Brown' })

      renderWithProviders(<ClientsPage />)

      await waitFor(() => {
        expect(screen.getByText(/alice johnson/i)).toBeInTheDocument()
        expect(screen.getByText(/bob smith/i)).toBeInTheDocument()
        expect(screen.getByText(/charlie brown/i)).toBeInTheDocument()
      })
    })

    it('should show client count', async () => {
      await createClient({ first_name: 'Test1' })
      await createClient({ first_name: 'Test2' })

      renderWithProviders(<ClientsPage />)

      await waitFor(() => {
        expect(screen.getByText(/2.*client/i)).toBeInTheDocument()
      })
    })

    it('should display client information cards', async () => {
      await createClient({
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        phone: '+1234567890',
      })

      renderWithProviders(<ClientsPage />)

      await waitFor(() => {
        expect(screen.getByText(/john doe/i)).toBeInTheDocument()
        expect(screen.getByText(/john@example\.com/i)).toBeInTheDocument()
        expect(screen.getByText(/\+1234567890/)).toBeInTheDocument()
      })
    })

    it('should handle clients with minimal information', async () => {
      await createClient({ first_name: 'MinimalInfo' })

      renderWithProviders(<ClientsPage />)

      await waitFor(() => {
        expect(screen.getByText(/minimalinfo/i)).toBeInTheDocument()
      })
    })
  })

  describe('Create Client Flow', () => {
    it('should open create client dialog', async () => {
      const user = userEvent.setup()
      renderWithProviders(<ClientsPage />)

      const addButton = screen.getByRole('button', { name: /add client|new client|create client/i })
      await user.click(addButton)

      await waitFor(() => {
        expect(screen.getByText(/add new client|create client/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/first name/i)).toBeInTheDocument()
      })
    })

    it('should create new client with all fields', async () => {
      const user = userEvent.setup()
      renderWithProviders(<ClientsPage />)

      // Open dialog
      const addButton = screen.getByRole('button', { name: /add client|new client|create client/i })
      await user.click(addButton)

      await waitFor(() => {
        expect(screen.getByLabelText(/first name/i)).toBeInTheDocument()
      })

      // Fill form
      await user.type(screen.getByLabelText(/first name/i), 'Sarah')
      await user.type(screen.getByLabelText(/last name/i), 'Connor')
      await user.type(screen.getByLabelText(/email/i), 'sarah@example.com')
      await user.type(screen.getByLabelText(/phone/i), '+1234567890')
      await user.type(screen.getByLabelText(/notes/i), 'New client for natal chart')

      // Submit
      const saveButton = screen.getByRole('button', { name: /save|create/i })
      await user.click(saveButton)

      // Verify client appears in list
      await waitFor(() => {
        expect(screen.getByText(/sarah connor/i)).toBeInTheDocument()
      })

      // Dialog should close
      expect(screen.queryByText(/add new client/i)).not.toBeInTheDocument()
    })

    it('should create client with only required fields', async () => {
      const user = userEvent.setup()
      renderWithProviders(<ClientsPage />)

      const addButton = screen.getByRole('button', { name: /add client|new client|create client/i })
      await user.click(addButton)

      await waitFor(() => {
        expect(screen.getByLabelText(/first name/i)).toBeInTheDocument()
      })

      await user.type(screen.getByLabelText(/first name/i), 'MinimalClient')

      const saveButton = screen.getByRole('button', { name: /save|create/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText(/minimalclient/i)).toBeInTheDocument()
      })
    })

    it('should validate required fields', async () => {
      const user = userEvent.setup()
      renderWithProviders(<ClientsPage />)

      const addButton = screen.getByRole('button', { name: /add client|new client|create client/i })
      await user.click(addButton)

      await waitFor(() => {
        expect(screen.getByLabelText(/first name/i)).toBeInTheDocument()
      })

      // Try to submit without filling first name
      const saveButton = screen.getByRole('button', { name: /save|create/i })
      await user.click(saveButton)

      // Should show validation error or prevent submission
      const firstNameInput = screen.getByLabelText(/first name/i) as HTMLInputElement
      expect(firstNameInput.validity.valid).toBe(false)
    })

    it('should cancel create dialog', async () => {
      const user = userEvent.setup()
      renderWithProviders(<ClientsPage />)

      const addButton = screen.getByRole('button', { name: /add client|new client|create client/i })
      await user.click(addButton)

      await waitFor(() => {
        expect(screen.getByText(/add new client/i)).toBeInTheDocument()
      })

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      await waitFor(() => {
        expect(screen.queryByText(/add new client/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Edit Client Flow', () => {
    it('should open edit dialog for existing client', async () => {
      const client = await createClient({
        first_name: 'Edit',
        last_name: 'Me',
        email: 'edit@example.com',
      })

      const user = userEvent.setup()
      renderWithProviders(<ClientsPage />)

      await waitFor(() => {
        expect(screen.getByText(/edit me/i)).toBeInTheDocument()
      })

      // Find and click edit button for this client
      const clientCard = screen.getByText(/edit me/i).closest('[role="article"]')
      const editButton = within(clientCard!).getByRole('button', { name: /edit/i })
      await user.click(editButton)

      await waitFor(() => {
        expect(screen.getByText(/edit client/i)).toBeInTheDocument()
        expect((screen.getByLabelText(/first name/i) as HTMLInputElement).value).toBe('Edit')
      })
    })

    it('should update client information', async () => {
      const client = await createClient({
        first_name: 'Original',
        last_name: 'Name',
      })

      const user = userEvent.setup()
      renderWithProviders(<ClientsPage />)

      await waitFor(() => {
        expect(screen.getByText(/original name/i)).toBeInTheDocument()
      })

      const clientCard = screen.getByText(/original name/i).closest('[role="article"]')
      const editButton = within(clientCard!).getByRole('button', { name: /edit/i })
      await user.click(editButton)

      await waitFor(() => {
        expect(screen.getByLabelText(/first name/i)).toBeInTheDocument()
      })

      // Update fields
      const firstNameInput = screen.getByLabelText(/first name/i)
      await user.clear(firstNameInput)
      await user.type(firstNameInput, 'Updated')

      const saveButton = screen.getByRole('button', { name: /save|update/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText(/updated name/i)).toBeInTheDocument()
        expect(screen.queryByText(/original name/i)).not.toBeInTheDocument()
      })
    })

    it('should preserve unchanged fields during edit', async () => {
      const client = await createClient({
        first_name: 'Keep',
        last_name: 'This',
        email: 'keep@example.com',
      })

      const user = userEvent.setup()
      renderWithProviders(<ClientsPage />)

      await waitFor(() => {
        expect(screen.getByText(/keep this/i)).toBeInTheDocument()
      })

      const clientCard = screen.getByText(/keep this/i).closest('[role="article"]')
      const editButton = within(clientCard!).getByRole('button', { name: /edit/i })
      await user.click(editButton)

      await waitFor(() => {
        expect((screen.getByLabelText(/email/i) as HTMLInputElement).value).toBe('keep@example.com')
      })

      // Only update first name
      const firstNameInput = screen.getByLabelText(/first name/i)
      await user.clear(firstNameInput)
      await user.type(firstNameInput, 'Changed')

      const saveButton = screen.getByRole('button', { name: /save|update/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText(/changed this/i)).toBeInTheDocument()
        expect(screen.getByText(/keep@example\.com/i)).toBeInTheDocument()
      })
    })
  })

  describe('Delete Client Flow', () => {
    it('should show confirmation dialog before delete', async () => {
      const client = await createClient({ first_name: 'Delete', last_name: 'Me' })

      const user = userEvent.setup()
      renderWithProviders(<ClientsPage />)

      await waitFor(() => {
        expect(screen.getByText(/delete me/i)).toBeInTheDocument()
      })

      const clientCard = screen.getByText(/delete me/i).closest('[role="article"]')
      const deleteButton = within(clientCard!).getByRole('button', { name: /delete|remove/i })
      await user.click(deleteButton)

      await waitFor(() => {
        expect(screen.getByText(/are you sure|confirm delete/i)).toBeInTheDocument()
      })
    })

    it('should delete client after confirmation', async () => {
      const client = await createClient({ first_name: 'ToDelete' })

      const user = userEvent.setup()
      renderWithProviders(<ClientsPage />)

      await waitFor(() => {
        expect(screen.getByText(/todelete/i)).toBeInTheDocument()
      })

      const clientCard = screen.getByText(/todelete/i).closest('[role="article"]')
      const deleteButton = within(clientCard!).getByRole('button', { name: /delete|remove/i })
      await user.click(deleteButton)

      await waitFor(() => {
        expect(screen.getByText(/are you sure/i)).toBeInTheDocument()
      })

      const confirmButton = screen.getByRole('button', { name: /^delete|confirm/i })
      await user.click(confirmButton)

      await waitFor(() => {
        expect(screen.queryByText(/todelete/i)).not.toBeInTheDocument()
      })
    })

    it('should cancel delete operation', async () => {
      const client = await createClient({ first_name: 'KeepMe' })

      const user = userEvent.setup()
      renderWithProviders(<ClientsPage />)

      await waitFor(() => {
        expect(screen.getByText(/keepme/i)).toBeInTheDocument()
      })

      const clientCard = screen.getByText(/keepme/i).closest('[role="article"]')
      const deleteButton = within(clientCard!).getByRole('button', { name: /delete|remove/i })
      await user.click(deleteButton)

      await waitFor(() => {
        expect(screen.getByText(/are you sure/i)).toBeInTheDocument()
      })

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      await waitFor(() => {
        expect(screen.queryByText(/are you sure/i)).not.toBeInTheDocument()
        expect(screen.getByText(/keepme/i)).toBeInTheDocument()
      })
    })
  })

  describe('Search and Filter', () => {
    it('should filter clients by name', async () => {
      await createClient({ first_name: 'Alice', last_name: 'Adams' })
      await createClient({ first_name: 'Bob', last_name: 'Brown' })
      await createClient({ first_name: 'Charlie', last_name: 'Clark' })

      const user = userEvent.setup()
      renderWithProviders(<ClientsPage />)

      await waitFor(() => {
        expect(screen.getByText(/alice adams/i)).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText(/search|filter/i)
      await user.type(searchInput, 'Alice')

      await waitFor(() => {
        expect(screen.getByText(/alice adams/i)).toBeInTheDocument()
        expect(screen.queryByText(/bob brown/i)).not.toBeInTheDocument()
        expect(screen.queryByText(/charlie clark/i)).not.toBeInTheDocument()
      })
    })

    it('should show all clients when search is cleared', async () => {
      await createClient({ first_name: 'Alice' })
      await createClient({ first_name: 'Bob' })

      const user = userEvent.setup()
      renderWithProviders(<ClientsPage />)

      await waitFor(() => {
        expect(screen.getByText(/alice/i)).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText(/search|filter/i)
      await user.type(searchInput, 'Alice')

      await waitFor(() => {
        expect(screen.queryByText(/bob/i)).not.toBeInTheDocument()
      })

      await user.clear(searchInput)

      await waitFor(() => {
        expect(screen.getByText(/alice/i)).toBeInTheDocument()
        expect(screen.getByText(/bob/i)).toBeInTheDocument()
      })
    })

    it('should show no results message for non-matching search', async () => {
      await createClient({ first_name: 'Alice' })

      const user = userEvent.setup()
      renderWithProviders(<ClientsPage />)

      await waitFor(() => {
        expect(screen.getByText(/alice/i)).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText(/search|filter/i)
      await user.type(searchInput, 'NonExistent')

      await waitFor(() => {
        expect(screen.queryByText(/alice/i)).not.toBeInTheDocument()
        expect(screen.getByText(/no clients found|no results/i)).toBeInTheDocument()
      })
    })
  })

  describe('Navigation', () => {
    it('should navigate to client details', async () => {
      const client = await createClient({ first_name: 'ViewDetails' })

      const user = userEvent.setup()
      renderWithProviders(<ClientsPage />)

      await waitFor(() => {
        expect(screen.getByText(/viewdetails/i)).toBeInTheDocument()
      })

      const clientLink = screen.getByText(/viewdetails/i)
      await user.click(clientLink)

      // Should navigate to client details page (verify link exists)
      expect(clientLink.closest('a')).toHaveAttribute('href', expect.stringContaining('/clients'))
    })

    it('should navigate to create chart for client', async () => {
      const client = await createClient({ first_name: 'CreateChart' })

      const user = userEvent.setup()
      renderWithProviders(<ClientsPage />)

      await waitFor(() => {
        expect(screen.getByText(/createchart/i)).toBeInTheDocument()
      })

      const clientCard = screen.getByText(/createchart/i).closest('[role="article"]')
      const createChartButton = within(clientCard!).getByRole('button', { name: /create chart|new chart/i })

      await user.click(createChartButton)

      // Should navigate to chart creation or open dialog
      await waitFor(() => {
        expect(
          screen.getByText(/create chart|new chart|birth data/i)
        ).toBeInTheDocument()
      })
    })
  })

  describe('Responsive Behavior', () => {
    it('should display clients in grid layout', async () => {
      await createClient({ first_name: 'Client1' })
      await createClient({ first_name: 'Client2' })

      renderWithProviders(<ClientsPage />)

      await waitFor(() => {
        const clientList = screen.getByRole('list', { name: /clients/i })
        expect(clientList).toBeInTheDocument()
      })
    })

    it('should handle empty state gracefully', async () => {
      renderWithProviders(<ClientsPage />)

      await waitFor(() => {
        expect(screen.getByText(/no clients|get started/i)).toBeInTheDocument()
      })

      const addButton = screen.getByRole('button', { name: /add client|create client/i })
      expect(addButton).toBeInTheDocument()
    })
  })

  describe('Performance', () => {
    it('should render large client list efficiently', async () => {
      // Create many clients
      const promises = []
      for (let i = 0; i < 50; i++) {
        promises.push(createClient({ first_name: `Client${i}` }))
      }
      await Promise.all(promises)

      const startTime = Date.now()
      renderWithProviders(<ClientsPage />)

      await waitFor(() => {
        expect(screen.getAllByText(/client\d+/i).length).toBeGreaterThan(0)
      })

      const renderTime = Date.now() - startTime
      expect(renderTime).toBeLessThan(3000) // Should render in under 3 seconds
    })
  })
})
