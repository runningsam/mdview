# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Local dev server (Cloudflare Pages + Functions)
npm run build:css  # Compile Tailwind → public/tailwind.css (used classes only, minified)
npm run watch:css  # Rebuild tailwind.css on change during local dev
npm run deploy     # Build CSS, then deploy to Cloudflare Pages
```

The only build step is the Tailwind CSS compile. `public/tailwind.css` is committed (so a bare
`public/` deploy works), and `npm run deploy` regenerates it first so it never goes stale.
Tailwind (v3) scans `public/**/*.{html,js}` and `functions/**/*.js` for class names — see
`tailwind.config.cjs`. Source is `src/input.css`. Everything else in `public/` is served as-is.

## Architecture

MDView is a **Cloudflare Pages** app with **Pages Functions** for the API. There is no framework; the frontend is vanilla JS served from `public/`.

**Request flow:**
- `GET /` → `public/index.html` + `public/app.js` — drag-and-drop upload UI
- `POST /api/upload` → `functions/api/upload.js` — stores markdown in KV, returns `{id, url, expires, ttlDays}`
- `GET /v/:id` → `functions/v/[id].js` — reads from KV, returns full HTML with rendered markdown (marked + highlight.js loaded from CDN)

**Storage:** Cloudflare KV namespace bound as `MDVIEW_KV`. Each document is stored as JSON: `{content, filename, created, expires, ttlDays}`. KV's native `expirationTtl` handles deletion; `ttl=0` stores without expiration.

**Upload parameters** (`POST /api/upload`):
- `content` (required) — raw markdown string
- `filename` — display name
- `ttl` — days (1–365, default 7, `0` = forever)
- `slug` — custom URL path (1–64 chars: `a-z A-Z 0-9 - _ .`); random 8-char ID generated if omitted; 409 if slug already taken

**Environment vars** (set in `wrangler.toml` or Cloudflare dashboard):
- `MAX_FILE_SIZE` — bytes, default 1048576 (1MB)
- `TTL_DAYS` — default expiration, default 7
- `MAX_TTL_DAYS` — cap on user-supplied TTL, default 365

## AI Agent Skill

`public/skill/` contains a distributable skill for AI agents (Claude Code, Codex, pi, etc.) to upload files to the live MDView service. `public/install.sh` is a one-liner installer. When editing the skill, update `public/skill/SKILL.md` — that file is what agents read.
