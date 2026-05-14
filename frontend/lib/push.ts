import { apiClient } from './api';

export function detectPlatform(): 'ios' | 'android' | 'desktop' {
  const ua = navigator.userAgent || '';
  if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
    return 'ios';
  }
  if (/Android/i.test(ua)) return 'android';
  return 'desktop';
}

export function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || (navigator as any).standalone === true;
}

export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window;
}

export function getPushPermission(): 'granted' | 'denied' | 'default' | 'unsupported' {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission;
}

export async function registerSW(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    return reg;
  } catch (err) {
    console.error('[XHRIS] SW registration failed:', err);
    return null;
  }
}

export async function subscribeToPush(): Promise<boolean> {
  try {
    const reg = await registerSW();
    if (!reg) return false;

    const vapidRes = await apiClient.get('/notifications/push/vapid-key');
    const vapidKey = vapidRes.data?.data?.key;
    if (!vapidKey) return false;

    // Convert VAPID key from base64url to Uint8Array
    const padding = '='.repeat((4 - (vapidKey.length % 4)) % 4);
    const base64 = (vapidKey + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const applicationServerKey = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i++) {
      applicationServerKey[i] = rawData.charCodeAt(i);
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return false;

    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });

    const json = subscription.toJSON();
    await apiClient.post('/notifications/push/subscribe', {
      endpoint: json.endpoint,
      keys: json.keys,
      platform: detectPlatform(),
    });

    return true;
  } catch (err) {
    console.error('[XHRIS] Push subscribe error:', err);
    return false;
  }
}

export async function unsubscribeFromPush(): Promise<boolean> {
  try {
    const reg = await navigator.serviceWorker.ready;
    const subscription = await reg.pushManager.getSubscription();
    if (subscription) {
      await apiClient.post('/notifications/push/unsubscribe', { endpoint: subscription.endpoint });
      await subscription.unsubscribe();
    }
    return true;
  } catch {
    return false;
  }
}
