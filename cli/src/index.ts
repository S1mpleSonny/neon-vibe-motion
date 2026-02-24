#!/usr/bin/env node

import { Command } from 'commander';

const program = new Command();

program
  .name('neon')
  .description('CLI tool for rendering .neon motion files')
  .version('0.1.0');

program
  .command('render')
  .description('Render a .neon file to video')
  .argument('<input>', 'Input .neon file path')
  .requiredOption('-o, --output <path>', 'Output file path')
  .option('--format <format>', 'Output format (mp4)', 'mp4')
  .option('--fps <number>', 'Frame rate', (val) => parseInt(val, 10), 30)
  .option('--width <number>', 'Override width', (val) => parseInt(val, 10))
  .option('--height <number>', 'Override height', (val) => parseInt(val, 10))
  .option('--alpha', 'Export with alpha channel', false)
  .option('--resolution <res>', 'Resolution preset (720p|1080p|4k)', '1080p')
  .option('--aspect-ratio <ratio>', 'Aspect ratio (16:9|9:16|1:1)', '16:9')
  .option('--param <key=value...>', 'Override parameter values (repeatable)', (val, prev: string[]) => {
    return [...(prev || []), val];
  }, [] as string[])
  .action(async (input: string, options) => {
    // Parse param overrides
    const paramOverrides: Record<string, unknown> = {};
    if (options.param && options.param.length > 0) {
      for (const param of options.param) {
        const [key, ...valueParts] = param.split('=');
        if (!key || valueParts.length === 0) {
          console.error(`Invalid param format: ${param}. Expected key=value`);
          process.exit(1);
        }
        const value = valueParts.join('=');

        // Try to parse value
        const num = Number(value);
        if (value !== '' && !isNaN(num)) {
          paramOverrides[key] = num;
        } else if (value === 'true') {
          paramOverrides[key] = true;
        } else if (value === 'false') {
          paramOverrides[key] = false;
        } else {
          paramOverrides[key] = value;
        }
      }
    }

    const renderOptions = {
      output: options.output,
      format: options.format,
      fps: options.fps,
      width: options.width,
      height: options.height,
      alpha: options.alpha,
      resolution: options.resolution,
      aspectRatio: options.aspectRatio,
      paramOverrides: Object.keys(paramOverrides).length > 0 ? paramOverrides : undefined,
    };

    const { renderCommand } = await import('./commands/render.js');
    await renderCommand(input, renderOptions);
  });

program
  .command('validate')
  .description('Validate a .neon file')
  .argument('<input>', 'Input .neon file path')
  .action(async (input: string) => {
    const { validateCommand } = await import('./commands/validate.js');
    await validateCommand(input);
  });

program.parse();
