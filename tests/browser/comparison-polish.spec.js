import { test, expect } from '@playwright/test';

for (const name of ['catalog', 'search']) {
    test(`${name}: expanded filter choices form one list with the button last`, async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 1000 });
        await page.goto(`/docs/${name}.html`);
        const group = page.locator('.listing-filter__group').first();
        const button = group.locator('.listing-filter__expand');
        await button.click();
        await expect(button).toHaveAttribute('aria-expanded', 'true');
        const geometry = await group.evaluate(element => {
            const items = [...element.querySelectorAll('.listing-filter__choice')].map(item => item.getBoundingClientRect());
            return { gaps: items.slice(1).map((item, index) => item.top - items[index].bottom), button: element.querySelector('.listing-filter__expand').getBoundingClientRect().top, last: items.at(-1).bottom };
        });
        expect(geometry.gaps).toEqual([6, 6, 6, 6, 6, 6]);
        expect(geometry.button).toBeGreaterThan(geometry.last);
        await button.click();
        await expect(group.locator('.listing-filter__extra')).toBeHidden();
    });
}

test('comparison has static photos, bounded navigation and edge fades', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/docs/compare.html');
    await expect(page.locator('.comparing-card [data-product-gallery], .comparing-card .swiper')).toHaveCount(0);
    const column = page.locator('[data-compare-column="desktop"]');
    const slider = column.locator('.comparing__swiper');
    expect(await slider.evaluate(el => el.swiper.params.rewind || el.swiper.params.loop)).toBe(false);
    await expect(column.locator('.comparing__prev')).toBeHidden();
    await expect(column).toHaveClass(/has-next/);
    await expect(column).not.toHaveClass(/has-prev/);
    expect(await column.evaluate(el => getComputedStyle(el, '::after').pointerEvents)).toBe('none');
    const favorite = column.locator('.favorite-btn').first();
    await favorite.click();
    await expect(favorite).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await column.locator('.comparing__next').click();
    await expect(column).toHaveClass(/has-prev/);
    await slider.evaluate(el => el.swiper.slideTo(el.swiper.slides.length - 1, 0));
    await expect(column.locator('.comparing__next')).toBeHidden();
    await expect(column).not.toHaveClass(/has-next/);
    await slider.evaluate(el => el.swiper.slideNext(0));
    expect(await slider.evaluate(el => el.swiper.isEnd)).toBe(true);
    await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; scrollTo(0, 600); });
    await expect(page.locator('.comparing__panel')).toHaveClass(/is-stuck/);
    await expect(column.locator('.comparing-card__picture').first()).toHaveCSS('height', '60px');
    const image = column.locator('.comparing-card__picture').first();
    await image.evaluate(el => { el.style.aspectRatio = '2 / 1'; });
    await expect(image).toHaveCSS('width', '120px');
});

test('important rows retain their nodes and track card movement throughout a drag', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/docs/compare.html');
    await page.locator('.comparing__content [data-important]').nth(0).check();
    await page.locator('.comparing__content [data-important]').nth(1).check();
    const values = page.locator('.comparing__important .comparing__values').first();
    await values.scrollIntoViewIfNeeded();
    await page.evaluate(() => {
        window.importantRow = document.querySelector('.comparing__important-rows .comparing__block');
        window.comparisonSamples = [];
        window.recordComparison = true;
        const record = () => {
            const shift = selector => new DOMMatrix(getComputedStyle(document.querySelector(selector)).transform).m41;
            const card = shift('[data-compare-column="desktop"] .swiper-wrapper');
            window.comparisonSamples.push(Math.abs(card - shift('.comparing__important .comparing__value')));
            if (window.recordComparison) requestAnimationFrame(record);
        };
        requestAnimationFrame(record);
    });
    const rect = await values.boundingBox();
    await page.mouse.move(rect.x + rect.width * .8, rect.y + rect.height / 2);
    await page.mouse.down();
    await page.mouse.move(rect.x + rect.width * .8 - 360, rect.y + rect.height / 2, { steps: 16 });
    await page.mouse.up();
    await expect.poll(() => page.locator('[data-compare-column="desktop"] .comparing__swiper').evaluate(el => el.swiper.animating)).toBe(false);
    const result = await page.evaluate(() => {
        window.recordComparison = false;
        return { same: window.importantRow === document.querySelector('.comparing__important-rows .comparing__block'), delta: Math.max(...window.comparisonSamples) };
    });
    expect(result.same).toBe(true);
    expect(result.delta).toBeLessThan(2);
});
