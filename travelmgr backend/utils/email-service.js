const nodemailer = require('nodemailer')

const SMTP_HOST = process.env.SMTP_HOST
const SMTP_PORT = Number(process.env.SMTP_PORT || 587)
const SMTP_USER = process.env.SMTP_USER
const SMTP_PASS = process.env.SMTP_PASS
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@travel-manager.local'
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

const isEmailConfigured = () => Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS)

let transporter = null

const getTransporter = () => {
  if (!isEmailConfigured()) return null
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS
      }
    })
  }
  return transporter
}

const sendMail = async ({ to, subject, text, html }) => {
  const transport = getTransporter()

  if (!transport) {
    console.info('[email-service] SMTP not configured — message logged instead of sent:')
    console.info(`  To: ${to}`)
    console.info(`  Subject: ${subject}`)
    console.info(`  Body: ${text}`)
    return { delivered: false, logged: true }
  }

  await transport.sendMail({
    from: EMAIL_FROM,
    to,
    subject,
    text,
    html: html || text
  })

  return { delivered: true, logged: false }
}

const sendPasswordResetEmail = async ({ to, username, token, language = 'fr' }) => {
  const resetUrl = `${FRONTEND_URL.replace(/\/$/, '')}/?resetToken=${encodeURIComponent(token)}`
  const subjects = {
    en: 'Travel Manager — Password reset',
    fr: 'Travel Manager — Réinitialisation du mot de passe',
    es: 'Travel Manager — Restablecimiento de contraseña',
    nl: 'Travel Manager — Wachtwoord resetten'
  }
  const bodies = {
    en: `Hello ${username},\n\nUse this link to reset your password (valid for 1 hour):\n${resetUrl}\n\nIf you did not request this, ignore this email.`,
    fr: `Bonjour ${username},\n\nUtilisez ce lien pour réinitialiser votre mot de passe (valide 1 heure) :\n${resetUrl}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez ce message.`,
    es: `Hola ${username},\n\nUse este enlace para restablecer su contraseña (válido 1 hora):\n${resetUrl}\n\nSi no solicitó esto, ignore este correo.`,
    nl: `Hallo ${username},\n\nGebruik deze link om uw wachtwoord te resetten (1 uur geldig):\n${resetUrl}\n\nAls u dit niet heeft aangevraagd, negeer deze e-mail.`
  }
  const lang = ['en', 'fr', 'es', 'nl'].includes(language) ? language : 'fr'
  const subject = subjects[lang]
  const text = bodies[lang]

  return sendMail({ to, subject, text })
}

module.exports = {
  isEmailConfigured,
  sendMail,
  sendPasswordResetEmail,
  FRONTEND_URL
}
