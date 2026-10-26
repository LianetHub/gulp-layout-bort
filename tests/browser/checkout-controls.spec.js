import { test, expect } from '@playwright/test';

test('order summary aligns with the form and sticks directly below the header', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/docs/checkout.html');
    const summary = page.locator('.checkout__summary');
    await expect(summary).toHaveCSS('position', 'sticky');
    await expect(summary).toHaveCSS('margin-top', '0px');
    expect(await summary.evaluate(el => Math.abs(el.getBoundingClientRect().top - document.querySelector('.checkout__main').getBoundingClientRect().top))).toBeLessThan(1);
    await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; scrollTo(0, 500); });
    await expect.poll(() => summary.evaluate(el => Math.round(el.getBoundingClientRect().top - document.querySelector('.header').getBoundingClientRect().bottom))).toBe(0);
});

for (const width of [375, 1440]) {
    test(`checkout uses common checkbox, tooltip and designed address radios at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 1000 });
        await page.goto('/docs/checkout.html');
        const save = page.locator('.checkout__save');
        await expect(save).toHaveClass(/checkbox/);
        await save.click();
        await expect(save.locator('input')).toBeChecked();
        await save.click();
        await expect(save.locator('input')).not.toBeChecked();
        const trigger = page.locator('.checkout__info.tooltip__trigger');
        await expect(trigger).toHaveCSS('color', 'rgb(106, 107, 109)');
        await trigger.scrollIntoViewIfNeeded();
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        await trigger.evaluate(element => element.focus({ preventScroll: true }));
        const tooltip = page.locator('#checkout-invoice-help');
        await expect(tooltip).toBeVisible();
        await expect(tooltip).toHaveCSS('opacity', '1');
        await trigger.click();
        await expect(page.locator('[name="payment"][value="online"]')).toBeChecked();
        await page.keyboard.press('Escape');
        await expect(tooltip).toHaveCSS('opacity', '0');
        await page.locator('.checkout__address > .checkout__change').click();
        const radios = page.locator('#address-picker .address-picker__radio');
        await radios.nth(1).check();
        await expect(radios.nth(1)).toBeChecked();
        await expect(radios.first()).not.toBeChecked();
        const checked = radios.nth(1);
        await expect(checked).toHaveCSS('appearance', 'none');
        await expect(checked).toHaveCSS('width', '20px');
        await expect(checked).toHaveCSS('border-top-width', '5px');
        await expect(checked).toHaveCSS('border-top-color', 'rgb(255, 98, 1)');
        await expect(page.locator('#address-picker .icon-checkmark-circle')).toHaveCount(0);
        await page.evaluate(() => Promise.all(document.getAnimations().filter(animation => animation.effect?.getComputedTiming().iterations !== Infinity).map(animation => animation.finished.catch(() => {}))));
        await page.screenshot({ path: `.tmp-refactor/checkout-address-${width}.png`, animations: 'disabled' });
    });
}
