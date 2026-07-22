import { useState } from 'react';
import toast from 'react-hot-toast';
import { startCheckout } from '../lib/razorpay';
import colors from '../theme';

// Reusable "pay by card / UPI / netbanking" button using Razorpay Standard
// Checkout. Pass an invoiceId (amount is taken from that invoice server-side) or
// an explicit amount in paise. onPaid fires only after the backend verifies the
// signature.
export default function RazorpayButton({
  invoiceId, amount, receipt, description = 'Payment', prefill, onPaid,
  label = 'Pay now', style,
}) {
  const [busy, setBusy] = useState(false);

  const pay = () => {
    setBusy(true);
    startCheckout({
      invoiceId, amount, receipt, description, prefill,
      onPaid: (r) => { setBusy(false); toast.success('Payment successful'); onPaid?.(r); },
      onError: (msg) => { setBusy(false); toast.error(msg || 'Payment failed'); },
      onDismiss: () => setBusy(false),
    });
  };

  return (
    <button
      type="button"
      onClick={pay}
      disabled={busy}
      style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, color: colors.blueDark, padding: 0, ...style }}
    >
      {busy ? 'Opening…' : label}
    </button>
  );
}
