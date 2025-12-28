// Legacy wrapper kept for compatibility.
// The project uses DB-backed list endpoints now (no localStorage).

import {
  getMyListCached,
  isInMyListCached,
  loadMyList,
  removeFromMyList,
  toggleMyList,
} from './myListStore'

export const MY_LIST_KEY = 'mertflix:mylist:changed'

export function makeListKey(type, id) {
  return `${type}:${id}`
}

export function readMyList() {
  return getMyListCached()
}

export async function refreshMyList() {
  return loadMyList({ force: true })
}

export function isInMyList(type, id) {
  return isInMyListCached(type, id)
}

export async function toggleMyListItem(item) {
  await toggleMyList({
    mediaType: item.type,
    tmdbId: item.id,
    title: item.name || item.title || null,
    posterUrl: item.image || null,
  })
  return getMyListCached()
}

export async function removeMyListItem(type, id) {
  await removeFromMyList(type, id)
  return getMyListCached()
}
