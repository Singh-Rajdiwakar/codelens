# Codelens

**Codelens** is a codebase dependency mapper for public TypeScript and
JavaScript repositories.

**Project owner:** Singh Rajdiwakar

It parses real source code and draws an interactive dependency map. Files and
edges come from the parser, not from AI guesses. The AI can explain verified
code facts, but it never invents a dependency relationship.

## What Codelens does

- Accepts a public GitHub repository for analysis.
- Parses TypeScript and JavaScript files with `ts-morph`.
- Resolves imports, re-exports, dynamic imports and `require()` calls.
- Displays folders and files as an interactive React Flow map.
- Shows fan-in, fan-out, imports and importers for each file.
- Calculates dependency chains and blast radius from the real graph.
- Detects framework conventions, routes and file roles.
- Reports skipped files and unresolved imports instead of hiding them.
- Explains files and folders using verified parser context.
- Provides an Ask panel for repository questions in grounded English or
  Hinglish.
- Supports Clerk organizations and Supabase row-level security.
- Caches AI answers and traces model calls with LangSmith.

## Core rule

**Every node and edge must come from parsing the code.**

AI is used only for explanation and optional classification. It cannot create
files, edges, routes or relationships that are absent from the parsed
analysis. Graph calculations are deterministic functions over parser output.

## Technology stack

- **Next.js 16 App Router** — full-stack application and server actions.
- **React 19** — user interface.
- **TypeScript 5** — strict typing.
- **ts-morph** — TypeScript compiler API wrapper for parsing.
- **React Flow** — interactive dependency canvas.
- **dagre** — graph layout.
- **Tailwind CSS v4** — styling and design tokens.
- **Lucide React** — interface icons.
- **Clerk** — sign-in and organization membership.
- **Supabase Postgres** — analyses, files, edges, routes, roles and cache.
- **OpenAI SDK with Gemini compatibility** — Google Gemini model calls through
  the OpenAI-compatible endpoint.
- **LangSmith** — optional AI tracing and observability.

## Architecture

```text
Public GitHub repository
          |
          v
GitHub fetch + temporary workspace
          |
          v
Standalone parser and framework adapters
          |
          v
Files + real edges + routes + coverage
          |
          +--> Supabase Postgres with organization RLS
          |
          +--> React Flow map and detail panels
          |
          +--> Grounded Gemini explanations and Ask answers
```

### Parser

The parser is independent of Next.js, React and the database. It receives a
directory path and returns parsed files, resolved edges, routes and coverage.
Skipped files and unresolved imports are reported with reasons.

### Graph

Graph helpers are pure functions. They calculate adjacency, neighbours,
folded folders, ranking, insights, dependency chains and blast radius from
files and edges already produced by the parser.

### AI

The application constructs the AI client in one place:

```text
Google Gemini OpenAI-compatible endpoint
https://generativelanguage.googleapis.com/v1beta/openai/
```

AI answers are grounded with stored analysis facts. The cache key includes the
task, prompt version, model and input. Rate limits and temporary server errors
use retries with backoff; user-facing errors never expose API keys.

### Authentication and data isolation

Clerk provides identity and organization membership. Supabase stores analysis
data and applies organization-level Row Level Security. The application does
not rely on a UI-only filter to protect another organization's data.

## Main user flow

1. Sign in with Clerk.
2. Select or create an organization.
3. Submit a public GitHub repository URL.
4. Watch parsing progress: fetch, select, parse and store.
5. Open the dependency map.
6. Expand folders and select files.
7. Inspect imports, importers, routes and blast radius.
8. Use **Explanation** for a grounded file/folder explanation.
9. Use **Overview** for repository statistics and graph insights.
10. Use **Ask** to ask repository questions in English or Hinglish.

## Project structure

```text
app/
  (workspace)/             Authenticated workspace pages and analysis routes
  sign-in/                 Clerk sign-in route
  sign-up/                 Clerk sign-up route
  error.tsx                Root error boundary
  loading.tsx              Root loading UI
  globals.css              Design tokens and global styles
  layout.tsx               Fonts, metadata and Clerk provider

components/
  analysis-view.tsx        Shared map, rail and detail state
  detail-pane.tsx          Overview, Ask and selected-file details
  map/                     React Flow canvas, nodes and edges
  progress/                Analysis progress timeline
  category-rail.tsx        File category navigation
  explanation-panel.tsx    Grounded AI explanation UI
  route-table.tsx          Recovered route table
  shell.tsx                Responsive three-column layout

lib/
  ai/                      Gemini client, prompts and AI tasks
  analysis/                Stored analysis loading and AI context creation
  graph/                   Pure graph calculations and layout helpers
  parser/                  AST parsing types, contracts and adapters
  pipeline/                GitHub fetching and analysis pipeline
  supabase/                Server/admin clients and generated database types
  env.ts                   Environment validation
  roles.ts                 File-role definitions
  theme.ts                 System/light/dark theme handling

scripts/
  analyze.ts               Run an analysis workflow
  parse.ts                 Run the standalone parser
  eval.ts                  Evaluate or inspect available roles
  insights.ts              Print graph insights
  map-counts.ts            Print map counts

supabase/
  migrations/              Database schema, policies and cache migrations

docs/
  project-doc.md            Product principles and architecture decisions
  specs/                    Phase specifications

.agents/
  skills/                  Agent guidance, including Supabase practices
```

## Requirements

- Node.js
- pnpm
- Git
- A Clerk application
- A Supabase project
- A Google AI Studio Gemini API key for AI features
- Optional LangSmith account for tracing

## Installation

```powershell
git clone <your-repository-url> codelens
cd codelens
pnpm install
```




## Run locally

```powershell
pnpm dev
```

Open `http://localhost:3000`.

For production mode:

```powershell
pnpm build
pnpm start
```

## Available commands

```powershell
pnpm dev
pnpm lint
pnpm build
pnpm start
pnpm parse
pnpm analyze
pnpm eval role
pnpm insights
pnpm map-counts
```

Run `pnpm lint` and `pnpm build` after code changes. Browser acceptance checks
should be performed manually in the application.

## Supabase and agent folders

The `.agents/skills/` folder contains instructions for the coding assistant,
not application runtime code. For example, the Supabase skill explains:

- how to verify current Supabase documentation before changes;
- how to create safe migrations;
- how to use Row Level Security correctly;
- how to protect service-role keys;
- how to avoid unsafe JWT metadata authorization;
- how to handle constraints, indexes and permissions;
- how to verify database changes.

Deleting `.agents/` does not stop Codelens from running, but future AI coding
sessions will not have those specialized instructions.

The `supabase/migrations/` folder is different: it contains actual database
schema and policy history and must be preserved.

## Security notes

- `.env.local` is ignored and must never be committed.
- Never expose `SUPABASE_SECRET_KEY` or other server-only credentials to the
  browser.
- Public repository support does not mean private repository tokens are stored.
- Supabase RLS controls organization data access.
- AI prompts are grounded in parser output.
- Raw provider responses and secret values are not shown to users.

## Project principles

- Missing information is better than an invented relationship.
- The parser must remain independent from the web framework and database.
- Graph calculations must remain deterministic and pure.
- Route results are shown only when the method and full path are recovered.
- Codelens explains a codebase; it does not score or grade it.
- One obvious implementation is preferred over unnecessary configuration.
