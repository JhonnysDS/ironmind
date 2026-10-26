import { useEffect, useRef, useState } from 'react';
import { usePrefs } from '../lib/hooks';
import { finish, tick } from '../lib/sound';
import { addRest, stopRest, useRestTimer } from '../lib/timer';

/** Barra inferior de la sesión: temporizador de descanso y botón de terminar. */
export function RestDock({ onFinish }: { onFinish: () => void }) {
  const t = useRestTimer();
  const prefs = usePrefs();
  const [now, setNow] = useState(Date.now());
  const fired = useRef<{ end: number; ticks: Set<number>; done: boolean } | null>(null);

  useEffect(() => {
    if (!t) return;
    // Si el descanso ya había terminado al reabrir la app, no vuelve a sonar.
    if (!fired.current || fired.current.end !== t.end) fired.current = { end: t.end, ticks: new Set(), done: Date.now() >= t.end };
    const iv = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(iv);
  }, [t]);

  const left = t ? Math.max(0, Math.ceil((t.end - now) / 1000)) : 0;

  useEffect(() => {
    const f = fired.current;
    if (!t || !f) return;
    if (prefs.cuenta && left >= 1 && left <= 3 && !f.ticks.has(left) && !f.done) {
      f.ticks.add(left);
      tick(prefs);
    }
    if (left === 0 && !f.done) {
      f.done = true;
      finish(prefs);
    }
  }, [left, t, prefs]);

  const done = !!t && left === 0;
  return (
    <div className="dock">
      <div className="dock-in">
        {t && (
          <div className={`timer ${done ? 'end' : ''}`} role="timer" aria-live="polite">
            <span className="tt">
              {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}
            </span>
            <span className="tx">{done ? <b>¡A la siguiente serie!</b> : `Descanso · ${t.nombre}`}</span>
            <button className="btn small" onClick={() => addRest(15)}>
              +15 s
            </button>
            <button className="btn small" onClick={stopRest}>
              {done ? 'Cerrar' : 'Saltar'}
            </button>
            <span className="bar" style={{ width: `${t.total ? (100 * left) / t.total : 0}%` }} />
          </div>
        )}
        <button className="btn block pri" onClick={onFinish}>
          Terminar sesión
        </button>
      </div>
    </div>
  );
}
