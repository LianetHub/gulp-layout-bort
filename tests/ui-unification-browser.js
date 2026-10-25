let frame = document.querySelector('#preview');
const results = document.querySelector('#results');
let passed = 0;
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const check = (condition, name) => {
    if (!condition) throw new Error(name);
    const item = document.createElement('li');
    item.className = 'test-result';
    item.textContent = 'PASS: ' + name;
    results.append(item);
    passed++;
};
const css = element => frame.contentWindow.getComputedStyle(element);

async function load(page, width, scripts = true) {
    const next = frame.cloneNode();
    next.removeAttribute('srcdoc');
    frame.replaceWith(next);
    frame = next;
    frame.style.width = width + 'px';
    let html = await (await fetch(`../docs/${page}.html`)).text();
    if (!scripts) html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
    frame.srcdoc = html.replace('<head>', `<head><base href="${new URL('../docs/', location.href)}">`);
    await new Promise(resolve => frame.addEventListener('load', resolve, { once: true }));
    await frame.contentDocument.fonts.ready;
    await wait(100);
    return frame.contentDocument;
}

try {
    for (const width of [375, 768, 1199, 1200, 1440]) {
        for (const page of ['index', 'faq', 'policy', 'lk-person', 'cart', 'catalog']) {
            const doc = await load(page, width);
            const dark = ['faq', 'lk-person', 'cart', 'catalog'].includes(page);
            check(css(doc.querySelector('.page')).backgroundColor === (dark ? 'rgb(247, 247, 246)' : 'rgb(255, 255, 255)'), `${width}: ${page} тема`);
            check(doc.documentElement.scrollWidth <= width, `${width}: ${page} без переполнения`);
            if (page === 'lk-person') {
                check((css(doc.querySelector('.header')).display === 'none') === (width < 768), `${width}: шапка кабинета`);
            }
            if (page === 'index') {
                const marketing = doc.querySelector('.marketing__slider .swiper').swiper;
                check(Boolean(marketing) && marketing.params.slidesPerView === (width >= 1200 ? 3 : 'auto'), `${width}: маркетинговый Swiper`);
                check(marketing.params.navigation.nextEl === doc.querySelector('.marketing__next'), `${width}: локальная навигация Swiper`);
                for (const card of doc.querySelectorAll('.promo-card--small')) {
                    const title = card.querySelector('.promo-card__title');
                    check(title.getBoundingClientRect().bottom <= card.getBoundingClientRect().bottom && title.scrollWidth <= title.clientWidth + 1, `${width}: текст промокарточки помещается`);
                }
            }
            if (page === 'faq') {
                check((css(doc.querySelector('.faq__sections')).display !== 'none') === (width >= 1200), `${width}: разделы FAQ`);
                check((css(doc.querySelector('.faq__categories')).display !== 'none') === (width < 1200), `${width}: категории FAQ`);
                check(doc.querySelectorAll('details[open]').length === 1, `${width}: начальное состояние FAQ`);
                check([...doc.querySelectorAll('.faq__navigation')].every(nav => nav.querySelectorAll('ul > li > a').length > 0), `${width}: списки навигации FAQ`);
            }
            if (page === 'policy') {
                const content = doc.querySelector('.wysiwyg');
                check(!content.querySelector('[class]'), `${width}: WYSIWYG без внутренних классов`);
                check(css(content.querySelector('h2')).fontSize === (width < 768 ? '20px' : '24px'), `${width}: WYSIWYG наследует размер заголовка`);
                check(css(content.querySelector('p')).fontSize === (width < 768 ? '16px' : '18px'), `${width}: WYSIWYG наследует размер текста`);
            }
        }
    }

    const doc = await load('faq', 375, false);
    const summary = doc.querySelector('summary');
    const detail = summary.parentElement;
    summary.click();
    check(detail.open && detail.querySelector('.faq__answer').getBoundingClientRect().height > 0, 'FAQ раскрывается без JavaScript');
    doc.querySelectorAll('summary')[1].click();
    check(doc.querySelectorAll('details[open]').length === 3, 'FAQ допускает несколько открытых ответов без JavaScript');
    summary.click();
    check(!detail.open, 'FAQ закрывается без JavaScript');
    document.title = `PASS: ${passed} проверок унификации`;
    document.querySelector('.test-title').textContent = document.title;
} catch (error) {
    document.title = 'FAIL: унификация';
    const item = document.createElement('li');
    item.className = 'test-result';
    item.textContent = 'FAIL: ' + error.message;
    results.append(item);
    console.error(error);
}
