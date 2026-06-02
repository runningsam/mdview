import { marked } from 'marked';

export async function onRequestGet(context) {
    const { request, env, params } = context;
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
        
        marked.setOptions({
            breaks: true,
            gfm: true,
        });
        
        const htmlContent = await marked.parse(data.content);
        
        return renderPreview(htmlContent, data.filename, data.expires, id);
        
    } catch (error) {
        return renderError('Error loading document');
    }
}

function renderPreview(html, filename, expires, id) {
    let expiresStr;
    if (expires) {
        const expiresDate = new Date(expires);
        expiresStr = expiresDate.toLocaleDateString();
    } else {
        expiresStr = 'Never';
    }
    
    return new Response(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${filename} - MDView</title>
    <link rel="icon" type="image/svg+xml" href="/logo.svg">
    <link rel="stylesheet" href="/tailwind.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/github.min.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/highlight.min.js"></script>
    <style>
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        .markdown-body {
            line-height: 1.7;
        }
        
        .markdown-body h1 {
            font-size: 1.75rem;
            margin-bottom: 1rem;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 0.5rem;
            font-weight: 700;
        }
        
        .markdown-body h2 {
            font-size: 1.375rem;
            margin: 1.5rem 0 0.75rem;
            font-weight: 600;
        }
        
        .markdown-body h3 {
            font-size: 1.125rem;
            margin: 1rem 0 0.5rem;
            font-weight: 600;
        }
        
        .markdown-body p { margin: 1rem 0; }
        
        .markdown-body code {
            background: #f1f5f9;
            padding: 0.2rem 0.4rem;
            border-radius: 4px;
            font-size: 0.875em;
        }
        
        .markdown-body pre {
            background: #f1f5f9;
            padding: 1rem;
            padding-top: 2.5rem;
            border-radius: 8px;
            overflow-x: auto;
            margin: 1rem 0;
            position: relative;
        }
        
        .markdown-body pre code {
            background: none;
            padding: 0;
        }

        .copy-btn {
            position: absolute;
            top: 0.5rem;
            right: 0.5rem;
            background: #e2e8f0;
            border: none;
            border-radius: 6px;
            padding: 0.25rem 0.6rem;
            font-size: 0.75rem;
            color: #64748b;
            cursor: pointer;
            transition: all 0.15s;
            display: flex;
            align-items: center;
            gap: 0.25rem;
        }

        .copy-btn:hover {
            background: #cbd5e1;
            color: #334155;
        }

        .copy-btn.copied {
            background: #22c55e;
            color: white;
        }
        
        .markdown-body ul, .markdown-body ol {
            margin: 1rem 0;
            padding-left: 1.5rem;
        }
        
        .markdown-body blockquote {
            border-left: 4px solid #4f46e5;
            margin: 1rem 0;
            padding-left: 1rem;
            color: #64748b;
        }
        
        .markdown-body a {
            color: #4f46e5;
            text-decoration: underline;
        }
        
        .markdown-body img {
            max-width: 100%;
            height: auto;
            border-radius: 8px;
        }
        
        .markdown-body table {
            border-collapse: collapse;
            width: 100%;
            margin: 1rem 0;
            font-size: 0.9rem;
        }
        
        .markdown-body th, .markdown-body td {
            border: 1px solid #e2e8f0;
            padding: 0.5rem 0.75rem;
            text-align: left;
        }
        
        .markdown-body th {
            background: #f8fafc;
            font-weight: 600;
        }
        
        @media (max-width: 768px) {
            .markdown-body h1 { font-size: 1.5rem; }
            .markdown-body h2 { font-size: 1.25rem; }
            .markdown-body h3 { font-size: 1rem; }
            .markdown-body pre {
                font-size: 0.85rem;
                padding: 0.75rem;
            }
            .markdown-body table {
                display: block;
                overflow-x: auto;
                -webkit-overflow-scrolling: touch;
            }
        }
    </style>
</head>
<body class="bg-slate-50 min-h-screen">
    <div class="max-w-3xl mx-auto px-4 py-6 sm:py-8">
        <!-- Header -->
        <header class="bg-white rounded-xl p-4 sm:p-6 mb-4 sm:mb-6 shadow-sm">
            <div class="flex items-center justify-between flex-wrap gap-3">
                <div class="flex items-center gap-3 min-w-0">
                    <div class="flex-shrink-0">
                        <img src="/logo.svg" alt="MDView" class="w-10 h-10 sm:w-12 sm:h-12">
                    </div>
                    <div class="min-w-0">
                        <h1 class="text-base sm:text-lg font-bold text-slate-800 truncate">${filename}</h1>
                        <p class="text-xs sm:text-sm text-slate-400">
                            <i class="fa-solid fa-clock mr-1"></i>Expires: ${expiresStr}
                        </p>
                    </div>
                </div>
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
            </div>
        </header>
        
        <!-- Content -->
        <main class="bg-white rounded-xl p-4 sm:p-6 lg:p-8 shadow-sm">
            <div class="markdown-body text-slate-700">
                ${html}
            </div>
        </main>
        
        <!-- Footer -->
        <footer class="text-center mt-6 sm:mt-8 text-slate-400 text-xs">
            <p>Powered by MDView & Cloudflare</p>
        </footer>
    </div>
    
    <script>
    hljs.highlightAll();
    // Add copy buttons to all code blocks
    document.querySelectorAll('.markdown-body pre').forEach(pre => {
        const btn = document.createElement('button');
        btn.className = 'copy-btn';
        btn.innerHTML = '<i class="fa-solid fa-copy"></i> Copy';
        btn.addEventListener('click', async () => {
            const code = pre.querySelector('code') || pre;
            await navigator.clipboard.writeText(code.textContent);
            btn.classList.add('copied');
            btn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
            setTimeout(() => {
                btn.classList.remove('copied');
                btn.innerHTML = '<i class="fa-solid fa-copy"></i> Copy';
            }, 2000);
        });
        pre.appendChild(btn);
    });
    </script>
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
    <link rel="icon" type="image/svg+xml" href="/logo.svg">
    <link rel="stylesheet" href="/tailwind.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
</head>
<body class="bg-slate-50 min-h-screen flex items-center justify-center p-4">
    <div class="max-w-md w-full text-center">
        <div class="bg-white rounded-xl p-8 shadow-sm">
            <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i class="fa-solid fa-triangle-exclamation text-3xl text-red-500"></i>
            </div>
            <h1 class="text-xl font-bold text-slate-800 mb-2">Oops!</h1>
            <p class="text-slate-500 mb-6">${message}</p>
            <a href="/" class="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-white font-medium py-3 px-6 rounded-lg transition-colors no-underline">
                <i class="fa-solid fa-arrow-left"></i>
                Back to Home
            </a>
        </div>
    </div>
</body>
</html>
`, {
        status: 404,
        headers: { 'Content-Type': 'text/html' },
    });
}