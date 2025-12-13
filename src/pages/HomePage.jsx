import { useEffect, useState } from 'react'
import Row from '../components/Row'
import PosterCard from '../components/PosterCard'
import Banner from '../components/Banner'
import Loading from '../components/Loading'
import ErrorState from '../components/ErrorState'
import { discoverMovies, discoverTv, tmdbImage } from '../services/tmdb'
import { readMyList } from '../services/myList'

const showCategories = [
  { key: 'tv_trending', title: 'Trending Series', genreId: null },
  { key: 'tv_action', title: 'Action & Adventure', genreId: 10759 },
  { key: 'tv_comedy', title: 'Comedy', genreId: 35 },
  { key: 'tv_drama', title: 'Drama', genreId: 18 },
  { key: 'tv_crime', title: 'Crime', genreId: 80 },
  { key: 'tv_animation', title: 'Animation', genreId: 16 },
  { key: 'tv_scifi', title: 'Sci‑Fi & Fantasy', genreId: 10765 },
]

const movieCategories = [
  { key: 'movies_trending', title: 'Trending Movies', genreId: null },
  { key: 'movies_action', title: 'Action Movies', genreId: 28 },
  { key: 'movies_comedy', title: 'Comedy Movies', genreId: 35 },
  { key: 'movies_drama', title: 'Drama Movies', genreId: 18 },
  { key: 'movies_romance', title: 'Romance Movies', genreId: 10749 },
  { key: 'movies_horror', title: 'Horror Movies', genreId: 27 },
  { key: 'movies_scifi', title: 'Sci‑Fi Movies', genreId: 878 },
  { key: 'movies_animation', title: 'Animation Movies', genreId: 16 },
]

function mapTmdbMovie(m) {
  return {
    id: m.id,
    title: m.title || m.original_title || '—',
    year: m.release_date ? Number(String(m.release_date).slice(0, 4)) : null,
    rating: typeof m.vote_average === 'number' ? m.vote_average : null,
    poster: tmdbImage(m.poster_path, 'w342'),
    genreIds: Array.isArray(m.genre_ids) ? m.genre_ids : [],
  }
}

function mapTmdbTv(t) {
  const poster = tmdbImage(t.poster_path, 'w342')
  const backdrop = tmdbImage(t.backdrop_path, 'w1280')
  return {
    id: t.id,
    name: t.name || t.original_name || '—',
    premiered: t.first_air_date || null,
    rating: { average: typeof t.vote_average === 'number' ? t.vote_average : null },
    image: {
      medium: poster || backdrop || 'https://via.placeholder.com/300x169?text=No+Image',
      original: backdrop || poster || 'https://via.placeholder.com/1280x720?text=No+Image',
    },
    summary: t.overview ? String(t.overview) : '',
    genres: [],
    genreIds: Array.isArray(t.genre_ids) ? t.genre_ids : [],
  }
}

function topNCounts(values, n = 2) {
  const map = new Map()
  for (const v of values) map.set(v, (map.get(v) || 0) + 1)
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k]) => k)
}

export default function HomePage() {
  const [rows, setRows] = useState({})
  const [featured, setFeatured] = useState(null)
  const [featuredTo, setFeaturedTo] = useState(null)
  const [forYouShows, setForYouShows] = useState([])
  const [forYouMovies, setForYouMovies] = useState([])
  const [tmdbMissing, setTmdbMissing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [reloadNonce, setReloadNonce] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const all = {}
        setTmdbMissing(false)

        for (const cat of showCategories) {
          const data = await discoverTv(1, cat.genreId ? { with_genres: String(cat.genreId) } : {})
          all[cat.key] = (data?.results || []).map(mapTmdbTv)
        }

        for (const cat of movieCategories) {
          try {
            const data = await discoverMovies(1, cat.genreId ? { with_genres: String(cat.genreId) } : {})
            all[cat.key] = (data?.results || []).map(mapTmdbMovie)
          } catch {
            all[cat.key] = []
          }
        }

        if (!cancelled) setRows(all)

        const list = readMyList()
        const preferredShowGenreIds = topNCounts(
          list.filter((x) => x.type === 'show').flatMap((x) => x.genreIds || []),
          2
        )
        const preferredMovieGenreIds = topNCounts(
          list.filter((x) => x.type === 'movie').flatMap((x) => x.genreIds || []),
          2
        )

        if (preferredShowGenreIds.length) {
          const merged = []
          const seen = new Set()
          for (const gid of preferredShowGenreIds) {
            const data = await discoverTv(1, { with_genres: String(gid) })
            for (const s of (data?.results || []).map(mapTmdbTv)) {
              if (!seen.has(s.id)) {
                seen.add(s.id)
                merged.push(s)
              }
            }
          }
          if (!cancelled) setForYouShows(merged.slice(0, 12))
        } else if (!cancelled) {
          setForYouShows([])
        }

        if (preferredMovieGenreIds.length) {
          const merged = []
          const seen = new Set()
          for (const gid of preferredMovieGenreIds) {
            try {
              const data = await discoverMovies(1, { with_genres: String(gid) })
              for (const m of (data?.results || []).map(mapTmdbMovie)) {
                if (!seen.has(m.id)) {
                  seen.add(m.id)
                  merged.push(m)
                }
              }
            } catch {
            }
          }
          if (!cancelled) setForYouMovies(merged.slice(0, 12))
        } else if (!cancelled) {
          setForYouMovies([])
        }

        const firstList = all.tv_trending || Object.values(all)[0] || []
        if (firstList.length) {
          const pick = firstList[Math.floor(Math.random() * firstList.length)]
          if (!cancelled) {
            setFeatured(pick)
            setFeaturedTo(`/shows/${pick.id}`)
          }
        }
      } catch (err) {
        if (cancelled) return

        const msg = typeof err?.message === 'string' ? err.message : 'Hata'
        if (msg.toLowerCase().includes('tmdb auth missing')) {
          setTmdbMissing(true)
          setError(null)
        } else {
          setTmdbMissing(false)
          setError(msg)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [reloadNonce])

  return (
    <div>
      <Banner movie={featured} to={featuredTo} />

      <div className="relative z-10 mt-6 px-4 sm:px-6 lg:px-8">
        {tmdbMissing ? (
          <div className="max-w-xl p-4 border border-white/10 rounded bg-black mb-6">
            <div className="text-lg font-semibold">TMDB anahtarı gerekli</div>
            <div className="text-white/70 mt-1">Diziler ve filmler TMDB’den çekiliyor. `.env` ayarla veya Movies sayfasından token gir.</div>
          </div>
        ) : null}

        {error ? (
          <ErrorState
            title="Anasayfa yüklenemedi"
            message={error}
            onRetry={() => setReloadNonce((n) => n + 1)}
            className="max-w-xl"
          />
        ) : null}

        {loading ? <Loading /> : null}

        {forYouShows.length ? (
          <Row title="Senin için — Diziler" seeAllTo="/shows">
            {forYouShows.map((s) => (
              <PosterCard key={s.id} show={s} />
            ))}
          </Row>
        ) : null}

        {forYouMovies.length ? (
          <Row title="Senin için — Filmler" seeAllTo="/movies">
            {forYouMovies.map((m) => (
              <PosterCard key={m.id} show={m} to={`/movies/${m.id}`} listType="movie" />
            ))}
          </Row>
        ) : null}

        {showCategories.map((cat) => (
          <Row key={cat.key} title={cat.title} seeAllTo="/shows">
            {(rows[cat.key] || []).slice(0, 12).map((s) => (
              <PosterCard key={s.id} show={s} />
            ))}
          </Row>
        ))}

        {movieCategories.map((cat) => (
          <Row key={cat.key} title={cat.title} seeAllTo="/movies">
            {(rows[cat.key] || []).slice(0, 12).map((m) => (
              <PosterCard key={m.id} show={m} to={`/movies/${m.id}`} listType="movie" />
            ))}
          </Row>
        ))}
      </div>
    </div>
  )
}
