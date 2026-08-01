import { Component, ErrorInfo, ReactNode } from 'react';

/**
 * Filet de sécurité : sans lui, la moindre erreur dans un écran efface
 * toute l'application et laisse une page blanche, sans aucune indication.
 * Ici, l'erreur est contenue : le menu reste utilisable et un message
 * explicite s'affiche à la place du seul écran fautif.
 */
interface Props {
  children: ReactNode;
  /** Réinitialise l'erreur quand cette valeur change (ex : la page affichée) */
  resetKey?: string;
}
interface State {
  erreur: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { erreur: null };

  static getDerivedStateFromError(erreur: Error): State {
    return { erreur };
  }

  componentDidUpdate(prev: Props) {
    // En changeant de page, on laisse une nouvelle chance à l'affichage
    if (prev.resetKey !== this.props.resetKey && this.state.erreur) {
      this.setState({ erreur: null });
    }
  }

  componentDidCatch(erreur: Error, info: ErrorInfo) {
    console.error('Erreur d’affichage :', erreur, info.componentStack);
  }

  render() {
    if (!this.state.erreur) return this.props.children;

    return (
      <div className="mx-auto max-w-xl py-10">
        <div className="card text-center">
          <div className="text-4xl">⚠️</div>
          <h2 className="mt-3 text-xl font-bold text-slate-800">
            Cette page n'a pas pu s'afficher
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Une erreur est survenue de notre côté. Le reste du site reste
            accessible : utilisez le menu, ou réessayez.
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <button
              onClick={() => this.setState({ erreur: null })}
              className="btn-primary"
            >
              Réessayer
            </button>
            <a href="/" className="btn-ghost">Retour à l'accueil</a>
          </div>
          <details className="mt-5 text-left">
            <summary className="cursor-pointer text-xs text-slate-400">
              Détail technique
            </summary>
            <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-50 p-3 text-[11px] text-slate-600">
              {this.state.erreur.message}
            </pre>
          </details>
        </div>
      </div>
    );
  }
}
