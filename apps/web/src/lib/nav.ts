import { Role } from '../context/AuthContext';

export interface NavItem {
  label: string;
  path: string;
}

export const navByRole: Record<Role, NavItem[]> = {
  ADMIN: [
    { label: 'Tableau de bord', path: '/' },
    { label: 'Demandes', path: '/demandes' },
    { label: 'Dossiers', path: '/dossiers' },
    { label: 'Sites', path: '/sites' },
    { label: 'Coopératives', path: '/cooperatives' },
    { label: 'Terrains', path: '/terrains' },
    { label: 'Carte', path: '/carte' },
    { label: 'Paiements', path: '/paiements' },
    { label: 'Rapports', path: '/rapports' },
    { label: 'Messagerie', path: '/messagerie' },
    { label: 'Vendeur', path: '/vendeur' },
    { label: 'Trophées', path: '/trophees' },
  ],
  GESTIONNAIRE: [
    { label: 'Tableau de bord', path: '/' },
    { label: 'Demandes', path: '/demandes' },
    { label: 'Dossiers', path: '/dossiers' },
    { label: 'Sites', path: '/sites' },
    { label: 'Coopératives', path: '/cooperatives' },
    { label: 'Terrains', path: '/terrains' },
    { label: 'Carte', path: '/carte' },
    { label: 'Paiements', path: '/paiements' },
    { label: 'Messagerie', path: '/messagerie' },
    { label: 'Trophées', path: '/trophees' },
  ],
  VENDEUR: [
    { label: 'Messagerie', path: '/' },
  ],
  COMPTABLE: [
    { label: 'Tableau de bord', path: '/' },
    { label: 'Dossiers', path: '/dossiers' },
    { label: 'Paiements', path: '/paiements' },
    { label: 'Rapports', path: '/rapports' },
    { label: 'Coopératives', path: '/cooperatives' },
    { label: 'Terrains', path: '/terrains' },
    { label: 'Carte', path: '/carte' },
  ],
  CLIENT: [
    { label: 'Mon espace', path: '/' },
    { label: 'Sites', path: '/sites' },
    { label: 'Coopératives', path: '/cooperatives' },
    { label: 'Terrains', path: '/terrains' },
    { label: 'Carte', path: '/carte' },
    { label: 'Mes factures', path: '/factures' },
  ],
};
