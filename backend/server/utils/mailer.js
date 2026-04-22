const nodemailer = require("nodemailer");

let cachedTransporter = null;

const getMailConfig = () => ({
  host: String(process.env.SMTP_HOST || "").trim(),
  port: Number(process.env.SMTP_PORT || 587),
  secure: String(process.env.SMTP_SECURE || "false").trim().toLowerCase() === "true",
  user: String(process.env.SMTP_USER || "").trim(),
  pass: String(process.env.SMTP_PASS || "").trim(),
  fromEmail: String(process.env.SMTP_FROM_EMAIL || "").trim(),
  fromName: String(process.env.SMTP_FROM_NAME || "BagPacker").trim(),
});

const hasMailConfig = (config) =>
  Boolean(config.host && config.port && config.user && config.pass && config.fromEmail);

const getTransporter = () => {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  const config = getMailConfig();
  if (!hasMailConfig(config)) {
    return null;
  }

  cachedTransporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  return cachedTransporter;
};

const sendMail = async ({ to, subject, text, html }) => {
  const config = getMailConfig();
  const transporter = getTransporter();
  if (!transporter) {
    return { delivered: false, skipped: true, reason: "SMTP is not configured" };
  }

  const result = await transporter.sendMail({
    from: `"${config.fromName}" <${config.fromEmail}>`,
    to,
    subject,
    text,
    html,
  });

  return { delivered: true, skipped: false, messageId: result.messageId };
};

module.exports = {
  sendMail,
};
