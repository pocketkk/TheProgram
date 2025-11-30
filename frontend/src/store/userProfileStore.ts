/**
 * User Profile Store
 *
 * Central store for the user's profile data.
 * Used across all modules for personalization.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { listBirthData, type BirthDataResponse } from '@/lib/api/birthData'
import { listCharts, type ChartResponse } from '@/lib/api/charts'

export interface UserProfile {
  // User identity
  name: string

  // Primary birth data (the main profile)
  birthDataId: string | null
  birthDate: string | null  // YYYY-MM-DD
  birthTime: string | null  // HH:MM:SS
  birthLocation: string | null
  latitude: number | null
  longitude: number | null
  timezone: string | null

  // Primary chart
  chartId: string | null
}

interface UserProfileState {
  profile: UserProfile
  isLoaded: boolean
  isLoading: boolean
  error: string | null

  // Actions
  setProfile: (profile: Partial<UserProfile>) => void
  loadProfile: () => Promise<void>
  clearProfile: () => void
}

const DEFAULT_PROFILE: UserProfile = {
  name: '',
  birthDataId: null,
  birthDate: null,
  birthTime: null,
  birthLocation: null,
  latitude: null,
  longitude: null,
  timezone: null,
  chartId: null,
}

export const useUserProfileStore = create<UserProfileState>()(
  persist(
    (set, get) => ({
      profile: DEFAULT_PROFILE,
      isLoaded: false,
      isLoading: false,
      error: null,

      setProfile: (updates) => {
        set((state) => ({
          profile: { ...state.profile, ...updates },
          isLoaded: true,
        }))
      },

      loadProfile: async () => {
        const state = get()
        if (state.isLoading) return

        set({ isLoading: true, error: null })

        try {
          // Always load from API to ensure we have the most recent birth data
          const [birthDataList, charts] = await Promise.all([
            listBirthData(),
            listCharts({ limit: 1 })
          ])

          if (birthDataList.length > 0) {
            // Use the most recently created birth data as primary
            const primaryBirthData = birthDataList[birthDataList.length - 1]

            // Try to get name from localStorage (set during onboarding)
            const savedName = localStorage.getItem('userName') || ''

            const profile: UserProfile = {
              name: savedName,
              birthDataId: primaryBirthData.id,
              birthDate: primaryBirthData.birth_date,
              birthTime: primaryBirthData.birth_time,
              birthLocation: [
                primaryBirthData.city,
                primaryBirthData.state_province,
                primaryBirthData.country
              ].filter(Boolean).join(', '),
              latitude: parseFloat(primaryBirthData.latitude as any) || null,
              longitude: parseFloat(primaryBirthData.longitude as any) || null,
              timezone: primaryBirthData.timezone,
              chartId: charts.length > 0 ? charts[0].id : null,
            }

            set({ profile, isLoaded: true, isLoading: false })
          } else {
            // No birth data - profile not set up
            set({ isLoaded: true, isLoading: false })
          }
        } catch (error) {
          console.error('Failed to load user profile:', error)
          set({
            error: error instanceof Error ? error.message : 'Failed to load profile',
            isLoading: false
          })
        }
      },

      clearProfile: () => {
        set({ profile: DEFAULT_PROFILE, isLoaded: false })
        localStorage.removeItem('userName')
      },
    }),
    {
      name: 'user-profile-storage',
      partialize: (state) => ({ profile: state.profile }),
    }
  )
)

// Helper hook to check if user has completed onboarding
export const useHasCompletedOnboarding = () => {
  const { profile, isLoaded } = useUserProfileStore()
  return isLoaded && !!profile.birthDataId
}
