"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <p className="text-6xl mb-4">😵</p>
        <h1 className="text-2xl font-bold text-gray-900">Something went wrong</h1>
        <p className="text-sm text-gray-500 mt-2">
          An unexpected error occurred. Please try again — if it keeps happening, come back in a
          few minutes.
        </p>
        <button
          onClick={reset}
          className="inline-block mt-6 bg-gray-900 text-white text-sm font-semibold px-6 py-3 rounded-xl hover:bg-gray-700 transition"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
