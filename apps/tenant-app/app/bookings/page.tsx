export default function BookingsPage() {
  return (
    <div className="px-4 py-6">
      <h1 className="text-xl font-bold">My Bookings</h1>
      <div className="mt-4 space-y-3">
        {['Morning HIIT', 'Personal Training', 'Yoga Class'].map((b) => (
          <div key={b} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="font-semibold">{b}</div>
            <div className="text-xs text-gray-500 mt-1">Tomorrow, 7:00 AM</div>
            <span className="inline-block mt-2 text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded">Confirmed</span>
          </div>
        ))}
      </div>
    </div>
  );
}
