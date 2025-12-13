import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import Loading from '../components/Loading'
import ErrorState from '../components/ErrorState'
import { getMovie, tmdbImage } from '../services/tmdb'
import { isInMyList, toggleMyListItem, MY_LIST_KEY, readMyList } from '../services/myList'

export default function MovieDetailPage() {
  const { id } = useParams()
  const movieId = Number(id)

  const [movie, setMovie] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [inList, setInList] = useState(false)
  const [reloadNonce, setReloadNonce] = useState(0)

  useEffect(() => {
    const read = () => setInList(isInMyList('movie', movieId))
    read()
    const onStorage = (e) => {
      if (!e || e.key === MY_LIST_KEY) read()
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [movieId])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const data = await getMovie(movieId)
        if (!cancelled) setMovie(data)
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Hata')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    if (!Number.isFinite(movieId)) {
      setError('Geçersiz film')
      setLoading(false)
      return
    }

    load()
    return () => {
      cancelled = true
    }
  }, [movieId, reloadNonce])

  const poster = useMemo(() => tmdbImage(movie?.poster_path, 'w500'), [movie?.poster_path])
  const backdrop = useMemo(() => tmdbImage(movie?.backdrop_path, 'w1280'), [movie?.backdrop_path])

  function toggle() {
    if (!movie) return
    toggleMyListItem({
      type: 'movie',
      id: movie.id,
      name: movie.title,
      image: poster,
      genreIds: Array.isArray(movie.genres) ? movie.genres.map((g) => g?.id).filter(Boolean) : [],
    })
    setInList(readMyList().some((x) => x.key === `movie:${movie.id}`))
  }

  if (loading) return <Loading />
  if (error) return <ErrorState title="Film yüklenemedi" message={error} onRetry={() => setReloadNonce((n) => n + 1)} />
  if (!movie) return <div className="text-white/70">Film bulunamadı.</div>

  return (
    <div>
      <div
        className="relative rounded overflow-hidden border border-white/10"
        style={backdrop ? { backgroundImage: `url(${backdrop})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
      >
        <div className="absolute inset-0 bg-black/70" />
        <div className="relative p-6 md:p-10 flex gap-6 flex-col md:flex-row">
          {poster && (
            <img src={poster} alt={movie.title} className="w-44 md:w-56 rounded border border-white/10 object-cover" />
          )}
          <div className="flex-1">
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-3xl font-bold">{movie.title}</h1>
              <button
                onClick={toggle}
                className="px-4 py-2 rounded border border-white/15 bg-black hover:bg-white/5"
                title={inList ? 'Listemden çıkar' : 'Listeme ekle'}
              >
                {inList ? '✓ Listemde' : '+ Listeme ekle'}
              </button>
            </div>

            <div className="text-white/70 mt-2">
              {movie.release_date ? movie.release_date.slice(0, 4) : '—'} · {movie.runtime ? `${movie.runtime} dk` : '—'} · {movie.vote_average != null ? movie.vote_average.toFixed(1) : '—'}
            </div>

            {movie.genres?.length ? (
              <div className="text-white/70 mt-2">{movie.genres.map((g) => g.name).join(' · ')}</div>
            ) : null}

            <div className="mt-4 text-white/90 max-w-3xl">{movie.overview || 'Özet yok.'}</div>
          </div>
        </div>
      </div>

      {movie.credits?.cast?.length ? (
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-3">Oyuncular</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {movie.credits.cast.slice(0, 15).map((c) => (
              <div key={c.id} className="p-3 bg-black border border-white/10 rounded">
                <div className="font-semibold leading-snug">{c.name}</div>
                <div className="text-sm text-white/60">{c.character}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
