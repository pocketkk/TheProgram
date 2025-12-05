/**
 * Voice API Client Tests
 *
 * Tests for voice settings API interactions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import {
  getVoiceOptions,
  getVoiceSettings,
  updateVoiceSettings,
  getVoiceStatus,
  type VoiceSettings,
  type VoiceOptions,
} from '../voice'

const API_BASE = 'http://localhost:8000'

// Mock voice data
const mockVoiceOptions: VoiceOptions = {
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
    custom_personality: null,
  },
  response_lengths: ['brief', 'medium', 'detailed'],
}

const mockVoiceSettings: VoiceSettings = {
  voice_name: 'Kore',
  personality: 'mystical guide',
  speaking_style: 'warm and contemplative',
  response_length: 'medium',
  custom_personality: null,
}

// Setup MSW server
const server = setupServer(
  http.get(`${API_BASE}/voice/options`, () => {
    return HttpResponse.json(mockVoiceOptions)
  }),

  http.get(`${API_BASE}/voice/settings`, () => {
    return HttpResponse.json(mockVoiceSettings)
  }),

  http.put(`${API_BASE}/voice/settings`, async ({ request }) => {
    const body = await request.json() as Partial<VoiceSettings>
    return HttpResponse.json({
      ...mockVoiceSettings,
      ...body,
    })
  }),

  http.get(`${API_BASE}/voice/status`, () => {
    return HttpResponse.json({
      available: true,
      message: 'Voice chat ready',
    })
  })
)

beforeEach(() => {
  server.listen({ onUnhandledRequest: 'bypass' })
})

afterEach(() => {
  server.resetHandlers()
  server.close()
})

describe('Voice API Client', () => {
  describe('getVoiceOptions', () => {
    it('should fetch available voice options', async () => {
      const options = await getVoiceOptions()

      expect(options.voices).toHaveLength(5)
      expect(options.voices.map(v => v.name)).toContain('Kore')
      expect(options.default_settings.voice_name).toBe('Kore')
      expect(options.response_lengths).toEqual(['brief', 'medium', 'detailed'])
    })

    it('should return all voice descriptions', async () => {
      const options = await getVoiceOptions()

      options.voices.forEach(voice => {
        expect(voice.description).toBeDefined()
        expect(voice.description.length).toBeGreaterThan(0)
      })
    })
  })

  describe('getVoiceSettings', () => {
    it('should fetch current voice settings', async () => {
      const settings = await getVoiceSettings()

      expect(settings.voice_name).toBe('Kore')
      expect(settings.personality).toBe('mystical guide')
      expect(settings.speaking_style).toBe('warm and contemplative')
      expect(settings.response_length).toBe('medium')
      expect(settings.custom_personality).toBeNull()
    })
  })

  describe('updateVoiceSettings', () => {
    it('should update voice name', async () => {
      const updated = await updateVoiceSettings({ voice_name: 'Charon' })

      expect(updated.voice_name).toBe('Charon')
    })

    it('should update personality', async () => {
      const updated = await updateVoiceSettings({
        personality: 'wise oracle',
      })

      expect(updated.personality).toBe('wise oracle')
    })

    it('should update speaking style', async () => {
      const updated = await updateVoiceSettings({
        speaking_style: 'deep and mysterious',
      })

      expect(updated.speaking_style).toBe('deep and mysterious')
    })

    it('should update response length', async () => {
      const updated = await updateVoiceSettings({
        response_length: 'detailed',
      })

      expect(updated.response_length).toBe('detailed')
    })

    it('should update custom personality', async () => {
      const custom = 'You are a cosmic oracle...'
      const updated = await updateVoiceSettings({
        custom_personality: custom,
      })

      expect(updated.custom_personality).toBe(custom)
    })

    it('should update multiple settings at once', async () => {
      const updated = await updateVoiceSettings({
        voice_name: 'Puck',
        response_length: 'brief',
      })

      expect(updated.voice_name).toBe('Puck')
      expect(updated.response_length).toBe('brief')
    })
  })

  describe('getVoiceStatus', () => {
    it('should return available status when API key is configured', async () => {
      const status = await getVoiceStatus()

      expect(status.available).toBe(true)
      expect(status.message).toContain('ready')
    })

    it('should return unavailable status when no API key', async () => {
      server.use(
        http.get(`${API_BASE}/voice/status`, () => {
          return HttpResponse.json({
            available: false,
            message: 'Google API key required for voice chat',
          })
        })
      )

      const status = await getVoiceStatus()

      expect(status.available).toBe(false)
      expect(status.message).toContain('API key required')
    })
  })
})

describe('Voice API Error Handling', () => {
  it('should handle network errors gracefully', async () => {
    server.use(
      http.get(`${API_BASE}/voice/settings`, () => {
        return HttpResponse.error()
      })
    )

    await expect(getVoiceSettings()).rejects.toThrow()
  })

  it('should handle server errors', async () => {
    server.use(
      http.get(`${API_BASE}/voice/settings`, () => {
        return HttpResponse.json(
          { error: 'Internal server error' },
          { status: 500 }
        )
      })
    )

    await expect(getVoiceSettings()).rejects.toThrow()
  })
})
