import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/Header';
import { HomeTabs } from '../components/HomeTabs';
import { useToast } from '../components/Toast';
import { signOut, useAuth } from '../lib/auth';
import { setKV } from '../lib/db';
import { usePrefs } from '../lib/hooks';
import { finish, playSound, SONIDOS, tick, vibrate } from '../lib/sound';
import { onSyncStatus, syncNow, type SyncStatus } from '../lib/sync';
import { exportData, importData } from '../lib/transfer';
import { modoLocal } from '../lib/supabase';
import type { Prefs } from '../lib/types';
import { useTheme, type Theme } from '../lib/theme';

const SYNC_TXT: Record<SyncStatus, string> = {
  local: 'Modo local: los datos solo están en este dispositivo.',
  offline: 'Sin conexión. Tus cambios se guardan y se suben al volver.',
  syncing: 'Sincronizando…',
  ok: 'Todo sincronizado.',
  error: 'No se pudo sincronizar.',
};

export default function Settings() {
  const prefs = usePrefs();
  const [theme, setTheme] = useTheme();
  const toast = useToast();
  const { user } = useAuth();
  const [sync, setSync] = useState<{ s: SyncStatus; d?: string }>({ s: 'local' });
  useEffect(() => onSyncStatus((s, d) => setSync({ s, d })), []);

  const save = (p: Partial<Prefs>) => void setKV('prefs', { ...prefs, ...p });

  function probarDescanso() {
    toast('Descanso de prueba: 5 segundos');
    const end = Date.now() + 5000;
    const seen = new Set<number>();
    const iv = setInterval(() => {
      const left = Math.ceil((end - Date.now()) / 1000);
      if (prefs.cuenta && left >= 1 && left <= 3 && !seen.has(left)) {
        seen.add(left);
        tick(prefs);
      }
      if (left <= 0) {
        clearInterval(iv);
        finish(prefs);
        toast('¡A la siguiente serie!');
      }
    }, 100);
  }

  async function descargar() {
    const data = await exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ironmind-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  async function importar(f: File | undefined) {
    if (!f) return;
    try {
      const r = await importData(JSON.parse(await f.text()));
      toast(`Importado: ${r.exercises} ejercicios y ${r.sessions} sesiones.`);
    } catch (e) {
      toast(e instanceof SyntaxError ? 'El archivo no es un JSON válido.' : e instanceof Error ? e.message : String(e));
    }
  }

  const sw = (on: boolean, title: string, sub: string, onClick: () => void) => (
    <button className="day" role="switch" aria-checked={on} onClick={onClick}>
      <span className="t">
        <h3 style={{ fontSize: 19 }}>{title}</h3>
        <p>{sub}</p>
      </span>
      <span className={`pill ${on ? 'p-up' : 'p-mut'}`}>{on ? 'Activado' : 'Apagado'}</span>
    </button>
  );

  return (
    <div className="wrap">
      <Header>
        <HomeTabs />
      </Header>

      <section className="mt">
        <p className="eyebrow" id="tema-lbl">Apariencia</p>
        <div className="seg" role="radiogroup" aria-labelledby="tema-lbl" style={{ marginTop: 8 }}>
          {([['system', 'Sistema'], ['light', 'Claro'], ['dark', 'Oscuro']] as [Theme, string][]).map(([v, t]) => (
            <button key={v} role="radio" aria-checked={theme === v} className={theme === v ? 'on' : ''} onClick={() => setTheme(v)}>
              {t}
            </button>
          ))}
        </div>
        <p className="meta" style={{ marginTop: 6 }}>"Sistema" sigue el modo de tu celular. Se guarda en este dispositivo.</p>
      </section>

      <section className="mt">
        <p className="eyebrow">Rutina</p>
        <Link to="/rutina" className="day" style={{ marginTop: 8 }}>
          <span className="t">
            <h3 style={{ fontSize: 19 }}>Editar mi rutina</h3>
            <p>Días, ejercicios, series, rangos, descansos y animaciones.</p>
          </span>
          <span className="meta">›</span>
        </Link>
      </section>

      <section className="mt">
        <p className="eyebrow">Temporizador · sonido al terminar</p>
        <div className="stack" style={{ marginTop: 8 }}>
          {Object.entries(SONIDOS).map(([id, s]) => (
            <div key={id} className={`day ${prefs.sonido === id ? 'next' : ''}`} style={{ gap: 10 }}>
              <button
                onClick={() => {
                  save({ sonido: id });
                  playSound(id);
                }}
                aria-pressed={prefs.sonido === id}
                style={{ all: 'unset', flex: 1, minWidth: 0, cursor: 'pointer' }}
              >
                <h3 style={{ fontSize: 19 }}>{s.nombre}</h3>
                <p className="meta" style={{ margin: 0 }}>{s.desc}</p>
              </button>
              <button className="btn small" onClick={() => playSound(id)}>
                Probar
              </button>
            </div>
          ))}
          {sw(prefs.cuenta, 'Cuenta regresiva 3-2-1', 'Un pitido corto en los últimos 3 segundos', () => save({ cuenta: !prefs.cuenta }))}
          {sw(prefs.vibrar, 'Vibración', 'Vibra fuerte al terminar y suave en el 3-2-1', () => save({ vibrar: !prefs.vibrar }))}
        </div>
        <div className="row mt">
          <button className="btn" onClick={() => toast(vibrate({ ...prefs, vibrar: true }, [400, 150, 400]) ? 'Si sentiste la vibración, funciona.' : 'Este navegador no permite vibrar.')}>
            Probar vibración
          </button>
          <button className="btn" onClick={probarDescanso}>
            Probar descanso de 5 s
          </button>
        </div>
        <p className="meta mt">El sonido usa el volumen multimedia del celular. Con la app cerrada no puede sonar; eso llega con la versión de Android.</p>
      </section>

      <section className="mt">
        <p className="eyebrow">Tus datos</p>
        <div className="panel" style={{ marginTop: 8 }}>
          <p>
            {SYNC_TXT[sync.s]}
            {sync.s === 'error' && sync.d ? <span className="err"> ({sync.d})</span> : null}
          </p>
          <div className="row">
            {!modoLocal && (
              <button className="btn small" onClick={() => void syncNow()}>
                Sincronizar ahora
              </button>
            )}
            <button className="btn small" onClick={() => void descargar()}>
              Descargar copia (.json)
            </button>
            <label className="btn small" htmlFor="imp" style={{ cursor: 'pointer' }}>
              Importar copia
              <input id="imp" type="file" accept="application/json,.json" hidden onChange={(e) => void importar(e.target.files?.[0])} />
            </label>
          </div>
        </div>
      </section>

      {user && (
        <section className="mt">
          <p className="eyebrow">Cuenta</p>
          <div className="panel" style={{ marginTop: 8 }}>
            <p>{user.email}</p>
            <button className="btn small" onClick={() => void signOut()}>
              Cerrar sesión
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
