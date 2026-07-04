export default function StaffDashboard() {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900">Staff Dashboard</h2>
      <p className="mt-1 text-gray-500">Your daily overview.</p>
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-5">
          <div className="text-sm text-gray-500">Today\u2019s Classes</div>
          <div className="mt-2 text-3xl font-bold">4</div>
        </div>
        <div className="bg-white rounded-lg shadow p-5">
          <div className="text-sm text-gray-500">My Schedule</div>
          <div className="mt-2 text-3xl font-bold">2</div>
        </div>
        <div className="bg-white rounded-lg shadow p-5">
          <div className="text-sm text-gray-500">My Members</div>
          <div className="mt-2 text-3xl font-bold">12</div>
        </div>
      </div>
    </div>
  );
}
