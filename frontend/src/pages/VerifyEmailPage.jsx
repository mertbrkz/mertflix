import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { verifyEmail } from '../services/auth'
import { useT } from '../i18n/useT'

export default function VerifyEmailPage() {
  const { t } = useT()
  const [params] = useSearchParams()
  const navigate = useNavigate()

  const [email, setEmail] = useState(() => params.get('email') || '')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function onSubmit(e) {
    e.preventDefault()
    setError(null)

    const em = String(email || '').trim()
    const c = String(code || '').trim()
    if (!em) return setError(t('validation_email_required'))
    if (!c) return setError(t('validation_code_required'))

    setLoading(true)
    try {
      await verifyEmail(em, c)
      navigate(`/login?email=${encodeURIComponent(em)}`)
    } catch (err) {
      setError(typeof err?.message === 'string' ? err.message : t('auth_verify_failed'))
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

        <h1 className="text-3xl font-bold">{t('auth_verify_title')}</h1>
        <p className="mt-2 text-white/60 text-sm">{t('auth_verify_subtitle')}</p>

        {error ? (
          <div className="mt-4 p-3 rounded bg-black border border-red-500/30 text-red-200 text-sm">{error}</div>
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
            placeholder={t('auth_verify_code_placeholder')}
            className="w-full bg-slate-800 text-white placeholder-white/60 px-4 py-3 rounded outline-none focus:ring-2 focus:ring-white/20"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full font-bold bg-[var(--mertflix-accent)] hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? t('auth_verify_checking') : t('auth_verify_submit')}
          </button>
        </form>

        <div className="mt-8 text-sm text-white/60">
          {t('auth_verify_cant_access')}{' '}
          <Link to="/register" className="text-white hover:underline">{t('auth_verify_register_again')}</Link>
        </div>
      </div>
    </div>
  )
}
