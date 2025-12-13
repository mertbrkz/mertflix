import { useEffect, useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import Home from './pages/HomePage'
import ShowListingPage from './pages/ShowListingPage'
import ShowDetailPage from './pages/ShowDetailPage'
import MovieDetailPage from './pages/MovieDetailPage'
import SearchPage from './pages/SearchPage'
import Sidebar from './components/Sidebar'
import MyList from './pages/MyList'
import ActorsPage from './pages/ActorsPage'
import ActorDetailPage from './pages/ActorDetailPage'
import Footer from './components/Footer'
import './App.css'

function App() {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('mertflix_user')) || null
    } catch (e) {
      return null
    }
  })

  useEffect(() => {
    if (user) localStorage.setItem('mertflix_user', JSON.stringify(user))
    else localStorage.removeItem('mertflix_user')
  }, [user])

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-black text-white antialiased lg:pl-12">
      <Sidebar
        mobileOpen={mobileSidebarOpen}
        onMobileOpen={() => setMobileSidebarOpen(true)}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-8">
        <Routes>
          <Route path="/" element={<Home user={user} setUser={setUser} />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/shows" element={<ShowListingPage key="shows" variant="shows" />} />
          <Route path="/movies" element={<ShowListingPage key="movies" variant="movies" />} />
          <Route path="/actors" element={<ActorsPage />} />
          <Route path="/actors/:id" element={<ActorDetailPage />} />
          <Route path="/shows/:id" element={<ShowDetailPage />} />
          <Route path="/movies/:id" element={<MovieDetailPage />} />
          <Route path="/my-list" element={<MyList />} />
        </Routes>
      </main>

      <Footer />
    </div>
  )
}

export default App
