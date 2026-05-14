import { logger } from './logger';

const FROM = 'XHRIS HOST <noreply@xhris.host>';

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    logger.info(`[Email skipped - no RESEND_API_KEY] To: ${to} | Subject: ${subject}`);
    return;
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: FROM, to, subject, html }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(JSON.stringify(err));
    }
  } catch (err) {
    logger.error('Resend email error:', err);
    throw err;
  }
}

// ── Base email template ──────────────────────────────────────────
function baseTemplate(title: string, body: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;padding:0;background:#0A0A0F;font-family:'Segoe UI',sans-serif;">
      <div style="max-width:560px;margin:40px auto;background:#111118;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);">
        <div style="background:linear-gradient(135deg,#6d28d9,#4f46e5);padding:28px 32px;text-align:center;">
          <div style="display:inline-flex;align-items:center;gap:10px;">
            <div style="width:36px;height:36px;background:rgba(255,255,255,0.15);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;">⚡</div>
            <span style="font-size:20px;font-weight:700;color:#fff;">XHRIS <span style="color:#c4b5fd;">HOST</span></span>
          </div>
        </div>
        <div style="padding:32px;">
          <h2 style="color:#fff;font-size:20px;margin:0 0 16px;">${title}</h2>
          ${body}
        </div>
        <div style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
          <p style="color:#6b7280;font-size:12px;margin:0;">© 2026 XHRIS Host. Tous droits réservés.</p>
          <p style="color:#6b7280;font-size:11px;margin:6px 0 0;">
            <a href="https://xhris.host" style="color:#8b5cf6;text-decoration:none;">xhris.host</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function btn(url: string, label: string): string {
  return `<a href="${url}" style="display:inline-block;background:#6d28d9;color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;margin:16px 0;">${label}</a>`;
}

function para(text: string): string {
  return `<p style="color:#9ca3af;font-size:14px;line-height:1.6;margin:0 0 12px;">${text}</p>`;
}

// ── Email functions ──────────────────────────────────────────────

export async function sendVerificationEmail(to: string, name: string, token: string): Promise<void> {
  const url = `${process.env.FRONTEND_URL}/auth/verify-email?token=${token}`;
  await sendEmail(to, 'Vérifiez votre email — XHRIS HOST', baseTemplate(
    `Bienvenue, ${name} !`,
    para('Cliquez sur le bouton ci-dessous pour vérifier votre adresse email et activer votre compte.') +
    btn(url, 'Vérifier mon email') +
    para('Ce lien expire dans <strong style="color:#fff;">24 heures</strong>. Si vous n\'avez pas créé de compte, ignorez cet email.')
  ));
}

export async function sendPasswordResetEmail(to: string, name: string, token: string): Promise<void> {
  const url = `${process.env.FRONTEND_URL}/auth/reset-password?token=${token}`;
  await sendEmail(to, 'Réinitialisation de mot de passe — XHRIS HOST', baseTemplate(
    `Réinitialisation de mot de passe`,
    para(`Bonjour ${name},`) +
    para('Vous avez demandé la réinitialisation de votre mot de passe. Cliquez ci-dessous pour en créer un nouveau.') +
    btn(url, 'Réinitialiser mon mot de passe') +
    para('Ce lien expire dans <strong style="color:#fff;">1 heure</strong>. Si vous n\'avez pas demandé cette réinitialisation, ignorez cet email.')
  ));
}

export async function sendWelcomeEmail(to: string, name: string): Promise<void> {
  await sendEmail(to, 'Bienvenue sur XHRIS HOST ! ⚡', baseTemplate(
    `Bienvenue ${name} !`,
    para('Votre compte a été créé avec succès. Vous avez reçu <strong style="color:#fbbf24;">10 coins de bienvenue</strong> pour démarrer.') +
    para('Vous pouvez maintenant déployer vos bots WhatsApp, gérer vos serveurs cloud et accéder au marketplace.') +
    btn(`${process.env.FRONTEND_URL}/dashboard`, 'Accéder au dashboard')
  ));
}

export async function sendOtpEmail(to: string, name: string, otp: string): Promise<void> {
  await sendEmail(to, 'Code de vérification — XHRIS HOST', baseTemplate(
    'Votre code OTP',
    para(`Bonjour ${name},`) +
    para('Utilisez ce code pour confirmer votre action :') +
    `<div style="background:#1a1a2e;border:1px solid rgba(109,40,217,0.3);border-radius:12px;padding:20px;text-align:center;margin:16px 0;">
      <span style="font-size:36px;font-weight:700;color:#c4b5fd;letter-spacing:8px;">${otp}</span>
    </div>` +
    para('Ce code expire dans <strong style="color:#fff;">10 minutes</strong>. Ne le partagez avec personne.')
  ));
}

export async function sendDeploymentConfirmationEmail(to: string, name: string, botName: string): Promise<void> {
  await sendEmail(to, `Bot déployé : ${botName} — XHRIS HOST`, baseTemplate(
    'Déploiement réussi !',
    para(`Bonjour ${name},`) +
    para(`Votre bot <strong style="color:#fff;">${botName}</strong> a été déployé avec succès et est maintenant actif.`) +
    para('Vous pouvez le gérer depuis votre dashboard.') +
    btn(`${process.env.FRONTEND_URL}/dashboard/bots`, 'Gérer mes bots')
  ));
}

export async function sendServerNotificationEmail(to: string, name: string, serverName: string, message: string): Promise<void> {
  await sendEmail(to, `Alerte serveur : ${serverName} — XHRIS HOST`, baseTemplate(
    `Notification serveur`,
    para(`Bonjour ${name},`) +
    para(`Une alerte a été détectée sur votre serveur <strong style="color:#fff;">${serverName}</strong> :`) +
    `<div style="background:#1a1a2e;border-left:3px solid #f59e0b;padding:12px 16px;border-radius:0 8px 8px 0;margin:12px 0;">
      <p style="color:#fbbf24;margin:0;font-size:14px;">${message}</p>
    </div>` +
    btn(`${process.env.FRONTEND_URL}/dashboard/servers`, 'Voir mes serveurs')
  ));
}

export async function sendSubscriptionInvoiceEmail(to: string, name: string, plan: string, amount: string, period: string): Promise<void> {
  await sendEmail(to, `Facture abonnement ${plan} — XHRIS HOST`, baseTemplate(
    'Votre facture',
    para(`Bonjour ${name},`) +
    para(`Merci pour votre abonnement <strong style="color:#fff;">${plan}</strong>.`) +
    `<div style="background:#1a1a2e;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:20px;margin:16px 0;">
      <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
        <span style="color:#9ca3af;font-size:13px;">Plan</span>
        <span style="color:#fff;font-size:13px;font-weight:600;">${plan}</span>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
        <span style="color:#9ca3af;font-size:13px;">Période</span>
        <span style="color:#fff;font-size:13px;">${period}</span>
      </div>
      <div style="display:flex;justify-content:space-between;border-top:1px solid rgba(255,255,255,0.06);padding-top:12px;margin-top:4px;">
        <span style="color:#9ca3af;font-size:14px;font-weight:600;">Total</span>
        <span style="color:#c4b5fd;font-size:16px;font-weight:700;">${amount}</span>
      </div>
    </div>` +
    btn(`${process.env.FRONTEND_URL}/dashboard`, 'Voir mon compte')
  ));
}

export async function sendBotReviewEmail(
  to: string,
  name: string,
  botName: string,
  status: 'PUBLISHED' | 'REJECTED',
  reason?: string
): Promise<void> {
  const approved = status === 'PUBLISHED';
  await sendEmail(
    to,
    approved ? `✅ Bot approuvé : ${botName} — XHRIS HOST` : `❌ Bot rejeté : ${botName} — XHRIS HOST`,
    baseTemplate(
      approved ? 'Félicitations ! Votre bot est publié' : 'Votre bot a été rejeté',
      para(`Bonjour ${name},`) +
      (approved
        ? para(`Bonne nouvelle ! Votre bot <strong style="color:#fff;">${botName}</strong> a été approuvé et est maintenant disponible sur le marketplace.`)
        : para(`Votre bot <strong style="color:#fff;">${botName}</strong> n'a pas été accepté pour le moment.`)) +
      (reason
        ? `<div style="background:#1a1a2e;border-left:3px solid ${approved ? '#22c55e' : '#ef4444'};padding:12px 16px;border-radius:0 8px 8px 0;margin:12px 0;">
            <p style="color:${approved ? '#86efac' : '#fca5a5'};margin:0;font-size:14px;">${reason}</p>
          </div>`
        : '') +
      (approved
        ? btn(`${process.env.FRONTEND_URL}/marketplace`, 'Voir sur le marketplace')
        : btn(`${process.env.FRONTEND_URL}/developer/publications`, 'Modifier et resoumettre'))
    )
  );
}

export async function sendServerExpirationAlertEmail(to: string, name: string, serverName: string, daysLeft: number): Promise<void> {
  const isUrgent = daysLeft <= 3;
  await sendEmail(to, `${isUrgent ? '🚨 ' : ''}Expiration serveur : ${serverName} — XHRIS HOST`, baseTemplate(
    isUrgent ? 'Action requise — Serveur bientôt expiré' : `Rappel : expiration dans ${daysLeft} jours`,
    para(`Bonjour ${name},`) +
    para(`Votre serveur <strong style="color:#fff;">${serverName}</strong> expire dans <strong style="color:${isUrgent ? '#ef4444' : '#fbbf24'};">${daysLeft} jour${daysLeft > 1 ? 's' : ''}</strong>.`) +
    (isUrgent ? para('Renouvelez maintenant pour éviter l\'interruption de service.') : para('Pensez à renouveler votre abonnement pour maintenir votre serveur actif.')) +
    btn(`${process.env.FRONTEND_URL}/dashboard/servers`, 'Renouveler mon serveur')
  ));
}
