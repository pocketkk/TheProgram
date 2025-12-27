/**
 * useBirthDataEditor Hook
 * Manages state and validation for birth data editing
 */

import { useState, useCallback, useMemo } from 'react'
import type { BirthData } from '@/lib/astrology/types'

export interface BirthDataEditorState {
  date: Date
  latitude: number
  longitude: number
  locationName: string
}

export interface ValidationErrors {
  date?: string
  location?: string
  coordinates?: string
}

export function useBirthDataEditor(initialData: BirthData, initialLocationName: string = '') {
  const [editedData, setEditedData] = useState<BirthDataEditorState>({
    date: initialData.date,
    latitude: initialData.latitude,
    longitude: initialData.longitude,
    locationName: initialLocationName,
  })

  const [errors, setErrors] = useState<ValidationErrors>({})
  const [isDirty, setIsDirty] = useState(false)

  // Validation logic
  const validate = useCallback((): boolean => {
    const newErrors: ValidationErrors = {}

    // Validate date
    const now = new Date()
    const minDate = new Date('1800-01-01')

    if (!editedData.date || isNaN(editedData.date.getTime())) {
      newErrors.date = 'Invalid date'
    } else if (editedData.date > now) {
      newErrors.date = 'Birth date cannot be in the future'
    } else if (editedData.date < minDate) {
      newErrors.date = 'Birth date must be after 1800'
    }

    // Validate coordinates
    if (editedData.latitude < -90 || editedData.latitude > 90) {
      newErrors.coordinates = 'Latitude must be between -90 and 90'
    }
    if (editedData.longitude < -180 || editedData.longitude > 180) {
      newErrors.coordinates = newErrors.coordinates
        ? newErrors.coordinates + '; Longitude must be between -180 and 180'
        : 'Longitude must be between -180 and 180'
    }

    // Validate location name
    if (!editedData.locationName || editedData.locationName.trim().length === 0) {
      newErrors.location = 'Location is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [editedData])

  // Check if data is valid
  const isValid = useMemo(() => {
    return validate()
  }, [validate])

  // Update date
  const updateDate = useCallback((date: Date) => {
    setEditedData(prev => ({ ...prev, date }))
    setIsDirty(true)
  }, [])

  // Update location
  const updateLocation = useCallback(
    (location: { name: string; latitude: number; longitude: number }) => {
      setEditedData(prev => ({
        ...prev,
        locationName: location.name,
        latitude: location.latitude,
        longitude: location.longitude,
      }))
      setIsDirty(true)
    },
    []
  )

  // Reset to initial data
  const reset = useCallback(() => {
    setEditedData({
      date: initialData.date,
      latitude: initialData.latitude,
      longitude: initialData.longitude,
      locationName: initialLocationName,
    })
    setErrors({})
    setIsDirty(false)
  }, [initialData, initialLocationName])

  // Get birth data in the format expected by the calculator
  const getBirthData = useCallback((): BirthData => {
    return {
      date: editedData.date,
      latitude: editedData.latitude,
      longitude: editedData.longitude,
    }
  }, [editedData])

  return {
    editedData,
    errors,
    isValid,
    isDirty,
    updateDate,
    updateLocation,
    reset,
    getBirthData,
  }
}
