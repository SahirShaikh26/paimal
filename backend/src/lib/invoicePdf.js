const PDFDocument = require('pdfkit');

// Paimal invoice PDF — bold, professional layout. Programmatic (pdfkit): no
// headless browser, no network. Returns a Promise<Buffer> so the same output
// streams for download or attaches to an email.
//
// Note: the built-in Helvetica font has no ₹ glyph, so amounts print as "Rs."
// to stay legible on every viewer.
const INK = '#201C16';
const INK2 = '#4A443B';
const MARIGOLD = '#E4881F';
const MARIGOLD_D = '#C2740C';
const MUTED = '#8B8375';
const FAINT = '#B8AE9E';
const LINE = '#E5DFD4';
const ZEBRA = '#FBF6EE';

const STATUS = {
  Draft: { bg: '#F1ECE3', fg: '#8B8375' },
  Sent: { bg: '#FBEFD9', fg: '#C2740C' },
  Paid: { bg: '#DCF0E6', fg: '#3F8F5B' },
  Overdue: { bg: '#F7E1DC', fg: '#C0492F' },
  Cancelled: { bg: '#F1ECE3', fg: '#8B8375' },
};

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
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const items = typeof invoice.line_items === 'string'
      ? (() => { try { return JSON.parse(invoice.line_items); } catch { return []; } })()
      : (invoice.line_items || []);

    const PW = doc.page.width;
    const L = 40;
    const R = PW - 40;
    const W = R - L;

    // ===== Header band (full-bleed ink + marigold rule) =====
    doc.rect(0, 0, PW, 104).fill(INK);
    doc.rect(0, 104, PW, 4).fill(MARIGOLD);
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(24)
      .text(tenant.name || 'Paimal', L, 33, { width: W * 0.62, lineBreak: false });
    doc.fillColor(FAINT).font('Helvetica').fontSize(9.5)
      .text('TAX INVOICE', L, 70, { characterSpacing: 2 });
    doc.fillColor(MARIGOLD).font('Helvetica-Bold').fontSize(27)
      .text('INVOICE', L, 31, { width: W, align: 'right' });
    doc.fillColor('#E8E2D8').font('Helvetica').fontSize(12)
      .text(invoice.invoice_number || '', L, 68, { width: W, align: 'right' });

    // ===== Bill-to (left) + meta (right) =====
    const y0 = 134;
    doc.fillColor(MARIGOLD_D).font('Helvetica-Bold').fontSize(9).text('BILLED TO', L, y0, { characterSpacing: 1 });
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(13).text(customer.name || '—', L, y0 + 15, { width: W * 0.55 });
    const nameH = doc.heightOfString(customer.name || '—', { width: W * 0.55 });
    const billLines = [
      customer.contact_name,
      customer.address,
      [customer.city, customer.region].filter(Boolean).join(', '),
      customer.contact_phone,
      customer.contact_email,
    ].filter(Boolean);
    doc.fillColor(INK2).font('Helvetica').fontSize(10)
      .text(billLines.join('\n'), L, y0 + 19 + nameH, { width: W * 0.55, lineGap: 3 });
    const billBottom = doc.y;

    // meta right column
    const mx = L + W * 0.58;
    const mw = W * 0.42;
    const metaRow = (label, value, dy) => {
      doc.font('Helvetica').fontSize(9).fillColor(MUTED).text(label, mx, dy + 1, { width: mw, align: 'left' });
      doc.font('Helvetica-Bold').fontSize(10.5).fillColor(INK).text(value, mx, dy, { width: mw, align: 'right' });
    };
    metaRow('Invoice date', fmtDate(invoice.created_at), y0);
    metaRow('Due date', fmtDate(invoice.due_date), y0 + 20);
    // status badge
    const st = STATUS[invoice.status] || STATUS.Draft;
    const label = String(invoice.status || 'Draft').toUpperCase();
    doc.font('Helvetica').fontSize(9).fillColor(MUTED).text('Status', mx, y0 + 44, { width: mw, align: 'left' });
    doc.font('Helvetica-Bold').fontSize(9);
    const bw = doc.widthOfString(label) + 24;
    const bx = R - bw;
    doc.roundedRect(bx, y0 + 40, bw, 20, 10).fill(st.bg);
    doc.fillColor(st.fg).font('Helvetica-Bold').fontSize(9).text(label, bx, y0 + 46, { width: bw, align: 'center', characterSpacing: 0.5 });

    // ===== Line items table =====
    let y = Math.max(billBottom, y0 + 68) + 24;
    const cDesc = L + 14;
    const qtyR = L + 322;
    const rateR = L + 428;
    const amtR = R - 14;

    doc.rect(L, y, W, 26).fill(INK);
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9.5);
    doc.text('DESCRIPTION', cDesc, y + 8.5, { characterSpacing: 0.5 });
    doc.text('QTY', qtyR - 50, y + 8.5, { width: 50, align: 'right' });
    doc.text('RATE', rateR - 74, y + 8.5, { width: 74, align: 'right' });
    doc.text('AMOUNT', amtR - 96, y + 8.5, { width: 96, align: 'right' });
    y += 26;

    items.forEach((it, i) => {
      const qty = Number(it.qty) || 0;
      const rate = Number(it.rate) || 0;
      const amt = qty * rate;
      const descH = doc.heightOfString(it.description || '—', { width: 250 });
      const rowH = Math.max(descH, 14) + 13;
      if (i % 2 === 1) doc.rect(L, y, W, rowH).fill(ZEBRA);
      doc.fillColor(INK).font('Helvetica').fontSize(10).text(it.description || '—', cDesc, y + 8, { width: 250 });
      doc.fillColor(INK2).text(String(qty), qtyR - 50, y + 8, { width: 50, align: 'right' });
      doc.text(money(rate), rateR - 74, y + 8, { width: 74, align: 'right' });
      doc.fillColor(INK).font('Helvetica-Bold').text(money(amt), amtR - 96, y + 8, { width: 96, align: 'right' });
      y += rowH;
      if (y > 690) { doc.addPage(); y = 50; }
    });
    doc.rect(L, y, W, 1).fill(LINE);
    y += 18;

    // ===== Totals =====
    const tLabelX = R - 250;
    const tValX = R - 140;
    const totRow = (lab, val) => {
      doc.font('Helvetica').fontSize(10).fillColor(MUTED).text(lab, tLabelX, y, { width: 110, align: 'left' });
      doc.font('Helvetica-Bold').fillColor(INK).text(val, tValX, y, { width: 140, align: 'right' });
      y += 19;
    };
    totRow('Subtotal', money(invoice.subtotal));
    totRow(`Tax (${Number(invoice.tax_pct) || 0}%)`, money(invoice.tax_amount));
    if (Number(invoice.amount_paid) > 0) totRow('Amount paid', money(invoice.amount_paid));
    y += 6;

    const boxX = R - 250;
    const boxW = 250;
    doc.roundedRect(boxX, y, boxW, 42, 8).fill(INK);
    doc.fillColor(MARIGOLD).font('Helvetica-Bold').fontSize(11).text('TOTAL', boxX + 18, y + 15, { lineBreak: false });
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(16).text(money(invoice.total), boxX, y + 12, { width: boxW - 18, align: 'right' });
    y += 42 + 22;

    // ===== Notes / payment link =====
    if (invoice.notes) {
      doc.fillColor(MARIGOLD_D).font('Helvetica-Bold').fontSize(9).text('NOTES', L, y, { characterSpacing: 1 });
      y += 13;
      doc.fillColor(INK2).font('Helvetica').fontSize(10).text(invoice.notes, L, y, { width: W });
      y = doc.y + 12;
    }
    if (invoice.razorpay_payment_link_url) {
      doc.font('Helvetica-Bold').fontSize(10).fillColor(INK).text('Pay online: ', L, y, { continued: true })
        .font('Helvetica').fillColor(MARIGOLD_D)
        .text(invoice.razorpay_payment_link_url, { link: invoice.razorpay_payment_link_url, underline: true });
    }

    // ===== Footer (kept above the bottom margin so it never spills to a new page) =====
    const fy = doc.page.height - 80;
    doc.rect(L, fy, W, 3).fill(MARIGOLD);
    doc.font('Helvetica').fontSize(9).fillColor(MUTED)
      .text('Thank you for your business.', L, fy + 12, { width: W * 0.6, align: 'left', lineBreak: false });
    doc.fillColor('#B0A794')
      .text('Powered by Paimal', L, fy + 12, { width: W, align: 'right', lineBreak: false });

    doc.end();
  });
}

module.exports = { generateInvoicePdf };
