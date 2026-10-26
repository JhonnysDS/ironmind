import { db, put } from './db';
import { BASE_DAYS, baseExercises } from './routine';
import type { Day, Exercise, Session } from './types';

export interface ExportFile {
  app: 'ironmind';
  version: 1;
  exportedAt: string;
  days: Day[];
  exercises: Exercise[];
  sessions: Session[];
}

export async function exportData(): Promise<ExportFile> {
  const live = <T extends { deleted?: boolean }>(l: T[]) => l.filter((r) => !r.deleted);
  return {
    app: 'ironmind',
    version: 1,
    exportedAt: new Date().toISOString(),
    days: live(await db.days.toArray()),
    exercises: live(await db.exercises.toArray()),
    sessions: live(await db.sessions.toArray()),
  };
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

/**
 * Acepta el formato propio (`exportData`) y la exportación de la app anterior
 * (`{ ejercicios, sesiones }`). Devuelve cuántos registros importó.
 */
export async function importData(raw: unknown): Promise<{ days: number; exercises: number; sessions: number }> {
  if (!isObj(raw)) throw new Error('El archivo no tiene el formato de IronMind.');
  const exs = (raw.exercises ?? raw.ejercicios) as unknown;
  const ses = (raw.sessions ?? raw.sesiones) as unknown;
  if (!Array.isArray(exs) || !Array.isArray(ses)) throw new Error('Faltan los ejercicios o las sesiones en el archivo.');

  const days = (Array.isArray(raw.days) ? raw.days : BASE_DAYS) as Day[];
  const exercises = exs.map((e) => {
    if (!isObj(e) || typeof e.id !== 'string' || typeof e.nombre !== 'string') throw new Error('Hay un ejercicio sin id o nombre.');
    return { nota: '', nuevo: false, demo: null, ...e } as unknown as Exercise;
  });
  const sessions = ses.map((s) => {
    if (!isObj(s) || typeof s.id !== 'string' || typeof s.fecha !== 'string' || !Array.isArray(s.items)) throw new Error('Hay una sesión incompleta.');
    return { duracionMin: null, ...s } as unknown as Session;
  });

  await put('days', days.map((d) => ({ ...d, deleted: false })));
  await put('exercises', exercises.map((e) => ({ ...e, deleted: false })));
  await put('sessions', sessions.map((s) => ({ ...s, deleted: false })));
  return { days: days.length, exercises: exercises.length, sessions: sessions.length };
}

export async function seedBaseRoutine() {
  await put('days', BASE_DAYS);
  await put('exercises', baseExercises());
}
