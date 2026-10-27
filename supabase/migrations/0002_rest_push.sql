-- IronMind: notificación al terminar el descanso (Web Push).
--
-- Flujo: al marcar una serie, la app guarda en `rest_alarms` la hora en que
-- termina el descanso. Cada 5 segundos, `dispatch_rest_alarms()` revisa si hay
-- avisos vencidos y, solo entonces, llama a la Edge Function `send-rest-alarms`,
-- que envía la notificación y marca el aviso como enviado.
--
-- Antes de ejecutar este archivo, crea los dos secretos de Vault con el bloque
-- "Configuración" del README (URL de la función y secreto compartido).

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- Un registro por navegador/celular donde se activaron las notificaciones.
create table if not exists public.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

-- Como mucho un aviso pendiente por dispositivo: el descanso actual.
create table if not exists public.rest_alarms (
  endpoint text primary key references public.push_subscriptions (endpoint) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  fire_at timestamptz not null,
  title text not null,
  body text not null default '',
  url text not null default '/',
  sent_at timestamptz
);

create index if not exists rest_alarms_due on public.rest_alarms (fire_at) where sent_at is null;

alter table public.push_subscriptions enable row level security;
alter table public.rest_alarms enable row level security;

drop policy if exists "own rows" on public.push_subscriptions;
create policy "own rows" on public.push_subscriptions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own rows" on public.rest_alarms;
create policy "own rows" on public.rest_alarms for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- La Edge Function comprueba con esto que la llamada viene de pg_cron.
create or replace function public.verify_rest_push_secret(s text) returns boolean
language sql security definer set search_path = '' stable as $$
  select exists (
    select 1 from vault.decrypted_secrets
    where name = 'rest_push_secret' and decrypted_secret = s
  );
$$;
revoke execute on function public.verify_rest_push_secret(text) from public, anon, authenticated;
grant execute on function public.verify_rest_push_secret(text) to service_role;

-- Solo llama a la función si hay algo que enviar, para no gastar invocaciones.
create or replace function public.dispatch_rest_alarms() returns void
language plpgsql security definer set search_path = '' as $$
declare
  fn_url text;
  fn_secret text;
begin
  if not exists (
    select 1 from public.rest_alarms
    where sent_at is null and fire_at <= now() + interval '1 second'
  ) then
    return;
  end if;

  select decrypted_secret into fn_url from vault.decrypted_secrets where name = 'rest_push_url';
  select decrypted_secret into fn_secret from vault.decrypted_secrets where name = 'rest_push_secret';
  if fn_url is null or fn_secret is null then
    raise warning 'IronMind: faltan los secretos rest_push_url o rest_push_secret en Vault';
    return;
  end if;

  perform net.http_post(
    url := fn_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', fn_secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 8000
  );
end $$;
revoke execute on function public.dispatch_rest_alarms() from public, anon, authenticated;

-- Cada 5 segundos (pg_cron 1.5+ acepta intervalos en segundos).
select cron.unschedule(jobid) from cron.job where jobname = 'ironmind-rest-alarms';
select cron.schedule('ironmind-rest-alarms', '5 seconds', 'select public.dispatch_rest_alarms()');
