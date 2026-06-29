export default function UnavailablePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <div className="text-6xl">🚧</div>
        <h1 className="mt-4 text-2xl font-bold text-gray-900">Temporarily Unavailable</h1>
        <p className="mt-2 text-gray-600">This site is undergoing maintenance. Please check back soon.</p>
      </div>
    </div>
  );
}
