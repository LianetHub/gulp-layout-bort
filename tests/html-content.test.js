import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('contact numbers and pickup catalog remain in component HTML and JSON', () => {
    const source = fs.readFileSync('src/js/app.js', 'utf8');
    assert.doesNotMatch(source, /2504-477215|108809|55\.751244|55\.678|\+7\s*\(\d{3}/);
    assert.doesNotMatch(source, /const catalog\s*=\s*\[\s*\{/);
});
