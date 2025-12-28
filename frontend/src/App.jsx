import { useState } from 'react'
import { Routes, Route, Outlet } from 'react-router-dom'
import Home from './pages/HomePage'
import ShowListingPage from './pages/ShowListingPage'
import ShowDetailPage from './pages/ShowDetailPage'
import MovieDetailPage from './pages/MovieDetailPage'
import SearchPage from './pages/SearchPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import VerifyEmailPage from './pages/VerifyEmailPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import SettingsPage from './pages/SettingsPage'
import RequireAuth from './components/RequireAuth'
import Sidebar from './components/Sidebar'
import MyList from './pages/MyList'
import WatchedHistory from './pages/WatchedHistory'
import ActorsPage from './pages/ActorsPage'
import ActorDetailPage from './pages/ActorDetailPage'
import Footer from './components/Footer'
import './App.css'

function AppLayout({ mobileSidebarOpen, setMobileSidebarOpen }) {
  return (
    <div className="min-h-screen bg-black text-white antialiased lg:pl-12">
      <Sidebar
        mobileOpen={mobileSidebarOpen}
        onMobileOpen={() => setMobileSidebarOpen(true)}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-8">
        <Outlet />
      </main>

      <Footer />
    </div>
  )
}

function App() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<AppLayout mobileSidebarOpen={mobileSidebarOpen} setMobileSidebarOpen={setMobileSidebarOpen} />}>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/shows" element={<ShowListingPage key="shows" variant="shows" />} />
          <Route path="/movies" element={<ShowListingPage key="movies" variant="movies" />} />
          <Route path="/actors" element={<ActorsPage />} />
          <Route path="/actors/:id" element={<ActorDetailPage />} />
          <Route path="/shows/:id" element={<ShowDetailPage />} />
          <Route path="/movies/:id" element={<MovieDetailPage />} />
          <Route path="/my-list" element={<MyList />} />
          <Route path="/watched" element={<WatchedHistory />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
