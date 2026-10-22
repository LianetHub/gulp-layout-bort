import { delegate } from './dom.js';

const controls = container => ({
    navigation: {
        nextEl: container.querySelector('.swiper-button-next'),
        prevEl: container.querySelector('.swiper-button-prev')
    },
    pagination: { el: container.querySelector('.swiper-pagination'), clickable: true }
});

function createSlider(element, options) {
    if (!element || typeof Swiper === 'undefined') return null;
    return element.swiper || new Swiper(element, options);
}

class MobileSwiper {
    constructor(element, options) {
        this.element = element;
        this.options = options;
        this.swiper = null;
        if (!element) return;
        this.handleResize();
        window.addEventListener('resize', () => this.handleResize());
    }
    handleResize() {
        if (window.innerWidth <= 767.98) {
            if (!this.swiper) this.swiper = createSlider(this.element, this.options);
        } else if (this.swiper) {
            this.swiper.destroy();
            this.swiper = null;
        }
    }
}

export function sliders() {
    if (typeof Swiper === 'undefined') return;
    document.querySelectorAll('[data-showcase-slider]').forEach(container => {
        const type = container.dataset.showcaseSlider;
        const marketing = type === 'marketing';
        const count = marketing ? 3 : Number(type);
        const breakpoints = marketing ? {
            768: { slidesPerView: 'auto' }, 992: { slidesPerView: 'auto' }, 1200: { slidesPerView: 3 }
        } : {
            576: { slidesPerView: 2 }, 768: { slidesPerView: 3 },
            992: { slidesPerView: count === 3 ? 3 : 4 },
            1200: { slidesPerView: count === 6 ? 5 : (count === 5 ? 4 : 3) },
            1320: { slidesPerView: count }
        };
        createSlider(container.querySelector('.swiper'), {
            slidesPerView: marketing ? 'auto' : 1, spaceBetween: marketing || count === 3 ? 20 : 10,
            breakpoints, watchOverflow: true, navigation: controls(container).navigation
        });
    });
    document.querySelectorAll('.promotions__slider').forEach(container => {
        createSlider(container.querySelector('.swiper'), { slidesPerView: 1, rewind: true, watchOverflow: true, ...controls(container) });
    });
    document.querySelectorAll('.benefits').forEach(container => {
        new MobileSwiper(container.querySelector('.benefits__list .swiper'), {
            spaceBetween: 20,
            a11y: { prevSlideMessage: 'Предыдущий слайд', nextSlideMessage: 'Следующий слайд', paginationBulletMessage: 'Перейти к слайду {{index}}' },
            ...controls(container)
        });
    });
    document.querySelectorAll('.products__slider').forEach(container => {
        let breakpoints;
        if (container.classList.contains('products__slider--small')) {
            breakpoints = { 767.98: { slidesPerView: 3 }, 991.98: { slidesPerView: 4 }, 1199.98: { slidesPerView: 5 }, 1419.98: { slidesPerView: 6 } };
        } else if (container.classList.contains('products__slider--large')) {
            breakpoints = { 767.98: { slidesPerView: 1 }, 991.98: { slidesPerView: 2 }, 1419.98: { slidesPerView: 3 } };
        } else breakpoints = { 767.98: { slidesPerView: 2 }, 991.98: { slidesPerView: 3 }, 1419.98: { slidesPerView: 4 } };
        createSlider(container.querySelector('.swiper'), { slidesPerView: 'auto', spaceBetween: 20, watchOverflow: true, navigation: controls(container).navigation, breakpoints });
    });
    const newsBreakpoints = {
        575.98: { slidesPerView: 1.5 }, 767.98: { slidesPerView: 2 },
        991.98: { slidesPerView: 3 }, 1419.98: { slidesPerView: 4 }
    };
    document.querySelectorAll('.news__slider:not([data-showcase-slider]), .sales__slider').forEach(container => {
        createSlider(container.querySelector('.swiper'), { slidesPerView: 1, spaceBetween: 20, watchOverflow: true, breakpoints: newsBreakpoints, ...controls(container) });
    });
    document.querySelectorAll('.promotions__grid').forEach(container => {
        new MobileSwiper(container.querySelector('.swiper'), { spaceBetween: 20, ...controls(container) });
    });
    document.querySelectorAll('.product-details__gallery').forEach(gallery => {
        const product = gallery.closest('.product-details');
        if (!product) return;
        const thumbs = [...product.querySelectorAll('.product-details__thumb')];
        const mobileThumbs = new MobileSwiper(product.querySelector('.product-details__thumbs .swiper'), {
            slidesPerView: 'auto', spaceBetween: 10, freeMode: true, watchSlidesProgress: true
        });
        const main = createSlider(gallery.querySelector('.swiper'), {
            slidesPerView: 1, watchOverflow: true,
            on: { slideChange() {
                thumbs.forEach((thumb, index) => thumb.classList.toggle('active', index === this.activeIndex));
                mobileThumbs.swiper?.slideTo(this.activeIndex);
            } }
        });
        delegate(product, 'click', '.product-details__thumb', (event, thumb) => {
            const index = thumbs.indexOf(thumb);
            if (index < 0) return;
            thumbs.forEach(item => item.classList.toggle('active', item === thumb));
            main?.slideTo(index);
        });
    });
    comparingSliders();
}

function comparingSliders() {
    document.querySelectorAll('.comparing__slider').forEach(container => {
        const element = container.querySelector('.swiper');
        if (!element || element.swiper) return;
        const placeholder = document.createElement('div');
        placeholder.className = 'comparing__placeholder';
        container.before(placeholder);
        const updatePositions = () => {
            const anchor = container.classList.contains('is-stuck') ? placeholder : container;
            return { height: container.getBoundingClientRect().height, bottom: anchor.getBoundingClientRect().top + window.scrollY + container.getBoundingClientRect().height };
        };
        let position = updatePositions();
        window.addEventListener('resize', () => { position = updatePositions(); });
        window.addEventListener('scroll', () => {
            const headerHeight = document.querySelector('.header__body')?.getBoundingClientRect().height || 0;
            const stuck = window.scrollY + headerHeight >= position.bottom;
            container.classList.toggle('is-stuck', stuck);
            placeholder.style.height = stuck ? `${position.height}px` : '0';
        }, { passive: true });
        const breakpoints = { 767.98: { slidesPerView: 2 }, 991.98: { slidesPerView: 3 }, 1419.98: { slidesPerView: 4 } };
        const main = createSlider(element, {
            slidesPerView: 2, spaceBetween: 20, watchOverflow: true, breakpoints,
            navigation: controls(container).navigation,
            pagination: {
                el: container.querySelector('.swiper-pagination'), type: 'fraction',
                renderFraction: (currentClass, totalClass) => `Страница <span class="${currentClass}"></span> из <span class="${totalClass}"></span>`
            }
        });
        const tables = [...(container.closest('.comparing') || container.parentElement).querySelectorAll('.comparing__table')].map(table => createSlider(table, {
            slidesPerView: 2, grabCursor: true, spaceBetween: 20, breakpoints
        }));
        const linked = [main, ...tables].filter(Boolean);
        for (const swiper of linked) {
            for (const method of ['setTranslate', 'setTransition']) {
                swiper[method] = function (value, byController, doNotPropagate) {
                    if (doNotPropagate) Swiper.prototype[method].call(this, value, byController);
                    else linked.forEach(instance => instance[method](value, byController, true));
                };
            }
        }
    });
}
