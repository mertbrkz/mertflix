import { useEffect, useState } from 'react'
import { discoverMovies, tmdbImage } from '../services/tmdb'
import { useLanguageNonce } from '../hooks/useLanguageNonce'

export default function PosterGridBackground() {
  const [posterUrls, setPosterUrls] = useState([])
  const [loading, setLoading] = useState(true)
  const langNonce = useLanguageNonce()

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const p1 = await discoverMovies(1)
        const urls = (p1?.results || [])
          .map((m) => tmdbImage(m.poster_path, 'w342'))
          .filter(Boolean)

        if (!cancelled) setPosterUrls(urls)
      } catch {
        if (!cancelled) setPosterUrls([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [langNonce])

  const gridCount = 24

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="fixed inset-0 grid grid-cols-4 md:grid-cols-6">
        {Array.from({ length: gridCount }, (_, i) => {
          const url = posterUrls.length ? posterUrls[i % posterUrls.length] : null
          return (
            <div key={i} className="relative aspect-[2/3]">
              {url ? (
                <img
                  src={url}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <div className="absolute inset-0 bg-slate-800/70" />
              )}
            </div>
          )
        })}
      </div>

      <div className="absolute inset-0 bg-black/60" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.15)_0%,rgba(0,0,0,0.85)_70%,rgba(0,0,0,0.95)_100%)]" />

      {loading ? (
        <div className="absolute inset-0 bg-black flex items-center justify-center">
          <div className="h-10 w-10 rounded-full border-2 border-white/20 border-t-white animate-spin" />
        </div>
      ) : null}
    </div>
  )
}
