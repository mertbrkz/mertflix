import { useEffect, useState } from 'react'
import { addFavorite, removeFavorite, isFavorite } from '../services/storage'

export default function FavoriteButton({ item }) {
  const [fav, setFav] = useState(() => isFavorite(item.type, item.id))

  useEffect(() => {
    const onChange = () => setFav(isFavorite(item.type, item.id))
    window.addEventListener('mertflix:favorites:changed', onChange)
    return () => window.removeEventListener('mertflix:favorites:changed', onChange)
  }, [item])

  function toggle() {
    if (fav) removeFavorite(item.type, item.id)
    else addFavorite(item)
    setFav((v) => !v)
  }

  return (
    <button onClick={toggle} className={`px-3 py-1 text-sm rounded ${fav ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-200'}`}>
      {fav ? 'Remove from My List' : '+ My List'}
    </button>
  )
}
