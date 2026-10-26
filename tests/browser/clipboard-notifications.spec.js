import { test, expect } from '@playwright/test';

for (const scenario of [
    { page: 'lk-order', button: '[data-copy-order]', title: 'Номер запроса скопирован', value: 'ORDER-TEST-42' },
    { page: 'cart', button: '.cart__share', title: 'URL корзины скопирован' },
]) {
    test(`${scenario.page} copies to clipboard and confirms success`, async ({ page, context }) => {
        await context.grantPermissions(['clipboard-read', 'clipboard-write']);
        await page.goto(`/docs/${scenario.page}.html`);
        if (scenario.value) {
            await page.locator('[data-order-number]').evaluate((el, value) => {
                el.textContent = value;
            }, scenario.value);
        }
        await page.locator(scenario.button).click();
        await expect(page.locator('.notify__title')).toHaveText(scenario.title);
        await expect(page.locator('.notify__text')).toHaveText(scenario.value || page.url());
        expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(scenario.value || page.url());
    });

    test(`${scenario.page} does not claim success if clipboard is denied`, async ({ page }) => {
        await page.goto(`/docs/${scenario.page}.html`);
        await page.evaluate(() => {
            Object.defineProperty(navigator, 'clipboard', {
                configurable: true,
                value: { writeText: async () => { throw new Error('Clipboard denied'); } },
            });
        });
        await page.locator(scenario.button).click();
        await expect(page.locator(scenario.page === 'cart' ? '.cart__message' : '[data-order-state="copy-error"]')).toBeVisible();
        await expect(page.locator('.notify')).toHaveCount(0);
    });
}
