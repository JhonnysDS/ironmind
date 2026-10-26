import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { HomeTabs } from '../components/HomeTabs';
import { ciclo, diasDesde, haceTxt } from '../lib/cycle';
import { setKV } from '../lib/db';
import { useDays, useDraft, useExercises, useSessions } from '../lib/hooks';
import { horasDesde } from '../lib/session';
import { stopRest } from '../lib/timer';

let autoAbierto = false;

export default function Home() {
  const nav = useNavigate();
  const days = useDays() ?? [];
  const exercises = useExercises() ?? [];
  const sessions = useSessions() ?? [];
  const draft = useDraft();
  const [confirm, setConfirm] = useState<{ dia: string | null } | null>(null);

  const C = ciclo(days, sessions);
  const next = days.find((d) => d.id === C.next);
  const sinEntrenar = C.last ? diasDesde(C.last.fecha) : 0;
  const draftDay = draft ? days.find((d) => d.id === draft.dia) : null;

  // Si la app se cerró a mitad del entrenamiento, vuelve directo a la sesión (una vez por apertura).
  useEffect(() => {
    if (autoAbierto || !draft?.inicio || horasDesde(draft.inicio) >= 5) return;
    autoAbierto = true;
    nav(`/sesion/${draft.dia}`);
  }, [draft, nav]);

  function abrir(dia: string) {
    if (draft && draft.dia !== dia) return setConfirm({ dia });
    nav(`/sesion/${dia}`);
  }

  async function descartar() {
    const dia = confirm?.dia;
    await setKV('draft', null);
    stopRest();
    setConfirm(null);
    if (dia) nav(`/sesion/${dia}`);
  }

  return (
    <div className="wrap">
      <Header>
        <HomeTabs />
      </Header>

      <section className="mt">
        <p className="eyebrow">Ciclo actual</p>
        <h1 className="h2">{C.completo ? '¡Ciclo completo!' : `${C.hechos.size} de ${days.length} días hechos`}</h1>
        <div className="week" aria-hidden="true">
          {days.map((d) => (
            <span key={d.id} className={`wk ${C.hechos.has(d.id) ? 'done' : ''}`} />
          ))}
        </div>
        {C.last && next && (
          <p className="meta" style={{ marginTop: 8 }}>
            Último: {C.last.diaNombre}, {haceTxt(C.last.fecha)}. Te toca <b style={{ color: 'var(--fg)' }}>{next.nombre}</b>.
          </p>
        )}
        {sinEntrenar >= 10 && <p className="plan">Llevas {sinEntrenar} días sin entrenar: hoy usa pesos un poco más suaves.</p>}
      </section>

      {draft && draftDay && (
        <div className="banner mt">
          <p>
            <span className="eyebrow">{horasDesde(draft.creado) >= 18 ? `Sesión abierta ${haceTxt(draft.creado)}` : 'Sesión en curso'}</span>
            <br />
            <b>{draftDay.nombre}</b>
          </p>
          <div className="row">
            <button className="btn" onClick={() => setConfirm({ dia: null })}>
              Descartar
            </button>
            <button className="btn pri" onClick={() => nav(`/sesion/${draft.dia}`)}>
              Continuar
            </button>
          </div>
        </div>
      )}

      {confirm && draftDay && (
        <div className="panel mt" role="alertdialog" aria-label="Confirmar descarte">
          <p>
            {confirm.dia ? (
              <>
                Tienes <b>{draftDay.nombre}</b> sin terminar. ¿Lo descartas para empezar <b>{days.find((d) => d.id === confirm.dia)?.nombre}</b>?
              </>
            ) : (
              <>
                ¿Descartar <b>{draftDay.nombre}</b>?
              </>
            )}{' '}
            Lo que registraste ahí se pierde.
          </p>
          <div className="row">
            <button className="btn" onClick={() => setConfirm(null)}>
              Cancelar
            </button>
            <button className="btn pri" onClick={() => void descartar()}>
              {confirm.dia ? 'Descartar y empezar' : 'Descartar'}
            </button>
          </div>
        </div>
      )}

      <div className="stack mt">
        {days.map((d, i) => {
          const isNext = d.id === C.next && !draft;
          const enCurso = draft?.dia === d.id;
          const n = exercises.filter((e) => e.dia === d.id).length;
          return (
            <button key={d.id} className={`day ${isNext ? 'next' : ''}`} onClick={() => abrir(d.id)}>
              <span className="n">{i + 1}</span>
              <span className="t">
                <h3>{d.nombre}</h3>
                <p>
                  {d.sub ? `${d.sub} · ` : ''}
                  {n} ejercicios
                </p>
              </span>
              {enCurso ? (
                <span className="pill p-hold">En curso</span>
              ) : isNext ? (
                <span className="pill p-acc">Te toca</span>
              ) : C.hechos.has(d.id) ? (
                <span className="pill p-up">✓ Hecho</span>
              ) : null}
            </button>
          );
        })}
      </div>
      <p className="meta mt center">Si faltas un día, sigue con el que te toca. El orden importa más que el calendario.</p>
    </div>
  );
}
