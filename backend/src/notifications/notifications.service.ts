import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';

export async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: string = 'INFO'
): Promise<void> {
  try {
    await prisma.notification.create({
      data: { userId, title, message, type: type as any },
    });
  } catch (err) {
    logger.error('createNotification error:', err);
  }
}
