import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';

/**
 * Limite les tentatives de connexion pour empêcher l'essai automatisé
 * de mots de passe. Le comptage se fait par adresse IP : au-delà du
 * plafond, les demandes sont refusées pendant la durée de blocage.
 */
@Injectable()
export class LoginThrottleGuard implements CanActivate {
  private static readonly MAX_ESSAIS = 10;
  private static readonly FENETRE_MS = 5 * 60 * 1000; // 5 minutes
  private static readonly BLOCAGE_MS = 15 * 60 * 1000; // 15 minutes

  private readonly tentatives = new Map<
    string,
    { compte: number; debut: number; blocageJusqua?: number }
  >();

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const ip: string = req.ip ?? req.socket?.remoteAddress ?? 'inconnue';
    const maintenant = Date.now();

    this.purger(maintenant);

    const suivi = this.tentatives.get(ip);

    if (suivi?.blocageJusqua && suivi.blocageJusqua > maintenant) {
      const minutes = Math.ceil((suivi.blocageJusqua - maintenant) / 60000);
      throw new HttpException(
        `Trop de tentatives de connexion. Réessayez dans ${minutes} minute(s).`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (!suivi || maintenant - suivi.debut > LoginThrottleGuard.FENETRE_MS) {
      this.tentatives.set(ip, { compte: 1, debut: maintenant });
      return true;
    }

    suivi.compte += 1;
    if (suivi.compte > LoginThrottleGuard.MAX_ESSAIS) {
      suivi.blocageJusqua = maintenant + LoginThrottleGuard.BLOCAGE_MS;
      throw new HttpException(
        'Trop de tentatives de connexion. Réessayez dans 15 minutes.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }

  /** Évite que la table de suivi ne grossisse indéfiniment. */
  private purger(maintenant: number) {
    for (const [ip, s] of this.tentatives) {
      const expire =
        maintenant - s.debut > LoginThrottleGuard.FENETRE_MS &&
        (!s.blocageJusqua || s.blocageJusqua < maintenant);
      if (expire) this.tentatives.delete(ip);
    }
  }
}
