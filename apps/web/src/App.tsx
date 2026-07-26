import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Inscription from './pages/Inscription';
// App (connecté)
import AppLayout from './components/AppLayout';
import AdminDashboard from './pages/AdminDashboard';
import ClientDashboard from './pages/ClientDashboard';
import Sites from './pages/Sites';
import Cooperatives from './pages/Cooperatives';
import Demandes from './pages/Demandes';
import Dossiers from './pages/Dossiers';
import Terrains from './pages/Terrains';
import TerrainDetail from './pages/TerrainDetail';
import Paiements from './pages/Paiements';
import MesFactures from './pages/MesFactures';
import Rapports from './pages/Rapports';
import VendeurPage from './pages/Vendeur';
// Public (visiteur)
import PublicLayout from './components/PublicLayout';
import PublicHome from './pages/public/PublicHome';
import PublicTerrains from './pages/public/PublicTerrains';
import PublicTerrainDetail from './pages/public/PublicTerrainDetail';
import PublicSites from './pages/public/PublicSites';
import PublicCooperatives from './pages/public/PublicCooperatives';
import SiteDetail from './pages/public/SiteDetail';
import Carte from './pages/public/Carte';

export default function App() {
  const { user, loading } = useAuth();

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-400">
        Chargement…
      </div>
    );

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/inscription" element={user ? <Navigate to="/" replace /> : <Inscription />} />

      {user ? (
        // ---- Espace connecté ----
        <Route path="/" element={<AppLayout />}>
          <Route index element={user.role === 'CLIENT' ? <ClientDashboard /> : <AdminDashboard />} />
          <Route path="sites" element={<Sites />} />
          <Route path="sites/:id" element={<SiteDetail />} />
          <Route path="cooperatives" element={<Cooperatives />} />
          <Route path="demandes" element={<Demandes />} />
          <Route path="dossiers" element={<Dossiers />} />
          <Route path="terrains" element={<Terrains />} />
          <Route path="terrains/:id" element={<TerrainDetail />} />
          <Route path="carte" element={<Carte />} />
          <Route path="paiements" element={<Paiements />} />
          <Route path="factures" element={<MesFactures />} />
          <Route path="rapports" element={<Rapports />} />
          <Route path="vendeur" element={<VendeurPage />} />
        </Route>
      ) : (
        // ---- Espace visiteur (public) ----
        <Route path="/" element={<PublicLayout />}>
          <Route index element={<PublicHome />} />
          <Route path="terrains" element={<PublicTerrains />} />
          <Route path="terrains/:id" element={<PublicTerrainDetail />} />
          <Route path="sites" element={<PublicSites />} />
          <Route path="sites/:id" element={<SiteDetail />} />
          <Route path="cooperatives" element={<PublicCooperatives />} />
          <Route path="carte" element={<Carte />} />
        </Route>
      )}

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
