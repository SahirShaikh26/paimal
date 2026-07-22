import api from '../api/client';

const CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

// Loads Razorpay's checkout.js once and resolves when window.Razorpay is ready.
function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    let el = document.querySelector(`script[src="${CHECKOUT_SRC}"]`);
    if (el) {
      el.addEventListener('load', () => resolve());
      el.addEventListener('error', () => reject(new Error('Failed to load Razorpay')));
      return;
    }
    el = document.createElement('script');
    el.src = CHECKOUT_SRC;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error('Failed to load Razorpay checkout'));
    document.body.appendChild(el);
  });
}

// Runs the full Standard Checkout flow: create an order on our backend, open the
// Razorpay modal, then verify the signature on our backend before treating the
// payment as done. Callbacks:
//   onPaid(result)   — signature verified server-side
//   onError(message) — failure, cancel, or verification mismatch
//   onDismiss()      — user closed the modal without paying
export async function startCheckout({
  amount, currency = 'INR', receipt, invoiceId,
  name = 'Paimal', description = 'Payment', prefill = {}, notes = {},
  onPaid, onError, onDismiss,
} = {}) {
  try {
    const { data: order } = await api.post('/checkout/create-order', {
      amount, currency, receipt, invoice_id: invoiceId,
    });

    await loadRazorpayScript();

    const keyId = order.key_id || import.meta.env.VITE_RAZORPAY_KEY_ID;
    if (!keyId) throw new Error('Razorpay key id is not configured');

    const rzp = new window.Razorpay({
      key: keyId,
      order_id: order.order_id,
      amount: order.amount,
      currency: order.currency,
      name,
      description,
      prefill,
      notes,
      theme: { color: '#E4881F' },
      handler: async (resp) => {
        try {
          const { data } = await api.post('/checkout/verify-payment', {
            razorpay_order_id: resp.razorpay_order_id,
            razorpay_payment_id: resp.razorpay_payment_id,
            razorpay_signature: resp.razorpay_signature,
            invoice_id: invoiceId,
          });
          if (data.verified) onPaid?.(data);
          else onError?.('Payment could not be verified');
        } catch (e) {
          onError?.(e.response?.data?.error || 'Payment verification failed');
        }
      },
      modal: { ondismiss: () => onDismiss?.() },
    });

    // Razorpay-side failure (e.g. card declined) before the handler runs.
    rzp.on('payment.failed', (resp) => onError?.(resp.error?.description || 'Payment failed'));
    rzp.open();
  } catch (e) {
    onError?.(e.response?.data?.error || e.message || 'Could not start checkout');
  }
}
