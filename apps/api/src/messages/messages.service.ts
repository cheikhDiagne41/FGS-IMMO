import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MessageEmetteur } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { VendeurService } from '../vendeur/vendeur.service';
import { ParametresService } from '../parametres/parametres.service';

interface Requester {
  userId: string;
  role: string;
}

@Injectable()
export class MessagesService {
  constructor(
    private prisma: PrismaService,
    private vendeur: VendeurService,
    private parametres: ParametresService,
  ) {}

  private async resolveVendeurId(terrainId?: string): Promise<string> {
    if (terrainId) {
      const t = await this.prisma.terrain.findUnique({
        where: { id: terrainId },
        select: { vendeurId: true },
      });
      if (t?.vendeurId) return t.vendeurId;
    }
    const principal = await this.vendeur.get();
    return principal.id;
  }

  /** Un visiteur / client envoie un message depuis une annonce */
  async envoyer(dto: {
    terrainId?: string;
    nom: string;
    telephone?: string;
    email?: string;
    contenu: string;
    clientId?: string | null;
  }) {
    if (!(await this.parametres.actif('messagerie_active', true))) {
      throw new ForbiddenException(
        "La messagerie est désactivée. Contactez l'agence par téléphone.",
      );
    }
    const vendeurId = await this.resolveVendeurId(dto.terrainId);
    const conv = await this.prisma.conversation.create({
      data: {
        vendeurId,
        terrainId: dto.terrainId,
        prospectNom: dto.nom,
        prospectTelephone: dto.telephone,
        prospectEmail: dto.email,
        clientId: dto.clientId ?? undefined,
        messages: { create: { emetteur: MessageEmetteur.PROSPECT, contenu: dto.contenu } },
      },
      include: { vendeur: { select: { userId: true } } },
    });

    // Notifie le vendeur (si compte) + les admins/gestionnaires
    const targets: string[] = [];
    if (conv.vendeur.userId) targets.push(conv.vendeur.userId);
    const admins = await this.prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'GESTIONNAIRE'] } },
      select: { id: true },
    });
    targets.push(...admins.map((a) => a.id));
    if (targets.length) {
      await this.prisma.notification.createMany({
        data: targets.map((uid) => ({
          userId: uid,
          type: 'SYSTEME' as const,
          canal: 'APP' as const,
          titre: 'Nouveau message',
          message: `${dto.nom} : ${dto.contenu.slice(0, 90)}`,
        })),
      });
    }
    return { ok: true, conversationId: conv.id };
  }

  /** Conversations visibles : le vendeur voit les siennes, l'admin voit tout */
  conversations(user: Requester) {
    const where =
      user.role === 'VENDEUR' ? { vendeur: { userId: user.userId } } : {};
    return this.prisma.conversation.findMany({
      where,
      include: {
        vendeur: { select: { id: true, nom: true, suspendu: true } },
        terrain: { select: { id: true, numeroParcelle: true, titre: true } },
        messages: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async conversation(id: string, user: Requester) {
    const conv = await this.prisma.conversation.findUnique({
      where: { id },
      include: {
        vendeur: { select: { id: true, nom: true, suspendu: true, userId: true } },
        terrain: { select: { id: true, numeroParcelle: true, titre: true } },
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!conv) throw new NotFoundException('Conversation introuvable.');
    if (user.role === 'VENDEUR' && conv.vendeur.userId !== user.userId) {
      throw new ForbiddenException();
    }
    return conv;
  }

  /** Réponse : par le vendeur (si non suspendu) ou par l'admin */
  async repondre(id: string, contenu: string, user: Requester) {
    const conv = await this.prisma.conversation.findUnique({
      where: { id },
      include: { vendeur: true, client: true },
    });
    if (!conv) throw new NotFoundException('Conversation introuvable.');

    let emetteur: MessageEmetteur;
    if (user.role === 'VENDEUR') {
      if (conv.vendeur.userId !== user.userId) throw new ForbiddenException();
      if (conv.vendeur.suspendu) {
        throw new ForbiddenException(
          "Votre compte est suspendu : l'administration gère vos échanges.",
        );
      }
      emetteur = MessageEmetteur.VENDEUR;
    } else if (user.role === 'ADMIN' || user.role === 'GESTIONNAIRE') {
      emetteur = MessageEmetteur.ADMIN;
    } else {
      throw new ForbiddenException();
    }

    const message = await this.prisma.message.create({
      data: { conversationId: id, emetteur, contenu },
    });
    await this.prisma.conversation.update({
      where: { id },
      data: { updatedAt: new Date() },
    });
    // Notifie le prospect s'il a un compte client
    if (conv.client) {
      await this.prisma.notification.create({
        data: {
          userId: conv.client.userId,
          type: 'SYSTEME',
          canal: 'APP',
          titre: 'Réponse à votre message',
          message: contenu.slice(0, 90),
        },
      });
    }
    return message;
  }
}
