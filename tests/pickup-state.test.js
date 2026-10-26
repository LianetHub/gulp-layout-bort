import test from 'node:test';
import assert from 'node:assert/strict';
import { loadApp } from './helpers/app.js';
const { savePickup, removePickup, filterPickups } = loadApp(['savePickup', 'removePickup', 'filterPickups']);

test('adding an existing pickup selects it without creating duplicates', () => {
    const points = [{ id: 'one', selected: true }, { id: 'two', selected: false }];
    const result = savePickup(points, { id: 'two' });
    assert.equal(result.length, 2);
    assert.deepEqual(result.map(point => point.selected), [false, true]);
    assert.equal(points[0].selected, true);
});

test('replacing a pickup with an already saved one merges the duplicate', () => {
    assert.deepEqual(savePickup([{ id: 'one' }, { id: 'two' }], { id: 'two' }, 'one'), [{ id: 'two', selected: true }]);
});

test('removing the selected point chooses the next one and supports an empty list', () => {
    assert.deepEqual(removePickup([{ id: 'one', selected: true }, { id: 'two' }], 'one'), [{ id: 'two', selected: true }]);
    assert.deepEqual(removePickup([{ id: 'one', selected: true }], 'one'), []);
});

test('search ignores case and surrounding spaces and includes the address', () => {
    const points = [{ id: 'one', title: 'Ozon — ул. Ленина', address: 'Москва' }, { id: 'two', title: 'Ozon — пр-т Мира', address: 'Москва' }];
    assert.deepEqual(filterPickups(points, '  ЛЕНИНА '), [points[0]]);
    assert.deepEqual(filterPickups(points, 'не найдено'), []);
});
