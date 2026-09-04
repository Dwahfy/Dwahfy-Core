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

const SITE_URL = 'https://dwahfy.com';
const LOGO_URL = `${SITE_URL}/android-chrome-192x192.png`;

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

/**
 * Builds a branded HTML email for OTP / verification flows.
 *
 * @param {object} opts
 * @param {string} opts.heading    - Main heading, e.g. "Your verification code"
 * @param {string} opts.otp        - 6-digit OTP to display prominently
 * @param {string} opts.description - Body copy shown below the OTP
 */
const buildOtpEmail = ({ heading, otp, description }) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${heading}</title>
</head>
<body style="margin:0;padding:0;background-color:#f0ecf8;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">

  <!-- Outer wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0ecf8;padding:32px 16px;">
    <tr>
      <td align="center">

        <!-- Email card -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(107,42,255,0.12);">

          <!-- Header -->
          <tr>
            <td style="background-color:#18152a;padding:28px 40px;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:10px;">
                    <img src="${LOGO_URL}" width="36" height="36" alt="" style="display:block;border-radius:8px;" />
                  </td>
                  <td style="vertical-align:middle;">
                    <span style="font-size:22px;font-weight:700;letter-spacing:-0.5px;color:#b99aff;">Dwahfy</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background-color:#ffffff;padding:40px 40px 32px;">

              <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#18152a;line-height:1.3;">${heading}</h1>
              <p style="margin:0 0 28px;font-size:15px;color:#6b7280;line-height:1.6;">${description}</p>

              <!-- OTP box -->
              <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
                <tr>
                  <td style="background-color:#f3eeff;border:2px solid #b99aff;border-radius:12px;padding:20px 36px;text-align:center;">
                    <span style="display:block;font-size:36px;font-weight:800;letter-spacing:10px;color:#6b2aff;font-family:'Courier New',Courier,monospace;">${otp}</span>
                    <span style="display:block;margin-top:8px;font-size:12px;color:#8a56ff;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;">Expires in 10 minutes</span>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
                If you didn't request this, you can safely ignore this email. Your account remains secure.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#18152a;padding:20px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <p style="margin:0;font-size:12px;color:#6b5fa0;">
                      © ${new Date().getFullYear()} Dwahfy &nbsp;·&nbsp;
                      <a href="${SITE_URL}" style="color:#b99aff;text-decoration:none;">${SITE_URL.replace('https://', '')}</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
        <!-- /Email card -->

      </td>
    </tr>
  </table>

</body>
</html>`;

const sendEmail = async ({ to, subject, text, html }) => {
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

  await transport.sendMail({ from, to, subject, text, html });
};

module.exports = {
  sendEmail,
  buildOtpEmail,
};
