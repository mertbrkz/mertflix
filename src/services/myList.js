const KEY = 'mertflix_list'

export function makeListKey(type, id) {
  return `${type}:${id}`
}

export function readMyList() {
  try {
    const raw = localStorage.getItem(KEY) || '[]'
    const arr = JSON.parse(raw)
    const list = Array.isArray(arr) ? arr : []

    return list
      .map((it) => {
        if (!it) return null
        const type = it.type || 'show'
        const id = it.id
        if (id === undefined || id === null) return null
        const key = it.key || makeListKey(type, id)

        const genres = Array.isArray(it.genres) ? it.genres.filter(Boolean) : []
        const genreIds = Array.isArray(it.genreIds) ? it.genreIds.filter((n) => Number.isFinite(Number(n))).map((n) => Number(n)) : []
        return {
          key,
          type,
          id,
          name: it.name || it.title || '',
          image: it.image || null,
          genres,
          genreIds,
        }
      })
      .filter(Boolean)
  } catch {
    return []
  }
}

export function writeMyList(items) {
  localStorage.setItem(KEY, JSON.stringify(items))
}

export function isInMyList(type, id) {
  const key = makeListKey(type, id)
  return readMyList().some((x) => x.key === key)
}

export function toggleMyListItem(item) {
  const normalized = {
    key: makeListKey(item.type, item.id),
    type: item.type,
    id: item.id,
    name: item.name || '',
    image: item.image || null,
    genres: Array.isArray(item.genres) ? item.genres.filter(Boolean) : [],
    genreIds: Array.isArray(item.genreIds) ? item.genreIds.filter((n) => Number.isFinite(Number(n))).map((n) => Number(n)) : [],
  }

  const list = readMyList()
  const idx = list.findIndex((x) => x.key === normalized.key)
  const next = idx >= 0 ? list.filter((x) => x.key !== normalized.key) : [normalized, ...list]
  writeMyList(next)
  return next
}

export function removeMyListItem(type, id) {
  const key = makeListKey(type, id)
  const next = readMyList().filter((x) => x.key !== key)
  writeMyList(next)
  return next
}

export const MY_LIST_KEY = KEY
