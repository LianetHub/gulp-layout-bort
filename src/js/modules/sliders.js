import { delegate } from './dom.js';

const controls = (container) => ({
    navigation: {
        nextEl: container.querySelector('.swiper-button-next'),
        prevEl: container.querySelector('.swiper-button-prev'),
    },
    pagination: { el: container.querySelector('.swiper-pagination'), clickable: true },
});

function createSlider(element, options) {
    if (!element || typeof Swiper === 'undefined') {
        return null;
    }

    return element.swiper || new Swiper(element, options);
}

export function productGalleries() {
    document.querySelectorAll('[data-product-gallery]').forEach((gallery) => {
        const element = gallery.querySelector('.product-tile__slider');

        if (!element || element.swiper || typeof Swiper === 'undefined') {
            return;
        }

        const slider = createSlider(element, {
            slidesPerView: 1,
            nested: true,
            watchOverflow: true,
            touchEventsTarget: 'container',
            a11y: { slideRole: 'link' },
            speed: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 200,
            pagination: {
                el: gallery.querySelector('.swiper-pagination'),
                clickable: true,
                renderBullet: (index, className) =>
                    `<button class="${className}" type="button" aria-label="Фотография ${index + 1}"></button>`,
            },
        });
        const areas = document.createElement('div');

        areas.className = 'product-tile__areas';
        areas.setAttribute('aria-hidden', 'true');
        [...slider.slides].forEach((slide, index) => {
            const area = document.createElement('a');

            area.className = 'product-tile__area';
            area.href = slide.href;
            area.tabIndex = -1;
            area.addEventListener('pointerenter', (event) => {
                if (event.pointerType === 'mouse') {
                    slider.slideTo(index);
                }
            });
            areas.append(area);
        });
        element.append(areas);
        gallery.addEventListener('pointerleave', (event) => {
            if (event.pointerType === 'mouse') {
                slider.slideTo(0);
            }
        });
    });
}

export function sliders() {
    if (typeof Swiper === 'undefined') {
        return;
    }

    document.querySelectorAll('[data-showcase-slider]').forEach((container) => {
        const count = Number(container.dataset.showcaseSlider);
        const breakpoints = {
            576: { slidesPerView: 2 },
            768: { slidesPerView: 3 },
            992: { slidesPerView: count === 3 ? 3 : 4 },
            1200: { slidesPerView: count === 6 ? 5 : count === 5 ? 4 : 3 },
            1320: { slidesPerView: count },
        };

        createSlider(container.querySelector('.swiper'), {
            slidesPerView: 1,
            spaceBetween: count === 3 ? 20 : 10,
            breakpoints,
            watchOverflow: true,
            navigation: controls(container).navigation,
        });
    });
    document.querySelectorAll('.marketing__slider').forEach((container) => {
        createSlider(container.querySelector('.swiper'), {
            slidesPerView: 'auto',
            spaceBetween: 20,
            watchOverflow: true,
            breakpoints: {
                768: { slidesPerView: 'auto' },
                992: { slidesPerView: 'auto' },
                1200: { slidesPerView: 3 },
            },
            navigation: controls(container).navigation,
        });
    });
    document.querySelectorAll('.promotions__slider').forEach((container) => {
        createSlider(container.querySelector('.swiper'), {
            slidesPerView: 1,
            rewind: true,
            watchOverflow: true,
            ...controls(container),
        });
    });
    const newsBreakpoints = {
        575.98: { slidesPerView: 1.5 },
        767.98: { slidesPerView: 2 },
        991.98: { slidesPerView: 3 },
        1419.98: { slidesPerView: 4 },
    };

    document.querySelectorAll('.news__slider:not([data-showcase-slider])').forEach((container) => {
        createSlider(container.querySelector('.swiper'), {
            slidesPerView: 1,
            spaceBetween: 20,
            watchOverflow: true,
            breakpoints: newsBreakpoints,
            ...controls(container),
        });
    });
    document.querySelectorAll('.product-details__gallery').forEach((gallery) => {
        const product = gallery.closest('.product-details');

        if (!product) {
            return;
        }

        const thumbs = [...product.querySelectorAll('.product-details__thumb')];
        const thumbnailContainer = product.querySelector('.product-details__thumbs');
        const thumbnails = createSlider(thumbnailContainer.querySelector('.swiper'), {
            slidesPerView: 3,
            spaceBetween: 10,
            watchOverflow: true,
            breakpoints: { 768: { direction: 'vertical', slidesPerView: 5 } },
        });
        const main = createSlider(gallery.querySelector('.swiper'), {
            slidesPerView: 1,
            watchOverflow: true,
            navigation: controls(thumbnailContainer).navigation,
            on: {
                slideChange() {
                    thumbs.forEach((thumb, index) => {
                        thumb.classList.toggle('active', index === this.activeIndex);
                        thumb.setAttribute('aria-pressed', String(index === this.activeIndex));
                    });
                    thumbnails?.slideTo(this.activeIndex);
                    const zoom = gallery.querySelector('.product-details__zoom');

                    if (zoom) {
                        zoom.href = this.slides[this.activeIndex].href;
                    }
                },
            },
        });

        thumbs.forEach((thumb, index) => {
            thumb.classList.toggle('active', index === 0);
            thumb.setAttribute('aria-pressed', String(index === 0));
        });
        delegate(product, 'click', '.product-details__thumb', (event, thumb) =>
            main?.slideTo(thumbs.indexOf(thumb)),
        );
    });
    productGalleries();
}
