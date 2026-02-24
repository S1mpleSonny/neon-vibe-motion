const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.mjs': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.wasm': 'application/wasm',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
};
export function lookup(filePath) {
    const ext = filePath.slice(filePath.lastIndexOf('.'));
    return MIME_TYPES[ext] || 'application/octet-stream';
}
//# sourceMappingURL=mime.js.map