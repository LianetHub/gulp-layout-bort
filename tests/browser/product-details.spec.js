import { test, expect } from '@playwright/test';

test('desktop overview keeps services below purchase and shows five recommendations', async ({
    page,
}) => {
    for (const width of [1200, 1440, 1920]) {
        await page.setViewportSize({
            width,
            height: 1000,
        });
        await page.goto('/docs/product.html');
        await page.evaluate(() => document.fonts.ready);
        const layout = await page.evaluate(() => {
            const rect = (selector) => document.querySelector(selector).getBoundingClientRect();
            const summary = rect('.product-details__summary');
            const purchase = rect('.product-details__purchase');
            const delivery = rect('.product-details__service');
            const recommendation = document.querySelector(
                '.product-details + .products-showcase .swiper',
            );

            return {
                summaryRight: summary.right,
                purchaseLeft: purchase.left,
                purchaseBottom: purchase.bottom,
                deliveryLeft: delivery.left,
                deliveryTop: delivery.top,
                slidesPerView: recommendation.swiper.params.slidesPerView,
                visibleSlides: [
                    ...recommendation.querySelectorAll(':scope > .swiper-wrapper > .swiper-slide'),
                ].filter((slide) => {
                    const card = slide.getBoundingClientRect();
                    const slider = recommendation.getBoundingClientRect();

                    return card.left >= slider.left - 1 && card.right <= slider.right + 1;
                }).length,
            };
        });
        expect(layout.summaryRight).toBeLessThan(layout.purchaseLeft);
        expect(Math.abs(layout.deliveryLeft - layout.purchaseLeft)).toBeLessThan(1);
        expect(layout.deliveryTop).toBeGreaterThan(layout.purchaseBottom);
        expect(layout.slidesPerView).toBe(5);
        expect(layout.visibleSlides).toBe(5);
    }
});

test('product anchors follow scroll, clicks and the details boundary', async ({ page }) => {
    await page.setViewportSize({
        width: 1440,
        height: 1000,
    });
    await page.goto('/docs/product.html');
    await page.evaluate(() => document.fonts.ready);
    const navigation = page.locator('.product-content__navigation');

    await expect(navigation.locator('.swiper-button-next')).toBeHidden();

    await page.locator('#stats').evaluate((block) =>
        block.scrollIntoView({
            block: 'start',
            behavior: 'instant',
        }),
    );
    await expect(page.locator('.product-content__tab.active')).toHaveAttribute('href', '#stats');
    const geometry = await page.evaluate(() => ({
        header: document.querySelector('.header').getBoundingClientRect().bottom,
        navigation: document.querySelector('.product-content__navigation').getBoundingClientRect()
            .top,
    }));
    expect(Math.abs(geometry.header - geometry.navigation)).toBeLessThan(2);
    await page.locator('.product-content__tab[href="#warranty"]').click();
    await expect
        .poll(() =>
            page
                .locator('#warranty')
                .evaluate((block) =>
                    Math.abs(
                        block.getBoundingClientRect().top -
                            document.querySelector('.header').getBoundingClientRect().bottom -
                            document
                                .querySelector('.product-content__navigation')
                                .getBoundingClientRect().height -
                            16,
                    ),
                ),
        )
        .toBeLessThan(2);
    await expect(page.locator('.product-content__tab.active')).toHaveAttribute('href', '#warranty');
    await page.locator('footer').scrollIntoViewIfNeeded();
    expect((await navigation.boundingBox()).y).toBeLessThan(0);
});

test('mobile purchase covers the bottom menu while notifications stay above', async ({ page }) => {
    await page.setViewportSize({
        width: 375,
        height: 812,
    });
    await page.goto('/docs/product.html');
    await expect(page.locator('.main-actions')).toBeVisible();
    const purchase = await page.locator('.product-details__mobile-purchase').boundingBox();
    const menu = await page.locator('.main-actions').boundingBox();
    expect(purchase.y).toBeLessThan(menu.y);
    expect(Math.abs(purchase.y + purchase.height - 812)).toBeLessThan(1);
    expect(
        await page.evaluate(
            () =>
                document.elementFromPoint(180, 790).closest('.product-details__mobile-purchase') !==
                null,
        ),
    ).toBe(true);
    await page.locator('.product-details__mobile-purchase .product-details__cart').click();
    await expect(page.locator('.notify')).toBeVisible();
    const notification = await page.locator('.notify').boundingBox();
    expect(notification.y + notification.height).toBeLessThan(purchase.y);
    await page.evaluate(() => window.scrollTo(0, 2500));
    await expect(page.locator('.arrow-top')).toBeVisible();
    const arrow = await page.locator('.arrow-top').boundingBox();
    expect(arrow.y + arrow.height).toBeLessThan(purchase.y);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        375,
    );
});

test('mobile breadcrumbs scroll across the full browser width', async ({ page }) => {
    await page.setViewportSize({
        width: 375,
        height: 812,
    });
    await page.goto('/docs/product.html');
    const breadcrumb = page.locator('.breadcrumbs');

    const initial = await breadcrumb.evaluate((nav) => ({
        overflow: getComputedStyle(nav).overflowX,
        width: nav.clientWidth,
        scrollWidth: nav.scrollWidth,
        listRight: nav.querySelector('.breadcrumbs__list').getBoundingClientRect().right,
        containerRight: nav.querySelector('.breadcrumbs__container').getBoundingClientRect().right,
    }));
    expect(initial.overflow).toBe('auto');
    expect(initial.scrollWidth).toBeGreaterThan(initial.width);
    expect(initial.listRight).toBeGreaterThan(initial.containerRight);
    await breadcrumb.evaluate((nav) => {
        nav.scrollLeft = nav.scrollWidth;
    });
    const end = await breadcrumb.evaluate((nav) => {
        const last = nav.querySelector('.breadcrumbs__item:last-child');
        return {
            scroll: nav.scrollLeft,
            lastRight: last.getBoundingClientRect().right,
            navRight: nav.getBoundingClientRect().right,
        };
    });
    expect(end.scroll).toBeGreaterThan(0);
    expect(end.lastRight).toBeLessThanOrEqual(end.navRight);
    expect(end.lastRight).toBeGreaterThan(end.navRight - 25);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        375,
    );
});

test('description benefits stick below the navigation on desktop', async ({ page }) => {
    await page.setViewportSize({
        width: 1440,
        height: 1000,
    });
    await page.goto('/docs/product.html');
    await page.locator('#description').evaluate((block) => {
        block.scrollIntoView({
            block: 'start',
            behavior: 'instant',
        });
        window.scrollBy({
            top: 100,
            behavior: 'instant',
        });
    });
    await expect
        .poll(() =>
            page
                .locator('.product-content__benefits')
                .evaluate((list) => getComputedStyle(list).position),
        )
        .toBe('sticky');
    const positions = await page.evaluate(() => ({
        nav: document.querySelector('.product-content__navigation').getBoundingClientRect().bottom,
        benefits: document.querySelector('.product-content__benefits').getBoundingClientRect().top,
        color: getComputedStyle(document.querySelector('.product-content__benefit'), '::before')
            .color,
    }));
    expect(Math.abs(positions.benefits - positions.nav - 16)).toBeLessThan(2);
    expect(positions.color).toBe('rgb(255, 98, 1)');
});

test('mobile scroll reveals the entire active anchor after fonts load', async ({ page }) => {
    await page.setViewportSize({
        width: 375,
        height: 812,
    });
    await page.goto('/docs/product.html');
    await page.evaluate(() => document.fonts.ready);
    await page.locator('#reviews').evaluate((block) =>
        block.scrollIntoView({
            block: 'start',
            behavior: 'instant',
        }),
    );
    await expect(page.locator('.product-content__tab.active')).toHaveAttribute('href', '#reviews');
    await expect
        .poll(() =>
            page.locator('.product-content__tab.active').evaluate((link) => {
                const slider = link.closest('.swiper').getBoundingClientRect();
                const rect = link.getBoundingClientRect();

                return rect.right <= slider.right + 1 && rect.left >= slider.left - 1;
            }),
        )
        .toBe(true);
    await page.locator('#stats').evaluate((block) =>
        block.scrollIntoView({
            block: 'start',
            behavior: 'instant',
        }),
    );
    await expect(page.locator('.product-content__tab.active')).toHaveAttribute('href', '#stats');
    await expect
        .poll(() =>
            page.evaluate(() => {
                const link = document
                    .querySelector('.product-content__tab.active')
                    .getBoundingClientRect();
                const previous = document
                    .querySelector('.product-content__prev')
                    .getBoundingClientRect();

                return link.left >= previous.right;
            }),
        )
        .toBe(true);
});

test('anchor destination remains aligned while description images load', async ({ page }) => {
    await page.setViewportSize({
        width: 375,
        height: 812,
    });
    let imageIndex = 0;

    await page.route('**/description-*.png', async (route) => {
        const delay = [50, 200, 400, 700][imageIndex++ % 4];

        await new Promise((resolve) => setTimeout(resolve, delay));
        await route.continue();
    });
    await page.goto('/docs/product.html');
    await page.evaluate(() => document.fonts.ready);
    await page.locator('.product-details__all').click();
    await expect
        .poll(() =>
            page
                .locator('#stats')
                .evaluate((block) =>
                    Math.abs(
                        block.getBoundingClientRect().top -
                            document.querySelector('.header').getBoundingClientRect().bottom -
                            document
                                .querySelector('.product-content__navigation')
                                .getBoundingClientRect().height -
                            16,
                    ),
                ),
        )
        .toBeLessThan(2);
    await expect(page.locator('.product-content__tab.active')).toHaveAttribute('href', '#stats');
});

test('description expands arbitrary markup as one height-limited block', async ({ page }) => {
    await page.setViewportSize({
        width: 1440,
        height: 1000,
    });
    await page.goto('/docs/product.html');
    const description = page.locator('#product-rich-description');
    const button = page.locator('.product-content__expand');

    await description.evaluate((block) => {
        block.innerHTML =
            '<h3>Подробное описание</h3>' +
            '<p>Описание устройства и его возможностей.</p>'.repeat(40) +
            '<ul><li>Первый пункт</li><li>Последний пункт</li></ul>';
    });
    await expect
        .poll(() => description.evaluate((block) => block.scrollHeight > block.clientHeight))
        .toBe(true);
    await button.click();
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(
        await description.evaluate((block) => block.scrollHeight <= block.clientHeight + 1),
    ).toBe(true);
    expect(await description.evaluate((block) => getComputedStyle(block, '::after').display)).toBe(
        'none',
    );
    await button.click();
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(await description.evaluate((block) => block.scrollHeight > block.clientHeight)).toBe(
        true,
    );
});
