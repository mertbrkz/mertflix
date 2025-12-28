import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { isInMyListCached, loadMyList, toggleMyList } from '../services/myListStore'
import { useT } from '../i18n/useT'

const ShowCard = ({ show }) => {
  const { t } = useT()
  const imageUrl = show.image?.medium || 'https://via.placeholder.com/640x360?text=No+Image'
  const [inList, setInList] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function sync() {
      try {
        await loadMyList()
        if (!cancelled) setInList(isInMyListCached('show', show.id))
      } catch {
        if (!cancelled) setInList(false)
      }
    }

    sync()

    const onChanged = () => {
      setInList(isInMyListCached('show', show.id))
    }

    window.addEventListener('mertflix:mylist:changed', onChanged)
    return () => {
      cancelled = true
      window.removeEventListener('mertflix:mylist:changed', onChanged)
    }
  }, [show.id])

  async function toggleList(e) {
    e.preventDefault()
    e.stopPropagation()
    await toggleMyList({
      mediaType: 'show',
      tmdbId: show.id,
      title: show.name,
      posterUrl: imageUrl,
    })
    setInList(isInMyListCached('show', show.id))
  }

  return (
    <Link to={`/shows/${show.id}`} className="block">
      <article className="relative bg-black border border-white/10 rounded-2xl overflow-hidden transition-transform duration-300 hover:-translate-y-0.5">
        <img src={imageUrl} alt={show.name} className="w-full h-56 object-cover" />

        <button
          onClick={toggleList}
          aria-label={inList ? t('details_remove_from_list') : t('details_add_to_list')}
          title={inList ? t('details_remove_from_list') : t('details_add_to_list')}
          className="absolute top-3 right-3 h-9 w-9 rounded-full bg-black/60 border border-white/20 flex items-center justify-center"
        >
          {inList ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414L9 14.414 5.293 10.707a1 1 0 011.414-1.414L9 11.586l6.293-6.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          )}
        </button>
        <div className="p-4">
          <h3 className="text-xl font-bold truncate">{show.name}</h3>
          <p className="mt-1 text-white/70 text-sm">{show.genres?.join(', ') || t('show_genre_unset')}</p>
          {show.rating?.average && (
            <div className="mt-2 flex items-center gap-1">
              <span className="text-white">⭐</span>
              <span className="text-sm font-semibold">{show.rating.average}</span>
            </div>
          )}
        </div>
      </article>
    </Link>
  )
}

export default ShowCard
