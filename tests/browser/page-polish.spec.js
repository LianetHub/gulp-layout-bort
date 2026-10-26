import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import fileInclude from 'gulp-file-include';
import Vinyl from 'vinyl';

async function galleryTile() {
    const stream = fileInclude({ prefix: '@@', basepath: '@file' });
    const result = new Promise((resolve, reject) => {
        stream.on('data', file => resolve(file.contents.toString()));
        stream.on('error', reject);
    });
    const product = {
        image: 'img/goods/caiman-01.png', name: 'Gallery fixture', guarantee: false,
        price: '100', oldPrice: '200', sku: 'test-gallery',
        images: ['01', '03', '04'].map(index => ({ image: `img/goods/caiman-${index}.png` })),
    };
    stream.end(new Vinyl({
        base: path.resolve('src'), path: path.resolve('src/html/templates/test-fixture.html'),
        contents: Buffer.from(`@@include('_product-tile.html', ${JSON.stringify(product)})`),
    }));
    return result;
}

for (const width of [375, 1440]) {
    test(`static and multi-image cards at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 1000 });
        const tile = await galleryTile();
        await page.route('**/docs/index.html', async route => {
            const html = await readFile('docs/index.html', 'utf8');
            await route.fulfill({ contentType: 'text/html', body: html.replace(/<div class="product product-tile[\s\S]*?class="product-tile__cart[\s\S]*?<\/button>\s*<\/div>/, tile) });
        });
        await page.goto('/docs/index.html');
        const gallery = page.locator('[data-product-gallery]').first();
        await expect(gallery.locator('.swiper-pagination-bullet')).toHaveCount(3);
        const staticTile = page.locator('.products-showcase--sale .product-tile').first();
        await expect(staticTile.locator('.product-tile__picture')).toHaveCount(1);
        await expect(staticTile.locator('.product-tile__slider, .swiper-pagination, .product-tile__areas')).toHaveCount(0);
        await gallery.locator('.swiper-pagination-bullet').nth(2).click();
        await expect.poll(() => gallery.locator('.swiper').evaluate(el => el.swiper.activeIndex)).toBe(2);
        await gallery.locator('.product-tile__area').nth(1).dispatchEvent('pointerenter', { pointerType: 'mouse' });
        await expect.poll(() => gallery.locator('.swiper').evaluate(el => el.swiper.activeIndex)).toBe(1);
        await gallery.dispatchEvent('pointerleave', { pointerType: 'mouse' });
        await expect.poll(() => gallery.locator('.swiper').evaluate(el => el.swiper.activeIndex)).toBe(0);
        await page.waitForTimeout(250);
        await gallery.evaluate(el => {
            const target = el.querySelector('.product-tile__slider');
            for (const [type, x] of [['pointerdown', 300], ['pointermove', 280], ['pointermove', 170], ['pointermove', 30], ['pointerup', 30]]) {
                target.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: x, clientY: 100, buttons: type === 'pointerup' ? 0 : 1 }));
            }
        });
        await expect.poll(() => gallery.locator('.swiper').evaluate(el => el.swiper.activeIndex)).toBeGreaterThan(0);
        const outer = page.locator('.products-showcase__slider').first();
        expect(await outer.locator('.swiper').first().evaluate(el => el.swiper.activeIndex)).toBe(0);
        await outer.locator('.swiper-button-next').click();
        await expect.poll(() => outer.locator('.swiper').first().evaluate(el => el.swiper.activeIndex)).toBeGreaterThan(0);
        for (const name of ['catalog', 'search', 'favorite', 'product']) {
            await page.goto(`/docs/${name}.html`);
            const galleries = page.locator('[data-product-gallery]');
            expect(await galleries.count()).toBeGreaterThan(0);
            expect(await galleries.evaluateAll(items => items.filter(item => {
                const slider = item.querySelector('.product-tile__slider');
                return !slider.swiper || slider.querySelectorAll('.swiper-slide').length <= 1;
            }).map(item => item.outerHTML.slice(0, 200))), name).toEqual([]);
            const first = page.locator('[data-product-gallery]:visible').first();
            await first.locator('.swiper-pagination-bullet').nth(1).click();
            await expect.poll(() => first.locator('.swiper').evaluate(el => el.swiper.activeIndex)).toBe(1);
        }
    });
}

test('thumbnail viewport stays bounded and synchronized across breakpoints', async ({ page }) => {
    await page.goto('/docs/product.html');
    for (const width of [375, 767, 768, 1200, 1440, 767, 768]) {
        await page.setViewportSize({ width, height: 1000 });
        const viewport = page.locator('.product-details__thumb-slider');
        await expect.poll(() => viewport.evaluate(el => el.swiper.params.direction)).toBe(width < 768 ? 'horizontal' : 'vertical');
        await expect(viewport).toHaveCSS('height', width < 768 ? '80px' : '440px');
        await expect(viewport).toHaveCSS('overflow', 'hidden');
        await expect(viewport).toHaveCSS('display', 'block');
        await page.locator('.product-details__thumb').last().evaluate(el => el.click());
        await expect(page.locator('.product-details__thumb').last()).toHaveAttribute('aria-pressed', 'true');
        const geometry = await viewport.evaluate(el => {
            const last = el.querySelector('.product-details__thumb:last-child').getBoundingClientRect();
            const box = el.getBoundingClientRect();
            return { visible: last.top >= box.top - 1 && last.bottom <= box.bottom + 1 && last.left >= box.left - 1 && last.right <= box.right + 1, overflow: document.documentElement.scrollWidth - innerWidth };
        });
        // Swiper finishes its slide animation before the final geometry assertion below.
        await expect.poll(() => viewport.evaluate(el => {
            const last = el.querySelector('.product-details__thumb:last-child').getBoundingClientRect();
            const box = el.getBoundingClientRect();
            return last.top >= box.top - 1 && last.bottom <= box.bottom + 1 && last.left >= box.left - 1 && last.right <= box.right + 1;
        })).toBe(true);
        expect(geometry.overflow).toBeLessThanOrEqual(1);
        const mainHref = await page.locator('.product-details__gallery-slider').evaluate(el => el.swiper.slides[el.swiper.activeIndex].href);
        await expect(page.locator('.product-details__zoom')).toHaveAttribute('href', mainHref);
    }
});

test('partner card sticks below the header and stops at the article boundary', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/docs/about.html');
    const card = page.locator('.partner-card');
    await expect(card).toHaveCSS('position', 'sticky');
    await page.evaluate(() => scrollTo(0, 500));
    await expect.poll(() => card.evaluate(el => Math.round(el.getBoundingClientRect().top - document.querySelector('.header').getBoundingClientRect().bottom))).toBe(20);
    await page.locator('.article__layout').evaluate(el => scrollTo(0, el.getBoundingClientRect().bottom + scrollY - 450));
    const bottom = await card.evaluate(el => ({ card: el.getBoundingClientRect().bottom, layout: el.closest('.article__layout').getBoundingClientRect().bottom }));
    expect(bottom.card).toBeLessThanOrEqual(bottom.layout + 1);
    await page.setViewportSize({ width: 1199, height: 1000 });
    await expect(card).toHaveCSS('position', 'static');
});

test('hover colors animate in both directions and motion respects reduced motion', async ({ page }) => {
    await page.goto('/docs/index.html');
    const phone = page.locator('.footer__phone');
    await expect(phone).toHaveCSS('transition-property', 'color');
    const original = await phone.evaluate(el => getComputedStyle(el).color);
    await phone.hover();
    await expect(phone).toHaveCSS('color', 'rgb(255, 98, 1)');
    await page.mouse.move(0, 0);
    await expect(phone).toHaveCSS('color', original);
    await expect(page.locator('.product-tile__cart').first()).toHaveCSS('transition-property', 'background-color');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(page.locator('.footer__social').first()).toHaveCSS('transition-duration', '0s');
});
