# Print Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a clean distraction-free page at `/p/:id` that renders markdown without any navigation UI, and add a "打印版" button to the existing `/v/:id` preview page linking to it.

**Architecture:** New Pages Function `functions/p/[id].js` reads the same KV data as `[id].js` and renders bare HTML with inline CSS. `functions/v/[id].js` is modified to pass `id` into `renderPreview` so a button can link to `/p/${id}`.

**Tech Stack:** Cloudflare Pages Functions, KV, marked (npm), highlight.js (CDN)

---

## File Map

| Action | Path | Change |
|--------|------|--------|
| Create | `functions/p/[id].js` | New clean-render Pages Function |
| Modify | `functions/v/[id].js` | Pass `id` to `renderPreview`; add "打印版" button |

---

### Task 1: Create `functions/p/[id].js`

**Files:**
- Create: `functions/p/[id].js`

- [ ] **Step 1: Create the file with full implementation**

```js
import { marked } from 'marked';

export async function onRequestGet(context) {
    const { env, params } = context;
    const id = params.id;

    if (!id || id.length < 1 || id.length > 64) {
        return renderError('Invalid document ID');
    }

    try {
        const dataStr = await env.MDVIEW_KV.get(id);

        if (!dataStr) {
            return renderError('Document not found or expired');
        }

        const data = JSON.parse(dataStr);

        marked.setOptions({ breaks: true, gfm: true });

        const htmlContent = await marked.parse(data.content);

        return renderPrint(htmlContent, data.filename);

    } catch (error) {
        return renderError('Error loading document');
    }
}

function renderPrint(html, filename) {
    return new Response(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${filename}</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/github.min.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/highlight.min.js"></script>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 16px;
            line-height: 1.7;
            color: #1e293b;
            background: #fff;
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem 1.5rem;
        }
        h1 { font-size: 1.75rem; font-weight: 700; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.5rem; margin: 0 0 1rem; }
        h2 { font-size: 1.375rem; font-weight: 600; margin: 1.5rem 0 0.75rem; }
        h3 { font-size: 1.125rem; font-weight: 600; margin: 1rem 0 0.5rem; }
        h4, h5, h6 { font-weight: 600; margin: 0.75rem 0 0.5rem; }
        p { margin: 1rem 0; }
        a { color: #4f46e5; }
        code { background: #f1f5f9; padding: 0.2rem 0.4rem; border-radius: 4px; font-size: 0.875em; }
        pre { background: #f1f5f9; padding: 1rem; border-radius: 8px; overflow-x: auto; margin: 1rem 0; }
        pre code { background: none; padding: 0; font-size: 0.875rem; }
        blockquote { border-left: 4px solid #4f46e5; margin: 1rem 0; padding-left: 1rem; color: #64748b; }
        ul, ol { margin: 1rem 0; padding-left: 1.5rem; }
        img { max-width: 100%; height: auto; border-radius: 8px; }
        table { border-collapse: collapse; width: 100%; margin: 1rem 0; font-size: 0.9rem; }
        th, td { border: 1px solid #e2e8f0; padding: 0.5rem 0.75rem; text-align: left; }
        th { background: #f8fafc; font-weight: 600; }
        hr { border: none; border-top: 1px solid #e2e8f0; margin: 1.5rem 0; }
    </style>
</head>
<body>
    <div class="markdown-body">
        ${html}
    </div>
    <script>hljs.highlightAll();</script>
</body>
</html>`, {
        status: 200,
        headers: {
            'Content-Type': 'text/html',
            'Cache-Control': 'public, max-age=3600',
        },
    });
}

function renderError(message) {
    return new Response(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Error</title>
    <style>
        body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f8fafc; }
        .box { text-align: center; padding: 2rem; }
        p { color: #64748b; }
        a { color: #4f46e5; }
    </style>
</head>
<body>
    <div class="box">
        <p>${message}</p>
        <a href="/">Back to home</a>
    </div>
</body>
</html>`, {
        status: 404,
        headers: { 'Content-Type': 'text/html' },
    });
}
```

- [ ] **Step 2: Verify the file exists**

```bash
ls functions/p/
```

Expected output: `[id].js`

- [ ] **Step 3: Start dev server and test the route manually**

```bash
npm run dev
```

Open a browser, upload any `.md` file via `http://localhost:8788`, get the preview URL (e.g. `/v/aB3xK7mQ`), then navigate to `/p/aB3xK7mQ`. Expected: clean page with just the rendered markdown, no navigation bar, no buttons, no footer. Code blocks should be syntax-highlighted.

Also test an invalid ID: `/p/doesnotexist` — expected: "Document not found or expired" error page.

- [ ] **Step 4: Commit**

```bash
git add functions/p/[id].js
git commit -m "feat: add clean print page at /p/:id"
```

---

### Task 2: Add "打印版" button to the preview page

**Files:**
- Modify: `functions/v/[id].js`

The current `renderPreview` signature is `renderPreview(html, filename, expires)`. The `id` is available in `onRequestGet` but not passed down. We need to add it.

- [ ] **Step 1: Update `onRequestGet` to pass `id` to `renderPreview`**

Change line 27 from:
```js
        return renderPreview(htmlContent, data.filename, data.expires);
```
To:
```js
        return renderPreview(htmlContent, data.filename, data.expires, id);
```

- [ ] **Step 2: Update `renderPreview` signature and add the button**

Change the function signature from:
```js
function renderPreview(html, filename, expires) {
```
To:
```js
function renderPreview(html, filename, expires, id) {
```

Then in the header's button group (the `<div class="flex items-center justify-between ...">` block), add the "打印版" button **before** the existing "Upload New" `<a>` tag. Replace:

```html
                <a href="/" class="flex-shrink-0 inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-white text-sm font-medium py-2.5 px-4 rounded-lg transition-colors no-underline">
                    <i class="fa-solid fa-upload"></i>
                    <span class="hidden sm:inline">Upload New</span>
                    <span class="sm:hidden">Upload</span>
                </a>
```

With:

```html
                <div class="flex items-center gap-2 flex-shrink-0">
                    <a href="/p/${id}" target="_blank" class="inline-flex items-center gap-2 border border-slate-300 hover:border-slate-400 text-slate-600 hover:text-slate-800 text-sm font-medium py-2.5 px-4 rounded-lg transition-colors no-underline">
                        <i class="fa-solid fa-print"></i>
                        <span class="hidden sm:inline">打印版</span>
                        <span class="sm:hidden">打印</span>
                    </a>
                    <a href="/" class="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-white text-sm font-medium py-2.5 px-4 rounded-lg transition-colors no-underline">
                        <i class="fa-solid fa-upload"></i>
                        <span class="hidden sm:inline">Upload New</span>
                        <span class="sm:hidden">Upload</span>
                    </a>
                </div>
```

- [ ] **Step 3: Verify in dev server**

With `npm run dev` running, open a preview page `/v/:id`. Expected:
- "打印版" button appears to the left of "Upload New" in the header
- Clicking "打印版" opens `/p/:id` in a new tab showing the clean page

- [ ] **Step 4: Commit**

```bash
git add functions/v/[id].js
git commit -m "feat: add print page button to preview header"
```
