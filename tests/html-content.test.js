import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('browser logic contains no authored Russian content, contact numbers or pickup catalog', () => {
    const source = fs.readFileSync('src/js/app.js', 'utf8');
    assert.doesNotMatch(source, /['"`][^\n]*[А-Яа-яЁё]{2}/);
    assert.doesNotMatch(source, /2504-477215|108809|55\.751244|55\.678|\+7\s*\(\d{3}/);
    assert.doesNotMatch(source, /const catalog\s*=\s*\[\s*\{/);
});

test('every referenced interface text exists in the HTML template', () => {
    const source = fs.readFileSync('src/js/app.js', 'utf8');
    const html = fs.readFileSync('src/html/includes/_ui-content.html', 'utf8');
    const keys = new Set([...html.matchAll(/data-ui-copy="([^"]+)"/g)].map((match) => match[1]));
    for (const [, key] of source.matchAll(
        /(?:uiText|showMessage)\([^\n]*?'([a-z]+(?:-[a-z]+)*-\d+)'/g,
    )) {
        assert.ok(keys.has(key), key);
    }
});
