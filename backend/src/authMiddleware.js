import { verifyToken } from './security.js'
import { query } from './db.js'

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const [scheme, token] = header.split(' ')
  if (scheme !== 'Bearer' || !token) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const payload = verifyToken(token)
    req.user = payload

    const u = await query('SELECT email, is_active FROM users WHERE id=$1', [payload.sub])
    if (!u.rowCount) return res.status(401).json({ error: 'Unauthorized' })
    if (u.rows[0].is_active === false) return res.status(403).json({ error: 'Account deactivated' })

    req.user.email = u.rows[0].email
    return next()
  } catch {
    return res.status(401).json({ error: 'Unauthorized' })
  }
}
