import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';

/**
 * Notificación de fin de descanso con Web Push.
 * La app guarda en `rest_alarms` la hora en que termina el descanso; Supabase la envía a esa hora
 * aunque la app esté cerrada (ver supabase/migrations/0002_rest_push.sql y functions/send-rest-alarms).
 */

const VAPID = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
const KEY = 'im_push_endpoint';

export type PushState = 'unsupported' | 'unconfigured' | 'denied' | 'off' | 'on';

export function pushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

function savedEndpoint(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function setSaved(endpoint: string | null) {
  try {
    if (endpoint) localStorage.setItem(KEY, endpoint);
    else localStorage.removeItem(KEY);
  } catch {
    /* sin almacenamiento */
  }
}

export function urlBase64ToUint8Array(base64: string): Uint8Array {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function currentState(): Promise<PushState> {
  if (!pushSupported()) return 'unsupported';
  if (!VAPID || !supabase) return 'unconfigured';
  if (Notification.permission === 'denied') return 'denied';
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub && savedEndpoint() === sub.endpoint && Notification.permission === 'granted') return 'on';
  return 'off';
}

export async function enablePush(): Promise<void> {
  if (!pushSupported()) throw new Error('Este navegador no permite notificaciones.');
  if (!VAPID || !supabase) throw new Error('Falta configurar las notificaciones en el servidor.');
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('No diste permiso de notificaciones.');
  const reg = await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID) }));
  const j = sub.toJSON();
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({ endpoint: sub.endpoint, p256dh: j.keys?.p256dh, auth: j.keys?.auth, user_agent: navigator.userAgent.slice(0, 200) });
  if (error) throw new Error(`No se pudo registrar este celular: ${error.message}`);
  setSaved(sub.endpoint);
}

export async function disablePush(): Promise<void> {
  const endpoint = savedEndpoint();
  setSaved(null);
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  await sub?.unsubscribe().catch(() => undefined);
  if (endpoint && supabase) await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
}

/** Programa (o reprograma) el aviso del descanso actual. Si no hay conexión, solo sonará la app. */
export function scheduleRestAlarm(endAt: number, title: string, body: string, url: string): void {
  const endpoint = savedEndpoint();
  if (!endpoint || !supabase) return;
  void supabase
    .from('rest_alarms')
    .upsert({ endpoint, fire_at: new Date(endAt).toISOString(), title, body, url, sent_at: null })
    .then(({ error }) => error && console.warn('No se pudo programar el aviso', error.message));
}

export function cancelRestAlarm(): void {
  const endpoint = savedEndpoint();
  if (!endpoint || !supabase) return;
  void supabase
    .from('rest_alarms')
    .delete()
    .eq('endpoint', endpoint)
    .is('sent_at', null)
    .then(({ error }) => error && console.warn('No se pudo cancelar el aviso', error.message));
}

export function usePushState(): [PushState | null, () => Promise<void>] {
  const [s, setS] = useState<PushState | null>(null);
  const refresh = useCallback(async () => setS(await currentState()), []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  return [s, refresh];
}
