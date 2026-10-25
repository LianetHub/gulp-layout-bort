import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fontsStyle } from '../gulp/tasks/fonts.js';

test('icon font side bearings preserve the glyph position inside its em square', () => {
    const font = fs.readFileSync('src/fonts/icons.ttf');
    const tables = {};
    for (let index = 0; index < font.readUInt16BE(4); index++) {
        const offset = 12 + index * 16;
        tables[font.toString('ascii', offset, offset + 4)] = font.readUInt32BE(offset + 8);
    }
    const longOffsets = font.readInt16BE(tables.head + 50) === 1;
    const glyphCount = font.readUInt16BE(tables.maxp + 4);
    const metricsCount = font.readUInt16BE(tables.hhea + 34);
    const glyphOffset = index => longOffsets
        ? font.readUInt32BE(tables.loca + index * 4)
        : font.readUInt16BE(tables.loca + index * 2) * 2;
    for (let index = 0; index < glyphCount; index++) {
        if (glyphOffset(index) === glyphOffset(index + 1)) continue;
        const boundsLeft = font.readInt16BE(tables.glyf + glyphOffset(index) + 2);
        const metric = index < metricsCount ? index * 4 + 2 : metricsCount * 4 + (index - metricsCount) * 2;
        assert.equal(font.readInt16BE(tables.hmtx + metric), boundsLeft, `glyph ${index}`);
    }
});

test('font generation uses source fonts and ignores stale output', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'bort-fonts-'));
    const previous = globalThis.app;
    try {
        for (const folder of ['src/fonts', 'src/scss', 'docs/fonts']) fs.mkdirSync(path.join(directory, folder), { recursive: true });
        fs.writeFileSync(path.join(directory, 'src/fonts/GolosText-VariableFont_wght.ttf'), '');
        fs.writeFileSync(path.join(directory, 'src/fonts/icons.ttf'), '');
        fs.writeFileSync(path.join(directory, 'docs/fonts/Roboto-Regular.woff2'), '');
        globalThis.app = { path: { srcFolder: path.join(directory, 'src'), build: { fonts: path.join(directory, 'docs/fonts') } } };
        await fontsStyle();
        const destination = path.join(directory, 'src/scss/fonts.scss');
        const styles = fs.readFileSync(destination, 'utf8');
        assert.match(styles, /font-family: 'GolosText'/);
        assert.match(styles, /font-weight: 100 900/);
        assert.match(styles, /font-family: 'icons'/);
        assert.doesNotMatch(styles, /Roboto/);
        const modified = fs.statSync(destination).mtimeMs;
        await fontsStyle();
        assert.equal(fs.statSync(destination).mtimeMs, modified);
    } finally {
        globalThis.app = previous;
        fs.rmSync(directory, { recursive: true, force: true });
    }
});
