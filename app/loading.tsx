export default function Loading() {
  return (
    <main className="flex min-h-full flex-1 items-center justify-center bg-canvas px-6 py-16">
      <div className="w-full max-w-xl space-y-3" aria-label="Loading">
        <div className="h-4 w-28 animate-pulse rounded bg-raised" />
        <div className="h-10 w-64 animate-pulse rounded bg-raised" />
        <div className="h-16 w-full animate-pulse rounded-lg bg-raised" />
      </div>
    </main>
  );
}
