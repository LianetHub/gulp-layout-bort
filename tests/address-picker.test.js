import test from 'node:test';
import assert from 'node:assert/strict';
import { loadApp } from './helpers/app.js';
const { describeAddress } = loadApp(['describeAddress']);

test('address description includes provided details and preserves zero floor', () => {
    assert.deepEqual(describeAddress({ city: 'Москва', street: 'ул. Тверская, д. 12', apartment: '45', entrance: '2', floor: '0' }), {
        title: 'Москва, ул. Тверская, д. 12', details: 'Кв. / офис 45 · подъезд 2 · этаж 0'
    });
});

test('address description omits missing optional details', () => {
    assert.equal(describeAddress({ city: 'Москва', street: 'ул. Садовая, д. 10', apartment: '8' }).details, 'Кв. / офис 8');
    assert.equal(describeAddress({ city: 'Москва', street: 'ул. Садовая, д. 10' }).details, '');
});
