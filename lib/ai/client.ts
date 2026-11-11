import OpenAI from "openai";
import { wrapOpenAI } from "langsmith/wrappers/openai";

// The one place the AI client is constructed. A client built anywhere else
// would work and silently go untraced, so nothing else imports "openai".

const DEFAULT_MODEL = "gemini-3.6-flash";

// Google AI Studio models page marks Gemini 3.6 Flash as Stable. The model can
// be overridden without changing call sites, and the resolved name is part of
// every cache key.
export const MODELS = {
  explain: process.env.AI_MODEL_EXPLAIN?.trim() || process.env.AI_MODEL?.trim() || DEFAULT_MODEL,
  classify: process.env.AI_MODEL_CLASSIFY?.trim() || process.env.AI_MODEL?.trim() || DEFAULT_MODEL,
};

export type TracingStatus = { on: true; project: string } | { on: false; reason: string };

// An absent key looks exactly like a working setup with no traffic, so the
// state is reported with every answer instead of being inferred.
export function tracingStatus(): TracingStatus {
  if (process.env.LANGSMITH_TRACING?.trim() !== "true") return { on: false, reason: "LANGSMITH_TRACING isn't \"true\"" };
  if (!process.env.LANGSMITH_API_KEY?.trim()) return { on: false, reason: "LANGSMITH_API_KEY isn't set" };
  return { on: true, project: process.env.LANGSMITH_PROJECT?.trim() || "default" };
}

let client: OpenAI | null = null;

// Built on first use rather than at import, so a missing key fails the call
// that needed it with a message saying so, not the server's boot.
export function ai(): OpenAI {
  if (client) return client;
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error("GEMINI_API_KEY isn't set in .env.local, so nothing can be explained");
  client = wrapOpenAI(
    new OpenAI({
      apiKey,
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
      maxRetries: 0,
      timeout: 30_000,
    }),
    { tracingEnabled: tracingStatus().on },
  );
  return client;
}

/**
 * How every traced step is recorded. Whatever runs inside it, the cache read
 * included, is one run, so a cache hit shows up as a run with no model call
 * under it. With tracing off the function runs exactly the same, untraced.
 */
export function traceConfig(name: string) {
  return { name, run_type: "chain", tracingEnabled: tracingStatus().on } as const;
}
