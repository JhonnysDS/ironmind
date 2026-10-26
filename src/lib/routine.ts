import type { Day, Exercise, Tipo, Unidad } from './types';

const T = '1970-01-01T00:00:00.000Z';

export const BASE_DAYS: Day[] = [
  { id: 'd1', nombre: 'Empuje', sub: 'Pecho · hombro · tríceps', orden: 1, updated_at: T },
  { id: 'd2', nombre: 'Jalón', sub: 'Espalda · bíceps', orden: 2, updated_at: T },
  { id: 'd3', nombre: 'Piernas fuerza', sub: 'Sentadilla · femoral · core', orden: 3, updated_at: T },
  { id: 'd4', nombre: 'Torso', sub: 'Forma de V · hombros · espalda', orden: 4, updated_at: T },
  { id: 'd5', nombre: 'Piernas + brazos', sub: 'Hipertrofia · bíceps · tríceps', orden: 5, updated_at: T },
];

type Row = [id: string, nombre: string, tipo: Tipo, series: number, min: number, max: number, descanso: number, unidad: Unidad, inc: number, demo: string, extra?: Partial<Exercise>];

const ROWS: Row[] = [
  ['d1-01', 'Press de banca', 'reps', 4, 6, 8, 180, 'c/lado', 2.5, 'pectorals/barbell-bench-press'],
  ['d1-02', 'Press inclinado mancuernas', 'reps', 3, 10, 12, 120, 'c/u', 2, 'pectorals/dumbbell-incline-bench-press'],
  ['d1-03', 'Press hombro mancuernas', 'reps', 3, 8, 10, 120, 'c/u', 2, 'delts/dumbbell-seated-shoulder-press'],
  ['d1-04', 'Elevaciones laterales', 'reps', 4, 12, 15, 60, 'c/u', 1, 'delts/dumbbell-lateral-raise'],
  ['d1-05', 'Fondos en paralelas', 'reps', 3, 8, 12, 120, 'corporal', 0, 'pectorals/chest-dip'],
  ['d1-06', 'Extensión de tríceps en polea', 'reps', 3, 12, 15, 75, 'kg', 1, 'triceps/cable-pushdown'],
  ['d1-07', 'Crunch en polea alta', 'reps', 3, 12, 15, 60, 'kg', 2.5, 'abs/cable-kneeling-crunch'],
  ['d1-08', 'Cardio (bici o escaladora)', 'cardio', 1, 10, 15, 0, 'corporal', 0, 'cardio/stationary-bike-walk'],
  ['d2-01', 'Jalón al pecho', 'reps', 4, 6, 10, 150, 'kg', 2.5, 'lats/cable-bar-lateral-pulldown'],
  ['d2-02', 'Remo con barra', 'reps', 3, 8, 10, 150, 'total', 2.5, 'upper-back/barbell-bent-over-row'],
  ['d2-03', 'Remo con mancuerna', 'reps', 3, 10, 12, 105, 'c/u', 2, 'upper-back/dumbbell-one-arm-bent-over-row', { porLado: true }],
  ['d2-04', 'Face pulls', 'reps', 3, 15, 20, 75, 'kg', 1.5, 'delts/cable-rear-delt-row-with-rope'],
  ['d2-05', 'Curl con barra Z', 'reps', 3, 8, 12, 75, 'total', 1, 'biceps/ez-barbell-curl'],
  ['d2-06', 'Curl martillo', 'reps', 3, 10, 15, 60, 'c/u', 1, 'biceps/dumbbell-hammer-curl'],
  ['d3-01', 'Sentadilla con barra', 'reps', 4, 6, 8, 180, 'c/lado', 2.5, 'glutes/barbell-full-squat'],
  ['d3-02', 'Peso muerto rumano mancuernas', 'reps', 3, 10, 12, 150, 'c/u', 2, 'glutes/dumbbell-romanian-deadlift'],
  ['d3-03', 'Prensa de piernas', 'reps', 3, 10, 15, 105, 'total', 5, 'glutes/sled-45-leg-press'],
  ['d3-04', 'Elevaciones de piernas colgado', 'fallo', 3, 1, 99, 75, 'corporal', 0, 'abs/hanging-leg-raise'],
  ['d3-05', 'Pantorrillas de pie', 'reps', 4, 12, 15, 60, 'kg', 2.5, 'calves/lever-standing-calf-raise'],
  ['d3-06', 'Cardio (caminata inclinada)', 'cardio', 1, 10, 15, 0, 'corporal', 0, 'cardio/walking-on-incline-treadmill'],
  ['d4-01', 'Press inclinado mancuernas (ligero)', 'reps', 3, 12, 15, 105, 'c/u', 2, 'pectorals/dumbbell-incline-bench-press'],
  ['d4-02', 'Jalón agarre neutro', 'reps', 3, 10, 12, 90, 'kg', 2.5, 'lats/cable-lateral-pulldown-with-v-bar'],
  ['d4-03', 'Aperturas peck deck o poleas', 'reps', 3, 12, 15, 75, 'kg', 2.5, 'pectorals/lever-seated-fly'],
  ['d4-04', 'Remo Gironda (polea baja)', 'reps', 3, 12, 15, 90, 'kg', 2.5, 'upper-back/cable-seated-row'],
  ['d4-05', 'Elevaciones laterales (altas reps)', 'reps', 4, 15, 20, 60, 'c/u', 1, 'delts/dumbbell-lateral-raise'],
  ['d4-06', 'Plancha', 'tiempo', 3, 45, 60, 60, 'corporal', 0, 'abs/weighted-front-plank'],
  ['d5-01', 'Sentadilla búlgara', 'reps', 3, 10, 12, 90, 'c/u', 2, 'quads/dumbbell-single-leg-split-squat', { porLado: true }],
  ['d5-02', 'Curl femoral acostado', 'reps', 3, 12, 15, 75, 'kg', 2, 'hamstrings/lever-lying-leg-curl'],
  ['d5-03', 'Extensión de cuádriceps', 'reps', 3, 15, 20, 60, 'kg', 2.5, 'quads/lever-leg-extension'],
  ['d5-04', 'Press francés con barra Z', 'reps', 3, 10, 12, 75, 'total', 1, 'triceps/barbell-lying-triceps-extension-skull-crusher'],
  ['d5-05', 'Curl predicador', 'reps', 3, 10, 12, 75, 'kg', 1, 'biceps/lever-preacher-curl'],
  ['d5-06', 'Elevaciones de piernas colgado', 'fallo', 3, 1, 99, 75, 'corporal', 0, 'abs/hanging-leg-raise'],
  ['d5-07', 'Cardio (bici)', 'cardio', 1, 10, 15, 0, 'corporal', 0, 'cardio/stationary-bike-walk'],
];

/** Rutina base de 5 días, sin pesos: la primera sesión de cada ejercicio registra el peso base. */
export function baseExercises(): Exercise[] {
  return ROWS.map(([id, nombre, tipo, series, repsMin, repsMax, descanso, unidad, incremento, demo, extra]) => ({
    id, dia: id.slice(0, 2), orden: Number(id.slice(3)), nombre, tipo, series, repsMin, repsMax, descanso, unidad, incremento, demo,
    peso: null, nota: '', nuevo: unidad !== 'corporal' && tipo === 'reps', updated_at: T, ...extra,
  }));
}
