import nodemailer from 'nodemailer';

async function sendEmail(email, subject, text) {
  const {
    SMTP_HOST,
    SMTP_PORT = '587',
    SMTP_USER,
    SMTP_PASSWORD,
    SMTP_FROM
  } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD || !SMTP_FROM)
    throw new Error('Email delivery is not configured');
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    requireTLS: Number(SMTP_PORT) !== 465,
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
    connectionTimeout: 10000,
    socketTimeout: 10000,
    disableFileAccess: true,
    disableUrlAccess: true
  });
  await transporter.sendMail({ from: SMTP_FROM, to: email, subject, text });
}
export const sendPasswordResetEmail = (email, token) =>
  sendEmail(
    email,
    'Multaqa — Password reset / إعادة تعيين كلمة المرور',
    `Reset your password within one hour / استرجع حسابك خلال ساعة:\n${new URL('/reset-password', process.env.APP_URL || process.env.CORS_ORIGIN).href}#token=${token}\n\nإذا لم تطلب تغيير كلمة المرور، تجاهل الرسالة.`
  );
export const sendEmailVerification = (email, token) => {
  const origin = new URL(process.env.APP_URL || process.env.CORS_ORIGIN);
  const link = new URL('/verify-email', origin);
  link.hash = new URLSearchParams({ token }).toString();
  return sendEmail(
    email,
    'Multaqa — Verify email / تأكيد البريد',
    `Confirm your email within 30 minutes / أكّد بريدك خلال 30 دقيقة:\n${link.href}\n\nإذا لم تطلب ذلك، تجاهل الرسالة.`
  );
};
