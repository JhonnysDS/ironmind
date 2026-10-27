import { useEffect, useState } from 'react';

/** Preferencia de este dispositivo: seguir al sistema o fijar claro u oscuro. */
export type Theme = 'system' | 'light' | 'dark';
const KEY = 'im_theme';

function read(): Theme {
  try {
    const t = localStorage.getItem(KEY);
    return t === 'light' || t === 'dark' ? t : 'system';
  } catch {
    return 'system';
  }
}

function apply(t: Theme) {
  const root = document.documentElement;
  if (t === 'system') delete root.dataset.theme;
  else root.dataset.theme = t;
  // Color de la barra del sistema en Android, según el fondo real.
  const bg = getComputedStyle(root).getPropertyValue('--bg').trim();
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg || '#131417');
}

export function useTheme(): [Theme, (t: Theme) => void] {
  const [t, setT] = useState<Theme>(read);
  useEffect(() => {
    apply(t);
    if (t !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const on = () => apply('system');
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [t]);
  const set = (next: Theme) => {
    try {
      if (next === 'system') localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, next);
    } catch {
      /* sin almacenamiento: solo dura esta visita */
    }
    setT(next);
  };
  return [t, set];
}

/** Aplica el tema guardado al arrancar (la barra de Android incluida). */
export function initTheme() {
  apply(read());
}
