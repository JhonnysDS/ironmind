import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { onSyncStatus, type SyncStatus } from '../lib/sync';

const LABEL: Record<SyncStatus, string> = {
  local: 'Modo local: los datos solo están en este dispositivo',
  offline: 'Sin conexión: se sincroniza al volver',
  syncing: 'Sincronizando…',
  ok: 'Sincronizado',
  error: 'Error al sincronizar',
};

export function SyncDot() {
  const [s, setS] = useState<SyncStatus>('local');
  useEffect(() => onSyncStatus((st) => setS(st)), []);
  return <span className={`dot ${s}`} title={LABEL[s]} aria-label={LABEL[s]} role="img" />;
}

export function Header({ back, children }: { back?: { to: string; label: string } | 'history'; children?: ReactNode }) {
  const nav = useNavigate();
  return (
    <header className="top">
      {back ? (
        <button className="back" onClick={() => (back === 'history' ? nav(-1) : nav(back.to))}>
          ‹ {back === 'history' ? 'Volver' : back.label}
        </button>
      ) : (
        <Link to="/" className="brand">
          Iron<b>Mind</b>
        </Link>
      )}
      <span className="sp" />
      {children}
      <SyncDot />
    </header>
  );
}
