import test from 'node:test';
import assert from 'node:assert/strict';
import * as select from '../src/js/modules/select.js';

test('dropdown search matches a substring ignoring spaces, case and ё', () => {
    assert.equal(select.matchesOption('Орёл, Советская', ' ОРЕЛ '), true);
    assert.equal(select.matchesOption('Санкт-Петербург', 'петер'), true);
    assert.equal(select.matchesOption('Москва', '   '), true);
    assert.equal(select.matchesOption('Москва', 'тула'), false);
});
