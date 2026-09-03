import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { existsSync } from 'fs';
import { basename, join } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { PerimetreVendeurService } from '../common/perimetre-vendeur.service';

const DOC_DIR = 'uploads/documents';

@Injectable()
export class DocumentsService {
  constructor(
    private prisma: PrismaService,
    private perimetre: PerimetreVendeurService,
  ) {}

  /**
   * Retrouve le fichier d'une pièce jointe après vérification des droits.
   * Ces fichiers sont des pièces d'identité : ils ne sont jamais servis
   * en accès libre, seulement à travers cette vérification.
   */
  async fichier(
    id: string,
    demandeur: { userId: string; role: string; clientId?: string | null },
  ) {
    const doc = await this.prisma.document.findUnique({
      where: { id },
      include: { adhesion: { select: { cooperative: { select: { vendeurId: true } } } } },
    });
    if (!doc) throw new NotFoundException('Document introuvable.');

    // Un client ne consulte que ses propres pièces
    if (demandeur.role === 'CLIENT' && doc.clientId !== demandeur.clientId) {
      throw new ForbiddenException('Accès refusé à ce document.');
    }
    // Un vendeur ne consulte que les pièces des adhérents de ses coopératives
    if (demandeur.role === 'VENDEUR') {
      await this.perimetre.verifierAcces(
        demandeur,
        doc.adhesion?.cooperative.vendeurId ?? null,
        'les dossiers des coopératives',
      );
    }

    // basename : le nom stocké ne peut pas faire sortir du dossier
    const chemin = join(process.cwd(), DOC_DIR, basename(doc.url));
    if (!existsSync(chemin)) {
      throw new NotFoundException('Fichier introuvable sur le serveur.');
    }
    return { chemin, nom: doc.nom };
  }
}
