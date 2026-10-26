import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session as AuthSession, User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { startSync } from './sync';

interface AuthState {
  ready: boolean;
  user: User | null;
}

const Ctx = createContext<AuthState>({ ready: false, user: null });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ ready: !supabase, user: null });

  useEffect(() => {
    if (!supabase) return;
    const apply = (s: AuthSession | null) => {
      setState({ ready: true, user: s?.user ?? null });
      void startSync(s?.user?.id ?? null);
    };
    void supabase.auth.getSession().then(({ data }) => apply(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => apply(s));
    return () => data.subscription.unsubscribe();
  }, []);

  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);

const redirectTo = () => window.location.origin;

export async function signInGoogle() {
  const { error } = await supabase!.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirectTo() } });
  if (error) throw error;
}

export async function signInEmail(email: string, password: string) {
  const { error } = await supabase!.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signUpEmail(email: string, password: string): Promise<'confirm' | 'ok'> {
  const { data, error } = await supabase!.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo() } });
  if (error) throw error;
  return data.session ? 'ok' : 'confirm';
}

export async function resetPassword(email: string) {
  const { error } = await supabase!.auth.resetPasswordForEmail(email, { redirectTo: redirectTo() });
  if (error) throw error;
}

export async function signOut() {
  await supabase?.auth.signOut();
}

/** Traduce los errores más comunes de Supabase Auth. */
export function authError(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e);
  if (/invalid login credentials/i.test(m)) return 'Correo o contraseña incorrectos.';
  if (/email not confirmed/i.test(m)) return 'Confirma tu correo: te enviamos un enlace al registrarte.';
  if (/already registered/i.test(m)) return 'Ese correo ya tiene cuenta. Inicia sesión.';
  if (/password should be at least/i.test(m)) return 'La contraseña debe tener al menos 6 caracteres.';
  if (/rate limit/i.test(m)) return 'Demasiados intentos. Espera un minuto y vuelve a intentar.';
  if (/fetch|network/i.test(m)) return 'Sin conexión. Revisa tu internet.';
  return m;
}
