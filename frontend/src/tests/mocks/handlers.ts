/**
 * MSW Request Handlers
 *
 * Mock API endpoints for testing authentication and data flows.
 */
import { http, HttpResponse } from 'msw'

const API_BASE = 'http://localhost:8000'

// Mock data
let mockPasswordSet = false
let mockPassword = 'test1234'
let mockToken = 'mock-jwt-token-abc123'
const mockClients: any[] = []
const mockCharts: any[] = []

// Voice settings mock data
let mockVoiceSettings = {
  voice_name: 'Kore',
  personality: 'mystical guide',
  speaking_style: 'warm and contemplative',
  response_length: 'medium',
  custom_personality: null as string | null,
}

let mockGoogleApiKeySet = false

/**
 * Reset mocks to initial state
 */
export const resetMocks = () => {
  mockPasswordSet = false
  mockPassword = 'test1234'
  mockToken = 'mock-jwt-token-abc123'
  mockClients.length = 0
  mockCharts.length = 0
  // Reset voice settings
  mockVoiceSettings = {
    voice_name: 'Kore',
    personality: 'mystical guide',
    speaking_style: 'warm and contemplative',
    response_length: 'medium',
    custom_personality: null,
  }
  mockGoogleApiKeySet = false
}

/**
 * Set mock Google API key state
 */
export const setMockGoogleApiKeyState = (hasKey: boolean) => {
  mockGoogleApiKeySet = hasKey
}

/**
 * Set mock password state
 */
export const setMockPasswordState = (passwordSet: boolean, password?: string) => {
  mockPasswordSet = passwordSet
  if (password) mockPassword = password
}

/**
 * Request handlers
 */
export const handlers = [
  // GET /auth/status
  http.get(`${API_BASE}/auth/status`, () => {
    return HttpResponse.json({
      password_set: mockPasswordSet,
      require_password: mockPasswordSet,
    })
  }),

  // POST /auth/setup
  http.post(`${API_BASE}/auth/setup`, async ({ request }) => {
    const body = (await request.json()) as { password: string }

    if (mockPasswordSet) {
      return HttpResponse.json(
        { detail: 'Password is already set up' },
        { status: 400 }
      )
    }

    if (!body.password || body.password.length < 4) {
      return HttpResponse.json(
        { detail: 'Password must be at least 4 characters' },
        { status: 400 }
      )
    }

    mockPasswordSet = true
    mockPassword = body.password

    return HttpResponse.json({
      message: 'Password set successfully',
    })
  }),

  // POST /auth/login
  http.post(`${API_BASE}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { password: string }

    if (!mockPasswordSet) {
      return HttpResponse.json(
        { detail: 'No password configured. Please set up password first.' },
        { status: 400 }
      )
    }

    if (body.password !== mockPassword) {
      return HttpResponse.json(
        { detail: 'Invalid password' },
        { status: 401 }
      )
    }

    return HttpResponse.json({
      access_token: mockToken,
      token_type: 'bearer',
      expires_in: 86400,
    })
  }),

  // POST /auth/verify
  http.post(`${API_BASE}/auth/verify`, async ({ request }) => {
    const body = (await request.json()) as { token: string }

    const isValid = body.token === mockToken

    if (isValid) {
      return HttpResponse.json({
        valid: true,
        message: 'Token is valid',
      })
    } else {
      return HttpResponse.json({
        valid: false,
        message: 'Token is invalid or expired',
      })
    }
  }),

  // POST /auth/logout
  http.post(`${API_BASE}/auth/logout`, () => {
    return HttpResponse.json({
      message: 'Logged out successfully',
    })
  }),

  // POST /auth/change-password
  http.post(`${API_BASE}/auth/change-password`, async ({ request }) => {
    const body = (await request.json()) as {
      old_password: string
      new_password: string
    }

    if (body.old_password !== mockPassword) {
      return HttpResponse.json(
        { detail: 'Current password is incorrect' },
        { status: 400 }
      )
    }

    if (!body.new_password || body.new_password.length < 4) {
      return HttpResponse.json(
        { detail: 'New password must be at least 4 characters' },
        { status: 400 }
      )
    }

    mockPassword = body.new_password

    return HttpResponse.json({
      message: 'Password changed successfully',
    })
  }),

  // POST /auth/disable-password
  http.post(`${API_BASE}/auth/disable-password`, async ({ request }) => {
    const body = (await request.json()) as {
      current_password: string
      confirm: boolean
    }

    if (body.current_password !== mockPassword) {
      return HttpResponse.json(
        { detail: 'Current password is incorrect' },
        { status: 400 }
      )
    }

    if (!body.confirm) {
      return HttpResponse.json(
        { detail: 'Confirmation required' },
        { status: 400 }
      )
    }

    mockPasswordSet = false

    return HttpResponse.json({
      message: 'Password requirement disabled',
    })
  }),

  // GET /api/clients
  http.get(`${API_BASE}/api/clients`, () => {
    return HttpResponse.json(mockClients)
  }),

  // POST /api/clients
  http.post(`${API_BASE}/api/clients`, async ({ request }) => {
    const body = (await request.json()) as {
      first_name: string
      last_name?: string
      email?: string
      phone?: string
      notes?: string
    }

    const client = {
      id: `client-${Date.now()}`,
      first_name: body.first_name,
      last_name: body.last_name || null,
      email: body.email || null,
      phone: body.phone || null,
      notes: body.notes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    mockClients.push(client)

    return HttpResponse.json(client, { status: 201 })
  }),

  // GET /api/clients/:id
  http.get(`${API_BASE}/api/clients/:id`, ({ params }) => {
    const { id } = params
    const client = mockClients.find((c) => c.id === id)

    if (!client) {
      return HttpResponse.json(
        { detail: 'Client not found' },
        { status: 404 }
      )
    }

    return HttpResponse.json({
      ...client,
      birth_data_count: 0,
      chart_count: 0,
      session_notes_count: 0,
    })
  }),

  // PUT /api/clients/:id
  http.put(`${API_BASE}/api/clients/:id`, async ({ request, params }) => {
    const { id } = params
    const body = (await request.json()) as Partial<{
      first_name: string
      last_name: string
      email: string
      phone: string
      notes: string
    }>

    const clientIndex = mockClients.findIndex((c) => c.id === id)

    if (clientIndex === -1) {
      return HttpResponse.json(
        { detail: 'Client not found' },
        { status: 404 }
      )
    }

    const updatedClient = {
      ...mockClients[clientIndex],
      ...body,
      updated_at: new Date().toISOString(),
    }

    mockClients[clientIndex] = updatedClient

    return HttpResponse.json(updatedClient)
  }),

  // DELETE /api/clients/:id
  http.delete(`${API_BASE}/api/clients/:id`, ({ params }) => {
    const { id } = params
    const clientIndex = mockClients.findIndex((c) => c.id === id)

    if (clientIndex === -1) {
      return HttpResponse.json(
        { detail: 'Client not found' },
        { status: 404 }
      )
    }

    mockClients.splice(clientIndex, 1)

    return HttpResponse.json(null, { status: 204 })
  }),

  // POST /api/birth-data
  http.post(`${API_BASE}/api/birth-data`, async ({ request }) => {
    const body = (await request.json()) as any

    const birthData = {
      id: `birth-data-${Date.now()}`,
      ...body,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    return HttpResponse.json(birthData, { status: 201 })
  }),

  // POST /api/charts
  http.post(`${API_BASE}/api/charts`, async ({ request }) => {
    const body = (await request.json()) as any

    const chart = {
      id: `chart-${Date.now()}`,
      ...body,
      calculation_status: 'completed',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      planets: {
        sun: { longitude: 120.5, latitude: 0, speed: 1.0 },
        moon: { longitude: 45.2, latitude: 0, speed: 13.2 },
      },
      houses: [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330],
      ascendant: { longitude: 0, sign: 'Aries' },
    }

    mockCharts.push(chart)

    return HttpResponse.json(chart, { status: 201 })
  }),

  // POST /api/interpretations/generate
  http.post(`${API_BASE}/api/interpretations/generate`, async ({ request }) => {
    const body = (await request.json()) as { chart_id: string }

    return HttpResponse.json({
      id: `interp-${Date.now()}`,
      chart_id: body.chart_id,
      interpretation_type: 'natal',
      content: {
        overview: 'This is a mock interpretation for testing.',
        planets: {},
        aspects: {},
      },
      created_at: new Date().toISOString(),
    })
  }),

  // GET /api/voice/options
  http.get(`${API_BASE}/api/voice/options`, () => {
    return HttpResponse.json({
      voices: [
        { name: 'Puck', description: 'Upbeat and playful' },
        { name: 'Charon', description: 'Deep and authoritative' },
        { name: 'Kore', description: 'Warm and nurturing' },
        { name: 'Fenrir', description: 'Bold and energetic' },
        { name: 'Aoede', description: 'Calm and melodic' },
      ],
      default_settings: {
        voice_name: 'Kore',
        personality: 'mystical guide',
        speaking_style: 'warm and contemplative',
        response_length: 'medium',
      },
      response_lengths: ['brief', 'medium', 'detailed'],
    })
  }),

  // GET /api/voice/settings
  http.get(`${API_BASE}/api/voice/settings`, () => {
    return HttpResponse.json(mockVoiceSettings)
  }),

  // PUT /api/voice/settings
  http.put(`${API_BASE}/api/voice/settings`, async ({ request }) => {
    const body = (await request.json()) as Partial<typeof mockVoiceSettings>

    mockVoiceSettings = {
      ...mockVoiceSettings,
      ...body,
    }

    return HttpResponse.json(mockVoiceSettings)
  }),

  // GET /api/voice/status
  http.get(`${API_BASE}/api/voice/status`, () => {
    return HttpResponse.json({
      available: mockGoogleApiKeySet,
      message: mockGoogleApiKeySet
        ? 'Voice chat ready'
        : 'Google API key required for voice chat',
    })
  }),
]
