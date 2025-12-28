import { getTmdbLanguage } from './languagePref'

const TMDB_BASE = 'https://api.themoviedb.org/3'

const LS_TOKEN = 'mertflix_tmdb_access_token'
const LS_API_KEY = 'mertflix_tmdb_api_key'

export function setTmdbAuth({ accessToken, apiKey }) {
  if (typeof window === 'undefined') return
  if (accessToken) localStorage.setItem(LS_TOKEN, accessToken)
  if (apiKey) localStorage.setItem(LS_API_KEY, apiKey)
}

export function clearTmdbAuth() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(LS_TOKEN)
  localStorage.removeItem(LS_API_KEY)
}

function getAuth() {
  const token = import.meta?.env?.VITE_TMDB_ACCESS_TOKEN
    || (typeof window !== 'undefined' ? localStorage.getItem(LS_TOKEN) : null)
  const apiKey = import.meta?.env?.VITE_TMDB_API_KEY
    || (typeof window !== 'undefined' ? localStorage.getItem(LS_API_KEY) : null)

  if (token) return { type: 'bearer', value: token }
  if (apiKey) return { type: 'apiKey', value: apiKey }

  throw new Error(
    'TMDB auth missing. Set VITE_TMDB_ACCESS_TOKEN (recommended) or VITE_TMDB_API_KEY in a .env file, or enter it on the Movies page.'
  )
}

async function tmdbFetch(path, params = {}) {
  const auth = getAuth()
  const url = new URL(`${TMDB_BASE}${path}`)
  if (auth.type === 'apiKey') url.searchParams.set('api_key', auth.value)

  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue
    url.searchParams.set(k, String(v))
  }

  const res = await fetch(url.toString(), {
    headers: auth.type === 'bearer'
      ? { Authorization: `Bearer ${auth.value}`, Accept: 'application/json' }
      : { Accept: 'application/json' },
  })

  if (!res.ok) {
    let message = `TMDB request failed (${res.status})`
    try {
      const err = await res.json()
      if (typeof err?.status_message === 'string' && err.status_message.trim()) message = err.status_message
      else if (typeof err?.message === 'string' && err.message.trim()) message = err.message
    } catch {
    }
    throw new Error(message)
  }

  return res.json()
}

function isBlankText(v) {
  return v == null || String(v).trim().length === 0
}

export function tmdbImage(path, size = 'w342') {
  if (!path) return null
  return `https://image.tmdb.org/t/p/${size}${path}`
}

export async function discoverMovies(page = 1, extraParams = {}) {
  return tmdbFetch('/discover/movie', {
    page,
    include_adult: 'false',
    include_video: 'false',
    sort_by: 'popularity.desc',
    language: getTmdbLanguage(),
    ...(extraParams || {}),
  })
}

export async function getRandomMovieId({ attempts = 3 } = {}) {
  const maxAttempts = Math.max(1, Number(attempts) || 3)

  // First call: learn total_pages so we can randomize fairly.
  const first = await discoverMovies(1)
  const totalPages = Math.max(1, Number(first?.total_pages) || 1)
  const cappedPages = Math.min(totalPages, 500) // TMDB caps paging for discover endpoints.

  function pickRandomPage() {
    return 1 + Math.floor(Math.random() * cappedPages)
  }

  // Try a few times in case we land on an empty page.
  for (let i = 0; i < maxAttempts; i++) {
    const page = pickRandomPage()
    const data = page === 1 ? first : await discoverMovies(page)
    const results = Array.isArray(data?.results) ? data.results : []
    if (!results.length) continue

    const pick = results[Math.floor(Math.random() * results.length)]
    const id = Number(pick?.id)
    if (Number.isFinite(id) && id > 0) return id
  }

  throw new Error('No movies found')
}

export async function searchMovies(query, page = 1) {
  return tmdbFetch('/search/movie', {
    query,
    page,
    include_adult: 'false',
    language: getTmdbLanguage(),
  })
}

export async function discoverTv(page = 1, extraParams = {}) {
  return tmdbFetch('/discover/tv', {
    page,
    include_adult: 'false',
    include_null_first_air_dates: 'false',
    sort_by: 'popularity.desc',
    language: getTmdbLanguage(),
    ...(extraParams || {}),
  })
}

export async function searchTv(query, page = 1) {
  return tmdbFetch('/search/tv', {
    query,
    page,
    include_adult: 'false',
    language: getTmdbLanguage(),
  })
}

export async function getMovieGenres() {
  return tmdbFetch('/genre/movie/list', {
    language: getTmdbLanguage(),
  })
}

export async function getTvGenres() {
  return tmdbFetch('/genre/tv/list', {
    language: getTmdbLanguage(),
  })
}

export async function getTv(tvId) {
  const language = getTmdbLanguage()
  const data = await tmdbFetch(`/tv/${tvId}`, {
    append_to_response: 'credits',
    language,
  })

  // If Turkish is selected but TMDB lacks a TR overview, fall back to EN.
  if (language === 'tr-TR' && isBlankText(data?.overview)) {
    try {
      const fallback = await tmdbFetch(`/tv/${tvId}`, {
        append_to_response: 'credits',
        language: 'en-US',
      })
      if (isBlankText(data?.overview) && !isBlankText(fallback?.overview)) data.overview = fallback.overview
    } catch {
      // ignore fallback errors
    }
  }

  return data
}

export async function getTvSeason(tvId, seasonNumber) {
  return tmdbFetch(`/tv/${tvId}/season/${seasonNumber}`, {
    language: getTmdbLanguage(),
  })
}

export async function getMovie(movieId) {
  const language = getTmdbLanguage()
  const data = await tmdbFetch(`/movie/${movieId}`, {
    append_to_response: 'credits',
    language,
  })

  // If Turkish is selected but TMDB lacks a TR overview, fall back to EN.
  if (language === 'tr-TR' && isBlankText(data?.overview)) {
    try {
      const fallback = await tmdbFetch(`/movie/${movieId}`, {
        append_to_response: 'credits',
        language: 'en-US',
      })
      if (isBlankText(data?.overview) && !isBlankText(fallback?.overview)) data.overview = fallback.overview
    } catch {
      // ignore fallback errors
    }
  }

  return data
}

export async function getPerson(personId) {
  const language = getTmdbLanguage()
  const data = await tmdbFetch(`/person/${personId}`, {
    language,
  })

  // If Turkish is selected but TMDB lacks a TR biography, fall back to EN.
  if (language === 'tr-TR' && isBlankText(data?.biography)) {
    try {
      const fallback = await tmdbFetch(`/person/${personId}`, {
        language: 'en-US',
      })
      if (isBlankText(data?.biography) && !isBlankText(fallback?.biography)) data.biography = fallback.biography
    } catch {
      // ignore fallback errors
    }
  }

  return data
}

export async function getPersonCombinedCredits(personId) {
  return tmdbFetch(`/person/${personId}/combined_credits`, {
    language: getTmdbLanguage(),
  })
}

export async function getPopularPeople(page = 1) {
  return tmdbFetch('/person/popular', {
    page,
    language: getTmdbLanguage(),
  })
}

export async function searchPeople(query, page = 1) {
  return tmdbFetch('/search/person', {
    query,
    page,
    include_adult: 'false',
    language: getTmdbLanguage(),
  })
}

export default {
  discoverMovies,
  searchMovies,
  searchPeople,
  getMovie,
  discoverTv,
  searchTv,
  getMovieGenres,
  getTvGenres,
  getTv,
  getTvSeason,
  getPopularPeople,
  getPerson,
  getPersonCombinedCredits,
  tmdbImage,
}
