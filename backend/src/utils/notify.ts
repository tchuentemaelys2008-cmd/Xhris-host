import { prisma } from './prisma';
import { getIO } from './io-instance';
import { sendPushToUser } from './push';

export async function notify(
  userId: string,
  data: { title: string; message: string; type?: string; link?: string }
) {
  try {
    const notif = await prisma.notification.create({
      data: {
        userId,
        title: data.title,
        message: data.message,
        type: (data.type || 'INFO') as any,
        link: data.link,
      },
    });

    const io = getIO();
    if (io) io.to(`user:${userId}`).emit('notification:new', notif);

    sendPushToUser(userId, {
      title: data.title,
      body: data.message,
      url: data.link || '/dashboard',
    }).catch(() => {});

    return notif;
  } catch (err) {
    console.error('[notify] error:', err);
    return null;
  }
}

export async function notifyMany(
  userIds: string[],
  data: { title: string; message: string; type?: string; link?: string }
) {
  await Promise.allSettled(userIds.map(uid => notify(uid, data)));
}
