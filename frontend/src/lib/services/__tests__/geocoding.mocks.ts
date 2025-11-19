/**
 * Mock Data for Geocoding Tests
 * Provides realistic test data for location searches
 */

import { GeocodingResult } from '../geocoding'

export const mockLocations = {
  newYork: {
    displayName: 'New York, New York, United States',
    latitude: 40.7127281,
    longitude: -74.0060152,
    city: 'New York',
    state: 'New York',
    country: 'United States',
    countryCode: 'US',
  } as GeocodingResult,

  london: {
    displayName: 'London, Greater London, England, United Kingdom',
    latitude: 51.5074,
    longitude: -0.1278,
    city: 'London',
    country: 'United Kingdom',
    countryCode: 'GB',
  } as GeocodingResult,

  tokyo: {
    displayName: 'Tokyo, Japan',
    latitude: 35.6762,
    longitude: 139.6503,
    city: 'Tokyo',
    country: 'Japan',
    countryCode: 'JP',
  } as GeocodingResult,

  sydney: {
    displayName: 'Sydney, New South Wales, Australia',
    latitude: -33.8688,
    longitude: 151.2093,
    city: 'Sydney',
    state: 'New South Wales',
    country: 'Australia',
    countryCode: 'AU',
  } as GeocodingResult,

  paris: {
    displayName: 'Paris, Île-de-France, France',
    latitude: 48.8566,
    longitude: 2.3522,
    city: 'Paris',
    country: 'France',
    countryCode: 'FR',
  } as GeocodingResult,

  berlin: {
    displayName: 'Berlin, Germany',
    latitude: 52.52,
    longitude: 13.405,
    city: 'Berlin',
    country: 'Germany',
    countryCode: 'DE',
  } as GeocodingResult,

  saoPaulo: {
    displayName: 'São Paulo, Brazil',
    latitude: -23.5505,
    longitude: -46.6333,
    city: 'São Paulo',
    country: 'Brazil',
    countryCode: 'BR',
  } as GeocodingResult,

  mumbai: {
    displayName: 'Mumbai, Maharashtra, India',
    latitude: 19.076,
    longitude: 72.8777,
    city: 'Mumbai',
    state: 'Maharashtra',
    country: 'India',
    countryCode: 'IN',
  } as GeocodingResult,
}

export const mockNominatimResponses = {
  newYork: [
    {
      place_id: 1,
      lat: '40.7127281',
      lon: '-74.0060152',
      display_name: 'New York, New York, United States',
      address: {
        city: 'New York',
        state: 'New York',
        country: 'United States',
        country_code: 'us',
      },
      boundingbox: ['40.4773991', '40.9175771', '-74.2590879', '-73.7002721'],
    },
  ],

  london: [
    {
      place_id: 2,
      lat: '51.5074',
      lon: '-0.1278',
      display_name: 'London, Greater London, England, United Kingdom',
      address: {
        city: 'London',
        country: 'United Kingdom',
        country_code: 'gb',
      },
      boundingbox: ['51.2867602', '51.6918741', '-0.5103751', '0.3340155'],
    },
  ],

  ambiguous: [
    {
      place_id: 3,
      lat: '51.5074',
      lon: '-0.1278',
      display_name: 'London, Greater London, England, United Kingdom',
      address: {
        city: 'London',
        country: 'United Kingdom',
        country_code: 'gb',
      },
      boundingbox: ['51.2867602', '51.6918741', '-0.5103751', '0.3340155'],
    },
    {
      place_id: 4,
      lat: '42.9834',
      lon: '-81.2497',
      display_name: 'London, Ontario, Canada',
      address: {
        city: 'London',
        state: 'Ontario',
        country: 'Canada',
        country_code: 'ca',
      },
      boundingbox: ['42.8234', '43.0734', '-81.4297', '-81.0697'],
    },
  ],
}

export const mockTimezoneResponses = {
  newYork: {
    timeZone: 'America/New_York',
    currentLocalTime: '2025-10-25T08:00:00',
    currentUtcOffset: {
      seconds: -14400,
    },
  },

  london: {
    timeZone: 'Europe/London',
    currentLocalTime: '2025-10-25T13:00:00',
    currentUtcOffset: {
      seconds: 3600,
    },
  },

  tokyo: {
    timeZone: 'Asia/Tokyo',
    currentLocalTime: '2025-10-25T21:00:00',
    currentUtcOffset: {
      seconds: 32400,
    },
  },

  sydney: {
    timeZone: 'Australia/Sydney',
    currentLocalTime: '2025-10-25T23:00:00',
    currentUtcOffset: {
      seconds: 39600,
    },
  },
}

/**
 * Helper to create a mock fetch response
 */
export function createMockResponse(data: any, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
    headers: new Headers({
      'content-type': 'application/json',
    }),
  } as Response
}

/**
 * Helper to create a mock fetch error
 */
export function createMockError(message: string) {
  return Promise.reject(new Error(message))
}
