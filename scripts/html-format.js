import { readFileSync } from 'node:fs';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import beautify from 'js-beautify';

export const htmlFormatOptions = JSON.parse(
    readFileSync(new URL('../.jsbeautifyrc', import.meta.url), 'utf8'),
).html;

export function formatHtml(source) {
    // A comparison such as `i < photos.length` is JavaScript, not an HTML tag.
    // Protect loop headers, then format their HTML bodies separately.
    const loops = [];
    const pattern = /@@for\s*\(/g;
    let match;
    while ((match = pattern.exec(source))) {
        const start = match.index;
        let end = balancedEnd(source, start + match[0].length - 1, '(', ')');
        while (/\s/.test(source[end] || '') && end < source.length) {
            end++;
        }
        if (source[end] !== '{') {
            continue;
        }
        const finish = balancedEnd(source, end, '{', '}');
        loops.push({
            start,
            end: finish,
            bodyStart: end + 1,
            text: source.slice(start, finish),
        });
        pattern.lastIndex = finish;
    }
    let protectedSource = source;
    for (let index = loops.length - 1; index >= 0; index--) {
        const loop = loops[index];
        protectedSource =
            protectedSource.slice(0, loop.start) +
            `<!-- gulp-for-${index} -->` +
            protectedSource.slice(loop.end);
    }
    return beautify
        .html(protectedSource, htmlFormatOptions)
        .replace(/^([ \t]*)<!-- gulp-for-(\d+) -->/gm, (token, indentation, index) => {
            const loop = loops[index];
            const body = source.slice(loop.bodyStart, loop.end - 1);
            if (!/<[a-z][\w:-]*[\s>]/i.test(body)) {
                return indentation + loop.text;
            }

            const header = source.slice(loop.start, loop.bodyStart);
            const nestedIndentation = indentation + ' '.repeat(htmlFormatOptions.indent_size);
            const formattedBody = formatHtml(body.trim())
                .trimEnd()
                .split('\n')
                .map((line) => (line ? nestedIndentation + line : line))
                .join('\n');

            return `${indentation}${header}\n${formattedBody}\n${indentation}}`;
        });
}

function balancedEnd(source, start, opening, closing) {
    let depth = 0;
    let quote = '';
    for (let index = start; index < source.length; index++) {
        const character = source[index];
        if (quote) {
            if (character === '\\') {
                index++;
            } else if (character === quote) {
                quote = '';
            }
        } else if (['"', "'", '`'].includes(character)) {
            quote = character;
        } else if (character === opening) {
            depth++;
        } else if (character === closing && --depth === 0) {
            return index + 1;
        }
    }
    throw new Error('Unclosed Gulp loop in HTML');
}

async function htmlFiles(directory) {
    const entries = await readdir(directory, {
        withFileTypes: true,
    });
    const files = [];
    for (const entry of entries) {
        const filename = path.join(directory, entry.name);
        if (entry.isDirectory() && entry.name !== 'libs') {
            files.push(...(await htmlFiles(filename)));
        } else if (entry.isFile() && entry.name.endsWith('.html')) {
            files.push(filename);
        }
    }
    return files.sort();
}

async function runFormatter() {
    const mode = process.argv[2];
    if (!['--write', '--check'].includes(mode)) {
        throw new Error('Usage: node scripts/html-format.js --write|--check');
    }
    const files = await htmlFiles(fileURLToPath(new URL('../src', import.meta.url)));
    const changed = [];
    for (const filename of files) {
        const source = await readFile(filename, 'utf8');
        const formatted = formatHtml(source);
        if (source !== formatted) {
            changed.push(path.relative(process.cwd(), filename));
            if (mode === '--write') {
                await writeFile(filename, formatted);
            }
        }
    }
    if (mode === '--check' && changed.length) {
        console.error(changed.join('\n'));
        process.exitCode = 1;
    }
    console.log(
        `HTML: ${files.length} files, ${changed.length} ${mode === '--write' ? 'formatted' : 'unformatted'}`,
    );
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
    runFormatter().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}
