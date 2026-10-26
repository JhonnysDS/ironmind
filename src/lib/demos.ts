/**
 * GIFs de ExerciseGymGifsDB (https://github.com/JahelCuadrado/ExerciseGymGifsDB),
 * servidos por jsDelivr y fijados a un commit para que no cambien.
 * Nota: según su README, los GIF pertenecen a sus autores; se cargan desde el
 * origen y no se copian a este repositorio.
 */
export const DEMO_REF = 'f6d16e977fbee3c04295311c44cb8374ca8ff182';
export const DEMO_BASE = `https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@${DEMO_REF}/`;

const enc = (p: string) => p.split('/').map(encodeURIComponent).join('/');
export const demoGif = (path: string) => `${DEMO_BASE}${enc(path)}.gif`;
export const demoThumb = (path: string) => `${DEMO_BASE}${enc(path)}.thumb.webp`;
export const demoInfoUrl = (path: string) => `${DEMO_BASE}api/es/exercises/${enc(path)}.json`;

export interface DemoEntry {
  id: string;
  name: string;
  muscle: string;
  equipment: string;
  instructions?: string[];
}

let catalog: Promise<DemoEntry[]> | null = null;

/** Catálogo completo en español (unos 1.300 ejercicios). Se descarga una vez. */
export function loadCatalog(): Promise<DemoEntry[]> {
  if (!catalog) {
    catalog = fetch(`${DEMO_BASE}api/es/exercises.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((j: unknown) => {
        const list = (Array.isArray(j) ? j : (j as { exercises?: unknown[] }).exercises ?? []) as DemoEntry[];
        return list.map((e) => ({ id: e.id, name: e.name, muscle: e.muscle, equipment: e.equipment }));
      })
      .catch((e) => {
        catalog = null;
        throw e;
      });
  }
  return catalog;
}

const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

export function searchCatalog(list: DemoEntry[], q: string, max = 40): DemoEntry[] {
  const words = norm(q).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return list.filter((e) => {
    const hay = norm(`${e.name} ${e.id} ${e.muscle} ${e.equipment}`);
    return words.every((w) => hay.includes(w));
  }).slice(0, max);
}
