import { getAuthEmail } from './api'

const LS_PREFIX = 'mertflix:lang:'
const GUEST_KEY = `${LS_PREFIX}guest`

export const SUPPORTED_LANGUAGES = [
  { code: 'tr' },
  { code: 'en' },
]

function storageKeyForCurrentUser() {
  const email = String(getAuthEmail() || '').trim().toLowerCase()
  if (email) return `${LS_PREFIX}${email}`
  return GUEST_KEY
}

export function getPreferredLanguage() {
  if (typeof window === 'undefined') return 'tr'
  const key = storageKeyForCurrentUser()
  const raw = localStorage.getItem(key)
  return raw === 'en' ? 'en' : 'tr'
}

export function setPreferredLanguage(lang) {
  if (typeof window === 'undefined') return
  const next = lang === 'en' ? 'en' : 'tr'
  const key = storageKeyForCurrentUser()
  localStorage.setItem(key, next)
  window.dispatchEvent(new CustomEvent('mertflix:lang:changed', { detail: { lang: next } }))
}

export function getTmdbLanguage() {
  const pref = getPreferredLanguage()
  return pref === 'en' ? 'en-US' : 'tr-TR'
}
