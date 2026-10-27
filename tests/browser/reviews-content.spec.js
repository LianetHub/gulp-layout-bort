import { test, expect } from '@playwright/test';

test('reviews use div containers and blockquotes on both pages', async ({ page }) => {
    for (const name of ['reviews', 'product']) {
        await page.goto(`/docs/${name}.html`);
        const reviews = page.locator('.review');
        await expect(reviews).toHaveCount(3);
        expect(await reviews.evaluateAll(items => items.every(item => item.tagName === 'DIV' && item.querySelector('blockquote.review__content')))).toBe(true);
    }
});

for (const width of [375, 1440]) {
    test(`review page always shows full text at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 1000 });
        await page.goto('/docs/reviews.html');
        const content = page.locator('.review__content').first();
        await content.evaluate(el => {
            el.querySelector('.review__text').textContent = 'Полный текст отзыва. '.repeat(100);
            const block = document.createElement('div');
            block.className = 'review__block';
            block.textContent = 'Дополнительная часть отзыва';
            el.append(block);
        });
        await expect(content.locator('.review__block').last()).toBeVisible();
        const text = content.locator('.review__text');
        await expect(text).toHaveCSS('-webkit-line-clamp', 'none');
        expect(await text.evaluate(el => el.scrollHeight <= el.clientHeight)).toBe(true);
        await expect(page.locator('.review__toggle:visible')).toHaveCount(0);
    });
}

test('mobile review layout matches the design', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 375, height: 900 }, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    await page.goto('/docs/reviews.html');
    await page.evaluate(() => document.fonts.ready);
    const geometry = await page.locator('.review').evaluateAll(items => items.map(el => {
        const bounds = selector => el.querySelector(selector).getBoundingClientRect();
        const content = bounds('.review__content');
        const brand = bounds('.review__brand');
        const image = bounds('.review__brand-image');
        const header = bounds('.review__header');
        const meta = bounds('.review__meta');
        return { left: brand.left - content.left, gap: brand.top - content.bottom, width: image.width, height: image.height, header: header.height, dateTop: meta.top - header.top };
    }));
    expect(geometry.map(item => [item.width, item.height])).toEqual([[69, 30], [32, 32], [136, 20]]);
    for (const item of geometry) {
        expect(item.left).toBe(0);
        expect(item.gap).toBe(20);
        expect(item.header).toBe(67);
        expect(item.dateTop).toBe(0);
    }
    await expect(page.locator('.rating-summary__btn')).toHaveCSS('height', '44px');
    await context.close();
});
