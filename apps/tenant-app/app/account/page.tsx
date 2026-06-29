export default function AccountPage() {
  return (
    <div className="px-4 py-6">
      <h1 className="text-xl font-bold">Account</h1>
      <div className="mt-4 space-y-3">
        {['Profile', 'Membership', 'Notifications', 'Help & Support', 'Sign out'].map((it) => (
          <button key={it} className="w-full text-left px-4 py-3 bg-white border border-gray-200 rounded-md text-sm">{it}</button>
        ))}
      </div>
    </div>
  );
}
