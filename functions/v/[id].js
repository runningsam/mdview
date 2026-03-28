import { marked } from 'marked';

export async function onRequestGet(context) {
    const { request, env, params } = context;
    const id = params.id;
    
    if (!id || id.length !== 8) {
        return renderError('Invalid document ID');
    }
    
    try {
        const dataStr = await env.MDVIEW_KV.get(id);
        
        if (!dataStr) {
            return renderError('Document not found or expired');
        }
        
        const data = JSON.parse(dataStr);
        
        // Configure marked for code highlighting
        marked.setOptions({
            breaks: true,
            gfm: true,
        });
        
        const htmlContent = await marked.parse(data.content);
        
        return renderPreview(htmlContent, data.filename, data.expires);
        
    } catch (error) {
        return renderError('Error loading document');
    }
}

function renderPreview(html, filename, expires) {
    const expiresDate = new Date(expires);
    const expiresStr = expiresDate.toLocaleDateString();
    
    return new Response(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${filename} - MDView</title>
    <link rel="stylesheet" href="/style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/github.min.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/highlight.min.js"></script>
</head>
<body>
    <div class="preview-container">
        <header>
            <h1>📄 ${filename}</h1>
            <p class="subtitle">Expires: ${expiresStr}</p>
        </header>
        
        <main>
            <div class="markdown-body">
                ${html}
            </div>
        </main>
        
        <footer>
            <a href="/">Upload another file</a>
        </footer>
    </div>
    
    <script>hljs.highlightAll();</script>
</body>
</html>
`, {
        status: 200,
        headers: { 
            'Content-Type': 'text/html',
            'Cache-Control': 'public, max-age=3600',
        },
    });
}

function renderError(message) {
    return new Response(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Error - MDView</title>
    <link rel="stylesheet" href="/style.css">
</head>
<body>
    <div class="container">
        <div class="error-message">
            <div class="error-icon">❌</div>
            <p class="error-text">${message}</p>
            <a class="btn-primary" href="/">Back to Home</a>
        </div>
    </div>
</body>
</html>
`, {
        status: 404,
        headers: { 'Content-Type': 'text/html' },
    });
}