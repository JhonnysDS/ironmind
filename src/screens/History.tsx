import { Link } from 'react-router-dom';
import { Header } from '../components/Header';
import { HomeTabs } from '../components/HomeTabs';
import { fechaCorta } from '../lib/format';
import { useSessions } from '../lib/hooks';

export default function History() {
  const sessions = useSessions() ?? [];
  return (
    <div className="wrap">
      <Header>
        <HomeTabs />
      </Header>
      {!sessions.length ? (
        <div className="empty">
          <h2>Aún no hay sesiones</h2>
          <p>Cuando termines tu primera sesión aparecerá aquí, con el resumen listo para copiar.</p>
        </div>
      ) : (
        <div className="stack mt">
          <p className="eyebrow">{sessions.length} sesiones</p>
          {sessions.map((s) => (
            <Link key={s.id} to={`/resumen/${s.id}`} className="day">
              <span className="t">
                <h3>{s.diaNombre}</h3>
                <p>
                  {fechaCorta(s.fecha)}
                  {s.aprox ? ' (fecha aprox.)' : ''}
                  {s.duracionMin ? ` · ${s.duracionMin} min` : ''}
                  {s.malDia ? ' · día flojo' : ''}
                </p>
              </span>
              <span className="meta">Ver ›</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
