import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import PosterCard from '../components/PosterCard'
import Loading from '../components/Loading'
import ErrorState from '../components/ErrorState'
import { clearTmdbAuth, getPerson, getPersonCombinedCredits, setTmdbAuth, tmdbImage } from '../services/tmdb'

function sortByPopularityDesc(a, b) {
  const ap = typeof a?.popularity === 'number' ? a.popularity : 0
  const bp = typeof b?.popularity === 'number' ? b.popularity : 0
  return bp - ap
}

function mapCredit(c) {
  const mediaType = c?.media_type
  const isMovie = mediaType === 'movie'
  const isTv = mediaType === 'tv'
  if (!isMovie && !isTv) return null

  const title = isMovie ? c?.title : c?.name
  const poster = tmdbImage(c?.poster_path, 'w342')
  const yearRaw = isMovie ? c?.release_date : c?.first_air_date
  const year = typeof yearRaw === 'string' && yearRaw.length >= 4 ? yearRaw.slice(0, 4) : ''

  return {
    id: c?.id,
    title: title || '—',
    poster,
    year,
    type: isMovie ? 'movie' : 'show',
    to: isMovie ? `/movies/${c?.id}` : `/shows/${c?.id}`,
  }
}

export default function ActorDetailPage() {
  const { id } = useParams()

  const [actor, setActor] = useState(null)
  const [credits, setCredits] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [authNonce, setAuthNonce] = useState(0)
  const [tmdbAuthType, setTmdbAuthType] = useState('token')
  const [tmdbAuthValue, setTmdbAuthValue] = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [p, c] = await Promise.all([
          getPerson(id),
          getPersonCombinedCredits(id),
        ])

        const cast = (c?.cast || [])
          .slice()
          .sort(sortByPopularityDesc)
          .map(mapCredit)
          .filter(Boolean)

        if (!cancelled) {
          setActor(p)
          setCredits(cast)
        }
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Hata')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [id, authNonce])

  const isTmdbMissing = typeof error === 'string' && error.toLowerCase().includes('tmdb auth missing')

  const profile = useMemo(() => tmdbImage(actor?.profile_path, 'w342'), [actor?.profile_path])

  const movies = useMemo(() => credits.filter((x) => x.type === 'movie'), [credits])
  const shows = useMemo(() => credits.filter((x) => x.type === 'show'), [credits])

  if (isTmdbMissing) {
    return (
      <div className="max-w-xl">
        <h2 className="text-2xl font-bold mb-2">İçerik için TMDB gerekli</h2>
        <p className="text-white/70 mb-4">`.env` ayarlamadıysan burada bir kere token/api key girip devam edebilirsin.</p>

        <div className="p-4 border border-white/10 rounded bg-black">
          <label className="block text-sm mb-3">
            <div className="text-white/70 mb-1">Auth tipi</div>
            <select
              value={tmdbAuthType}
              onChange={(e) => setTmdbAuthType(e.target.value)}
              className="w-full bg-black border border-white/10 rounded px-3 py-2"
            >
              <option value="token">V4 Access Token (Bearer)</option>
              <option value="apikey">V3 API Key</option>
            </select>
          </label>

          <label className="block text-sm">
            <div className="text-white/70 mb-1">Değer</div>
            <input
              value={tmdbAuthValue}
              onChange={(e) => setTmdbAuthValue(e.target.value)}
              placeholder={tmdbAuthType === 'token' ? 'eyJ...' : 'a1b2c3...'}
              className="w-full bg-black border border-white/10 rounded px-3 py-2"
            />
          </label>

          <div className="flex gap-3 mt-4">
            <button
              type="button"
              className="px-4 py-2 rounded border border-white/15 bg-black hover:bg-white/5"
              onClick={() => {
                const v = (tmdbAuthValue || '').trim()
                if (!v) return
                if (tmdbAuthType === 'token') setTmdbAuth({ accessToken: v })
                else setTmdbAuth({ apiKey: v })
                setError(null)
                setAuthNonce((n) => n + 1)
              }}
            >
              Kaydet ve Yükle
            </button>

            <button
              type="button"
              className="px-4 py-2 rounded border border-white/15 bg-black hover:bg-white/5"
              onClick={() => {
                clearTmdbAuth()
                setTmdbAuthValue('')
              }}
            >
              Temizle
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (loading && !actor) return <Loading />
  if (error) return <ErrorState title="Oyuncu yüklenemedi" message={error} onRetry={() => setAuthNonce((n) => n + 1)} />

  return (
    <div>
      <div className="flex flex-col md:flex-row gap-6 md:items-start mb-8">
        <div className="w-40 md:w-56 flex-shrink-0">
          <img
            src={profile || 'https://via.placeholder.com/342x513?text=No+Image'}
            alt={actor?.name || 'Actor'}
            className="w-full aspect-[2/3] rounded object-cover border border-white/10"
          />
        </div>

        <div className="flex-1">
          <h1 className="text-3xl font-bold">{actor?.name || '—'}</h1>
          <div className="text-white/70 mt-1">{actor?.known_for_department || '—'}</div>
          {actor?.birthday && (
            <div className="text-white/60 text-sm mt-2">Doğum: {actor.birthday}{actor?.place_of_birth ? ` • ${actor.place_of_birth}` : ''}</div>
          )}
          {actor?.biography && (
            <p className="text-white/70 mt-4 leading-relaxed whitespace-pre-line line-clamp-6">{actor.biography}</p>
          )}
        </div>
      </div>

      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-2xl font-bold">Oynadığı Yapımlar</h2>
        <div className="text-sm text-white/60">{credits.length} sonuç</div>
      </div>

      {credits.length ? (
        <div className="space-y-8">
          <section>
            <div className="flex items-baseline justify-between mb-3">
              <h3 className="text-xl font-bold">Filmler</h3>
              <div className="text-sm text-white/60">{movies.length}</div>
            </div>
            {movies.length ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {movies.map((c) => (
                  <PosterCard key={`${c.type}:${c.id}`} show={{ id: c.id, title: c.title, poster: c.poster }} to={c.to} listType="movie" />
                ))}
              </div>
            ) : (
              <p className="text-white/70">Film bulunamadı.</p>
            )}
          </section>

          <section>
            <div className="flex items-baseline justify-between mb-3">
              <h3 className="text-xl font-bold">Diziler</h3>
              <div className="text-sm text-white/60">{shows.length}</div>
            </div>
            {shows.length ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {shows.map((c) => (
                  <PosterCard key={`${c.type}:${c.id}`} show={{ id: c.id, title: c.title, poster: c.poster }} to={c.to} listType="show" />
                ))}
              </div>
            ) : (
              <p className="text-white/70">Dizi bulunamadı.</p>
            )}
          </section>
        </div>
      ) : (
        <p className="text-white/70">Sonuç bulunamadı.</p>
      )}

      {loading && <div className="text-center mt-4 text-white/70">Yükleniyor...</div>}
    </div>
  )
}
