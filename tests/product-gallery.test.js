import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fileInclude from 'gulp-file-include';
import Vinyl from 'vinyl';
import { loadApp } from './helpers/app.js';

const product = { image: 'one.png', name: 'Product', guarantee: false, sku: '1', id: '1', currentPrice: '10', price: '10', oldPrice: '20', sale: false };
const images = [{ image: 'one.png', name: 'Front' }, { image: 'two.png', name: 'Back' }];

async function render(template, context) {
    const filename = path.resolve('src/html/templates/gallery-fixture.html');
    const stream = fileInclude({ prefix: '@@', basepath: '@file' });
    const result = new Promise((resolve, reject) => {
        stream.on('data', file => resolve(file.contents.toString()));
        stream.on('error', reject);
    });
    stream.end(new Vinyl({ base: path.resolve('src'), path: filename, contents: Buffer.from(`@@include('${template}', ${JSON.stringify(context)})`) }));
    return result;
}

for (const template of ['_product-tile.html', '_product-card-favorite.html', '_search-result.html', '_listing-product.html']) {
    test(`${template}: cards have a gallery by default and preserve supplied photos`, async () => {
        for (const extra of [{}, { images: [] }, { images: [images[1]] }]) {
            const html = await render(template, { ...product, ...extra });
            assert.match(html, /data-product-gallery/);
            assert.equal((html.match(/class="product-tile__picture"/g) || []).length, 3);
            assert.match(html, extra.images?.length ? /src="two.png"/ : /src="one.png"/);
        }
        const html = await render(template, { ...product, images });
        assert.match(html, /data-product-gallery/);
        assert.equal((html.match(/class="product-tile__picture"/g) || []).length, 2);
        assert.match(html, /src="two.png"/);
        assert.match(html, /alt="Back"/);
        assert.doesNotMatch(html, /@@|\$\{/);
    });
}

test('comparison cards always display only the main product photo', async () => {
    for (const extra of [{}, { images }]) {
        const html = await render('_product-card-compare.html', { ...product, ...extra });
        assert.doesNotMatch(html, /data-product-gallery|product-tile__slider|swiper-pagination/);
        assert.equal((html.match(/class="comparing-card__picture"/g) || []).length, 1);
        assert.match(html, /src="one.png"/);
        assert.doesNotMatch(html, /src="two.png"/);
    }
});

test('only the compact sale showcase keeps static product images', async () => {
    for (const compact of [true, false]) {
        const html = await render('../includes/_products-showcase.html', { title: 'Products', link: 'catalog.html', compact, popular: false });
        const cards = html.match(/<div class="product product-tile[\s\S]*?class="product-tile__cart[\s\S]*?<\/button>\s*<\/div>/g) || [];
        assert.ok(cards.length > 0);
        for (const card of cards) {
            assert.equal(card.includes('data-product-gallery'), !compact);
            assert.equal((card.match(/class="product-tile__picture"/g) || []).length, compact ? 1 : 3);
        }
    }
});

test('a one-slide gallery never initializes Swiper or hover areas', () => {
    const { productGalleries } = loadApp(['productGalleries']);
    globalThis.document = { querySelectorAll: () => [{ querySelector: () => ({ querySelectorAll: () => [{}] }) }] };
    globalThis.Swiper = function () { throw new Error('Single image initialized Swiper'); };
    globalThis.window = { matchMedia: () => ({ matches: false }) };
    assert.doesNotThrow(() => productGalleries());
    delete globalThis.Swiper;
});
