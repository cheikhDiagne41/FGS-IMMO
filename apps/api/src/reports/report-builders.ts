import PDFDocument from 'pdfkit';
import * as ExcelJS from 'exceljs';

export interface ReportColumn {
  key: string;
  label: string;
  align?: 'left' | 'right';
  format?: 'money' | 'date' | 'text';
  width?: number; // largeur relative (PDF) / caractères (Excel)
}

export interface ReportData {
  titre: string;
  sousTitre?: string;
  colonnes: ReportColumn[];
  lignes: Record<string, any>[];
  resume?: { label: string; value: string }[];
}

const fmtMoney = (v: any) =>
  new Intl.NumberFormat('fr-FR').format(Math.round(Number(v) || 0)).replace(/\s/g, ' ') + ' FCFA';
const fmtDate = (v: any) =>
  v ? new Date(v).toLocaleDateString('fr-FR') : '—';

const formatCell = (col: ReportColumn, value: any): string => {
  if (value === null || value === undefined) return '—';
  if (col.format === 'money') return fmtMoney(value);
  if (col.format === 'date') return fmtDate(value);
  return String(value);
};

/** Génère un PDF paysage avec en-tête FGS_IMMO et tableau générique */
export async function buildPdf(data: ReportData): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 40 });
  const chunks: Buffer[] = [];
  doc.on('data', (c) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) =>
    doc.on('end', () => resolve(Buffer.concat(chunks))),
  );

  const brand = '#1e4d8c';
  const gold = '#e98b32';
  const W = doc.page.width;
  const marginX = 40;
  const tableW = W - marginX * 2;

  // En-tête
  doc.rect(0, 0, W, 70).fill(brand);
  doc.fillColor('white').fontSize(20).font('Helvetica-Bold').text('FGS_IMMO', marginX, 20);
  doc.fillColor(gold).fontSize(15).font('Helvetica-Bold').text(data.titre, marginX, 20, {
    align: 'right',
    width: tableW,
  });
  doc
    .fillColor('#d7e6f6')
    .fontSize(9)
    .font('Helvetica')
    .text(
      data.sousTitre ?? `Généré le ${new Date().toLocaleDateString('fr-FR')}`,
      marginX,
      44,
      { align: 'right', width: tableW },
    );

  let y = 90;

  // Résumé (cartes)
  if (data.resume?.length) {
    const cardW = tableW / data.resume.length;
    data.resume.forEach((r, i) => {
      const x = marginX + i * cardW;
      doc.roundedRect(x + 4, y, cardW - 8, 42, 4).fill('#f1f5f9');
      doc.fillColor('#64748b').fontSize(8).font('Helvetica-Bold').text(r.label.toUpperCase(), x + 12, y + 8);
      doc.fillColor(brand).fontSize(13).font('Helvetica-Bold').text(r.value, x + 12, y + 22);
    });
    y += 58;
  }

  // En-tête du tableau
  const totalWidthUnits = data.colonnes.reduce((s, c) => s + (c.width ?? 1), 0);
  const colX: number[] = [];
  let acc = marginX;
  for (const c of data.colonnes) {
    colX.push(acc);
    acc += ((c.width ?? 1) / totalWidthUnits) * tableW;
  }
  const colW = (i: number) =>
    ((data.colonnes[i].width ?? 1) / totalWidthUnits) * tableW;

  const drawHeader = () => {
    doc.rect(marginX, y, tableW, 22).fill(brand);
    doc.fillColor('white').fontSize(8.5).font('Helvetica-Bold');
    data.colonnes.forEach((c, i) => {
      doc.text(c.label, colX[i] + 4, y + 7, {
        width: colW(i) - 8,
        align: c.align ?? 'left',
      });
    });
    y += 22;
  };
  drawHeader();

  // Lignes
  doc.fontSize(8).font('Helvetica');
  data.lignes.forEach((row, idx) => {
    if (y > doc.page.height - 50) {
      doc.addPage({ size: 'A4', layout: 'landscape', margin: 40 });
      y = 50;
      drawHeader();
      doc.fontSize(8).font('Helvetica');
    }
    if (idx % 2 === 0) {
      doc.rect(marginX, y, tableW, 18).fill('#f8fafc');
    }
    doc.fillColor('#1e293b');
    data.colonnes.forEach((c, i) => {
      doc.text(formatCell(c, row[c.key]), colX[i] + 4, y + 5, {
        width: colW(i) - 8,
        align: c.align ?? 'left',
        lineBreak: false,
        ellipsis: true,
      });
    });
    y += 18;
  });

  if (data.lignes.length === 0) {
    doc.fillColor('#94a3b8').fontSize(10).text('Aucune donnée pour cette période.', marginX, y + 10);
  }

  // Pied
  doc
    .fillColor('#94a3b8')
    .fontSize(7)
    .text(
      `FGS_IMMO — ${data.lignes.length} ligne(s) — document généré automatiquement`,
      marginX,
      doc.page.height - 30,
      { width: tableW, align: 'center' },
    );

  doc.end();
  return done;
}

/** Génère un classeur Excel avec en-tête stylisé et tableau générique */
export async function buildExcel(data: ReportData): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'FGS_IMMO';
  wb.created = new Date();
  const ws = wb.addWorksheet(data.titre.slice(0, 30));

  // Titre
  ws.mergeCells(1, 1, 1, data.colonnes.length);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = `FGS_IMMO — ${data.titre}`;
  titleCell.font = { bold: true, size: 14, color: { argb: 'FF0F9253' } };

  ws.mergeCells(2, 1, 2, data.colonnes.length);
  ws.getCell(2, 1).value =
    data.sousTitre ?? `Généré le ${new Date().toLocaleDateString('fr-FR')}`;
  ws.getCell(2, 1).font = { size: 9, color: { argb: 'FF94A3B8' } };

  // En-tête colonnes (ligne 4)
  const headerRow = ws.getRow(4);
  data.colonnes.forEach((c, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = c.label;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F9253' },
    };
    cell.alignment = { horizontal: c.align ?? 'left' };
    ws.getColumn(i + 1).width = c.width ? c.width * 14 : 20;
  });
  headerRow.commit();

  // Lignes
  data.lignes.forEach((row, r) => {
    const excelRow = ws.getRow(5 + r);
    data.colonnes.forEach((c, i) => {
      const cell = excelRow.getCell(i + 1);
      const raw = row[c.key];
      if (c.format === 'money') {
        cell.value = Number(raw) || 0;
        cell.numFmt = '#,##0 "FCFA"';
        cell.alignment = { horizontal: 'right' };
      } else if (c.format === 'date') {
        cell.value = raw ? new Date(raw) : null;
        cell.numFmt = 'dd/mm/yyyy';
      } else {
        cell.value = raw ?? '';
        cell.alignment = { horizontal: c.align ?? 'left' };
      }
    });
    if (r % 2 === 0) {
      excelRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8FAFC' },
        };
      });
    }
  });

  // Résumé sous le tableau
  if (data.resume?.length) {
    const startRow = 6 + data.lignes.length;
    data.resume.forEach((r, i) => {
      const labelCell = ws.getCell(startRow + i, 1);
      labelCell.value = r.label;
      labelCell.font = { bold: true };
      ws.getCell(startRow + i, 2).value = r.value;
    });
  }

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
