import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import crypto from 'crypto';

export async function fireWebhook(userId: string, event: string, data: any): Promise<void> {
  try {
    const webhooks = await prisma.webhook.findMany({
      where: { userId, status: 'ACTIVE', events: { has: event } },
    });

    for (const wh of webhooks) {
      try {
        const payload = { event, timestamp: new Date().toISOString(), data };
        const sig = crypto.createHmac('sha256', wh.secret).update(JSON.stringify(payload)).digest('hex');

        const resp = await fetch(wh.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-XHRIS-Signature': `sha256=${sig}`,
          },
          body: JSON.stringify(payload),
        });

        await prisma.webhook.update({
          where: { id: wh.id },
          data: { lastActivity: new Date(), lastStatus: `${resp.status}` },
        });
      } catch (err) {
        logger.error(`Webhook fire error for ${wh.id}:`, err);
      }
    }
  } catch (err) {
    logger.error('fireWebhook error:', err);
  }
}
