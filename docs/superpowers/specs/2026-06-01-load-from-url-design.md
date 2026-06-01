# Load Markdown from URL Design

**Date:** 2026-06-01
**Status:** Approved

## Summary

Let users create a preview by giving MDView a remote **URL** instead of pasting/uploading file content. The server fetches the markdown, then reuses the existing "store in KV → render at `/v/:id`" pipeline. Two entry points share one fetch module:

- **Web UI** — a "from URL" input on the homepage
- **API** — `POST /api/upload` accepts an optional `url` parameter

The browser never fetches the remote URL (that would hit CORS on most sites). The fetch happens server-side in the Pages Function, which is why SSRF protection matters.

## Data Flow

```
homepage URL input ─┐
                    ├─→ POST /api/upload { url }
curl / AI agent ────┘            │
                                 ▼
                  fetchRemoteMarkdown(url, env)   (functions/lib/fetch-remote.js)
                                 │  returns { content, filename }
                                 ▼
              (existing) size check → store in KV → return { id, url }
```

`/api/upload` accepts **either `content` or `url`** (exactly one). When `url` is present, the function calls `fetchRemoteMarkdown`, then feeds the returned `content` + `filename` into the existing storage logic. TTL, slug, expiration, and the response shape are unchanged.

## New File: `functions/lib/fetch-remote.js`

A single exported function `fetchRemoteMarkdown(url, env)` → `Promise<{ content, filename }>`, throwing a `FetchRemoteError` with a user-safe message on any failure. Pure logic except for `fetch`, so it can be unit-tested.

Steps, in order:

| Step | Rule |
|------|------|
| Parse | Reject if not a valid absolute URL → `invalid url` |
| Protocol | Only `https:` allowed (reject `http:`, `file:`, `data:`, etc.) → `url must be https` |
| Host | Reject literal private/reserved IPs, `localhost`, `*.local`, `0.0.0.0`, `169.254.x` (metadata), IPv6 loopback/ULA → `url host not allowed` |
| Fetch | `redirect: 'manual'`; manually follow up to **3** redirects; re-run protocol + host check on every hop → too many redirects / blocked host |
| Timeout | `AbortController`, 5 seconds → `failed to fetch url (timeout)` |
| Status | Non-2xx → `failed to fetch url (status N)` |
| Size | Stream/read the body, abort once bytes exceed `MAX_FILE_SIZE` (default 1MB). Do not trust `Content-Length` → `remote file too large` |
| Content | Decode as UTF-8 text. Do **not** require a specific `Content-Type` (raw md is often `text/plain`) |
| Filename | Last non-empty path segment (e.g. `README.md`); else hostname; else `document.md` |

### Host validation detail

Check the hostname after each redirect hop:
- Lowercase, strip brackets for IPv6.
- If it parses as an IPv4 literal: reject `10/8`, `127/8`, `169.254/16`, `172.16/12`, `192.168/16`, `0/8`.
- If it parses as an IPv6 literal: reject `::1`, `fc00::/7` (ULA), `fe80::/10` (link-local), and IPv4-mapped forms of the above.
- Reject exact `localhost` and any host ending in `.local`.

Note: Cloudflare's `fetch` runs at the edge and generally cannot route to private networks, so this is defense-in-depth — but redirect-to-internal and using us as an anonymous proxy are still worth blocking explicitly.

## Modified File: `functions/api/upload.js`

- After parsing the body, branch: if `url` is a non-empty string and `content` is absent, call `fetchRemoteMarkdown(url, env)` and use its `content` + `filename` (caller-supplied `filename` still wins if provided).
- If both `content` and `url` are present, or neither → `400 { error: "provide either content or url" }`.
- `FetchRemoteError` → return its message as a `400` (not the current catch-all `500`).
- Everything after obtaining `content` (size check, TTL, slug, KV put, response) is unchanged.

## Web Frontend: `public/index.html` + `public/app.js`

- Add a small segmented toggle / second panel under the drop zone: **Upload file | From URL**.
- "From URL" shows a text input (`type="url"`, placeholder `https://…/README.md`) and a "Load" button.
- On submit: `POST /api/upload { url }`; on success call the existing `showResult(data.url)`; on error `alert` the server message. Reuse the existing `progress` / `result` show/hide states.
- The existing read-only `preview-url` field and copy/view flow are untouched.

## API / Skill Docs

Update `public/skill/SKILL.md` parameter table to document `url` (optional; mutually exclusive with `content`) and add a one-line curl example:

```
curl -s -X POST https://mdview.code123.in/api/upload \
  -H "Content-Type: application/json" \
  -d '{"url":"https://raw.githubusercontent.com/owner/repo/main/README.md"}'
```

## Error Handling

All remote-fetch failures surface as `400` with a short, user-readable `error` string. The frontend alerts it verbatim. Possible messages: `invalid url`, `url must be https`, `url host not allowed`, `too many redirects`, `failed to fetch url (timeout)`, `failed to fetch url (status N)`, `remote file too large`.

## Defaults (decided)

- Only `https://` accepted; `http://` rejected.
- Follow at most 3 redirects, re-validating host on each.
- 5-second fetch timeout; 1MB size cap (reuses `MAX_FILE_SIZE`).
- No `Content-Type` enforcement — any text body is accepted.

## Testing

No test runner exists in the repo today. `fetch-remote.js` is written to be testable in isolation (logic separated from `fetch`); validation helpers (protocol check, host check, filename derivation) are exported for a future lightweight test. Primary verification for this change is manual via `npm run dev`:
- valid `https` raw URL → preview renders
- `http://` URL → 400 `url must be https`
- `http://localhost:8080` / private IP → 400 `url host not allowed`
- oversized remote file → 400 `remote file too large`
- both `content` and `url` → 400
