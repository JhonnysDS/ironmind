import { describe, expect, it } from 'vitest';
import { veredicto } from './progression';
import { ciclo, haceTxt } from './cycle';
import type { Day, Exercise, Session } from './types';

const ex = (o: Partial<Exercise> = {}): Exercise => ({
  id: 'e1', dia: 'd1', orden: 1, nombre: 'Press', tipo: 'reps', series: 3, repsMin: 10, repsMax: 12,
  descanso: 90, peso: 20, unidad: 'c/u', incremento: 2, nota: '', nuevo: false, updated_at: '', ...o,
});
const ses = (dia: string, fecha: string, reps: number[] = [12, 12, 12], o: Partial<Session> = {}): Session => ({
  id: dia + fecha, dia, diaNombre: dia, fecha, duracionMin: 60, updated_at: '',
  items: [{ id: 'e1', nombre: 'Press', unidad: 'c/u', tipo: 'reps', peso: 20, reps, nota: '', saltado: false, v: { t: 'hold', txt: '', next: 20 } }],
  ...o,
});
const days: Day[] = ['d1', 'd2', 'd3', 'd4', 'd5'].map((id, i) => ({ id, nombre: id, sub: '', orden: i + 1, updated_at: '' }));

describe('veredicto', () => {
  it('sube cuando todas las series llegan al tope', () => {
    expect(veredicto(ex(), { peso: 20, reps: [12, 12, 12], saltado: false }, { prev: null, malDia: false })).toEqual({ t: 'up', txt: 'Sube el peso', next: 22 });
  });
  it('una sola sesión mala mantiene el peso', () => {
    const v = veredicto(ex(), { peso: 20, reps: [12, 9, 6], saltado: false }, { prev: null, malDia: false });
    expect(v.t).toBe('hold');
    expect(v.next).toBe(20);
  });
  it('dos sesiones malas seguidas bajan el peso', () => {
    const prev = { s: ses('d1', '2026-10-01', [10, 8, 7]), it: ses('d1', '2026-10-01', [10, 8, 7]).items[0] };
    const v = veredicto(ex(), { peso: 20, reps: [12, 9, 6], saltado: false }, { prev, malDia: false });
    expect(v).toMatchObject({ t: 'down', next: 18 });
  });
  it('un día flojo nunca baja', () => {
    const prev = { s: ses('d1', '2026-10-01', [10, 8, 7]), it: ses('d1', '2026-10-01', [10, 8, 7]).items[0] };
    expect(veredicto(ex(), { peso: 20, reps: [8, 6, 5], saltado: false }, { prev, malDia: true }).t).toBe('hold');
  });
  it('una sesión mala anterior marcada como día flojo no cuenta', () => {
    const s = ses('d1', '2026-10-01', [10, 8, 7], { malDia: true });
    expect(veredicto(ex(), { peso: 20, reps: [8, 6, 5], saltado: false }, { prev: { s, it: s.items[0] }, malDia: false }).t).toBe('hold');
  });
  it('ejercicio nuevo registra el peso base', () => {
    expect(veredicto(ex({ nuevo: true }), { peso: 30, reps: [15, 15, 15], saltado: false }, { prev: null, malDia: false })).toMatchObject({ t: 'base', next: 30 });
  });
  it('al fallo compara el total de repeticiones', () => {
    const e = ex({ tipo: 'fallo', unidad: 'corporal', peso: null });
    const s = ses('d3', '2026-10-01', [20, 20, 20]);
    expect(veredicto(e, { peso: null, reps: [25, 21, 18], saltado: false }, { prev: { s, it: s.items[0] }, malDia: false })).toMatchObject({ t: 'up' });
  });
  it('saltado queda pendiente', () => {
    expect(veredicto(ex(), { peso: 20, reps: [], saltado: true }, { prev: null, malDia: false }).t).toBe('pend');
  });
});

describe('ciclo', () => {
  it('sin sesiones toca el primer día', () => {
    expect(ciclo(days, []).next).toBe('d1');
  });
  it('sigue el orden aunque cambie la semana', () => {
    const s = [ses('d5', '2026-10-23'), ses('d1', '2026-10-24'), ses('d2', '2026-10-25'), ses('d3', '2026-10-26')];
    const c = ciclo(days, s);
    expect(c.next).toBe('d4');
    expect([...c.hechos].sort()).toEqual(['d1', 'd2', 'd3']);
  });
  it('tras el último día empieza un ciclo nuevo', () => {
    const c = ciclo(days, [ses('d4', '2026-10-20'), ses('d5', '2026-10-23')]);
    expect(c).toMatchObject({ next: 'd1', completo: true });
    expect(c.hechos.size).toBe(0);
  });
  it('ignora sesiones donde todo se saltó', () => {
    const skipped = ses('d2', '2026-10-25');
    skipped.items[0].saltado = true;
    expect(ciclo(days, [ses('d1', '2026-10-24'), skipped]).next).toBe('d2');
  });
});

describe('haceTxt', () => {
  it('describe días en lenguaje natural', () => {
    const now = new Date('2026-10-26T15:00:00');
    expect(haceTxt('2026-10-26T08:00:00', now)).toBe('hoy');
    expect(haceTxt('2026-10-25T08:00:00', now)).toBe('ayer');
    expect(haceTxt('2026-10-20T08:00:00', now)).toBe('hace 6 días');
  });
});
