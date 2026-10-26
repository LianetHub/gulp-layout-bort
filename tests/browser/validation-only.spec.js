import { test, expect } from '@playwright/test';

for (const [pageName, selector] of [
    ['lk-person', '[data-account-profile], [data-account-password]'],
    ['checkout', '#checkout-form'],
    ['index', '.subscribe__form, [data-auth-form]'],
    ['contacts', '.form--request'],
    ['spare-parts', '.form--parts'],
    ['service', '.form--request'],
]) {
    test(`${pageName}: valid forms delegate to the engine without requests or demo statuses`, async ({ page }) => {
        await page.goto(`/docs/${pageName}.html`);
        const results = await page.evaluate((selector) => {
            let requests = 0;
            let businessEvents = 0;
            window.fetch = async () => { requests++; return { ok: true }; };
            for (const type of ['account:save', 'account:password', 'checkout:submit']) {
                document.addEventListener(type, () => businessEvents++);
            }
            const forms = [...document.querySelectorAll(selector)];
            const results = [];
            // This listener represents the future engine; it cancels navigation only after observation.
            document.addEventListener('submit', event => {
                if (!forms.includes(event.target)) return;
                results.push({ prevented: event.defaultPrevented });
                event.preventDefault();
            });
            for (const form of forms) {
                for (const field of form.querySelectorAll('[data-required]:not(:disabled)')) {
                    if (field.type === 'checkbox') field.checked = true;
                    else if (field.type === 'radio') {
                        if (![...form.elements].some(item => item.name === field.name && item.checked)) field.checked = true;
                    } else field.value = field.tagName === 'SELECT' ? [...field.options].find(option => option.value && !option.disabled)?.value
                        : field.type === 'email' ? 'test@example.ru'
                        : field.type === 'tel' ? '+7 (999) 123-45-67'
                        : field.name === 'code' ? '1234' : 'Test1234';
                }
                form.requestSubmit();
            }
            return { count: forms.length, results, requests, businessEvents };
        }, selector);
        expect(results.count).toBeGreaterThan(0);
        expect(results.results).toHaveLength(results.count);
        expect(results.results.every(result => !result.prevented)).toBe(true);
        expect(results.requests).toBe(0);
        expect(results.businessEvents).toBe(0);
        await expect(page.locator('.account__status:visible, .checkout__status:visible, .subscribe__status:visible, .auth-dialog__status:visible, .form__status:visible')).toHaveCount(0);
    });
}
