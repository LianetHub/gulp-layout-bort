// Test fixtures use the same classic source without starting the whole site.
export async function loadApp(names) {
    const source = (await (await fetch('../src/js/app.js')).text()).replace(
        /const uiContent = [^;]+;/,
        'const uiContent = testContent;',
    );
    const markup = document.createElement('div');
    markup.innerHTML = await (await fetch('/src/html/includes/_ui-content.html')).text();
    const testContent = markup.querySelector('#ui-content').content;
    const marker = source.indexOf('// Start the application once the document is ready.');
    if (marker === -1 || names.some((name) => !/^[A-Za-z_$][\w$]*$/.test(name))) {
        throw new Error('Invalid application test entry point');
    }
    return new Function(
        'testContent',
        `${source.slice(0, marker)}return { ${names.join(', ')} };\n})();`.replace(
            '(function () {',
            'return (function () {',
        ),
    )(testContent);
}
