import { useEffect, useState } from 'react';
import { cancelRestAlarm, scheduleRestAlarm } from './push';

/** Temporizador de descanso. Se guarda la hora de fin, así sobrevive a que el sistema cierre la app. */
export interface RestTimer {
  end: number;
  total: number;
  nombre: string;
  /** Pantalla que abre la notificación. */
  url?: string;
}

const KEY = 'im_timer';
type Listener = (t: RestTimer | null) => void;
const listeners = new Set<Listener>();
let current: RestTimer | null = read();

function read(): RestTimer | null {
  try {
    const t = JSON.parse(localStorage.getItem(KEY) ?? 'null') as RestTimer | null;
    if (t && Date.now() - t.end < 120_000) return t;
  } catch {
    /* sin almacenamiento */
  }
  return null;
}

function write(t: RestTimer | null) {
  current = t;
  try {
    if (t) localStorage.setItem(KEY, JSON.stringify(t));
    else localStorage.removeItem(KEY);
  } catch {
    /* sin almacenamiento */
  }
  listeners.forEach((l) => l(t));
}

const avisar = (t: RestTimer) => scheduleRestAlarm(t.end, '¡A la siguiente serie!', `Terminó el descanso · ${t.nombre}`, t.url ?? '/');

export function startRest(segundos: number, nombre: string, url?: string) {
  const t = { end: Date.now() + segundos * 1000, total: segundos, nombre, url };
  write(t);
  avisar(t);
}

export function addRest(segundos: number) {
  if (!current) return;
  const t = { ...current, end: current.end + segundos * 1000, total: current.total + segundos };
  write(t);
  avisar(t);
}

export function stopRest() {
  if (current && current.end > Date.now()) cancelRestAlarm();
  write(null);
}

export function useRestTimer(): RestTimer | null {
  const [t, setT] = useState(current);
  useEffect(() => {
    listeners.add(setT);
    return () => void listeners.delete(setT);
  }, []);
  return t;
}

/** Mantiene la pantalla encendida durante la sesión, si el navegador lo permite. */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    const req = async () => {
      try {
        lock = await navigator.wakeLock.request('screen');
      } catch {
        /* no disponible */
      }
    };
    const onVis = () => document.visibilityState === 'visible' && void req();
    void req();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      void lock?.release().catch(() => undefined);
    };
  }, [active]);
}
