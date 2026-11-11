export default function WorkspaceLoading() {
  return (
    <main className="flex min-h-full flex-1 flex-col gap-5 bg-canvas px-6 py-8" aria-label="Loading workspace">
      <div className="h-4 w-28 animate-pulse rounded bg-raised" />
      <div className="h-10 w-56 animate-pulse rounded bg-raised" />
      <div className="space-y-2">
        {[1, 2, 3].map((row) => <div key={row} className="h-14 animate-pulse rounded-lg bg-raised" />)}
      </div>
    </main>
  );
}
