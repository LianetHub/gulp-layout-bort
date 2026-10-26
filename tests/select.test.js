import test from 'node:test';
import assert from 'node:assert/strict';
import { loadApp } from './helpers/app.js';
const { CustomSelect } = loadApp(['CustomSelect']);

test('dropdown search matches a substring ignoring spaces, case and ё', () => {
    assert.equal(CustomSelect.matchesOption('Орёл, Советская', ' ОРЕЛ '), true);
    assert.equal(CustomSelect.matchesOption('Санкт-Петербург', 'петер'), true);
    assert.equal(CustomSelect.matchesOption('Москва', '   '), true);
    assert.equal(CustomSelect.matchesOption('Москва', 'тула'), false);
});
