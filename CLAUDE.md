@AGENTS.md

# CLAUDE.md — andres-ai-app

Next.js 16 frontend that serves both the **chat UI at `/`** and the **admin at `/admin`**. The backend (FastAPI) lives in `../andres-ai-api/`.

## Stack

- **Next.js 16** (App Router, Turbopack, React 19)
- **TypeScript 5**
- **Tailwind v4** + **shadcn/ui** (Radix-based components, Nova preset)
- **TanStack Table**, **react-hook-form**, **zod**, **sonner**
- **marked** for chat message rendering

## Commands

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm build
pnpm start
pnpm lint
```

This project uses **pnpm** (declared via the `packageManager` field in `package.json`). Build script approvals live in `pnpm-workspace.yaml` (`allowBuilds`). Do not commit a `package-lock.json` — only `pnpm-lock.yaml` is the source of truth.

## Routes

- `/` — chat UI (route group `(chat)`). Uses the original cyberpunk CSS verbatim (`src/app/chat.css`) and Orbitron/Exo 2 fonts loaded from Google Fonts.
- `/admin` — admin overview (under route group `(dashboard)` which wraps in `AdminShell` and enforces auth).
- `/admin/users`, `/admin/messages`, `/admin/agent-messages`, `/admin/knowledge-base`, `/admin/agent-contexts`.
- `/admin/login` — login page (sibling of `(dashboard)`, not wrapped by the shell so unauthenticated users can reach it).

## Talking to the API

Configured via `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:8000` for local dev). See `.env.local.example`.

- **Chat**: `Authorization: User-Id <uuid>` + `X-Browser-Id: <uuid>` headers; UUIDs in `localStorage` (`src/lib/storage.ts`).
- **Admin**: backend issues a JWT in an httpOnly cookie on `/api/admin/login`. All admin calls use `credentials: "include"`. See `src/lib/admin-api.ts`.

The backend must allow this origin via its `FRONTEND_ORIGINS` env var and must set `SameSite=None; Secure` on the admin cookie (already configured) so the cookie survives the cross-origin admin flow.

## Layout/CSS isolation

- Root `layout.tsx` loads `globals.css` (shadcn theme) and the Sonner `Toaster`.
- `(chat)/layout.tsx` additionally loads `chat.css` and the Google Fonts. The chat CSS uses global selectors like `html, body { overflow: hidden }` — Next.js scopes the CSS bundle to the route group, so it only affects the chat page.

## Deployment

Vercel auto-detects this as a Next.js app. `vercel.json` pins the framework and adds `X-Robots-Tag: noindex` for `/admin/*`. Required env vars listed in `.env.local.example`.
