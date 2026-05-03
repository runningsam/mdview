# MDView - Markdown Preview Service

Upload markdown files and get shareable preview URLs.

## AI Agent Skill

Let your AI coding agent (Claude Code, Codex, pi, etc.) upload markdown to MDView and get preview URLs — just by asking.

The skill lives in `.pi/skills/mdview/` and includes everything needed:
- `SKILL.md` — instructions for the agent
- `scripts/upload.sh` — a helper script for uploading files from the terminal
- `scripts/README.md` — script documentation

### Installation

Choose your AI agent harness:

**Claude Code** — add to `~/.claude/settings.json`:
```json
{
  "skills": ["/path/to/mdview/.pi/skills"]
}
```

**pi** — auto-discovered from `.pi/skills/` when you open this project directory. Or add to `.pi/settings.json`:
```json
{
  "skills": ["/absolute/path/to/mdview/.pi/skills"]
}
```

**Codex** — add to `~/.codex/config.json`:
```json
{
  "skills": ["/path/to/mdview/.pi/skills"]
}
```

### Usage

Once installed, tell your agent:

> "Upload README.md to MDView at https://mdview.code123.in"

The agent will read the file, POST to your MDView `/api/upload` endpoint, and return the public URL.

You can also use the upload script directly:
```bash
.pi/skills/mdview/scripts/upload.sh https://mdview.code123.in README.md
```

## Features

- Upload .md files → get random, unguessable URLs
- URLs expire after 7 days
- Max file size: 1MB
- Syntax highlighting for code blocks
- Mobile-friendly responsive design

## Tech Stack

- **Cloudflare Pages** - Frontend hosting
- **Cloudflare Pages Functions** - API endpoints
- **Cloudflare KV** - Document storage (with TTL)
- **marked** - Markdown parsing
- **highlight.js** - Code syntax highlighting

## Project Structure

```
mdview/
├── public/
│   ├── index.html      # Upload page
│   ├── style.css       # Styles
│   └── app.js          # Frontend logic
├── functions/
│   ├── api/
│   │   └── upload.js   # Upload endpoint
│   └── v/
│       └── [id].js     # View endpoint
├── .pi/
│   └── skills/
│       └── mdview/            # AI agent skill (for others to use)
│           ├── SKILL.md
│           └── scripts/
│               ├── README.md
│               └── upload.sh
├── package.json
├── wrangler.toml       # Cloudflare config
└── README.md
```

## Local Development

```bash
# Install dependencies
npm install

# Create KV namespace (local)
wrangler kv:namespace create mdview-kv --preview

# Update wrangler.toml with the preview ID

# Run dev server
npm run dev
```

## Deployment

### 1. Create Cloudflare KV Namespace

```bash
wrangler kv:namespace create mdview-kv
```

Copy the `id` from output and update `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "MDVIEW_KV"
id = "your_actual_kv_id_here"
```

### 2. Deploy to Cloudflare Pages

```bash
# Deploy
wrangler pages deploy public --project-name mdview

# Or use npm script
npm run deploy
```

### 3. Configure Functions

Cloudflare Pages Functions are automatically deployed from the `functions/` directory.

## API Endpoints

### POST /api/upload

Upload a markdown file.

**Request:**
```json
{
  "content": "# Hello World\n\nThis is markdown...",
  "filename": "document.md"
}
```

**Response:**
```json
{
  "id": "abc123",
  "url": "https://your-domain.pages.dev/v/abc123",
  "expires": "2026-04-04T00:00:00Z"
}
```

### GET /v/[id]

View a markdown document.

Returns rendered HTML with syntax highlighting.

## Environment Variables

Configure in Cloudflare Pages Settings:

| Variable | Default | Description |
|----------|---------|-------------|
| MAX_FILE_SIZE | 1048576 | Max file size in bytes (1MB) |
| TTL_DAYS | 7 | Document expiration days |

## Security

- Random 8-char IDs (cryptographically secure)
- Content validation (size limit, type check)
- Automatic expiration (KV TTL)
- No authentication required (public service)

## Cost

Cloudflare Pages + KV free tier:
- Pages: Unlimited requests
- KV: 100,000 reads/day, 1,000 writes/day

For higher usage, consider upgrading to Workers Paid plan.

## License

MIT