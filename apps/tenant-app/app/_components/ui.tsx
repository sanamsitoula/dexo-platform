'use client';

import React from 'react';

/** SVG activity ring — native in the browser, exact percentage. */
export function Ring({
  size = 120,
  stroke = 12,
  progress = 0,
  color = '#2563EB',
  track = '#EAECEF',
  children,
}: {
  size?: number;
  stroke?: number;
  progress?: number;
  color?: string;
  track?: string;
  children?: React.ReactNode;
}) {
  const p = Math.max(0, Math.min(1, progress || 0));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div style={{ width: size, height: size, position: 'relative' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - p)}
          style={{ transition: 'stroke-dashoffset .8s ease' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </div>
    </div>
  );
}

/** Deterministic QR-ish grid (swap for a real QR lib later). Stable per value. */
export function QrGrid({ value, size = 144 }: { value: string; size?: number }) {
  const cells = Array.from({ length: 36 }).map((_, i) =>
    value ? (value.charCodeAt(i % value.length) + i) % 3 !== 0 : i % 2 === 0
  );
  return (
    <div className="grid grid-cols-6 bg-white rounded-2xl p-2" style={{ width: size, height: size }}>
      {cells.map((on, i) => (
        <div key={i} style={{ background: on ? '#0B0F19' : 'transparent' }} />
      ))}
    </div>
  );
}

export function StatTile({ value, label, color }: { value: React.ReactNode; label: string; color?: string }) {
  return (
    <div className="flex-1 text-center">
      <div className="text-2xl font-extrabold" style={{ color: color || '#0B0F19' }}>{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}
