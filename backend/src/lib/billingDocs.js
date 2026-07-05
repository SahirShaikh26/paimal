const db = require('../db');

// Compute monetary totals from line items + a tax percentage.
// A line item is { description, qty, rate }.
function computeTotals(lineItems = [], taxPct = 0) {
  const items = Array.isArray(lineItems) ? lineItems : [];
  const subtotal = items.reduce((sum, it) => {
    const qty = Number(it.qty) || 0;
    const rate = Number(it.rate) || 0;
    return sum + qty * rate;
  }, 0);
  const tax = Number(taxPct) || 0;
  const taxAmount = +(subtotal * tax / 100).toFixed(2);
  const total = +(subtotal + taxAmount).toFixed(2);
  return { subtotal: +subtotal.toFixed(2), taxAmount, total };
}

// Atomically claim the next human-friendly document number for a tenant.
// Uses a per-tenant counter column so two concurrent inserts can't collide.
async function nextNumber(tenantId, kind) {
  const map = {
    invoice: { col: 'next_invoice_seq', prefix: 'INV' },
    ticket: { col: 'next_ticket_seq', prefix: 'TK' },
    quote: { col: 'next_quote_seq', prefix: 'QT' },
  };
  const { col, prefix } = map[kind] || map.quote;
  const { rows } = await db.query(
    `UPDATE tenants SET ${col} = ${col} + 1 WHERE id=$1 RETURNING ${col} - 1 AS seq`,
    [tenantId]
  );
  const seq = rows[0]?.seq || 1;
  return `${prefix}-${new Date().getFullYear()}-${String(seq).padStart(4, '0')}`;
}

module.exports = { computeTotals, nextNumber };
