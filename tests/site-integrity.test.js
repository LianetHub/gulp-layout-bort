import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import fileinclude from 'gulp-file-include';
import Vinyl from 'vinyl';

const pages = ['index', 'catalog', 'product', 'cart', 'checkout', 'favorite', 'compare', 'search',
    'lk-person', 'lk-orders', 'lk-order', 'lk-address', 'contacts', 'faq', 'blog', 'delivery',
    'about', 'reviews', 'returns', 'service', 'services', 'spare-parts', 'policy', 'sitemap'].map(name => `${name}.html`);

function render(name) {
    return new Promise((resolve, reject) => {
        const stream = fileinclude({ prefix: '@@', basepath: '@file', context: {} });
        stream.on('data', file => resolve(file.contents.toString()));
        stream.on('error', reject);
        stream.end(new Vinyl({ cwd: process.cwd(), base: path.resolve('src'),
            path: path.resolve('src', name), contents: fs.readFileSync(`src/${name}`) }));
    });
}

test('the build exposes exactly the supported pages', () => {
    assert.deepEqual(fs.readdirSync('src').filter(name => name.endsWith('.html')).sort(), [...pages].sort());
});

test('account pages render exactly one primary heading', async () => {
    for (const page of pages.filter(page => page.startsWith('lk-'))) {
        const html = await render(page);
        assert.equal([...html.matchAll(/<h1\b/g)].length, 1, page);
    }
});

test('all pages expand includes and loops and link only to supported local pages', async () => {
    for (const page of pages) {
        const html = await render(page);
        assert.doesNotMatch(html, /@@(?:include|loop|if|[a-zA-Z_]\w*)/, page);
        if (page === 'search.html') {
            assert.match(html, /name="power" value="1200"\s+checked/);
            assert.match(html, /name="motor" value="bldc"\s+checked/);
        }
        for (const [button] of html.matchAll(/<button\b[^>]*class="[^"]*\bfavorite-btn\b[^"]*"[^>]*>.*?<\/button>/gs)) {
            assert.match(button, /\bicon-heart\b/, `${page}: favorite must use the icon font`);
            assert.doesNotMatch(button, /<img\b/, `${page}: favorite must replace its glyph when selected`);
        }
        for (const [, image] of html.matchAll(/@img\/([\w./-]+\.(?:svg|png|jpe?g|gif|webp))/g)) {
            assert.ok(fs.existsSync(`src/img/${image}`), `${page}: missing image ${image}`);
        }
        for (const [, href] of html.matchAll(/href=["']([^"']+\.html(?:[?#][^"']*)?)["']/g)) {
            if (/^(?:https?:)?\/\//.test(href)) continue;
            assert.ok(pages.includes(href.replace(/^\//, '').split(/[?#]/)[0]), `${page}: ${href}`);
        }
    }
});
