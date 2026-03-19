const nodemailer = require('nodemailer');

const {
  NODE_ENV,
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM,
  SMTP_SECURE,
} = process.env;

const buildTransport = () => {
  if (!SMTP_HOST) return null;
  const port = SMTP_PORT ? Number.parseInt(SMTP_PORT, 10) : 587;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: SMTP_SECURE === 'true' || port === 465,
    auth: SMTP_USER
      ? {
          user: SMTP_USER,
          pass: SMTP_PASS,
        }
      : undefined,
  });
};

const sendEmail = async ({ to, subject, text }) => {
  if (NODE_ENV !== 'production') {
    console.log(`\n[DEV] Email to: ${to}\n[DEV] Subject: ${subject}\n[DEV] Body: ${text}\n`);
    return;
  }

  const transport = buildTransport();
  if (!transport) {
    throw new Error('SMTP is not configured for production');
  }

  const from = SMTP_FROM || SMTP_USER;
  if (!from) {
    throw new Error('SMTP_FROM or SMTP_USER must be set');
  }

  await transport.sendMail({ from, to, subject, text });
};

module.exports = {
  sendEmail,
};
