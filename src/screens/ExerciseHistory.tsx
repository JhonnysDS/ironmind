import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { DemoDialog } from '../components/DemoDialog';
import { Header } from '../components/Header';
import { fechaCorta, fmt, itemTxt, pesoTxt, planTxt } from '../lib/format';
import { useDays, useExercises, useSessions } from '../lib/hooks';

export default function ExerciseHistory() {
  const { id } = useParams();
  const ex = useExercises()?.find((e) => e.id === id);
  const days = useDays() ?? [];
  const sessions = useSessions() ?? [];
  const [demo, setDemo] = useState(false);

  if (!ex)
    return (
      <div className="wrap">
        <Header back="history" />
        <div className="empty"><p>Cargando…</p></div>
      </div>
    );

  const rows = sessions.flatMap((s) => s.items.filter((i) => i.id === ex.id).map((it) => ({ s, it })));

  return (
    <div className="wrap">
      <Header back="history" />
      <div className="mt">
        <p className="eyebrow">
          {days.find((d) => d.id === ex.dia)?.nombre} · {planTxt(ex)}
        </p>
        <h1 className="h2">{ex.nombre}</h1>
        <p className="meta">
          Peso que toca: <b style={{ color: 'var(--fg)' }}>{pesoTxt(ex.unidad, ex.peso)}</b>
          {ex.incremento && ex.unidad !== 'corporal' ? ` · sube de ${fmt(ex.incremento)} kg en ${fmt(ex.incremento)} kg` : ''}
        </p>
        <div className="row" style={{ marginTop: 10 }}>
          {ex.demo && (
            <button className="btn small" onClick={() => setDemo(true)}>
              Ver cómo se hace
            </button>
          )}
          <Link className="btn small" to={`/rutina/${ex.dia}?ex=${ex.id}`}>
            Editar ejercicio
          </Link>
        </div>
      </div>
      {!rows.length ? (
        <div className="empty"><p>Todavía no hay registros de este ejercicio.</p></div>
      ) : (
        <div className="panel mt">
          {rows.map(({ s, it }) => (
            <div key={s.id} className="hrow">
              <span>
                {fechaCorta(s.fecha)}
                {s.aprox ? '*' : ''}
              </span>
              <span className="num" style={{ fontSize: 18 }}>
                {it.saltado || !it.reps.length ? 'Saltado' : itemTxt(it)}
              </span>
            </div>
          ))}
        </div>
      )}
      {rows.some((r) => r.s.aprox) && <p className="meta mt">* Fecha aproximada (sesiones importadas del chat).</p>}
      <DemoDialog path={demo ? ex.demo ?? null : null} title={ex.nombre} onClose={() => setDemo(false)} />
    </div>
  );
}
