import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'

// Create axios instance
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor - add auth token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor - handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// API error handler
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.response?.data) {
      const data = error.response.data
      // Handle FastAPI validation errors (422)
      if (Array.isArray(data.detail)) {
        return data.detail.map((err: any) =>
          `${err.loc?.join('.') || 'Field'}: ${err.msg}`
        ).join(', ')
      }
      // Handle simple detail message
      if (typeof data.detail === 'string') {
        return data.detail
      }
      // Handle object detail (convert to readable string)
      if (typeof data.detail === 'object') {
        return JSON.stringify(data.detail)
      }
    }
    if (error.response?.status === 500) {
      return 'Server error. Please try again later.'
    }
    if (error.response?.status === 404) {
      return 'Resource not found.'
    }
    if (error.message) {
      return error.message
    }
  }
  return 'An unexpected error occurred.'
}
