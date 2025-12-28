import { apiFetch } from './api'

export function listKey(mediaType, tmdbId) {
  return `${mediaType}:${tmdbId}`
}

export async function fetchMyList() {
  const data = await apiFetch('/me/list')
  const items = Array.isArray(data?.items) ? data.items : []
  return items
}

export async function addMyListItem({ mediaType, tmdbId, title = null, posterUrl = null }) {
  return apiFetch('/me/list', {
    method: 'POST',
    body: { mediaType, tmdbId, title, posterUrl },
  })
}

export async function removeMyListItem(mediaType, tmdbId) {
  const qs = new URLSearchParams({ mediaType, tmdbId: String(tmdbId) })
  return apiFetch(`/me/list?${qs.toString()}`, { method: 'DELETE' })
}
