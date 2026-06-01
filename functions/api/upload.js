import { marked } from 'marked';
import { fetchRemoteMarkdown, FetchRemoteError } from '../lib/fetch-remote.js';

export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const body = await request.json();
        const { url, ttl, slug } = body;
        let { content, filename } = body;

        const hasContent = typeof content === 'string' && content.length > 0;
        const hasUrl = typeof url === 'string' && url.length > 0;

        if (hasContent === hasUrl) {
            return new Response(JSON.stringify({ error: 'provide either content or url' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Server-side fetch when a url is given (avoids browser CORS).
        if (hasUrl) {
            try {
                const remote = await fetchRemoteMarkdown(url, env);
                content = remote.content;
                if (!filename) filename = remote.filename;
            } catch (err) {
                if (err instanceof FetchRemoteError) {
                    return new Response(JSON.stringify({ error: err.message }), {
                        status: 400,
                        headers: { 'Content-Type': 'application/json' },
                    });
                }
                throw err;
            }
        }

        if (!content || typeof content !== 'string') {
            return new Response(JSON.stringify({ error: 'Invalid content' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        if (content.length > parseInt(env.MAX_FILE_SIZE || '1048576')) {
            return new Response(JSON.stringify({ error: 'File too large (max 1MB)' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // --- TTL: user-provided, default 7 days, 0 = forever ---
        let ttlDays = null;  // null = forever (no KV expiration)
        let ttlSeconds = null;
        if (ttl === 0 || ttl === '0' || ttl === 'forever' || ttl === 'infinite') {
            // Forever — no expiration set
            ttlDays = 0;
        } else {
            const parsed = parseInt(ttl);
            if (isNaN(parsed) || parsed < 1) {
                ttlDays = parseInt(env.TTL_DAYS || '7');
            } else {
                ttlDays = Math.min(parsed, parseInt(env.MAX_TTL_DAYS || '365'));
            }
            ttlSeconds = ttlDays * 24 * 60 * 60;
        }

        // --- Slug / ID ---
        let id;
        if (slug !== undefined && slug !== null) {
            // User-provided custom slug
            if (typeof slug !== 'string' || slug.length === 0) {
                return new Response(JSON.stringify({ error: 'slug must be a non-empty string' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' },
                });
            }
            // Validate slug: only a-z, A-Z, 0-9, hyphen, underscore, dot; 1-64 chars
            if (!/^[\w\-.]{1,64}$/.test(slug)) {
                return new Response(JSON.stringify({ error: 'slug must be 1-64 chars: a-z, A-Z, 0-9, -, _, .' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' },
                });
            }
            // Reserve system words
            const reserved = ['api', 'skill', 'install.sh', 'logo.svg', 'app.js', 'style.css', 'favicon.ico', 'index.html'];
            if (reserved.includes(slug.toLowerCase()) || slug === '') {
                return new Response(JSON.stringify({ error: 'slug is reserved' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' },
                });
            }
            // Check if slug already exists
            const existing = await env.MDVIEW_KV.get(slug);
            if (existing !== null) {
                return new Response(JSON.stringify({ error: 'slug already taken' }), {
                    status: 409,
                    headers: { 'Content-Type': 'application/json' },
                });
            }
            id = slug;
        } else {
            // Auto-generated random ID
            id = generateId();
        }
        
        const expires = ttlSeconds !== null
            ? new Date(Date.now() + ttlSeconds * 1000).toISOString()
            : null;

        const data = {
            content: content,
            filename: filename || 'document.md',
            created: new Date().toISOString(),
            expires: expires,
            ttlDays: ttlDays,
        };

        const putOptions = ttlSeconds !== null ? { expirationTtl: ttlSeconds } : {};
        await env.MDVIEW_KV.put(id, JSON.stringify(data), putOptions);
        
        const previewUrl = new URL(request.url).origin + `/v/${id}`;

        return new Response(JSON.stringify({
            id: id,
            url: previewUrl,
            expires: data.expires,
            ttlDays: ttlDays,
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
        
    } catch (error) {
        return new Response(JSON.stringify({ error: 'Internal error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}

function generateId() {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let id = '';
    const randomValues = new Uint8Array(8);
    crypto.getRandomValues(randomValues);
    for (let i = 0; i < 8; i++) {
        id += chars[randomValues[i] % chars.length];
    }
    return id;
}