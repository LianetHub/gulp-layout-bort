import test from 'node:test';
import assert from 'node:assert/strict';
import { CodeRequest, validateAuthValue } from '../src/js/modules/auth-dialogs.js';

test('code request expires by wall clock and is invalidated by changed phone', () => {
    const request = new CodeRequest();
    request.start('+7 (999) 123-45-67', 1000);
    assert.equal(request.remaining(1000), 60);
    assert.equal(request.remaining(60500), 1);
    assert.equal(request.remaining(61000), 0);
    assert.equal(request.matches('79991234567'), true);
    assert.equal(request.matches('79991234568'), false);
    request.reset();
    assert.equal(request.matches('79991234567'), false);
});

test('auth validation rejects empty fields, invalid phone, email, code and unchecked agreement', () => {
    for (const [name, value] of [['username', '  '], ['email', 'user@'], ['phone', '+7 123'], ['code', '12a4'], ['agreement', false], ['password', '']]) {
        assert.ok(validateAuthValue(name, value), name);
    }
    for (const [name, value] of [['username', 'Иван'], ['email', 'user@example.ru'], ['phone', '+7 (999) 123-45-67'], ['code', '2459'], ['agreement', true], ['password', 'secret']]) {
        assert.equal(validateAuthValue(name, value), '', name);
    }
});
