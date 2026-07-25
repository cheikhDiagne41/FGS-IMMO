import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';

const demoAccounts = [
  { role: 'Administrateur', email: 'admin@fgsimmo.sn' },
  { role: 'Gestionnaire', email: 'gestionnaire@fgsimmo.sn' },
  { role: 'Comptable', email: 'comptable@fgsimmo.sn' },
  { role: 'Client', email: 'client@fgsimmo.sn' },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@fgsimmo.sn');
  const [password, setPassword] = useState('Password123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Connexion impossible.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      {/* Colonne visuelle */}
      <div className="relative hidden flex-col justify-between bg-brand-800 p-10 text-white md:flex">
        <Logo size={40} />
        <div>
          <h1 className="text-4xl font-extrabold leading-tight">
            La plateforme de gestion<br />immobilière & coopératives d'habitat
          </h1>
          <p className="mt-4 max-w-md text-brand-100">
            Vente de terrains, gestion des sites, coopératives, suivi des
            paiements Wave & Orange Money, et facturation automatique.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-4 text-center">
          {[
            ['Sites', 'Gestion complète'],
            ['Coopératives', 'Adhésions & cotisations'],
            ['Factures', 'Génération auto'],
          ].map(([t, s]) => (
            <div key={t} className="rounded-xl bg-white/10 p-3">
              <div className="text-sm font-bold text-gold-400">{t}</div>
              <div className="text-xs text-brand-100">{s}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Colonne formulaire */}
      <div className="flex items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md">
          <div className="mb-8 md:hidden">
            <Logo size={36} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Connexion</h2>
          <p className="mb-6 text-sm text-slate-500">
            Accédez à votre espace FGS_IMMO
          </p>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label">Adresse email</label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Mot de passe</label>
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>

          <div className="mt-6 rounded-xl bg-white p-4 ring-1 ring-slate-100">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Comptes de démonstration (mot de passe : Password123)
            </div>
            <div className="grid grid-cols-2 gap-2">
              {demoAccounts.map((a) => (
                <button
                  key={a.email}
                  onClick={() => {
                    setEmail(a.email);
                    setPassword('Password123');
                  }}
                  className="rounded-lg border border-slate-200 px-2 py-1.5 text-left text-xs hover:border-brand-400 hover:bg-brand-50"
                >
                  <div className="font-semibold text-slate-700">{a.role}</div>
                  <div className="truncate text-slate-400">{a.email}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
