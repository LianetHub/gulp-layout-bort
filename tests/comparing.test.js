import test from 'node:test';
import assert from 'node:assert/strict';
import { comparisonRows } from '../src/js/modules/comparing.js';

const rows = [
    { key: 'brand', values: ['Bort', 'Bort', 'Bort'] },
    { key: 'family', values: ['до 4', 'до 6', 'до 6'] },
    { key: 'speed', values: ['3 500', '4 100', '4 500'] }
];

test('comparison filters distinguish equal and different characteristics', () => {
    assert.deepEqual(comparisonRows(rows, [0, 1, 2], 'different').map(row => row.visible), [false, true, true]);
    assert.deepEqual(comparisonRows(rows, [0, 1, 2], 'similar').map(row => row.visible), [true, false, false]);
    assert.ok(comparisonRows(rows, [0, 1, 2]).every(row => row.visible));
});

test('removing a product recalculates differences using the remaining original indexes', () => {
    assert.deepEqual(comparisonRows(rows, [1, 2])[1].values, ['до 6', 'до 6']);
    assert.deepEqual(comparisonRows(rows, [2, 0])[2].values, ['4 500', '3 500']);
    assert.deepEqual(comparisonRows(rows, [1, 2], 'different').map(row => row.visible), [false, false, true]);
    assert.ok(comparisonRows(rows, [2], 'similar').every(row => row.visible));
    assert.ok(comparisonRows(rows, [], 'different').every(row => !row.visible));
    assert.deepEqual(rows[1].values, ['до 4', 'до 6', 'до 6']);
});
