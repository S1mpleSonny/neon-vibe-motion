import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, resolve, normalize } from 'path';
import { createServer } from 'http';
import { chromium } from 'playwright';
import { extractMotion, validateMotion } from '../schema.js';
import { findHarnessPath } from '../harness-path.js';
import { lookup } from '../mime.js';
function startStaticServer(rootDir) {
    const resolvedRoot = resolve(rootDir);
    return new Promise((resolvePromise, reject) => {
        const server = createServer((req, res) => {
            const url = new URL(req.url || '/', 'http://localhost');
            const filePath = resolve(resolvedRoot, '.' + normalize(url.pathname));
            if (!filePath.startsWith(resolvedRoot)) {
                res.writeHead(403);
                res.end('Forbidden');
                return;
            }
            try {
                const content = readFileSync(filePath);
                res.writeHead(200, { 'Content-Type': lookup(filePath) });
                res.end(content);
            }
            catch {
                res.writeHead(404);
                res.end('Not found');
            }
        });
        server.listen(0, '127.0.0.1', () => resolvePromise(server));
        server.on('error', reject);
    });
}
export async function renderCommand(inputPath, options) {
    console.log(`Reading ${inputPath}...`);
    // Read and validate .neon file
    let data;
    try {
        const content = readFileSync(inputPath, 'utf-8');
        const parsed = JSON.parse(content);
        // Extract MotionDefinition from wrapper
        const extraction = extractMotion(parsed);
        if (!extraction.motion) {
            console.error(`Invalid .neon file: ${extraction.error}`);
            process.exit(1);
        }
        const validation = validateMotion(extraction.motion);
        if (!validation.valid) {
            console.error('Invalid .neon file:');
            validation.errors.forEach(err => {
                console.error(`  - ${err.field}: ${err.message}`);
            });
            process.exit(1);
        }
        data = extraction.motion;
    }
    catch (err) {
        console.error('Error reading file:', err.message);
        process.exit(1);
    }
    // Ensure output directory exists
    const outputDir = dirname(options.output);
    try {
        mkdirSync(outputDir, { recursive: true });
    }
    catch (err) {
        console.error('Error creating output directory:', err.message);
        process.exit(1);
    }
    // Find harness bundle
    let harnessPath;
    try {
        harnessPath = findHarnessPath();
    }
    catch (err) {
        console.error(err.message);
        process.exit(1);
    }
    console.log(`Using harness: ${harnessPath}`);
    console.log('Launching browser...');
    // Serve harness directory via local HTTP (module scripts require http://, not file://)
    const harnessDir = dirname(harnessPath);
    const server = await startStaticServer(harnessDir);
    const serverAddress = server.address();
    if (!serverAddress || typeof serverAddress === 'string') {
        console.error('Failed to start local server');
        process.exit(1);
    }
    const baseUrl = `http://127.0.0.1:${serverAddress.port}`;
    // Launch Playwright (try bundled Chromium, fall back to system Chrome)
    let browser;
    try {
        browser = await chromium.launch({ headless: true });
    }
    catch {
        // Playwright Chromium not installed — try system Chrome
        const systemChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
        console.log('Playwright Chromium not found, using system Chrome...');
        browser = await chromium.launch({
            headless: true,
            executablePath: systemChrome,
        });
    }
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
        // Capture browser errors for debugging
        page.on('pageerror', err => {
            console.error(`  [page error] ${err.message}`);
        });
        // Navigate to harness via HTTP
        await page.goto(`${baseUrl}/harness.html`);
        // Wait for NeonHarness to be available
        await page.waitForFunction(() => 'NeonHarness' in window, { timeout: 30000 });
        console.log('Rendering...');
        // Build render options
        const renderOptions = {
            fps: options.fps || 30,
            format: options.format || 'mp4',
        };
        if (options.width)
            renderOptions.width = options.width;
        if (options.height)
            renderOptions.height = options.height;
        if (options.alpha)
            renderOptions.alpha = options.alpha;
        if (options.resolution)
            renderOptions.resolution = options.resolution;
        if (options.aspectRatio)
            renderOptions.aspectRatio = options.aspectRatio;
        if (options.paramOverrides)
            renderOptions.paramOverrides = options.paramOverrides;
        // Set up progress listener in browser context
        await page.evaluate(() => {
            window.addEventListener('message', (e) => {
                if (e.data?.type === 'neon:progress') {
                    window.__lastProgress = e.data.progress;
                }
            });
        });
        // Start progress monitoring
        const progressInterval = setInterval(async () => {
            try {
                const progress = await page.evaluate(() => window.__lastProgress);
                if (progress !== undefined) {
                    process.stdout.write(`\r  Progress: ${Math.round(progress)}%`);
                }
            }
            catch {
                // Ignore errors during progress polling
            }
        }, 500);
        // Execute render and extract Blob
        const result = await page.evaluate(async ({ motion, opts }) => {
            const renderResult = await window.NeonHarness.render(motion, opts);
            const arrayBuffer = await renderResult.blob.arrayBuffer();
            return {
                data: Array.from(new Uint8Array(arrayBuffer)),
                format: renderResult.format,
                width: renderResult.width,
                height: renderResult.height,
                duration: renderResult.duration,
                frames: renderResult.frames,
            };
        }, { motion: data, opts: renderOptions });
        clearInterval(progressInterval);
        process.stdout.write('\r  Progress: 100%\n');
        // Convert to Buffer and write
        const buffer = Buffer.from(result.data);
        writeFileSync(options.output, buffer);
        console.log('✓ Render complete!');
        console.log(`  Output: ${options.output}`);
        console.log(`  Size: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);
        console.log(`  Format: ${result.format}`);
        console.log(`  Resolution: ${result.width}x${result.height}`);
        console.log(`  Duration: ${result.duration}ms`);
        console.log(`  Frames: ${result.frames}`);
    }
    catch (err) {
        console.error('\nRender failed:', err.message);
        process.exit(1);
    }
    finally {
        await context.close().catch(() => { });
        await browser.close().catch(() => { });
        await new Promise(r => server.close(() => r()));
    }
}
//# sourceMappingURL=render.js.map