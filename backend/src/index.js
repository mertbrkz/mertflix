import express from 'express'
import cors from 'cors'
import { config } from './config.js'
import { query } from './db.js'
import { requireAuth } from './authMiddleware.js'
import {
  hashCode,
  hashPassword,
  normalizeEmail,
  randomCode6,
  signToken,
  verifyToken,
  verifyPassword,
} from './security.js'
import { sendMail } from './mailer.js'

const app = express()

app.use(cors({ origin: config.corsOrigin }))
app.use(express.json())

app.get('/health', (req, res) => res.json({ ok: true }))

function isValidPassword(pw) {
  return typeof pw === 'string' && pw.length >= 6
}

function isValidMediaType(t) {
  return t === 'movie' || t === 'show'
}

async function getOptionalViewerUserId(req) {
  const header = req.headers.authorization || ''
  const [scheme, token] = header.split(' ')
  if (scheme !== 'Bearer' || !token) return null
  try {
    const payload = verifyToken(token)
    const u = await query('SELECT is_active FROM users WHERE id=$1', [payload.sub])
    if (!u.rowCount) return null
    if (u.rows[0].is_active === false) return null
    return payload.sub
  } catch {
    return null
  }
}

// --- Auth ---

app.post('/auth/register', async (req, res) => {
  const email = normalizeEmail(req.body?.email)
  const password = req.body?.password

  if (!email || !email.includes('@')) return res.status(400).json({ error: 'Invalid email' })
  if (!isValidPassword(password)) return res.status(400).json({ error: 'Password must be at least 6 chars' })

  const existingUser = await query('SELECT id, is_email_verified FROM users WHERE email=$1', [email])
  if (existingUser.rowCount && existingUser.rows[0].is_email_verified) {
    return res.status(409).json({ error: 'Email already registered' })
  }

  // Legacy cleanup: if an unverified user record exists from an older flow, remove it.
  if (existingUser.rowCount && !existingUser.rows[0].is_email_verified) {
    await query('DELETE FROM users WHERE email=$1 AND is_email_verified=false', [email])
  }

  const passwordHash = await hashPassword(password)
  const code = randomCode6()
  const codeHash = hashCode(code)

  // Best-effort cleanup of old expired pending registrations.
  await query('DELETE FROM pending_registrations WHERE expires_at <= now()', [])

  await query(
    `
      INSERT INTO pending_registrations (email, password_hash, code_hash, expires_at, updated_at)
      VALUES ($1,$2,$3, now() + interval '15 minutes', now())
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        code_hash = EXCLUDED.code_hash,
        expires_at = EXCLUDED.expires_at,
        updated_at = now()
    `,
    [email, passwordHash, codeHash]
  )

  try {
    await sendMail({
      to: email,
      subject: 'Mertflix doğrulama kodu',
      text: `Doğrulama kodun: ${code}\nKod 15 dakika geçerlidir.`,
    })
  } catch (e) {
    await query('DELETE FROM pending_registrations WHERE email=$1', [email])
    return res.status(500).json({ error: e?.message ? String(e.message) : 'Email could not be sent' })
  }

  return res.status(201).json({ ok: true, message: 'Verification code sent' })
})

app.post('/auth/verify-email', async (req, res) => {
  const email = normalizeEmail(req.body?.email)
  const code = String(req.body?.code || '').trim()

  if (!email || !email.includes('@')) return res.status(400).json({ error: 'Invalid email' })
  if (!code) return res.status(400).json({ error: 'Invalid code' })

  // If already verified, return ok.
  const existingUser = await query('SELECT id, is_email_verified FROM users WHERE email=$1', [email])
  if (existingUser.rowCount && existingUser.rows[0].is_email_verified) return res.json({ ok: true })

  const codeHash = hashCode(code)

  // New flow: verify pending registration first.
  const pending = await query(
    `
      SELECT email, password_hash
      FROM pending_registrations
      WHERE email=$1
        AND code_hash=$2
        AND expires_at > now()
      LIMIT 1
    `,
    [email, codeHash]
  )

  if (pending.rowCount) {
    const passwordHash = pending.rows[0].password_hash

    await query(
      `
        INSERT INTO users (email, password_hash, is_email_verified)
        VALUES ($1,$2,true)
        ON CONFLICT (email) DO UPDATE SET
          password_hash = EXCLUDED.password_hash,
          is_email_verified = true
        WHERE users.is_email_verified = false
      `,
      [email, passwordHash]
    )

    await query('DELETE FROM pending_registrations WHERE email=$1', [email])
    return res.json({ ok: true })
  }

  // Legacy flow fallback: if an unverified user exists, allow verification via email_verification_codes.
  if (!existingUser.rowCount) return res.status(400).json({ error: 'Invalid code' })

  const user = existingUser.rows[0]
  const c = await query(
    `
      SELECT id
      FROM email_verification_codes
      WHERE user_id=$1
        AND code_hash=$2
        AND used_at IS NULL
        AND expires_at > now()
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [user.id, codeHash]
  )

  if (!c.rowCount) return res.status(400).json({ error: 'Invalid code' })
  await query('UPDATE email_verification_codes SET used_at=now() WHERE id=$1', [c.rows[0].id])
  await query('UPDATE users SET is_email_verified=true WHERE id=$1', [user.id])

  return res.json({ ok: true })
})

app.post('/auth/login', async (req, res) => {
  const email = normalizeEmail(req.body?.email)
  const password = req.body?.password

  if (!email || !email.includes('@')) return res.status(400).json({ error: 'Invalid email' })
  if (typeof password !== 'string') return res.status(400).json({ error: 'Invalid password' })

  const u = await query('SELECT id, password_hash, is_email_verified, two_factor_enabled, is_active FROM users WHERE email=$1', [email])
  if (!u.rowCount) return res.status(401).json({ error: 'Invalid credentials' })

  const user = u.rows[0]
  if (user.is_active === false) return res.status(403).json({ error: 'Account deactivated' })
  const ok = await verifyPassword(password, user.password_hash)
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' })
  if (!user.is_email_verified) return res.status(403).json({ error: 'Email not verified' })

  if (user.two_factor_enabled) {
    const code = randomCode6()
    const codeHash = hashCode(code)

    await query(
      'INSERT INTO login_2fa_codes (user_id, code_hash, expires_at) VALUES ($1,$2, now() + interval \'10 minutes\')',
      [user.id, codeHash]
    )

    try {
      await sendMail({
        to: email,
        subject: 'Mertflix giriş onay kodu (2FA)',
        text: `Giriş onay kodun: ${code}\nKod 10 dakika geçerlidir.`,
      })
    } catch (e) {
      return res.status(500).json({ error: e?.message ? String(e.message) : 'Email could not be sent' })
    }

    // Return a challenge marker. Client will call /auth/login-2fa with the code.
    const latest = await query(
      'SELECT id FROM login_2fa_codes WHERE user_id=$1 AND used_at IS NULL AND expires_at > now() ORDER BY created_at DESC LIMIT 1',
      [user.id]
    )
    return res.json({ requires2fa: true, challengeId: latest.rows?.[0]?.id })
  }

  const token = signToken({ sub: user.id, email })
  return res.json({ token })
})

app.post('/auth/login-2fa', async (req, res) => {
  const email = normalizeEmail(req.body?.email)
  const challengeId = String(req.body?.challengeId || '').trim()
  const code = String(req.body?.code || '').trim()

  if (!email || !email.includes('@')) return res.status(400).json({ error: 'Invalid email' })
  if (!challengeId) return res.status(400).json({ error: 'Invalid challengeId' })
  if (!code) return res.status(400).json({ error: 'Invalid code' })

  const u = await query('SELECT id, is_email_verified, two_factor_enabled, is_active FROM users WHERE email=$1', [email])
  if (!u.rowCount) return res.status(401).json({ error: 'Invalid credentials' })
  const user = u.rows[0]
  if (user.is_active === false) return res.status(403).json({ error: 'Account deactivated' })
  if (!user.is_email_verified) return res.status(403).json({ error: 'Email not verified' })
  if (!user.two_factor_enabled) return res.status(400).json({ error: '2FA not enabled' })

  const codeHash = hashCode(code)
  const c = await query(
    `
      SELECT id
      FROM login_2fa_codes
      WHERE id=$1
        AND user_id=$2
        AND code_hash=$3
        AND used_at IS NULL
        AND expires_at > now()
      LIMIT 1
    `,
    [challengeId, user.id, codeHash]
  )

  if (!c.rowCount) return res.status(400).json({ error: 'Invalid code' })

  await query('UPDATE login_2fa_codes SET used_at=now() WHERE id=$1', [c.rows[0].id])
  const token = signToken({ sub: user.id, email })
  return res.json({ token })
})

app.post('/auth/request-password-reset', async (req, res) => {
  const email = normalizeEmail(req.body?.email)
  if (!email || !email.includes('@')) return res.status(400).json({ error: 'Invalid email' })

  const u = await query('SELECT id FROM users WHERE email=$1', [email])
  if (u.rowCount) {
    const userId = u.rows[0].id
    const code = randomCode6()
    const codeHash = hashCode(code)
    await query(
      'INSERT INTO password_reset_codes (user_id, code_hash, expires_at) VALUES ($1,$2, now() + interval \'15 minutes\')',
      [userId, codeHash]
    )

    try {
      await sendMail({
        to: email,
        subject: 'Mertflix şifre sıfırlama kodu',
        text: `Şifre sıfırlama kodun: ${code}\nKod 15 dakika geçerlidir.`,
      })
    } catch (e) {
      return res.status(500).json({ error: e?.message ? String(e.message) : 'Email could not be sent' })
    }
  }

  // Always return ok to avoid leaking whether email exists
  return res.json({ ok: true, message: 'If the email exists, a reset code was sent' })
})

app.post('/auth/reset-password', async (req, res) => {
  const email = normalizeEmail(req.body?.email)
  const code = String(req.body?.code || '').trim()
  const newPassword = req.body?.newPassword

  if (!email || !email.includes('@')) return res.status(400).json({ error: 'Invalid email' })
  if (!code) return res.status(400).json({ error: 'Invalid code' })
  if (!isValidPassword(newPassword)) return res.status(400).json({ error: 'Password must be at least 6 chars' })

  const u = await query('SELECT id FROM users WHERE email=$1', [email])
  if (!u.rowCount) return res.status(400).json({ error: 'Invalid code' })

  const userId = u.rows[0].id
  const codeHash = hashCode(code)
  const c = await query(
    `
      SELECT id
      FROM password_reset_codes
      WHERE user_id=$1
        AND code_hash=$2
        AND used_at IS NULL
        AND expires_at > now()
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [userId, codeHash]
  )

  if (!c.rowCount) return res.status(400).json({ error: 'Invalid code' })

  const passwordHash = await hashPassword(newPassword)
  await query('UPDATE password_reset_codes SET used_at=now() WHERE id=$1', [c.rows[0].id])
  await query('UPDATE users SET password_hash=$1 WHERE id=$2', [passwordHash, userId])

  return res.json({ ok: true })
})

// --- Settings ---

app.get('/me/profile', requireAuth, async (req, res) => {
  const userId = req.user.sub
  const u = await query(
    'SELECT email, username, bio, avatar_style, avatar_seed FROM users WHERE id=$1',
    [userId]
  )
  if (!u.rowCount) return res.status(401).json({ error: 'Unauthorized' })
  const row = u.rows[0]
  return res.json({
    email: row.email,
    username: row.username || '',
    bio: row.bio || '',
    avatarStyle: row.avatar_style || 'pixel-art',
    avatarSeed: row.avatar_seed || '',
  })
})

app.put('/me/profile', requireAuth, async (req, res) => {
  const userId = req.user.sub
  const usernameRaw = req.body?.username != null ? String(req.body.username).trim() : ''
  const desiredUsername = usernameRaw ? usernameRaw.toLowerCase() : null
  const bio = req.body?.bio != null ? String(req.body.bio).slice(0, 280) : ''
  const avatarStyle = req.body?.avatarStyle ? String(req.body.avatarStyle).trim() : 'pixel-art'
  const avatarSeed = req.body?.avatarSeed ? String(req.body.avatarSeed).trim().slice(0, 80) : ''

  const allowedStyles = new Set(['pixel-art', 'bottts', 'avataaars', 'identicon', 'thumbs', 'lorelei'])
  if (!allowedStyles.has(avatarStyle)) return res.status(400).json({ error: 'Invalid avatarStyle' })

  const current = await query('SELECT username FROM users WHERE id=$1', [userId])
  if (!current.rowCount) return res.status(401).json({ error: 'Unauthorized' })
  const currentUsername = current.rows[0].username

  let usernameToSet = null
  if (desiredUsername) {
    // 3-20 chars: letters/numbers/underscore/dot
    if (desiredUsername.length < 3 || desiredUsername.length > 20) return res.status(400).json({ error: 'Invalid username' })
    if (!/^[a-z0-9_.]+$/.test(desiredUsername)) return res.status(400).json({ error: 'Invalid username' })

    // Username can only be chosen once.
    if (currentUsername && desiredUsername !== String(currentUsername).toLowerCase()) {
      return res.status(400).json({ error: 'Username cannot be changed' })
    }

    if (!currentUsername) {
      const taken = await query('SELECT id FROM users WHERE username=$1 AND id <> $2', [desiredUsername, userId])
      if (taken.rowCount) return res.status(409).json({ error: 'Username already taken' })
      usernameToSet = desiredUsername
    }
  }

  await query(
    'UPDATE users SET username=COALESCE($1, username), bio=$2, avatar_style=$3, avatar_seed=$4 WHERE id=$5',
    [usernameToSet, bio, avatarStyle, avatarSeed, userId]
  )

  return res.json({ ok: true })
})

app.get('/me/security', requireAuth, async (req, res) => {
  const userId = req.user.sub
  const u = await query('SELECT email, two_factor_enabled, is_active FROM users WHERE id=$1', [userId])
  if (!u.rowCount) return res.status(401).json({ error: 'Unauthorized' })
  return res.json({
    email: u.rows[0].email,
    twoFactorEnabled: Boolean(u.rows[0].two_factor_enabled),
    isActive: u.rows[0].is_active !== false,
  })
})

app.post('/me/password', requireAuth, async (req, res) => {
  const userId = req.user.sub
  const oldPassword = req.body?.oldPassword
  const newPassword = req.body?.newPassword

  if (typeof oldPassword !== 'string') return res.status(400).json({ error: 'Invalid oldPassword' })
  if (!isValidPassword(newPassword)) return res.status(400).json({ error: 'Password must be at least 6 chars' })

  const u = await query('SELECT password_hash FROM users WHERE id=$1', [userId])
  if (!u.rowCount) return res.status(401).json({ error: 'Unauthorized' })

  const ok = await verifyPassword(oldPassword, u.rows[0].password_hash)
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' })

  const newHash = await hashPassword(newPassword)
  await query('UPDATE users SET password_hash=$1 WHERE id=$2', [newHash, userId])
  return res.json({ ok: true })
})

app.post('/me/email-change/request', requireAuth, async (req, res) => {
  const userId = req.user.sub
  const newEmail = normalizeEmail(req.body?.newEmail)
  if (!newEmail || !newEmail.includes('@')) return res.status(400).json({ error: 'Invalid email' })

  const taken = await query('SELECT id FROM users WHERE email=$1', [newEmail])
  if (taken.rowCount) return res.status(409).json({ error: 'Email already registered' })

  const code = randomCode6()
  const codeHash = hashCode(code)

  await query(
    'INSERT INTO email_change_codes (user_id, new_email, code_hash, expires_at) VALUES ($1,$2,$3, now() + interval \'15 minutes\')',
    [userId, newEmail, codeHash]
  )

  try {
    await sendMail({
      to: newEmail,
      subject: 'Mertflix e-posta değiştirme kodu',
      text: `E-posta değiştirme kodun: ${code}\nKod 15 dakika geçerlidir.`,
    })
  } catch (e) {
    return res.status(500).json({ error: e?.message ? String(e.message) : 'Email could not be sent' })
  }

  const latest = await query(
    'SELECT id FROM email_change_codes WHERE user_id=$1 AND new_email=$2 AND used_at IS NULL AND expires_at > now() ORDER BY created_at DESC LIMIT 1',
    [userId, newEmail]
  )
  return res.json({ ok: true, requestId: latest.rows?.[0]?.id })
})

app.post('/me/email-change/confirm', requireAuth, async (req, res) => {
  const userId = req.user.sub
  const requestId = String(req.body?.requestId || '').trim()
  const newEmail = normalizeEmail(req.body?.newEmail)
  const code = String(req.body?.code || '').trim()
  if (!requestId) return res.status(400).json({ error: 'Invalid requestId' })
  if (!newEmail || !newEmail.includes('@')) return res.status(400).json({ error: 'Invalid email' })
  if (!code) return res.status(400).json({ error: 'Invalid code' })

  const taken = await query('SELECT id FROM users WHERE email=$1', [newEmail])
  if (taken.rowCount) return res.status(409).json({ error: 'Email already registered' })

  const codeHash = hashCode(code)
  const c = await query(
    `
      SELECT id
      FROM email_change_codes
      WHERE id=$1
        AND user_id=$2
        AND new_email=$3
        AND code_hash=$4
        AND used_at IS NULL
        AND expires_at > now()
      LIMIT 1
    `,
    [requestId, userId, newEmail, codeHash]
  )

  if (!c.rowCount) return res.status(400).json({ error: 'Invalid code' })

  await query('UPDATE email_change_codes SET used_at=now() WHERE id=$1', [c.rows[0].id])
  await query('UPDATE users SET email=$1 WHERE id=$2', [newEmail, userId])
  return res.json({ ok: true, email: newEmail })
})

app.post('/me/2fa', requireAuth, async (req, res) => {
  const userId = req.user.sub
  const enabled = Boolean(req.body?.enabled)
  await query('UPDATE users SET two_factor_enabled=$1 WHERE id=$2', [enabled, userId])
  return res.json({ ok: true, twoFactorEnabled: enabled })
})

app.post('/me/deactivate', requireAuth, async (req, res) => {
  const userId = req.user.sub
  const password = req.body?.password
  if (typeof password !== 'string') return res.status(400).json({ error: 'Invalid password' })

  const u = await query('SELECT password_hash FROM users WHERE id=$1', [userId])
  if (!u.rowCount) return res.status(401).json({ error: 'Unauthorized' })
  const ok = await verifyPassword(password, u.rows[0].password_hash)
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' })

  await query('UPDATE users SET is_active=false WHERE id=$1', [userId])
  return res.json({ ok: true })
})

app.post('/me/delete', requireAuth, async (req, res) => {
  const userId = req.user.sub
  const password = req.body?.password
  if (typeof password !== 'string') return res.status(400).json({ error: 'Invalid password' })

  const u = await query('SELECT password_hash FROM users WHERE id=$1', [userId])
  if (!u.rowCount) return res.status(401).json({ error: 'Unauthorized' })
  const ok = await verifyPassword(password, u.rows[0].password_hash)
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' })

  await query('DELETE FROM users WHERE id=$1', [userId])
  return res.json({ ok: true })
})

// --- List ---

app.get('/me/list', requireAuth, async (req, res) => {
  const userId = req.user.sub
  const rows = await query(
    'SELECT media_type, tmdb_id, title, poster_url, created_at FROM list_items WHERE user_id=$1 ORDER BY created_at DESC',
    [userId]
  )
  return res.json({ items: rows.rows })
})

app.post('/me/list', requireAuth, async (req, res) => {
  const userId = req.user.sub
  const mediaType = req.body?.mediaType
  const tmdbId = Number(req.body?.tmdbId)
  const title = req.body?.title ? String(req.body.title) : null
  const posterUrl = req.body?.posterUrl ? String(req.body.posterUrl) : null

  if (!isValidMediaType(mediaType)) return res.status(400).json({ error: 'Invalid mediaType' })
  if (!Number.isFinite(tmdbId)) return res.status(400).json({ error: 'Invalid tmdbId' })

  await query(
    `
      INSERT INTO list_items (user_id, media_type, tmdb_id, title, poster_url)
      VALUES ($1,$2,$3,$4,$5)
      ON CONFLICT (user_id, media_type, tmdb_id) DO UPDATE SET
        title = COALESCE(EXCLUDED.title, list_items.title),
        poster_url = COALESCE(EXCLUDED.poster_url, list_items.poster_url)
    `,
    [userId, mediaType, tmdbId, title, posterUrl]
  )

  return res.status(201).json({ ok: true })
})

app.delete('/me/list', requireAuth, async (req, res) => {
  const userId = req.user.sub
  const mediaType = req.query?.mediaType
  const tmdbId = Number(req.query?.tmdbId)

  if (!isValidMediaType(mediaType)) return res.status(400).json({ error: 'Invalid mediaType' })
  if (!Number.isFinite(tmdbId)) return res.status(400).json({ error: 'Invalid tmdbId' })

  await query('DELETE FROM list_items WHERE user_id=$1 AND media_type=$2 AND tmdb_id=$3', [userId, mediaType, tmdbId])
  return res.json({ ok: true })
})

// --- Watched ---

app.get('/me/watched', requireAuth, async (req, res) => {
  const userId = req.user.sub
  const rows = await query(
    'SELECT media_type, tmdb_id, title, poster_url, created_at FROM watched_items WHERE user_id=$1 ORDER BY created_at DESC',
    [userId]
  )
  return res.json({ items: rows.rows })
})

app.post('/me/watched', requireAuth, async (req, res) => {
  const userId = req.user.sub
  const mediaType = req.body?.mediaType
  const tmdbId = Number(req.body?.tmdbId)
  const title = req.body?.title ? String(req.body.title) : null
  const posterUrl = req.body?.posterUrl ? String(req.body.posterUrl) : null

  if (!isValidMediaType(mediaType)) return res.status(400).json({ error: 'Invalid mediaType' })
  if (!Number.isFinite(tmdbId)) return res.status(400).json({ error: 'Invalid tmdbId' })

  await query(
    `
      INSERT INTO watched_items (user_id, media_type, tmdb_id, title, poster_url)
      VALUES ($1,$2,$3,$4,$5)
      ON CONFLICT (user_id, media_type, tmdb_id) DO UPDATE SET
        title = COALESCE(EXCLUDED.title, watched_items.title),
        poster_url = COALESCE(EXCLUDED.poster_url, watched_items.poster_url)
    `,
    [userId, mediaType, tmdbId, title, posterUrl]
  )

  return res.status(201).json({ ok: true })
})

app.delete('/me/watched', requireAuth, async (req, res) => {
  const userId = req.user.sub
  const mediaType = req.query?.mediaType
  const tmdbId = Number(req.query?.tmdbId)

  if (!isValidMediaType(mediaType)) return res.status(400).json({ error: 'Invalid mediaType' })
  if (!Number.isFinite(tmdbId)) return res.status(400).json({ error: 'Invalid tmdbId' })

  await query('DELETE FROM watched_items WHERE user_id=$1 AND media_type=$2 AND tmdb_id=$3', [userId, mediaType, tmdbId])
  return res.json({ ok: true })
})

// --- Comments ---

app.get('/comments', async (req, res) => {
  const mediaType = req.query?.mediaType
  const tmdbId = Number(req.query?.tmdbId)

  if (!isValidMediaType(mediaType)) return res.status(400).json({ error: 'Invalid mediaType' })
  if (!Number.isFinite(tmdbId)) return res.status(400).json({ error: 'Invalid tmdbId' })

  const viewerUserId = await getOptionalViewerUserId(req)

  const rows = await query(
    `
      SELECT
        c.id,
        c.body,
        c.created_at,
        c.updated_at,
        c.user_id,
        u.username AS user_username,
        u.email AS user_email,
        u.avatar_style,
        u.avatar_seed,
        COALESCE(SUM(CASE WHEN cv.value = 1 THEN 1 ELSE 0 END), 0)::int AS upvotes,
        COALESCE(SUM(CASE WHEN cv.value = -1 THEN 1 ELSE 0 END), 0)::int AS downvotes,
        COALESCE(MAX(CASE WHEN cv.user_id = $3::uuid THEN cv.value END), 0)::int AS my_vote,
        COALESCE($3::uuid = c.user_id, false) AS can_delete
      FROM comments c
      JOIN users u ON u.id = c.user_id
      LEFT JOIN comment_votes cv ON cv.comment_id = c.id
      WHERE c.media_type=$1 AND c.tmdb_id=$2
      GROUP BY c.id, u.username, u.email, u.avatar_style, u.avatar_seed, c.user_id
      ORDER BY c.created_at DESC
      LIMIT 200
    `,
    [mediaType, tmdbId, viewerUserId]
  )

  return res.json({ comments: rows.rows })
})

app.post('/comments', requireAuth, async (req, res) => {
  const userId = req.user.sub
  const mediaType = req.body?.mediaType
  const tmdbId = Number(req.body?.tmdbId)
  const body = String(req.body?.body || '').trim()

  if (!isValidMediaType(mediaType)) return res.status(400).json({ error: 'Invalid mediaType' })
  if (!Number.isFinite(tmdbId)) return res.status(400).json({ error: 'Invalid tmdbId' })
  if (!body || body.length < 2) return res.status(400).json({ error: 'Comment too short' })
  if (body.length > 1000) return res.status(400).json({ error: 'Comment too long' })

  const inserted = await query(
    `
      INSERT INTO comments (user_id, media_type, tmdb_id, body)
      VALUES ($1,$2,$3,$4)
      RETURNING id
    `,
    [userId, mediaType, tmdbId, body]
  )

  return res.status(201).json({ ok: true, id: inserted.rows[0].id })
})

app.delete('/comments/:id', requireAuth, async (req, res) => {
  const userId = req.user.sub
  const commentId = String(req.params?.id || '').trim()
  if (!commentId) return res.status(400).json({ error: 'Invalid id' })

  const c = await query('SELECT user_id FROM comments WHERE id=$1', [commentId])
  if (!c.rowCount) return res.status(404).json({ error: 'Not found' })
  if (c.rows[0].user_id !== userId) return res.status(403).json({ error: 'Forbidden' })

  await query('DELETE FROM comments WHERE id=$1', [commentId])
  return res.json({ ok: true })
})

app.post('/comments/:id/vote', requireAuth, async (req, res) => {
  const userId = req.user.sub
  const commentId = String(req.params?.id || '').trim()
  const value = Number(req.body?.value)

  if (!commentId) return res.status(400).json({ error: 'Invalid id' })
  if (![ -1, 0, 1 ].includes(value)) return res.status(400).json({ error: 'Invalid vote' })

  const exists = await query('SELECT id FROM comments WHERE id=$1', [commentId])
  if (!exists.rowCount) return res.status(404).json({ error: 'Not found' })

  if (value === 0) {
    await query('DELETE FROM comment_votes WHERE comment_id=$1 AND user_id=$2', [commentId, userId])
    return res.json({ ok: true, value: 0 })
  }

  await query(
    `
      INSERT INTO comment_votes (comment_id, user_id, value)
      VALUES ($1,$2,$3)
      ON CONFLICT (comment_id, user_id) DO UPDATE SET
        value = EXCLUDED.value,
        updated_at = now()
    `,
    [commentId, userId, value]
  )

  return res.json({ ok: true, value })
})

app.listen(config.port, () => {
  console.log(`API listening on http://localhost:${config.port}`)
})
