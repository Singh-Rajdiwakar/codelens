"use client";

import { useActionState } from "react";
import { ArrowUpRight, LoaderCircle } from "lucide-react";
import { submitAnalysis, type FormState } from "@/app/(workspace)/actions";

const INITIAL: FormState = { error: null };

export function SubmitForm() {
  const [state, action, pending] = useActionState(submitAnalysis, INITIAL);
  return (
    <form action={action} className="flex min-w-0 flex-wrap items-center gap-2">
      <input
        name="url"
        required
        autoComplete="off"
        spellCheck={false}
        placeholder="github.com/owner/repo"
        aria-label="Public GitHub repository URL"
        aria-invalid={state.error ? true : undefined}
        className="h-11 w-72 min-w-0 rounded-lg border border-line bg-surface px-4 font-mono text-xs outline-none shadow-sm placeholder:text-fg-muted focus:border-accent focus:ring-2 focus:ring-accent/15"
      />
      <button
        type="submit"
        disabled={pending}
        className="flex h-11 shrink-0 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-fg shadow-sm hover:-translate-y-px hover:shadow-md disabled:opacity-60"
      >
        {pending ? <LoaderCircle size={16} className="animate-spin" /> : <ArrowUpRight size={16} />}
        {pending ? "Starting…" : "Analyse"}
      </button>
      {state.error && (
        <span role="alert" className="truncate text-xs text-danger">
          {state.error}
        </span>
      )}
    </form>
  );
}
