"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Check, Circle, CircleAlert, LoaderCircle } from "lucide-react";
import { StateMark } from "@/components/state-mark";
import { STAGES, STALE_AFTER_MS, type Progress } from "@/lib/pipeline/stages";
import { RerunButton } from "./rerun-button";
import { sameProgress, useProgress } from "./use-progress";

type Props = {
  analysisId: string;
  repository: { owner: string; name: string };
  commitSha: string | null;
  initial: Progress;
  /** Worked out by the server at render; only true while nothing has moved since. */
  staleAtRender: boolean;
  /** Formatted by the server, so the browser renders the text it was sent. */
  started: { iso: string; ago: string } | null;
};

type Step = "done" | "current" | "failed" | "stale" | "pending";

export function AnalysisProgress({ analysisId, repository, commitSha, initial, staleAtRender, started }: Props) {
  const { progress, lost, restarted } = useProgress(analysisId, initial);
  const router = useRouter();

  // Stored is the last stage; once it lands the server has a map to render at
  // this same address, so the page is re-rendered into it.
  const complete = progress.status === "complete";
  useEffect(() => {
    if (complete) router.refresh();
  }, [complete, router]);
  const stale = staleAtRender && sameProgress(progress, initial);
  const current = STAGES.findIndex((s) => s.stage === progress.stage);
  const canRerun = stale || progress.status === "complete" || progress.status === "failed";

  const step = (i: number): Step => {
    if (progress.status === "complete") return "done";
    if (progress.status === "queued" || current === -1 || i > current) return "pending";
    if (i < current) return "done";
    if (progress.status === "failed") return "failed";
    return stale ? "stale" : "current";
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-surface/70 px-5 text-xs">
        <h1 className="font-serif text-xl">
          <span className="text-fg-muted">{repository.owner}/</span>
          {repository.name}
        </h1>
        {commitSha && (
          <span className="rounded-full bg-raised px-2 py-1 font-mono text-fg-muted" title={commitSha}>
            {commitSha.slice(0, 7)}
          </span>
        )}
        <span className="flex items-center gap-1.5 text-fg-muted">
          <StateMark status={progress.status} stale={stale} />
          {stale ? "stale" : progress.status}
        </span>
        <span className="ml-auto">{canRerun && <RerunButton analysisId={analysisId} onStarted={restarted} />}</span>
      </div>

      <div className="px-3 py-4">
        <ol className="max-w-2xl text-sm">
          {STAGES.map(({ stage, label }, i) => {
            const state = step(i);
            const detail = state === "current" || state === "failed" || state === "stale" ? progress.message : null;
            return (
              <li key={stage} className="relative grid grid-cols-[2rem_7rem_minmax(0,1fr)] items-center gap-x-3 py-3">
                {i < STAGES.length - 1 && <span className="absolute left-[0.95rem] top-8 h-full w-px bg-line" />}
                <span className={`z-10 flex size-8 items-center justify-center rounded-full border bg-surface ${state === "current" ? "border-accent text-accent shadow-sm" : state === "failed" ? "border-danger text-danger" : state === "done" ? "border-success text-success" : "border-line text-fg-muted"}`}>
                  <StepMark state={state} />
                </span>
                <span className={`font-semibold ${state === "pending" ? "text-fg-muted" : "text-fg"}`}>{label}</span>
                {detail && <span className={`rounded-lg border border-line bg-raised px-3 py-2 text-sm ${state === "failed" ? "border-danger/40 text-danger" : "text-fg-muted"}`}>{detail}</span>}
              </li>
            );
          })}
        </ol>

        {stale && (
          <p className="mt-5 max-w-2xl rounded-lg border border-outgoing/30 bg-outgoing/10 px-4 py-3 text-sm text-fg-muted">
            No progress for over {STALE_AFTER_MS / 60000} minutes
            {started && (
              <>
                {" "}
                since it started{" "}
                <time dateTime={started.iso} title={started.iso}>
                  {started.ago}
                </time>
              </>
            )}
            . The process running it has most likely stopped; re-run to start again.
          </p>
        )}
        {complete && progress.message && <p className="mt-3 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-fg">{progress.message} — opening the map…</p>}
        {lost && (
          <p className="mt-3 max-w-2xl rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            Live updates stopped ({lost}). Reload to see where the run is.
          </p>
        )}
      </div>
    </div>
  );
}

function StepMark({ state }: { state: Step }) {
  switch (state) {
    case "done":
      return <Check size={15} strokeWidth={2.2} />;
    case "current":
      return <LoaderCircle size={15} className="animate-spin" />;
    case "stale":
      return <CircleAlert size={15} />;
    case "failed":
      return <CircleAlert size={15} />;
    case "pending":
      return <Circle size={12} />;
  }
}
