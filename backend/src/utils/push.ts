import webpush from 'web-push';
import { prisma } from './prisma';
import { logger } from './logger';

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:contact@xhrishost.site';

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
}

export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; icon?: string; url?: string; tag?: string }
) {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return;

  const subscriptions = await (prisma as any).pushSubscription.findMany({ where: { userId } });
  if (!subscriptions.length) return;

  const results = await Promise.allSettled(
    subscriptions.map(async (sub: any) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({
            title: payload.title,
            body: payload.body,
            icon: payload.icon || '/icon-192.png',
            badge: '/icon-192.png',
            data: { url: payload.url || '/dashboard' },
            tag: payload.tag || 'xhris-notification',
          })
        );
      } catch (err: any) {
        // 410 Gone = subscription expired, clean up
        if (err.statusCode === 410 || err.statusCode === 404) {
          await (prisma as any).pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        }
        throw err;
      }
    })
  );

  const failed = results.filter(r => r.status === 'rejected').length;
  if (failed > 0) logger.warn(`Push: ${results.length - failed} sent, ${failed} failed for user ${userId}`);
}

export async function sendPushToAll(
  payload: { title: string; body: string; icon?: string; url?: string }
) {
  const subs = await (prisma as any).pushSubscription.findMany();
  const userIds = [...new Set(subs.map((s: any) => s.userId))] as string[];
  await Promise.allSettled(userIds.map(uid => sendPushToUser(uid, payload)));
}

export { VAPID_PUBLIC };
