import type { Exercise, Session, SessionItem, Unidad } from './types';
import { r2 } from './progression';

export const UNI: Record<Unidad, string> = { 'c/lado': ' c/lado', 'c/u': ' c/u', total: ' total', kg: '', corporal: '' };

export const fmt = (n: number | null | undefined | '') => (n == null || n === '' ? '—' : String(r2(+n)).replace('.', ','));

export function pesoTxt(unidad: Unidad, p: number | null | undefined | ''): string {
  if (unidad === 'corporal') return 'Peso corporal';
  if (p == null || p === '') return 'Sin peso';
  return `${fmt(p)} kg${UNI[unidad]}`;
}

export function planTxt(ex: Exercise): string {
  if (ex.tipo === 'cardio') return `${ex.repsMin}-${ex.repsMax} min`;
  if (ex.tipo === 'fallo') return `${ex.series} × al fallo`;
  if (ex.tipo === 'tiempo') return `${ex.series} × ${ex.repsMin}-${ex.repsMax} s`;
  return `${ex.series} × ${ex.repsMin}-${ex.repsMax}${ex.porLado ? ' c/lado' : ''}`;
}

export function descTxt(s: number): string {
  if (!s) return '';
  if (s >= 60) return s % 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} min` : `${s / 60} min`;
  return `${s} s`;
}

export const fechaCorta = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' });

export function itemTxt(it: SessionItem): string {
  if (it.saltado || !it.reps.length) return 'No se hizo';
  if (it.tipo === 'cardio') return `${it.reps[0]} min`;
  return `${pesoTxt(it.unidad, it.peso)} · ${it.reps.join('-')}`;
}

/** Resumen en texto, en el mismo formato que se usaba en el chat. */
export function textoResumen(s: Session): string {
  return (
    `${s.diaNombre} — ${fechaCorta(s.fecha)}\n` +
    s.items
      .map((i) => {
        if (i.saltado || !i.reps.length) return `${i.nombre}: no lo hice`;
        if (i.tipo === 'cardio') return `${i.nombre}: ${i.reps[0]} min`;
        const p = i.unidad === 'corporal' ? 'peso corporal' : i.peso == null ? 'sin peso' : `${fmt(i.peso)}Kg${UNI[i.unidad]}`;
        return `${i.nombre} ${p} ${i.reps.join('-')}${i.nota ? ` (${i.nota})` : ''}`;
      })
      .join('\n')
  );
}

export const pillCls = { up: 'p-up', hold: 'p-hold', down: 'p-down', base: 'p-acc', ok: 'p-up', pend: 'p-mut' } as const;
export const pillIco = { up: '⬆ ', hold: '⏸ ', down: '⬇ ', base: '', ok: '✓ ', pend: '' } as const;
