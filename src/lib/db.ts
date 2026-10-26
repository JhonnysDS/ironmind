import Dexie, { type Table } from 'dexie';
import type { Day, Exercise, Session, Synced } from './types';

export interface KV extends Synced {
  value: unknown;
}

export type TableName = 'days' | 'exercises' | 'sessions' | 'kv';
export const SYNCED_TABLES: TableName[] = ['days', 'exercises', 'sessions', 'kv'];

export interface OutboxEntry {
  seq?: number;
  table: TableName;
  id: string;
}

export interface Meta {
  key: string;
  value: string;
}

class IronMindDB extends Dexie {
  days!: Table<Day, string>;
  exercises!: Table<Exercise, string>;
  sessions!: Table<Session, string>;
  kv!: Table<KV, string>;
  /** Cambios locales pendientes de subir a Supabase. */
  outbox!: Table<OutboxEntry, number>;
  /** Datos internos del dispositivo (no se sincronizan). */
  meta!: Table<Meta, string>;

  constructor() {
    super('ironmind');
    this.version(1).stores({
      days: 'id, orden',
      exercises: 'id, dia, orden',
      sessions: 'id, fecha, dia',
      kv: 'id',
      outbox: '++seq, [table+id]',
      meta: 'key',
    });
  }
}

export const db = new IronMindDB();

const now = () => new Date().toISOString();

let onLocalChange: (() => void) | null = null;
/** El módulo de sincronización se registra aquí para enterarse de cambios locales. */
export function setLocalChangeListener(fn: () => void) {
  onLocalChange = fn;
}

/** Guarda registros con marca de tiempo y los encola para subirlos. */
export async function put<T extends Synced>(table: TableName, rows: T | T[]): Promise<void> {
  const list = (Array.isArray(rows) ? rows : [rows]).map((r) => ({ ...r, updated_at: now() }));
  await db.transaction('rw', db.table(table), db.outbox, async () => {
    await db.table(table).bulkPut(list);
    await db.outbox.bulkAdd(list.map((r) => ({ table, id: r.id })));
  });
  onLocalChange?.();
}

/** Borrado lógico, para que el borrado también llegue a otros dispositivos. */
export async function remove(table: TableName, id: string): Promise<void> {
  const row = await db.table(table).get(id);
  if (row) await put(table, { ...row, deleted: true });
}

export async function getKV<T>(id: string): Promise<T | null> {
  const row = await db.kv.get(id);
  return row && !row.deleted ? (row.value as T) : null;
}

export async function setKV(id: string, value: unknown): Promise<void> {
  if (value == null) return remove('kv', id);
  await put<KV>('kv', { id, value, updated_at: now(), deleted: false });
}

export const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
