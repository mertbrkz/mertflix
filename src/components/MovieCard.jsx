import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { isInMyList, toggleMyListItem, MY_LIST_KEY, readMyList } from '../services/myList'

export default function MovieCard({ movie, to, listType = 'movie' }) {
  const [inList, setInList] = useState(false)

  const ratingNumber =
    typeof movie?.rating === 'number'
      ? movie.rating
      : typeof movie?.rating?.average === 'number'
        ? movie.rating.average
        : null

  useEffect(() => {
    const read = () => setInList(isInMyList(listType, movie?.id))
    read()
    const onStorage = (e) => {
      if (!e || e.key === MY_LIST_KEY) read()
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [movie?.id, listType])

  function toggle(e) {
    e.preventDefault()
    e.stopPropagation()

    const item = {
      type: listType,
      id: movie.id,
      name: movie.title,
      image: movie.poster,
      genreIds: movie.genreIds || [],
    }
    toggleMyListItem(item)
    setInList(readMyList().some((x) => x.key === `${listType}:${movie.id}`))
  }

  return (
    <Link to={to || `/movies/${movie.id}`} className="block group">
      <div className="relative overflow-hidden rounded border border-white/10 bg-black">
        <img
          src={movie.poster || 'https://via.placeholder.com/342x513?text=No+Image'}
          alt={movie.title}
          className="w-full aspect-[2/3] object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />

        <button
          onClick={toggle}
          title={inList ? 'Listemden çıkar' : 'Listeme ekle'}
          aria-label={inList ? 'Listemden çıkar' : 'Listeme ekle'}
          className="absolute right-2 top-2 h-9 w-9 rounded-full bg-black/70 border border-white/15 hover:bg-black flex items-center justify-center"
        >
          <span className="text-xl leading-none">{inList ? '✓' : '+'}</span>
        </button>
      </div>

      <div className="mt-2">
        <div className="font-semibold leading-snug line-clamp-2">{movie.title}</div>
        <div className="text-sm text-white/60">
          {movie.year ? movie.year : '—'} · {ratingNumber != null ? ratingNumber.toFixed(1) : '—'}
        </div>
      </div>
    </Link>
  )
}
