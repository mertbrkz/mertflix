import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { isInMyList, toggleMyListItem, MY_LIST_KEY, readMyList } from '../services/myList'

const ShowCard = ({ show }) => {
  const imageUrl = show.image?.medium || 'https://via.placeholder.com/640x360?text=No+Image'
  const [inList, setInList] = useState(false)

  useEffect(() => {
    const read = () => setInList(isInMyList('show', show.id))
    read()
    const onStorage = (e) => {
      if (!e || e.key === MY_LIST_KEY) read()
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [show.id])

  function toggleList(e) {
    e.preventDefault()
    e.stopPropagation()
    toggleMyListItem({ type: 'show', id: show.id, name: show.name, image: imageUrl, genres: show.genres || [], genreIds: show.genreIds || [] })
    setInList(readMyList().some((x) => x.key === `show:${show.id}`))
  }

  return (
    <Link to={`/shows/${show.id}`} className="block">
      <article className="relative bg-black border border-white/10 rounded-2xl overflow-hidden transition-transform duration-300 hover:-translate-y-0.5">
        <img src={imageUrl} alt={show.name} className="w-full h-56 object-cover" />

        <button
          onClick={toggleList}
          aria-label={inList ? 'Listemden çıkar' : 'Listeme ekle'}
          title={inList ? 'Listemden çıkar' : 'Listeme ekle'}
          className="absolute top-3 right-3 h-9 w-9 rounded-full bg-black/60 border border-white/20 flex items-center justify-center"
        >
          {inList ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414L9 14.414 5.293 10.707a1 1 0 011.414-1.414L9 11.586l6.293-6.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          )}
        </button>
        <div className="p-4">
          <h3 className="text-xl font-bold truncate">{show.name}</h3>
          <p className="mt-1 text-white/70 text-sm">{show.genres?.join(', ') || 'Tür belirtilmemiş'}</p>
          {show.rating?.average && (
            <div className="mt-2 flex items-center gap-1">
              <span className="text-white">⭐</span>
              <span className="text-sm font-semibold">{show.rating.average}</span>
            </div>
          )}
        </div>
      </article>
    </Link>
  )
}

export default ShowCard
