import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { isInMyList, toggleMyListItem, MY_LIST_KEY, readMyList } from '../services/myList'

export default function PosterCard({ show, to, listType = 'show' }) {
  const navigate = useNavigate()
  const title = show?.name || show?.title || '—'
  const img =
    show?.image?.medium ||
    show?.image?.original ||
    show?.poster ||
    'https://via.placeholder.com/300x169?text=No+Image'

  const targetTo = to || (listType === 'movie' ? `/movies/${show?.id}` : `/shows/${show?.id}`)
  const [inList, setInList] = useState(false)

  useEffect(()=>{
    const read = () => setInList(isInMyList(listType, show?.id))
    read()
    const onStorage = (e) => {
      if (!e || e.key === MY_LIST_KEY) read()
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  },[show?.id, listType])

  function toggleList(e){
    e.stopPropagation();
    e.preventDefault();
    toggleMyListItem({ type: listType, id: show.id, name: title, image: img, genres: show.genres || [], genreIds: show.genreIds || [] })
    setInList(readMyList().some((x) => x.key === `${listType}:${show.id}`))
  }

  return (
    <div className="group block flex-shrink-0 w-40 sm:w-44 md:w-52" onClick={()=>navigate(targetTo)}>
      <div className="relative w-full h-28 md:h-32 overflow-hidden rounded-md bg-black">
        <img src={img} alt={title} className="w-full h-full object-cover transition-transform duration-[450ms] group-hover:scale-105" />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200"></div>

        <button
          onClick={toggleList}
          aria-label={inList ? 'Listemden çıkar' : 'Listeme ekle'}
          title={inList ? 'Listemden çıkar' : 'Listeme ekle'}
          className="absolute top-2 right-2 z-20 h-8 w-8 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-150"
        >
          {inList ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414L9 14.414 5.293 10.707a1 1 0 011.414-1.414L9 11.586l6.293-6.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          )}
        </button>
      </div>
      <div className="mt-2 text-sm font-medium truncate">{title}</div>
    </div>
  )
}
