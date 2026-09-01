import { FormEvent, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';

interface Coop { id: string; nom: string; numero: string }

export default function Inscription() {
  const { refresh } = useAuth();
  const navigate = useNavigate();

  // Coopérative choisie depuis la page publique (bouton « Rejoindre »)
  const [params] = useSearchParams();
  const coopId = params.get('cooperative');
  const { data: coop } = useQuery<Coop | undefined>({
    queryKey: ['public-cooperative', coopId],
    enabled: !!coopId,
    queryFn: async () => {
      const liste: Coop[] = (await api.get('/public/cooperatives')).data;
      return liste.find((c) => c.id === coopId);
    },
  });
  const [f, setF] = useState({
    prenom: '', nom: '', email: '', telephone: '',
    password: '', confirm: '', adresse: '', profession: '',
  });
  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (f.password !== f.confirm) { setError('Les mots de passe ne correspondent pas.'); return; }
    setLoading(true);
    try {
      const res = await api.post('/auth/register', {
        prenom: f.prenom, nom: f.nom, email: f.email, telephone: f.telephone,
        password: f.password, adresse: f.adresse || undefined, profession: f.profession || undefined,
      });
      localStorage.setItem('fgs_token', res.data.accessToken);
      await refresh();
      // Venu du bouton « Rejoindre » : on l'amène directement aux coopératives
      navigate(coopId ? '/cooperatives' : '/');
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Inscription impossible.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-lg">
        <div className="mb-6 flex justify-center"><Logo size={40} /></div>
        <div className="card">
          <h2 className="text-2xl font-bold text-slate-800">Créer un compte client</h2>
          <p className="mb-5 text-sm text-slate-500">
            Inscrivez-vous pour réserver un terrain ou rejoindre une coopérative.
          </p>

          {coop && (
            <div className="mb-5 rounded-xl bg-brand-50 p-4">
              <div className="text-xs font-bold uppercase tracking-wide text-brand-600">
                Adhésion demandée
              </div>
              <div className="mt-1 font-bold text-slate-800">{coop.nom}</div>
              <p className="mt-1 text-xs text-slate-500">
                Créez votre compte pour finaliser votre demande d'adhésion.
              </p>
            </div>
          )}

          {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>}

          <form onSubmit={submit} className="grid grid-cols-2 gap-3">
            <div><label className="label">Prénom *</label><input className="input" value={f.prenom} onChange={(e) => set('prenom', e.target.value)} required /></div>
            <div><label className="label">Nom *</label><input className="input" value={f.nom} onChange={(e) => set('nom', e.target.value)} required /></div>
            <div className="col-span-2"><label className="label">Email *</label><input type="email" className="input" value={f.email} onChange={(e) => set('email', e.target.value)} required /></div>
            <div><label className="label">Téléphone *</label><input className="input" value={f.telephone} onChange={(e) => set('telephone', e.target.value)} placeholder="+221 …" required /></div>
            <div><label className="label">Profession</label><input className="input" value={f.profession} onChange={(e) => set('profession', e.target.value)} /></div>
            <div className="col-span-2"><label className="label">Adresse</label><input className="input" value={f.adresse} onChange={(e) => set('adresse', e.target.value)} /></div>
            <div><label className="label">Mot de passe *</label><input type="password" className="input" value={f.password} onChange={(e) => set('password', e.target.value)} required /></div>
            <div><label className="label">Confirmer *</label><input type="password" className="input" value={f.confirm} onChange={(e) => set('confirm', e.target.value)} required /></div>
            <div className="col-span-2 mt-2">
              <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading ? 'Création…' : 'Créer mon compte'}
              </button>
            </div>
          </form>

          <div className="mt-4 text-center text-sm text-slate-500">
            Déjà inscrit ? <Link to="/login" className="font-semibold text-brand-600">Se connecter</Link>
          </div>
          <div className="mt-1 text-center text-xs text-slate-400">
            Le mot de passe doit contenir 8+ caractères, une majuscule, une minuscule et un chiffre.
          </div>
        </div>
      </div>
    </div>
  );
}
