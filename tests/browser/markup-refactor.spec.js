import { test, expect } from '@playwright/test';

test('cart buttons toggle and restore their original content', async ({ page }) => {
    for (const name of ['index', 'catalog', 'search', 'product', 'favorite', 'compare']) {
        await page.goto(`/docs/${name}.html`);
        const button = page.locator('main .add-to-cart-btn').first();
        const original = await button.innerHTML();
        const originalLabel = await button.getAttribute('aria-label');
        await button.click();
        await expect(button).toHaveClass(/is-added/);
        await expect(button).toHaveAttribute('aria-pressed', 'true');
        expect(await button.evaluate(element => element.matches('.icon-tick') || !!element.querySelector('.icon-tick'))).toBe(true);
        const notices = await page.locator('.notify').count();
        await button.click();
        await expect(button).not.toHaveClass(/is-added/);
        await expect(button).toHaveAttribute('aria-pressed', 'false');
        expect(await button.innerHTML(), name).toBe(original);
        expect(await button.getAttribute('aria-label'), name).toBe(originalLabel);
        expect(await page.locator('.notify').count()).toBeLessThanOrEqual(notices);
        await button.click();
        await expect(button).toHaveClass(/is-added/);
    }
});

for (const width of [375, 1440]) {
    test(`refactored icons and layouts render at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 1000 });
        await page.route('**/api-maps.yandex.ru/**', (route) => route.abort());
        const missing = [];
        page.on('response', (response) => {
            if (response.status() === 404 && new URL(response.url()).pathname.startsWith('/docs/') && /\.(?:svg|woff2?|png|jpg|webp)(?:\?|$)/.test(response.url())) {
                missing.push(response.url());
            }
        });
        for (const name of ['cart', 'favorite', 'compare', 'checkout', 'contacts', 'lk-order']) {
            await page.goto(`/docs/${name}.html`);
            await page.evaluate(() => document.fonts.ready);
            expect(await page.locator('img:not([alt]), img[alt=""]').count(), name).toBe(0);
            expect(await page.locator('svg:not(.contacts__illustration)').count(), name).toBe(0);
            const icons = await page.locator('main span[aria-hidden="true"][class*="icon-"]').evaluateAll((elements) => elements
                .filter((element) => element.getBoundingClientRect().width > 0)
                .map((element) => ({
                    name: element.className,
                    font: getComputedStyle(element, '::before').fontFamily,
                    content: getComputedStyle(element, '::before').content,
                })));
            for (const icon of icons) {
                expect(icon.font, icon.name).toContain('icons');
                expect(icon.content, icon.name).not.toMatch(/^(?:none|normal|""|''|)$/);
            }
            await page.screenshot({ path: `.tmp-refactor/screenshots/${name}-${width}.png` });
        }
        expect(missing).toEqual([]);
        await page.goto('/docs/cart.html');
        await page.evaluate(() => window.Fancybox.show([{ src: '#order', type: 'inline' }]));
        const grid = page.locator('.order-form__grid');
        await expect(grid).toBeVisible();
        expect(await grid.evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').length)).toBe(width === 375 ? 1 : 2);
        await expect(page.locator('#order-comment')).toBeVisible();
    });
}
