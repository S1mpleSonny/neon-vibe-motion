import { readFileSync } from 'fs';
import { extractMotion, validateMotion } from '../schema.js';
export async function validateCommand(inputPath) {
    try {
        // Read file
        const content = readFileSync(inputPath, 'utf-8');
        // Parse JSON
        let data;
        try {
            data = JSON.parse(content);
        }
        catch (err) {
            console.error('Error: Invalid JSON syntax');
            console.error(err.message);
            process.exit(1);
        }
        // Extract MotionDefinition from wrapper
        const extraction = extractMotion(data);
        if (!extraction.motion) {
            console.error(`✗ ${inputPath}: ${extraction.error}`);
            process.exit(1);
        }
        // Validate the MotionDefinition
        const result = validateMotion(extraction.motion);
        if (result.valid) {
            console.log(`✓ ${inputPath} is valid`);
            process.exit(0);
        }
        else {
            console.error(`✗ ${inputPath} is invalid:\n`);
            result.errors.forEach(err => {
                console.error(`  - ${err.field}: ${err.message}`);
            });
            process.exit(1);
        }
    }
    catch (err) {
        if (err.code === 'ENOENT') {
            console.error(`Error: File not found: ${inputPath}`);
        }
        else {
            console.error('Error:', err.message);
        }
        process.exit(1);
    }
}
//# sourceMappingURL=validate.js.map