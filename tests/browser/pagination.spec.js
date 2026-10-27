import { test, expect } from '@playwright/test';

for (const width of [375, 1440]) {
    test(`page navigation uses one component across the site at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 1000 });
        let reference;
        for (const name of ['reviews', 'catalog', 'search', 'favorite', 'blog', 'product']) {
            await page.goto(`/docs/${name}.html`);
            const pagination = page.locator('nav.pagination');
            await expect(pagination).toHaveCount(1);
            await expect(pagination.locator('.pagination__pages')).toHaveCount(1);
            await expect(pagination.locator('.pagination__item[aria-current="page"]')).toHaveText('1');
            await expect(pagination.locator('.pagination__prev')).toHaveAttribute(name === 'blog' ? 'aria-disabled' : 'disabled', name === 'blog' ? 'true' : '');
            const styles = await pagination.locator('.pagination__item').first().evaluate(el => {
                const style = getComputedStyle(el);
                return ['width', 'height', 'fontSize', 'borderRadius', 'backgroundColor', 'color'].map(key => style[key]);
            });
            reference ||= styles;
            expect(styles, name).toEqual(reference);
            if (width === 375 || width === 1440) {
                expect(styles).toEqual(['40px', '40px', '14px', '8px', 'rgb(255, 98, 1)', 'rgb(255, 255, 255)']);
                await expect(pagination).toHaveCSS('gap', '10px');
                await expect(pagination.locator('.pagination__pages')).toHaveCSS('gap', '10px');
                await expect(pagination.locator('.pagination__next')).toHaveCSS('height', '40px');
                await pagination.locator('.pagination__item.active').hover();
                await expect(pagination.locator('.pagination__item.active')).toHaveCSS('background-color', 'rgb(255, 98, 1)');
                await expect(pagination.locator('.pagination__item.active')).toHaveCSS('color', 'rgb(255, 255, 255)');
            }
            expect(await pagination.locator('.pagination__item').last().textContent()).toBe(name === 'blog' ? '40' : ['catalog', 'search'].includes(name) ? '4' : '6');
        }
    });
}

test('news pagination preserves page links', async ({ page }) => {
    await page.goto('/docs/blog.html');
    await expect(page.locator('.pagination__next')).toHaveAttribute('href', 'blog.html?page=2');
    await expect(page.locator('.pagination__item').last()).toHaveAttribute('href', 'blog.html?page=40');
});
