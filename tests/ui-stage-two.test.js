import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8');

test('account pages share one sidebar and orders have separate list/detail URLs', () => {
    for (const page of ['lk-person', 'lk-orders', 'lk-order', 'lk-address']) {
        assert.match(read(`src/${page}.html`), /@@include\('html\/includes\/_account-sidebar.html'/, page);
    }
    assert.ok(!fs.existsSync('src/lk-history.html'));
    assert.match(read('src/lk-orders.html'), /class="orders__input[^\"]*" type="text"/);
});

test('list controls contain no client-side sorting or matching of server data', () => {
    for (const name of ['orders', 'product-listing', 'review', 'faq', 'news']) {
        const section = read('src/js/app.js').split(`// === ${name} ===`)[1]?.split('// ===')[0];
        assert.ok(section, `Missing application section: ${name}`);
        assert.doesNotMatch(section, /\.sort\(|function matches\(|const filter =|data-faq-/, name);
    }
    assert.equal(JSON.parse(read('src/html/json/reviews.json')).length, 3);
});

test('every form upload uses the shared component and every FAQ category is a link', () => {
    for (const name of ['src/html/includes/_contacts.html', 'src/html/includes/_contact-form.html', 'src/html/includes/_installation-form.html', 'src/spare-parts.html']) {
        assert.match(read(name), /@@include\([^\n]*_file-upload.html/, name);
    }
    const faq = read('src/html/includes/_faq.html');
    assert.doesNotMatch(faq, /<button[^>]*class="faq__filter/);
    assert.match(faq, /<a[^>]*href="#"[^>]*class="faq__filter/);
});
