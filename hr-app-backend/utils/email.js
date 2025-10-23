// utils/email.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

transporter.verify()
  .then(() => console.log('Gmail SMTP transporter ready'))
  .catch(err => console.error('Gmail transporter error:', err));

async function sendResetEmail({ to, subject, html }) {
  const info = await transporter.sendMail({
    from: `"HR" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    html,
  });
  return info;
}

module.exports = { sendResetEmail };
