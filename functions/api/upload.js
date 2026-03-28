import { marked } from 'marked';

export async function onRequestPost(context) {
    const { request, env } = context;
    
    try {
        const body = await request.json();
        const { content, filename } = body;
        
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
        
        // Generate random ID (8 chars, URL-safe)
        const id = generateId();
        
        // Store in KV with TTL (7 days = 604800 seconds)
        const ttl = parseInt(env.TTL_DAYS || '7') * 24 * 60 * 60;
        
        const data = {
            content: content,
            filename: filename || 'document.md',
            created: new Date().toISOString(),
            expires: new Date(Date.now() + ttl * 1000).toISOString(),
        };
        
        await env.MDVIEW_KV.put(id, JSON.stringify(data), { expirationTtl: ttl });
        
        // Return preview URL
        const url = new URL(request.url).origin + `/v/${id}`;
        
        return new Response(JSON.stringify({ 
            id: id,
            url: url,
            expires: data.expires,
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