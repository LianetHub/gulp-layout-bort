import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';

// Only tests expose selected declarations; production has no testing API.
export function loadApp(names) {
    const source = readFileSync(new URL('../../src/js/app.js', import.meta.url), 'utf8').replace(
        /const uiContent = [^;]+;/,
        'const uiContent = testContent;',
    );
    const markup = readFileSync(
        new URL('../../src/html/includes/_ui-content.html', import.meta.url),
        'utf8',
    );
    const copy = new Map(
        [...markup.matchAll(/data-ui-copy="([^"]+)">([\s\S]*?)<\/span>/g)].map(([, key, text]) => [
            key,
            text.replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&'),
        ]),
    );
    const testContent = {
        querySelector(selector) {
            const key = selector.match(/data-ui-copy="([^"]+)"/)?.[1];
            return copy.has(key) ? { textContent: copy.get(key) } : null;
        },
    };
    const marker = source.indexOf('// Start the application once the document is ready.');
    if (marker === -1 || names.some((name) => !/^[A-Za-z_$][\w$]*$/.test(name))) {
        throw new Error('Invalid application test entry point');
    }
    return new Script(
        `(function(testContent) { return ${source.slice(0, marker)}return { ${names.join(', ')} };\n})(); })`,
        {
            filename: 'app.js',
        },
    ).runInThisContext()(testContent);
}
