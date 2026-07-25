import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AdhesionStatus,
  NotificationCanal,
  NotificationType,
  Prisma,
  TerrainStatus,
} from '@prisma/client';
import * as crypto from 'crypto';
import * as QRCode from 'qrcode';
import PDFDocument from 'pdfkit';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AttributionsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Attribution automatique, exécutée DANS la transaction de paiement
   * lorsque l'adhésion vient d'être soldée. Attribue la première parcelle
   * disponible du site de la coopérative. Sans effet si déjà attribuée
   * ou si aucune parcelle n'est disponible.
   */
  async autoAttribuer(tx: Prisma.TransactionClient, adhesionId: string) {
    const adhesion = await tx.adhesion.findUnique({
      where: { id: adhesionId },
      include: {
        cooperative: { select: { siteId: true, nom: true } },
        terrain: true,
        client: { select: { id: true, userId: true } },
      },
    });
    if (!adhesion) return null;
    if (adhesion.terrain) return adhesion.terrain; // déjà attribué
    if (Number(adhesion.soldeRestant) > 0) return null; // pas encore soldé

    const terrain = await tx.terrain.findFirst({
      where: {
        siteId: adhesion.cooperative.siteId,
        statut: TerrainStatus.DISPONIBLE,
      },
      orderBy: { numeroParcelle: 'asc' },
    });

    if (!terrain) {
      // Aucune parcelle disponible : on notifie l'admin via le client (à défaut)
      await tx.notification.create({
        data: {
          userId: adhesion.client.userId,
          type: NotificationType.SYSTEME,
          canal: NotificationCanal.APP,
          titre: 'Attribution en attente',
          message:
            "Votre dossier est soldé. Aucune parcelle n'est disponible actuellement, l'attribution se fera dès qu'une parcelle sera libérée.",
        },
      });
      return null;
    }

    const updated = await tx.terrain.update({
      where: { id: terrain.id },
      data: {
        statut: TerrainStatus.VENDU,
        clientId: adhesion.client.id,
        adhesionId: adhesion.id,
        dateAttribution: new Date(),
      },
    });

    await tx.adhesion.update({
      where: { id: adhesionId },
      data: { statut: AdhesionStatus.ATTRIBUE },
    });

    await tx.notification.create({
      data: {
        userId: adhesion.client.userId,
        type: NotificationType.ATTRIBUTION_TERRAIN,
        canal: NotificationCanal.APP,
        titre: 'Terrain attribué 🎉',
        message: `Félicitations ! La parcelle ${updated.numeroParcelle} vous a été attribuée. Votre certificat d'attribution est disponible.`,
      },
    });

    await tx.activityLog.create({
      data: {
        userId: adhesion.client.userId,
        action: 'TERRAIN_ATTRIBUE',
        entite: 'Terrain',
        entiteId: updated.id,
        details: `Parcelle ${updated.numeroParcelle} → dossier ${adhesion.numeroDossier}`,
      },
    });

    return updated;
  }

  /** Attribution manuelle par un gestionnaire (dossier soldé requis) */
  async attribuerManuel(adhesionId: string, terrainId?: string) {
    const adhesion = await this.prisma.adhesion.findUnique({
      where: { id: adhesionId },
      include: { cooperative: true, terrain: true, client: true },
    });
    if (!adhesion) throw new NotFoundException('Adhésion introuvable.');
    if (adhesion.terrain) {
      throw new BadRequestException('Un terrain est déjà attribué à ce dossier.');
    }
    if (Number(adhesion.soldeRestant) > 0) {
      throw new BadRequestException(
        'Le dossier doit être entièrement soldé avant attribution.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      let terrain;
      if (terrainId) {
        terrain = await tx.terrain.findUnique({ where: { id: terrainId } });
        if (!terrain || terrain.statut !== TerrainStatus.DISPONIBLE) {
          throw new BadRequestException(
            "La parcelle choisie n'est pas disponible.",
          );
        }
        if (terrain.siteId !== adhesion.cooperative.siteId) {
          throw new BadRequestException(
            "La parcelle n'appartient pas au site de la coopérative.",
          );
        }
      }
      // Réutilise la logique auto (avec la parcelle imposée si fournie)
      if (terrain) {
        const updated = await tx.terrain.update({
          where: { id: terrain.id },
          data: {
            statut: TerrainStatus.VENDU,
            clientId: adhesion.client.id,
            adhesionId: adhesion.id,
            dateAttribution: new Date(),
          },
        });
        await tx.adhesion.update({
          where: { id: adhesionId },
          data: { statut: AdhesionStatus.ATTRIBUE },
        });
        await tx.notification.create({
          data: {
            userId: adhesion.client.userId,
            type: NotificationType.ATTRIBUTION_TERRAIN,
            canal: NotificationCanal.APP,
            titre: 'Terrain attribué 🎉',
            message: `La parcelle ${updated.numeroParcelle} vous a été attribuée.`,
          },
        });
        return updated;
      }
      return this.autoAttribuer(tx, adhesionId);
    });
  }

  private signature(base: string) {
    return crypto
      .createHash('sha256')
      .update(base + (process.env.JWT_SECRET ?? 'fgs'))
      .digest('hex');
  }

  /** Génère le certificat d'attribution (PDF) */
  async genererCertificatPdf(
    adhesionId: string,
    requester?: { clientId?: string | null; role: string },
  ): Promise<{ buffer: Buffer; numero: string }> {
    const adhesion = await this.prisma.adhesion.findUnique({
      where: { id: adhesionId },
      include: {
        client: true,
        cooperative: { include: { site: true } },
        terrain: true,
      },
    });
    if (!adhesion) throw new NotFoundException('Adhésion introuvable.');
    if (
      requester?.role === 'CLIENT' &&
      adhesion.clientId !== requester.clientId
    ) {
      throw new NotFoundException('Certificat introuvable.');
    }
    if (!adhesion.terrain) {
      throw new BadRequestException(
        "Aucun terrain n'est encore attribué à ce dossier.",
      );
    }

    const t = adhesion.terrain;
    const c = adhesion.client;
    const site = adhesion.cooperative.site;
    const numero = `CERT-${adhesion.numeroDossier}`;
    const dateAttr = t.dateAttribution ?? new Date();
    const sig = this.signature(`${numero}|${t.id}|${c.id}`);
    const qrData = `FGS_IMMO|CERTIFICAT|${numero}|Parcelle ${t.numeroParcelle}|${sig.slice(0, 16)}`;
    const qrBuffer = await QRCode.toBuffer(qrData, { width: 130, margin: 1 });

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (ch) => chunks.push(ch));
    const done = new Promise<Buffer>((resolve) =>
      doc.on('end', () => resolve(Buffer.concat(chunks))),
    );

    const brand = '#0f9253';
    const gold = '#e6a817';
    const W = doc.page.width;

    // Cadre décoratif
    doc.rect(20, 20, W - 40, doc.page.height - 40).lineWidth(3).stroke(gold);
    doc.rect(28, 28, W - 56, doc.page.height - 56).lineWidth(1).stroke(brand);

    // En-tête
    doc.fillColor(brand).fontSize(30).font('Helvetica-Bold').text('FGS_IMMO', 0, 60, {
      align: 'center',
    });
    doc
      .fillColor('#64748b')
      .fontSize(11)
      .font('Helvetica')
      .text('Plateforme immobilière · Coopératives d\'habitat', { align: 'center' });

    doc.moveDown(1.5);
    doc
      .fillColor(gold)
      .fontSize(24)
      .font('Helvetica-Bold')
      .text("CERTIFICAT D'ATTRIBUTION", { align: 'center' });
    doc
      .fillColor('#94a3b8')
      .fontSize(11)
      .font('Helvetica')
      .text(`N° ${numero}`, { align: 'center' });

    // Corps
    doc.moveDown(2);
    doc.fillColor('#111').fontSize(13).font('Helvetica');
    doc.text(
      `La société FGS_IMMO certifie que la parcelle désignée ci-dessous a été régulièrement attribuée à :`,
      70,
      doc.y,
      { align: 'center', width: W - 140 },
    );

    doc.moveDown(1);
    doc
      .fillColor(brand)
      .fontSize(20)
      .font('Helvetica-Bold')
      .text(`${c.prenom} ${c.nom}`, { align: 'center' });

    // Bloc détails parcelle
    let y = doc.y + 30;
    const boxX = 90;
    const boxW = W - 180;
    doc.roundedRect(boxX, y, boxW, 150, 8).fill('#f1f5f9');
    doc.fillColor('#111').fontSize(12).font('Helvetica');
    const line = (label: string, value: string, i: number) => {
      doc
        .fillColor('#64748b')
        .font('Helvetica-Bold')
        .fontSize(10)
        .text(label, boxX + 20, y + 18 + i * 24);
      doc
        .fillColor('#111')
        .font('Helvetica')
        .fontSize(12)
        .text(value, boxX + 180, y + 16 + i * 24);
    };
    line('Parcelle N°', t.numeroParcelle, 0);
    line('Site', site.nom, 1);
    line('Superficie', `${Number(t.superficie)} m²`, 2);
    line(
      'Localisation GPS',
      t.latitude && t.longitude
        ? `${t.latitude}, ${t.longitude}`
        : site.commune ?? '—',
      3,
    );
    line('Date d\'attribution', new Date(dateAttr).toLocaleDateString('fr-FR'), 4);

    // QR + signature
    y += 180;
    doc.image(qrBuffer, boxX, y, { width: 110 });
    doc
      .fillColor('#64748b')
      .fontSize(8)
      .text('Vérification d\'authenticité', boxX, y + 114, {
        width: 110,
        align: 'center',
      });

    doc
      .fillColor('#111')
      .fontSize(11)
      .font('Helvetica-Bold')
      .text('Signature électronique', boxX + 230, y + 10);
    doc
      .fillColor(brand)
      .fontSize(10)
      .font('Helvetica-Oblique')
      .text('Pour FGS_IMMO', boxX + 230, y + 30);
    doc
      .fillColor('#94a3b8')
      .fontSize(6)
      .font('Courier')
      .text(sig, boxX + 230, y + 50, { width: 200 });

    doc
      .fillColor('#94a3b8')
      .fontSize(8)
      .font('Helvetica')
      .text(
        'Document généré automatiquement par FGS_IMMO — authentifié par signature électronique.',
        50,
        doc.page.height - 70,
        { align: 'center', width: W - 100 },
      );

    doc.end();
    const buffer = await done;
    return { buffer, numero };
  }
}
