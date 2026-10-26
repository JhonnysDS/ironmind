export type Unidad = 'c/lado' | 'c/u' | 'total' | 'kg' | 'corporal';
export type Tipo = 'reps' | 'fallo' | 'tiempo' | 'cardio';

/** Campos comunes a todo lo que se sincroniza con Supabase. */
export interface Synced {
  id: string;
  updated_at: string;
  deleted?: boolean;
}

export interface Day extends Synced {
  nombre: string;
  sub: string;
  orden: number;
}

export interface Exercise extends Synced {
  dia: string;
  orden: number;
  nombre: string;
  tipo: Tipo;
  series: number;
  repsMin: number;
  repsMax: number;
  porLado?: boolean;
  /** Descanso entre series, en segundos. */
  descanso: number;
  /** Peso que toca la próxima vez. */
  peso: number | null;
  unidad: Unidad;
  incremento: number;
  nota: string;
  /** Ejercicio sin peso base todavía. */
  nuevo: boolean;
  /** Ruta del GIF en ExerciseGymGifsDB, p. ej. "pectorals/barbell-bench-press". */
  demo?: string | null;
}

export type VerdictType = 'up' | 'hold' | 'down' | 'base' | 'ok' | 'pend';

export interface Verdict {
  t: VerdictType;
  txt: string;
  next: number | null;
}

export interface SessionItem {
  id: string;
  nombre: string;
  unidad: Unidad;
  tipo: Tipo;
  peso: number | null;
  /** Solo las series marcadas como hechas. */
  reps: number[];
  nota: string;
  saltado: boolean;
  v: Verdict;
}

export interface Session extends Synced {
  dia: string;
  diaNombre: string;
  fecha: string;
  duracionMin: number | null;
  malDia?: boolean;
  /** Fecha aproximada (sesiones importadas del chat). */
  aprox?: boolean;
  items: SessionItem[];
}

export interface DraftItem {
  peso: number | '' | null;
  reps: number[];
  hecho: boolean[];
  /** Series cuyo valor tocó el usuario (las demás se ven atenuadas). */
  toc: boolean[];
  nota: string;
  saltado: boolean;
}

export interface Draft {
  dia: string;
  creado: string;
  /** Se fija al marcar la primera serie. */
  inicio: string | null;
  malDia: boolean;
  items: Record<string, DraftItem>;
}

export interface Prefs {
  sonido: string;
  cuenta: boolean;
  vibrar: boolean;
}

export const DEFAULT_PREFS: Prefs = { sonido: 'campana', cuenta: true, vibrar: true };
