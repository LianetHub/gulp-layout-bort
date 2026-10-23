import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateCart } from '../src/js/modules/cart.js';

test('cart totals use quantities and selected accessories', () => {
    assert.deepEqual(calculateCart([
        { price: 23490, oldPrice: 23490, quantity: 1, weight: 2.1 },
        { price: 41490, oldPrice: 45650, quantity: 1, weight: 4.6 },
        { price: 69850, oldPrice: 69850, quantity: 3, weight: 3.75 },
        { price: 1200, oldPrice: 1200, quantity: 1, weight: 0.3 }
    ]), { total: 275730, discount: 4160, quantity: 6, weight: 18.25 });
});

test('empty cart has zero totals', () => {
    assert.deepEqual(calculateCart([]), { total: 0, discount: 0, quantity: 0, weight: 0 });
});
