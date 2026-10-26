import test from 'node:test';
import assert from 'node:assert/strict';
import { loadApp } from './helpers/app.js';

function formController() {
    const { FormController } = loadApp(['FormController']);
    const controller = Object.create(FormController.prototype);
    controller.selectors = { requiredAttr: '[data-required]' };
    controller.messages = {
        empty: 'required',
        tel: 'phone',
        email: 'email',
        checkbox: 'agreement',
    };
    controller.toggleErrorState = () => {};
    return controller;
}

test('disabled required fields do not block form validation', () => {
    const controller = formController();
    const field = { type: 'text', value: '', disabled: true, matches: () => true };
    assert.equal(controller.validateForm({ querySelectorAll: () => [field] }), true);
});

test('a required radio group is valid when another enabled option is checked', () => {
    const controller = formController();
    const field = {
        type: 'radio',
        name: 'delivery',
        value: 'first',
        checked: false,
        matches: () => false,
    };
    const second = { ...field, checked: true };
    field.form = { elements: [field, second] };
    assert.equal(controller.validateField(field), true);
});

test('quantity normalization enforces the same bounds for all purchase controls', () => {
    const { normalizeQuantity } = loadApp(['normalizeQuantity']);
    for (const [value, expected] of [
        ['', 1],
        ['0', 1],
        ['2', 2],
        ['100000a', 9999],
    ]) {
        assert.equal(normalizeQuantity(value), expected);
    }
});

test('map loading timeout removes the stale script so a retry creates a new request', async () => {
    const { loadMaps } = loadApp(['loadMaps']);
    const originalTimeout = globalThis.setTimeout;
    const originalClear = globalThis.clearTimeout;
    const scripts = [];
    const timers = [];
    globalThis.document = {
        querySelector: () => scripts.find((script) => !script.removed),
        createElement: () => ({
            addEventListener() {},
            remove() {
                this.removed = true;
            },
        }),
        head: { append: (script) => scripts.push(script) },
    };
    globalThis.setTimeout = (callback) => {
        timers.push(callback);
        return timers.length;
    };
    globalThis.clearTimeout = () => {};
    try {
        const first = loadMaps();
        timers[0]();
        await assert.rejects(first, /timed out/);
        assert.equal(scripts[0].removed, true);
        const retry = loadMaps();
        assert.equal(scripts.length, 2);
        timers[1]();
        await assert.rejects(retry, /timed out/);
    } finally {
        globalThis.setTimeout = originalTimeout;
        globalThis.clearTimeout = originalClear;
        delete globalThis.document;
    }
});
