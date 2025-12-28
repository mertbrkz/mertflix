import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../contexts/useAuth'
import { useT } from '../i18n/useT'
import { getRandomMovieId } from '../services/tmdb'

export default function Sidebar({ mobileOpen = false, onMobileOpen = () => {}, onMobileClose = () => {} }) {
  const [q, setQ] = useState('')
  const [surpriseLoading, setSurpriseLoading] = useState(false)
  const navigate = useNavigate()
  const { isAuthenticated, email, signOut } = useAuth()
  const { t } = useT()

  function submitSearch() {
    const query = (q || '').trim()
    if (!query) return
    navigate(`/search?q=${encodeURIComponent(query)}`)
    onMobileClose()
  }

  function handleSignOut() {
    signOut()
    onMobileClose()
    navigate('/')
  }

  async function handleSurpriseMe() {
    if (surpriseLoading) return
    setSurpriseLoading(true)
    try {
      const movieId = await getRandomMovieId()
      navigate(`/movies/${movieId}`)
      onMobileClose()
    } catch {
      // If TMDB auth is missing or the request fails, send user to Movies page (which also has TMDB setup guidance).
      navigate('/movies')
      onMobileClose()
    } finally {
      setSurpriseLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={onMobileOpen}
        className="lg:hidden fixed left-3 top-3 z-50 h-10 w-10 rounded bg-black border border-white/10 hover:bg-white/5"
        aria-label={t('nav_menu_open_aria')}
        title={t('nav_menu')}
      >
        <span className="text-xl leading-none">⋯</span>
      </button>

      <div
        className={`lg:hidden fixed inset-0 z-50 transition-opacity ${mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        aria-hidden={!mobileOpen}
      >
        <div className="absolute inset-0 bg-black/70" onClick={onMobileClose}></div>
        <aside className={`absolute left-0 top-0 bottom-0 w-72 bg-black p-4 border-r border-white/10 transform ${mobileOpen ? 'translate-x-0' : '-translate-x-6'} transition-transform`}>
          <div className="flex items-center justify-between mb-4">
            <div className="text-lg font-bold">Mertflix</div>
            <button onClick={onMobileClose} className="text-white/70 hover:text-white">{t('nav_close')}</button>
          </div>

          <div className="mb-4">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitSearch()
              }}
              placeholder={t('nav_search_placeholder')}
              className="w-full bg-black border border-white/10 text-white placeholder-white/60 px-3 py-2 rounded outline-none focus:ring-2 focus:ring-white/20"
            />
          </div>

          <nav className="flex flex-col gap-2 text-sm">
            <Link to="/" onClick={onMobileClose} className="px-2 py-2 rounded hover:bg-white/5 font-semibold tracking-wide uppercase text-white/90 hover:text-white transition-colors">{t('nav_home')}</Link>
            <Link to="/shows" onClick={onMobileClose} className="px-2 py-2 rounded hover:bg-white/5 font-semibold tracking-wide uppercase text-white/90 hover:text-white transition-colors">{t('nav_shows')}</Link>
            <Link to="/movies" onClick={onMobileClose} className="px-2 py-2 rounded hover:bg-white/5 font-semibold tracking-wide uppercase text-white/90 hover:text-white transition-colors">{t('nav_movies')}</Link>
            <Link to="/actors" onClick={onMobileClose} className="px-2 py-2 rounded hover:bg-white/5 font-semibold tracking-wide uppercase text-white/90 hover:text-white transition-colors">{t('nav_actors')}</Link>
            <Link to="/my-list" onClick={onMobileClose} className="px-2 py-2 rounded hover:bg-white/5 font-semibold tracking-wide uppercase text-white/90 hover:text-white transition-colors">{t('nav_mylist')}</Link>
            <Link to="/watched" onClick={onMobileClose} className="px-2 py-2 rounded hover:bg-white/5 font-semibold tracking-wide uppercase text-white/90 hover:text-white transition-colors">{t('nav_watched')}</Link>
            <button
              type="button"
              onClick={handleSurpriseMe}
              disabled={surpriseLoading}
              title={t('nav_surprise_title')}
              className="text-left px-2 py-2 rounded hover:bg-white/5 font-semibold tracking-wide uppercase text-white/90 hover:text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {t('nav_surprise')}
            </button>
            <Link to="/settings" onClick={onMobileClose} className="px-2 py-2 rounded hover:bg-white/5 font-semibold tracking-wide uppercase text-white/90 hover:text-white transition-colors">{t('nav_settings')}</Link>
          </nav>

          <div className="mt-4 pt-4 border-t border-white/10 text-sm">
            {isAuthenticated ? (
              <>
                <div className="text-white/60 truncate">{email || t('nav_signed_in')}</div>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="mt-2 w-full bg-black border border-white/10 hover:bg-white/5"
                >
                  {t('nav_logout_button')}
                </button>
              </>
            ) : (
              <div className="flex gap-2">
                <Link to="/login" onClick={onMobileClose} className="flex-1 text-center bg-black border border-white/10 hover:bg-white/5">{t('nav_login_button')}</Link>
                <Link to="/register" onClick={onMobileClose} className="flex-1 text-center bg-black border border-white/10 hover:bg-white/5">{t('nav_register')}</Link>
              </div>
            )}
          </div>
        </aside>
      </div>

      <aside className="hidden lg:block fixed left-0 top-0 h-screen z-40">
        <div className="group h-full bg-black border-r border-white/10 overflow-hidden transition-[width] duration-300 w-12 hover:w-64">
          <div className="h-14 px-3 flex items-center gap-3 border-b border-white/10">
            <div className="text-xl leading-none">⋯</div>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap text-lg font-bold">
              Mertflix
            </div>
          </div>

          <div className="px-3 pt-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitSearch()
              }}
              placeholder={t('nav_search_placeholder')}
              className="w-full bg-black border border-white/10 text-white placeholder-white/60 px-3 py-2 rounded outline-none focus:ring-2 focus:ring-white/20"
            />
          </div>

          <nav className="px-2 pt-3 text-sm opacity-0 group-hover:opacity-100 transition-opacity">
            <Link to="/" className="block px-2 py-2 rounded hover:bg-white/5 font-semibold tracking-wide uppercase text-white/90 hover:text-white transition-colors">{t('nav_home')}</Link>
            <Link to="/shows" className="block px-2 py-2 rounded hover:bg-white/5 font-semibold tracking-wide uppercase text-white/90 hover:text-white transition-colors">{t('nav_shows')}</Link>
            <Link to="/movies" className="block px-2 py-2 rounded hover:bg-white/5 font-semibold tracking-wide uppercase text-white/90 hover:text-white transition-colors">{t('nav_movies')}</Link>
            <Link to="/actors" className="block px-2 py-2 rounded hover:bg-white/5 font-semibold tracking-wide uppercase text-white/90 hover:text-white transition-colors">{t('nav_actors')}</Link>
            <Link to="/my-list" className="block px-2 py-2 rounded hover:bg-white/5 font-semibold tracking-wide uppercase text-white/90 hover:text-white transition-colors">{t('nav_mylist')}</Link>
            <Link to="/watched" className="block px-2 py-2 rounded hover:bg-white/5 font-semibold tracking-wide uppercase text-white/90 hover:text-white transition-colors">{t('nav_watched')}</Link>
            <button
              type="button"
              onClick={handleSurpriseMe}
              disabled={surpriseLoading}
              title={t('nav_surprise_title')}
              className="w-full text-left block px-2 py-2 rounded hover:bg-white/5 font-semibold tracking-wide uppercase text-white/90 hover:text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {t('nav_surprise')}
            </button>
            <Link to="/settings" className="block px-2 py-2 rounded hover:bg-white/5 font-semibold tracking-wide uppercase text-white/90 hover:text-white transition-colors">{t('nav_settings')}</Link>

            <div className="mt-4 pt-4 border-t border-white/10">
              {isAuthenticated ? (
                <>
                  <div className="px-2 text-xs text-white/60 truncate">{email || t('nav_signed_in')}</div>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="mt-2 w-full bg-black border border-white/10 hover:bg-white/5"
                  >
                    {t('nav_logout_button')}
                  </button>
                </>
              ) : (
                <div className="flex gap-2 px-1">
                  <Link to="/login" className="flex-1 text-center bg-black border border-white/10 hover:bg-white/5">{t('nav_login_button')}</Link>
                  <Link to="/register" className="flex-1 text-center bg-black border border-white/10 hover:bg-white/5">{t('nav_register')}</Link>
                </div>
              )}
            </div>
          </nav>
        </div>
      </aside>
    </>
  )
}
