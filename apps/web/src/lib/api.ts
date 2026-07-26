import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
});

// Injecte le token JWT dans chaque requête
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('fgs_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Session expirée / token invalide → retour à l'espace visiteur
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      const hadToken = !!localStorage.getItem('fgs_token');
      localStorage.removeItem('fgs_token');
      // Ne redirige que si une session existait (évite les boucles côté public)
      if (hadToken && location.pathname !== '/') {
        location.href = '/';
      }
    }
    return Promise.reject(error);
  },
);

export const formatFCFA = (n: number) =>
  new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA';
