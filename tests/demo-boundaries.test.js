import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('demo modules never persist state or generate page navigation', () => {
    const source = readFileSync('src/js/app.js', 'utf8');
    assert.doesNotMatch(source, /localStorage|sessionStorage|new Pagination\(/);
});

test('comparison mock values cover every product and IDs remain unique', () => {
    const read = name => JSON.parse(readFileSync(`src/html/json/${name}.json`, 'utf8'));
    const products = read('comparing-products');
    assert.ok(products.length >= 6);
    assert.equal(new Set(products.map(product => product.id)).size, products.length);
    for (const row of read('comparing-rows')) {
        assert.equal(JSON.parse(row.values.replaceAll('&quot;', '"')).length, products.length, row.key);
    }
});
