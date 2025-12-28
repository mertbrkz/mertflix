import { useMemo, useState } from 'react'
import { getAuthEmail, getAuthToken } from '../services/api'
import { login as loginApi, login2fa as login2faApi, logout as logoutApi } from '../services/auth'
import { resetMyListStore } from '../services/myListStore'
import { resetWatchedStore } from '../services/watchedStore'
import { AuthContext } from './authContextValue'

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getAuthToken())
  const [email, setEmail] = useState(() => getAuthEmail())

  function refreshAuth() {
    setToken(getAuthToken())
    setEmail(getAuthEmail())
  }

  async function signIn(emailValue, password, { persist = true } = {}) {
    resetMyListStore()
    resetWatchedStore()
    const result = await loginApi(emailValue, password, { persist })

    if (result?.requires2fa) return result

    setToken(getAuthToken())
    setEmail(getAuthEmail())
    return result
  }

  async function signIn2fa(emailValue, challengeId, code, { persist = true } = {}) {
    resetMyListStore()
    resetWatchedStore()
    const result = await login2faApi(emailValue, challengeId, code, { persist })
    setToken(getAuthToken())
    setEmail(getAuthEmail())
    return result
  }

  function signOut() {
    resetMyListStore()
    resetWatchedStore()
    logoutApi()
    setToken(null)
    setEmail(null)
  }

  const value = useMemo(
    () => ({ token, email, isAuthenticated: Boolean(token), signIn, signIn2fa, signOut, refreshAuth }),
    [token, email]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
