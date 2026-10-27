-- Recomendación del asesor de seguridad de Supabase: fijar el search_path de la función del trigger.
alter function public.touch_synced_at() set search_path = '';
