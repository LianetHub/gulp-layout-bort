import { test, expect } from '@playwright/test';
import { readdirSync } from 'node:fs';
import { validator } from '../../scripts/html-validation.js';

const pages = readdirSync('src')
    .filter((name) => name.endsWith('.html'))
    .sort();

for (const width of [375, 1440]) {
    test(`all 24 pages initialize without script errors at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 1000 });
        const errors = [];
        page.on('pageerror', (error) => errors.push(error.message));
        page.on('console', (message) => {
            if (
                message.type() === 'error' &&
                !message.text().startsWith('Failed to load resource:')
            ) {
                errors.push(message.text());
            }
        });
        for (const name of pages) {
            await page.goto(`/docs/${name}`, { waitUntil: 'load' });
            await expect(page.locator('script[src*="js/app.js"]')).toHaveCount(1);
            await expect(page.locator('script[src*="app.min.js"]')).toHaveCount(0);
            expect(
                await page.evaluate(() => typeof window.FormController?.validateForm),
                name,
            ).toBe('function');
        }
        expect(errors).toEqual([]);
    });
}

test('all pages tolerate unavailable slider and modal libraries', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.route('**/js/libs/*.js*', (route) => route.abort());
    await page.route('**/api-maps.yandex.ru/**', (route) => route.abort());
    for (const name of pages) {
        await page.goto(`/docs/${name}`);
        expect(await page.evaluate(() => typeof window.FormController?.validateForm), name).toBe(
            'function',
        );
    }
    expect(errors).toEqual([]);
});

for (const name of ['demo', 'ui-stage-two', 'ui-unification', 'ui-kit']) {
    test(`existing ${name} browser scenarios`, async ({ page }) => {
        test.setTimeout(180000);
        const errors = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await page.goto(`/tests/${name}.html`);
        if (name === 'ui-kit') {
            await expect(page.locator('#status')).toHaveText(/^(PASS:|FAIL:)/, { timeout: 160000 });
            expect(await page.locator('#status').textContent()).toMatch(/^PASS:/);
        } else {
            await expect(page).toHaveTitle(/^(PASS:|FAIL:)/, { timeout: 160000 });
            expect(await page.title()).toMatch(/^PASS:/);
        }
        expect(errors).toEqual([]);
    });
}

test('initialized DOM remains valid on pages with interactive components', async ({ page }) => {
    // Validate our markup deterministically; Yandex owns its generated map DOM.
    await page.route('**/api-maps.yandex.ru/**', (route) => route.abort());
    const failures = [];
    for (const name of pages.map((name) => name.replace('.html', ''))) {
        await page.goto(`/docs/${name}.html`);
        const html = await page.content();
        const report = await validator.validateString(html, `${name}.html`);
        for (const result of report.results) {
            failures.push(
                ...result.messages.map(
                    (message) => `${name}:${message.line} ${message.ruleId}: ${message.message}`,
                ),
            );
        }
    }
    expect(failures).toEqual([]);
});
