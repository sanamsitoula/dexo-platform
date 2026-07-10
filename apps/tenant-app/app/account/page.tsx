'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth';
import { fitnessApi, publicApi, resolveSubdomain } from '../../lib/api';

export default function AccountPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [member, setMember] = useState<any>(null);
  const [info, setInfo] = useState<any>(null);

  useEffect(() => {
    fitnessApi.me().then((r) => setMember(r.data));
    publicApi.info().then((r) => setInfo(r.data));
  }, []);

  function signOut() {
    logout();
    router.replace('/login');
  }

  const active = member?.memberships?.[0];

  return (
    <div className="px-4 py-6">
      <h1 className="text-xl font-bold text-gray-900">Account</h1>

      <div className="mt-4 rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-orange-500 text-white flex items-center justify-center text-lg font-bold">
            {(user?.firstName || user?.email || 'U').charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-semibold text-gray-900">{user?.firstName} {user?.lastName}</div>
            <div className="text-sm text-gray-500">{user?.email}</div>
          </div>
        </div>
        {member && (
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
            <div><div className="font-bold text-gray-900">{member.height ?? '—'}</div><div className="text-xs text-gray-500">Height cm</div></div>
            <div><div className="font-bold text-gray-900">{member.weight ?? '—'}</div><div className="text-xs text-gray-500">Weight kg</div></div>
            <div><div className="font-bold text-gray-900">{member.status === 'ACTIVE' ? '✓' : '—'}</div><div className="text-xs text-gray-500">Verified</div></div>
          </div>
        )}
      </div>

      {active && (
        <div className="mt-3 rounded-xl border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Membership</div>
          <div className="font-semibold text-gray-900">{active.plan?.name} · {active.status}</div>
          {active.qrCode && <div className="mt-1 text-xs text-gray-400 font-mono">QR: {active.qrCode}</div>}
        </div>
      )}

      {/* My gym — tenant details */}
      <div className="mt-3 rounded-xl border border-gray-200 p-4">
        <div className="text-sm text-gray-500">My gym</div>
        <div className="font-semibold text-gray-900">{info?.name ?? resolveSubdomain()}</div>
        <div className="text-xs text-gray-500 mt-0.5">{resolveSubdomain()}.dexo.com{info?.tagline ? ` · ${info.tagline}` : ''}</div>
        {member?.createdAt && (
          <div className="text-xs text-gray-400 mt-1">
            Member since {new Date(member.createdAt).toLocaleDateString([], { month: 'long', year: 'numeric' })}
            {member.branch?.name ? ` · ${member.branch.name}` : ''}
          </div>
        )}
      </div>

      <button onClick={signOut} className="mt-4 w-full rounded-lg py-2.5 border border-red-200 text-red-600 font-semibold">
        Sign out
      </button>
      <div className="mt-4 text-center text-[10px] text-gray-400 font-semibold">Powered by DEXO</div>
    </div>
  );
}
