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
  const transport = buildTransport();
  if (!transport) {
    if (NODE_ENV === 'production') {
      throw new Error('SMTP is not configured for production');
    }
    console.log(`OTP for ${to}: ${text}`);
    return;
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
