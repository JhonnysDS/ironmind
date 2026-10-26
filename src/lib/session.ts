import { newId, put, setKV } from './db';
import { r2, ultimo, veredicto } from './progression';
import type { Day, Draft, DraftItem, Exercise, Session, SessionItem } from './types';

export const horasDesde = (iso: string | null | undefined) => (iso ? (Date.now() - new Date(iso).getTime()) / 3_600_000 : 0);

function defaultReps(ex: Exercise, i: number, prev: SessionItem | undefined): number {
  if (prev && prev.reps[i] != null) return prev.reps[i];
  if (ex.tipo === 'fallo') return 15;
  return ex.repsMax;
}

export function draftItem(ex: Exercise, sessions: Session[]): DraftItem {
  const n = ex.tipo === 'cardio' ? 1 : ex.series;
  const prev = ultimo(sessions, ex.id)?.it;
  return {
    peso: ex.unidad === 'corporal' ? null : ex.peso ?? '',
    reps: Array.from({ length: n }, (_, i) => defaultReps(ex, i, prev)),
    hecho: Array(n).fill(false),
    toc: Array(n).fill(false),
    nota: '',
    saltado: false,
  };
}

export function newDraft(dia: string, exercises: Exercise[], sessions: Session[]): Draft {
  const items: Record<string, DraftItem> = {};
  for (const ex of exercises.filter((e) => e.dia === dia)) items[ex.id] = draftItem(ex, sessions);
  return { dia, creado: new Date().toISOString(), inicio: null, malDia: false, items };
}

/** Cierra la sesión: guarda el registro y deja listos los pesos de la próxima vez. */
export async function finishSession(draft: Draft, day: Day, exercises: Exercise[], sessions: Session[]): Promise<Session> {
  const exs = exercises.filter((e) => e.dia === draft.dia).sort((a, b) => a.orden - b.orden);
  const items: SessionItem[] = exs.map((ex) => {
    const it = draft.items[ex.id];
    const reps = !it || it.saltado ? [] : it.reps.filter((_, i) => it.hecho[i]);
    const peso = !it || it.peso === '' || it.peso == null ? null : r2(+it.peso);
    const v = veredicto(ex, { peso, reps, saltado: !it || it.saltado }, { prev: ultimo(sessions, ex.id), malDia: draft.malDia });
    return { id: ex.id, nombre: ex.nombre, unidad: ex.unidad, tipo: ex.tipo, peso, reps, nota: it?.nota ?? '', saltado: !it || it.saltado || !reps.length, v };
  });

  const ini = draft.inicio ? new Date(draft.inicio) : null;
  let dur = ini ? Math.max(1, Math.round((Date.now() - ini.getTime()) / 60000)) : null;
  if (dur != null && dur > 300) dur = null;

  const session: Session = {
    id: newId(), dia: draft.dia, diaNombre: day.nombre, fecha: new Date().toISOString(),
    duracionMin: dur, malDia: draft.malDia, items, updated_at: '',
  };

  const updates: Exercise[] = [];
  for (const i of items) {
    const ex = exs.find((e) => e.id === i.id)!;
    const next = { ...ex };
    let changed = false;
    if (i.v.next != null && i.v.next !== ex.peso) { next.peso = i.v.next; changed = true; }
    if (ex.nuevo && i.v.t === 'base') { next.nuevo = false; changed = true; }
    if (changed) updates.push(next);
  }

  await put('sessions', session);
  if (updates.length) await put('exercises', updates);
  await setKV('draft', null);
  return session;
}
