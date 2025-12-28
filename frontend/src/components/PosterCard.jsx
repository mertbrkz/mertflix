import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { isInMyListCached, loadMyList, toggleMyList } from '../services/myListStore'
import { useT } from '../i18n/useT'

export default function PosterCard({ show, to, listType = 'show' }) {
  const navigate = useNavigate()
  const { t } = useT()
  const title = show?.name || show?.title || '—'
  const img =
    show?.image?.medium ||
    show?.image?.original ||
    show?.poster ||
    'https://via.placeholder.com/300x169?text=No+Image'

  const targetTo = to || (listType === 'movie' ? `/movies/${show?.id}` : `/shows/${show?.id}`)
  const [inList, setInList] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function sync() {
      try {
        await loadMyList()
        if (!cancelled) setInList(isInMyListCached(listType, show?.id))
      } catch {
        if (!cancelled) setInList(false)
      }
    }

    sync()

    const onChanged = () => {
      setInList(isInMyListCached(listType, show?.id))
    }

    window.addEventListener('mertflix:mylist:changed', onChanged)
    return () => {
      cancelled = true
      window.removeEventListener('mertflix:mylist:changed', onChanged)
    }
  }, [show?.id, listType])

  async function toggleList(e) {
    e.stopPropagation()
    e.preventDefault()

    await toggleMyList({
      mediaType: listType,
      tmdbId: show.id,
      title,
      posterUrl: img,
    })
    setInList(isInMyListCached(listType, show.id))
  }

  return (
    <div className="group block flex-shrink-0 w-40 sm:w-44 md:w-52" onClick={()=>navigate(targetTo)}>
      <div className="relative w-full h-28 md:h-32 overflow-hidden rounded-md bg-black">
        <img src={img} alt={title} className="w-full h-full object-cover transition-transform duration-[450ms] group-hover:scale-105" />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200"></div>

        <button
          onClick={toggleList}
          aria-label={inList ? t('details_remove_from_list') : t('details_add_to_list')}
          title={inList ? t('details_remove_from_list') : t('details_add_to_list')}
          className="absolute top-2 right-2 z-20 h-8 w-8 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-150"
        >
          {inList ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414L9 14.414 5.293 10.707a1 1 0 011.414-1.414L9 11.586l6.293-6.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          )}
        </button>
      </div>
      <div className="mt-2 text-sm font-medium truncate">{title}</div>
    </div>
  )
}
