'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { fitnessApi, paymentsApi } from '../../../lib/api';

/**
 * Landing page after the payment gateway redirects back.
 * Query params: membershipId, provider, status (success|failure) and any
 * gateway-specific params (eSewa v2 sends ?data=<base64 JSON>).
 * On success: verify with the gateway, then activate the membership.
 */
function PaymentReturnInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [state, setState] = useState<'working' | 'ok' | 'failed'>('working');
  const [message, setMessage] = useState('Verifying your payment…');

  useEffect(() => {
    (async () => {
      const membershipId = params?.get('membershipId') || '';
      const provider = (params?.get('provider') || 'ESEWA').toUpperCase();
      const outcome = params?.get('status');

      if (!membershipId) { setState('failed'); setMessage('Missing payment reference.'); return; }
      if (outcome === 'failure' || outcome === 'cancel') {
        setState('failed'); setMessage('Payment was cancelled or failed. You can retry from the Membership page.');
        return;
      }

      // eSewa v2 returns ?data=<base64-encoded JSON> on the success URL.
      let providerTxnId = params?.get('providerTxnId') || params?.get('refId') || '';
      let amount: number | undefined;
      let rawParams: any;
      const dataParam = params?.get('data');
      if (dataParam) {
        try {
          const decoded = JSON.parse(atob(dataParam));
          rawParams = decoded;
          providerTxnId = decoded.transaction_code || decoded.ref_id || providerTxnId;
          amount = decoded.total_amount ? parseFloat(String(decoded.total_amount).replace(/,/g, '')) : undefined;
          if (String(decoded.status).toUpperCase() !== 'COMPLETE') {
            setState('failed'); setMessage(`Gateway status: ${decoded.status}`);
            return;
          }
        } catch { /* fall through to verify with what we have */ }
      }

      const v = await paymentsApi.verify({ providerType: provider, providerTxnId: providerTxnId || membershipId, orderId: membershipId, amount, rawParams });
      const verified = !v.error && (v.data?.status === 'SUCCESS' || v.data?.verified === true || v.data?.success === true);
      if (!verified) {
        setState('failed');
        setMessage(v.error || 'The gateway could not verify this payment. If money was deducted it will be reconciled automatically.');
        return;
      }

      const act = await fitnessApi.memberships.activate(membershipId, providerTxnId || `TXN-${Date.now()}`, provider);
      if (act.error) { setState('failed'); setMessage(act.error); return; }

      setState('ok');
      setMessage('Payment confirmed — your membership is active! 🎉');
      setTimeout(() => router.replace('/membership'), 2500);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-8 text-center">
      <div className="text-6xl">{state === 'working' ? '⏳' : state === 'ok' ? '✅' : '❌'}</div>
      <div className="font-extrabold text-gray-900 text-xl mt-4">
        {state === 'working' ? 'Hang tight' : state === 'ok' ? 'Payment successful' : 'Payment not completed'}
      </div>
      <p className="text-sm text-gray-500 mt-2">{message}</p>
      {state !== 'working' && (
        <button onClick={() => router.replace('/membership')} className="mt-6 rounded-full bg-gray-900 text-white px-6 py-2.5 text-sm font-bold">
          Back to membership
        </button>
      )}
    </div>
  );
}

export default function PaymentReturnPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>}>
      <PaymentReturnInner />
    </Suspense>
  );
}
