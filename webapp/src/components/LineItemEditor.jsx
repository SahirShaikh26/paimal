import colors from '../theme';

const cell = { padding: '6px 8px', borderBottom: `1px solid ${colors.bgAlt}`, fontSize: 13 };
const inp = { width: '100%', padding: '6px 8px', border: `1px solid ${colors.borderInput}`, borderRadius: 6, fontSize: 13 };

// Editable line-item table with live subtotal / tax / total. Each item is
// { description, qty, rate }. Parent owns the array and tax percentage.
export default function LineItemEditor({ items, onChange, taxPct, onTaxChange }) {
  const update = (i, field, val) =>
    onChange(items.map((it, idx) => (idx === i ? { ...it, [field]: val } : it)));
  const addRow = () => onChange([...items, { description: '', qty: 1, rate: 0 }]);
  const removeRow = (i) => onChange(items.filter((_, idx) => idx !== i));

  const subtotal = items.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.rate) || 0), 0);
  const tax = subtotal * (Number(taxPct) || 0) / 100;
  const total = subtotal + tax;
  const fmt = (n) => `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

  return (
    <div>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
        <thead>
          <tr>
            <th style={{ ...cell, textAlign: 'left', color: colors.textMuted, fontWeight: 600 }}>Description</th>
            <th style={{ ...cell, width: 64, color: colors.textMuted, fontWeight: 600 }}>Qty</th>
            <th style={{ ...cell, width: 100, color: colors.textMuted, fontWeight: 600 }}>Rate</th>
            <th style={{ ...cell, width: 110, textAlign: 'right', color: colors.textMuted, fontWeight: 600 }}>Amount</th>
            <th style={{ ...cell, width: 32 }}></th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={i}>
              <td style={cell}>
                <input style={inp} value={it.description} placeholder="Item / service"
                  onChange={(e) => update(i, 'description', e.target.value)} />
              </td>
              <td style={cell}>
                <input style={{ ...inp, textAlign: 'center' }} type="number" min="0" step="any" value={it.qty}
                  onChange={(e) => update(i, 'qty', e.target.value)} />
              </td>
              <td style={cell}>
                <input style={{ ...inp, textAlign: 'right' }} type="number" min="0" step="any" value={it.rate}
                  onChange={(e) => update(i, 'rate', e.target.value)} />
              </td>
              <td style={{ ...cell, textAlign: 'right', fontWeight: 600 }}>
                {fmt((Number(it.qty) || 0) * (Number(it.rate) || 0))}
              </td>
              <td style={{ ...cell, textAlign: 'center' }}>
                <button type="button" onClick={() => removeRow(i)}
                  style={{ background: 'none', border: 'none', color: colors.red, cursor: 'pointer', fontSize: 16 }}>×</button>
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr><td colSpan={5} style={{ ...cell, textAlign: 'center', color: colors.textFaint }}>No line items yet</td></tr>
          )}
        </tbody>
      </table>

      <button type="button" onClick={addRow}
        style={{ padding: '6px 12px', background: colors.bgAlt, border: `1px solid ${colors.border}`, borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: colors.text }}>
        + Add line
      </button>

      <div style={{ marginTop: 14, marginLeft: 'auto', maxWidth: 280 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0' }}>
          <span style={{ color: colors.textMuted }}>Subtotal</span><span>{fmt(subtotal)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, padding: '4px 0' }}>
          <span style={{ color: colors.textMuted }}>
            Tax&nbsp;
            <input type="number" min="0" step="any" value={taxPct}
              onChange={(e) => onTaxChange(e.target.value)}
              style={{ width: 56, padding: '4px 6px', border: `1px solid ${colors.borderInput}`, borderRadius: 5, fontSize: 12, textAlign: 'right' }} />%
          </span>
          <span>{fmt(tax)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 800, color: colors.navy, padding: '8px 0 0', borderTop: `1px solid ${colors.border}`, marginTop: 4 }}>
          <span>Total</span><span>{fmt(total)}</span>
        </div>
      </div>
    </div>
  );
}
