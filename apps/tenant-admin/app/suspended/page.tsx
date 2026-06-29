export default function SuspendedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-lg w-full bg-white shadow rounded-lg p-8 text-center">
        <div className="mx-auto h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
          <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M4.93 4.93l14.14 14.14" />
          </svg>
        </div>
        <h1 className="mt-4 text-2xl font-bold text-gray-900">Account Suspended</h1>
        <p className="mt-2 text-gray-600">
          Your account is temporarily suspended. Please contact support or upgrade your plan to restore service.
        </p>
        <div className="mt-6 flex gap-2 justify-center">
          <a href="mailto:support@dexo.com" className="px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800">
            Contact Support
          </a>
          <a href="https://dexo.com/pricing" className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
            View Plans
          </a>
        </div>
      </div>
    </div>
  );
}
