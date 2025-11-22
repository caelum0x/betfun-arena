export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-black via-gray-900 to-black">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-electric-purple border-t-transparent mx-auto mb-4" />
        <p className="text-gray-400">Loading...</p>
      </div>
    </div>
  );
}

