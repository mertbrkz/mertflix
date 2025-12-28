import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import Loading from '../components/Loading'
import ErrorState from '../components/ErrorState'
import { getMovie, tmdbImage } from '../services/tmdb'
import { deleteComment, fetchComments, postComment, voteComment } from '../services/commentsApi'
import { isInMyListCached, loadMyList, toggleMyList } from '../services/myListStore'
import { isWatchedCached, loadWatched, toggleWatched } from '../services/watchedStore'
import { useLanguageNonce } from '../hooks/useLanguageNonce'
import { useT } from '../i18n/useT'

export default function MovieDetailPage() {
  const { id } = useParams()
  const movieId = Number(id)

  const { t } = useT()

  const langNonce = useLanguageNonce()

  const [movie, setMovie] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
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
    let cancelled = false

    async function sync() {
      try {
        await loadMyList()
        if (!cancelled) setInList(isInMyListCached('movie', movieId))
      } catch {
        if (!cancelled) setInList(false)
      }

      try {
        await loadWatched()
        if (!cancelled) setIsWatched(isWatchedCached('movie', movieId))
      } catch {
        if (!cancelled) setIsWatched(false)
      }
    }

    sync()

    const onChanged = () => {
      setInList(isInMyListCached('movie', movieId))
    }

    const onWatchedChanged = () => {
      setIsWatched(isWatchedCached('movie', movieId))
    }

    window.addEventListener('mertflix:mylist:changed', onChanged)
    window.addEventListener('mertflix:watched:changed', onWatchedChanged)
    return () => {
      cancelled = true
      window.removeEventListener('mertflix:mylist:changed', onChanged)
      window.removeEventListener('mertflix:watched:changed', onWatchedChanged)
    }
  }, [movieId])

  useEffect(() => {
    let cancelled = false

    async function loadC() {
      if (!Number.isFinite(movieId)) return
      setCommentsLoading(true)
      setCommentsError(null)
      try {
        const c = await fetchComments('movie', movieId)
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
  }, [movieId, commentsNonce])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const data = await getMovie(movieId)
        if (!cancelled) setMovie(data)
      } catch (e) {
        if (!cancelled) setError(e?.message || t('common_error'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    if (!Number.isFinite(movieId)) {
      setError(t('movie_invalid'))
      setLoading(false)
      return
    }

    load()
    return () => {
      cancelled = true
    }
  }, [movieId, reloadNonce, langNonce])


  const poster = useMemo(() => tmdbImage(movie?.poster_path, 'w500'), [movie?.poster_path])
  const backdrop = useMemo(() => tmdbImage(movie?.backdrop_path, 'w1280'), [movie?.backdrop_path])

  async function toggle() {
    if (!movie) return
    await toggleMyList({
      mediaType: 'movie',
      tmdbId: movie.id,
      title: movie.title,
      posterUrl: poster,
    })
    setInList(isInMyListCached('movie', movie.id))
  }

  async function toggleWatchedState() {
    if (!movie) return
    await toggleWatched({
      mediaType: 'movie',
      tmdbId: movie.id,
      title: movie.title,
      posterUrl: poster,
    })
    setIsWatched(isWatchedCached('movie', movie.id))
  }

  async function submitComment(e) {
    e.preventDefault()
    if (!Number.isFinite(movieId)) return

    const body = String(commentBody || '').trim()
    if (body.length < 2) return

    setPosting(true)
    setCommentsError(null)
    try {
      await postComment('movie', movieId, body)
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

  if (loading) return <Loading />
  if (error) return <ErrorState title={t('movie_load_failed')} message={error} onRetry={() => setReloadNonce((n) => n + 1)} />
  if (!movie) return <div className="text-white/70">{t('movie_not_found')}</div>

  return (
    <div>
      <div
        className="relative rounded overflow-hidden border border-white/10"
        style={backdrop ? { backgroundImage: `url(${backdrop})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
      >
        <div className="absolute inset-0 bg-black/70" />
        <div className="relative p-6 md:p-10 flex gap-6 flex-col md:flex-row">
          {poster && (
            <img src={poster} alt={movie.title} className="w-44 md:w-56 rounded border border-white/10 object-cover" />
          )}
          <div className="flex-1">
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-3xl font-bold">{movie.title}</h1>
              <div className="flex flex-col items-end gap-2">
                <button
                  onClick={toggle}
                  className="px-4 py-2 rounded border border-white/15 bg-black hover:bg-white/5"
                  title={inList ? t('details_remove_from_list') : t('details_add_to_list')}
                >
                  {inList ? t('details_in_my_list') : `+ ${t('details_add_to_list')}`}
                </button>
                <button
                  onClick={toggleWatchedState}
                  className="px-4 py-2 rounded border border-white/15 bg-black hover:bg-white/5"
                  title={isWatched ? t('details_watched_checked') : t('details_watched')}
                >
                  {isWatched ? t('details_watched_checked') : t('details_watched')}
                </button>
              </div>
            </div>

            <div className="text-white/70 mt-2">
              {movie.release_date ? movie.release_date.slice(0, 4) : '—'} · {movie.runtime ? `${movie.runtime} dk` : '—'} · {movie.vote_average != null ? movie.vote_average.toFixed(1) : '—'}
            </div>

            {movie.genres?.length ? (
              <div className="text-white/70 mt-2">{movie.genres.map((g) => g.name).join(' · ')}</div>
            ) : null}

            <div className="mt-4 text-white/90 max-w-3xl">{movie.overview || t('details_summary_missing')}</div>
          </div>
        </div>
      </div>

      {movie.credits?.cast?.length ? (
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-3">{t('details_cast')}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {movie.credits.cast.slice(0, 15).map((c) => (
              <div key={c.id} className="p-3 bg-black border border-white/10 rounded">
                <div className="font-semibold leading-snug">{c.name}</div>
                <div className="text-sm text-white/60">{c.character}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-10">
        <h2 className="text-xl font-bold mb-3">{t('comments_title')}</h2>

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
      </div>
    </div>
  )
}
