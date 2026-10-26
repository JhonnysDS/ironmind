import type { Exercise, Session, SessionItem, Verdict } from './types';

export const r2 = (n: number) => Math.round(n * 100) / 100;

/** Una sesión está "por debajo del rango" si la primera serie no llega al mínimo o dos o más series quedan por debajo. */
export function bajoRango(ex: Pick<Exercise, 'repsMin'>, reps: number[]): boolean {
  if (!reps.length) return false;
  return reps[0] < ex.repsMin || reps.filter((r) => r < ex.repsMin).length >= 2;
}

/** Última vez que se hizo un ejercicio (ignorando las veces que se saltó). */
export function ultimo(sessions: Session[], exId: string): { s: Session; it: SessionItem } | null {
  const ordered = [...sessions].filter((s) => !s.deleted).sort((a, b) => b.fecha.localeCompare(a.fecha));
  for (const s of ordered) {
    const it = s.items.find((i) => i.id === exId && !i.saltado && i.reps.length);
    if (it) return { s, it };
  }
  return null;
}

export interface VerdictInput {
  peso: number | null;
  /** Repeticiones de las series hechas. */
  reps: number[];
  saltado: boolean;
}

export interface VerdictContext {
  /** Última vez que se hizo este ejercicio, antes de esta sesión. */
  prev: { s: Session; it: SessionItem } | null;
  /** El usuario marcó "Hoy me sentí mal". */
  malDia: boolean;
}

/**
 * Reglas de progresión:
 * - Sube: todas las series al tope del rango.
 * - Baja: por debajo del rango DOS sesiones seguidas (una sola sesión mala = mantener).
 * - Un "día flojo" nunca baja el peso ni cuenta como sesión mala para la siguiente.
 * - Ejercicio nuevo: la primera sesión solo registra el peso base.
 */
export function veredicto(ex: Exercise, input: VerdictInput, ctx: VerdictContext): Verdict {
  const { reps } = input;
  if (input.saltado || !reps.length) return { t: 'pend', txt: 'No se hizo', next: null };
  if (ex.tipo === 'cardio') return { t: 'ok', txt: `Cardio: ${reps[0]} min`, next: null };

  if (ex.tipo === 'fallo') {
    const sum = reps.reduce((a, b) => a + b, 0);
    const prevSum = ctx.prev ? ctx.prev.it.reps.reduce((a, b) => a + b, 0) : null;
    if (prevSum == null) return { t: 'ok', txt: 'Primer registro', next: null };
    return sum > prevSum
      ? { t: 'up', txt: `Mejoraste (+${sum - prevSum} reps en total)`, next: null }
      : { t: 'hold', txt: 'Igual o menos que la última vez', next: null };
  }

  const completas = reps.length >= ex.series;
  const tope = completas && reps.every((r) => r >= ex.repsMax);
  const caeMal = bajoRango(ex, reps);
  const prevMal = !!ctx.prev && !ctx.prev.s.malDia && bajoRango(ex, ctx.prev.it.reps);
  const repetido = caeMal && !ctx.malDia && prevMal;

  if (ex.unidad === 'corporal' || ex.tipo === 'tiempo') {
    if (tope) return { t: 'up', txt: ex.tipo === 'tiempo' ? 'Al tope: sube el tiempo' : 'Al tope: puedes añadir peso', next: null };
    if (repetido) return { t: 'down', txt: 'Dos veces por debajo: prueba la versión asistida', next: null };
    if (caeMal) return { t: 'hold', txt: ctx.malDia ? 'Día flojo: sigue igual' : 'Por debajo del rango: sigue practicando', next: null };
    return { t: 'hold', txt: completas ? 'Sigue igual' : 'Faltaron series', next: null };
  }

  const p = input.peso;
  if (p == null) return { t: 'hold', txt: 'Anota el peso que usaste', next: null };
  if (ex.nuevo) return { t: 'base', txt: 'Peso base registrado', next: p };
  if (tope) return { t: 'up', txt: 'Sube el peso', next: r2(p + ex.incremento) };
  if (repetido) return { t: 'down', txt: 'Dos veces por debajo: baja el peso', next: Math.max(0, r2(p - ex.incremento)) };
  if (caeMal) return { t: 'hold', txt: ctx.malDia ? 'Día flojo: mantén el peso' : 'Por debajo: mantén (si se repite, baja)', next: p };
  return { t: 'hold', txt: completas ? 'Mantén el peso' : 'Mantén (faltaron series)', next: p };
}
