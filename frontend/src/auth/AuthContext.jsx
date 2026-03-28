import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { http, setAuthToken } from '../api/http'

const AuthContext = createContext(null)

const TOKEN_KEY = 'dpwh2_token'

function normalizeError(err) {
  const errors = err?.response?.data?.errors || null
  const firstFieldError =
    errors && typeof errors === 'object'
      ? Object.values(errors)
          .flat()
          .filter(Boolean)[0]
      : null

  const apiMessage = err?.response?.data?.message || firstFieldError || null

  const fieldErrors = errors

  return {
    message: apiMessage || err?.message || 'Something went wrong.',
    fieldErrors,
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY))
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const persistToken = useCallback((nextToken) => {
    if (nextToken) localStorage.setItem(TOKEN_KEY, nextToken)
    else localStorage.removeItem(TOKEN_KEY)
    setToken(nextToken || null)
    setAuthToken(nextToken || null)
  }, [])

  const refreshMe = useCallback(async () => {
    if (!localStorage.getItem(TOKEN_KEY)) {
      setUser(null)
      return
    }
    try {
      const res = await http.get('/auth/me')
      setUser(res.data.user)
    } catch (e) {
      // token invalid/expired
      persistToken(null)
      setUser(null)
    }
  }, [persistToken])

  useEffect(() => {
    setAuthToken(token)
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        await refreshMe()
      } catch (e) {
        setError(normalizeError(e))
      } finally {
        setLoading(false)
      }
    })()
  }, [refreshMe, token])

  const register = useCallback(
    async ({ name, email, password, password_confirmation }) => {
      setError(null)
      try {
        const res = await http.post('/auth/register', {
          name,
          email,
          password,
          password_confirmation,
        })
        persistToken(res.data.token)
        setUser(res.data.user)
        return res.data.user
      } catch (e) {
        setError(normalizeError(e))
        throw e
      }
    },
    [persistToken],
  )

  const login = useCallback(
    async ({ email, password }) => {
      setError(null)
      try {
        const res = await http.post('/auth/login', { email, password })
        persistToken(res.data.token)
        setUser(res.data.user)
        return res.data.user
      } catch (e) {
        const n = normalizeError(e)
        setError(n)
        throw e
      }
    },
    [persistToken],
  )

  const logout = useCallback(async () => {
    setError(null)
    try {
      await http.post('/auth/logout')
    } catch {
      // ignore network errors; still clear locally
    } finally {
      persistToken(null)
      setUser(null)
    }
  }, [persistToken])

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      error,
      setError,
      register,
      login,
      logout,
      refreshMe,
      isAuthenticated: Boolean(token && user),
    }),
    [error, loading, login, logout, refreshMe, register, token, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

