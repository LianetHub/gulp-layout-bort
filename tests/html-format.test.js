import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { formatHtml } from '../scripts/html-format.js';
import { renderTemplate } from './helpers/render-template.js';
import { execFileSync } from 'node:child_process';

test('shared HTML formatting settings do not prevent Gulp CLI from loading tasks', () => {
    const tasks = execFileSync(process.execPath, ['node_modules/gulp/bin/gulp.js', '--tasks-simple'], { encoding: 'utf8' });
    assert.match(tasks, /\bhtml\b/);
    assert.match(tasks, /\bbuild\b/);
});

test('HTML formatting preserves Gulp directives, inline spaces and raw content', async () => {
    const source = `<div><span class="sample">До <a class="link" href="#">ссылки</a> после</span>@@if(context.enabled){<b class="value">Да</b>}@@loop('_sample.html', [{"name":"Товар"}])<pre class="raw"> a\n  b</pre></div>`;
    const formatted = formatHtml(source);
    assert.equal(formatHtml(formatted), formatted);
    assert.ok(formatted.includes('До <a class="link" href="#">ссылки</a> после'));
    assert.ok(formatted.includes('@@if(context.enabled){'));
    assert.ok(formatted.includes(`@@loop('_sample.html', [{"name":"Товар"}])`));
    assert.ok(formatted.includes('<pre class="raw"> a\n  b</pre>'));
    const html = await renderTemplate('_cart-item.html', {
        name: 'Товар', image: '@img/cart/flange.png', price: 1, oldPrice: 1,
        weight: 1, quantity: 1, displayPrice: '1', sale: false, expanded: true,
    });
    assert.match(html, /<details[^>]+open>/);
    assert.doesNotMatch(html, /@@(?:include|loop|if)/);
});

test('formatter matches workspace HTML preferences without wrapping attributes', () => {
    const source = '<!doctype html><html lang="ru"><head><title>Тест</title></head><body><div class="example" data-label="' + 'x'.repeat(200) + '">Текст</div></body></html>';
    const formatted = formatHtml(source);
    assert.match(formatted, /\n    <head>/);
    assert.ok(formatted.includes('<div class="example" data-label="' + 'x'.repeat(200) + '">'));
    assert.equal(formatHtml(formatted), formatted);
});

test('Gulp for comparisons are kept out of HTML parsing and sibling indentation stays correct', () => {
    const directive = `@@for(var i = 0; i < 1; i++){@@include('_item.html', {"text":"}"})}`;
    const formatted = formatHtml(`<article><div class="visual">${directive}</div><p class="name">Товар</p></article>`);
    assert.ok(formatted.includes(directive));
    assert.match(formatted, /\n    <p class="name">/);
    assert.equal(formatHtml(formatted), formatted);
});

test('format commands include authored HTML but exclude generated output', async () => {
    const { scripts } = JSON.parse(await readFile('package.json', 'utf8'));
    assert.match(scripts.format, /html-format\.js --write/);
    assert.match(scripts['format:check'], /html-format\.js --check/);
});
