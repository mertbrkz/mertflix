import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { isInMyListCached, loadMyList, toggleMyList } from '../services/myListStore'
import { useT } from '../i18n/useT'

export default function MovieCard({ movie, to, listType = 'movie' }) {
  const { t } = useT()
  const [inList, setInList] = useState(false)

  const ratingNumber =
    typeof movie?.rating === 'number'
      ? movie.rating
      : typeof movie?.rating?.average === 'number'
        ? movie.rating.average
        : null

  useEffect(() => {
    let cancelled = false

    async function sync() {
      try {
        await loadMyList()
        if (!cancelled) setInList(isInMyListCached(listType, movie?.id))
      } catch {
        if (!cancelled) setInList(false)
      }
    }

    sync()

    const onChanged = () => {
      setInList(isInMyListCached(listType, movie?.id))
    }

    window.addEventListener('mertflix:mylist:changed', onChanged)
    return () => {
      cancelled = true
      window.removeEventListener('mertflix:mylist:changed', onChanged)
    }
  }, [movie?.id, listType])

  async function toggle(e) {
    e.preventDefault()
    e.stopPropagation()

    await toggleMyList({
      mediaType: listType,
      tmdbId: movie.id,
      title: movie.title,
      posterUrl: movie.poster,
    })
    setInList(isInMyListCached(listType, movie.id))
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
          title={inList ? t('details_remove_from_list') : t('details_add_to_list')}
          aria-label={inList ? t('details_remove_from_list') : t('details_add_to_list')}
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
