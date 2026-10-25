import test from 'node:test';
import assert from 'node:assert/strict';
import { favorites } from '../src/js/modules/favorites.js';

test('favorites keep HTML cards and only reset buttons or remove a category row', () => {
    const handlers = {};
    const buttons = [true, false, true].map(active => ({
        classList: { remove() { active = false; }, contains() { return active; } },
        setAttribute(name, value) { this[name] = value; }
    }));
    let removed = false;
    const root = {
        dataset: {},
        addEventListener(type, callback) { handlers[type] = callback; },
        querySelectorAll(selector) { assert.equal(selector, '.favorite-btn'); return buttons; }
    };
    globalThis.document = { querySelectorAll: () => [root] };
    favorites();
    handlers.click({ target: { closest: selector => selector === '.favorites__clear' ? {} : null } });
    assert.ok(buttons.every(button => !button.classList.contains('active') && button['aria-pressed'] === 'false'));
    handlers.click({ target: { closest: selector => selector === '[data-remove-category]' ? {
        closest: () => ({ remove() { removed = true; } })
    } : null } });
    assert.ok(removed);
    delete globalThis.document;
});
