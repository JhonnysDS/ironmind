import { db, setLocalChangeListener, SYNCED_TABLES, type TableName } from './db';
import { supabase } from './supabase';
import type { Synced } from './types';

export type SyncStatus = 'local' | 'offline' | 'syncing' | 'ok' | 'error';

type Listener = (s: SyncStatus, detail?: string) => void;
const listeners = new Set<Listener>();
let status: SyncStatus = supabase ? 'offline' : 'local';
let userId: string | null = null;
let running = false;
let again = false;
let timer: ReturnType<typeof setTimeout> | null = null;

function setStatus(s: SyncStatus, detail?: string) {
  status = s;
  listeners.forEach((l) => l(s, detail));
}

export function onSyncStatus(l: Listener) {
  listeners.add(l);
  l(status);
  return () => {
    listeners.delete(l);
  };
}

interface RemoteRow {
  id: string;
  data: Synced;
  updated_at: string;
  deleted: boolean;
  synced_at: string;
}

async function push(uid: string) {
  const pending = await db.outbox.orderBy('seq').toArray();
  if (!pending.length) return;
  const byTable = new Map<TableName, Set<string>>();
  for (const e of pending) {
    if (!byTable.has(e.table)) byTable.set(e.table, new Set());
    byTable.get(e.table)!.add(e.id);
  }
  for (const [table, ids] of byTable) {
    const rows = (await db.table(table).bulkGet([...ids])).filter(Boolean) as Synced[];
    if (!rows.length) continue;
    const { error } = await supabase!
      .from(table)
      .upsert(rows.map((r) => ({ user_id: uid, id: r.id, data: r, updated_at: r.updated_at, deleted: !!r.deleted })));
    if (error) throw error;
  }
  const maxSeq = pending[pending.length - 1].seq!;
  await db.outbox.where('seq').belowOrEqual(maxSeq).delete();
}

async function pull() {
  for (const table of SYNCED_TABLES) {
    const metaKey = `pulled:${table}`;
    const since = (await db.meta.get(metaKey))?.value ?? '1970-01-01T00:00:00Z';
    let newest = since;
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase!
        .from(table)
        .select('id,data,updated_at,deleted,synced_at')
        .gte('synced_at', since)
        .order('synced_at', { ascending: true })
        .range(from, from + 999);
      if (error) throw error;
      const rows = (data ?? []) as RemoteRow[];
      if (!rows.length) break;
      await db.transaction('rw', db.table(table), db.outbox, async () => {
        for (const r of rows) {
          const local = (await db.table(table).get(r.id)) as Synced | undefined;
          const pendingLocal = await db.outbox.where('[table+id]').equals([table, r.id]).count();
          // Último cambio gana; un cambio local aún sin subir no se pisa.
          const remoteAt = new Date(r.updated_at).getTime();
          if (local && (pendingLocal || new Date(local.updated_at).getTime() >= remoteAt)) continue;
          await db.table(table).put({ ...r.data, id: r.id, updated_at: new Date(remoteAt).toISOString(), deleted: r.deleted });
        }
      });
      newest = rows[rows.length - 1].synced_at;
      if (rows.length < 1000) break;
    }
    if (newest !== since) await db.meta.put({ key: metaKey, value: newest });
  }
}

export async function syncNow(): Promise<void> {
  if (!supabase || !userId) return;
  if (running) {
    again = true;
    return;
  }
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    setStatus('offline');
    return;
  }
  running = true;
  setStatus('syncing');
  try {
    await push(userId);
    await pull();
    setStatus('ok');
  } catch (e) {
    setStatus('error', e instanceof Error ? e.message : String(e));
  } finally {
    running = false;
    if (again) {
      again = false;
      void syncNow();
    }
  }
}

function schedule(ms = 1500) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void syncNow(), ms);
}

/** Arranca la sincronización para el usuario con sesión iniciada. */
export async function startSync(uid: string | null) {
  if (!supabase) return;
  if (uid && userId && uid !== userId) {
    // Otro usuario en el mismo dispositivo: se limpian los datos locales.
    await Promise.all([...SYNCED_TABLES.map((t) => db.table(t).clear()), db.outbox.clear(), db.meta.clear()]);
  }
  userId = uid;
  if (!uid) {
    setStatus('offline');
    return;
  }
  await syncNow();
}

setLocalChangeListener(() => schedule());
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => schedule(200));
  window.addEventListener('offline', () => setStatus('offline'));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') schedule(200);
  });
  setInterval(() => schedule(0), 60_000);
}
