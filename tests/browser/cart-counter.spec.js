import { test, expect } from '@playwright/test';

const badgeSelector = '.main-actions__item.icon-cart .main-actions__quanitity';

test('all counters animate only when appearing from zero', async ({ page }) => {
    await page.goto('/docs/catalog.html');
    for (const [action, icon] of [
        ['add-to-cart', 'cart'],
        ['favorite', 'heart'],
        ['compare', 'bars'],
    ]) {
        const badge = page.locator(`.main-actions__item.icon-${icon} .main-actions__quanitity`);
        await badge.evaluate((element) => {
            const animate = element.animate.bind(element);
            element.animationStarts = 0;
            element.animate = (...args) => {
                element.animationStarts++;
                return animate(...args);
            };
        });
        const buttons = page.locator(`.product-listing .${action}-btn`);
        await buttons.nth(0).evaluate((button) => button.click());
        expect(await badge.evaluate((element) => element.animationStarts)).toBe(1);
        await buttons.nth(1).evaluate((button) => button.click());
        await expect(badge).toHaveText('2');
        expect(await badge.evaluate((element) => element.animationStarts)).toBe(1);
        await buttons.nth(0).evaluate((button) => button.click());
        await expect(badge).toHaveText('1');
        expect(await badge.evaluate((element) => element.animationStarts)).toBe(1);
        await buttons.nth(1).evaluate((button) => button.click());
        await expect(badge).toBeHidden();
        expect(await badge.evaluate((element) => element.animationStarts)).toBe(1);
        await buttons.nth(0).evaluate((button) => button.click());
        expect(await badge.evaluate((element) => element.animationStarts)).toBe(2);
    }
});

test('favorites and comparison have independent gray counters without storage', async ({
    page,
}) => {
    await page.goto('/docs/catalog.html');
    for (const [action, icon] of [
        ['favorite', 'heart'],
        ['compare', 'bars'],
    ]) {
        const badge = page.locator(`.main-actions__item.icon-${icon} .main-actions__quanitity`);
        const buttons = page.locator(`.product-listing .${action}-btn`);
        await expect(badge).toBeHidden();
        await buttons.nth(0).click();
        await expect(badge).toHaveText('1');
        await expect(badge).toHaveCSS('background-color', 'rgb(180, 184, 195)');
        await buttons.nth(1).click();
        await expect(badge).toHaveText('2');
        await buttons.nth(0).click();
        await expect(badge).toHaveText('1');
        await buttons.nth(1).click();
        await expect(badge).toBeHidden();
        await buttons.nth(0).click();
    }
    await expect(page.locator(badgeSelector)).toBeHidden();
    await page.reload();
    await expect(page.locator('.main-actions__quanitity:visible')).toHaveCount(0);
    expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
});

test('favorite counter reflects selected cards and clearing favorites', async ({ page }) => {
    await page.goto('/docs/favorite.html');
    const buttons = page.locator('.favorites .favorite-btn');
    const count = await buttons.count();
    const badge = page.locator('.main-actions__item.icon-heart .main-actions__quanitity');
    await expect(badge).toHaveText(String(count));
    await buttons.first().click();
    await expect(badge).toHaveText(String(count - 1));
    await page.locator('.favorites__clear').click();
    await expect(badge).toBeHidden();
    await buttons.first().click();
    await expect(badge).toHaveText('1');
});

test('comparison counter counts products once across responsive copies and supports clear', async ({
    page,
}) => {
    await page.setViewportSize({
        width: 1440,
        height: 1000,
    });
    await page.goto('/docs/compare.html');
    const badge = page.locator('.main-actions__item.icon-bars .main-actions__quanitity');
    const favoriteBadge = page.locator('.main-actions__item.icon-heart .main-actions__quanitity');
    const products = page.locator('[data-compare-column="desktop"] [data-compare-id]');
    const count = await products.count();
    await expect(badge).toHaveText(String(count));
    await products.first().locator('.favorite-btn').click();
    await expect(favoriteBadge).toHaveText('1');
    await expect(page.locator('.comparing .favorite-btn.active')).toHaveCount(3);
    await page.setViewportSize({
        width: 375,
        height: 812,
    });
    const mobileFavorite = page.locator('[data-compare-column="0"] .favorite-btn.active').first();
    await mobileFavorite.click();
    await expect(favoriteBadge).toBeHidden();
    await page.setViewportSize({
        width: 1440,
        height: 1000,
    });
    await products.first().locator('[data-compare-remove]').click();
    await expect(badge).toHaveText(String(count - 1));
    await page.locator('[data-compare-clear="all"]').click();
    await expect(badge).toBeHidden();
});

test('header icon hover changes color without a background or shadow', async ({ page }) => {
    await page.setViewportSize({
        width: 1440,
        height: 1000,
    });
    await page.goto('/docs/catalog.html');
    for (const icon of ['cart', 'heart', 'bars', 'user-circle']) {
        const link = page.locator(`.main-actions__item.icon-${icon}`);
        const initial = await link.evaluate(
            (element) => getComputedStyle(element, '::before').color,
        );
        await link.hover();
        await expect
            .poll(() => link.evaluate((element) => getComputedStyle(element, '::before').color))
            .not.toBe(initial);
        expect(
            await link.evaluate((element) => {
                const style = getComputedStyle(element, '::before');
                return [style.backgroundColor, style.boxShadow];
            }),
        ).toEqual(['rgba(0, 0, 0, 0)', 'none']);
        await page.mouse.move(0, 0);
    }
});

test('cart counter starts empty, counts toggles and resets after reload without storage', async ({
    page,
}) => {
    await page.setViewportSize({
        width: 1440,
        height: 1000,
    });
    await page.addInitScript(() => {
        Storage.prototype.setItem = () => {
            throw new Error('Cart must not persist state');
        };
    });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/docs/catalog.html');
    const badge = page.locator(badgeSelector);
    const buttons = page.locator('.product-listing .add-to-cart-btn');
    await expect(badge).toBeHidden();
    await expect(badge).toHaveText('');
    await buttons.nth(0).click();
    await expect(badge).toHaveText('1');
    await expect(badge).toBeVisible();
    await buttons.nth(1).click();
    await expect(badge).toHaveText('2');
    await buttons.nth(0).click();
    await expect(badge).toHaveText('1');
    await buttons.nth(1).click();
    await expect(badge).toBeHidden();
    await buttons.nth(0).click();
    await page.reload();
    await expect(badge).toBeHidden();
    expect(errors).toEqual([]);
    expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
});

test('counter animates and handles rapid remove then add on mobile', async ({ page }) => {
    await page.setViewportSize({
        width: 375,
        height: 812,
    });
    await page.goto('/docs/product.html');
    const badge = page.locator(badgeSelector);
    const button = page.locator('.product-details__purchase .add-to-cart-btn').first();
    await button.evaluate((element) => element.click());
    await expect(badge).toHaveText('1');
    expect(await badge.evaluate((element) => element.getAnimations().length)).toBeGreaterThan(0);
    await button.evaluate((element) => {
        element.click();
        element.click();
    });
    await expect(badge).toHaveText('1');
    await expect.poll(() => badge.evaluate((element) => element.getAnimations().length)).toBe(0);
    await expect(badge).toBeVisible();
    await button.evaluate((element) => element.click());
    await expect(badge).toBeHidden();
});

test('removing a product subtracts its added quantity even after changing the input', async ({
    page,
}) => {
    await page.emulateMedia({
        reducedMotion: 'reduce',
    });
    await page.goto('/docs/product.html');
    const badge = page.locator(badgeSelector);
    const purchase = page.locator('.product-details__purchase');
    const input = purchase.locator('.quantity-block__input').first();
    const button = purchase.locator('.add-to-cart-btn').first();
    await input.fill('3');
    await button.click();
    await expect(badge).toHaveText('3');
    expect(await badge.evaluate((element) => element.getAnimations().length)).toBe(0);
    await input.fill('5');
    await button.click();
    await expect(badge).toBeHidden();
    await expect(badge).toHaveText('');
});

test('cart rows, quantity controls and accessories keep the header count in sync', async ({
    page,
}) => {
    await page.goto('/docs/cart.html');
    const badge = page.locator(badgeSelector);
    const rows = page.locator('[data-cart-item]');
    await expect(badge).toHaveText('6');
    await rows.first().locator('.quantity-block__up').click();
    await expect(badge).toHaveText('7');
    await rows.first().locator('.quantity-block__down').click();
    await expect(badge).toHaveText('6');
    const accessory = rows.nth(1).locator('.cart-accessory__add').first();
    await accessory.click();
    await expect(badge).toHaveText('5');
    await accessory.click();
    await expect(badge).toHaveText('6');
    await rows.first().locator('.cart-item__remove').click();
    await expect(badge).toHaveText('5');
    await rows.first().locator('.cart-item__remove').click();
    await expect(badge).toHaveText('3');
    await rows.first().locator('.cart-item__remove').click();
    await expect(badge).toBeHidden();
});
