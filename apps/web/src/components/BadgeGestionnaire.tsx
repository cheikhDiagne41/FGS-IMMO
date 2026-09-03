import { useAuth } from '../context/AuthContext';

/**
 * Indique qui gère un bien : l'agence, ou le vendeur qui l'a créé.
 * Visible seulement pour l'administration — le vendeur ne voit que ses biens.
 */
export default function BadgeGestionnaire({
  vendeur,
}: {
  vendeur?: { id: string; nom: string } | null;
}) {
  const { user } = useAuth();
  if (user?.role !== 'ADMIN' && user?.role !== 'GESTIONNAIRE') return null;

  return vendeur ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-gold-400/15 px-2 py-0.5 text-[10px] font-bold text-gold-600">
      👤 {vendeur.nom}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
      🏢 Agence
    </span>
  );
}
