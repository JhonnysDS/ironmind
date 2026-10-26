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

## Estructura

```
src/lib/progression.ts   Reglas: sube / mantén / baja (baja solo tras 2 sesiones), día flojo
src/lib/cycle.ts         Qué día toca según el orden del ciclo, no el calendario
src/lib/db.ts            IndexedDB + cola de cambios pendientes
src/lib/sync.ts          Subida de la cola y descarga incremental (cursor `synced_at` del servidor)
src/lib/session.ts       Borrador de sesión y cierre con cálculo del siguiente peso
src/lib/timer.ts         Temporizador que sobrevive a que Android cierre la app
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
4. App Android con Capacitor: notificación con el cronómetro en vivo y alarma con la app cerrada.
