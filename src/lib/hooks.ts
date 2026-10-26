import { useLiveQuery } from 'dexie-react-hooks';
import { db, getKV } from './db';
import { DEFAULT_PREFS, type Day, type Draft, type Exercise, type Prefs, type Session } from './types';

/** `undefined` mientras carga. */
export function useDays(): Day[] | undefined {
  return useLiveQuery(async () => (await db.days.orderBy('orden').toArray()).filter((d) => !d.deleted), []);
}

export function useExercises(): Exercise[] | undefined {
  return useLiveQuery(
    async () => (await db.exercises.toArray()).filter((e) => !e.deleted).sort((a, b) => a.orden - b.orden),
    [],
  );
}

export function useSessions(): Session[] | undefined {
  return useLiveQuery(async () => (await db.sessions.orderBy('fecha').reverse().toArray()).filter((s) => !s.deleted), []);
}

export function useDraft(): Draft | null | undefined {
  return useLiveQuery(() => getKV<Draft>('draft'), []);
}

export function usePrefs(): Prefs {
  const p = useLiveQuery(() => getKV<Prefs>('prefs'), []);
  return { ...DEFAULT_PREFS, ...(p ?? {}) };
}
