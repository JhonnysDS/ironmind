import { useState } from 'react';
import { Header } from '../components/Header';
import { useToast } from '../components/Toast';
import { importData, seedBaseRoutine } from '../lib/transfer';

/** Primera vez: importar el historial de la app anterior o empezar con la rutina base. */
export default function Welcome() {
  const toast = useToast();
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(f: File | undefined) {
    if (!f) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await importData(JSON.parse(await f.text()));
      toast(`Importado: ${r.exercises} ejercicios y ${r.sessions} sesiones.`);
    } catch (e) {
      setErr(e instanceof SyntaxError ? 'El archivo no es un JSON válido.' : e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="wrap">
      <Header />
      <div className="mt">
        <p className="eyebrow">Bienvenido</p>
        <h1 className="h1">Empecemos con tu rutina</h1>
        <p className="meta">Trae todo tu historial desde la app anterior, o empieza con la rutina base de 5 días.</p>
      </div>
      <div className="stack mt">
        <label className="day" htmlFor="import" style={{ cursor: 'pointer' }}>
          <span className="t">
            <h3>Importar mi historial</h3>
            <p>Elige el archivo .json que te dio Claude.</p>
          </span>
          <span className="pill p-acc">{busy ? 'Importando…' : 'Elegir archivo'}</span>
          <input id="import" type="file" accept="application/json,.json" hidden disabled={busy} onChange={(e) => void onFile(e.target.files?.[0])} />
        </label>
        <button className="day" disabled={busy} onClick={() => void seedBaseRoutine()}>
          <span className="t">
            <h3>Usar la rutina base</h3>
            <p>5 días: empuje, jalón, piernas, torso y piernas + brazos. Sin pesos: la primera vez anotas tu peso base.</p>
          </span>
        </button>
        {err && <p className="err">{err}</p>}
      </div>
    </div>
  );
}
