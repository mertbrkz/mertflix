import { addMyListItem, fetchMyList, listKey, removeMyListItem } from './myListApi'

let cache = []
let cacheKeySet = new Set()
let loaded = false
let inFlight = null

function rebuildIndex(items) {
  cache = items
  cacheKeySet = new Set(
    items.map((it) => listKey(it.media_type, Number(it.tmdb_id)))
  )
}

function emitChanged() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('mertflix:mylist:changed'))
}

export function resetMyListStore() {
  cache = []
  cacheKeySet = new Set()
  loaded = false
  inFlight = null
}

export async function loadMyList({ force = false } = {}) {
  if (loaded && !force) return cache
  if (inFlight) return inFlight

  inFlight = (async () => {
    const items = await fetchMyList()
    rebuildIndex(items)
    loaded = true
    return cache
  })()

  try {
    return await inFlight
  } finally {
    inFlight = null
  }
}

export function getMyListCached() {
  return cache
}

export function isInMyListCached(mediaType, tmdbId) {
  return cacheKeySet.has(listKey(mediaType, Number(tmdbId)))
}

export async function toggleMyList({ mediaType, tmdbId, title = null, posterUrl = null }) {
  await loadMyList()

  const key = listKey(mediaType, Number(tmdbId))
  const inList = cacheKeySet.has(key)

  if (inList) {
    await removeMyListItem(mediaType, tmdbId)
    rebuildIndex(cache.filter((x) => listKey(x.media_type, Number(x.tmdb_id)) !== key))
  } else {
    await addMyListItem({ mediaType, tmdbId, title, posterUrl })
    // Keep local cache accurate: refetch minimalistically.
    await loadMyList({ force: true })
  }

  emitChanged()
  return !inList
}

export async function removeFromMyList(mediaType, tmdbId) {
  await loadMyList()

  const key = listKey(mediaType, Number(tmdbId))
  if (!cacheKeySet.has(key)) return

  await removeMyListItem(mediaType, tmdbId)
  rebuildIndex(cache.filter((x) => listKey(x.media_type, Number(x.tmdb_id)) !== key))
  emitChanged()
}

export async function ensureInMyListState(mediaType, tmdbId) {
  await loadMyList()
  return isInMyListCached(mediaType, tmdbId)
}
