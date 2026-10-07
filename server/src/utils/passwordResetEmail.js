import nodemailer from 'nodemailer';

export async function sendPasswordResetEmail(email, token) {
  const { SMTP_HOST, SMTP_PORT = '587', SMTP_USER, SMTP_PASSWORD, SMTP_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD || !SMTP_FROM) {
    throw new Error('Password reset email is not configured');
  }
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
  await transporter.sendMail({
    from: SMTP_FROM,
    to: email,
    subject: 'Multaqa — Password reset / إعادة تعيين كلمة المرور',
    text: `Your password reset code (valid for one hour):\n${token}\n\nرمز إعادة تعيين كلمة المرور صالح لمدة ساعة.\nIf you did not request this, ignore this email.`
  });
}
