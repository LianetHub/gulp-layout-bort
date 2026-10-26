import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';

test('application is a readable classic script without modules or webpack', () => {
    const source = readFileSync('src/js/app.js', 'utf8');
    assert.doesNotMatch(source, /^\s*(?:import|export)\s/m);
    assert.doesNotMatch(source, /__webpack_require__|webpackBootstrap/);
    assert.doesNotThrow(() => new Script(source));
    assert.ok(source.split('\n').length > 1000);
});

test('pages load the readable application and keep vendor scripts separate', () => {
    const scripts = readFileSync('src/html/_js.html', 'utf8');
    assert.match(scripts, /src="js\/app\.js"/);
    assert.doesNotMatch(scripts, /app\.min\.js|type="module"/);
    assert.match(scripts, /js\/libs\/swiper-bundle\.min\.js/);
    assert.match(scripts, /js\/libs\/fancybox\.umd\.js/);
});
