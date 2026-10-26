// Test fixtures use the same classic source without starting the whole site.
import { classExports } from './class-exports.js';

export async function loadApp(names) {
    const source = await (await fetch('../src/js/app.js')).text();
    const marker = source.indexOf('// Start the application once the document is ready.');
    if (marker === -1 || names.some((name) => !/^[A-Za-z_$][\w$]*$/.test(name))) {
        throw new Error('Invalid application test entry point');
    }
    return new Function(
        `${source.slice(0, marker)}return { ${classExports(names)} };\n})();`.replace(
            '(function () {',
            'return (function () {',
        ),
    )();
}
