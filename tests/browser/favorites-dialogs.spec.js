import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
    await page.goto('/docs/favorite.html');
});

test('category removal waits for confirmation and can be cancelled', async ({ page }) => {
    const remove = page.locator('[data-remove-category="disposers"]');
    const categories = page.locator('.favorites__category');
    const count = await categories.count();
    const dialog = page.getByRole('dialog', { name: 'Удалить из избранного', exact: true });

    await remove.click({ force: true });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('Измельчители отходов');
    await expect(categories).toHaveCount(count);
    await dialog.getByRole('button', { name: 'Отменить', exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await expect(categories).toHaveCount(count);

    await remove.click({ force: true });
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(categories).toHaveCount(count);

    await remove.click({ force: true });
    await dialog.getByRole('button', { name: 'Удалить', exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await expect(remove).toHaveCount(0);
    await expect(categories).toHaveCount(count - 1);
    await expect(page.locator('[data-remove-category="vacuums"]')).toHaveCount(1);
});

test('clearing favorites waits for confirmation and dismissing preserves selection', async ({ page }) => {
    const clear = page.getByRole('button', { name: 'Очистить избранное', exact: true });
    const selected = page.locator('.favorites .favorite-btn.active');
    const count = await selected.count();
    const dialog = page.getByRole('dialog', { name: 'Очистить избранное', exact: true });

    expect(count).toBeGreaterThan(0);
    await clear.click();
    await expect(dialog).toBeVisible();
    await expect(selected).toHaveCount(count);
    await dialog.getByRole('button', { name: 'Отменить', exact: true }).click();
    await expect(selected).toHaveCount(count);
    await expect(clear).toBeFocused();

    await clear.click();
    await dialog.getByRole('button', { name: 'Закрыть окно', exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await expect(selected).toHaveCount(count);

    await clear.click();
    await page.mouse.click(5, 5);
    await expect(dialog).not.toBeVisible();
    await expect(selected).toHaveCount(count);

    await clear.click();
    await dialog.getByRole('button', { name: 'Удалить', exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await expect(selected).toHaveCount(0);
    await expect(page.locator('.favorites .favorite-btn[aria-pressed="true"]')).toHaveCount(0);
});
