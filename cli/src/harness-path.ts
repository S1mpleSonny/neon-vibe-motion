import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

export function findHarnessPath(): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);

  // Try relative to dist/ (for bundled distribution)
  const bundledPath = join(__dirname, '../harness/harness.html');
  if (existsSync(bundledPath)) {
    return bundledPath;
  }

  // Try relative to project root (for development)
  const devPath = join(__dirname, '../../dist/harness/harness.html');
  if (existsSync(devPath)) {
    return devPath;
  }

  throw new Error(
    'Harness bundle not found. Expected at:\n' +
    `  - ${bundledPath} (bundled)\n` +
    `  - ${devPath} (development)\n` +
    'Please build the harness first with: npm run build:harness'
  );
}
