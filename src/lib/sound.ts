import type { Prefs } from './types';

let ac: AudioContext | null = null;
let out: GainNode | null = null;

/** Hay que llamarlo desde un toque del usuario: el navegador no deja sonar antes. */
export function unlockAudio() {
  try {
    if (!ac) {
      const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (C) ac = new C();
    }
    if (ac && ac.state === 'suspended') void ac.resume();
  } catch {
    /* sin audio */
  }
}

function output(): GainNode {
  if (!out && ac) {
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 6;
    out = ac.createGain();
    out.gain.value = 1.4;
    out.connect(comp);
    comp.connect(ac.destination);
  }
  return out!;
}

function nota(f: number, t0: number, dur: number, o: { type?: OscillatorType; vol?: number; attack?: number } = {}) {
  if (!ac) return;
  const os = ac.createOscillator();
  const g = ac.createGain();
  os.type = o.type ?? 'sine';
  os.frequency.value = f;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(o.vol ?? 0.5, t0 + (o.attack ?? 0.004));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  os.connect(g);
  g.connect(output());
  os.start(t0);
  os.stop(t0 + dur + 0.05);
}

/** Golpe de campana: fundamental + parciales inarmónicos que decaen a distinto ritmo. */
function golpe(t0: number, f: number, largo = 1.8) {
  for (const [m, v, d] of [[1, 0.55, 1], [2, 0.22, 0.8], [2.76, 0.16, 0.6], [5.4, 0.07, 0.4], [8.93, 0.035, 0.3]])
    nota(f * m, t0, largo * d, { vol: v });
}

export const SONIDOS: Record<string, { nombre: string; desc: string; play: (t: number) => void }> = {
  campana: { nombre: 'Campana', desc: 'Tres campanadas claras', play: (t) => { golpe(t, 660); golpe(t + 0.5, 660); golpe(t + 1, 990, 2.4); } },
  boxeo: { nombre: 'Campana de ring', desc: 'Fin de round, metálica y fuerte', play: (t) => { for (let i = 0; i < 4; i++) golpe(t + i * 0.2, 1240, 1.4); golpe(t + 1, 1240, 2); } },
  digital: { nombre: 'Alarma digital', desc: 'Arpegio rápido tipo reloj deportivo', play: (t) => { for (let r = 0; r < 3; r++) [1047, 1319, 1568, 2093].forEach((f, i) => nota(f, t + r * 0.55 + i * 0.09, 0.14, { type: 'square', vol: 0.16 })); } },
  energia: { nombre: 'Energía', desc: 'Subida corta para arrancar la serie', play: (t) => { [392, 523, 659, 784, 1047].forEach((f, i) => nota(f, t + i * 0.12, 0.5, { type: 'sawtooth', vol: 0.12 })); [523, 1047].forEach((f) => nota(f, t + 0.62, 1.1, { type: 'triangle', vol: 0.35 })); } },
};

export function vibrate(prefs: Prefs, pattern: number | number[]): boolean {
  if (!prefs.vibrar) return false;
  try {
    return !!navigator.vibrate?.(pattern);
  } catch {
    return false;
  }
}

export function playSound(id: string) {
  try {
    unlockAudio();
    if (ac) (SONIDOS[id] ?? SONIDOS.campana).play(ac.currentTime + 0.03);
  } catch {
    /* sin audio */
  }
}

export function tick(prefs: Prefs) {
  try {
    if (ac) nota(880, ac.currentTime + 0.01, 0.13, { vol: 0.45 });
  } catch {
    /* sin audio */
  }
  vibrate(prefs, 60);
}

export function finish(prefs: Prefs) {
  playSound(prefs.sonido);
  vibrate(prefs, [700, 180, 700, 180, 1000]);
}
