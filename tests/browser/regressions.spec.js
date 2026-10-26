import { test, expect } from '@playwright/test';
import { validator } from '../../scripts/html-validation.js';
import { renderTemplate } from '../helpers/render-template.js';

test('reinitializing product controls does not toggle an action twice', async ({ page }) => {
    await page.goto('/docs/product.html');
    await page.evaluate(async () => {
        const { loadApp } = await import('/tests/helpers/app-browser.js');
        const { productDetails } = await loadApp(['productDetails']);
        productDetails();
    });
    const button = page.locator('.product-content__expand');
    await button.click();
    await expect(button).toHaveAttribute('aria-expanded', 'true');
});

test('reinitializing sliders preserves the active product thumbnail', async ({ page }) => {
    await page.goto('/docs/product.html');
    await page.evaluate(async () => {
        document.querySelector('.product-details__gallery .swiper').swiper.slideTo(1, 0);
        const { loadApp } = await import('/tests/helpers/app-browser.js');
        const { sliders } = await loadApp(['sliders']);
        sliders();
    });
    await expect(page.locator('.product-details__thumb').nth(1)).toHaveAttribute(
        'aria-pressed',
        'true',
    );
});

test('a card with multiple photos keeps one local gallery instance', async ({ page }) => {
    const html = await renderTemplate('_product-tile-gallery.html', {
        name: 'Галерея',
        image: 'img/product/caiman-01.png',
        images: ['01', '03', '04'].map((index) => ({ image: `img/product/caiman-${index}.png` })),
    });
    await page.goto('/docs/index.html');
    const result = await page.evaluate(async (markup) => {
        const fixture = document.createElement('div');
        fixture.className = 'gallery-test';
        fixture.style.width = '210px';
        fixture.innerHTML = markup;
        document.querySelector('main').append(fixture);
        const { loadApp } = await import('/tests/helpers/app-browser.js');
        const { productGalleries } = await loadApp(['productGalleries']);
        productGalleries();
        const element = fixture.querySelector('.swiper');
        const instance = element.swiper;
        instance.slideTo(1, 0);
        productGalleries();
        return {
            same: element.swiper === instance,
            active: instance.activeIndex,
            bullets: fixture.querySelectorAll('.swiper-pagination-bullet').length,
            areas: fixture.querySelectorAll('.product-tile__areas').length,
        };
    }, html);
    expect(result).toEqual({ same: true, active: 1, bullets: 3, areas: 1 });
});

test('form reset clears custom errors after a rejected submission', async ({ page }) => {
    await page.goto('/docs/contacts.html');
    const result = await page.evaluate(() => {
        const form = document.querySelector('input[data-required]')?.form;
        if (!form) throw new Error('Missing validation fixture');
        const field = form.querySelector('[data-required]');
        field.value = '';
        window.FormController.validateForm(form);
        const before = field.getAttribute('aria-invalid');
        form.reset();
        return new Promise((resolve) =>
            queueMicrotask(() => resolve({ before, after: field.getAttribute('aria-invalid') })),
        );
    });
    expect(result).toEqual({ before: 'true', after: 'false' });
});

test('phone paste preserves formatted numbers and normalizes them after input', async ({
    page,
}) => {
    await page.goto('/docs/contacts.html');
    const field = page.locator('input[type="tel"]').first();
    await field.focus();
    await field.evaluate((input) => {
        const clipboardData = new DataTransfer();
        clipboardData.setData('text/plain', '+7 (999) 123-45-67');
        input.dispatchEvent(
            new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData }),
        );
    });
    await expect(field).toHaveValue('+7 (999) 123-45-67');
});

test('pasting correction digits replaces only the selected part of a phone number', async ({
    page,
}) => {
    await page.goto('/docs/contacts.html');
    const field = page.locator('input[type="tel"]').first();
    await field.evaluate((input) => {
        input.value = '+7 (999) 123-45-67';
        input.focus();
        input.setSelectionRange(15, 17);
        const clipboardData = new DataTransfer();
        clipboardData.setData('text/plain', '89');
        input.dispatchEvent(
            new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData }),
        );
    });
    await expect(field).toHaveValue('+7 (999) 123-45-89');
});

test('a failed map request leaves contact details usable and reports the fallback', async ({
    page,
}) => {
    await page.route('**/api-maps.yandex.ru/**', (route) => route.abort());
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/docs/contacts.html');
    await expect(page.locator('.map-block__status')).toContainText('Не удалось загрузить карту');
    await expect(page.locator('.contacts__form')).toBeVisible();
    expect(errors).toEqual([]);
});

test('opening a select and adding a delivery address preserve valid HTML', async ({ page }) => {
    await page.goto('/docs/catalog.html');
    await page.locator('.product-listing__sort-label .custom-select__trigger').click();
    let report = await validator.validateString(await page.content(), 'catalog-open.html');
    expect(report.results.flatMap((result) => result.messages)).toEqual([]);
    await page.goto('/docs/checkout.html');
    await page.locator('.checkout__address > .checkout__change').click();
    await page.locator('#address-picker .address-picker__add').click();
    await page.locator('#address-picker [name="city"]').fill('Москва');
    await page.locator('#address-picker [name="street"]').fill('Тестовая, 10');
    await page.locator('#address-picker .address-picker__form [type="submit"]').click();
    await expect(page.locator('.checkout__selected-title')).toHaveText('Москва, Тестовая, 10');
    await expect(page.locator('.fancybox__container')).toHaveCount(0);
    report = await validator.validateString(await page.content(), 'checkout-added.html');
    expect(report.results.flatMap((result) => result.messages)).toEqual([]);
});
