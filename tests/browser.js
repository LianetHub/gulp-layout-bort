import { delegate } from '../src/js/modules/dom.js';
import { slide, fade, show, hide } from '../src/js/modules/effects.js';
import { FormController } from '../src/js/modules/forms.js';
import { partsOrder } from '../src/js/modules/parts-order.js';
import { filters } from '../src/js/modules/filters.js';
import { rangeFilters } from '../src/js/modules/range.js';
import { sliders } from '../src/js/modules/sliders.js';
import { faq } from '../src/js/modules/faq.js';
import { news } from '../src/js/modules/news.js';
import { reviews } from '../src/js/modules/review.js';
import { cart } from '../src/js/modules/cart.js';
import { compare } from '../src/js/modules/compare.js';
import { interactions, NotifyController } from '../src/js/modules/interactions.js';
import { CatalogController } from '../src/js/modules/catalog.js';
import { SearchController } from '../src/js/modules/search.js';
import { AuthController } from '../src/js/modules/auth.js';
import { header } from '../src/js/modules/header.js';
import { spollers } from '../src/js/modules/spoller.js';
import initSlideToggle from '../src/js/modules/slideToggle.js';

// Explicit fixture widths keep JS breakpoint tests independent of privacy extensions.
const testWidth = Number(new URLSearchParams(location.search).get('width'));

const fixture = document.querySelector('#fixture');
const results = document.querySelector('#results');
const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const settle = async () => {
    const animations = document.getAnimations();
    // Finish explicitly so offscreen/minimized browser rendering cannot stall tests.
    animations.forEach(animation => animation.finish());
    await Promise.all(animations.map(animation => animation.finished.catch(() => {})));
    await wait(350);
};
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const tests = [];
const test = (name, run) => tests.push({ name, run });

test('delegation matches nested and dynamically inserted buttons', () => {
    fixture.innerHTML = '<div class="delegation"></div>';
    const root = fixture.firstElementChild;
    let matched;
    delegate(root, 'click', '.action', (event, element) => { matched = element; });
    root.innerHTML = '<button class="action"><span>click</span></button>';
    root.querySelector('span').click();
    assert(matched === root.querySelector('button'), 'Matched button is passed instead of listener root');
});

test('slide/fade preserve layout, reverse rapidly and cancel stale callbacks', async () => {
    fixture.innerHTML = '<div class="panel" hidden style="display:none;padding:12px;margin:4px;box-sizing:content-box"><p>Panel content</p></div><table><tbody><tr style="display:none"><td>Row</td></tr></tbody></table>';
    const panel = fixture.querySelector('.panel');
    let stale = false;
    slide(panel, true, 50);
    await wait(20);
    slide(panel, false, 80, () => { stale = true; });
    await wait(20);
    slide(panel, true, 50);
    await settle();
    assert(!panel.hidden && getComputedStyle(panel).display !== 'none', 'Final panel is open');
    assert(!stale && panel.style.overflow === '', `Old close callback cancelled, overflow restored (stale=${stale}, overflow=${panel.style.overflow})`);
    assert(panel.style.height === '' && panel.style.padding === '12px', 'Inline layout restored');
    slide(panel, false, 30);
    await settle();
    assert(panel.hidden && getComputedStyle(panel).display === 'none', 'Closed state is hidden');
    show(panel);
    assert(!panel.hidden && getComputedStyle(panel).display === 'block', 'Immediate show clears hidden');
    const row = fixture.querySelector('tr');
    fade(row, true, 30);
    await settle();
    assert(getComputedStyle(row).display === 'table-row', 'Table row keeps native display');
    const flex = document.createElement('div');
    flex.style.display = 'flex';
    fixture.append(flex);
    fade(flex, false, 30);
    await settle();
    show(flex);
    assert(getComputedStyle(flex).display === 'flex', 'Animating a visible flex preserves display');
    hide(flex);
    show(flex);
    assert(getComputedStyle(flex).display === 'flex', 'Flex display restored');
});

test('legacy accordion reverses with its title state and explicit helpers do not patch prototypes', async () => {
    fixture.innerHTML = '<div data-spollers><button data-spoller class="_active">Title</button><div>Body</div></div>';
    spollers();
    const title = fixture.querySelector('button');
    const body = title.nextElementSibling;
    title.click();
    await wait(20);
    title.click();
    await settle();
    assert(title.classList.contains('_active') && !body.hidden, 'Rapid close/open matches active title');
    const helpers = initSlideToggle();
    helpers.slideToggle(body, 100);
    await wait(20);
    helpers.slideToggle(body, 30);
    await settle();
    assert(!body.hidden, 'Explicit toggle reverses closing animation');
    assert(!HTMLElement.prototype.slideToggle, 'Native prototype unchanged');
});

test('responsive accordion reveals its body when disabled at a breakpoint', async () => {
    fixture.innerHTML = '<div data-spollers="767.98,max"><button data-spoller class="_active">Title</button><div>Body</div></div>';
    const originalMatchMedia = window.matchMedia;
    let changed;
    const media = { matches: true, addListener(callback) { changed = callback; } };
    window.matchMedia = query => query.includes('767.98') ? media : originalMatchMedia.call(window, query);
    try {
        spollers();
        fixture.querySelector('button').click();
        await settle();
        const body = fixture.querySelector('button').nextElementSibling;
        assert(body.hidden, 'Accordion closed');
        media.matches = false;
        changed();
        assert(!body.hidden && getComputedStyle(body).display !== 'none', 'Disabled accordion body revealed');
    } finally { window.matchMedia = originalMatchMedia; }
});

const controller = new FormController();
partsOrder();
test('forms validate before requests; mock success, failure, busy and missing endpoint', async () => {
    fixture.innerHTML = '<form class="form--parts" action="/mock-only" novalidate><div class="form__field"><input class="form__control" type="email" data-required><span class="form__error-message"></span></div><input class="form__file-input" type="file" multiple><span class="form__file-name"></span><p class="form__status" hidden></p><button type="submit">Send</button></form>';
    const form = fixture.querySelector('form');
    const input = form.querySelector('input');
    const button = form.querySelector('button');
    const status = form.querySelector('.form__status');
    const submit = () => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    const originalFetch = window.fetch;
    let calls = 0;
    let resolve;
    window.fetch = () => { calls++; return new Promise(done => { resolve = done; }); };
    try {
        submit();
        assert(calls === 0 && input.classList.contains('_error'), 'Invalid form makes no request');
        input.value = 'test@example.com';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        assert(!input.classList.contains('_error'), 'Error clears on input');
        const file = form.querySelector('[type="file"]');
        const transfer = new DataTransfer();
        transfer.items.add(new File(['test'], 'test.txt', { type: 'text/plain' }));
        file.files = transfer.files;
        file.dispatchEvent(new Event('change', { bubbles: true }));
        assert(form.querySelector('.form__file-name').textContent === 'test.txt', 'File name shown');
        submit();
        submit();
        assert(calls === 1 && button.disabled && form.getAttribute('aria-busy') === 'true', 'Duplicate submission blocked');
        resolve({ ok: true });
        await wait(20);
        assert(!button.disabled && !form.hasAttribute('aria-busy') && status.textContent.includes('Заявка отправлена'), 'Success restores state');
        assert(file.files.length === 0 && form.querySelector('.form__file-name').hidden, 'File reset after success');
        input.value = 'test@example.com';
        window.fetch = async () => { calls++; return { ok: false }; };
        submit();
        await wait(20);
        assert(status.textContent.includes('Не удалось') && !button.disabled && input.value, 'Failure keeps entered data');
        const before = calls;
        form.action = '#';
        form.setAttribute('action', '#');
        submit();
        assert(calls === before && status.textContent.includes('временно недоступна'), 'Missing endpoint is local only');
        const phone = document.createElement('input');
        phone.type = 'tel';
        form.append(phone);
        phone.value = '89991234567';
        phone.dispatchEvent(new InputEvent('input', { bubbles: true, data: '7' }));
        assert(phone.value === '+7 (999) 123-45-67', 'Phone formatting retained');
        phone.value = '7';
        phone.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }));
        assert(phone.value === '', 'Backspace clears prefix');
    } finally { window.fetch = originalFetch; }
});

test('FAQ toggles and filters; news reveals three cards; review votes toggle once', () => {
    fixture.innerHTML = '<section class="faq"><div><button class="faq__filter" data-faq-product="0">All</button><button class="faq__filter" data-faq-product="1">One</button><button class="faq__filter" data-faq-product="2">Empty</button></div><div class="faq__item" data-product="1"><button class="faq__question" aria-expanded="false"><span>Question</span></button><div class="faq__answer" hidden>Answer</div></div><p class="faq__empty" hidden>Empty</p></section><section class="news--listing"><style>.news-card:not(.is-visible){display:none}</style><div class="news-card">1</div><div class="news-card">2</div><div class="news-card">3</div><div class="news-card">4</div><button class="news__btn">More</button></section><article class="review"><button class="review__vote" data-vote="helpful" aria-pressed="false"><span class="review__vote-count">2</span></button><button class="review__vote" aria-pressed="false"><span class="review__vote-count">3</span></button></article>';
    faq();
    news();
    reviews();
    fixture.querySelector('.faq__question span').click();
    assert(!fixture.querySelector('.faq__answer').hidden, 'FAQ opens from nested content');
    fixture.querySelector('[data-faq-product="2"]').click();
    assert(!fixture.querySelector('.faq__empty').hidden, 'Empty filter state shown');
    fixture.querySelector('[data-faq-product="0"]').click();
    assert(!fixture.querySelector('.faq__item').hidden, 'All filter restores items');
    const more = fixture.querySelector('.news__btn');
    more.click();
    assert(fixture.querySelectorAll('.news-card.is-visible').length === 3 && !more.disabled, 'Three news cards revealed');
    more.click();
    assert(more.disabled, 'News button disables after last batch');
    const vote = fixture.querySelector('.review__vote');
    vote.querySelector('span').click();
    assert(vote.textContent === '3' && vote.getAttribute('aria-pressed') === 'true', 'Vote increments');
    vote.click();
    assert(vote.textContent === '2', 'Vote cancels');
});

test('filters apply, clear, close each other and reset', async () => {
    const filter = type => `<div class="filter-dropdown" data-type="${type}"><button type="button" class="filter-dropdown__trigger"><span class="filter-dropdown__text" data-default="Filter">Filter</span><span class="filter-dropdown__icon icon-chevron-down"></span></button><div class="filter-dropdown__body" style="display:none"><input type="${type}" value="1"><button type="button" class="btn-apply">Apply</button></div></div>`;
    fixture.innerHTML = `<form>${filter('checkbox')}${filter('radio')}<button type="reset">Reset</button></form>`;
    filters();
    const [first, second] = fixture.querySelectorAll('.filter-dropdown');
    first.querySelector('button').click();
    first.querySelector('input').checked = true;
    first.querySelector('.btn-apply').click();
    assert(first.classList.contains('is-selected') && first.querySelector('.filter-dropdown__text').textContent === 'Filter (1)', 'Applied checkbox count');
    first.querySelector('.icon-cross').click();
    assert(!first.querySelector('input').checked && !first.classList.contains('is-selected'), 'Cross clears selection');
    first.querySelector('button').click();
    second.querySelector('button').click();
    assert(!first.classList.contains('active') && second.classList.contains('active'), 'Only one open filter');
    second.querySelector('input').checked = true;
    second.querySelector('.btn-apply').click();
    fixture.querySelector('[type="reset"]').click();
    await wait(250);
    assert(!second.classList.contains('is-selected') && !second.querySelector('input').checked, 'Form reset clears filters');
});

test('range inputs and external reset stay synchronized', async () => {
    fixture.innerHTML = '<form id="range-test"><div class="range"><div class="range__slider"></div><div><input class="range__control--start" min="0" maxlength="8" value="100"><span class="range__unit">от</span><span class="range__unit">₽</span></div><div><input class="range__control--end" max="10000" maxlength="8" value="5000"><span class="range__unit">до</span><span class="range__unit">₽</span></div></div></form><button type="reset" form="range-test">Reset</button>';
    rangeFilters();
    const slider = fixture.querySelector('.range__slider').noUiSlider;
    const start = fixture.querySelector('.range__control--start');
    start.value = '1000';
    start.dispatchEvent(new Event('change'));
    assert(Math.round(Number(slider.get()[0])) === 1000, 'Input changes slider');
    fixture.querySelector('button').click();
    await wait(30);
    assert(start.value === '100' && Math.round(Number(slider.get()[0])) === 100, 'External reset changes slider');
    slider.destroy();
});

test('sliders bind local controls and do not initialize twice', () => {
    const slider = '<div class="promotions__slider" style="width:200px"><div class="swiper" style="width:200px;overflow:hidden"><div class="swiper-wrapper" style="display:flex"><div class="swiper-slide">One</div><div class="swiper-slide">Two</div></div></div><button class="swiper-button-prev">Prev</button><button class="swiper-button-next">Next</button><div class="swiper-pagination"></div></div>';
    fixture.innerHTML = slider + slider;
    sliders();
    const [first, second] = [...fixture.querySelectorAll('.swiper')].map(element => element.swiper);
    assert(first && second && first !== second, 'Separate instances');
    assert(first.navigation.nextEl === fixture.querySelector('.swiper-button-next'), 'Local navigation element');
    sliders();
    assert(fixture.querySelector('.swiper').swiper === first, 'Existing instance preserved');
    first.slideNext(0);
    assert(first.activeIndex === 1 && second.activeIndex === 0, 'Sliding one instance leaves another unchanged');
    first.destroy();
    second.destroy();
});

test('header controllers retain selectors, focus, catalog hover and search actions', () => {
    fixture.innerHTML = '<header class="header"><button class="header__burger icon-menu">Menu</button><div id="header-menu"></div><button class="header__backdrop" hidden></button><div class="header-catalog"><button class="header-catalog__toggler">Catalog</button><div class="header-catalog__content"><span class="header-catalog__current"></span><ul class="header-catalog__list"><li class="header-catalog__item--parent"><a class="header-catalog__link">Tools</a><button class="header-catalog__more">More</button><div class="header-catalog__submenu">Submenu</div></li></ul></div></div><div class="search"><button class="search__toggler">Search</button><div class="search__content"><form class="search__form"><input class="search__form-input"><button type="button" class="search__clear" hidden>Clear</button></form><div class="search__bar" hidden><a href="#">Result</a></div><a class="search__all"></a></div></div><div class="header__auth"><button class="header__auth-btn">Profile</button><div class="header__person-menu"></div></div></header>';
    const navigation = header();
    window.CatalogController = new CatalogController();
    window.SearchController = new SearchController(navigation);
    window.AuthController = new AuthController();
    fixture.querySelector('.header-catalog__toggler').click();
    assert(fixture.querySelector('.header-catalog__content').classList.contains('visible'), 'Catalog opens');
    fixture.querySelector('.header-catalog__more').click();
    assert(fixture.querySelector('.header-catalog__item--parent').classList.contains('open-submenu') && fixture.querySelector('.header-catalog__current').textContent === 'Tools', 'Catalog classes/title retained');
    fixture.querySelector('.search__toggler').click();
    const input = fixture.querySelector('.search__form-input');
    assert(document.activeElement === input && !fixture.querySelector('.header-catalog__content').classList.contains('visible'), 'Search focuses input and closes catalog');
    input.value = 'tools & drill';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    assert(!fixture.querySelector('.search__bar').hidden && fixture.querySelector('.search__all').getAttribute('href').includes('tools%20%26%20drill'), 'Search results and encoded link');
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    assert(document.activeElement === fixture.querySelector('.search__bar a'), 'ArrowDown focuses result');
    fixture.querySelector('.search__clear').click();
    assert(input.value === '' && document.activeElement === input && fixture.querySelector('.search__bar').hidden, 'Clear updates and focuses search');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    assert(document.activeElement === fixture.querySelector('.search__toggler'), 'Escape restores search focus');
    fixture.querySelector('.header__burger').click();
    assert(fixture.querySelector('#header-menu').classList.contains('is-open'), 'Burger opens navigation');
    const focusGroup = document.createElement('div');
    focusGroup.className = 'header__content';
    focusGroup.innerHTML = '<button class="first-focus">First</button><button class="last-focus">Last</button>';
    fixture.querySelector('header').append(focusGroup);
    const first = focusGroup.querySelector('.first-focus');
    const last = focusGroup.querySelector('.last-focus');
    first.focus();
    first.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }));
    assert(document.activeElement === last, 'Shift+Tab wraps to last item');
    last.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    assert(document.activeElement === first, 'Tab wraps to first item');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    assert(!fixture.querySelector('#header-menu').classList.contains('is-open') && document.activeElement === fixture.querySelector('.header__burger'), 'Escape closes burger and restores focus');
});

test('cart address toggles rapidly and checkout validation gates the modal', async () => {
    fixture.innerHTML = '<section class="cart"><div class="form__field"><select name="cart_payment"><option value="">Payment</option><option value="card">Card</option></select></div><div class="form__field"><select name="cart_delivery"><option value="pickup">Pickup</option><option value="delivery">Delivery</option></select></div><div class="cart__checkout-address form__field" hidden style="display:none"><input name="cart_delivery_address"></div><button class="cart__total-order">Order</button></section>';
    let opened = 0;
    window.Fancybox = { show: () => { opened++; }, bind() {} };
    cart();
    const delivery = fixture.querySelector('[name="cart_delivery"]');
    const field = fixture.querySelector('.cart__checkout-address');
    const change = value => { delivery.value = value; delivery.dispatchEvent(new Event('change')); };
    change('delivery');
    await wait(20);
    change('pickup');
    await wait(20);
    change('delivery');
    await wait(400);
    assert(!field.hidden && getComputedStyle(field).display !== 'none', 'Latest delivery choice wins');
    fixture.querySelector('[name="cart_payment"]').value = 'card';
    fixture.querySelector('.cart__total-order').click();
    assert(opened === 0 && field.classList.contains('_error'), 'Missing address blocks checkout');
    fixture.querySelector('[name="cart_delivery_address"]').value = 'Test address';
    fixture.querySelector('.cart__total-order').click();
    assert(opened === 1, 'Valid checkout opens modal');
    delete window.Fancybox;
});

test('quantity limits, favorites and notification text are preserved', async () => {
    fixture.innerHTML = '<article class="product"><div class="product__name">Drill &lt;test&gt;</div><div class="quantity-block"><input class="quantity-block__input" value="1"><button class="quantity-block__up">+</button><button class="quantity-block__down">-</button></div><button class="favorite-btn" aria-pressed="false"><span>Favorite</span></button><button class="add-to-cart-btn">Add</button></article><div class="notify-container"></div>';
    interactions();
    const notify = new NotifyController();
    notify.displayTime = 100;
    const input = fixture.querySelector('input');
    fixture.querySelector('.quantity-block__down').click();
    assert(input.value === '1', 'Quantity minimum');
    input.value = '100000a';
    input.dispatchEvent(new Event('input'));
    assert(input.value === '9999', 'Quantity maximum and digits');
    fixture.querySelector('.favorite-btn span').click();
    assert(fixture.querySelector('.favorite-btn').getAttribute('aria-pressed') === 'true', 'Nested favorite click');
    fixture.querySelector('.add-to-cart-btn').click();
    assert(fixture.querySelector('.notify__text').textContent === 'Добавлено: Drill <test> (9999 шт.)', 'Notification displays literal product text');
    await wait(150);
    await settle();
    assert(!fixture.querySelector('.notify'), 'Notification expires');
});

test('comparison rows match the current responsive layout', async () => {
    fixture.innerHTML = '<section class="compare"><div class="compare__table"><div class="compare__row">1</div><div class="compare__row">2</div><div class="compare__row">3</div><div class="compare__row">4</div></div><button class="compare__more-btn">More</button></section>';
    compare();
    const button = fixture.querySelector('button');
    const row = fixture.querySelectorAll('.compare__row')[3];
    if (window.innerWidth <= 767.98) {
        assert(getComputedStyle(row).display === 'none', 'Fourth row initially hidden');
        button.click();
        await settle();
        assert(getComputedStyle(row).display !== 'none', 'Expand reveals fourth row');
        button.click();
        await settle();
        assert(row.hidden, 'Collapse hides fourth row');
    } else assert(getComputedStyle(row).display !== 'none' && getComputedStyle(button).display === 'none', 'Desktop shows all rows');
});

let failures = 0;
for (const { name, run } of tests) {
    const item = document.createElement('li');
    results.append(item);
    try {
        if (testWidth) Object.defineProperty(window, 'innerWidth', { configurable: true, value: testWidth });
        await run();
        item.textContent = `PASS: ${name}`;
    } catch (error) {
        failures++;
        item.textContent = `FAIL: ${name}: ${error.stack}`;
    }
}
fixture.replaceChildren();
document.title = `${tests.length - failures}/${tests.length} passed — Native JS`;
results.dataset.failures = failures;
results.dataset.width = testWidth || window.innerWidth;
