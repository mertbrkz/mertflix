import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getWatchedCached, loadWatched } from '../services/watchedStore'
import { useT } from '../i18n/useT'
import Loading from '../components/Loading'
import ErrorState from '../components/ErrorState'

export default function WatchedHistory() {
  const { t } = useT()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function sync() {
      setLoading(true)
      setError(null)
      try {
        const list = await loadWatched({ force: true })
        if (!cancelled) setItems(list)
      } catch (e) {
        if (!cancelled) {
          setError(e?.message || t('watched_load_failed'))
          setItems([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    sync()

    const onChanged = () => {
      setItems(getWatchedCached())
    }

    window.addEventListener('mertflix:watched:changed', onChanged)
    return () => {
      cancelled = true
      window.removeEventListener('mertflix:watched:changed', onChanged)
    }
  }, [])

  if (loading) {
    return <Loading />
  }

  if (error) {
    return <ErrorState title={t('watched_load_failed')} message={error} />
  }

  if (!items || items.length === 0) {
    return <div className="text-white/70">{t('watched_empty')}</div>
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">{t('nav_watched')}</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {items.map((it) => (
          <div key={`${it.media_type}:${it.tmdb_id}`} className="p-3 bg-black border border-white/10 rounded-md">
            <div className="flex items-center gap-3">
              {it.poster_url ? (
                <img src={it.poster_url} alt={it.title || 'Poster'} className="w-16 h-24 rounded object-cover" />
              ) : null}
              <div className="flex-1">
                <div className="font-semibold">{it.title || '—'}</div>
                {it.created_at ? (
                  <div className="text-xs text-white/60 mt-1">{new Date(it.created_at).toLocaleString()}</div>
                ) : null}
              </div>
              <div className="flex flex-col gap-2 items-end">
                <Link
                  to={it.media_type === 'movie' ? `/movies/${it.tmdb_id}` : `/shows/${it.tmdb_id}`}
                  className="underline text-sm"
                >
                  {t('common_open')}
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
