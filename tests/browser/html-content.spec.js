import { test, expect } from '@playwright/test';

test('pickup data and validation copy are read from edited HTML', async ({ page }) => {
    await page.route('**/api-maps.yandex.ru/**', (route) => route.abort());
    await page.route('**/docs/lk-address.html', async (route) => {
        const response = await route.fetch();
        const html = (await response.text())
            .replaceAll('Ozon — ул. Ленина, д. 15', 'Пункт из HTML')
            .replaceAll('г. Москва, ул. Ленина, д. 15, кв./офис 10', 'Адрес из HTML');
        await route.fulfill({ response, body: html });
    });
    await page.goto('/docs/lk-address.html#pickup');
    await page.locator('.addresses__add').click();
    const point = page.locator('#account-pickup-dialog [data-pickup-id]').first();
    await expect(point.locator('.pickup-dialog__point-title')).toHaveText('Пункт из HTML');
    await point.click();
    await expect(page.locator('.pickup-dialog__address')).toHaveText('Адрес из HTML');
    await page.locator('.pickup-dialog__choose').click();
    await expect(page.locator('#pickup-addresses .addresses__name').last()).toHaveText(
        'Пункт из HTML',
    );

    await page.route('**/docs/contacts.html', async (route) => {
        const response = await route.fetch();
        await route.fulfill({
            response,
            body: (await response.text()).replaceAll(
                'Введите корректный номер телефона',
                'Ошибка телефона из HTML',
            ),
        });
    });
    await page.goto('/docs/contacts.html');
    await page.locator('.contacts__form [type="submit"]').click();
    await expect(page.locator('#contacts-phone-error')).toHaveText('Ошибка телефона из HTML');
});

test('order number comes from HTML and order actions have no demo notices', async ({ page }) => {
    await page.goto('/docs/lk-order.html');
    await page.evaluate(() => {
        document.querySelector('[data-order-number]').textContent = 'HTML-ORDER-42';
        window.copiedOrder = '';
        Object.defineProperty(navigator, 'clipboard', {
            configurable: true,
            value: {
                writeText: async (value) => {
                    window.copiedOrder = value;
                },
            },
        });
    });
    await page.locator('[data-copy-order]').click();
    expect(await page.evaluate(() => window.copiedOrder)).toBe('HTML-ORDER-42');
    await expect(page.locator('[data-order-state="copied"]')).toBeVisible();
    await page.getByRole('button', { name: 'Отменить заказ', exact: true }).click();
    await page.getByRole('button', { name: 'Оплатить онлайн', exact: true }).click();
    await expect(page.locator('.order-details__notice')).toHaveCount(0);
});

for (const width of [375, 1440]) {
    test(`comparison drags from characteristic values at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 1000 });
        await page.goto('/docs/compare.html');
        const column = width >= 1200 ? 'desktop' : '0';
        const slider = page.locator(`[data-compare-column="${column}"] .comparing__swiper`);
        const initial = await slider.evaluate((element) => element.swiper.activeIndex);
        const values = page.locator('.comparing__content .comparing__values').first();
        await values.scrollIntoViewIfNeeded();
        const rect = await values.boundingBox();
        const x = width >= 1200 ? rect.x + rect.width * 0.7 : rect.x + rect.width * 0.4;
        await page.mouse.move(x, rect.y + rect.height / 2);
        await page.mouse.down();
        await page.mouse.move(x - (width >= 1200 ? 320 : 100), rect.y + rect.height / 2, {
            steps: 12,
        });
        await page.mouse.up();
        await expect
            .poll(() => slider.evaluate((element) => element.swiper.activeIndex))
            .toBeGreaterThan(initial);
        const selected = await slider.evaluate((element) => element.swiper.activeIndex);
        const row = page.locator('.comparing__content .comparing__block').first();
        const expected = await row.evaluate(
            (element, index) => JSON.parse(element.dataset.values)[index],
            selected,
        );
        if (width < 1200) {
            await expect(row.locator('.comparing__value').first()).toHaveText(expected);
        } else {
            await expect(page.locator('.comparing')).toHaveCSS('--comparing-duration', '300ms');
        }
    });
}

test('mobile characteristic gestures select the intended column and preserve controls', async ({
    page,
}) => {
    await page.setViewportSize({ width: 375, height: 1000 });
    await page.goto('/docs/compare.html');
    const left = page.locator('[data-compare-column="0"] .comparing__swiper');
    const right = page.locator('[data-compare-column="1"] .comparing__swiper');
    const originalLeft = await left.evaluate((element) => element.swiper.activeIndex);
    const originalRight = await right.evaluate((element) => element.swiper.activeIndex);
    const values = page.locator('.comparing__content .comparing__values').first();
    await values.scrollIntoViewIfNeeded();
    const box = await values.boundingBox();
    const session = await page.context().newCDPSession(page);
    const x = box.x + box.width * 0.9;
    const y = box.y + box.height / 2;
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let step = 1; step <= 8; step++) {
        await session.send('Input.dispatchTouchEvent', {
            type: 'touchMove',
            touchPoints: [{ x: x - step * 15, y }],
        });
    }
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect
        .poll(() => right.evaluate((element) => element.swiper.activeIndex))
        .toBeGreaterThan(originalRight);
    expect(await left.evaluate((element) => element.swiper.activeIndex)).toBe(originalLeft);
    const checkbox = page.locator('.comparing__content .comparing__check').first();
    await checkbox.setChecked(!(await checkbox.isChecked()));
    await expect(page.locator('.comparing')).not.toHaveClass(/is-dragging/);
});

test('vertical scrolling does not disable the next comparison swipe', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 1000 });
    await page.goto('/docs/compare.html');
    const values = page.locator('.comparing__content .comparing__values').nth(5);
    await values.evaluate((element) =>
        window.scrollTo({
            top: element.getBoundingClientRect().top + window.scrollY - 780,
            behavior: 'instant',
        }),
    );
    const session = await page.context().newCDPSession(page);
    let box = await values.boundingBox();
    const x = box.x + box.width * 0.4;
    let y = box.y + box.height / 2;
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let step = 1; step <= 8; step++) {
        await session.send('Input.dispatchTouchEvent', {
            type: 'touchMove',
            touchPoints: [{ x, y: y - step * 15 }],
        });
    }
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    const slider = page.locator('[data-compare-column="0"] .comparing__swiper');
    await expect
        .poll(() => slider.evaluate((element) => element.swiper.touchEventsData.pointerId))
        .toBe(null);
    const before = await slider.evaluate((element) => element.swiper.activeIndex);
    // Wait for kinetic page scrolling to stop before measuring the next gesture.
    await page.evaluate(
        () =>
            new Promise((resolve) => {
                let previous = window.scrollY;
                let stableFrames = 0;
                const measure = () => {
                    stableFrames = window.scrollY === previous ? stableFrames + 1 : 0;
                    previous = window.scrollY;
                    if (stableFrames >= 4) {
                        resolve();
                    } else {
                        requestAnimationFrame(measure);
                    }
                };
                requestAnimationFrame(measure);
            }),
    );
    await values.evaluate((element) =>
        window.scrollTo({
            top: element.getBoundingClientRect().top + window.scrollY - 780,
            behavior: 'instant',
        }),
    );
    box = await values.boundingBox();
    y = box.y + box.height / 2;
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let step = 1; step <= 8; step++) {
        await session.send('Input.dispatchTouchEvent', {
            type: 'touchMove',
            touchPoints: [{ x: x - step * 15, y }],
        });
    }
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect
        .poll(() => slider.evaluate((element) => element.swiper.activeIndex))
        .toBeGreaterThan(before);
});
