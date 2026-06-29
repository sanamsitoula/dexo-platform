export default function AdminHeader() {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-gray-900">Dexo Admin</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">Admin User</span>
        </div>
      </div>
    </header>
  );
}
