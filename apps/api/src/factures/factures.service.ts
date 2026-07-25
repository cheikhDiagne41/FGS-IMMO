import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as crypto from 'crypto';
import * as QRCode from 'qrcode';
import PDFDocument from 'pdfkit';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FacturesService {
  constructor(private prisma: PrismaService) {}

  private async genererNumero(tx: Prisma.TransactionClient): Promise<string> {
    const annee = new Date().getFullYear();
    const count = await tx.facture.count();
    return `FAC-${annee}-${String(count + 1).padStart(4, '0')}`;
  }

  /**
   * Crée la facture liée à un paiement (appelée dans la transaction de paiement).
   * Génère le numéro, la donnée du QR code et la signature électronique (SHA-256).
   */
  async createForPaiement(
    tx: Prisma.TransactionClient,
    params: { paiementId: string; montant: number; soldeRestant: number },
  ) {
    const numero = await this.genererNumero(tx);
    const dateEmission = new Date();

    // Signature électronique : empreinte SHA-256 du contenu canonique
    const signatureBase = `${numero}|${params.paiementId}|${params.montant}|${dateEmission.toISOString()}|FGS_IMMO`;
    const signatureHash = crypto
      .createHash('sha256')
      .update(signatureBase + (process.env.JWT_SECRET ?? 'fgs'))
      .digest('hex');

    // Donnée encodée dans le QR code (vérification d'authenticité)
    const qrCodeData = `FGS_IMMO|${numero}|${params.montant}|${dateEmission.toISOString().slice(0, 10)}|${signatureHash.slice(0, 16)}`;

    return tx.facture.create({
      data: {
        numero,
        paiementId: params.paiementId,
        dateEmission,
        montant: params.montant,
        soldeRestant: params.soldeRestant,
        qrCodeData,
        signatureHash,
        statut: 'EMISE',
      },
    });
  }

  findAll() {
    return this.prisma.facture.findMany({
      include: {
        paiement: {
          include: {
            adhesion: {
              include: {
                client: { select: { nom: true, prenom: true } },
                cooperative: { select: { nom: true } },
              },
            },
          },
        },
      },
      orderBy: { dateEmission: 'desc' },
    });
  }

  findByClient(clientId: string) {
    return this.prisma.facture.findMany({
      where: { paiement: { adhesion: { clientId } } },
      include: {
        paiement: {
          include: { adhesion: { include: { cooperative: true } } },
        },
      },
      orderBy: { dateEmission: 'desc' },
    });
  }

  async getFullFacture(id: string, requester?: { clientId?: string | null; role: string }) {
    const facture = await this.prisma.facture.findUnique({
      where: { id },
      include: {
        paiement: {
          include: {
            adhesion: {
              include: {
                client: true,
                cooperative: { include: { site: true } },
              },
            },
          },
        },
      },
    });
    if (!facture) throw new NotFoundException('Facture introuvable.');
    if (
      requester?.role === 'CLIENT' &&
      facture.paiement.adhesion.clientId !== requester.clientId
    ) {
      throw new NotFoundException('Facture introuvable.');
    }
    return facture;
  }

  /** Génère le PDF de la facture (avec logo, QR code, signature) */
  async generatePdf(
    id: string,
    requester?: { clientId?: string | null; role: string },
  ): Promise<Buffer> {
    const f = await this.getFullFacture(id, requester);
    const client = f.paiement.adhesion.client;
    const coop = f.paiement.adhesion.cooperative;
    const fmt = (n: number | Prisma.Decimal) =>
      new Intl.NumberFormat('fr-FR').format(Math.round(Number(n))) + ' FCFA';

    const qrBuffer = await QRCode.toBuffer(f.qrCodeData ?? f.numero, {
      width: 120,
      margin: 1,
    });

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c));

    const done = new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });

    const brand = '#0f9253';
    const gold = '#e6a817';

    // En-tête
    doc.rect(0, 0, doc.page.width, 90).fill(brand);
    doc.fillColor('white').fontSize(26).font('Helvetica-Bold').text('FGS_IMMO', 50, 30);
    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#d6f9e1')
      .text('Plateforme immobilière · Vente de terrains & coopératives', 50, 62);

    doc.fillColor(gold).fontSize(20).font('Helvetica-Bold').text('FACTURE', 400, 32, {
      align: 'right',
      width: doc.page.width - 450,
    });

    // Infos facture
    let y = 120;
    doc.fillColor('#111').fontSize(11).font('Helvetica');
    doc.text(`Numéro : ${f.numero}`, 50, y);
    doc.text(
      `Date : ${new Date(f.dateEmission).toLocaleDateString('fr-FR')}`,
      50,
      y + 16,
    );
    doc.text(`Statut : ${f.statut}`, 50, y + 32);

    // Bloc client
    y = 190;
    doc.roundedRect(50, y, doc.page.width - 100, 90, 6).fill('#f1f5f9');
    doc.fillColor('#64748b').fontSize(9).font('Helvetica-Bold').text('CLIENT', 65, y + 12);
    doc
      .fillColor('#111')
      .fontSize(12)
      .font('Helvetica-Bold')
      .text(`${client.prenom} ${client.nom}`, 65, y + 26);
    doc.fontSize(10).font('Helvetica').fillColor('#334155');
    doc.text(`Tél : ${client.telephone}`, 65, y + 44);
    doc.text(`Coopérative : ${coop.nom}`, 65, y + 58);
    doc.text(`Site : ${coop.site.nom}`, 300, y + 58);

    // Tableau paiement
    y = 310;
    doc.rect(50, y, doc.page.width - 100, 26).fill(brand);
    doc.fillColor('white').fontSize(10).font('Helvetica-Bold');
    doc.text('Désignation', 65, y + 8);
    doc.text('Mode', 300, y + 8);
    doc.text('Montant', 430, y + 8, { width: 100, align: 'right' });

    y += 26;
    doc.fillColor('#111').font('Helvetica').fontSize(10);
    doc.rect(50, y, doc.page.width - 100, 26).fill('#ffffff').stroke('#e2e8f0');
    doc.fillColor('#111');
    doc.text('Paiement coopérative', 65, y + 8);
    doc.text(
      f.paiement.methode.replace('_', ' '),
      300,
      y + 8,
    );
    doc.text(fmt(f.montant), 430, y + 8, { width: 100, align: 'right' });

    if (f.paiement.refTransaction) {
      y += 26;
      doc.fillColor('#64748b').fontSize(9);
      doc.text(`Réf. transaction : ${f.paiement.refTransaction}`, 65, y + 6);
    }

    // Totaux
    y += 44;
    doc.fillColor('#111').fontSize(11).font('Helvetica-Bold');
    doc.text('Montant payé :', 300, y, { width: 120, align: 'right' });
    doc.fillColor(brand).text(fmt(f.montant), 430, y, { width: 100, align: 'right' });
    doc.fillColor('#111').font('Helvetica');
    doc.text('Solde restant :', 300, y + 18, { width: 120, align: 'right' });
    doc.fillColor('#b45309').text(fmt(f.soldeRestant), 430, y + 18, {
      width: 100,
      align: 'right',
    });

    // QR code + signature
    y += 70;
    doc.image(qrBuffer, 50, y, { width: 100 });
    doc.fillColor('#64748b').fontSize(8).font('Helvetica');
    doc.text('Scannez pour vérifier', 50, y + 104, { width: 100, align: 'center' });

    doc.fillColor('#111').fontSize(9).font('Helvetica-Bold').text('Signature électronique', 300, y);
    doc
      .fillColor('#64748b')
      .fontSize(7)
      .font('Courier')
      .text(f.signatureHash ?? '', 300, y + 14, { width: 240 });
    doc.fillColor('#0f9253').fontSize(9).font('Helvetica-Oblique').text(
      '✓ Document authentifié FGS_IMMO',
      300,
      y + 50,
    );

    // Pied de page
    doc
      .fillColor('#94a3b8')
      .fontSize(8)
      .font('Helvetica')
      .text(
        'FGS_IMMO — Facture générée automatiquement. Ce document ne nécessite pas de signature manuscrite.',
        50,
        doc.page.height - 60,
        { align: 'center', width: doc.page.width - 100 },
      );

    doc.end();
    return done;
  }
}
