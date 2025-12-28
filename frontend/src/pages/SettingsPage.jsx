import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/useAuth'
import { setAuthEmail } from '../services/api'
import { getPreferredLanguage, setPreferredLanguage, SUPPORTED_LANGUAGES } from '../services/languagePref'
import { useT } from '../i18n/useT'
import {
  confirmEmailChange,
  deactivateAccount,
  deleteAccount,
  getMyProfile,
  getMySecurity,
  requestEmailChange,
  setTwoFactorEnabled,
  updateMyPassword,
  updateMyProfile,
} from '../services/me'

function dicebearUrl(style, seed) {
  const s = encodeURIComponent(style || 'avataaars')
  const se = encodeURIComponent(seed || 'mertflix')
  return `https://api.dicebear.com/8.x/${s}/svg?seed=${se}`
}

export default function SettingsPage() {
  const navigate = useNavigate()
  const { email: authedEmail, signOut, refreshAuth } = useAuth()
  const { t } = useT()

  const [tab, setTab] = useState('profile')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const [profile, setProfile] = useState({
    username: '',
    bio: '',
    avatarStyle: 'avataaars',
    avatarSeed: '',
  })

  const [usernameAlreadySet, setUsernameAlreadySet] = useState(false)

  const usernameLocked = usernameAlreadySet

  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false)
  const [avatarPickerPage, setAvatarPickerPage] = useState(1)

  const [security, setSecurity] = useState({
    email: '',
    twoFactorEnabled: false,
    isActive: true,
  })

  const [emailChange, setEmailChange] = useState({
    newEmail: '',
    requested: false,
    requestId: null,
    code: '',
  })

  const [passwordChange, setPasswordChange] = useState({ currentPassword: '', newPassword: '' })

  const [danger, setDanger] = useState({ password: '' })

  const [preferredLanguage, setPreferredLanguageState] = useState(() => getPreferredLanguage())

  const avatarPreview = useMemo(
    () => dicebearUrl(profile.avatarStyle, profile.avatarSeed || authedEmail || 'mertflix'),
    [profile.avatarStyle, profile.avatarSeed, authedEmail]
  )

  const avatarSeedPageSize = 18

  const avatarSeedOptions = useMemo(() => {
    const base = String(authedEmail || 'mertflix')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .slice(0, 32)

    const start = (Math.max(1, avatarPickerPage) - 1) * avatarSeedPageSize
    return Array.from({ length: avatarSeedPageSize }, (_, i) => `${base}-${profile.avatarStyle}-${start + i + 1}`)
  }, [authedEmail, profile.avatarStyle, avatarPickerPage])

  const avatarPageButtons = useMemo(() => {
    const page = Math.max(1, avatarPickerPage)
    const start = Math.max(1, page - 2)
    const end = page + 2
    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
  }, [avatarPickerPage])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      setSuccess(null)
      try {
        const [p, s] = await Promise.all([getMyProfile(), getMySecurity()])
        if (cancelled) return

        setProfile({
          username: p?.username || '',
          bio: p?.bio || '',
          avatarStyle: p?.avatarStyle || 'avataaars',
          avatarSeed: p?.avatarSeed || '',
        })

        setUsernameAlreadySet(Boolean(String(p?.username || '').trim()))

        setAvatarPickerOpen(false)
        setAvatarPickerPage(1)

        setSecurity({
          email: s?.email || authedEmail || '',
          twoFactorEnabled: Boolean(s?.twoFactorEnabled),
          isActive: s?.isActive !== false,
        })
      } catch (e) {
        if (!cancelled) setError(e?.message || t('settings_load_failed'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [authedEmail])

  useEffect(() => {
    // When user changes (login/logout), pick the correct stored preference.
    setPreferredLanguageState(getPreferredLanguage())
  }, [authedEmail])

  function onChangeLanguage(next) {
    setPreferredLanguageState(next)
    setPreferredLanguage(next)
    setError(null)
    setSuccess(t('settings_language_updated'))
  }

  async function saveProfile() {
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      await updateMyProfile({
        username: usernameAlreadySet ? undefined : profile.username,
        bio: profile.bio,
        avatarStyle: profile.avatarStyle,
        avatarSeed: profile.avatarSeed,
      })
      setSuccess(t('settings_profile_updated'))

      // If username was set successfully, lock it locally.
      if (!usernameAlreadySet && String(profile.username || '').trim()) {
        setUsernameAlreadySet(true)
      }
    } catch (e) {
      setError(e?.message || t('settings_profile_update_failed'))
    } finally {
      setSaving(false)
    }
  }

  async function toggle2fa(nextEnabled) {
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      await setTwoFactorEnabled({ enabled: nextEnabled })
      setSecurity((s) => ({ ...s, twoFactorEnabled: nextEnabled }))
      setSuccess(nextEnabled ? t('settings_2fa_enabled_success') : t('settings_2fa_disabled_success'))
    } catch (e) {
      setError(e?.message || t('settings_2fa_update_failed'))
    } finally {
      setSaving(false)
    }
  }

  async function requestEmailCode() {
    const ne = String(emailChange.newEmail || '').trim()
    if (!ne) {
      setError(t('settings_new_email_required'))
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const r = await requestEmailChange({ newEmail: ne })
      setEmailChange((s) => ({ ...s, requested: true, requestId: r?.requestId || null }))
      setSuccess(t('settings_code_sent'))
    } catch (e) {
      setError(e?.message || t('settings_code_send_failed'))
    } finally {
      setSaving(false)
    }
  }

  async function confirmEmailCode() {
    const ne = String(emailChange.newEmail || '').trim()
    const code = String(emailChange.code || '').trim()
    const requestId = emailChange.requestId

    if (!ne) {
      setError(t('settings_new_email_required'))
      return
    }
    if (!code) {
      setError(t('settings_verification_code_required'))
      return
    }
    if (!requestId) {
      setError(t('settings_request_code_first'))
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const r = await confirmEmailChange({ requestId, newEmail: ne, code })
      const updatedEmail = r?.email || ne
      setAuthEmail(updatedEmail, { persist: true })
      refreshAuth()
      setSecurity((s) => ({ ...s, email: updatedEmail }))
      setEmailChange({ newEmail: '', requested: false, requestId: null, code: '' })
      setSuccess(t('settings_email_updated'))
    } catch (e) {
      setError(e?.message || t('settings_email_update_failed'))
    } finally {
      setSaving(false)
    }
  }

  async function changePassword() {
    if (!passwordChange.currentPassword) {
      setError(t('settings_current_password_required'))
      return
    }
    if (!passwordChange.newPassword) {
      setError(t('settings_new_password_required'))
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      await updateMyPassword({
        currentPassword: passwordChange.currentPassword,
        newPassword: passwordChange.newPassword,
      })
      setPasswordChange({ currentPassword: '', newPassword: '' })
      setSuccess(t('settings_password_updated'))
    } catch (e) {
      setError(e?.message || t('settings_password_update_failed'))
    } finally {
      setSaving(false)
    }
  }

  async function deactivate() {
    if (!danger.password) {
      setError(t('validation_password_required'))
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      await deactivateAccount({ password: danger.password })
      signOut()
      navigate('/login', { replace: true })
    } catch (e) {
      setError(e?.message || t('settings_deactivate_failed'))
    } finally {
      setSaving(false)
    }
  }

  async function removeAccount() {
    if (!danger.password) {
      setError(t('validation_password_required'))
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      await deleteAccount({ password: danger.password })
      signOut()
      navigate('/login', { replace: true })
    } catch (e) {
      setError(e?.message || t('settings_delete_failed'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="text-white/70">{t('settings_loading')}</div>

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{t('settings_title')}</h1>
        <div className="text-sm text-white/60 truncate">{authedEmail || ''}</div>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => {
            setTab('profile')
            setError(null)
            setSuccess(null)
          }}
          className={`px-3 py-2 rounded border border-white/10 ${tab === 'profile' ? 'bg-white/10' : 'bg-black hover:bg-white/5'}`}
        >
          {t('settings_tab_profile')}
        </button>
        <button
          type="button"
          onClick={() => {
            setTab('security')
            setError(null)
            setSuccess(null)
          }}
          className={`px-3 py-2 rounded border border-white/10 ${tab === 'security' ? 'bg-white/10' : 'bg-black hover:bg-white/5'}`}
        >
          {t('settings_tab_security')}
        </button>
      </div>

      {error ? (
        <div className="mt-4 p-3 rounded bg-black border border-red-500/30 text-red-200 text-sm">{error}</div>
      ) : null}
      {success ? (
        <div className="mt-4 p-3 rounded bg-black border border-white/10 text-white/80 text-sm">{success}</div>
      ) : null}

      {tab === 'profile' ? (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="p-4 bg-black border border-white/10 rounded-md">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-white/70">{t('settings_avatar_preview')}</div>
              <button
                type="button"
                disabled={saving}
                onClick={() => setAvatarPickerOpen((v) => !v)}
                className="px-3 py-1.5 rounded bg-black border border-white/10 hover:bg-white/5 disabled:opacity-60 disabled:cursor-not-allowed text-sm"
              >
                {t('settings_change')}
              </button>
            </div>

            <div className="mt-3 flex items-center justify-center bg-black border border-white/10 rounded-md p-6">
              <img src={avatarPreview} alt="Avatar" className="h-28 w-28" />
            </div>

            {avatarPickerOpen ? (
              <div className="mt-4">
                <div className="text-xs text-white/60 mb-2">{t('settings_pick_avatar')}</div>
                <div className="grid grid-cols-3 gap-2">
                  {avatarSeedOptions.map((seed) => {
                    const selected = seed === profile.avatarSeed
                    return (
                      <button
                        key={seed}
                        type="button"
                        onClick={() => {
                          setProfile((p) => ({ ...p, avatarSeed: seed }))
                        }}
                        className={`p-2 rounded border ${selected ? 'border-white/40 bg-white/10' : 'border-white/10 bg-black hover:bg-white/5'}`}
                        title={seed}
                      >
                        <img src={dicebearUrl(profile.avatarStyle, seed)} alt="Avatar" className="w-full h-auto" />
                      </button>
                    )
                  })}
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <button
                    type="button"
                    disabled={saving || avatarPickerPage <= 1}
                    onClick={() => setAvatarPickerPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 rounded bg-black border border-white/10 hover:bg-white/5 disabled:opacity-60 disabled:cursor-not-allowed text-sm"
                  >
                    {t('settings_prev')}
                  </button>

                  <div className="flex items-center gap-2">
                    {avatarPickerPage > 3 ? (
                      <>
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => setAvatarPickerPage(1)}
                          className={`h-8 min-w-8 px-2 rounded border border-white/10 ${avatarPickerPage === 1 ? 'bg-white/10' : 'bg-black hover:bg-white/5'}`}
                        >
                          1
                        </button>
                        <span className="text-white/40">…</span>
                      </>
                    ) : null}

                    {avatarPageButtons.map((n) => (
                      <button
                        key={n}
                        type="button"
                        disabled={saving}
                        onClick={() => setAvatarPickerPage(n)}
                        className={`h-8 min-w-8 px-2 rounded border border-white/10 ${avatarPickerPage === n ? 'bg-white/10' : 'bg-black hover:bg-white/5'}`}
                      >
                        {n}
                      </button>
                    ))}

                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => setAvatarPickerPage((p) => p + 1)}
                      className={`h-8 min-w-8 px-2 rounded border border-white/10 bg-black hover:bg-white/5`}
                      title={t('settings_more_pages')}
                    >
                      …
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => setAvatarPickerPage((p) => p + 1)}
                    className="px-3 py-1.5 rounded bg-black border border-white/10 hover:bg-white/5 disabled:opacity-60 disabled:cursor-not-allowed text-sm"
                  >
                    {t('settings_next')}
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="lg:col-span-2 p-4 bg-black border border-white/10 rounded-md">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm text-white/70 mb-1">{t('settings_username')}</label>
                <input
                  value={profile.username}
                  onChange={(e) => setProfile((p) => ({ ...p, username: e.target.value }))}
                  type="text"
                  disabled={usernameLocked}
                  className="w-full bg-black border border-white/10 text-white px-3 py-2 rounded outline-none focus:ring-2 focus:ring-white/20 disabled:opacity-70 disabled:cursor-not-allowed"
                />
                {usernameLocked ? (
                  <div className="mt-1 text-xs text-white/50">{t('settings_username_once')}</div>
                ) : (
                  <div className="mt-1 text-xs text-white/50">{t('settings_username_help')}</div>
                )}
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-1">{t('settings_avatar_style')}</label>
                <select
                  value={profile.avatarStyle}
                  onChange={(e) => {
                    const nextStyle = e.target.value
                    setProfile((p) => ({
                      ...p,
                      avatarStyle: nextStyle,
                      avatarSeed: '',
                    }))
                    setAvatarPickerOpen(false)
                    setAvatarPickerPage(1)
                  }}
                  className="w-full bg-black border border-white/10 text-white px-3 py-2 rounded outline-none focus:ring-2 focus:ring-white/20"
                >
                  <option value="avataaars">avataaars</option>
                  <option value="bottts">bottts</option>
                  <option value="identicon">identicon</option>
                  <option value="pixel-art">pixel-art</option>
                  <option value="thumbs">thumbs</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm text-white/70 mb-1">{t('settings_bio')}</label>
                <textarea
                  value={profile.bio}
                  onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
                  rows={4}
                  className="w-full bg-black border border-white/10 text-white px-3 py-2 rounded outline-none focus:ring-2 focus:ring-white/20"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm text-white/70 mb-1">{t('settings_language')}</label>
                <select
                  value={preferredLanguage}
                  onChange={(e) => onChangeLanguage(e.target.value)}
                  className="w-full bg-black border border-white/10 text-white px-3 py-2 rounded outline-none focus:ring-2 focus:ring-white/20"
                >
                  {SUPPORTED_LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.code === 'tr' ? t('language_tr') : t('language_en')}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                disabled={saving}
                onClick={saveProfile}
                className="px-4 py-2 rounded bg-black border border-white/10 hover:bg-white/5 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving ? t('settings_saving') : t('settings_save')}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          <div className="p-4 bg-black border border-white/10 rounded-md">
            <div className="font-semibold">{t('settings_account')}</div>
            <div className="mt-2 text-sm text-white/70">{t('common_email')}: {security.email || authedEmail || '—'}</div>
            <div className="mt-1 text-sm text-white/70">{t('settings_status')}: {security.isActive ? t('settings_status_active') : t('settings_status_inactive')}</div>
          </div>

          <div className="p-4 bg-black border border-white/10 rounded-md">
            <div className="font-semibold">{t('settings_change_email')}</div>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                value={emailChange.newEmail}
                onChange={(e) => setEmailChange((s) => ({ ...s, newEmail: e.target.value }))}
                type="email"
                placeholder={t('settings_new_email')}
                className="md:col-span-2 bg-black border border-white/10 text-white placeholder-white/40 px-3 py-2 rounded outline-none focus:ring-2 focus:ring-white/20"
              />
              <button
                type="button"
                disabled={saving}
                onClick={requestEmailCode}
                className="bg-black border border-white/10 hover:bg-white/5 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {t('settings_send_code')}
              </button>
            </div>

            {emailChange.requested ? (
              <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  value={emailChange.code}
                  onChange={(e) => setEmailChange((s) => ({ ...s, code: e.target.value }))}
                  type="text"
                  inputMode="numeric"
                  placeholder={t('settings_verification_code')}
                  autoComplete="one-time-code"
                  className="md:col-span-2 bg-black border border-white/10 text-white placeholder-white/40 px-3 py-2 rounded outline-none focus:ring-2 focus:ring-white/20"
                />
                <button
                  type="button"
                  disabled={saving}
                  onClick={confirmEmailCode}
                  className="bg-black border border-white/10 hover:bg-white/5 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {t('settings_confirm')}
                </button>
              </div>
            ) : null}
          </div>

          <div className="p-4 bg-black border border-white/10 rounded-md">
            <div className="font-semibold">{t('settings_update_password')}</div>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                value={passwordChange.currentPassword}
                onChange={(e) => setPasswordChange((s) => ({ ...s, currentPassword: e.target.value }))}
                type="password"
                placeholder={t('settings_current_password')}
                className="bg-black border border-white/10 text-white placeholder-white/40 px-3 py-2 rounded outline-none focus:ring-2 focus:ring-white/20"
              />
              <input
                value={passwordChange.newPassword}
                onChange={(e) => setPasswordChange((s) => ({ ...s, newPassword: e.target.value }))}
                type="password"
                placeholder={t('settings_new_password')}
                className="bg-black border border-white/10 text-white placeholder-white/40 px-3 py-2 rounded outline-none focus:ring-2 focus:ring-white/20"
              />
            </div>
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                disabled={saving}
                onClick={changePassword}
                className="px-4 py-2 rounded bg-black border border-white/10 hover:bg-white/5 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving ? t('settings_updating') : t('settings_update')}
              </button>
            </div>
          </div>

          <div className="p-4 bg-black border border-white/10 rounded-md">
            <div className="font-semibold">{t('settings_2fa_title')}</div>
            <div className="mt-2 text-sm text-white/70">
              {t('settings_2fa_help')}
            </div>
            <div className="mt-3 flex items-center gap-3">
              <input
                id="twofa"
                type="checkbox"
                checked={security.twoFactorEnabled}
                onChange={(e) => toggle2fa(e.target.checked)}
                disabled={saving}
              />
              <label htmlFor="twofa" className="text-sm text-white/80">
                {t('settings_2fa_enabled')}
              </label>
            </div>
          </div>

          <div className="p-4 bg-black border border-white/10 rounded-md">
            <div className="font-semibold">{t('settings_danger_title')}</div>
            <div className="mt-2 text-sm text-white/70">{t('settings_danger_help')}</div>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                value={danger.password}
                onChange={(e) => setDanger({ password: e.target.value })}
                type="password"
                placeholder={t('settings_password')}
                className="md:col-span-2 bg-black border border-white/10 text-white placeholder-white/40 px-3 py-2 rounded outline-none focus:ring-2 focus:ring-white/20"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={deactivate}
                  className="flex-1 bg-black border border-white/10 hover:bg-white/5 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {t('settings_deactivate')}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={removeAccount}
                  className="flex-1 bg-black border border-white/10 hover:bg-white/5 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {t('settings_delete')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
