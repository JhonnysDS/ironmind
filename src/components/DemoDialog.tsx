import { useEffect, useRef, useState } from 'react';
import { demoGif, demoInfoUrl } from '../lib/demos';

/** Ventana emergente con el GIF del ejercicio, sin salir de la app. */
export function DemoDialog({ path, title, onClose }: { path: string | null; title: string; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');
  const [steps, setSteps] = useState<string[]>([]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (path) {
      setState('loading');
      setSteps([]);
      if (!d.open) d.showModal();
      fetch(demoInfoUrl(path))
        .then((r) => (r.ok ? r.json() : null))
        .then((j: { instructions?: string[] } | null) => setSteps(j?.instructions ?? []))
        .catch(() => setSteps([]));
    } else if (d.open) d.close();
  }, [path]);

  return (
    <dialog
      ref={ref}
      className="demo"
      onClose={onClose}
      onClick={(e) => e.target === ref.current && ref.current?.close()}
      aria-label={`Cómo se hace: ${title}`}
    >
      {path && (
        <>
          <div className="demo-h">
            <h3>{title}</h3>
            <button className="btn small" onClick={() => ref.current?.close()} autoFocus>
              Cerrar
            </button>
          </div>
          <div className="demo-img">
            {state === 'error' ? (
              <p className="err center" style={{ padding: 20 }}>
                No se pudo cargar la animación. Revisa tu conexión.
              </p>
            ) : (
              <img key={path} src={demoGif(path)} alt={`Animación: ${title}`} onLoad={() => setState('ok')} onError={() => setState('error')} />
            )}
          </div>
          {state === 'loading' && <p className="meta center">Cargando animación…</p>}
          {steps.length > 0 && (
            <ol className="demo-steps">
              {steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          )}
        </>
      )}
    </dialog>
  );
}
