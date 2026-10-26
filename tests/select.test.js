import test from 'node:test';
import assert from 'node:assert/strict';
import { loadApp } from './helpers/app.js';
const select = loadApp(["matchesOption","CustomSelect","initCustomSelects"]);

test('dropdown search matches a substring ignoring spaces, case and ё', () => {
    assert.equal(select.matchesOption('Орёл, Советская', ' ОРЕЛ '), true);
    assert.equal(select.matchesOption('Санкт-Петербург', 'петер'), true);
    assert.equal(select.matchesOption('Москва', '   '), true);
    assert.equal(select.matchesOption('Москва', 'тула'), false);
});
