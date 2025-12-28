import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import Loading from '../components/Loading'
import ErrorState from '../components/ErrorState'
import { getTv, getTvSeason, tmdbImage } from '../services/tmdb'
import { deleteComment, fetchComments, postComment, voteComment } from '../services/commentsApi'
import { isInMyListCached, loadMyList, toggleMyList } from '../services/myListStore'
import { isWatchedCached, loadWatched, toggleWatched } from '../services/watchedStore'
import { useLanguageNonce } from '../hooks/useLanguageNonce'
import { useT } from '../i18n/useT'

export default function ShowDetailPage() {
  const { id } = useParams()
  const tvId = Number(id)
  const langNonce = useLanguageNonce()

  const { t } = useT()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [show, setShow] = useState(null)
  const [episodes, setEpisodes] = useState([])
  const [cast, setCast] = useState([])
  const [season, setSeason] = useState(1)
  const [inList, setInList] = useState(false)
  const [isWatched, setIsWatched] = useState(false)
  const [reloadNonce, setReloadNonce] = useState(0)

  const [comments, setComments] = useState([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [commentsError, setCommentsError] = useState(null)
  const [commentBody, setCommentBody] = useState('')
  const [posting, setPosting] = useState(false)
  const [commentsNonce, setCommentsNonce] = useState(0)
  const [commentActionId, setCommentActionId] = useState(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    async function load() {
      setLoading(true); setError(null)
      try {
        if (!Number.isFinite(tvId)) throw new Error(t('show_invalid'))

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
          try {
            await loadMyList()
            setInList(isInMyListCached('show', showJson.id))
          } catch {
            setInList(false)
          }

          try {
            await loadWatched()
            setIsWatched(isWatchedCached('show', showJson.id))
          } catch {
            setIsWatched(false)
          }
        }
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally { if (!cancelled) setLoading(false) }
    }
    load()
    return () => { cancelled = true }
  }, [tvId, id, reloadNonce, langNonce])

  useEffect(() => {
    if (!show?.id || !season) return
    let cancelled = false

    async function loadSeason() {
      try {
        const seasonJson = await getTvSeason(show.id, season)
        if (!cancelled) setEpisodes(seasonJson?.episodes || [])
      } catch {
        if (!cancelled) setEpisodes([])
      }
    }

    loadSeason()
    return () => { cancelled = true }
  }, [show?.id, season, langNonce])

  useEffect(() => {
    let cancelled = false

    async function sync() {
      if (!Number.isFinite(tvId)) return
      try {
        await loadMyList()
        if (!cancelled) setInList(isInMyListCached('show', tvId))
      } catch {
        if (!cancelled) setInList(false)
      }

      try {
        await loadWatched()
        if (!cancelled) setIsWatched(isWatchedCached('show', tvId))
      } catch {
        if (!cancelled) setIsWatched(false)
      }
    }

    sync()

    const onChanged = () => {
      setInList(isInMyListCached('show', tvId))
    }

    const onWatchedChanged = () => {
      setIsWatched(isWatchedCached('show', tvId))
    }

    window.addEventListener('mertflix:mylist:changed', onChanged)
    window.addEventListener('mertflix:watched:changed', onWatchedChanged)
    return () => {
      cancelled = true
      window.removeEventListener('mertflix:mylist:changed', onChanged)
      window.removeEventListener('mertflix:watched:changed', onWatchedChanged)
    }
  }, [tvId])

  useEffect(() => {
    let cancelled = false

    async function loadC() {
      if (!Number.isFinite(tvId)) return
      setCommentsLoading(true)
      setCommentsError(null)
      try {
        const c = await fetchComments('show', tvId)
        if (!cancelled) setComments(c)
      } catch (e) {
        if (!cancelled) setCommentsError(e?.message || t('comments_load_failed'))
      } finally {
        if (!cancelled) setCommentsLoading(false)
      }
    }

    loadC()
    return () => {
      cancelled = true
    }
  }, [tvId, commentsNonce])

  if (loading) return <Loading />
  if (error) return <ErrorState title={t('show_load_failed')} message={error} onRetry={() => setReloadNonce((n) => n + 1)} />
  if (!show) return null

  const seasons = (show.seasons || [])
    .map((s) => s?.season_number)
    .filter((n) => Number.isFinite(Number(n)) && Number(n) > 0)
    .sort((a, b) => a - b)

  const seasonEpisodes = episodes || []

  const poster = tmdbImage(show.poster_path, 'w500')

  async function toggleList() {
    if (!show) return
    await toggleMyList({
      mediaType: 'show',
      tmdbId: show.id,
      title: show.name,
      posterUrl: poster,
    })
    setInList(isInMyListCached('show', show.id))
  }

  async function toggleWatchedState() {
    if (!show) return
    await toggleWatched({
      mediaType: 'show',
      tmdbId: show.id,
      title: show.name,
      posterUrl: poster,
    })
    setIsWatched(isWatchedCached('show', show.id))
  }

  async function submitComment(e) {
    e.preventDefault()
    if (!Number.isFinite(tvId)) return

    const body = String(commentBody || '').trim()
    if (body.length < 2) return

    setPosting(true)
    setCommentsError(null)
    try {
      await postComment('show', tvId, body)
      setCommentBody('')
      setCommentsNonce((n) => n + 1)
    } catch (err) {
      setCommentsError(typeof err?.message === 'string' ? err.message : t('comment_post_failed'))
    } finally {
      setPosting(false)
    }
  }

  function avatarUrlFor(style, seed) {
    const safeStyle = String(style || 'identicon')
    const safeSeed = String(seed || 'anon')
    return `https://api.dicebear.com/8.x/${encodeURIComponent(safeStyle)}/svg?seed=${encodeURIComponent(safeSeed)}`
  }

  async function onDeleteComment(commentId) {
    setCommentActionId(commentId)
    setCommentsError(null)
    try {
      await deleteComment(commentId)
      setCommentsNonce((n) => n + 1)
    } catch (err) {
      setCommentsError(typeof err?.message === 'string' ? err.message : t('comment_delete_failed'))
    } finally {
      setCommentActionId(null)
    }
  }

  async function onVoteComment(commentId, value, currentVote) {
    const nextValue = currentVote === value ? 0 : value
    setCommentActionId(commentId)
    setCommentsError(null)
    try {
      await voteComment(commentId, nextValue)
      setCommentsNonce((n) => n + 1)
    } catch (err) {
      setCommentsError(typeof err?.message === 'string' ? err.message : t('comment_vote_failed'))
    } finally {
      setCommentActionId(null)
    }
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
            {show.original_language?.toUpperCase() || '—'} · {(show.episode_run_time?.[0] ? show.episode_run_time[0] + 'm' : '—')} · {(show.genres || []).map((g) => g.name).join(' · ') || t('show_genre_unset')}
          </div>
          <div className="max-w-none text-white mt-4">
            {show.overview || t('details_summary_missing')}
          </div>

          <div className="mt-4 flex gap-3">
            <button onClick={toggleList} className="px-4 py-2 rounded border border-white/15 bg-black hover:bg-white/5">
              {inList ? t('details_remove_from_list') : t('details_add_to_list')}
            </button>
            <button onClick={toggleWatchedState} className="px-4 py-2 rounded border border-white/15 bg-black hover:bg-white/5">
              {isWatched ? t('details_watched_checked') : t('details_watched')}
            </button>
          </div>
        </div>
      </div>

      <section>
        <div className="flex items-end justify-between gap-4 mb-3">
          <h2 className="text-2xl font-semibold">{t('show_episodes')}</h2>
          <label className="text-sm">
            <div className="text-white/70 mb-1">{t('show_season')}</div>
            <select value={season} onChange={(e)=>setSeason(Number(e.target.value))} className="bg-black border border-white/10 rounded px-3 py-2">
              {seasons.map((s) => (
                <option key={s} value={s}>{t('show_season_n')} {s}</option>
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
        <h2 className="text-2xl font-semibold mb-3">{t('details_cast')}</h2>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 list-none p-0">
          {cast.map((c, i) => (
            <li key={i} className="p-2 bg-black/60 rounded">{c.person?.name} as <em>{c.character?.name}</em></li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-3">{t('comments_title')}</h2>

        <form onSubmit={submitComment} className="space-y-3 p-4 bg-black border border-white/10 rounded">
          <textarea
            value={commentBody}
            onChange={(e) => setCommentBody(e.target.value)}
            placeholder={t('comments_placeholder')}
            rows={3}
            className="w-full bg-black border border-white/10 rounded px-3 py-2 outline-none focus:ring-2 focus:ring-white/20"
          />
          <div className="flex items-center justify-between">
            <div className="text-xs text-white/60">{t('comments_min_chars')}</div>
            <button
              type="submit"
              disabled={posting || String(commentBody || '').trim().length < 2}
              className="px-4 py-2 rounded border border-white/15 bg-black hover:bg-white/5 disabled:opacity-50"
            >
              {posting ? t('comments_submitting') : t('comments_submit')}
            </button>
          </div>
          {commentsError ? (
            <div className="text-sm text-red-200">{commentsError}</div>
          ) : null}
        </form>

        {commentsLoading ? (
          <div className="text-white/70 mt-4">{t('comments_loading')}</div>
        ) : null}

        {!commentsLoading && comments.length === 0 ? (
          <div className="text-white/70 mt-4">{t('comments_none')}</div>
        ) : null}

        {comments.length ? (
          <div className="mt-4 space-y-3">
            {comments.map((c) => (
              <div key={c.id} className="p-4 bg-black border border-white/10 rounded">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={avatarUrlFor(c.avatar_style, c.avatar_seed)}
                      alt={c.user_username || c.user_email || t('comments_user_fallback')}
                      className="w-10 h-10 rounded-full border border-white/10 bg-black"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{c.user_username || c.user_email}</div>
                      <div className="text-xs text-white/60">{c.created_at ? new Date(c.created_at).toLocaleString() : ''}</div>
                    </div>
                  </div>

                  {c.can_delete ? (
                    <button
                      type="button"
                      onClick={() => onDeleteComment(c.id)}
                      disabled={commentActionId === c.id}
                      className="px-3 py-1 rounded border border-white/15 bg-black hover:bg-white/5 disabled:opacity-50"
                    >
                      {t('comment_delete')}
                    </button>
                  ) : null}
                </div>

                <div className="mt-3 text-white/90 whitespace-pre-wrap">{c.body}</div>

                <div className="mt-3 flex items-center justify-end gap-2">
                  <div className="text-xs text-white/70">↑ {c.upvotes ?? 0} · ↓ {c.downvotes ?? 0}</div>
                  {!c.can_delete ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onVoteComment(c.id, 1, c.my_vote)}
                        disabled={commentActionId === c.id}
                        className={`px-3 py-1 rounded border border-white/15 hover:bg-white/5 disabled:opacity-50 ${c.my_vote === 1 ? 'bg-white/10' : 'bg-black'}`}
                      >
                        Up
                      </button>
                      <button
                        type="button"
                        onClick={() => onVoteComment(c.id, -1, c.my_vote)}
                        disabled={commentActionId === c.id}
                        className={`px-3 py-1 rounded border border-white/15 hover:bg-white/5 disabled:opacity-50 ${c.my_vote === -1 ? 'bg-white/10' : 'bg-black'}`}
                      >
                        Down
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  )
}
