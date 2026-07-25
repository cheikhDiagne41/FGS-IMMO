import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import ClientDashboard from './pages/ClientDashboard';
import Sites from './pages/Sites';
import Cooperatives from './pages/Cooperatives';
import Terrains from './pages/Terrains';
import Paiements from './pages/Paiements';
import MesFactures from './pages/MesFactures';
import AppLayout from './components/AppLayout';

function Protected({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-400">
        Chargement…
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <Protected>
            <AppLayout />
          </Protected>
        }
      >
        <Route
          index
          element={
            user?.role === 'CLIENT' ? <ClientDashboard /> : <AdminDashboard />
          }
        />
        <Route path="sites" element={<Sites />} />
        <Route path="cooperatives" element={<Cooperatives />} />
        <Route path="terrains" element={<Terrains />} />
        <Route path="paiements" element={<Paiements />} />
        <Route path="factures" element={<MesFactures />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
