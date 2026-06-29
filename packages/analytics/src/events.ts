export type AnalyticsEvent =
  | { name: 'page_view'; path: string; tenantId?: string }
  | { name: 'signup_started'; source: 'tenant_website' | 'platform_signup' | 'invite' }
  | { name: 'signup_completed'; tenantId: string }
  | { name: 'booking_created'; tenantId: string; resourceId: string }
  | { name: 'invoice_paid'; tenantId: string; invoiceId: string; amount: number };

export interface AnalyticsContext {
  tenantId?: string;
  userId?: string;
  sessionId?: string;
}

export function track(event: AnalyticsEvent, ctx: AnalyticsContext = {}): void {
  if (typeof window === 'undefined') return;
  const payload = { ...event, ...ctx, ts: new Date().toISOString() };
  const queue = (window as any).__dexo_analytics_queue || [];
  queue.push(payload);
  (window as any).__dexo_analytics_queue = queue;
}
