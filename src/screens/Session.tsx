import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { DemoDialog } from '../components/DemoDialog';
import { Header } from '../components/Header';
import { RestDock } from '../components/RestDock';
import { useToast } from '../components/Toast';
import { setKV } from '../lib/db';
import { descTxt, fechaCorta, itemTxt, planTxt, UNI } from '../lib/format';
import { useDays, useDraft, useExercises, useSessions } from '../lib/hooks';
import { r2, ultimo } from '../lib/progression';
import { draftItem, finishSession, newDraft } from '../lib/session';
import { unlockAudio } from '../lib/sound';
import { startRest, stopRest, useWakeLock } from '../lib/timer';
import type { Draft, DraftItem, Exercise, Session } from '../lib/types';

const scrollKey = (dia: string) => `im_scroll_${dia}`;

export default function SessionScreen() {
  const { dia = '' } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const days = useDays();
  const exercisesAll = useExercises();
  const sessions = useSessions();
  const stored = useDraft();
  const [d, setD] = useState<Draft | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [demo, setDemo] = useState<Exercise | null>(null);
  const saveT = useRef<ReturnType<typeof setTimeout>>();
  const latest = useRef<Draft | null>(null);

  const day = days?.find((x) => x.id === dia);
  const exercises = (exercisesAll ?? []).filter((e) => e.dia === dia);
  const loaded = days && exercisesAll && sessions && stored !== undefined;
  const otherDraft = stored && stored.dia !== dia ? stored : null;

  useWakeLock(true);

  // Carga o crea el borrador una sola vez.
  useEffect(() => {
    if (!loaded || d || otherDraft || !day) return;
    let draft = stored && stored.dia === dia ? structuredClone(stored) : newDraft(dia, exercisesAll!, sessions!);
    for (const ex of exercises) if (!draft.items[ex.id]) draft = { ...draft, items: { ...draft.items, [ex.id]: draftItem(ex, sessions!) } };
    latest.current = draft;
    setD(draft);
    if (!stored) void setKV('draft', draft);
  }, [loaded, d, otherDraft, day, dia, stored, exercisesAll, sessions, exercises]);

  // Vuelve a donde ibas si la app se cerró en medio de la sesión.
  useLayoutEffect(() => {
    if (!d) return;
    try {
      const y = Number(localStorage.getItem(scrollKey(dia)) || 0);
      if (y && d.inicio) window.scrollTo(0, y);
    } catch {
      /* sin almacenamiento */
    }
    // Solo al montar la sesión.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!d]);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      clearTimeout(t);
      t = setTimeout(() => {
        try {
          localStorage.setItem(scrollKey(dia), String(Math.round(window.scrollY)));
        } catch {
          /* sin almacenamiento */
        }
      }, 300);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [dia]);

  const flush = useCallback(() => {
    clearTimeout(saveT.current);
    if (latest.current) return setKV('draft', latest.current);
  }, []);

  useEffect(() => {
    const onHide = () => document.visibilityState === 'hidden' && void flush();
    document.addEventListener('visibilitychange', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      void flush();
    };
  }, [flush]);

  const update = (fn: (draft: Draft) => Draft) => {
    setD((prev) => {
      if (!prev) return prev;
      const next = fn(prev);
      latest.current = next;
      clearTimeout(saveT.current);
      saveT.current = setTimeout(() => void setKV('draft', next), 400);
      return next;
    });
  };

  const setItem = (id: string, fn: (it: DraftItem) => DraftItem) =>
    update((dr) => ({ ...dr, items: { ...dr.items, [id]: fn(dr.items[id]) } }));

  async function terminar() {
    if (!d || !day || busy) return;
    setBusy(true);
    try {
      await flush();
      const s = await finishSession(d, day, exercisesAll!, sessions!);
      latest.current = null;
      stopRest();
      try {
        localStorage.removeItem(scrollKey(dia));
      } catch {
        /* sin almacenamiento */
      }
      nav(`/resumen/${s.id}`, { replace: true });
    } catch (e) {
      toast(`No se pudo guardar la sesión: ${e instanceof Error ? e.message : e}`);
      setBusy(false);
    }
  }

  if (!loaded) return <Shell><div className="empty"><p>Cargando…</p></div></Shell>;
  if (!day) return <Shell><div className="empty"><h2>Ese día no existe</h2><Link className="btn" to="/">Volver al inicio</Link></div></Shell>;
  if (otherDraft)
    return (
      <Shell>
        <div className="empty">
          <h2>Tienes otra sesión abierta</h2>
          <p>Termina o descarta {days.find((x) => x.id === otherDraft.dia)?.nombre} desde el inicio antes de empezar {day.nombre}.</p>
          <Link className="btn" to="/">Ir al inicio</Link>
        </div>
      </Shell>
    );
  if (!d) return <Shell><div className="empty"><p>Preparando la sesión…</p></div></Shell>;

  const listos = exercises.filter((e) => {
    const it = d.items[e.id];
    return it && (it.saltado || it.hecho.every(Boolean));
  }).length;

  return (
    <div className="wrap" onPointerDown={unlockAudio}>
      <Header back={{ to: '/', label: 'Inicio' }} />
      <div className="mt">
        <p className="eyebrow">
          Día {day.orden} · {listos} de {exercises.length} ejercicios
        </p>
        <h1 className="h1">{day.nombre}</h1>
      </div>

      <div className="stack mt">
        {exercises.map((ex) => (
          <ExerciseCard
            key={ex.id}
            ex={ex}
            it={d.items[ex.id]}
            prev={ultimo(sessions!, ex.id)}
            onChange={(fn) => setItem(ex.id, fn)}
            onCheck={(i) => {
              update((dr) => (dr.inicio ? dr : { ...dr, inicio: new Date().toISOString() }));
              const it = d.items[ex.id];
              const marking = !it.hecho[i];
              setItem(ex.id, (x) => ({ ...x, hecho: x.hecho.map((h, k) => (k === i ? !h : h)), toc: x.toc.map((t, k) => (k === i ? true : t)) }));
              if (marking && ex.tipo !== 'cardio' && ex.descanso) startRest(ex.descanso, ex.nombre, `/sesion/${dia}`);
            }}
            onDemo={() => setDemo(ex)}
          />
        ))}
      </div>

      {confirm && (
        <div className="panel mt" role="alertdialog" aria-label="Terminar sesión">
          <p>
            <b>¿Terminar la sesión?</b>
            <br />
            {exercises.length - listos
              ? `${exercises.length - listos} ejercicio${exercises.length - listos > 1 ? 's' : ''} sin completar quedan como pendientes.`
              : 'Completaste todos los ejercicios.'}{' '}
            Se calculan tus pesos para la próxima vez.
          </p>
          <label className="check" htmlFor="malDia" style={{ marginBottom: 14 }}>
            <input id="malDia" type="checkbox" checked={d.malDia} onChange={(e) => update((dr) => ({ ...dr, malDia: e.target.checked }))} />
            Hoy me sentí mal (poco sueño o sin energía). No bajes pesos por hoy.
          </label>
          <div className="row">
            <button className="btn" onClick={() => setConfirm(false)}>
              Seguir entrenando
            </button>
            <button className="btn pri" disabled={busy} onClick={() => void terminar()}>
              {busy ? 'Guardando…' : 'Terminar'}
            </button>
          </div>
        </div>
      )}

      <RestDock
        onFinish={() => {
          setConfirm(true);
          setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 50);
        }}
      />
      <DemoDialog path={demo?.demo ?? null} title={demo?.nombre ?? ''} onClose={() => setDemo(null)} />
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="wrap">
      <Header back={{ to: '/', label: 'Inicio' }} />
      {children}
    </div>
  );
}

function ExerciseCard({
  ex, it, prev, onChange, onCheck, onDemo,
}: {
  ex: Exercise;
  it: DraftItem | undefined;
  prev: { s: Session; it: Session['items'][number] } | null;
  onChange: (fn: (it: DraftItem) => DraftItem) => void;
  onCheck: (i: number) => void;
  onDemo: () => void;
}) {
  if (!it) return null;
  const all = it.hecho.every(Boolean);
  const step = ex.unidad === 'c/lado' ? 1.25 : ex.unidad === 'c/u' ? 1 : 0.5;
  const repStep = ex.tipo === 'tiempo' ? 5 : 1;
  const suf = ex.tipo === 'cardio' ? 'min' : ex.tipo === 'tiempo' ? 's' : 'reps';

  return (
    <section className={`ex ${all ? 'ok' : ''} ${it.saltado ? 'skip' : ''}`} aria-label={ex.nombre}>
      <div className="ex-h">
        <div>
          <h3>{ex.nombre}</h3>
          <p className="meta">
            {planTxt(ex)}
            {ex.descanso ? ` · descanso ${descTxt(ex.descanso)}` : ''}
          </p>
        </div>
        {ex.nuevo ? <span className="pill p-acc">Nuevo</span> : all ? <span className="pill p-up">✓</span> : null}
      </div>
      {ex.nota && <p className="plan">{ex.nota}</p>}
      {ex.nuevo && <p className="plan">Encuentra tu peso base: empieza conservador y anótalo.</p>}
      {prev && (
        <p className="last">
          Última vez ({fechaCorta(prev.s.fecha)}): <b>{itemTxt(prev.it)}</b>
        </p>
      )}

      {it.saltado ? (
        <div className="ex-f">
          <span className="meta">Saltado: queda pendiente para la próxima.</span>
          <button className="link" onClick={() => onChange((x) => ({ ...x, saltado: false }))}>
            Deshacer
          </button>
        </div>
      ) : (
        <>
          {ex.tipo !== 'cardio' &&
            (ex.unidad === 'corporal' ? (
              <div className="peso">
                <span className="num" style={{ fontSize: 20 }}>Peso corporal</span>
              </div>
            ) : (
              <div className="peso">
                <button className="sq" aria-label="Menos peso" onClick={() => onChange((x) => ({ ...x, peso: Math.max(0, r2((x.peso === '' || x.peso == null ? ex.peso ?? 0 : +x.peso) - step)) }))}>
                  −
                </button>
                <input
                  id={`p-${ex.id}`}
                  type="number"
                  inputMode="decimal"
                  step="any"
                  aria-label="Peso en kg"
                  placeholder="kg"
                  value={it.peso === '' || it.peso == null ? '' : r2(it.peso)}
                  onChange={(e) => onChange((x) => ({ ...x, peso: e.target.value === '' ? '' : +e.target.value }))}
                />
                <button className="sq" aria-label="Más peso" onClick={() => onChange((x) => ({ ...x, peso: r2((x.peso === '' || x.peso == null ? ex.peso ?? 0 : +x.peso) + step) }))}>
                  +
                </button>
                <span className="u">kg{UNI[ex.unidad]}</span>
              </div>
            ))}
          <ol className="sets">
            {it.reps.map((r, i) => (
              <li key={i} className={`set ${it.hecho[i] ? 'done' : ''}`}>
                <span className="lbl">{ex.tipo === 'cardio' ? '' : `S${i + 1}`}</span>
                <button className="sq" aria-label="Menos" onClick={() => onChange((x) => ({ ...x, reps: x.reps.map((v, k) => (k === i ? Math.max(0, v - repStep) : v)), toc: x.toc.map((t, k) => (k === i ? true : t)) }))}>
                  −
                </button>
                <span className={`v ${it.hecho[i] || it.toc[i] ? '' : 'ghost'}`}>
                  {r}
                  <small>{suf}</small>
                </span>
                <button className="sq" aria-label="Más" onClick={() => onChange((x) => ({ ...x, reps: x.reps.map((v, k) => (k === i ? v + repStep : v)), toc: x.toc.map((t, k) => (k === i ? true : t)) }))}>
                  +
                </button>
                <button className="chk" aria-label={`Serie ${i + 1} hecha`} aria-pressed={it.hecho[i]} onClick={() => onCheck(i)}>
                  ✓
                </button>
              </li>
            ))}
          </ol>
          <input
            className="nota"
            id={`n-${ex.id}`}
            aria-label="Nota"
            value={it.nota}
            placeholder="Nota: con ayuda, otro gym, barra de 42…"
            onChange={(e) => onChange((x) => ({ ...x, nota: e.target.value }))}
          />
          <div className="ex-f">
            <button className="link" onClick={() => onChange((x) => ({ ...x, saltado: true }))}>
              Saltar ejercicio
            </button>
            {ex.demo && (
              <button className="link acc" onClick={onDemo}>
                Ver cómo se hace
              </button>
            )}
            <Link className="link" to={`/ejercicio/${ex.id}`}>
              Ver historial
            </Link>
          </div>
        </>
      )}
    </section>
  );
}
