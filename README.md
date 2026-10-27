# IronMind

App personal de entrenamiento: rutina por ciclo de días, registro de series, temporizador de descanso, progresión automática de pesos e historial. Funciona sin conexión y sincroniza con Supabase.

- **Web/PWA:** React 18 + TypeScript + Vite, instalable en Android.
- **Datos:** IndexedDB (Dexie) en el dispositivo, sincronizado con Supabase (Postgres + Auth).
- **Login:** Google o correo y contraseña.
- **Animaciones:** GIFs de [ExerciseGymGifsDB](https://github.com/JahelCuadrado/ExerciseGymGifsDB), cargados desde jsDelivr (no se copian a este repo; según su README, pertenecen a sus autores).

## Desarrollo local

```bash
npm install
npm run dev        # sin .env.local funciona en "modo local" (sin login, datos solo en el navegador)
npm test           # reglas de progresión y ciclo
npm run build
```

## Puesta en marcha (una sola vez)

### 1. Supabase
1. Crea un proyecto en https://supabase.com.
2. **SQL Editor** → pega y ejecuta `supabase/migrations/0001_init.sql`.
3. **Project Settings → API**: copia `Project URL` y `anon public key` a `.env.local` (usa `.env.example` como guía).
4. **Authentication → URL Configuration**:
   - *Site URL*: la URL de Vercel (p. ej. `https://ironmind.vercel.app`).
   - *Redirect URLs*: agrega esa URL y `http://localhost:5173`.
5. **Authentication → Providers → Google**: actívalo con un *Client ID* y *Client Secret* de Google Cloud
   (APIs y servicios → Credenciales → ID de cliente OAuth → Aplicación web). En Google, el *URI de redireccionamiento
   autorizado* es `https://TU-PROYECTO.supabase.co/auth/v1/callback`.
6. El correo con contraseña viene activado por defecto.

### 2. Vercel
1. Importa este repositorio en https://vercel.com (framework: Vite).
2. Variables de entorno: `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (la *publishable key*, nunca la secret).
   Cuando actives Google en Supabase, agrega `VITE_GOOGLE_LOGIN=true` y vuelve a desplegar.
3. `vercel.json` ya está incluido: redirige las rutas de la app a `index.html`.

### 3. Instalar en Android
Abre la URL en Chrome → menú ⋮ → **Instalar app**.

### 4. Traer el historial
En la primera pantalla elige **Importar mi historial** y selecciona `ironmind-historial.json`.

## Notificaciones del descanso (Web Push)

Al marcar una serie, la app guarda en `rest_alarms` la hora en que termina el descanso. `pg_cron` revisa cada 5 s y,
solo si hay avisos vencidos, llama a la Edge Function `send-rest-alarms`, que envía la notificación. Llega aunque la app
esté cerrada o la pantalla apagada (con hasta ~5 s de retraso; requiere internet al marcar la serie).

Configuración, una sola vez:

1. **Claves VAPID** en tu computador: `npx web-push generate-vapid-keys`. La pública va en Vercel; la privada, solo en Supabase.
2. **Secretos de Vault** (Supabase → SQL Editor), cambiando `TU-PROYECTO` por el id de tu proyecto:
   ```sql
   select vault.create_secret('https://TU-PROYECTO.supabase.co/functions/v1/send-rest-alarms', 'rest_push_url');
   select vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'rest_push_secret');
   ```
3. **SQL Editor** → ejecuta `supabase/migrations/0002_rest_push.sql` (activa `pg_cron` y `pg_net`, crea las tablas y la tarea).
4. **Edge Functions → Deploy a new function → Via Editor**: nombre `send-rest-alarms`, pega
   `supabase/functions/send-rest-alarms/index.ts` y despliega. En los detalles de la función, **desactiva "Verify JWT"**
   (la llamada se autentica con el secreto de Vault).
   Con la CLI: `npx supabase functions deploy send-rest-alarms --no-verify-jwt`.
5. **Edge Functions → Secrets**: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` y `VAPID_SUBJECT` (p. ej. `mailto:tu-correo@gmail.com`).
6. **Vercel → Environment Variables**: `VITE_VAPID_PUBLIC_KEY` = la clave pública, y vuelve a desplegar.
7. En la app: **Ajustes → Notificaciones del descanso → Activar** y luego **Enviar prueba** con la pantalla bloqueada.

Si no llega: Supabase → Edge Functions → `send-rest-alarms` → Logs, y en SQL
`select * from cron.job_run_details order by start_time desc limit 5;`.

## Estructura

```
src/lib/progression.ts   Reglas: sube / mantén / baja (baja solo tras 2 sesiones), día flojo
src/lib/cycle.ts         Qué día toca según el orden del ciclo, no el calendario
src/lib/db.ts            IndexedDB + cola de cambios pendientes
src/lib/sync.ts          Subida de la cola y descarga incremental (cursor `synced_at` del servidor)
src/lib/session.ts       Borrador de sesión y cierre con cálculo del siguiente peso
src/lib/timer.ts         Temporizador que sobrevive a que Android cierre la app
src/lib/push.ts          Activar notificaciones y programar/cancelar el aviso del descanso
public/push-sw.js        Recibe la notificación en el service worker
supabase/functions/      Edge Function que envía los avisos vencidos
src/screens/             Pantallas
supabase/migrations/     Esquema con Row Level Security
```

## Sincronización

Cada tabla (`days`, `exercises`, `sessions`, `kv`) guarda el registro en `data` (jsonb). Los cambios se escriben primero
en el dispositivo y se encolan; al haber conexión se suben con `upsert` y se descargan las filas cuyo `synced_at`
(hora del servidor) sea posterior al último cursor. Ante un conflicto gana el `updated_at` más reciente, y un cambio
local aún sin subir nunca se pisa. Los borrados son lógicos (`deleted = true`).

## Próximas fases

2. Pesos disponibles en el gym, detector de estancamiento, gráficas y récords.
3. Checklist de alimentación, peso y cintura, fotos de progreso.
4. App Android con Capacitor: cronómetro en vivo en el panel de notificaciones.
