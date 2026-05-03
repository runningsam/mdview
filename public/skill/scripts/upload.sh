#!/usr/bin/env bash
# MDView Upload Script
# Usage: ./upload.sh <BASE_URL> <FILE>
# Example: ./upload.sh https://mdview.example.com README.md
#
# Uploads a markdown file to MDView and prints the preview URL.
# Requires: curl, python3

set -euo pipefail

if [ $# -ne 2 ]; then
    echo "Usage: $0 <BASE_URL> <FILE>"
    echo "Example: $0 https://mdview.example.com README.md"
    exit 1
fi

BASE_URL="$1"
FILE="$2"

if [ ! -f "$FILE" ]; then
    echo "Error: File not found: $FILE"
    exit 1
fi

# Check file size (1MB = 1048576 bytes)
SIZE=$(wc -c < "$FILE")
if [ "$SIZE" -gt 1048576 ]; then
    echo "Error: File too large (${SIZE} bytes, max 1MB)"
    exit 1
fi

FILENAME=$(basename "$FILE")

# Build JSON payload with Python for safe escaping
RESPONSE=$(python3 -c "
import json, sys
content = open('$FILE').read()
print(json.dumps({'content': content, 'filename': '$FILENAME'}))
" | curl -s -X POST "${BASE_URL}/api/upload" \
    -H "Content-Type: application/json" \
    -d @-)

# Check if we got a valid response
URL=$(echo "$RESPONSE" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('url',''))" 2>/dev/null || echo "")

if [ -n "$URL" ]; then
    echo "$URL"
else
    echo "Error: Upload failed"
    echo "Response: $RESPONSE"
    exit 1
fi
