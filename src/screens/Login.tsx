import { useState, type FormEvent } from 'react';
import { authError, resetPassword, signInEmail, signInGoogle, signUpEmail } from '../lib/auth';
import { googleLogin } from '../lib/supabase';

type Modo = 'entrar' | 'crear';

export default function Login() {
  const [modo, setModo] = useState<Modo>('entrar');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ t: 'err' | 'ok'; m: string } | null>(null);

  async function run(fn: () => Promise<unknown>, ok?: string) {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      if (ok) setMsg({ t: 'ok', m: ok });
    } catch (e) {
      setMsg({ t: 'err', m: authError(e) });
    } finally {
      setBusy(false);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (modo === 'entrar') void run(() => signInEmail(email.trim(), pass));
    else
      void run(async () => {
        const r = await signUpEmail(email.trim(), pass);
        if (r === 'confirm') setMsg({ t: 'ok', m: 'Te enviamos un correo para confirmar tu cuenta. Ábrelo y vuelve aquí.' });
      });
  }

  return (
    <div className="wrap" style={{ paddingBottom: 40 }}>
      <div style={{ paddingTop: 48 }}>
        <p className="brand" style={{ fontSize: 34 }}>
          Iron<b>Mind</b>
        </p>
        <p className="meta">Tu rutina, tus pesos y tu progreso, en el gym y sin conexión.</p>
      </div>

      {googleLogin && (
      <div className="stack mt">
        <button className="btn block" disabled={busy} onClick={() => void run(signInGoogle)}>
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
            <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
          </svg>
          Continuar con Google
        </button>
        <p className="meta center">o con tu correo</p>
      </div>
      )}

      <form className="panel stack" style={{ marginTop: googleLogin ? 0 : 20 }} onSubmit={submit}>
        <div className="tabs" role="tablist">
          <button type="button" role="tab" aria-selected={modo === 'entrar'} className={`tab ${modo === 'entrar' ? 'on' : ''}`} onClick={() => setModo('entrar')}>
            Iniciar sesión
          </button>
          <button type="button" role="tab" aria-selected={modo === 'crear'} className={`tab ${modo === 'crear' ? 'on' : ''}`} onClick={() => setModo('crear')}>
            Crear cuenta
          </button>
        </div>
        <label className="field" htmlFor="email">
          Correo
          <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field" htmlFor="pass">
          Contraseña
          <input id="pass" type="password" autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'} required minLength={6} value={pass} onChange={(e) => setPass(e.target.value)} />
        </label>
        {msg && <p className={msg.t === 'err' ? 'err' : 'meta'}>{msg.m}</p>}
        <button className="btn pri block" disabled={busy}>
          {busy ? 'Un momento…' : modo === 'entrar' ? 'Iniciar sesión' : 'Crear cuenta'}
        </button>
        {modo === 'entrar' && (
          <button
            type="button"
            className="link"
            disabled={busy}
            onClick={() =>
              email.trim()
                ? void run(() => resetPassword(email.trim()), 'Te enviamos un correo para cambiar tu contraseña.')
                : setMsg({ t: 'err', m: 'Escribe tu correo arriba y vuelve a tocar aquí.' })
            }
          >
            Olvidé mi contraseña
          </button>
        )}
      </form>
    </div>
  );
}
