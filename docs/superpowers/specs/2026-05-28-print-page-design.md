# Print Page Design

**Date:** 2026-05-28  
**Status:** Approved

## Summary

Add a clean, distraction-free print version of any markdown document at `/p/:id`. The existing preview page `/v/:id` gets a "打印版" button in its header linking to the print page. The user decides how to print (browser Ctrl+P, Save as PDF, etc.) — no `window.print()` is called programmatically.

## Routes

| Route | File | Purpose |
|-------|------|---------|
| `GET /p/:id` | `functions/p/[id].js` (new) | Clean print-friendly page |
| `GET /v/:id` | `functions/v/[id].js` (modified) | Add "打印版" button linking to `/p/:id` |

## New File: `functions/p/[id].js`

### Data layer
Same as `[id].js`: read the KV key `id` from `env.MDVIEW_KV`, parse JSON, run `marked.parse(content)`. Reuse the same error rendering for missing/expired documents.

### HTML structure
- No navigation bar, no header card, no footer, no copy buttons
- Content starts at the top of the page with minimal padding
- `max-width: 800px`, centered, white background, dark text

### Styling
- No Tailwind CDN — inline `<style>` block only (~40 lines)
- Typography: system font stack, `font-size: 16px`, `line-height: 1.7`
- Headings: font-weight 700/600, bottom border on `h1`
- Code blocks: `background: #f1f5f9`, monospace font, `overflow-x: auto`
- Inline code: `background: #f1f5f9`, slight padding
- Tables: collapsed borders, `width: 100%`
- Images: `max-width: 100%`
- highlight.js loaded from CDN (same version as preview page: 11.11.1), `github.min.css` theme

### Cache
`Cache-Control: public, max-age=3600` — same as preview page.

## Modified File: `functions/v/[id].js`

Add a "打印版" link button in the header, to the left of the existing "Upload New" button:

```html
<a href="/p/${id}" target="_blank"
   class="flex-shrink-0 inline-flex items-center gap-2 border border-slate-300 hover:border-slate-400 text-slate-600 hover:text-slate-800 text-sm font-medium py-2.5 px-4 rounded-lg transition-colors no-underline">
  <i class="fa-solid fa-print"></i>
  <span class="hidden sm:inline">打印版</span>
  <span class="sm:hidden">打印</span>
</a>
```

`id` is already available from `params.id` passed to `onRequestGet`. The button uses outline styling (border, no fill) to visually differ from the primary "Upload New" button.

## Out of Scope

- No password/auth — print page is as public as the preview page
- No separate TTL or access control for `/p/:id`
- No `window.print()` auto-trigger
- No PDF download button (user uses browser native)
