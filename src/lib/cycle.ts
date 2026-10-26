import type { Day, Session } from './types';

export interface CycleState {
  /** Días hechos en el ciclo actual. */
  hechos: Set<string>;
  /** Día que toca ahora. */
  next: string | null;
  last: Session | null;
  /** El último día hecho fue el último del ciclo. */
  completo: boolean;
}

/**
 * El orden de los días manda, no el calendario: después del último día hecho
 * toca el siguiente, y tras el último día del ciclo vuelve el primero.
 */
export function ciclo(days: Day[], sessions: Session[]): CycleState {
  const order = [...days].filter((d) => !d.deleted).sort((a, b) => a.orden - b.orden);
  if (!order.length) return { hechos: new Set(), next: null, last: null, completo: false };
  const idx = (id: string) => order.findIndex((d) => d.id === id);

  const done = sessions
    .filter((s) => !s.deleted && s.items.some((i) => !i.saltado) && idx(s.dia) >= 0)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
  if (!done.length) return { hechos: new Set(), next: order[0].id, last: null, completo: false };

  const li = idx(done[0].dia);
  const lastIndex = order.length - 1;
  const hechos = new Set<string>();
  if (li < lastIndex) {
    let prev = li + 1;
    for (const s of done) {
      const i = idx(s.dia);
      if (i < prev) {
        hechos.add(s.dia);
        prev = i;
        if (i === 0) break;
      } else break;
    }
  }
  return { hechos, next: order[(li + 1) % order.length].id, last: done[0], completo: li === lastIndex };
}

export function diasDesde(iso: string, now = new Date()): number {
  const a = new Date(now);
  a.setHours(0, 0, 0, 0);
  const b = new Date(iso);
  b.setHours(0, 0, 0, 0);
  return Math.round((a.getTime() - b.getTime()) / 86400000);
}

export function haceTxt(iso: string, now = new Date()): string {
  const d = diasDesde(iso, now);
  return d <= 0 ? 'hoy' : d === 1 ? 'ayer' : `hace ${d} días`;
}
