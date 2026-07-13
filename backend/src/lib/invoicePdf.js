const PDFDocument = require('pdfkit');

// Paimal invoice PDF. Programmatic (pdfkit) — no headless browser, no network.
// Returns a Promise<Buffer> so the same output can be streamed for download or
// attached to an email.
//
// Note: the standard PDF Helvetica font has no ₹ glyph, so amounts are printed
// as "Rs." to stay legible on every viewer.
const INK = '#201C16';
const MARIGOLD = '#E4881F';
const MARIGOLD_D = '#C2740C';
const MUTED = '#8B8375';
const LINE = '#E5DFD4';
const PAPER = '#FBFAF7';

const money = (n) =>
  'Rs. ' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function fmtDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt)) return '—';
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function generateInvoicePdf({ invoice, customer = {}, tenant = {} }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const items = typeof invoice.line_items === 'string'
      ? (() => { try { return JSON.parse(invoice.line_items); } catch { return []; } })()
      : (invoice.line_items || []);

    const L = doc.page.margins.left;             // 50
    const R = doc.page.width - doc.page.margins.right; // 545
    const W = R - L;

    // ---- Header ----
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(20).text(tenant.name || 'Paimal', L, 52);
    doc.font('Helvetica').fontSize(9).fillColor(MUTED).text('Field service management', L, 76);

    doc.font('Helvetica-Bold').fontSize(26).fillColor(MARIGOLD)
      .text('INVOICE', L, 50, { width: W, align: 'right' });
    doc.font('Helvetica').fontSize(11).fillColor(INK)
      .text(invoice.invoice_number || '', L, 82, { width: W, align: 'right' });

    // rule
    doc.moveTo(L, 104).lineTo(R, 104).strokeColor(MARIGOLD).lineWidth(2).stroke();

    // ---- Bill-to + details ----
    const topY = 124;
    const colW = W / 2 - 10;
    doc.font('Helvetica-Bold').fontSize(9).fillColor(MUTED).text('BILLED TO', L, topY);
    doc.font('Helvetica-Bold').fontSize(12).fillColor(INK).text(customer.name || '—', L, topY + 14, { width: colW });
    const nameH = doc.heightOfString(customer.name || '—', { width: colW });
    const billLines = [
      customer.contact_name,
      customer.address,
      [customer.city, customer.region].filter(Boolean).join(', '),
      customer.contact_phone,
      customer.contact_email,
    ].filter(Boolean);
    doc.font('Helvetica').fontSize(10).fillColor(INK)
      .text(billLines.join('\n'), L, topY + 18 + nameH, { width: colW, lineGap: 2 });
    const billBottom = doc.y;

    // right column details
    const rightX = L + W / 2 + 10;
    const detail = (label, value, dy) => {
      doc.font('Helvetica').fontSize(9).fillColor(MUTED).text(label, rightX, dy, { width: colW, align: 'left' });
      doc.font('Helvetica-Bold').fontSize(10).fillColor(INK).text(value, rightX, dy, { width: colW, align: 'right' });
    };
    detail('Invoice date', fmtDate(invoice.created_at), topY);
    detail('Due date', fmtDate(invoice.due_date), topY + 18);
    detail('Status', String(invoice.status || 'Draft'), topY + 36);

    // ---- Line items table (starts below the taller of the two columns) ----
    let y = Math.max(billBottom, topY + 54) + 26;
    const cols = { desc: L, qty: 330, rate: 400, amt: R };
    doc.font('Helvetica-Bold').fontSize(9).fillColor(MARIGOLD_D);
    doc.text('DESCRIPTION', cols.desc, y);
    doc.text('QTY', cols.qty - 40, y, { width: 40, align: 'right' });
    doc.text('RATE', cols.rate - 60, y, { width: 60, align: 'right' });
    doc.text('AMOUNT', cols.amt - 90, y, { width: 90, align: 'right' });
    y += 15;
    doc.moveTo(L, y).lineTo(R, y).strokeColor(LINE).lineWidth(1).stroke();
    y += 8;

    doc.font('Helvetica').fontSize(10).fillColor(INK);
    if (!items.length) {
      doc.fillColor(MUTED).text('No line items', L, y);
      y += 18;
    }
    items.forEach((it) => {
      const qty = Number(it.qty) || 0;
      const rate = Number(it.rate) || 0;
      const amount = qty * rate;
      const descH = doc.heightOfString(it.description || '—', { width: 260 });
      doc.fillColor(INK).font('Helvetica').fontSize(10);
      doc.text(it.description || '—', cols.desc, y, { width: 260 });
      doc.text(String(qty), cols.qty - 40, y, { width: 40, align: 'right' });
      doc.text(money(rate), cols.rate - 60, y, { width: 60, align: 'right' });
      doc.text(money(amount), cols.amt - 90, y, { width: 90, align: 'right' });
      y += Math.max(descH, 12) + 8;
      if (y > 720) { doc.addPage(); y = 60; }
    });

    doc.moveTo(L, y).lineTo(R, y).strokeColor(LINE).lineWidth(1).stroke();
    y += 12;

    // ---- Totals ----
    const totRow = (label, value, opts = {}) => {
      const lx = R - 240, lw = 130, vx = R - 110, vw = 110;
      doc.font(opts.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(opts.big ? 13 : 10)
        .fillColor(opts.accent ? MARIGOLD_D : (opts.bold ? INK : MUTED));
      doc.text(label, lx, y, { width: lw, align: 'left' });
      doc.fillColor(opts.accent ? MARIGOLD_D : INK)
        .text(value, vx, y, { width: vw, align: 'right' });
      y += opts.big ? 22 : 18;
    };
    totRow('Subtotal', money(invoice.subtotal));
    totRow(`Tax (${Number(invoice.tax_pct) || 0}%)`, money(invoice.tax_amount));
    doc.moveTo(R - 240, y).lineTo(R, y).strokeColor(LINE).lineWidth(1).stroke();
    y += 8;
    totRow('Total', money(invoice.total), { bold: true, big: true, accent: true });

    if (Number(invoice.amount_paid) > 0) {
      totRow('Paid', money(invoice.amount_paid), { bold: true });
    }

    // ---- Notes / payment link ----
    y += 16;
    if (invoice.notes) {
      doc.font('Helvetica-Bold').fontSize(9).fillColor(MUTED).text('NOTES', L, y);
      y += 13;
      doc.font('Helvetica').fontSize(10).fillColor(INK).text(invoice.notes, L, y, { width: W });
      y = doc.y + 12;
    }
    if (invoice.razorpay_payment_link_url) {
      doc.font('Helvetica-Bold').fontSize(10).fillColor(INK).text('Pay online: ', L, y, { continued: true })
        .font('Helvetica').fillColor(MARIGOLD_D).text(invoice.razorpay_payment_link_url, { link: invoice.razorpay_payment_link_url, underline: true });
      y = doc.y + 6;
    }

    // ---- Footer (fixed near the page bottom, single line so it never paginates) ----
    const footY = doc.page.height - 92;
    doc.moveTo(L, footY).lineTo(R, footY).strokeColor(LINE).lineWidth(1).stroke();
    doc.font('Helvetica').fontSize(9).fillColor(MUTED)
      .text('Thank you for your business.', L, footY + 12, { width: W, align: 'left', lineBreak: false });
    doc.text('Generated by Paimal', L, footY + 12, { width: W, align: 'right', lineBreak: false });

    doc.end();
  });
}

module.exports = { generateInvoicePdf };
