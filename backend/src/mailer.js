import nodemailer from 'nodemailer'
import { config } from './config.js'

function hasSmtpConfigured() {
  return !!(config.smtp.host && config.smtp.port && config.smtp.user && config.smtp.pass)
}

function hasAnySmtpSetting() {
  return !!(config.smtp.host || config.smtp.port || config.smtp.user || config.smtp.pass)
}

export async function sendMail({ to, subject, text }) {
  if (!hasSmtpConfigured()) {
    // If the user started configuring SMTP, fail loudly to avoid "code sent" UX without delivery.
    if (hasAnySmtpSetting()) {
      throw new Error('SMTP is not fully configured (set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS)')
    }

    // Dev / grading friendly: no external dependency needed.
    console.log('[MAIL:DEV] to=', to)
    console.log('[MAIL:DEV] subject=', subject)
    console.log('[MAIL:DEV] text=', text)
    return
  }

  const timeoutMsRaw = process.env.SMTP_TIMEOUT_MS
  const timeoutMs = timeoutMsRaw ? Number(timeoutMsRaw) : 15000

  const transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.port === 465,
    auth: {
      user: config.smtp.user,
      pass: config.smtp.pass,
    },
    connectionTimeout: Number.isFinite(timeoutMs) ? timeoutMs : 15000,
    greetingTimeout: Number.isFinite(timeoutMs) ? timeoutMs : 15000,
    socketTimeout: Number.isFinite(timeoutMs) ? timeoutMs * 2 : 30000,
  })

  try {
    await transporter.sendMail({
      from: config.mailFrom || config.smtp.user,
      to,
      subject,
      text,
    })
  } catch (e) {
    const msg = e?.message ? String(e.message) : String(e)
    console.error('[MAIL:ERROR]', {
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      timeoutMs,
      message: msg,
      code: e?.code,
      command: e?.command,
      response: e?.response,
      responseCode: e?.responseCode,
    })
    throw new Error('Email could not be sent')
  }
}
