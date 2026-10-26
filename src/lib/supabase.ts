import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** Sin variables de entorno la app funciona en "modo local": todo queda solo en este dispositivo. */
export const supabase: SupabaseClient | null =
  url && key ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } }) : null;

export const modoLocal = !supabase;

/** El botón de Google solo aparece si se activa en Supabase y se pone VITE_GOOGLE_LOGIN=true. */
export const googleLogin = import.meta.env.VITE_GOOGLE_LOGIN === 'true';
