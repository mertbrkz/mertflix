import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { config } from './config.js'

export async function hashPassword(password) {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash)
}

export function signToken(payload) {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn })
}

export function verifyToken(token) {
  return jwt.verify(token, config.jwtSecret)
}

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

export function randomCode6() {
  // 6-digit numeric code
  const n = crypto.randomInt(0, 1_000_000)
  return String(n).padStart(6, '0')
}

export function hashCode(code) {
  // HMAC so we never store raw codes
  return crypto.createHmac('sha256', config.jwtSecret).update(String(code)).digest('hex')
}
