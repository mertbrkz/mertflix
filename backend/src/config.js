import dotenv from 'dotenv'

dotenv.config()

function required(name) {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env: ${name}`)
  return v
}

function parseCorsOrigins() {
  const raw = process.env.CORS_ORIGIN
  if (!raw) return ['http://localhost:5173', 'http://localhost:5174']
  return raw
    .split(',')
    .map((s) => s.trim())
    .map((s) => s.replace(/\/+$/, ''))
    .filter(Boolean)
}

export const config = {
  port: Number(process.env.PORT || 4000),
  databaseUrl: required('DATABASE_URL'),
  corsOrigin: parseCorsOrigins(),
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  mailFrom: process.env.MAIL_FROM || (process.env.SMTP_USER ? String(process.env.SMTP_USER).trim() : '') || 'no-reply@mertflix.local',
  smtp: {
    host: process.env.SMTP_HOST ? String(process.env.SMTP_HOST).trim() : '',
    port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : null,
    user: process.env.SMTP_USER ? String(process.env.SMTP_USER).trim() : '',
    // Gmail App Passwords are often pasted with spaces; normalize them.
    pass: process.env.SMTP_PASS ? String(process.env.SMTP_PASS).replace(/\s+/g, '') : '',
  },
}
