import { useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/useAuth'
import PosterGridBackground from '../components/PosterGridBackground'
import { useT } from '../i18n/useT'

export default function LoginPage() {
  const { t } = useT()
  const { signIn, signIn2fa } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()

  const [email, setEmail] = useState(() => params.get('email') || '')
  const [password, setPassword] = useState('')
  const [twoFactor, setTwoFactor] = useState({ required: false, challengeId: null, code: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const redirectTo = location.state?.from || '/'

  async function onSubmit(e) {
    e.preventDefault()
    setError(null)

    const em = String(email || '').trim()
    if (!em) return setError(t('validation_email_required'))
    if (twoFactor.required) {
      if (!twoFactor.code) return setError(t('validation_code_required'))
    } else {
      if (!password) return setError(t('validation_password_required'))
    }

    setLoading(true)
    try {
      if (twoFactor.required) {
        await signIn2fa(em, twoFactor.challengeId, twoFactor.code)
        navigate(redirectTo, { replace: true })
        return
      }

      const result = await signIn(em, password)
      if (result?.requires2fa) {
        setTwoFactor({ required: true, challengeId: result.challengeId || null, code: '' })
        setPassword('')
        return
      }

      navigate(redirectTo, { replace: true })
    } catch (err) {
      setError(typeof err?.message === 'string' ? err.message : t('auth_login_failed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative text-white">
      <PosterGridBackground />

      <div className="relative z-10">
        <header className="px-6 sm:px-10 pt-8">
          <Link to="/login" className="inline-block text-[#e50914] font-bold text-3xl tracking-wide">
            MERTFLIX
          </Link>
        </header>

        <main className="px-4 sm:px-6 py-10">
          <div className="max-w-[450px] mx-auto bg-black/75 backdrop-blur-sm rounded-md p-8 sm:p-16">
            <h1 className="text-3xl font-bold">{t('auth_login_title')}</h1>

            {error ? (
              <div className="mt-4 p-3 rounded bg-black border border-red-500/30 text-red-200 text-sm">
                {error}
              </div>
            ) : null}

            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="text"
                placeholder={t('auth_login_email_placeholder')}
                autoComplete="email"
                className="w-full bg-[#333] text-white placeholder-white/60 px-4 py-3 rounded outline-none focus:ring-2 focus:ring-white/20"
              />

              {!twoFactor.required ? (
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  placeholder={t('auth_login_password_placeholder')}
                  autoComplete="current-password"
                  className="w-full bg-[#333] text-white placeholder-white/60 px-4 py-3 rounded outline-none focus:ring-2 focus:ring-white/20"
                />
              ) : (
                <div className="space-y-2">
                  <input
                    value={twoFactor.code}
                    onChange={(e) => setTwoFactor((s) => ({ ...s, code: e.target.value }))}
                    type="text"
                    inputMode="numeric"
                    placeholder={t('auth_login_code_placeholder')}
                    autoComplete="one-time-code"
                    className="w-full bg-[#333] text-white placeholder-white/60 px-4 py-3 rounded outline-none focus:ring-2 focus:ring-white/20"
                  />
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      setTwoFactor({ required: false, challengeId: null, code: '' })
                      setError(null)
                    }}
                    className="text-sm text-white/70 hover:text-white text-right w-full disabled:opacity-60"
                  >
                    {t('common_back')}
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full font-bold bg-[#e50914] hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? t('auth_login_sending') : twoFactor.required ? t('auth_login_verify_code') : t('auth_login_submit')}
              </button>

              <div className="text-sm text-white/70 text-right">
                <Link to="/forgot-password" className="hover:text-white">
                  {t('auth_login_forgot')}
                </Link>
              </div>
            </form>

            <div className="mt-10 text-sm text-white/60">
              {t('auth_login_join_prompt')}{' '}
              <Link to="/register" className="text-white hover:underline">
                {t('auth_login_join_cta')}
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
