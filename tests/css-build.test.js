import test from 'node:test';
import assert from 'node:assert/strict';
import Vinyl from 'vinyl';
import { minifyCss } from '../gulp/tasks/scss.js';

test('production CSS preserves descendant relationships inside :has()', async () => {
    const css = await new Promise((resolve, reject) => {
        const stream = minifyCss();
        stream.on('data', file => resolve(file.contents.toString()));
        stream.on('error', reject);
        stream.end(new Vinyl({ path: 'style.css', contents: Buffer.from('.header:has(~ .page .account--addresses) { display: none; }') }));
    });
    assert.match(css, /\.page\s+\.account--addresses/);
    assert.doesNotMatch(css, /\.page\.account--addresses/);
});
