import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { clearTmdbAuth, getPopularPeople, searchPeople, setTmdbAuth, tmdbImage } from '../services/tmdb'

const PAGE_SIZE = 20

function mapPerson(p) {
  return {
    id: p.id,
    name: p.name || '—',
    knownFor: p.known_for_department || '—',
    popularity: typeof p.popularity === 'number' ? p.popularity : null,
    profile: tmdbImage(p.profile_path, 'w342'),
  }
}

export default function ActorsPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [apiPage, setApiPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [uiPage, setUiPage] = useState(1)

  const [q, setQ] = useState('')
  const [activeQuery, setActiveQuery] = useState('')

  const [authNonce, setAuthNonce] = useState(0)
  const [tmdbAuthType, setTmdbAuthType] = useState('token')
  const [tmdbAuthValue, setTmdbAuthValue] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadFirst() {
      setLoading(true)
      setError(null)
      try {
        const data = activeQuery
          ? await searchPeople(activeQuery, 1)
          : await getPopularPeople(1)
        const results = (data?.results || []).map(mapPerson)
        if (!cancelled) {
          setItems(results)
          setApiPage(1)
          setUiPage(1)
          setHasMore((data?.page || 1) < (data?.total_pages || 1))
        }
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Hata')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadFirst()
    return () => {
      cancelled = true
    }
  }, [authNonce, activeQuery])

  async function ensureLoadedForUiPage(targetUiPage) {
    if (loading) return
    if (!hasMore) return

    const needed = targetUiPage * PAGE_SIZE
    if (items.length >= needed) return

    setLoading(true)
    setError(null)
    try {
      let nextApiPage = apiPage
      let nextItems = items

      while (nextItems.length < needed) {
        nextApiPage += 1
        const data = activeQuery
          ? await searchPeople(activeQuery, nextApiPage)
          : await getPopularPeople(nextApiPage)
        const batch = (data?.results || []).map(mapPerson)
        nextItems = [...nextItems, ...batch]

        const more = (data?.page || nextApiPage) < (data?.total_pages || nextApiPage)
        setHasMore(!!more)
        if (!more || batch.length === 0) break
      }

      setItems(nextItems)
      setApiPage(nextApiPage)
    } catch (e) {
      setError(e?.message || 'Hata')
    } finally {
      setLoading(false)
    }
  }

  const start = (uiPage - 1) * PAGE_SIZE
  const pageItems = items.slice(start, start + PAGE_SIZE)

  const canPrev = uiPage > 1
  const canNext = start + PAGE_SIZE < items.length || hasMore

  async function goNext() {
    if (!canNext) return
    const next = uiPage + 1
    await ensureLoadedForUiPage(next)
    setUiPage(next)
  }

  function goPrev() {
    if (!canPrev) return
    setUiPage((p) => Math.max(1, p - 1))
  }

  const isTmdbMissing = typeof error === 'string' && error.toLowerCase().includes('tmdb auth missing')

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
                setItems([])
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

  if (error) return <h2 className="text-xl text-center mt-10 text-white">Hata: {error}</h2>

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold">Popüler Oyuncular</h2>
          <div className="text-sm text-white/70 mt-1">Sayfa: {uiPage}{hasMore ? ' (devamı var)' : ''}</div>
        </div>

        <div className="flex items-center gap-2 sm:justify-end">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const next = (q || '').trim()
                setActiveQuery(next)
                setItems([])
                setApiPage(1)
                setUiPage(1)
                setHasMore(true)
              }
            }}
            placeholder="Aktör ara..."
            className="w-full sm:w-72 bg-black border border-white/10 text-white placeholder-white/60 px-3 py-2 rounded outline-none focus:ring-2 focus:ring-white/20"
          />
          <button
            type="button"
            className="px-4 py-2 rounded border border-white/15 bg-black hover:bg-white/5"
            onClick={() => {
              const next = (q || '').trim()
              setActiveQuery(next)
              setItems([])
              setApiPage(1)
              setUiPage(1)
              setHasMore(true)
            }}
          >
            Ara
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {pageItems.length ? (
          pageItems.map((p) => (
            <div
              key={p.id}
              className="p-3 bg-black border border-white/10 rounded cursor-pointer hover:bg-white/5"
              onClick={() => navigate(`/actors/${p.id}`)}
            >
              <img
                src={p.profile || 'https://via.placeholder.com/342x513?text=No+Image'}
                alt={p.name}
                className="w-full aspect-[2/3] rounded object-cover"
                loading="lazy"
              />
              <div className="mt-2 font-semibold leading-snug line-clamp-2">{p.name}</div>
              <div className="text-sm text-white/60">{p.knownFor}</div>
            </div>
          ))
        ) : (
          <p className="text-center col-span-full text-white/70">Sonuç bulunamadı.</p>
        )}
      </div>

      <div className="flex items-center justify-center gap-3 mt-10">
        <button
          onClick={goPrev}
          disabled={!canPrev || loading}
          className="px-4 py-2 rounded border border-white/15 bg-black hover:bg-white/5 disabled:opacity-50"
        >
          Önceki
        </button>
        <div className="text-sm text-white/70">{uiPage}</div>
        <button
          onClick={goNext}
          disabled={!canNext || loading}
          className="px-4 py-2 rounded border border-white/15 bg-black hover:bg-white/5 disabled:opacity-50"
        >
          Sonraki
        </button>
      </div>

      {loading && <div className="text-center mt-4 text-white/70">Yükleniyor...</div>}
    </div>
  )
}
