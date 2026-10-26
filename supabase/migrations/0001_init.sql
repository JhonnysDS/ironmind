-- IronMind: esquema inicial.
-- Cada tabla guarda el registro completo en `data` (jsonb) para que la app
-- funcione sin conexión. Conflictos: gana el cambio con `updated_at` más reciente.
-- Row Level Security: cada usuario solo ve y modifica sus propias filas.

create table if not exists public.days (
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  deleted boolean not null default false,
  -- Hora del servidor del último cambio: es el cursor de sincronización
  -- (no depende del reloj de cada dispositivo).
  synced_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.exercises (like public.days including all);
create table if not exists public.sessions (like public.days including all);
-- Borrador de la sesión en curso y preferencias (clave/valor).
create table if not exists public.kv (like public.days including all);

-- `like ... including all` no copia la llave foránea: se agrega aparte.
alter table public.exercises add constraint exercises_user_fk foreign key (user_id) references auth.users (id) on delete cascade;
alter table public.sessions add constraint sessions_user_fk foreign key (user_id) references auth.users (id) on delete cascade;
alter table public.kv add constraint kv_user_fk foreign key (user_id) references auth.users (id) on delete cascade;

create or replace function public.touch_synced_at() returns trigger
language plpgsql as $$
begin
  new.synced_at := now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['days', 'exercises', 'sessions', 'kv'] loop
    execute format('create index if not exists %I on public.%I (user_id, synced_at)', t || '_synced', t);
    execute format('drop trigger if exists touch_synced_at on public.%I', t);
    execute format('create trigger touch_synced_at before insert or update on public.%I for each row execute function public.touch_synced_at()', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format(
      'create policy "own rows" on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())',
      t
    );
  end loop;
end $$;
