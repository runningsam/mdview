---
name: mdview
description: Upload markdown files to MDView to get shareable preview URLs with syntax highlighting. Use when the user wants to share, publish, or get a public preview link for markdown content — .md files, documentation, READMEs, code-heavy notes, or any text they want to share with a URL. The upload creates a random unguessable link that auto-expires after 7 days.
---

# MDView — Markdown Preview Sharing

MDView is a markdown sharing service. You upload markdown, and it gives you a public URL where the markdown is rendered with syntax highlighting and responsive design. No account needed, no login. Links are unguessable and auto-expire.

## Quick Start

No setup — just HTTP POST your markdown:

```bash
# Get the base URL from the user (e.g. https://mdview.example.com)
curl -s -X POST <BASE_URL>/api/upload \
  -H "Content-Type: application/json" \
  -d '{"content": "# Hello\n\nThis is **markdown**.", "filename": "hello.md"}'
```

The `mdview-upload` helper script is also included in this skill directory — see [scripts/](scripts/) for usage.

## Prerequisites

You need the MDView **base URL**. This is the URL where the MDView service is deployed. Ask the user for it. Common answers:

- The public MDView instance: `https://mdview.code123.in`
- Local development: `http://localhost:8788`

## API

### POST /api/upload

Upload markdown and get a public preview URL.

**Request body (JSON):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `content` | string | **Yes** | Raw markdown text |
| `filename` | string | No | Display name on the preview page |

**Success (200):**

```json
{
  "id": "aB3xK7mQ",
  "url": "https://mdview.code123.in/v/aB3xK7mQ",
  "expires": "2026-05-10T12:00:00Z"
}
```

**Errors:**

| Status | Body | Meaning |
|--------|------|---------|
| 400 | `{"error": "Invalid content"}` | `content` is missing or not a string |
| 400 | `{"error": "File too large (max 1MB)"}` | Content exceeds the size limit |
| 500 | `{"error": "Internal error"}` | Server failure |

**Limits:**

- **Size:** 1MB max per upload
- **Lifespan:** 7 days, then auto-deleted

### GET /v/:id

View the rendered document in a browser. The page includes syntax highlighting (highlight.js), Tailwind CSS styling, and shows the filename + expiration date.

## Workflow

When the user asks to share or publish markdown:

### Step 1: Ask for the base URL

If not already known, ask: **"What's your MDView base URL?"** Wait for the answer before proceeding.

### Step 2: Get the markdown content

- If the user specifies a file, read it with the `read` tool
- If the user pastes markdown inline, use it directly
- If the user says "this file" or "the README", read the relevant file

### Step 3: Upload

Use the helper script from this skill for safe JSON encoding:

```bash
python3 <(cat <<'PYEOF'
import json, sys
content = open(sys.argv[1]).read()
print(json.dumps({"content": content, "filename": sys.argv[2]}))
PYEOF
) /path/to/file.md file.md | curl -s -X POST <BASE_URL>/api/upload -H "Content-Type: application/json" -d @-
```

Or, for inline content (where you have the text in a variable), write a temp file and pipe it.

Alternatively, use the `mdview-upload` script included with this skill:

```bash
/path/to/mdview-skill/scripts/upload.sh <BASE_URL> <FILE>
```

### Step 4: Report the result

Present the `url` to the user. Include the expiration date so they know the link won't last forever.

## Scripts

This skill includes a helper script for uploading files:

- `scripts/upload.sh` — Uploads a local markdown file and prints the preview URL

See [scripts/README.md](scripts/README.md) for details.

## Security Notes

- No authentication — anyone with the URL can view it
- URLs are unguessable: 8 random characters from a 62-char set = ~218 trillion combinations
- Auto-expire: documents are deleted from storage after the TTL (default 7 days)
- No sanitization: HTML in markdown is passed through by the renderer
