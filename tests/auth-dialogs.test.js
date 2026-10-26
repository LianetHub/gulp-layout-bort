import test from 'node:test';
import assert from 'node:assert/strict';
import { loadApp } from './helpers/app.js';
const { validateFieldValue } = loadApp(['validateFieldValue']);

test('auth validation rejects empty fields, invalid phone, email, code and unchecked agreement', () => {
    for (const [name, value] of [['username', '  '], ['email', 'user@'], ['phone', '+7 123'], ['code', '12a4'], ['agreement', false], ['password', '']]) {
        assert.ok(validateFieldValue(name, value), name);
    }
    for (const [name, value] of [['username', 'Иван'], ['email', 'user@example.ru'], ['phone', '+7 (999) 123-45-67'], ['code', '2459'], ['agreement', true], ['password', 'secret']]) {
        assert.equal(validateFieldValue(name, value), '', name);
    }
});
