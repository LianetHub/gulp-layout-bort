import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';

test('site sources and dependencies do not require jQuery', async () => {
    const files = await readdir(new URL('../src/', import.meta.url), { recursive: true });
    for (const file of files.filter(file => /\.(js|html)$/.test(file))) {
        const source = await readFile(new URL(`../src/${file.replaceAll('\\', '/')}`, import.meta.url), 'utf8');
        assert.doesNotMatch(source, /jquery|jQuery/, file);
        if (!file.includes('libs')) assert.doesNotMatch(source, /\$\s*\(|\$\.(?:each|merge)/, file);
    }
    const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
    assert.equal(manifest.dependencies.jquery, undefined);
    assert.equal(manifest.devDependencies['@types/jquery'], undefined);
});

test('entry point initializes safely on a page without components', async () => {
    const listeners = new Map();
    globalThis.document = {
        readyState: 'complete',
        querySelector: () => null,
        querySelectorAll: () => [],
        addEventListener: (type, callback) => listeners.set(type, callback),
        body: { classList: { remove() {}, add() {} } }
    };
    globalThis.window = {
        innerWidth: 1280,
        matchMedia: () => ({ matches: false, addEventListener() {} }),
        addEventListener() {}
    };
    await import('../src/js/app.js');
    assert.equal(window.CatalogController, undefined);
    assert.equal(typeof window.SearchController.closeSearch, 'function');
    assert.equal(window.AuthController, undefined);
    window.SearchController.closeSearch();
});
