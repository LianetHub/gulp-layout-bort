import { test, expect } from '@playwright/test';
import { readdirSync } from 'node:fs';

test('news cards link to the temporary article page', async ({ page }) => {
    for (const name of ['index', 'blog']) {
        await page.goto(`/docs/${name}.html`);
        const cards = page.locator('.news-card');
        expect(await cards.count()).toBeGreaterThan(0);
        expect(await cards.evaluateAll(items => items.every(item => item.querySelector('a[href="service.html"]')))).toBe(true);
    }
});

test('all required fields use the shared validator and have authored inline errors', async ({ page }) => {
    for (const name of readdirSync('src').filter(name => name.endsWith('.html'))) {
        await page.goto(`/docs/${name}`);
        const issues = await page.locator('input[required], select[required], textarea[required], [data-required]').evaluateAll(fields => fields.flatMap(field => {
            const wrapper = field.closest('.form__field');
            const errors = [...(wrapper?.querySelectorAll('.form__error-message') || [])];
            return field.hasAttribute('data-required') && field.form?.noValidate && errors.length && errors.every(error => error.textContent.trim())
                ? [] : [field.outerHTML];
        }));
        expect(issues, name).toEqual([]);
    }
});

test('subscription uses inline errors, clears them on correction and reset', async ({ page }) => {
    await page.goto('/docs/index.html');
    const form = page.locator('.subscribe__form');
    const input = form.locator('input');
    const error = form.locator('.form__error-message');
    const original = await error.textContent();
    await form.locator('[type="submit"]').click();
    await expect(input).toHaveAttribute('aria-invalid', 'true');
    await expect(error).toBeVisible();
    await input.fill('bad@');
    await expect(input).toHaveAttribute('aria-invalid', 'true');
    await input.fill('reader@example.ru');
    await expect(input).toHaveAttribute('aria-invalid', 'false');
    await expect(error).toBeHidden();
    await form.locator('[type="submit"]').click();
    await expect(form.locator('.subscribe__status')).not.toBeEmpty();
    await form.evaluate(element => element.reset());
    await expect(error).toHaveText(original);
    await expect(error).toBeHidden();
});

test('password confirmation shares validation and rechecks when the original changes', async ({ page }) => {
    await page.goto('/docs/lk-person.html');
    const form = page.locator('[data-account-password]');
    await form.locator('[type="submit"]').click();
    await expect(form.locator('#old-password')).toHaveAttribute('aria-invalid', 'true');
    await expect(form.locator('[data-validation-error="mismatch"]')).toBeHidden();
    await form.locator('#old-password').fill('previous');
    await form.locator('#new-password').fill('new-password');
    await form.locator('#confirm-password').fill('different');
    await form.locator('[type="submit"]').click();
    await expect(form.locator('[data-validation-error="mismatch"]')).toBeVisible();
    await form.locator('#new-password').fill('different');
    await expect(form.locator('#confirm-password')).toHaveAttribute('aria-invalid', 'false');
    await expect(form.locator('[data-validation-error="mismatch"]')).toBeHidden();
});

test('cart buttons use their authored state label', async ({ page }) => {
    await page.goto('/docs/index.html');
    const button = page.locator('main .add-to-cart-btn').first();
    await button.evaluate(element => { element.dataset.cartAddedLabel = 'Added locally'; });
    await button.click();
    await expect(button).toHaveText('Added locally');
});

test('auth errors preserve authored text and code timer uses the button template', async ({ page }) => {
    await page.goto('/docs/index.html');
    await page.locator('[data-auth-open]:visible').first().click();
    await page.locator('[data-auth-tab="phone"]').click();
    const form = page.locator('[data-auth-form="phone"]');
    await form.locator('[type="submit"]').click();
    await expect(form.locator('#auth-phone')).toHaveAttribute('aria-invalid', 'true');
    await expect(form.locator('.auth-dialog__error').first()).toBeVisible();
    await form.locator('#auth-phone').fill('+7 (999) 123-45-67');
    const send = form.locator('[data-auth-send]');
    await send.evaluate(element => { element.dataset.codeCountdownLabel = 'Wait {seconds}'; });
    await send.click();
    await expect(send).toHaveText(/^Wait \d+$/);
    await expect(send).toBeDisabled();
    await expect(form.locator('.auth-dialog__error').first()).toHaveText('Введите корректный номер телефона');
    await expect(form.locator('.auth-dialog__error').first()).toBeHidden();
});
