/**
 * BirthChartForm Geocoding Integration Tests
 * Tests the location search, auto-population, and manual override features
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BirthChartForm } from '../BirthChartForm'

// Mock the geocoding service
vi.mock('../../../../lib/services/geocoding', () => ({
  searchLocation: vi.fn(),
  getTimezone: vi.fn(),
  debounce: (fn: Function) => fn, // Use immediate execution for tests
  validateCoordinates: (lat: number, lon: number) => {
    return !isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180
  },
  formatCoordinates: (lat: number, lon: number) => `${lat}°, ${lon}°`,
}))

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-123',
  },
})

describe('BirthChartForm - Geocoding Integration', () => {
  const mockOnClose = vi.fn()
  const mockOnChartCreated = vi.fn()

  // Import the mocked functions
  let searchLocation: any
  let getTimezone: any

  beforeEach(async () => {
    localStorageMock.clear()
    mockOnClose.mockClear()
    mockOnChartCreated.mockClear()

    // Get mocked functions
    const geocoding = await import('../../../../lib/services/geocoding')
    searchLocation = geocoding.searchLocation
    getTimezone = geocoding.getTimezone

    // Reset mocks
    searchLocation.mockClear()
    getTimezone.mockClear()
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('Location Search', () => {
    it('should display location search input', () => {
      render(<BirthChartForm onClose={mockOnClose} onChartCreated={mockOnChartCreated} />)

      const searchInput = screen.getByPlaceholderText(/New York, USA or London, UK/i)
      expect(searchInput).toBeInTheDocument()
    })

    it('should show loading spinner while searching', async () => {
      searchLocation.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve([]), 1000)
          })
      )

      render(<BirthChartForm onClose={mockOnClose} onChartCreated={mockOnChartCreated} />)

      const searchInput = screen.getByPlaceholderText(/New York, USA or London, UK/i)

      await userEvent.type(searchInput, 'New York')

      // Should show loading spinner
      await waitFor(() => {
        const spinner = screen.getByRole('img', { hidden: true })
        expect(spinner).toBeInTheDocument()
      })
    })

    it('should display search results in dropdown', async () => {
      const mockResults = [
        {
          displayName: 'New York, New York, United States',
          latitude: 40.7128,
          longitude: -74.006,
          city: 'New York',
          state: 'New York',
          country: 'United States',
          countryCode: 'US',
        },
        {
          displayName: 'New York, Iowa, United States',
          latitude: 40.7348,
          longitude: -92.4121,
          city: 'New York',
          state: 'Iowa',
          country: 'United States',
          countryCode: 'US',
        },
      ]

      searchLocation.mockResolvedValue(mockResults)

      render(<BirthChartForm onClose={mockOnClose} onChartCreated={mockOnChartCreated} />)

      const searchInput = screen.getByPlaceholderText(/New York, USA or London, UK/i)

      await userEvent.type(searchInput, 'New York')

      await waitFor(() => {
        expect(screen.getByText('New York, New York, United States')).toBeInTheDocument()
        expect(screen.getByText('New York, Iowa, United States')).toBeInTheDocument()
      })
    })

    it('should not search for queries less than 3 characters', async () => {
      render(<BirthChartForm onClose={mockOnClose} onChartCreated={mockOnChartCreated} />)

      const searchInput = screen.getByPlaceholderText(/New York, USA or London, UK/i)

      await userEvent.type(searchInput, 'NY')

      expect(searchLocation).not.toHaveBeenCalled()
    })

    it('should show "no results" message when search returns empty', async () => {
      searchLocation.mockResolvedValue([])

      render(<BirthChartForm onClose={mockOnClose} onChartCreated={mockOnChartCreated} />)

      const searchInput = screen.getByPlaceholderText(/New York, USA or London, UK/i)

      await userEvent.type(searchInput, 'XYZ123')

      await waitFor(() => {
        expect(screen.getByText(/No locations found/i)).toBeInTheDocument()
      })
    })
  })

  describe('Auto-population', () => {
    it('should auto-fill coordinates when location is selected', async () => {
      const mockResults = [
        {
          displayName: 'London, England, United Kingdom',
          latitude: 51.5074,
          longitude: -0.1278,
          city: 'London',
          country: 'United Kingdom',
          countryCode: 'GB',
        },
      ]

      searchLocation.mockResolvedValue(mockResults)
      getTimezone.mockResolvedValue('Europe/London')

      render(<BirthChartForm onClose={mockOnClose} onChartCreated={mockOnChartCreated} />)

      const searchInput = screen.getByPlaceholderText(/New York, USA or London, UK/i)

      await userEvent.type(searchInput, 'London')

      await waitFor(() => {
        expect(screen.getByText('London, England, United Kingdom')).toBeInTheDocument()
      })

      const londonButton = screen.getByText('London, England, United Kingdom')
      await userEvent.click(londonButton)

      // Check latitude and longitude inputs
      const latitudeInput = screen.getByLabelText(/Latitude/i) as HTMLInputElement
      const longitudeInput = screen.getByLabelText(/Longitude/i) as HTMLInputElement

      expect(latitudeInput.value).toBe('51.5074')
      expect(longitudeInput.value).toBe('-0.1278')
    })

    it('should auto-fill timezone when location is selected', async () => {
      const mockResults = [
        {
          displayName: 'Tokyo, Japan',
          latitude: 35.6762,
          longitude: 139.6503,
          city: 'Tokyo',
          country: 'Japan',
          countryCode: 'JP',
        },
      ]

      searchLocation.mockResolvedValue(mockResults)
      getTimezone.mockResolvedValue('Asia/Tokyo')

      render(<BirthChartForm onClose={mockOnClose} onChartCreated={mockOnChartCreated} />)

      const searchInput = screen.getByPlaceholderText(/New York, USA or London, UK/i)

      await userEvent.type(searchInput, 'Tokyo')

      await waitFor(() => {
        expect(screen.getByText('Tokyo, Japan')).toBeInTheDocument()
      })

      const tokyoButton = screen.getByText('Tokyo, Japan')
      await userEvent.click(tokyoButton)

      await waitFor(() => {
        expect(getTimezone).toHaveBeenCalledWith(35.6762, 139.6503)
      })

      const timezoneInput = screen.getByLabelText(/Timezone/i) as HTMLInputElement
      await waitFor(() => {
        expect(timezoneInput.value).toBe('Asia/Tokyo')
      })
    })

    it('should show green checkmark when auto-filled', async () => {
      const mockResults = [
        {
          displayName: 'Paris, France',
          latitude: 48.8566,
          longitude: 2.3522,
          city: 'Paris',
          country: 'France',
          countryCode: 'FR',
        },
      ]

      searchLocation.mockResolvedValue(mockResults)
      getTimezone.mockResolvedValue('Europe/Paris')

      render(<BirthChartForm onClose={mockOnClose} onChartCreated={mockOnChartCreated} />)

      const searchInput = screen.getByPlaceholderText(/New York, USA or London, UK/i)

      await userEvent.type(searchInput, 'Paris')

      await waitFor(() => {
        expect(screen.getByText('Paris, France')).toBeInTheDocument()
      })

      const parisButton = screen.getByText('Paris, France')
      await userEvent.click(parisButton)

      await waitFor(() => {
        expect(screen.getByText(/Auto-filled from location/i)).toBeInTheDocument()
      })
    })

    it('should make coordinate inputs read-only when auto-filled', async () => {
      const mockResults = [
        {
          displayName: 'Sydney, Australia',
          latitude: -33.8688,
          longitude: 151.2093,
          city: 'Sydney',
          country: 'Australia',
          countryCode: 'AU',
        },
      ]

      searchLocation.mockResolvedValue(mockResults)
      getTimezone.mockResolvedValue('Australia/Sydney')

      render(<BirthChartForm onClose={mockOnClose} onChartCreated={mockOnChartCreated} />)

      const searchInput = screen.getByPlaceholderText(/New York, USA or London, UK/i)

      await userEvent.type(searchInput, 'Sydney')

      await waitFor(() => {
        expect(screen.getByText('Sydney, Australia')).toBeInTheDocument()
      })

      const sydneyButton = screen.getByText('Sydney, Australia')
      await userEvent.click(sydneyButton)

      const latitudeInput = screen.getByLabelText(/Latitude/i) as HTMLInputElement
      const longitudeInput = screen.getByLabelText(/Longitude/i) as HTMLInputElement

      expect(latitudeInput).toHaveAttribute('readonly')
      expect(longitudeInput).toHaveAttribute('readonly')
    })
  })

  describe('Manual Override', () => {
    it('should allow manual coordinate editing when "Edit manually" is clicked', async () => {
      const mockResults = [
        {
          displayName: 'Berlin, Germany',
          latitude: 52.52,
          longitude: 13.405,
          city: 'Berlin',
          country: 'Germany',
          countryCode: 'DE',
        },
      ]

      searchLocation.mockResolvedValue(mockResults)
      getTimezone.mockResolvedValue('Europe/Berlin')

      render(<BirthChartForm onClose={mockOnClose} onChartCreated={mockOnChartCreated} />)

      const searchInput = screen.getByPlaceholderText(/New York, USA or London, UK/i)

      await userEvent.type(searchInput, 'Berlin')

      await waitFor(() => {
        expect(screen.getByText('Berlin, Germany')).toBeInTheDocument()
      })

      const berlinButton = screen.getByText('Berlin, Germany')
      await userEvent.click(berlinButton)

      const editButton = screen.getByText(/Edit manually/i)
      await userEvent.click(editButton)

      const latitudeInput = screen.getByLabelText(/Latitude/i) as HTMLInputElement
      const longitudeInput = screen.getByLabelText(/Longitude/i) as HTMLInputElement

      expect(latitudeInput).not.toHaveAttribute('readonly')
      expect(longitudeInput).not.toHaveAttribute('readonly')
    })

    it('should toggle back to auto-filled values', async () => {
      const mockResults = [
        {
          displayName: 'Rome, Italy',
          latitude: 41.9028,
          longitude: 12.4964,
          city: 'Rome',
          country: 'Italy',
          countryCode: 'IT',
        },
      ]

      searchLocation.mockResolvedValue(mockResults)
      getTimezone.mockResolvedValue('Europe/Rome')

      render(<BirthChartForm onClose={mockOnClose} onChartCreated={mockOnChartCreated} />)

      const searchInput = screen.getByPlaceholderText(/New York, USA or London, UK/i)

      await userEvent.type(searchInput, 'Rome')

      await waitFor(() => {
        expect(screen.getByText('Rome, Italy')).toBeInTheDocument()
      })

      const romeButton = screen.getByText('Rome, Italy')
      await userEvent.click(romeButton)

      // Enable manual editing
      const editButton = screen.getByText(/Edit manually/i)
      await userEvent.click(editButton)

      // Modify coordinates
      const latitudeInput = screen.getByLabelText(/Latitude/i) as HTMLInputElement
      await userEvent.clear(latitudeInput)
      await userEvent.type(latitudeInput, '42.0')

      // Toggle back to auto-filled
      const useAutoButton = screen.getByText(/Use auto-filled/i)
      await userEvent.click(useAutoButton)

      expect(latitudeInput).toHaveAttribute('readonly')
    })

    it('should allow form submission with manually edited coordinates', async () => {
      const mockResults = [
        {
          displayName: 'Amsterdam, Netherlands',
          latitude: 52.3676,
          longitude: 4.9041,
          city: 'Amsterdam',
          country: 'Netherlands',
          countryCode: 'NL',
        },
      ]

      searchLocation.mockResolvedValue(mockResults)
      getTimezone.mockResolvedValue('Europe/Amsterdam')

      render(<BirthChartForm onClose={mockOnClose} onChartCreated={mockOnChartCreated} />)

      // Fill in required fields
      const nameInput = screen.getByLabelText(/Chart Name/i)
      await userEvent.type(nameInput, 'Test Chart')

      const dateInput = screen.getByLabelText(/Birth Date/i)
      await userEvent.type(dateInput, '2000-01-01')

      const timeInput = screen.getByLabelText(/Birth Time/i)
      await userEvent.clear(timeInput)
      await userEvent.type(timeInput, '12:00')

      // Search and select location
      const searchInput = screen.getByPlaceholderText(/New York, USA or London, UK/i)
      await userEvent.type(searchInput, 'Amsterdam')

      await waitFor(() => {
        expect(screen.getByText('Amsterdam, Netherlands')).toBeInTheDocument()
      })

      const amsterdamButton = screen.getByText('Amsterdam, Netherlands')
      await userEvent.click(amsterdamButton)

      // Enable manual editing and modify
      const editButton = screen.getByText(/Edit manually/i)
      await userEvent.click(editButton)

      const latitudeInput = screen.getByLabelText(/Latitude/i) as HTMLInputElement
      await userEvent.clear(latitudeInput)
      await userEvent.type(latitudeInput, '52.4000')

      // Submit form
      const submitButton = screen.getByText(/Create Chart/i)
      await userEvent.click(submitButton)

      await waitFor(() => {
        expect(mockOnChartCreated).toHaveBeenCalled()
        expect(mockOnClose).toHaveBeenCalled()
      })
    })
  })

  describe('Form Validation with Geocoding', () => {
    it('should validate that coordinates are filled after location selection', async () => {
      const mockResults = [
        {
          displayName: 'Madrid, Spain',
          latitude: 40.4168,
          longitude: -3.7038,
          city: 'Madrid',
          country: 'Spain',
          countryCode: 'ES',
        },
      ]

      searchLocation.mockResolvedValue(mockResults)
      getTimezone.mockResolvedValue('Europe/Madrid')

      render(<BirthChartForm onClose={mockOnClose} onChartCreated={mockOnChartCreated} />)

      // Fill required fields
      const nameInput = screen.getByLabelText(/Chart Name/i)
      await userEvent.type(nameInput, 'Test Chart')

      const dateInput = screen.getByLabelText(/Birth Date/i)
      await userEvent.type(dateInput, '2000-01-01')

      // Select location
      const searchInput = screen.getByPlaceholderText(/New York, USA or London, UK/i)
      await userEvent.type(searchInput, 'Madrid')

      await waitFor(() => {
        expect(screen.getByText('Madrid, Spain')).toBeInTheDocument()
      })

      const madridButton = screen.getByText('Madrid, Spain')
      await userEvent.click(madridButton)

      // Verify coordinates are auto-filled
      const latitudeInput = screen.getByLabelText(/Latitude/i) as HTMLInputElement
      const longitudeInput = screen.getByLabelText(/Longitude/i) as HTMLInputElement

      expect(latitudeInput.value).toBe('40.4168')
      expect(longitudeInput.value).toBe('-3.7038')

      // Form should be submittable
      const submitButton = screen.getByText(/Create Chart/i)
      await userEvent.click(submitButton)

      await waitFor(() => {
        expect(mockOnChartCreated).toHaveBeenCalled()
      })
    })
  })

  describe('Dropdown Behavior', () => {
    it('should close dropdown when clicking outside', async () => {
      const mockResults = [
        {
          displayName: 'Barcelona, Spain',
          latitude: 41.3851,
          longitude: 2.1734,
          city: 'Barcelona',
          country: 'Spain',
          countryCode: 'ES',
        },
      ]

      searchLocation.mockResolvedValue(mockResults)

      render(<BirthChartForm onClose={mockOnClose} onChartCreated={mockOnChartCreated} />)

      const searchInput = screen.getByPlaceholderText(/New York, USA or London, UK/i)

      await userEvent.type(searchInput, 'Barcelona')

      await waitFor(() => {
        expect(screen.getByText('Barcelona, Spain')).toBeInTheDocument()
      })

      // Click outside
      const formTitle = screen.getByText(/Create Birth Chart/i)
      await userEvent.click(formTitle)

      await waitFor(() => {
        expect(screen.queryByText('Barcelona, Spain')).not.toBeInTheDocument()
      })
    })

    it('should reopen dropdown when focusing search input with results', async () => {
      const mockResults = [
        {
          displayName: 'Vienna, Austria',
          latitude: 48.2082,
          longitude: 16.3738,
          city: 'Vienna',
          country: 'Austria',
          countryCode: 'AT',
        },
      ]

      searchLocation.mockResolvedValue(mockResults)

      render(<BirthChartForm onClose={mockOnClose} onChartCreated={mockOnChartCreated} />)

      const searchInput = screen.getByPlaceholderText(/New York, USA or London, UK/i)

      await userEvent.type(searchInput, 'Vienna')

      await waitFor(() => {
        expect(screen.getByText('Vienna, Austria')).toBeInTheDocument()
      })

      // Click outside to close
      const formTitle = screen.getByText(/Create Birth Chart/i)
      await userEvent.click(formTitle)

      // Focus back on search input
      await userEvent.click(searchInput)

      await waitFor(() => {
        expect(screen.getByText('Vienna, Austria')).toBeInTheDocument()
      })
    })
  })
})
