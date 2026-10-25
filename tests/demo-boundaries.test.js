import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

test('demo modules never persist state or generate page navigation', () => {
    for (const file of readdirSync('src/js/modules').filter(file => file.endsWith('.js'))) {
        const source = readFileSync(`src/js/modules/${file}`, 'utf8');
        assert.doesNotMatch(source, /localStorage|sessionStorage|new Pagination\(/, file);
    }
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
