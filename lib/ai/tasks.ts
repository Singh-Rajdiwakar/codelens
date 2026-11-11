import { createHash } from "node:crypto";
import { isModelRole, type ModelRole } from "../roles.ts";
import { traceable } from "langsmith/traceable";
import { ai, MODELS, traceConfig } from "./client.ts";
import {
  CLASSIFY_SYSTEM,
  classifyMessage,
  EXPLAIN_FILE_SYSTEM,
  EXPLAIN_FOLDER_SYSTEM,
  explainFileMessage,
  explainFolderMessage,
  ASK_REPOSITORY_SYSTEM,
  askRepositoryMessage,
  PROMPT_VERSION,
  type ClassifyInput,
  type FileInput,
  type FolderInput,
} from "./prompts.ts";

// The model calls, each behind its cache. The cache read is the first thing
// inside the traced function, so a hit is still a recorded run, one with no
// model call in it, and a broken cache is visible as a trace full of calls.

export type Task = "explain-file" | "explain-folder" | "classify-file" | "ask-repository";

export type Cache = {
  read: (key: string) => Promise<string | null>;
  write: (entry: { key: string; task: Task; model: string; body: string }) => Promise<void>;
};

export type Explanation = { body: string; model: string; cached: boolean };
export type RepositoryAnswer = Explanation;

// The source is only fetched on a miss: a hit answers from the stored hash alone.
export type SourceOf = () => Promise<string>;

// The largest file the parser reads is well under this; it's a backstop
// against an unexpectedly huge prompt, and the model is told when it applies.
const MAX_SOURCE_CHARS = 120_000;
const EXCERPT_LINES = 60;

export function cacheKey(task: Task, model: string, input: unknown): string {
  return createHash("sha256").update(JSON.stringify({ task, version: PROMPT_VERSION, model, input })).digest("hex");
}

async function classifyWithRetry(
  model: string,
  messages: { role: "system" | "user"; content: string }[],
): Promise<string> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await withRetries(() => ai().chat.completions.create({ model, messages }));
      return readRole(response.choices[0]?.message.content ?? null);
    } catch (error) {
      lastError = error;
      if (attempt === 0 && error instanceof Error && error.message.startsWith("The model")) {
        messages = [...messages, { role: "user", content: 'Return only valid JSON: {"role":"<allowed role or none>"}.' }];
        continue;
      }
      throw friendlyAiError(error);
    }
  }
  throw friendlyAiError(lastError);
}

async function withRetries<T>(request: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await request();
    } catch (error) {
      lastError = error;
      if (!isRetryable(error) || attempt === 2) throw friendlyAiError(error);
      await delay(250 * 2 ** attempt + Math.floor(Math.random() * 150));
    }
  }
  throw friendlyAiError(lastError);
}

function isRetryable(error: unknown): boolean {
  const status = typeof error === "object" && error !== null && "status" in error ? Reflect.get(error, "status") : undefined;
  return status === 429 || (typeof status === "number" && status >= 500 && status <= 599);
}

function friendlyAiError(error: unknown): Error {
  if (error instanceof Error && error.message.startsWith("The model")) return error;
  if (error instanceof Error && (error.name === "APIConnectionTimeoutError" || error.name === "TimeoutError")) {
    return new Error("Gemini took too long to respond. Please try again.");
  }
  const status = typeof error === "object" && error !== null && "status" in error ? Reflect.get(error, "status") : undefined;
  const code = typeof error === "object" && error !== null && "code" in error ? Reflect.get(error, "code") : undefined;
  const name = error instanceof Error ? error.name : "UnknownError";
  console.error("Gemini request failed", {
    name,
    status: typeof status === "number" ? status : undefined,
    code: typeof code === "string" ? code : undefined,
  });
  if (status === 429) return new Error("Gemini is rate-limited right now. Please try again in a moment.");
  if (typeof status === "number" && status >= 500) return new Error("Gemini is temporarily unavailable. Please try again.");
  if (name === "APIConnectionError" || name === "APIConnectionTimeoutError" || code === "ECONNRESET" || code === "ETIMEDOUT") {
    return new Error("Codelens could not reach Gemini. Check the connection and Gemini endpoint, then try again.");
  }
  if (status === 400 || status === 401 || status === 403 || status === 404) {
    return new Error("Gemini rejected this request. Check GEMINI_API_KEY and AI_MODEL in .env.local.");
  }
  return new Error("Gemini could not complete this request. Please try again.");
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function explainFile(input: FileInput, deps: { cache: Cache; source: SourceOf }): Promise<Explanation> {
  const model = MODELS.explain;
  const run = traceable(async (question: FileInput): Promise<Explanation> => {
    const key = cacheKey("explain-file", model, question);
    const hit = await deps.cache.read(key);
    if (hit !== null) return { body: hit, model, cached: true };
    const body = await complete(model, EXPLAIN_FILE_SYSTEM, explainFileMessage(question, capped(await deps.source())));
    await deps.cache.write({ key, task: "explain-file", model, body });
    return { body, model, cached: false };
  }, traceConfig("explain-file"));
  return run(input);
}

function stripJsonFences(content: string): string {
  return content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
}

export async function explainFolder(input: FolderInput, deps: { cache: Cache }): Promise<Explanation> {
  const model = MODELS.explain;
  const run = traceable(async (question: FolderInput): Promise<Explanation> => {
    const key = cacheKey("explain-folder", model, question);
    const hit = await deps.cache.read(key);
    if (hit !== null) return { body: hit, model, cached: true };
    const body = await complete(model, EXPLAIN_FOLDER_SYSTEM, explainFolderMessage(question));
    await deps.cache.write({ key, task: "explain-folder", model, body });
    return { body, model, cached: false };
  }, traceConfig("explain-folder"));
  return run(input);
}

export async function askRepository(input: { question: string; context: string }, deps: { cache: Cache }): Promise<RepositoryAnswer> {
  const model = MODELS.explain;
  const run = traceable(async (question: typeof input): Promise<RepositoryAnswer> => {
    const key = cacheKey("ask-repository", model, question);
    const hit = await deps.cache.read(key);
    if (hit !== null) return { body: hit, model, cached: true };
    const body = await complete(model, ASK_REPOSITORY_SYSTEM, askRepositoryMessage(question));
    await deps.cache.write({ key, task: "ask-repository", model, body });
    return { body, model, cached: false };
  }, traceConfig("ask-repository"));
  return run(input);
}

// "none" is a real answer, and cached like any other: the model wasn't made
// to pick something when nothing fits, and the file stays unclassified.
const NONE = "none";

export async function classifyFile(input: ClassifyInput, deps: { cache: Cache; source: SourceOf }): Promise<{ role: ModelRole | null; cached: boolean }> {
  const model = MODELS.classify;
  const run = traceable(async (question: ClassifyInput): Promise<{ role: ModelRole | null; cached: boolean }> => {
    const key = cacheKey("classify-file", model, question);
    const hit = await deps.cache.read(key);
    if (hit !== null) return { role: parseRole(hit), cached: true };
    const excerpt = (await deps.source()).split("\n").slice(0, EXCERPT_LINES).join("\n");
    const messages = [
      { role: "system" as const, content: CLASSIFY_SYSTEM },
      { role: "user" as const, content: classifyMessage(question, excerpt) },
    ];
    const answer = await classifyWithRetry(model, messages);
    // Parsed before caching, so a refused answer is never stored and served.
    const role = parseRole(answer);
    await deps.cache.write({ key, task: "classify-file", model, body: answer });
    return { role, cached: false };
  }, traceConfig("classify-file"));
  return run(input);
}

function parseRole(answer: string): ModelRole | null {
  if (answer === NONE) return null;
  // Structural roles aren't in the schema, but the answer is checked rather
  // than trusted: convention alone decides what's routable.
  if (!isModelRole(answer)) throw new Error(`The model answered the role "${answer}", which it isn't allowed to give`);
  return answer;
}

function readRole(content: string | null): string {
  if (!content) throw new Error("The model returned no role");
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripJsonFences(content));
  } catch {
    throw new Error("The model returned invalid JSON for the file role");
  }
  const role: unknown = typeof parsed === "object" && parsed !== null ? Reflect.get(parsed, "role") : undefined;
  if (typeof role !== "string") throw new Error("The model's JSON answer had no role");
  return role;
}

async function complete(model: string, system: string, user: string): Promise<string> {
  const response = await withRetries(() =>
    ai().chat.completions.create({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  );
  const body = response.choices[0]?.message.content?.trim();
  if (!body) throw new Error(`${model} returned an empty answer (finish reason: ${response.choices[0]?.finish_reason ?? "none"})`);
  return body;
}

function capped(source: string): string {
  if (source.length <= MAX_SOURCE_CHARS) return source;
  const kept = source.slice(0, MAX_SOURCE_CHARS);
  return `${kept}\n[… source truncated here: ${source.length - MAX_SOURCE_CHARS} more characters not shown]`;
}
