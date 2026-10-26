import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { renderPage } from '../scripts/html-validation.js';

const pages = (await readdir('src')).filter((name) => name.endsWith('.html'));
const retainedImages = /^(?:logo-(?:white|compact)\.svg|icons\/(?:vk|dzen|rutube|youtube|d2|telegram|max)\.svg|pickup\/(?:ozon|pin)\.svg|placemark\.svg|marketplaces\/(?:ya_market|wb-short|ozon)\.svg|decor\/bg-wave\.svg)$/;

test('expanded pages use component layouts, font icons and nonempty image descriptions', async () => {
    const failures = [];
    for (const page of pages) {
        const html = await renderPage(page);
        for (const match of html.matchAll(/class="([^"]*)"/g)) {
            if (match[1].split(/\s+/).some((name) => /^(?:row|col(?:-[\w]+)+)$/.test(name))) {
                failures.push(`${page}: legacy grid ${match[1]}`);
            }
        }
        for (const match of html.matchAll(/<img\b[^>]*>/g)) {
            if (!/\balt="[^"\s][^"]*"/.test(match[0])) {
                failures.push(`${page}: missing description ${match[0]}`);
            }
        }
        for (const match of html.matchAll(/<svg\b[^>]*>/g)) {
            if (!/class="contacts__illustration"/.test(match[0])) {
                failures.push(`${page}: inline interface SVG ${match[0]}`);
            }
        }
        for (const match of html.matchAll(/(?:@img|img)\/([^"'\s<>]+\.svg)/g)) {
            if (!retainedImages.test(match[1])) {
                failures.push(`${page}: interface image ${match[1]}`);
            }
        }
    }
    assert.deepEqual(failures, []);
});

async function sourceFiles(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    return (await Promise.all(entries.map((entry) => entry.isDirectory()
        ? sourceFiles(path.join(directory, entry.name))
        : path.join(directory, entry.name)))).flat();
}

test('authored styles and scripts do not embed interface SVG resources', async () => {
    const failures = [];
    for (const file of [...await sourceFiles('src/scss'), 'src/js/app.js']) {
        if (file.includes(`${path.sep}libs${path.sep}`)) continue;
        const source = await readFile(file, 'utf8');
        if (/data:image\/svg|<svg\b|modules\/grid/.test(source)) failures.push(file);
        for (const match of source.matchAll(/(?:@img|img)\/([^"'\s)]+\.svg)/g)) {
            if (!retainedImages.test(match[1])) failures.push(`${file}: ${match[1]}`);
        }
    }
    assert.deepEqual(failures, []);
});
