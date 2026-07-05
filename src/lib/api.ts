import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import type { ApiError } from '../types'

export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:5000'

export const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000, // Increased to 30s for Google OAuth and slow backends
})

const ACCESS_TOKEN_KEY = 'ems_access_token'
const REFRESH_TOKEN_KEY = 'ems_refresh_token'

export const tokenStorage = {
  getAccessToken: () => localStorage.getItem(ACCESS_TOKEN_KEY),
  getRefreshToken: () => localStorage.getItem(REFRESH_TOKEN_KEY),
  set: (access: string, refresh?: string) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, access)
    if (refresh) localStorage.setItem(REFRESH_TOKEN_KEY, refresh)
  },
  clear: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  },
}

// ✅ Request interceptor - Add token to every request
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = tokenStorage.getAccessToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
      console.log(`✅ Auth header added for ${config.url}`)
    } else {
      console.log(`⚠️ No token for ${config.url}`)
    }
    return config
  },
  (error) => Promise.reject(error)
)

let isRefreshing = false
let refreshPromise: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = tokenStorage.getRefreshToken()
  if (!refreshToken) return null
  try {
    const res = await axios.post(`${API_BASE_URL}/api/authentication/refresh-tokens`, { refreshToken })
    const { accessToken, refreshToken: newRefresh } = res.data
    tokenStorage.set(accessToken, newRefresh)
    return accessToken
  } catch {
    tokenStorage.clear()
    return null
  }
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean }
    if (error.response?.status === 401 && !original._retry && !original.url?.includes('/authentication/')) {
      original._retry = true
      if (!isRefreshing) {
        isRefreshing = true
        refreshPromise = refreshAccessToken().finally(() => { isRefreshing = false })
      }
      const newToken = await refreshPromise
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`
        return api(original)
      }
    }
    return Promise.reject(normalizeError(error))
  },
)

export function normalizeError(err: unknown): ApiError {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as ApiError | undefined
    return {
      message: data?.message ?? err.message ?? 'Something went wrong',
      statusCode: data?.statusCode ?? err.response?.status,
      error: data?.error,
    }
  }
  return { message: (err as Error)?.message ?? 'Unexpected error' }
}

export function imageUrl(path?: string | null): string {
  if (!path) return ''
  if (path.startsWith('http')) return path
  return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`
}