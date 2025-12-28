import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { resetPassword } from '../services/auth'
import { useT } from '../i18n/useT'

export default function ResetPasswordPage() {
  const { t } = useT()
  const [params] = useSearchParams()
  const navigate = useNavigate()

  const [email, setEmail] = useState(() => params.get('email') || '')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)

  async function onSubmit(e) {
    e.preventDefault()
    setError(null)
    setInfo(null)

    const em = String(email || '').trim()
    const c = String(code || '').trim()
    if (!em) return setError(t('validation_email_required'))
    if (!c) return setError(t('validation_code_required'))
    if (!newPassword) return setError(t('validation_new_password_required'))

    setLoading(true)
    try {
      await resetPassword(em, c, newPassword)
      setInfo(t('auth_reset_info_updated'))
      navigate(`/login?email=${encodeURIComponent(em)}`)
    } catch (err) {
      setError(typeof err?.message === 'string' ? err.message : t('auth_reset_failed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-black/75 rounded-md p-8 sm:p-12 border border-white/10">
        <div className="mb-6">
          <Link to="/" className="text-red-600 font-bold text-3xl">MERTFLIX</Link>
        </div>

        <h1 className="text-3xl font-bold">{t('auth_reset_title')}</h1>
        <p className="mt-2 text-white/60 text-sm">{t('auth_reset_subtitle')}</p>

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
            value={code}
            onChange={(e) => setCode(e.target.value)}
            inputMode="numeric"
            placeholder={t('auth_reset_code_placeholder')}
            className="w-full bg-slate-800 text-white placeholder-white/60 px-4 py-3 rounded outline-none focus:ring-2 focus:ring-white/20"
          />

          <input
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            type="password"
            placeholder={t('auth_reset_new_password_placeholder')}
            autoComplete="new-password"
            className="w-full bg-slate-800 text-white placeholder-white/60 px-4 py-3 rounded outline-none focus:ring-2 focus:ring-white/20"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full font-bold bg-[var(--mertflix-accent)] hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? t('auth_reset_saving') : t('auth_reset_submit')}
          </button>
        </form>

        <div className="mt-8 text-sm text-white/60">
          <Link to="/login" className="text-white hover:underline">{t('auth_register_login_link')}</Link>
        </div>
      </div>
    </div>
  )
}
