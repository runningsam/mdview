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
