import { addWatchedItem, fetchWatched, removeWatchedItem, watchedKey } from './watchedApi'

let cache = []
let cacheKeySet = new Set()
let loaded = false
let inFlight = null

function rebuildIndex(items) {
  cache = items
  cacheKeySet = new Set(items.map((it) => watchedKey(it.media_type, Number(it.tmdb_id))))
}

function emitChanged() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('mertflix:watched:changed'))
}

export function resetWatchedStore() {
  cache = []
  cacheKeySet = new Set()
  loaded = false
  inFlight = null
}

export async function loadWatched({ force = false } = {}) {
  if (loaded && !force) return cache
  if (inFlight) return inFlight

  inFlight = (async () => {
    const items = await fetchWatched()
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

export function getWatchedCached() {
  return cache
}

export function isWatchedCached(mediaType, tmdbId) {
  return cacheKeySet.has(watchedKey(mediaType, Number(tmdbId)))
}

export async function toggleWatched({ mediaType, tmdbId, title = null, posterUrl = null }) {
  await loadWatched()

  const key = watchedKey(mediaType, Number(tmdbId))
  const isWatched = cacheKeySet.has(key)

  if (isWatched) {
    await removeWatchedItem(mediaType, tmdbId)
    rebuildIndex(cache.filter((x) => watchedKey(x.media_type, Number(x.tmdb_id)) !== key))
  } else {
    await addWatchedItem({ mediaType, tmdbId, title, posterUrl })
    await loadWatched({ force: true })
  }

  emitChanged()
  return !isWatched
}

export async function ensureWatchedState(mediaType, tmdbId) {
  await loadWatched()
  return isWatchedCached(mediaType, tmdbId)
}
