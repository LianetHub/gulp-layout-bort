import { loadApp } from './helpers/app-browser.js';
const { checkout, cart } = await loadApp(['checkout', 'cart']);

const fixture = document.querySelector('#fixture');
const results = document.querySelector('#results');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const tests = [];
const test = (name, run) => tests.push({ name, run });
const checkoutHtml = new DOMParser().parseFromString(await (await fetch('../docs/checkout.html')).text(), 'text/html');
let closed;
function setup() {
    fixture.replaceChildren(...['#checkout-form', '#address-picker', '#pickup-picker'].map(selector => checkoutHtml.querySelector(selector).cloneNode(true)));
    closed = 0;
    window.Fancybox = { show() {}, getInstance: () => ({ close() { closed++; } }) };
    checkout();
    checkout();
    return fixture.querySelector('#checkout-form');
}
const changeDelivery = (form, value) => {
    const input = form.querySelector(`[name="delivery"][value="${value}"]`);
    input.checked = true;
    input.dispatchEvent(new Event('change', { bubbles: true }));
};

test('Ozon requires an explicit selection and submits only active delivery fields', () => {
    const form = setup();
    form.elements.city.value = 'Москва';
    form.elements.street.value = 'Тверская, 1';
    changeDelivery(form, 'ozon');
    let submitted = 0;
    form.addEventListener('submit', event => {
        if (!event.defaultPrevented) submitted++;
        event.preventDefault();
    });
    form.requestSubmit();
    assert(!form.querySelector('.checkout__pickup-error').hidden && submitted === 0, 'Missing point must block checkout');
    form.querySelector('.checkout__pickup-button').click();
    fixture.querySelector('.address-picker__pickup-form').requestSubmit();
    assert(closed === 1, 'Confirmation closes Fancybox when show() returns void; initialization is not duplicated');
    assert(form.querySelector('.checkout__pickup-title').textContent === 'Пункт выдачи Озон', 'Selected state retains the section title');
    assert(!form.querySelector('.checkout__pickup-selected').hidden, 'Selected point has a separate address block');
    form.requestSubmit();
    assert(submitted === 1, 'Selected point permits checkout');
    assert(!new FormData(form).has('city') && new FormData(form).get('pickup_point'), 'Ozon payload excludes courier fields');
    changeDelivery(form, 'courier');
    assert(form.elements.city.value === 'Москва' && form.elements.city.required && !form.elements.city.disabled, 'Courier address and validation survive delivery changes');
    assert(!new FormData(form).has('pickup_point'), 'Courier payload excludes pickup fields');
});

test('new pickup point validates whitespace, is selected safely, and is not duplicated', () => {
    const form = setup();
    changeDelivery(form, 'ozon');
    const picker = fixture.querySelector('#pickup-picker');
    form.querySelector('.checkout__pickup-button').click();
    picker.querySelector('.address-picker__add').click();
    const add = picker.querySelector('.address-picker__point-form');
    add.elements.city.value = '   ';
    add.elements.street.value = 'Пушкина, 38';
    add.requestSubmit();
    assert(closed === 0 && !form.elements.pickup_point.value, 'Whitespace city is rejected');
    add.elements.city.value = 'Москва';
    add.elements.street.value = '<img src=x onerror=alert(1)>';
    add.requestSubmit();
    assert(closed === 1 && !form.querySelector('.checkout__pickup-selected-title img'), 'Added address is rendered as text');
    const count = picker.querySelectorAll('.address-picker__card').length;
    form.querySelector('.checkout__pickup-button').click();
    picker.querySelector('.address-picker__add').click();
    add.elements.city.value = ' Москва ';
    add.elements.street.value = '<img src=x onerror=alert(1)>';
    add.requestSubmit();
    assert(picker.querySelectorAll('.address-picker__card').length === count, 'Duplicate address reuses the existing point');
});

test('back and cancel preserve confirmed pickup point', () => {
    const form = setup();
    changeDelivery(form, 'ozon');
    const picker = fixture.querySelector('#pickup-picker');
    form.querySelector('.checkout__pickup-button').click();
    picker.querySelector('.address-picker__pickup-form').requestSubmit();
    const selected = form.elements.pickup_point.value;
    form.querySelector('.checkout__pickup-button').click();
    picker.querySelector('.address-picker__radio').checked = true;
    picker.querySelector('.address-picker__add').click();
    picker.querySelector('.address-picker__back').click();
    assert(!picker.querySelector('[data-pickup-view="list"]').hidden, 'Back returns to list');
    assert(form.elements.pickup_point.value === selected, 'Draft changes do not change checkout');
    form.querySelector('.checkout__pickup-button').click();
    assert(picker.querySelector('.address-picker__radio:checked').value === selected, 'Reopening restores confirmed selection');
});

test('cart checkout link leads to checkout and empty cart cannot follow it', async () => {
    const doc = new DOMParser().parseFromString(await (await fetch('../docs/cart.html')).text(), 'text/html');
    fixture.replaceChildren(doc.querySelector('.cart').cloneNode(true));
    cart();
    const link = fixture.querySelector('.cart__total-order');
    assert(link.getAttribute('href') === 'checkout.html', 'Cart must link to checkout');
    fixture.querySelectorAll('.cart-item__remove').forEach(button => button.click());
    assert(link.getAttribute('aria-disabled') === 'true' && !link.hasAttribute('href'), 'Empty cart disables navigation');
});

let failed = 0;
for (const { name, run } of tests) {
    const result = document.createElement('li');
    results.append(result);
    try { await run(); result.textContent = `PASS: ${name}`; }
    catch (error) { failed++; result.textContent = `FAIL: ${name}: ${error.message}`; }
}
fixture.replaceChildren();
delete window.Fancybox;
results.dataset.failures = failed;
document.title = `${tests.length - failed}/${tests.length} passed — Checkout`;
