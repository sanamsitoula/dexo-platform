'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ecommerceApi } from '@/lib/api';
import { PageHeader, Card, Btn, Field, Input, Badge } from '../../_ui';

const STATUSES = ['PENDING', 'CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED', 'REFUNDED'];
const SHIPMENT_STATUSES = ['PENDING', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'RETURNED'];

const STATUS_COLORS: Record<string, 'green' | 'amber' | 'gray' | 'red' | 'indigo'> = {
  PENDING: 'amber',
  CONFIRMED: 'indigo',
  PROCESSING: 'indigo',
  PACKED: 'indigo',
  SHIPPED: 'indigo',
  DELIVERED: 'green',
  CANCELLED: 'red',
  RETURNED: 'red',
  REFUNDED: 'gray',
};

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const subdomain = (params?.subdomain as string) || 'vrfitness';

  const [order, setOrder] = useState<any>(null);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusValue, setStatusValue] = useState('');
  const [savingStatus, setSavingStatus] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const [shipmentForm, setShipmentForm] = useState({ courierName: '', trackingNumber: '', warehouseId: '' });
  const [creatingShipment, setCreatingShipment] = useState(false);
  const [shipmentStatusValue, setShipmentStatusValue] = useState('');
  const [savingShipmentStatus, setSavingShipmentStatus] = useState(false);

  const [paymentForm, setPaymentForm] = useState({ providerType: 'CASH', providerTxnId: '' });
  const [confirmingPayment, setConfirmingPayment] = useState(false);

  useEffect(() => {
    if (!id) return;
    loadOrder();
    ecommerceApi.warehouses.list(subdomain).then((r) => r.data && setWarehouses(Array.isArray(r.data) ? r.data : []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, subdomain]);

  async function loadOrder() {
    setLoading(true);
    const r = await ecommerceApi.orders.getById(subdomain, id);
    if (r.data) {
      const o: any = r.data;
      setOrder(o);
      setStatusValue(o.status);
      const shipment = o.shipments?.[0];
      if (shipment) setShipmentStatusValue(shipment.status);
      setError('');
    } else if (r.error) {
      setError(r.error);
    }
    setLoading(false);
  }

  async function handleStatusUpdate() {
    setSavingStatus(true);
    const r = await ecommerceApi.orders.updateStatus(subdomain, id, statusValue);
    if (r.error) alert(r.error);
    else loadOrder();
    setSavingStatus(false);
  }

  async function handleCancel() {
    if (!confirm('Cancel this order? This cannot be undone.')) return;
    setCancelling(true);
    const r = await ecommerceApi.orders.cancel(subdomain, id);
    if (r.error) alert(r.error);
    else loadOrder();
    setCancelling(false);
  }

  async function handleCreateShipment() {
    if (!shipmentForm.warehouseId) { alert('Select a warehouse'); return; }
    setCreatingShipment(true);
    const r = await ecommerceApi.shipments.create(subdomain, id, shipmentForm);
    if (r.error) alert(r.error);
    else loadOrder();
    setCreatingShipment(false);
  }

  async function handleShipmentStatusUpdate(shipmentId: string) {
    setSavingShipmentStatus(true);
    const r = await ecommerceApi.shipments.updateStatus(subdomain, shipmentId, shipmentStatusValue);
    if (r.error) alert(r.error);
    else loadOrder();
    setSavingShipmentStatus(false);
  }

  async function handleConfirmPayment() {
    if (!paymentForm.providerTxnId) { alert('Enter a transaction reference'); return; }
    setConfirmingPayment(true);
    const r = await ecommerceApi.orders.confirmPayment(subdomain, id, paymentForm);
    if (r.error) alert(r.error);
    else loadOrder();
    setConfirmingPayment(false);
  }

  if (loading) return <div className="p-10 text-center text-gray-400">Loading order…</div>;
  if (!order) return <div className="p-10 text-center text-gray-400">{error || 'Order not found'}</div>;

  const shipment = order.shipments?.[0];
  const isPrepaidUnpaid = order.paymentMethod === 'PREPAID' && order.status === 'PENDING';

  return (
    <div>
      <PageHeader
        title={`Order ${order.orderNumber}`}
        subtitle={`Placed ${new Date(order.placedAt).toLocaleString()}`}
        action={
          <div className="flex items-center gap-3">
            <Badge color={STATUS_COLORS[order.status] || 'gray'}>{order.status}</Badge>
            <Btn variant="ghost" onClick={() => router.push('/orders')}>Back</Btn>
          </div>
        }
      />

      {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <h3 className="font-bold text-gray-900 mb-4">Line Items</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold">Product</th>
                    <th className="text-left px-3 py-2 font-semibold">Qty</th>
                    <th className="text-left px-3 py-2 font-semibold">Unit Price</th>
                    <th className="text-left px-3 py-2 font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(order.items || []).map((item: any) => (
                    <tr key={item.id}>
                      <td className="px-3 py-2 font-semibold text-gray-900">{item.product?.name || item.productId}</td>
                      <td className="px-3 py-2 text-gray-600">{item.quantity}</td>
                      <td className="px-3 py-2 text-gray-600">${Number(item.unitPrice).toFixed(2)}</td>
                      <td className="px-3 py-2 text-gray-900 font-semibold">${Number(item.total).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex justify-end">
              <div className="w-56 text-sm space-y-1">
                <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>${Number(order.subtotal).toFixed(2)}</span></div>
                <div className="flex justify-between text-gray-600"><span>Discount</span><span>-${Number(order.discountTotal).toFixed(2)}</span></div>
                <div className="flex justify-between text-gray-600"><span>Tax</span><span>${Number(order.taxTotal).toFixed(2)}</span></div>
                <div className="flex justify-between text-gray-600"><span>Shipping</span><span>${Number(order.shippingTotal).toFixed(2)}</span></div>
                <div className="flex justify-between font-bold text-gray-900 border-t border-gray-200 pt-1"><span>Grand Total</span><span>${Number(order.grandTotal).toFixed(2)}</span></div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-bold text-gray-900 mb-4">Shipping Address</h3>
            {order.shippingAddress ? (
              <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">{JSON.stringify(order.shippingAddress, null, 2)}</pre>
            ) : (
              <p className="text-sm text-gray-500">No shipping address on file.</p>
            )}
          </Card>

          <Card className="p-6">
            <h3 className="font-bold text-gray-900 mb-4">Shipment</h3>
            {shipment ? (
              <div className="space-y-3">
                <div className="text-sm text-gray-700">
                  <div><span className="font-semibold">Courier:</span> {shipment.courierName || '—'}</div>
                  <div><span className="font-semibold">Tracking #:</span> {shipment.trackingNumber || '—'}</div>
                  <div className="mt-1"><Badge color={shipment.status === 'DELIVERED' ? 'green' : 'indigo'}>{shipment.status}</Badge></div>
                </div>
                <div className="flex items-end gap-3">
                  <Field label="Update Shipment Status">
                    <select
                      value={shipmentStatusValue}
                      onChange={(e) => setShipmentStatusValue(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    >
                      {SHIPMENT_STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </Field>
                  <Btn onClick={() => handleShipmentStatusUpdate(shipment.id)} disabled={savingShipmentStatus}>
                    {savingShipmentStatus ? 'Saving…' : 'Update'}
                  </Btn>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-500 mb-3">No shipment created yet.</p>
                <div className="grid grid-cols-3 gap-4">
                  <Field label="Courier Name">
                    <Input value={shipmentForm.courierName} onChange={(e: any) => setShipmentForm((f) => ({ ...f, courierName: e.target.value }))} placeholder="e.g. FedEx" />
                  </Field>
                  <Field label="Tracking Number">
                    <Input value={shipmentForm.trackingNumber} onChange={(e: any) => setShipmentForm((f) => ({ ...f, trackingNumber: e.target.value }))} placeholder="1Z999..." />
                  </Field>
                  <Field label="Warehouse *">
                    <select
                      value={shipmentForm.warehouseId}
                      onChange={(e) => setShipmentForm((f) => ({ ...f, warehouseId: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    >
                      <option value="">Select warehouse</option>
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                  </Field>
                </div>
                <div className="flex justify-end mt-2">
                  <Btn onClick={handleCreateShipment} disabled={creatingShipment}>{creatingShipment ? 'Creating…' : 'Create Shipment'}</Btn>
                </div>
              </div>
            )}
          </Card>

          {isPrepaidUnpaid && (
            <Card className="p-6">
              <h3 className="font-bold text-gray-900 mb-4">Confirm Payment</h3>
              <p className="text-sm text-gray-500 mb-3">This is a prepaid order awaiting payment confirmation.</p>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Provider Type">
                  <Input value={paymentForm.providerType} onChange={(e: any) => setPaymentForm((f) => ({ ...f, providerType: e.target.value }))} placeholder="CASH" />
                </Field>
                <Field label="Transaction Reference *">
                  <Input value={paymentForm.providerTxnId} onChange={(e: any) => setPaymentForm((f) => ({ ...f, providerTxnId: e.target.value }))} placeholder="Txn ID" />
                </Field>
              </div>
              <div className="flex justify-end">
                <Btn onClick={handleConfirmPayment} disabled={confirmingPayment}>{confirmingPayment ? 'Confirming…' : 'Confirm Payment'}</Btn>
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="font-bold text-gray-900 mb-4">Status</h3>
            <Field label="Order Status">
              <select
                value={statusValue}
                onChange={(e) => setStatusValue(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Btn onClick={handleStatusUpdate} disabled={savingStatus || statusValue === order.status}>
              {savingStatus ? 'Updating…' : 'Update Status'}
            </Btn>
            <div className="border-t border-gray-100 mt-4 pt-4">
              <Btn variant="outline" onClick={handleCancel} disabled={cancelling || ['CANCELLED', 'DELIVERED', 'SHIPPED'].includes(order.status)}>
                {cancelling ? 'Cancelling…' : 'Cancel Order'}
              </Btn>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-bold text-gray-900 mb-4">Payment</h3>
            <div className="text-sm text-gray-700 space-y-1">
              <div><span className="font-semibold">Method:</span> {order.paymentMethod}</div>
              <div><span className="font-semibold">Currency:</span> {order.currency}</div>
              {order.couponCode && <div><span className="font-semibold">Coupon:</span> {order.couponCode}</div>}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
