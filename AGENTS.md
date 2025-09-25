# Repository Guidelines

## Project Structure & Module Organization
- App Router code lives in `src/app` (pages, API routes). Example: `src/app/v1/chat/completions/route.ts`.
- UI components in `src/components` (PascalCase `.tsx`). Shared utilities in `src/lib`. Types in `src/types`.
- Static assets in `public/`. Supabase SQL, migrations, and edge functions in `supabase/`.
- Examples and helper scripts in `examples/` and `scripts/`.

## Build, Test, and Development Commands
- `npm run dev` — Start local dev server on `http://localhost:8080` (Turbopack).
- `npm run build` — Production build via Next.js.
- `npm start` — Run the production server.
- `npm run lint` — Lint with ESLint (`next/core-web-vitals`, TS).
Example: `NODE_ENV=production npm run build && npm start`.

## Coding Style & Naming Conventions
- Language: TypeScript (strict). Framework: Next.js App Router.
- Indentation: 2 spaces; keep imports sorted and use `@/*` path alias from `tsconfig.json`.
- Components: PascalCase (`src/components/FeatureGrid.tsx`). Folders and route segments: kebab/lowercase (`src/app/api/usage/route.ts`).
- Prefer server-first data access in route handlers; keep side effects in `src/lib` helpers.
- Linting: Fix warnings before merging (`npm run lint`). Tailwind v4 via PostCSS.

## Testing Guidelines
- No JS unit test runner is configured yet; rely on linting plus manual and API testing.
- For API endpoints, use `curl` or the OpenAI client pointed at our base URL. Example:
  `curl -X POST http://localhost:8080/v1/chat/completions -H "Authorization: Bearer edgar_..." -H "Content-Type: application/json" -d '{"model":"gpt-5","messages":[{"role":"user","content":"hi"}]}'`
- Optional: `examples/openai_python_example.py` demonstrates end‑to‑end usage.

## Commit & Pull Request Guidelines
- Commits: Present tense, concise, scoped. Example: `dashboard: add API key management` or `api: enforce billing cycle limits`.
- PRs: Include a clear description, motivation, and testing notes. Link related issues. Add screenshots/GIFs for UI changes.
- Keep PRs focused and small; update docs when changing behavior or endpoints.

## Security & Configuration Tips
- Required env vars (local/production): `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXT_PUBLIC_SUPABASE_URL`/`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE`, provider keys (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`).
- Stripe integration lives in `supabase/functions/stripe-webhook*` with schema/migrations under `supabase/`; see `STRIPE_INTEGRATION_README.md`.
- Never commit secrets. Use `.env.local` for development and provider secrets in deployment settings.
