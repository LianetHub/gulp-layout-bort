import test from 'node:test';
import assert from 'node:assert/strict';
import { loadApp } from './helpers/app.js';
const { faq } = loadApp(['faq']);

function fixture({ reduced = false, animate = true } = {}) {
    const listeners = {};
    const animations = [];
    const summary = { getBoundingClientRect: () => ({ height: 60 }) };
    const item = {
        open: false, style: { overflow: '' },
        querySelector: () => summary,
        addEventListener: (type, callback) => { listeners[type] = callback; },
        getBoundingClientRect: () => ({ height: item.open ? 180 : 60 }),
        ...(animate && { animate: () => {
            let finish;
            const animation = { finished: new Promise(resolve => { finish = resolve; }), cancel() {}, finish: () => finish() };
            animations.push(animation);
            return animation;
        } })
    };
    summary.addEventListener = item.addEventListener;
    globalThis.document = { querySelectorAll: () => [item] };
    globalThis.window = { matchMedia: () => ({ matches: reduced }) };
    globalThis.getComputedStyle = () => ({ borderTopWidth: '0px', borderBottomWidth: '0px' });
    const click = () => listeners.click({ preventDefault() {} });
    return { item, animations, click };
}

test('FAQ details animates both ways and only removes open after closing', async () => {
    const { item, animations, click } = fixture();
    faq();
    click();
    assert.equal(item.open, true);
    assert.equal(animations.length, 1);
    animations[0].finish();
    await Promise.resolve();
    click();
    assert.equal(item.open, true);
    animations[1].finish();
    await Promise.resolve();
    assert.equal(item.open, false);
    assert.equal(item.style.overflow, '');
});

test('FAQ ignores stale animation completion after rapid reversal', async () => {
    const { item, animations, click } = fixture();
    faq();
    click();
    click();
    click();
    for (const animation of animations) animation.finish();
    await Promise.resolve();
    assert.equal(item.open, true);
    assert.equal(item.style.overflow, '');
});

test('FAQ toggles immediately with reduced motion or without animation support', () => {
    for (const options of [{ reduced: true }, { animate: false }]) {
        const { item, animations, click } = fixture(options);
        faq();
        click();
        assert.equal(item.open, true);
        click();
        assert.equal(item.open, false);
        assert.equal(animations.length, 0);
    }
});
