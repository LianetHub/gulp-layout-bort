import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import fileinclude from 'gulp-file-include';
import Vinyl from 'vinyl';
import { HtmlValidate } from 'html-validate';

const root = path.resolve(import.meta.dirname, '..');
export const validator = new HtmlValidate({
    extends: ['html-validate:standard', 'html-validate:document'],
    // Local assets are delivered with the site; SRI remains required for CDNs.
    rules: { 'require-sri': ['error', { target: 'crossorigin' }] },
    elements: ['html5', { form: { attributes: { action: { required: true } } } }],
});

export async function renderPage(name) {
    const filename = path.join(root, 'src', name);
    const contents = await readFile(filename);
    return new Promise((resolve, reject) => {
        const stream = fileinclude({ prefix: '@@', basepath: '@file', context: {} });
        stream.on('data', (file) => resolve(file.contents.toString().replaceAll('@img/', 'img/')));
        stream.on('error', reject);
        stream.end(
            new Vinyl({ cwd: root, base: path.join(root, 'src'), path: filename, contents }),
        );
    });
}

export async function validatePages() {
    const pages = (await readdir(path.join(root, 'src')))
        .filter((name) => name.endsWith('.html'))
        .sort();
    const reports = [];
    for (const page of pages) {
        const html = await renderPage(page);
        const report = await validator.validateString(html, page);
        reports.push({ page, html, report });
    }
    return reports;
}
