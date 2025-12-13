import { useEffect, useState } from 'react'
import { MY_LIST_KEY, readMyList, removeMyListItem } from '../services/myList'

export default function MyList() {
  const [items, setItems] = useState([])

  useEffect(() => {
    const read = () => {
      setItems(readMyList())
    }

    read()
    const onStorage = (e) => {
      if (!e || e.key === MY_LIST_KEY) read()
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])
  

  if (!items || items.length === 0) {
    return (
      <div className="text-white/70">Listeniz boş</div>
    )
  }

  function removeFromList(type, id) {
    const next = removeMyListItem(type, id)
    setItems(next)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Listem</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {items.map((it) => (
          <div key={it.key} className="p-3 bg-black border border-white/10 rounded-md">
            <div className="flex items-center gap-3">
              {it.image && <img src={it.image} alt={it.name} className="w-16 h-16 rounded object-cover" />}
              <div className="flex-1">
                <div className="font-semibold">{it.name}</div>
              </div>
              <div className="flex flex-col gap-2 items-end">
                <Link to={it.type === 'movie' ? `/movies/${it.id}` : `/shows/${it.id}`} className="underline text-sm">Aç</Link>
                <button onClick={() => removeFromList(it.type || 'show', it.id)} className="text-sm underline">Kaldır</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
