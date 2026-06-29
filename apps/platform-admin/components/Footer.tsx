export default function AdminFooter() {
  return (
    <footer className="bg-gray-50 border-t">
      <div className="px-6 py-4 text-center text-sm text-gray-600">
        &copy; {new Date().getFullYear()} Dexo Platform Admin. All rights reserved.
      </div>
    </footer>
  );
}
