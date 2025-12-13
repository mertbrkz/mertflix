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
    language: 'en-US',
    ...(extraParams || {}),
  })
}

export async function searchMovies(query, page = 1) {
  return tmdbFetch('/search/movie', {
    query,
    page,
    include_adult: 'false',
    language: 'en-US',
  })
}

export async function discoverTv(page = 1, extraParams = {}) {
  return tmdbFetch('/discover/tv', {
    page,
    include_adult: 'false',
    include_null_first_air_dates: 'false',
    sort_by: 'popularity.desc',
    language: 'en-US',
    ...(extraParams || {}),
  })
}

export async function searchTv(query, page = 1) {
  return tmdbFetch('/search/tv', {
    query,
    page,
    include_adult: 'false',
    language: 'en-US',
  })
}

export async function getMovieGenres() {
  return tmdbFetch('/genre/movie/list', {
    language: 'en-US',
  })
}

export async function getTvGenres() {
  return tmdbFetch('/genre/tv/list', {
    language: 'en-US',
  })
}

export async function getTv(tvId) {
  return tmdbFetch(`/tv/${tvId}`, {
    append_to_response: 'credits',
    language: 'en-US',
  })
}

export async function getTvSeason(tvId, seasonNumber) {
  return tmdbFetch(`/tv/${tvId}/season/${seasonNumber}`, {
    language: 'en-US',
  })
}

export async function getMovie(movieId) {
  return tmdbFetch(`/movie/${movieId}`, {
    append_to_response: 'credits',
    language: 'en-US',
  })
}

export async function getPerson(personId) {
  return tmdbFetch(`/person/${personId}`, {
    language: 'en-US',
  })
}

export async function getPersonCombinedCredits(personId) {
  return tmdbFetch(`/person/${personId}/combined_credits`, {
    language: 'en-US',
  })
}

export async function getPopularPeople(page = 1) {
  return tmdbFetch('/person/popular', {
    page,
    language: 'en-US',
  })
}

export async function searchPeople(query, page = 1) {
  return tmdbFetch('/search/person', {
    query,
    page,
    include_adult: 'false',
    language: 'en-US',
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
