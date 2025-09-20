"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="p-6 space-y-3">
      <h2 className="text-lg font-semibold">Something went wrong in Ranked.</h2>
      <pre className="text-xs opacity-70 whitespace-pre-wrap">{error.message}</pre>
      <button
        className="rounded-md border px-3 py-1 text-sm"
        onClick={() => reset()}
      >
        Try again
      </button>
    </div>
  );
}
