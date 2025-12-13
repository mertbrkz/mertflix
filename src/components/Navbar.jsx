import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'

const Navbar = ({ onToggleSidebar = ()=>{} }) => {
  const [scrolled, setScrolled] = useState(false)
  const [q, setQ] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav className={`fixed top-0 w-full z-50 transition-colors duration-300 ${scrolled ? 'bg-black' : 'bg-transparent'}`}>
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={()=>onToggleSidebar(true)}
              className="lg:hidden p-2 rounded hover:bg-white/5"
              aria-label="Menüyü aç"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <Link to="/" className="flex items-center gap-3">
              <img
                src="/mertflix-logo.png"
                alt="Mertflix"
                className="h-8 w-auto object-contain"
                onError={(e)=>{e.target.onerror=null; e.target.style.display='none'}}
              />
              <span className="text-lg font-bold tracking-tight">Mertflix</span>
            </Link>
          </div>

          <div className="hidden lg:flex items-center gap-6 text-sm">
            <Link to="/" className="hover:underline">Anasayfa</Link>
            <Link to="/shows" className="hover:underline">Diziler</Link>
            <Link to="/shows?q=filmler" className="hover:underline">Filmler</Link>
            <Link to="/shows?q=yeni" className="hover:underline">Yeni</Link>
            <Link to="/my-list" className="hover:underline">Listem</Link>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:block">
              <input
                placeholder="Ara..."
                value={q}
                onChange={(e)=>setQ(e.target.value)}
                onKeyDown={(e)=>{
                  if (e.key === 'Enter') {
                    const query = (q || '').trim()
                    navigate(`/shows?q=${encodeURIComponent(query || 'popular')}`)
                  }
                }}
                className="bg-transparent border border-white/10 text-white placeholder-white/60 px-3 py-1 rounded-md outline-none focus:ring-2 focus:ring-white/20"
              />
            </div>
            <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center text-sm">M</div>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
