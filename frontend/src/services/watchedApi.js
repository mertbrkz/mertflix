import { apiFetch } from './api'

export function watchedKey(mediaType, tmdbId) {
  return `${mediaType}:${tmdbId}`
}

export async function fetchWatched() {
  const data = await apiFetch('/me/watched')
  const items = Array.isArray(data?.items) ? data.items : []
  return items
}

export async function addWatchedItem({ mediaType, tmdbId, title = null, posterUrl = null }) {
  return apiFetch('/me/watched', {
    method: 'POST',
    body: { mediaType, tmdbId, title, posterUrl },
  })
}

export async function removeWatchedItem(mediaType, tmdbId) {
  const qs = new URLSearchParams({ mediaType, tmdbId: String(tmdbId) })
  return apiFetch(`/me/watched?${qs.toString()}`, { method: 'DELETE' })
}
