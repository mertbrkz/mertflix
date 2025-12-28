import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import MovieCard from '../components/MovieCard'
import Loading from '../components/Loading'
import ErrorState from '../components/ErrorState'
import { useLanguageNonce } from '../hooks/useLanguageNonce'
import { useT } from '../i18n/useT'
import {
  discoverMovies,
  searchMovies,
  discoverTv,
  searchTv,
  getMovieGenres,
  getTvGenres,
  tmdbImage,
  setTmdbAuth,
  clearTmdbAuth,
} from '../services/tmdb'

const PAGE_SIZE = 30

const YEAR_BUCKETS = [
  { key: 'any', labelKey: 'listing_year_any' },
  { key: '2025', label: '2025', from: 2025, to: 2025 },
  { key: '2024', label: '2024', from: 2024, to: 2024 },
  { key: '2023', label: '2023', from: 2023, to: 2023 },
  { key: '2022', label: '2022', from: 2022, to: 2022 },
  { key: '2016_2021', labelKey: 'listing_year_2016_2021', from: 2016, to: 2021 },
  { key: '2010_2015', labelKey: 'listing_year_2010_2015', from: 2010, to: 2015 },
  { key: '2004_2009', labelKey: 'listing_year_2004_2009', from: 2004, to: 2009 },
  { key: '2001_2003', labelKey: 'listing_year_2001_2003', from: 2001, to: 2003 },
  { key: 'lte_2000', labelKey: 'listing_year_lte_2000', from: null, to: 2000 },
]

function bucketToYearRange(key, buckets) {
  const found = (buckets || YEAR_BUCKETS).find((b) => b.key === key)
  if (!found || found.key === 'any') return { from: null, to: null }
  return { from: found.from ?? null, to: found.to ?? null }
}

const ShowListingPage = ({ variant = 'shows' }) => {
  const { t } = useT()
  const [shows, setShows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const location = useLocation()

  const langNonce = useLanguageNonce()

  const [apiPage, setApiPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [sortBy, setSortBy] = useState('title')

  const [filtersOpen, setFiltersOpen] = useState(false)
  const [minRatingBucket, setMinRatingBucket] = useState('any')
  const [yearBucket, setYearBucket] = useState('any')
  const [selectedGenreIds, setSelectedGenreIds] = useState([])
  const [genreOptions, setGenreOptions] = useState([])

  const [uiPage, setUiPage] = useState(1)

  const [authNonce, setAuthNonce] = useState(0)
  const [tmdbAuthType, setTmdbAuthType] = useState('token')
  const [tmdbAuthValue, setTmdbAuthValue] = useState('')

  const query = new URLSearchParams(location.search).get('q')
  const mode = query && query.trim() ? 'search' : 'all'

  const title = variant === 'movies'
    ? (mode === 'search' ? t('listing_movies_search_title') : t('listing_movies_all_title'))
    : (mode === 'search' ? t('listing_shows_search_title') : t('listing_shows_all_title'))

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
    return {
      id: t.id,
      title: t.name || t.original_name || '—',
      year: t.first_air_date ? Number(String(t.first_air_date).slice(0, 4)) : null,
      rating: typeof t.vote_average === 'number' ? t.vote_average : null,
      poster: tmdbImage(t.poster_path, 'w342'),
      genreIds: Array.isArray(t.genre_ids) ? t.genre_ids : [],
    }
  }

  const effectiveMinRating = useMemo(() => {
    if (minRatingBucket === 'any') return null
    const n = Number(minRatingBucket)
    return Number.isFinite(n) ? n : null
  }, [minRatingBucket])

  const effectiveYearRange = useMemo(() => bucketToYearRange(yearBucket, YEAR_BUCKETS), [yearBucket])

  const discoverParams = useMemo(() => {
    const params = {}

    if (effectiveMinRating != null) {
      params['vote_average.gte'] = effectiveMinRating
    }

    const yFrom = effectiveYearRange?.from ?? null
    const yTo = effectiveYearRange?.to ?? null
    const hasFrom = yFrom != null
    const hasTo = yTo != null

    if (variant === 'movies') {
      if (hasFrom) params['primary_release_date.gte'] = `${yFrom}-01-01`
      if (hasTo) params['primary_release_date.lte'] = `${yTo}-12-31`
    } else {
      if (hasFrom) params['first_air_date.gte'] = `${yFrom}-01-01`
      if (hasTo) params['first_air_date.lte'] = `${yTo}-12-31`
    }

    if (Array.isArray(selectedGenreIds) && selectedGenreIds.length) {
      params.with_genres = selectedGenreIds.join(',')
    }

    return params
  }, [effectiveMinRating, effectiveYearRange, selectedGenreIds, variant])

  useEffect(() => {
    let cancelled = false
    const loadGenres = async () => {
      try {
        const data = variant === 'movies' ? await getMovieGenres() : await getTvGenres()
        const list = Array.isArray(data?.genres) ? data.genres : []
        const mapped = list
          .filter((g) => g && (g.id != null) && g.name)
          .map((g) => ({ id: String(g.id), name: String(g.name) }))
          .sort((a, b) => a.name.localeCompare(b.name))
        if (!cancelled) setGenreOptions(mapped)
      } catch {
        if (!cancelled) setGenreOptions([])
      }
    }
    loadGenres()
    return () => { cancelled = true }
  }, [variant, authNonce, langNonce])

  useEffect(() => {
    let cancelled = false
    const fetchResults = async () => {
      setLoading(true)
      setError(null)
      try {
        setUiPage(1)
        if (mode === 'search') {
          setSortBy('title')

          if (variant === 'movies') {
            const data = await searchMovies(query, 1)
            const results = (data?.results || []).map(mapTmdbMovie)
            if (!cancelled) {
              setShows(results)
              setApiPage(1)
              setHasMore((data?.page || 1) < (data?.total_pages || 1))
            }
          } else {
            const data = await searchTv(query, 1)
            const results = (data?.results || []).map(mapTmdbTv)
            if (!cancelled) {
              setShows(results)
              setApiPage(1)
              setHasMore((data?.page || 1) < (data?.total_pages || 1))
            }
          }
        } else {
          setSortBy('title')

          if (variant === 'movies') {
            const data = await discoverMovies(1, discoverParams)
            const results = (data?.results || []).map(mapTmdbMovie)
            if (!cancelled) {
              setShows(results)
              setApiPage(1)
              setHasMore((data?.page || 1) < (data?.total_pages || 1))
            }
          } else {
            const data = await discoverTv(1, discoverParams)
            const results = (data?.results || []).map(mapTmdbTv)
            if (!cancelled) {
              setShows(results)
              setApiPage(1)
              setHasMore((data?.page || 1) < (data?.total_pages || 1))
            }
          }
        }
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchResults()
    return () => { cancelled = true }
  }, [query, mode, variant, authNonce, discoverParams, langNonce])

  async function ensureLoadedForUiPage(targetUiPage) {
    if (loading) return
    if (!hasMore) return
    const needed = targetUiPage * PAGE_SIZE
    if (shows.length >= needed) return

    setLoading(true)
    setError(null)
    try {
      let nextApiPage = apiPage
      let nextShows = shows

      while (nextShows.length < needed) {
        nextApiPage += 1

        if (variant === 'movies') {
          const data = mode === 'search'
            ? await searchMovies(query, nextApiPage)
            : await discoverMovies(nextApiPage, discoverParams)

          const batch = (data?.results || []).map(mapTmdbMovie)
          nextShows = [...nextShows, ...batch]
          const more = (data?.page || nextApiPage) < (data?.total_pages || nextApiPage)
          setHasMore(!!more)
          if (!more || batch.length === 0) break
        } else {
          const data = mode === 'search'
            ? await searchTv(query, nextApiPage)
            : await discoverTv(nextApiPage, discoverParams)

          const batch = (data?.results || []).map(mapTmdbTv)
          nextShows = [...nextShows, ...batch]
          const more = (data?.page || nextApiPage) < (data?.total_pages || nextApiPage)
          setHasMore(!!more)
          if (!more || batch.length === 0) break
        }
      }

      setShows(nextShows)
      setApiPage(nextApiPage)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const filteredSorted = useMemo(() => {
    let list = shows

    if (effectiveMinRating != null) {
      list = list.filter((x) => (x?.rating ?? -1) >= effectiveMinRating)
    }

    const yFrom = effectiveYearRange?.from ?? null
    const yTo = effectiveYearRange?.to ?? null
    if (yFrom != null) list = list.filter((x) => (x?.year ?? 0) >= yFrom)
    if (yTo != null) list = list.filter((x) => (x?.year ?? 9999) <= yTo)

    if (Array.isArray(selectedGenreIds) && selectedGenreIds.length) {
      const need = selectedGenreIds.map(String)
      list = list.filter((x) => {
        const ids = Array.isArray(x?.genreIds) ? x.genreIds.map(String) : []
        return need.every((id) => ids.includes(id))
      })
    }

    const copy = [...list]
    copy.sort((a,b)=>{
      if (sortBy === 'rating') {
        const ra = a.rating ?? -1
        const rb = b.rating ?? -1
        return rb - ra
      }
      if (sortBy === 'year') {
        const ya = a.year ?? 0
        const yb = b.year ?? 0
        return yb - ya
      }
      return (a.title || '').localeCompare((b.title || ''))
    })
    return copy
  }, [shows, sortBy, effectiveMinRating, effectiveYearRange, selectedGenreIds])

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / PAGE_SIZE))
  const start = (uiPage - 1) * PAGE_SIZE
  const pageItems = filteredSorted.slice(start, start + PAGE_SIZE)

  const canPrev = uiPage > 1
  const canNext = (start + PAGE_SIZE < filteredSorted.length) || hasMore

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
        <h2 className="text-2xl font-bold mb-2">{t('listing_tmdb_required_title')}</h2>
        <p className="text-white/70 mb-4">
          {t('listing_tmdb_required_body')}
        </p>

        <div className="p-4 border border-white/10 rounded bg-black">
          <label className="block text-sm mb-3">
            <div className="text-white/70 mb-1">{t('listing_tmdb_auth_type')}</div>
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
            <div className="text-white/70 mb-1">{t('listing_tmdb_value')}</div>
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
                setShows([])
                setAuthNonce((n) => n + 1)
              }}
            >
              {t('listing_tmdb_save_load')}
            </button>

            <button
              type="button"
              className="px-4 py-2 rounded border border-white/15 bg-black hover:bg-white/5"
              onClick={() => {
                clearTmdbAuth()
                setTmdbAuthValue('')
              }}
            >
              {t('listing_tmdb_clear')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (loading && shows.length === 0) return <Loading />
  if (error) return <ErrorState title={t('listing_load_failed')} message={error} onRetry={() => setAuthNonce((n) => n + 1)} />

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold">{title}</h2>
          <div className="text-sm text-white/70 mt-1">
            {mode === 'search'
              ? `${t('listing_search')}: ${query} · ${t('listing_page')}: ${uiPage}/${totalPages}`
              : `${t('listing_page')}: ${uiPage} · ${t('listing_visible')}: ${Math.min(start + PAGE_SIZE, filteredSorted.length)}/${filteredSorted.length}${hasMore ? '+' : ''}`}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            className="px-4 py-2 rounded border border-white/15 bg-black hover:bg-white/5"
            onClick={() => setFiltersOpen((v) => !v)}
          >
            {t('listing_filter')}
          </button>

          <label className="text-sm">
            <div className="text-white/70 mb-1">{t('listing_sort')}</div>
            <select value={sortBy} onChange={(e)=>setSortBy(e.target.value)} className="bg-black border border-white/10 rounded px-3 py-2">
              <option value="title">{t('listing_sort_title')}</option>
              <option value="rating">{t('listing_sort_rating')}</option>
              <option value="year">{t('listing_sort_year')}</option>
            </select>
          </label>
        </div>
      </div>

      {filtersOpen && (
        <div className="mb-6">
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="w-full lg:w-[280px] shrink-0 p-4 border border-white/10 rounded bg-black">
              <div className="flex items-center justify-between mb-3">
                <div className="font-semibold">{t('listing_filters_title')}</div>
                <button
                  type="button"
                  className="text-sm text-white/70 hover:text-white"
                  onClick={() => setFiltersOpen(false)}
                >
                  {t('listing_close')}
                </button>
              </div>

              <div className="mb-5">
                <div className="text-sm text-white/70 mb-2">{t('listing_rating')}</div>
                <div className="grid grid-cols-3 gap-2">
                  <label className="text-sm flex items-center gap-2">
                    <input
                      type="radio"
                      name="minRating"
                      value="any"
                      checked={minRatingBucket === 'any'}
                      onChange={(e) => setMinRatingBucket(e.target.value)}
                    />
                    {t('listing_any')}
                  </label>
                  {[1,2,3,4,5,6,7,8,9].map((n) => (
                    <label key={n} className="text-sm flex items-center gap-2">
                      <input
                        type="radio"
                        name="minRating"
                        value={String(n)}
                        checked={minRatingBucket === String(n)}
                        onChange={(e) => setMinRatingBucket(e.target.value)}
                      />
                      {n}+
                    </label>
                  ))}
                </div>
              </div>

              <div className="mb-5">
                <div className="text-sm text-white/70 mb-2">{t('listing_year')}</div>
                <div className="flex flex-col gap-2">
                  {YEAR_BUCKETS.map((b) => (
                    <label key={b.key} className="text-sm flex items-center gap-2">
                      <input
                        type="radio"
                        name="yearBucket"
                        value={b.key}
                        checked={yearBucket === b.key}
                        onChange={(e) => setYearBucket(e.target.value)}
                      />
                      {b.labelKey ? t(b.labelKey) : (b.label || b.key)}
                    </label>
                  ))}
                </div>
              </div>

              <div className="mb-2">
                <div className="text-sm text-white/70 mb-2">{t('listing_genre_pick')}</div>
                <div className="w-full border border-white/10 rounded px-3 py-2 max-h-56 overflow-auto">
                  {genreOptions.length ? (
                    <div className="flex flex-col gap-2">
                      {genreOptions.map((g) => (
                        <label key={g.id} className="text-sm flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedGenreIds.includes(g.id)}
                            onChange={(e) => {
                              const checked = e.target.checked
                              setSelectedGenreIds((prev) => {
                                const set = new Set((prev || []).map(String))
                                if (checked) set.add(String(g.id))
                                else set.delete(String(g.id))
                                return Array.from(set)
                              })
                            }}
                          />
                          {g.name}
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-white/60">{t('listing_genres_loading')}</div>
                  )}
                </div>
              </div>

              <button
                type="button"
                className="w-full mt-5 px-4 py-2 rounded border border-white/15 bg-black hover:bg-white/5"
                onClick={() => {
                  setMinRatingBucket('any')
                  setYearBucket('any')
                  setSelectedGenreIds([])
                }}
              >
                {t('listing_clear_filters')}
              </button>
            </div>

            <div className="flex-1" />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {pageItems.length > 0 ? (
          pageItems.map((item) => (
            <MovieCard
              key={item.id}
              movie={item}
              to={variant === 'movies' ? `/movies/${item.id}` : `/shows/${item.id}`}
              listType={variant === 'movies' ? 'movie' : 'show'}
            />
          ))
        ) : (
          <p className="text-center col-span-full text-white/70">{t('listing_no_results')}</p>
        )}
      </div>

      <div className="flex items-center justify-center gap-3 mt-10">
        <button
          onClick={goPrev}
          disabled={!canPrev || loading}
          className="px-4 py-2 rounded border border-white/15 bg-black hover:bg-white/5 disabled:opacity-50"
        >
          {t('listing_prev')}
        </button>
        <div className="text-sm text-white/70">{mode === 'search' ? `${uiPage}/${totalPages}` : `${uiPage}`}</div>
        <button
          onClick={goNext}
          disabled={!canNext || loading}
          className="px-4 py-2 rounded border border-white/15 bg-black hover:bg-white/5 disabled:opacity-50"
        >
          {t('listing_next')}
        </button>
      </div>

      {loading && (
        <div className="text-center mt-4 text-white/70">{t('listing_loading')}</div>
      )}
    </div>
  )
}

export default ShowListingPage
