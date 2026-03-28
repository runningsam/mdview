const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const uploadBtn = document.getElementById('upload-btn');
const progress = document.getElementById('progress');
const result = document.getElementById('result');
const previewUrl = document.getElementById('preview-url');
const copyBtn = document.getElementById('copy-btn');
const viewBtn = document.getElementById('view-btn');
const newBtn = document.getElementById('new-btn');

// Click to upload
uploadBtn.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('click', (e) => {
    if (e.target !== uploadBtn) fileInput.click();
});

// File input change
fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
        uploadFile(fileInput.files[0]);
    }
});

// Drag and drop
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
        uploadFile(e.dataTransfer.files[0]);
    }
});

// Upload file
async function uploadFile(file) {
    // Validate file type
    const validTypes = ['.md', '.markdown', '.txt'];
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    if (!validTypes.includes(ext) && file.type !== 'text/markdown' && file.type !== 'text/plain') {
        alert('Please upload a .md, .markdown, or .txt file');
        return;
    }

    // Validate file size (1MB)
    if (file.size > 1024 * 1024) {
        alert('File size must be less than 1MB');
        return;
    }

    // Show progress
    dropZone.parentElement.classList.add('hidden');
    progress.classList.remove('hidden');

    try {
        const content = await file.text();
        const response = await fetch('/api/upload', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                content: content,
                filename: file.name,
            }),
        });

        if (!response.ok) {
            throw new Error('Upload failed');
        }

        const data = await response.json();
        showResult(data.url);
    } catch (error) {
        alert('Upload failed: ' + error.message);
        resetUpload();
    }
}

// Show result
function showResult(url) {
    progress.classList.add('hidden');
    result.classList.remove('hidden');
    previewUrl.value = url;
    viewBtn.href = url;
}

// Copy URL
copyBtn.addEventListener('click', async () => {
    try {
        await navigator.clipboard.writeText(previewUrl.value);
        copyBtn.textContent = 'Copied!';
        setTimeout(() => copyBtn.textContent = 'Copy', 2000);
    } catch (error) {
        // Fallback for older browsers
        previewUrl.select();
        document.execCommand('copy');
        copyBtn.textContent = 'Copied!';
        setTimeout(() => copyBtn.textContent = 'Copy', 2000);
    }
});

// Upload another
newBtn.addEventListener('click', resetUpload);

function resetUpload() {
    result.classList.add('hidden');
    dropZone.parentElement.classList.remove('hidden');
    fileInput.value = '';
}