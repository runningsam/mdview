# MDView Upload Script

## upload.sh

Uploads a local markdown file to MDView and prints the preview URL.

### Usage

```bash
./upload.sh <BASE_URL> <FILE>
```

### Examples

```bash
# Upload README.md to a deployed MDView instance
./upload.sh https://mdview.example.com README.md

# Upload to local dev server
./upload.sh http://localhost:8788 docs/api.md
```

### Output

```
https://mdview.example.com/v/aB3xK7mQ
```

### What it does

1. Validates the file exists and is under 1MB
2. Uses Python's `json.dumps` to safely encode the markdown content (handles quotes, backslashes, newlines)
3. POSTs to `/api/upload`
4. Extracts and prints the `url` field from the JSON response
5. On failure, prints the error response to stderr and exits with status 1
