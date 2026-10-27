import { test, expect } from '@playwright/test';

test('catalog selected filters stay synchronized with the form and reset', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/docs/catalog.html');
    const chips = page.locator('.product-listing__chip');
    await expect(chips).toHaveCount(4);
    await chips.filter({ hasText: 'Мощность' }).click();
    await expect(page.locator('[name="power"]:checked')).toHaveCount(0);
    await page.locator('[name="power"][value="1470"]').check({ force: true });
    await expect(chips.filter({ hasText: '1 470' })).toHaveCount(1);
    await page.locator('.product-listing__clear').click();
    await expect(chips).toHaveCount(0);
    await expect(page.locator('.listing-filter input:checked')).toHaveCount(0);
    await expect(page.locator('[name="min_price"]')).toHaveValue('');
    await page.locator('[name="stock"]').check();
    await expect(chips).toHaveText(['В наличии']);
    await page.locator('.listing-filter__reset').click();
    await expect(page.locator('.product-listing__selected')).toBeHidden();
    await expect(page.locator('[name="stock"]')).not.toBeChecked();
});

for (const width of [1440, 768, 375]) {
    test(`catalog shows all nine cards at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 1000 });
        await page.goto('/docs/catalog.html');
        await expect(page.locator('.product-listing__item')).toHaveCount(9);
        await expect(page.locator('.product-listing__item:visible')).toHaveCount(9);
        await expect(page.locator('.product-listing__chip')).toHaveCount(4);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
        expect(overflow).toBe(false);
        if (width < 1200) {
            await page.locator('.product-listing__filter-button').click();
            await expect(page.locator('.listing-filter')).toBeVisible();
            await page.keyboard.press('Escape');
            await expect(page.locator('.listing-filter')).toBeHidden();
        }
    });
}

test('mobile catalog breadcrumbs scroll to the complete last item', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 900 });
    await page.goto('/docs/catalog.html');
    await page.evaluate(() => document.fonts.ready);
    const breadcrumbs = page.locator('.breadcrumbs');
    await expect(breadcrumbs).toHaveCSS('overflow-x', 'auto');
    const result = await breadcrumbs.evaluate((element) => {
        const last = element.querySelector('.breadcrumbs__item:last-child');
        const start = element.scrollLeft;
        element.scrollLeft = element.scrollWidth;
        const box = element.getBoundingClientRect();
        const item = last.getBoundingClientRect();
        return {
            scrollable: element.scrollWidth > element.clientWidth,
            moved: element.scrollLeft > start,
            lastFits: item.left >= box.left && item.right <= box.right,
            ellipsis: getComputedStyle(last).textOverflow === 'ellipsis',
        };
    });
    expect(result).toEqual({ scrollable: true, moved: true, lastFits: true, ellipsis: false });
});

test('multiple power values share one chip and its dropdown updates the original filters', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/docs/catalog.html');
    const form = page.locator('.listing-filter');
    await form.locator('[name="power"][value="1125"]').check({ force: true });
    await form.locator('[name="power"][value="1470"]').check({ force: true });
    const group = page.locator('.product-listing__filter-group[data-filter-group="power"]');
    await expect(page.locator('.product-listing__chip[data-filter-fields="power"]')).toHaveCount(1);
    await expect(group.getByRole('button', { name: 'Мощность: 3', exact: true })).toBeVisible();
    await group.getByRole('button', { name: 'Мощность: 3', exact: true }).click();
    const dropdown = group.locator('.product-listing__dropdown');
    await expect(dropdown).toBeVisible();
    await expect(dropdown.getByRole('checkbox', { name: '1 125', exact: true })).toBeChecked();
    await dropdown.getByText('1 470', { exact: true }).click();
    await expect(form.locator('[name="power"][value="1470"]')).not.toBeChecked();
    await expect(group.getByRole('button', { name: 'Мощность: 2', exact: true })).toHaveAttribute('aria-expanded', 'true');
    await dropdown.getByText('780', { exact: true }).click();
    await expect(form.locator('[name="power"][value="780"]')).toBeChecked();
    await page.keyboard.press('Escape');
    await expect(dropdown).toBeHidden();
    await expect(group.getByRole('button', { name: 'Мощность: 3', exact: true })).toBeFocused();
    await group.locator('.product-listing__chip').click({ position: { x: 8, y: 18 } });
    await expect(dropdown).toBeVisible();
    await group.getByRole('button', { name: 'Очистить группу: Мощность', exact: true }).click();
    await expect(form.locator('[name="power"]:checked')).toHaveCount(0);
    await expect(group).toHaveCount(0);
});

test('group dropdown stays in the mobile viewport and returns to a single removable chip', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 900 });
    await page.goto('/docs/catalog.html');
    await page.locator('.product-listing__filter-button').click();
    const form = page.locator('.listing-filter');
    await form.locator('[name="power"][value="1125"]').check({ force: true });
    await page.keyboard.press('Escape');
    const group = page.locator('.product-listing__filter-group[data-filter-group="power"]');
    await group.getByRole('button', { name: 'Мощность: 2', exact: true }).click();
    const dropdown = group.locator('.product-listing__dropdown');
    const bounds = await dropdown.boundingBox();
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(375);
    await page.locator('.product-listing__title').click();
    await expect(dropdown).toBeHidden();
    await group.getByRole('button', { name: 'Мощность: 2', exact: true }).click();
    await dropdown.getByText('1 125', { exact: true }).click();
    await expect(group).toHaveCount(0);
    await page.locator('.product-listing__chip[data-filter-fields="power"]').click();
    await expect(form.locator('[name="power"]:checked')).toHaveCount(0);
});

test('motor and advanced checkbox groups also share a chip and clear together', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/docs/catalog.html');
    const form = page.locator('.listing-filter');
    await form.locator('[name="motor"][value="pmdc"]').check({ force: true });
    await expect(page.getByRole('button', { name: 'Тип мотора: 2', exact: true })).toBeVisible();
    const control = form.locator('.listing-filter__group').filter({ has: page.locator('[name="control"]') });
    await control.locator('summary').click();
    await control.locator('[name="control"]').first().check({ force: true });
    await control.locator('[name="control"]').last().check({ force: true });
    const group = page.locator('.product-listing__filter-group[data-filter-group="control"]');
    await expect(group.getByRole('button', { name: 'Управление измельчителем: 2', exact: true })).toBeVisible();
    await page.locator('.product-listing__clear').click();
    await expect(page.locator('.product-listing__chip')).toHaveCount(0);
    await expect(form.locator('input:checked')).toHaveCount(0);
});
