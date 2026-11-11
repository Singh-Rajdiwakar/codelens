"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { useEffect } from "react";

export default function WorkspaceError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-full flex-1 items-center justify-center bg-canvas px-6 py-16">
      <section className="w-full max-w-md rounded-xl border border-line bg-surface p-8 text-center shadow-md">
        <AlertTriangle className="mx-auto mb-4 text-danger" size={28} />
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-fg-muted">Workspace error</p>
        <h1 className="mt-2 font-serif text-3xl">Your map needs a second look.</h1>
        <p className="mt-3 text-sm text-fg-muted">We could not load this workspace. Try again before checking the repository connection.</p>
        {error.digest && <p className="mt-4 font-mono text-[11px] text-fg-muted">ref: {error.digest}</p>}
        <button type="button" onClick={() => reset()} className="mt-6 inline-flex min-h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-fg shadow-sm">
          <RotateCcw size={15} /> Try again
        </button>
      </section>
    </main>
  );
}
