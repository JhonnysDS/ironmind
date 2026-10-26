import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Header } from '../components/Header';
import { useToast } from '../components/Toast';
import { fechaCorta, fmt, itemTxt, pillCls, pillIco, textoResumen } from '../lib/format';
import { useSessions } from '../lib/hooks';

export default function Summary() {
  const { id } = useParams();
  const toast = useToast();
  const sessions = useSessions();
  const [showText, setShowText] = useState(false);
  const s = sessions?.find((x) => x.id === id);

  if (!sessions) return <div className="wrap"><Header back="history" /></div>;
  if (!s)
    return (
      <div className="wrap">
        <Header back={{ to: '/historial', label: 'Historial' }} />
        <div className="empty">
          <h2>No encontré esa sesión</h2>
          <Link to="/historial" className="btn">Ir al historial</Link>
        </div>
      </div>
    );

  const subir = s.items.filter((i) => i.v.t === 'up').length;
  const txt = textoResumen(s);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(txt);
      toast('Resumen copiado.');
    } catch {
      setShowText(true);
      toast('Selecciona el texto y cópialo.');
    }
  }

  return (
    <div className="wrap">
      <Header back={{ to: '/', label: 'Inicio' }} />
      <div className="mt">
        <p className="eyebrow">
          {fechaCorta(s.fecha)}
          {s.aprox ? ' (fecha aprox.)' : ''}
          {s.duracionMin ? ` · ${s.duracionMin} min` : ''}
          {s.malDia ? ' · día flojo' : ''}
        </p>
        <h1 className="h1">{s.diaNombre}</h1>
        {subir > 0 && (
          <p className="meta">
            {subir} ejercicio{subir > 1 ? 's' : ''} sube{subir > 1 ? 'n' : ''} de peso la próxima vez.
          </p>
        )}
      </div>
      <div className="panel mt">
        {s.items.map((i) => (
          <div key={i.id} className="res">
            <div>
              <h3>
                <Link to={`/ejercicio/${i.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                  {i.nombre}
                </Link>
              </h3>
              <p>
                {itemTxt(i)}
                {i.nota ? ` · ${i.nota}` : ''}
              </p>
            </div>
            <div className="nx" hidden={i.v.t === 'pend'}>
              <span className={`pill ${pillCls[i.v.t]}`}>
                {pillIco[i.v.t]}
                {i.v.txt}
              </span>
              {i.v.next != null && (
                <>
                  <span className="num">{fmt(i.v.next)} kg</span>
                  <span className="meta" style={{ fontSize: 12 }}>
                    próxima vez
                  </span>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
      <button className="btn block pri mt" onClick={() => void copiar()}>
        Copiar resumen
      </button>
      {showText && (
        <textarea
          readOnly
          value={txt}
          onFocus={(e) => e.currentTarget.select()}
          aria-label="Resumen en texto"
          style={{ width: '100%', marginTop: 10, minHeight: 140, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: 10, fontSize: 13 }}
        />
      )}
    </div>
  );
}
