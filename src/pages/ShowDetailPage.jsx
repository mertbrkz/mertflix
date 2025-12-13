import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getTv, getTvSeason, tmdbImage } from '../services/tmdb'
import { isInMyList, toggleMyListItem, MY_LIST_KEY, readMyList } from '../services/myList'

export default function ShowDetailPage() {
  const { id } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [show, setShow] = useState(null)
  const [episodes, setEpisodes] = useState([])
  const [cast, setCast] = useState([])
  const [season, setSeason] = useState(1)
  const [inList, setInList] = useState(false)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    async function load() {
      setLoading(true); setError(null)
      try {
        const tvId = Number(id)
        if (!Number.isFinite(tvId)) throw new Error('Geçersiz dizi')

        const showJson = await getTv(tvId)
        const seasonNumbers = (showJson?.seasons || [])
          .map((s) => s?.season_number)
          .filter((n) => Number.isFinite(Number(n)) && Number(n) > 0)
          .sort((a, b) => a - b)

        const initialSeason = seasonNumbers[0] || 1
        const seasonJson = await getTvSeason(tvId, initialSeason)

        if (!cancelled) {
          setShow(showJson)
          setSeason(initialSeason)
          setEpisodes(seasonJson?.episodes || [])
          setCast((showJson?.credits?.cast || []).map((c) => ({ person: { name: c.name }, character: { name: c.character } })))
          setInList(isInMyList('show', showJson.id))
        }
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally { if (!cancelled) setLoading(false) }
    }
    load()
    return () => { cancelled = true }
  }, [id])

  useEffect(() => {
    if (!show?.id || !season) return
    let cancelled = false

    async function loadSeason() {
      try {
        const seasonJson = await getTvSeason(show.id, season)
        if (!cancelled) setEpisodes(seasonJson?.episodes || [])
      } catch (e) {
        if (!cancelled) setEpisodes([])
      }
    }

    loadSeason()
    return () => { cancelled = true }
  }, [show?.id, season])

  useEffect(() => {
    const onStorage = (e) => {
      if (!e || e.key === MY_LIST_KEY) {
        if (show?.id) setInList(isInMyList('show', show.id))
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [show?.id])

  if (loading) return <div className="text-center py-8">Yükleniyor...</div>
  if (error) return <div className="text-center py-8 text-rose-500">Hata: {error}</div>
  if (!show) return null

  const seasons = (show.seasons || [])
    .map((s) => s?.season_number)
    .filter((n) => Number.isFinite(Number(n)) && Number(n) > 0)
    .sort((a, b) => a - b)

  const seasonEpisodes = episodes || []

  const poster = tmdbImage(show.poster_path, 'w500')

  function toggleList() {
    toggleMyListItem({
      type: 'show',
      id: show.id,
      name: show.name,
      image: poster,
      genres: (show.genres || []).map((g) => g?.name).filter(Boolean),
      genreIds: (show.genres || []).map((g) => g?.id).filter(Boolean),
    })
    setInList(readMyList().some((x) => x.key === `show:${show.id}`))
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-6">
        <img src={poster || 'https://via.placeholder.com/210x295?text=No+Image'} alt={show.name} className="w-48 h-auto rounded-lg object-cover" />
        <div>
          <h1 className="text-3xl font-bold">
            {show.name}{' '}
            {show.first_air_date ? `(${String(show.first_air_date).slice(0, 4)})` : ''}
          </h1>
          <div className="text-sm text-white/70 mt-2">
            {show.original_language?.toUpperCase() || '—'} · {(show.episode_run_time?.[0] ? show.episode_run_time[0] + 'm' : '—')} · {(show.genres || []).map((g) => g.name).join(' · ') || 'Tür belirtilmemiş'}
          </div>
          <div className="max-w-none text-white mt-4">
            {show.overview || 'Özet yok.'}
          </div>

          <div className="mt-4 flex gap-3">
            <button onClick={toggleList} className="px-4 py-2 rounded border border-white/15 bg-black hover:bg-white/5">
              {inList ? 'Listemden çıkar' : 'Listeme ekle'}
            </button>
          </div>
        </div>
      </div>

      <section>
        <div className="flex items-end justify-between gap-4 mb-3">
          <h2 className="text-2xl font-semibold">Bölümler</h2>
          <label className="text-sm">
            <div className="text-white/70 mb-1">Sezon</div>
            <select value={season} onChange={(e)=>setSeason(Number(e.target.value))} className="bg-black border border-white/10 rounded px-3 py-2">
              {seasons.map((s) => (
                <option key={s} value={s}>Sezon {s}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {seasonEpisodes.map((ep) => (
            <div key={ep.id || `${ep.episode_number}-${ep.name}`} className="p-3 bg-black/60 rounded">
              <div className="font-medium">S{season} · E{ep.episode_number} — {ep.name}</div>
              <div className="text-sm text-white/70">{ep.air_date || '—'} · {ep.runtime ? ep.runtime + 'm' : '—'}</div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-3">Oyuncular</h2>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 list-none p-0">
          {cast.map((c, i) => (
            <li key={i} className="p-2 bg-black/60 rounded">{c.person?.name} as <em>{c.character?.name}</em></li>
          ))}
        </ul>
      </section>
    </div>
  )
}
