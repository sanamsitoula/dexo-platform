export default function ExplorePage() {
  return (
    <div className="px-4 py-6">
      <h1 className="text-xl font-bold">Explore</h1>
      <p className="mt-2 text-sm text-gray-500">Discover classes, services, and products.</p>
      <div className="mt-6 grid grid-cols-2 gap-3">
        {['All', 'Classes', 'Trainers', 'Plans'].map((c) => (
          <button key={c} className="py-3 bg-white border border-gray-200 rounded-md text-sm">{c}</button>
        ))}
      </div>
    </div>
  );
}
