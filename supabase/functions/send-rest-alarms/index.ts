// Edge Function: envía las notificaciones de fin de descanso que ya vencieron.
// La invoca `public.dispatch_rest_alarms()` (pg_cron, cada 5 s) solo cuando hay avisos pendientes.
//
// Secretos necesarios (Supabase → Edge Functions → Secrets):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY  — generadas con `npx web-push generate-vapid-keys`
//   VAPID_SUBJECT                        — p. ej. "mailto:tu-correo@gmail.com"
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los pone Supabase automáticamente.
// Despliégala con la verificación de JWT desactivada: la seguridad la da el secreto compartido.

import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
import webpush from 'npm:web-push@3.6.7';

interface Alarm {
  endpoint: string;
  title: string;
  body: string;
  url: string;
}

const env = (k: string) => {
  const v = Deno.env.get(k);
  if (!v) throw new Error(`Falta el secreto ${k}`);
  return v;
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  try {
    const db = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });

    const { data: ok, error: authErr } = await db.rpc('verify_rest_push_secret', { s: req.headers.get('x-cron-secret') ?? '' });
    if (authErr) throw authErr;
    if (!ok) return json({ error: 'forbidden' }, 403);

    webpush.setVapidDetails(env('VAPID_SUBJECT'), env('VAPID_PUBLIC_KEY'), env('VAPID_PRIVATE_KEY'));

    // Reclamar los avisos vencidos marcándolos como enviados: si dos llamadas se cruzan, cada aviso sale una sola vez.
    const { data: due, error: dueErr } = await db
      .from('rest_alarms')
      .update({ sent_at: new Date().toISOString() })
      .is('sent_at', null)
      .lte('fire_at', new Date(Date.now() + 1000).toISOString())
      .select('endpoint,title,body,url');
    if (dueErr) throw dueErr;

    let sent = 0;
    const gone: string[] = [];
    if (due?.length) {
      const { data: subs, error: subErr } = await db
        .from('push_subscriptions')
        .select('endpoint,p256dh,auth')
        .in('endpoint', due.map((a: Alarm) => a.endpoint));
      if (subErr) throw subErr;

      await Promise.all(
        (due as Alarm[]).map(async (a) => {
          const s = subs?.find((x) => x.endpoint === a.endpoint);
          if (!s) return;
          try {
            await webpush.sendNotification(
              { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
              JSON.stringify({ title: a.title, body: a.body, url: a.url }),
              { TTL: 120, urgency: 'high' },
            );
            sent++;
          } catch (e) {
            const code = (e as { statusCode?: number }).statusCode;
            // 404/410: el navegador anuló la suscripción; se borra.
            if (code === 404 || code === 410) gone.push(s.endpoint);
            else console.error('push error', code, (e as Error).message);
          }
        }),
      );
      if (gone.length) await db.from('push_subscriptions').delete().in('endpoint', gone);
    }

    // Limpieza: avisos de hace más de un día.
    await db.from('rest_alarms').delete().lt('fire_at', new Date(Date.now() - 86_400_000).toISOString());

    return json({ due: due?.length ?? 0, sent, removed: gone.length });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
