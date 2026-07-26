import { Role } from '../context/AuthContext';

export interface NavItem {
  label: string;
  path: string;
}

export const navByRole: Record<Role, NavItem[]> = {
  ADMIN: [
    { label: 'Tableau de bord', path: '/' },
    { label: 'Demandes', path: '/demandes' },
    { label: 'Sites', path: '/sites' },
    { label: 'Coopératives', path: '/cooperatives' },
    { label: 'Terrains', path: '/terrains' },
    { label: 'Carte', path: '/carte' },
    { label: 'Paiements', path: '/paiements' },
    { label: 'Rapports', path: '/rapports' },
    { label: 'Vendeur', path: '/vendeur' },
  ],
  GESTIONNAIRE: [
    { label: 'Tableau de bord', path: '/' },
    { label: 'Demandes', path: '/demandes' },
    { label: 'Sites', path: '/sites' },
    { label: 'Coopératives', path: '/cooperatives' },
    { label: 'Terrains', path: '/terrains' },
    { label: 'Carte', path: '/carte' },
    { label: 'Paiements', path: '/paiements' },
  ],
  COMPTABLE: [
    { label: 'Tableau de bord', path: '/' },
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
