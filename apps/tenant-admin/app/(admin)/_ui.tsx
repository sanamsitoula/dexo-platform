'use client';

import { ReactNode } from 'react';

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 -tracking-tight">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function KpiCard({ label, value, hint, accent = '#4f46e5' }: { label: string; value: ReactNode; hint?: string; accent?: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</div>
      <div className="text-3xl font-bold text-gray-900 mt-1" style={{ color: accent }}>{value}</div>
      {hint && <div className="text-xs text-gray-400 mt-1">{hint}</div>}
    </div>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-gray-200 bg-white ${className}`}>{children}</div>;
}

export function Btn({ children, onClick, variant = 'primary', type = 'button', disabled }: any) {
  const base = 'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-50';
  const styles: any = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700',
    ghost: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
    outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50',
  };
  return <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${styles[variant]}`}>{children}</button>;
}

export function SlideOver({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl overflow-y-auto animate-[slideIn_.2s_ease]" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h3 className="font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
      <style jsx global>{`@keyframes slideIn { from { transform: translateX(24px); opacity: .6 } to { transform: none; opacity: 1 } }`}</style>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block mb-4">
      <span className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</span>
      {children}
    </label>
  );
}

export function Input(props: any) {
  return <input {...props} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none" />;
}

export function EmptyState({ icon = '📭', title, msg }: { icon?: string; title: string; msg?: string }) {
  return (
    <div className="text-center py-16">
      <div className="text-5xl">{icon}</div>
      <div className="font-semibold text-gray-900 mt-3">{title}</div>
      {msg && <div className="text-sm text-gray-500 mt-1">{msg}</div>}
    </div>
  );
}

export function Badge({ children, color = 'gray' }: { children: ReactNode; color?: 'green' | 'amber' | 'gray' | 'red' | 'indigo' }) {
  const styles: any = {
    green: 'bg-green-100 text-green-700',
    amber: 'bg-amber-100 text-amber-700',
    gray: 'bg-gray-100 text-gray-600',
    red: 'bg-red-100 text-red-700',
    indigo: 'bg-indigo-100 text-indigo-700',
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${styles[color]}`}>{children}</span>;
}
