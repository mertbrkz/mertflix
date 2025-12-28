import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PosterGridBackground from '../components/PosterGridBackground'
import { register } from '../services/auth'
import { useT } from '../i18n/useT'

export default function RegisterPage() {
  const { t } = useT()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)

  async function onSubmit(e) {
    e.preventDefault()
    setError(null)
    setInfo(null)

    const em = String(email || '').trim()
    if (!em) return setError(t('validation_email_required'))
    if (!password) return setError(t('validation_password_required'))

    setLoading(true)
    try {
      await register(em, password)
      setInfo(t('auth_register_info_code_sent'))
      navigate(`/verify-email?email=${encodeURIComponent(em)}`)
    } catch (err) {
      setError(typeof err?.message === 'string' ? err.message : t('auth_register_failed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative text-white">
      <PosterGridBackground />

      <div className="relative z-10 min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-black/75 backdrop-blur-sm rounded-md p-8 sm:p-12 border border-white/10">
          <div className="mb-6">
            <Link to="/" className="text-red-600 font-bold text-3xl">MERTFLIX</Link>
          </div>

        <h1 className="text-3xl font-bold">{t('auth_register_title')}</h1>
        <p className="mt-2 text-white/60 text-sm">{t('auth_register_subtitle')}</p>

        {error ? (
          <div className="mt-4 p-3 rounded bg-black border border-red-500/30 text-red-200 text-sm">{error}</div>
        ) : null}
        {info ? (
          <div className="mt-4 p-3 rounded bg-black border border-white/10 text-white/80 text-sm">{info}</div>
        ) : null}

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder={t('auth_register_email_placeholder')}
            autoComplete="email"
            className="w-full bg-slate-800 text-white placeholder-white/60 px-4 py-3 rounded outline-none focus:ring-2 focus:ring-white/20"
          />

          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder={t('auth_register_password_placeholder')}
            autoComplete="new-password"
            className="w-full bg-slate-800 text-white placeholder-white/60 px-4 py-3 rounded outline-none focus:ring-2 focus:ring-white/20"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full font-bold bg-[var(--mertflix-accent)] hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? t('auth_register_sending') : t('auth_register_submit')}
          </button>
        </form>

          <div className="mt-8 text-sm text-white/60">
            {t('auth_register_already')}{' '}
            <Link to="/login" className="text-white hover:underline">{t('auth_register_login_link')}</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
