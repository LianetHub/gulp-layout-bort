import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';
import { classExports } from './class-exports.js';

// Only tests expose selected declarations; production has no testing API.
export function loadApp(names) {
    const source = readFileSync(new URL('../../src/js/app.js', import.meta.url), 'utf8');
    const marker = source.indexOf('// Start the application once the document is ready.');
    if (marker === -1 || names.some((name) => !/^[A-Za-z_$][\w$]*$/.test(name))) {
        throw new Error('Invalid application test entry point');
    }
    return new Script(
        `(function() { return ${source.slice(0, marker)}return { ${classExports(names)} };\n})(); })`,
        {
            filename: 'app.js',
        },
    ).runInThisContext()();
}
