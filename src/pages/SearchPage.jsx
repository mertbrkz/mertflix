import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Loading from '../components/Loading'
import ErrorState from '../components/ErrorState'
import MovieCard from '../components/MovieCard'
import { searchMovies, searchTv, tmdbImage } from '../services/tmdb'

function mapMovie(m) {
  return {
    id: m.id,
    title: m.title || m.original_title || '—',
    year: m.release_date ? Number(String(m.release_date).slice(0, 4)) : null,
    rating: typeof m.vote_average === 'number' ? m.vote_average : null,
    poster: tmdbImage(m.poster_path, 'w342'),
    genreIds: Array.isArray(m.genre_ids) ? m.genre_ids : [],
  }
}

function mapShow(t) {
  return {
    id: t.id,
    title: t.name || t.original_name || '—',
    year: t.first_air_date ? Number(String(t.first_air_date).slice(0, 4)) : null,
    rating: typeof t.vote_average === 'number' ? t.vote_average : null,
    poster: tmdbImage(t.poster_path, 'w342'),
    genreIds: Array.isArray(t.genre_ids) ? t.genre_ids : [],
  }
}

export default function SearchPage() {
  const location = useLocation()
  const q = useMemo(() => new URLSearchParams(location.search).get('q') || '', [location.search])
  const query = (q || '').trim()

  const [movies, setMovies] = useState([])
  const [shows, setShows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function run() {
      if (!query) {
        setMovies([])
        setShows([])
        setLoading(false)
        setError(null)
        return
      }

      setLoading(true)
      setError(null)
      try {
        const [m, s] = await Promise.all([
          searchMovies(query, 1),
          searchTv(query, 1),
        ])
        if (!cancelled) {
          setMovies((m?.results || []).map(mapMovie))
          setShows((s?.results || []).map(mapShow))
        }
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Hata')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [query])

  const isTmdbMissing = typeof error === 'string' && error.toLowerCase().includes('tmdb auth missing')

  if (loading) return <Loading />

  if (isTmdbMissing) {
    return (
      <div className="max-w-xl p-4 border border-white/10 rounded bg-black">
        <div className="text-lg font-semibold">TMDB anahtarı gerekli</div>
        <div className="text-white/70 mt-1">
          Arama için TMDB gerekiyor. `.env` ayarla veya <Link to="/movies" className="underline">Filmler</Link> sayfasından token gir.
        </div>
      </div>
    )
  }

  if (error) return <ErrorState title="Arama başarısız" message={error} />

  return (
    <div className="space-y-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold">Arama</h2>
          <div className="text-sm text-white/70 mt-1">
            {query ? `Sorgu: ${query}` : 'Bir şey aramak için soldaki aramayı kullan.'}
          </div>
        </div>
      </div>

      {query ? (
        <>
          <section>
            <div className="flex items-baseline justify-between mb-3">
              <h3 className="text-xl font-bold">Filmler <span className="text-sm text-white/60">({movies.length})</span></h3>
              <Link to={`/movies?q=${encodeURIComponent(query)}`} className="text-sm text-white/70 hover:text-white underline">
                Tümünü gör
              </Link>
            </div>
            {movies.length ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {movies.slice(0, 6).map((item) => (
                  <MovieCard
                    key={`movie:${item.id}`}
                    movie={item}
                    to={`/movies/${item.id}`}
                    listType="movie"
                  />
                ))}
              </div>
            ) : (
              <div className="text-white/70">Film sonucu bulunamadı.</div>
            )}
          </section>

          <section>
            <div className="flex items-baseline justify-between mb-3">
              <h3 className="text-xl font-bold">Diziler <span className="text-sm text-white/60">({shows.length})</span></h3>
              <Link to={`/shows?q=${encodeURIComponent(query)}`} className="text-sm text-white/70 hover:text-white underline">
                Tümünü gör
              </Link>
            </div>
            {shows.length ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {shows.slice(0, 6).map((item) => (
                  <MovieCard
                    key={`show:${item.id}`}
                    movie={item}
                    to={`/shows/${item.id}`}
                    listType="show"
                  />
                ))}
              </div>
            ) : (
              <div className="text-white/70">Dizi sonucu bulunamadı.</div>
            )}
          </section>
        </>
      ) : null}
    </div>
  )
}
