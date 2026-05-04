---
name: mdview
description: Upload markdown files to MDView (https://mdview.code123.in) to get shareable preview URLs with syntax highlighting. Use when the user wants to share, publish, or get a public preview link for markdown content — .md files, documentation, READMEs, code-heavy notes, or any text they want to share with a URL. The upload creates a random unguessable link that auto-expires after 7 days.
---

# MDView — Markdown Preview Sharing

MDView is a markdown sharing service at **https://mdview.code123.in**. You upload markdown, and it gives you a public URL where the markdown is rendered with syntax highlighting and responsive design. No account needed, no login. Links are unguessable and auto-expire.

## Quick Start

No setup — just HTTP POST your markdown:

```bash
curl -s -X POST https://mdview.code123.in/api/upload \
  -H "Content-Type: application/json" \
  -d '{"content": "# Hello\n\nThis is **markdown**.", "filename": "hello.md"}'
```

This skill also includes a helper script — see `scripts/upload.sh`.

## API

### POST /api/upload

Upload markdown and get a public preview URL.

**Base URL:** `https://mdview.code123.in`

**Request body (JSON):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `content` | string | **Yes** | Raw markdown text |
| `filename` | string | No | Display name on the preview page |
| `ttl` | number | No | Retention in days (1-90, default 7) |
| `slug` | string | No | Custom URL path, e.g. `my-doc` → `/v/my-doc`. 1-64 chars: a-z, A-Z, 0-9, -, _, . |

**Success (200):**

```json
{
  "id": "aB3xK7mQ",
  "url": "https://mdview.code123.in/v/aB3xK7mQ",
  "expires": "2026-05-10T12:00:00Z",
  "ttlDays": 7
}
```

**Errors:**

| Status | Body | Meaning |
|--------|------|---------|
| 400 | `{"error": "Invalid content"}` | `content` is missing or not a string |
| 400 | `{"error": "File too large (max 1MB)"}` | Content exceeds the size limit |
| 400 | `{"error": "slug must be 1-64 chars: a-z, A-Z, 0-9, -, _, ."}` | Invalid slug format |
| 400 | `{"error": "slug is reserved"}` | Slug conflicts with a system path |
| 409 | `{"error": "slug already taken"}` | Slug already exists (choose another) |
| 500 | `{"error": "Internal error"}` | Server failure |

**Limits:**

- **Size:** 1MB max per upload
- **Lifespan:** 1-90 days (default 7), set via `ttl` field

### GET /v/:id

View the rendered document in a browser. The page includes syntax highlighting (highlight.js), Tailwind CSS styling, and shows the filename + expiration date.

## Workflow

When the user asks to share or publish markdown:

### Step 1: Get the markdown content

- If the user specifies a file, read it with the `read` tool
- If the user pastes markdown inline, use it directly
- If the user says "this file" or "the README", read the relevant file

### Step 2: Upload via curl

For files, use the helper script included with this skill:

```bash
<SKILL_DIR>/scripts/upload.sh https://mdview.code123.in /path/to/file.md
```

Or construct the curl command directly — use Python for safe JSON encoding of arbitrary markdown:

```bash
python3 -c "
import json, sys
content = open('/path/to/file.md').read()
print(json.dumps({'content': content, 'filename': 'file.md'}))
" | curl -s -X POST https://mdview.code123.in/api/upload -H "Content-Type: application/json" -d @-
```

For short inline content, a direct curl works:

```bash
curl -s -X POST https://mdview.code123.in/api/upload \
  -H "Content-Type: application/json" \
  -d '{"content": "# Hello\n\nSome markdown.", "filename": "note.md"}'
```

### Step 3: Report the result

Extract `url` from the JSON response and present it to the user. Include the `expires` date.

## Scripts

- `scripts/upload.sh <BASE_URL> <FILE>` — Upload a local file and print the URL
