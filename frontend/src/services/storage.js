const FAV_KEY = 'mertflix_favorites'

function read() {
  try {
    return JSON.parse(localStorage.getItem(FAV_KEY) || '[]')
  } catch (e) {
    return []
  }
}

function write(items) {
  localStorage.setItem(FAV_KEY, JSON.stringify(items))
  window.dispatchEvent(new CustomEvent('mertflix:favorites:changed', { detail: { count: items.length } }))
}

export function getFavorites() {
  return read()
}

export function isFavorite(type, id) {
  const items = read()
  return items.some((it) => it.type === type && String(it.id) === String(id))
}

export function addFavorite(item) {
  const items = read()
  if (!items.some((it) => it.type === item.type && String(it.id) === String(item.id))) {
    items.push(item)
    write(items)
  }
}

export function removeFavorite(type, id) {
  const items = read().filter((it) => !(it.type === type && String(it.id) === String(id)))
  write(items)
}

export function clearFavorites() {
  write([])
}
