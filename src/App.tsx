import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './lib/auth';
import { supabase } from './lib/supabase';
import { useDays } from './lib/hooks';
import Login from './screens/Login';
import Home from './screens/Home';
import History from './screens/History';
import SessionScreen from './screens/Session';
import Summary from './screens/Summary';
import ExerciseHistory from './screens/ExerciseHistory';
import Settings from './screens/Settings';
import Routine from './screens/Routine';
import RoutineDay from './screens/RoutineDay';
import Welcome from './screens/Welcome';

function Loading({ text }: { text: string }) {
  return (
    <div className="wrap">
      <div className="empty">
        <h2>IronMind</h2>
        <p>{text}</p>
      </div>
    </div>
  );
}

export default function App() {
  const { ready, user } = useAuth();
  const days = useDays();

  if (!ready) return <Loading text="Abriendo tu cuenta…" />;
  if (supabase && !user) return <Login />;
  if (days === undefined) return <Loading text="Cargando tu rutina…" />;
  if (!days.length) return <Welcome />;

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/historial" element={<History />} />
      <Route path="/sesion/:dia" element={<SessionScreen />} />
      <Route path="/resumen/:id" element={<Summary />} />
      <Route path="/ejercicio/:id" element={<ExerciseHistory />} />
      <Route path="/ajustes" element={<Settings />} />
      <Route path="/rutina" element={<Routine />} />
      <Route path="/rutina/:dia" element={<RoutineDay />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
