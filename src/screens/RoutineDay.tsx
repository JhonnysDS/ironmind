import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { DemoDialog } from '../components/DemoDialog';
import { Header } from '../components/Header';
import { useToast } from '../components/Toast';
import { newId, put, remove } from '../lib/db';
import { demoThumb, loadCatalog, searchCatalog, type DemoEntry } from '../lib/demos';
import { planTxt } from '../lib/format';
import { useDays, useExercises } from '../lib/hooks';
import type { Exercise, Tipo, Unidad } from '../lib/types';

const UNIDADES: [Unidad, string][] = [
  ['c/lado', 'kg por lado (barra con discos)'],
  ['c/u', 'kg por mancuerna'],
  ['total', 'kg total (barra armada)'],
  ['kg', 'kg en máquina o polea'],
  ['corporal', 'Peso corporal'],
];
const TIPOS: [Tipo, string][] = [
  ['reps', 'Repeticiones'],
  ['fallo', 'Al fallo'],
  ['tiempo', 'Tiempo (segundos)'],
  ['cardio', 'Cardio (minutos)'],
];

export default function RoutineDay() {
  const { dia = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const day = useDays()?.find((d) => d.id === dia);
  const exercises = (useExercises() ?? []).filter((e) => e.dia === dia);
  const editId = params.get('ex');
  const editing = exercises.find((e) => e.id === editId) ?? (editId === 'nuevo' ? null : undefined);

  if (!day) return <div className="wrap"><Header back={{ to: '/rutina', label: 'Rutina' }} /></div>;

  if (editing !== undefined)
    return (
      <ExerciseForm
        key={editId}
        dia={dia}
        ex={editing}
        nextOrden={Math.max(0, ...exercises.map((e) => e.orden)) + 1}
        onDone={() => setParams({})}
      />
    );

  const mover = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= exercises.length) return;
    void put('exercises', [{ ...exercises[i], orden: exercises[j].orden }, { ...exercises[j], orden: exercises[i].orden }]);
  };

  return (
    <div className="wrap">
      <Header back={{ to: '/rutina', label: 'Rutina' }} />
      <div className="mt stack">
        <label className="field" htmlFor="dnombre">
          Nombre del día
          <input id="dnombre" defaultValue={day.nombre} onBlur={(e) => e.target.value.trim() && e.target.value !== day.nombre && void put('days', { ...day, nombre: e.target.value.trim() })} />
        </label>
        <label className="field" htmlFor="dsub">
          Músculos (texto corto)
          <input id="dsub" defaultValue={day.sub} onBlur={(e) => e.target.value !== day.sub && void put('days', { ...day, sub: e.target.value })} />
        </label>
      </div>
      <div className="stack mt">
        {exercises.map((e, i) => (
          <div key={e.id} className="day" style={{ gap: 8 }}>
            <button onClick={() => setParams({ ex: e.id })} style={{ all: 'unset', flex: 1, minWidth: 0, cursor: 'pointer' }}>
              <h3 style={{ fontSize: 19 }}>{e.nombre}</h3>
              <p className="meta" style={{ margin: 0 }}>
                {planTxt(e)} · Editar ›
              </p>
            </button>
            <button className="sq" aria-label={`Subir ${e.nombre}`} disabled={i === 0} onClick={() => mover(i, -1)}>
              ↑
            </button>
            <button className="sq" aria-label={`Bajar ${e.nombre}`} disabled={i === exercises.length - 1} onClick={() => mover(i, 1)}>
              ↓
            </button>
          </div>
        ))}
      </div>
      <button className="btn block mt" onClick={() => setParams({ ex: 'nuevo' })}>
        Agregar ejercicio
      </button>
    </div>
  );
}

function ExerciseForm({ dia, ex, nextOrden, onDone }: { dia: string; ex: Exercise | null; nextOrden: number; onDone: () => void }) {
  const toast = useToast();
  const [f, setF] = useState<Exercise>(
    ex ?? {
      id: newId(), dia, orden: nextOrden, nombre: '', tipo: 'reps', series: 3, repsMin: 10, repsMax: 12, descanso: 90,
      peso: null, unidad: 'kg', incremento: 2.5, nota: '', nuevo: true, demo: null, updated_at: '',
    },
  );
  const [demo, setDemo] = useState(false);
  const [buscar, setBuscar] = useState(false);
  const [borrar, setBorrar] = useState(false);
  const set = <K extends keyof Exercise>(k: K, v: Exercise[K]) => setF((x) => ({ ...x, [k]: v }));
  const num = (v: string) => (v === '' ? 0 : Number(v));

  async function guardar() {
    if (!f.nombre.trim()) return toast('Ponle un nombre al ejercicio.');
    if (f.repsMax < f.repsMin) return toast('El máximo del rango no puede ser menor que el mínimo.');
    await put('exercises', { ...f, nombre: f.nombre.trim() });
    toast('Guardado');
    onDone();
  }

  return (
    <div className="wrap">
      <Header back={{ to: `/rutina/${dia}`, label: 'Volver' }} />
      <div className="mt">
        <p className="eyebrow">{ex ? 'Editar ejercicio' : 'Nuevo ejercicio'}</p>
      </div>
      <form className="stack" style={{ marginTop: 8 }} onSubmit={(e) => { e.preventDefault(); void guardar(); }}>
        <label className="field" htmlFor="fn">
          Nombre
          <input id="fn" required value={f.nombre} onChange={(e) => set('nombre', e.target.value)} />
        </label>
        <div className="grid2">
          <label className="field" htmlFor="ft">
            Tipo
            <select id="ft" value={f.tipo} onChange={(e) => set('tipo', e.target.value as Tipo)}>
              {TIPOS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
            </select>
          </label>
          <label className="field" htmlFor="fs">
            Series
            <input id="fs" type="number" inputMode="numeric" min={1} value={f.series} onChange={(e) => set('series', Math.max(1, num(e.target.value)))} />
          </label>
          {f.tipo !== 'fallo' && (
            <>
              <label className="field" htmlFor="fmin">
                {f.tipo === 'tiempo' ? 'Mínimo (s)' : f.tipo === 'cardio' ? 'Mínimo (min)' : 'Reps mínimas'}
                <input id="fmin" type="number" inputMode="numeric" min={1} value={f.repsMin} onChange={(e) => set('repsMin', num(e.target.value))} />
              </label>
              <label className="field" htmlFor="fmax">
                {f.tipo === 'tiempo' ? 'Máximo (s)' : f.tipo === 'cardio' ? 'Máximo (min)' : 'Reps máximas'}
                <input id="fmax" type="number" inputMode="numeric" min={1} value={f.repsMax} onChange={(e) => set('repsMax', num(e.target.value))} />
              </label>
            </>
          )}
          <label className="field" htmlFor="fd">
            Descanso (segundos)
            <input id="fd" type="number" inputMode="numeric" min={0} step={15} value={f.descanso} onChange={(e) => set('descanso', num(e.target.value))} />
          </label>
          <label className="field" htmlFor="fu">
            Cómo se anota el peso
            <select id="fu" value={f.unidad} onChange={(e) => set('unidad', e.target.value as Unidad)}>
              {UNIDADES.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
            </select>
          </label>
          {f.unidad !== 'corporal' && (
            <>
              <label className="field" htmlFor="fp">
                Peso que toca (kg)
                <input id="fp" type="number" inputMode="decimal" step="any" value={f.peso ?? ''} onChange={(e) => set('peso', e.target.value === '' ? null : Number(e.target.value))} />
              </label>
              <label className="field" htmlFor="fi">
                Cuánto sube (kg)
                <input id="fi" type="number" inputMode="decimal" step="any" min={0} value={f.incremento} onChange={(e) => set('incremento', num(e.target.value))} />
              </label>
            </>
          )}
        </div>
        <label className="check" htmlFor="flado">
          <input id="flado" type="checkbox" checked={!!f.porLado} onChange={(e) => set('porLado', e.target.checked)} />
          Las repeticiones son por lado (una pierna o un brazo a la vez)
        </label>
        <label className="field" htmlFor="fnota">
          Nota fija (aparece en la sesión)
          <input id="fnota" value={f.nota} onChange={(e) => set('nota', e.target.value)} placeholder="Ej.: descansa 3 min antes de la última serie" />
        </label>

        <div className="panel">
          <p className="eyebrow" style={{ marginBottom: 8 }}>Animación</p>
          {f.demo ? (
            <div className="result" style={{ background: 'none', border: 0, padding: 0 }}>
              <img src={demoThumb(f.demo)} alt="" />
              <span className="meta" style={{ flex: 1 }}>{f.demo}</span>
              <button type="button" className="btn small" onClick={() => setDemo(true)}>Ver</button>
            </div>
          ) : (
            <p className="meta">Sin animación.</p>
          )}
          <div className="row" style={{ marginTop: 10 }}>
            <button type="button" className="btn small" onClick={() => setBuscar(!buscar)}>{buscar ? 'Cerrar búsqueda' : f.demo ? 'Cambiar animación' : 'Buscar animación'}</button>
            {f.demo && <button type="button" className="btn small" onClick={() => set('demo', null)}>Quitar</button>}
          </div>
          {buscar && <DemoSearch initial={f.nombre} onPick={(id) => { set('demo', id); setBuscar(false); }} />}
        </div>

        <button className="btn pri block">Guardar</button>
        {ex && (
          <button type="button" className="link" onClick={() => setBorrar(true)}>
            Eliminar ejercicio
          </button>
        )}
        {borrar && ex && (
          <div className="panel" role="alertdialog">
            <p>¿Eliminar <b>{ex.nombre}</b> de la rutina? Su historial se conserva.</p>
            <div className="row">
              <button type="button" className="btn" onClick={() => setBorrar(false)}>Cancelar</button>
              <button type="button" className="btn pri" onClick={() => void remove('exercises', ex.id).then(onDone)}>Eliminar</button>
            </div>
          </div>
        )}
      </form>
      <DemoDialog path={demo ? f.demo ?? null : null} title={f.nombre} onClose={() => setDemo(false)} />
    </div>
  );
}

function DemoSearch({ initial, onPick }: { initial: string; onPick: (id: string) => void }) {
  const [list, setList] = useState<DemoEntry[] | null>(null);
  const [err, setErr] = useState(false);
  const [q, setQ] = useState(initial);
  useEffect(() => {
    loadCatalog().then(setList, () => setErr(true));
  }, []);
  const res = list ? searchCatalog(list, q) : [];
  return (
    <div style={{ marginTop: 12 }}>
      <label className="field" htmlFor="dq">
        Buscar (en español o inglés)
        <input id="dq" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ej.: press banca, curl martillo" />
      </label>
      {err && <p className="err">No se pudo cargar el catálogo. Revisa tu conexión.</p>}
      {!list && !err && <p className="meta">Cargando catálogo…</p>}
      {list && q.trim() && !res.length && <p className="meta">Sin resultados. Prueba con otra palabra.</p>}
      <div className="results">
        {res.map((r) => (
          <button type="button" key={r.id} className="result" onClick={() => onPick(r.id)}>
            <img src={demoThumb(r.id)} alt="" loading="lazy" />
            <span>
              <b style={{ display: 'block', fontSize: 15 }}>{r.name}</b>
              <span className="meta" style={{ fontSize: 12 }}>{r.muscle} · {r.equipment}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
