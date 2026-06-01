// Server-side fetch of remote markdown for the "load from URL" feature.
// Pure logic (except fetch) so the validation helpers can be unit-tested.

const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 5000;
const DEFAULT_MAX_SIZE = 1048576; // 1MB, matches MAX_FILE_SIZE default

export class FetchRemoteError extends Error {
    constructor(message) {
        super(message);
        this.name = 'FetchRemoteError';
    }
}

// Reject literal private/reserved IPs, localhost, and metadata hosts.
// Returns true if the host is allowed to be fetched.
export function isHostAllowed(hostname) {
    if (!hostname) return false;
    let host = hostname.toLowerCase();
    // Strip brackets from IPv6 literals: [::1] -> ::1
    if (host.startsWith('[') && host.endsWith(']')) {
        host = host.slice(1, -1);
    }

    if (host === 'localhost' || host.endsWith('.local')) return false;

    // IPv4 literal?
    const v4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (v4) {
        const [a, b] = [parseInt(v4[1], 10), parseInt(v4[2], 10)];
        if (a === 0) return false;                       // 0.0.0.0/8
        if (a === 10) return false;                      // 10.0.0.0/8
        if (a === 127) return false;                     // loopback
        if (a === 169 && b === 254) return false;        // link-local / metadata
        if (a === 172 && b >= 16 && b <= 31) return false; // 172.16.0.0/12
        if (a === 192 && b === 168) return false;        // 192.168.0.0/16
        return true;
    }

    // IPv6 literal? (contains a colon)
    if (host.includes(':')) {
        if (host === '::1' || host === '::') return false;       // loopback / unspecified
        if (host.startsWith('fc') || host.startsWith('fd')) return false; // fc00::/7 ULA
        if (host.startsWith('fe8') || host.startsWith('fe9') ||
            host.startsWith('fea') || host.startsWith('feb')) return false; // fe80::/10
        // IPv4-mapped (::ffff:a.b.c.d) — validate the embedded v4
        const mapped = host.match(/:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
        if (mapped) return isHostAllowed(mapped[1]);
        return true;
    }

    // Regular hostname — allowed (edge fetch can't reach private nets anyway)
    return true;
}

// Validate protocol + host of a URL string. Throws FetchRemoteError on reject.
export function validateUrl(rawUrl) {
    let parsed;
    try {
        parsed = new URL(rawUrl);
    } catch {
        throw new FetchRemoteError('invalid url');
    }
    if (parsed.protocol !== 'https:') {
        throw new FetchRemoteError('url must be https');
    }
    if (!isHostAllowed(parsed.hostname)) {
        throw new FetchRemoteError('url host not allowed');
    }
    return parsed;
}

// Derive a display filename from the URL.
export function deriveFilename(parsed) {
    const segments = parsed.pathname.split('/').filter(Boolean);
    const last = segments[segments.length - 1];
    if (last) return decodeURIComponent(last);
    if (parsed.hostname) return parsed.hostname;
    return 'document.md';
}

// Read a response body as text, aborting if it exceeds maxSize bytes.
async function readCapped(response, maxSize) {
    const reader = response.body && response.body.getReader
        ? response.body.getReader()
        : null;

    if (!reader) {
        // No streaming available — fall back to text() then check.
        const text = await response.text();
        if (new TextEncoder().encode(text).length > maxSize) {
            throw new FetchRemoteError('remote file too large');
        }
        return text;
    }

    const chunks = [];
    let total = 0;
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.length;
        if (total > maxSize) {
            await reader.cancel();
            throw new FetchRemoteError('remote file too large');
        }
        chunks.push(value);
    }
    const merged = new Uint8Array(total);
    let offset = 0;
    for (const c of chunks) {
        merged.set(c, offset);
        offset += c.length;
    }
    return new TextDecoder('utf-8').decode(merged);
}

// Fetch remote markdown. Returns { content, filename }.
export async function fetchRemoteMarkdown(rawUrl, env) {
    const maxSize = parseInt((env && env.MAX_FILE_SIZE) || String(DEFAULT_MAX_SIZE), 10);

    let parsed = validateUrl(rawUrl);
    let currentUrl = parsed.toString();

    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

        let response;
        try {
            response = await fetch(currentUrl, {
                redirect: 'manual',
                signal: controller.signal,
                headers: { 'Accept': 'text/markdown, text/plain, text/*;q=0.9, */*;q=0.5' },
            });
        } catch (err) {
            clearTimeout(timer);
            if (err && err.name === 'AbortError') {
                throw new FetchRemoteError('failed to fetch url (timeout)');
            }
            throw new FetchRemoteError('failed to fetch url');
        }
        clearTimeout(timer);

        // Manual redirect handling
        if (response.status >= 300 && response.status < 400) {
            const location = response.headers.get('location');
            if (!location) {
                throw new FetchRemoteError('failed to fetch url (bad redirect)');
            }
            if (hop === MAX_REDIRECTS) {
                throw new FetchRemoteError('too many redirects');
            }
            // Resolve relative redirects against the current URL, then re-validate.
            const next = new URL(location, currentUrl).toString();
            parsed = validateUrl(next);
            currentUrl = parsed.toString();
            continue;
        }

        if (!response.ok) {
            throw new FetchRemoteError(`failed to fetch url (status ${response.status})`);
        }

        const content = await readCapped(response, maxSize);
        return { content, filename: deriveFilename(parsed) };
    }

    throw new FetchRemoteError('too many redirects');
}
