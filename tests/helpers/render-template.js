import path from 'node:path';
import fileinclude from 'gulp-file-include';
import Vinyl from 'vinyl';

export function renderTemplate(name, data) {
    return new Promise((resolve, reject) => {
        const stream = fileinclude({ prefix: '@@', basepath: '@file' });
        stream.on('data', (file) => resolve(file.contents.toString().replaceAll('@img/', 'img/')));
        stream.on('error', reject);
        stream.end(
            new Vinyl({
                base: path.resolve('src'),
                path: path.resolve('src/html/templates/fixture.html'),
                contents: Buffer.from(`@@include('${name}', ${JSON.stringify(data)})`),
            }),
        );
    });
}
