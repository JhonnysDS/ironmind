import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/Header';
import { newId, put, remove } from '../lib/db';
import { useDays, useExercises } from '../lib/hooks';
import type { Day } from '../lib/types';

export default function Routine() {
  const days = useDays() ?? [];
  const exercises = useExercises() ?? [];
  const [borrar, setBorrar] = useState<Day | null>(null);

  const mover = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= days.length) return;
    void put('days', [{ ...days[i], orden: days[j].orden }, { ...days[j], orden: days[i].orden }]);
  };

  const agregar = () => {
    const orden = Math.max(0, ...days.map((d) => d.orden)) + 1;
    void put('days', { id: newId(), nombre: `Día ${days.length + 1}`, sub: '', orden, updated_at: '' });
  };

  async function confirmarBorrado(d: Day) {
    for (const e of exercises.filter((x) => x.dia === d.id)) await remove('exercises', e.id);
    await remove('days', d.id);
    setBorrar(null);
  }

  return (
    <div className="wrap">
      <Header back={{ to: '/ajustes', label: 'Ajustes' }} />
      <div className="mt">
        <p className="eyebrow">Rutina</p>
        <h1 className="h2">Tus días de entrenamiento</h1>
        <p className="meta">El orden de esta lista es el orden del ciclo.</p>
      </div>
      <div className="stack mt">
        {days.map((d, i) => (
          <div key={d.id} className="day" style={{ gap: 8 }}>
            <Link to={`/rutina/${d.id}`} style={{ flex: 1, minWidth: 0, color: 'inherit', textDecoration: 'none' }}>
              <h3>
                {i + 1}. {d.nombre}
              </h3>
              <p>{exercises.filter((e) => e.dia === d.id).length} ejercicios · Editar ›</p>
            </Link>
            <button className="sq" aria-label={`Subir ${d.nombre}`} disabled={i === 0} onClick={() => mover(i, -1)}>
              ↑
            </button>
            <button className="sq" aria-label={`Bajar ${d.nombre}`} disabled={i === days.length - 1} onClick={() => mover(i, 1)}>
              ↓
            </button>
            <button className="sq" aria-label={`Eliminar ${d.nombre}`} onClick={() => setBorrar(d)}>
              ✕
            </button>
          </div>
        ))}
      </div>
      {borrar && (
        <div className="panel mt" role="alertdialog">
          <p>
            ¿Eliminar <b>{borrar.nombre}</b> y sus ejercicios? Tu historial de sesiones se conserva.
          </p>
          <div className="row">
            <button className="btn" onClick={() => setBorrar(null)}>
              Cancelar
            </button>
            <button className="btn pri" onClick={() => void confirmarBorrado(borrar)}>
              Eliminar
            </button>
          </div>
        </div>
      )}
      <button className="btn block mt" onClick={agregar}>
        Agregar día
      </button>
    </div>
  );
}
