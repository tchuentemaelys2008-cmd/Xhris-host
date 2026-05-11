import { logger } from './logger';

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    logger.info(`[Email skipped - no SMTP config] To: ${to} | Subject: ${subject}`);
    return;
  }

  try {
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.default.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM || `XHRIS HOST <noreply@xhris.host>`,
      to,
      subject,
      html,
    });
  } catch (err) {
    logger.error('Email send error:', err);
    throw err;
  }
}

export async function sendVerificationEmail(to: string, name: string, token: string): Promise<void> {
  const url = `${process.env.FRONTEND_URL}/auth/verify-email?token=${token}`;
  await sendEmail(to, 'Vérifiez votre email - XHRIS HOST', `
    <h2>Bienvenue ${name} !</h2>
    <p>Cliquez sur le lien ci-dessous pour vérifier votre email :</p>
    <a href="${url}" style="background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;">Vérifier mon email</a>
    <p>Ce lien expire dans 24h.</p>
  `);
}

export async function sendPasswordResetEmail(to: string, name: string, token: string): Promise<void> {
  const url = `${process.env.FRONTEND_URL}/auth/reset-password?token=${token}`;
  await sendEmail(to, 'Réinitialisation de mot de passe - XHRIS HOST', `
    <h2>Bonjour ${name},</h2>
    <p>Cliquez pour réinitialiser votre mot de passe :</p>
    <a href="${url}" style="background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;">Réinitialiser</a>
    <p>Ce lien expire dans 1h. Si vous n'avez pas fait cette demande, ignorez cet email.</p>
  `);
}

export async function sendWelcomeEmail(to: string, name: string): Promise<void> {
  await sendEmail(to, 'Bienvenue sur XHRIS HOST ! 🎉', `
    <h2>Bienvenue ${name} !</h2>
    <p>Votre compte a été créé avec succès. Vous avez reçu <strong>10 coins de bienvenue</strong>.</p>
    <a href="${process.env.FRONTEND_URL}/dashboard" style="background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;">Accéder au dashboard</a>
  `);
}
