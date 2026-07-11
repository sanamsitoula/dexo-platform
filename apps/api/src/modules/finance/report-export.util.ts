import type { Response } from 'express';

/**
 * Report export helpers (Excel / PDF / IRD-style XML) for finance reports.
 *
 * Every report is first normalized into an ExportTable — a flat title +
 * columns + rows (+ optional summary key/values) — then rendered by one of
 * the three builders below and streamed with the correct content-type and
 * content-disposition headers.
 */
export type ExportColumn = { key: string; label: string; numeric?: boolean };
export type ExportTable = {
  title: string;
  subtitle?: string;
  columns: ExportColumn[];
  rows: Record<string, any>[];
  /** Summary key/values printed after the table (totals etc.) */
  summary?: Record<string, any>;
};

const cell = (v: any): string | number => {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') return v;
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  // Prisma Decimal & decimal strings → number when clean
  const s = String(v);
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  return s;
};

export async function buildXlsx(table: ExportTable): Promise<Buffer> {
  // Lazy require keeps cold-start light when exports aren't used.
  const ExcelJS = require('exceljs');
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(table.title.slice(0, 31));

  ws.addRow([table.title]).font = { bold: true, size: 14 };
  if (table.subtitle) ws.addRow([table.subtitle]);
  ws.addRow([]);

  const header = ws.addRow(table.columns.map((c) => c.label));
  header.font = { bold: true };
  header.eachCell((c: any) => {
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFEFEF' } };
    c.border = { bottom: { style: 'thin' } };
  });

  for (const row of table.rows) {
    ws.addRow(table.columns.map((c) => cell(row[c.key])));
  }

  if (table.summary) {
    ws.addRow([]);
    for (const [k, v] of Object.entries(table.summary)) {
      const r = ws.addRow([k, cell(v)]);
      r.font = { bold: true };
    }
  }

  table.columns.forEach((c, i) => {
    ws.getColumn(i + 1).width = Math.max(14, c.label.length + 4);
    if (c.numeric) ws.getColumn(i + 1).numFmt = '#,##0.00';
  });

  return Buffer.from(await wb.xlsx.writeBuffer());
}

export function buildPdf(table: ExportTable): Promise<Buffer> {
  const PDFDocument = require('pdfkit');
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 36, size: 'A4', layout: table.columns.length > 6 ? 'landscape' : 'portrait' });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(14).font('Helvetica-Bold').text(table.title);
    if (table.subtitle) doc.fontSize(9).font('Helvetica').fillColor('#555').text(table.subtitle);
    doc.moveDown(0.8).fillColor('#000');

    const pageWidth = doc.page.width - 72;
    const colWidth = pageWidth / table.columns.length;
    const startX = 36;
    let y = doc.y;

    const drawRow = (values: (string | number)[], bold = false) => {
      if (y > doc.page.height - 60) {
        doc.addPage();
        y = 36;
      }
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8);
      values.forEach((v, i) => {
        const numeric = table.columns[i]?.numeric;
        const text = typeof v === 'number' ? v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : String(v);
        doc.text(text, startX + i * colWidth + 2, y, { width: colWidth - 4, align: numeric ? 'right' : 'left', lineBreak: false });
      });
      y += 14;
      doc.moveTo(startX, y - 3).lineTo(startX + pageWidth, y - 3).strokeColor('#dddddd').lineWidth(0.5).stroke();
    };

    drawRow(table.columns.map((c) => c.label), true);
    for (const row of table.rows) drawRow(table.columns.map((c) => cell(row[c.key])));

    if (table.summary) {
      y += 8;
      doc.font('Helvetica-Bold').fontSize(9);
      for (const [k, v] of Object.entries(table.summary)) {
        if (y > doc.page.height - 60) { doc.addPage(); y = 36; }
        const val = cell(v);
        const text = typeof val === 'number' ? val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : String(val);
        doc.text(`${k}: ${text}`, startX, y, { lineBreak: false });
        y += 14;
      }
    }

    doc.fontSize(7).fillColor('#888').text(`Generated ${new Date().toISOString()}`, startX, doc.page.height - 50);
    doc.end();
  });
}

const xmlEscape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

const xmlTag = (k: string) => k.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^(\d)/, '_$1');

/** Hand-built IRD-style XML (element-per-field rows, totals block). */
export function buildXml(table: ExportTable, rootName = 'IrdReport'): Buffer {
  const lines: string[] = ['<?xml version="1.0" encoding="UTF-8"?>'];
  lines.push(`<${rootName} title="${xmlEscape(table.title)}" generatedAt="${new Date().toISOString()}">`);
  lines.push('  <Rows>');
  for (const row of table.rows) {
    lines.push('    <Row>');
    for (const c of table.columns) {
      const v = cell(row[c.key]);
      lines.push(`      <${xmlTag(c.key)}>${xmlEscape(String(v))}</${xmlTag(c.key)}>`);
    }
    lines.push('    </Row>');
  }
  lines.push('  </Rows>');
  if (table.summary) {
    lines.push('  <Totals>');
    for (const [k, v] of Object.entries(table.summary)) {
      lines.push(`    <${xmlTag(k)}>${xmlEscape(String(cell(v)))}</${xmlTag(k)}>`);
    }
    lines.push('  </Totals>');
  }
  lines.push(`</${rootName}>`);
  return Buffer.from(lines.join('\n'), 'utf8');
}

/** Renders + streams the table in the requested format on the response. */
export async function sendExport(res: Response, format: string, table: ExportTable, baseFilename: string): Promise<void> {
  if (format === 'xlsx') {
    const buf = await buildXlsx(table);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${baseFilename}.xlsx"`);
    res.end(buf);
  } else if (format === 'pdf') {
    const buf = await buildPdf(table);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${baseFilename}.pdf"`);
    res.end(buf);
  } else if (format === 'xml') {
    const buf = buildXml(table);
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${baseFilename}.xml"`);
    res.end(buf);
  } else {
    res.status(400).json({ message: `Unsupported format '${format}' — use xlsx | pdf | xml` });
  }
}
