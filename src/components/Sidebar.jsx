import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'

export default function Sidebar({ mobileOpen = false, onMobileOpen = () => {}, onMobileClose = () => {} }) {
  const [q, setQ] = useState('')
  const navigate = useNavigate()

  function submitSearch() {
    const query = (q || '').trim()
    if (!query) return
    navigate(`/search?q=${encodeURIComponent(query)}`)
    onMobileClose()
  }

  return (
    <>
      <button
        type="button"
        onClick={onMobileOpen}
        className="lg:hidden fixed left-3 top-3 z-50 h-10 w-10 rounded bg-black border border-white/10 hover:bg-white/5"
        aria-label="Menüyü aç"
        title="Menü"
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
            <button onClick={onMobileClose} className="text-white/70 hover:text-white">Kapat</button>
          </div>

          <div className="mb-4">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitSearch()
              }}
              placeholder="Ara..."
              className="w-full bg-black border border-white/10 text-white placeholder-white/60 px-3 py-2 rounded outline-none focus:ring-2 focus:ring-white/20"
            />
          </div>

          <nav className="flex flex-col gap-2 text-sm">
            <Link to="/" onClick={onMobileClose} className="px-2 py-2 rounded hover:bg-white/5 font-semibold tracking-wide uppercase text-white/90 hover:text-white transition-colors">Anasayfa</Link>
            <Link to="/shows" onClick={onMobileClose} className="px-2 py-2 rounded hover:bg-white/5 font-semibold tracking-wide uppercase text-white/90 hover:text-white transition-colors">Diziler</Link>
            <Link to="/movies" onClick={onMobileClose} className="px-2 py-2 rounded hover:bg-white/5 font-semibold tracking-wide uppercase text-white/90 hover:text-white transition-colors">Filmler</Link>
            <Link to="/actors" onClick={onMobileClose} className="px-2 py-2 rounded hover:bg-white/5 font-semibold tracking-wide uppercase text-white/90 hover:text-white transition-colors">Aktörler</Link>
            <Link to="/my-list" onClick={onMobileClose} className="px-2 py-2 rounded hover:bg-white/5 font-semibold tracking-wide uppercase text-white/90 hover:text-white transition-colors">Listem</Link>
          </nav>
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
              placeholder="Ara..."
              className="w-full bg-black border border-white/10 text-white placeholder-white/60 px-3 py-2 rounded outline-none focus:ring-2 focus:ring-white/20"
            />
          </div>

          <nav className="px-2 pt-3 text-sm opacity-0 group-hover:opacity-100 transition-opacity">
            <Link to="/" className="block px-2 py-2 rounded hover:bg-white/5 font-semibold tracking-wide uppercase text-white/90 hover:text-white transition-colors">Anasayfa</Link>
            <Link to="/shows" className="block px-2 py-2 rounded hover:bg-white/5 font-semibold tracking-wide uppercase text-white/90 hover:text-white transition-colors">Diziler</Link>
            <Link to="/movies" className="block px-2 py-2 rounded hover:bg-white/5 font-semibold tracking-wide uppercase text-white/90 hover:text-white transition-colors">Filmler</Link>
            <Link to="/actors" className="block px-2 py-2 rounded hover:bg-white/5 font-semibold tracking-wide uppercase text-white/90 hover:text-white transition-colors">Aktörler</Link>
            <Link to="/my-list" className="block px-2 py-2 rounded hover:bg-white/5 font-semibold tracking-wide uppercase text-white/90 hover:text-white transition-colors">Listem</Link>
          </nav>
        </div>
      </aside>
    </>
  )
}
