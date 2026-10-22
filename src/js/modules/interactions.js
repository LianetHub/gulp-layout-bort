import { delegate } from './dom.js';
import { fade, hide, scrollToPosition } from './effects.js';

export function interactions() {
    if (typeof Fancybox !== 'undefined' && Fancybox) Fancybox.bind('[data-fancybox]', { closeExisting: true });
    delegate(document, 'click', '.favorite-btn, .compare-btn', (event, button) => {
        button.setAttribute('aria-pressed', String(button.classList.toggle('active')));
    });
    delegate(document, 'click', '.review__toggle', (event, button) => {
        const content = button.closest('.review')?.querySelector('.review__content');
        const expanded = button.classList.toggle('is-active');
        content?.classList.toggle('expanded', expanded);
        button.setAttribute('aria-expanded', String(expanded));
        button.textContent = expanded ? 'Скрыть отзыв' : 'Показать полностью';
    });
    document.querySelectorAll('.quantity-block').forEach(block => {
        const input = block.querySelector('.quantity-block__input');
        if (!input) return;
        block.querySelector('.quantity-block__up')?.addEventListener('click', () => {
            const value = parseInt(input.value) || 0;
            if (value < 9999) input.value = value + 1;
        });
        block.querySelector('.quantity-block__down')?.addEventListener('click', () => {
            const value = parseInt(input.value) || 0;
            if (value > 1) input.value = value - 1;
        });
        input.addEventListener('input', () => { input.value = Math.min(9999, Math.max(1, parseInt(input.value.replace(/\D/g, '')) || 1)); });
        input.addEventListener('paste', event => {
            if (/\D/.test(event.clipboardData.getData('text'))) event.preventDefault();
        });
    });
    const arrows = document.querySelectorAll('.arrow-top');
    if (arrows.length) {
        window.addEventListener('scroll', () => arrows.forEach(arrow => arrow.classList.toggle('visible', window.scrollY > 300)), { passive: true });
        arrows.forEach(arrow => arrow.addEventListener('click', () => scrollToPosition(0)));
    }
}

export class NotifyController {
    constructor() {
        this.containerSelector = '.notify-container';
        this.productSelector = '.product';
        this.btnSelector = '.add-to-cart-btn';
        this.displayTime = 4000;
        this.init();
    }
    init() {
        delegate(document, 'click', this.btnSelector, (event, button) => this.handleAddToCart(button.closest(this.productSelector)));
    }
    handleAddToCart(product) {
        this.show(product?.querySelector('.product__name')?.textContent.trim() || '', product?.querySelector('.quantity-block__input')?.value || 1);
    }
    show(name, quantity) {
        const container = document.querySelector(this.containerSelector);
        if (!container) return;
        const notification = document.createElement('div');
        notification.className = 'notify';
        notification.innerHTML = '<div class="notify__title title-sm">Товар добавлен <span class="color-accent">в корзину</span></div><div class="notify__text"></div>';
        notification.querySelector('.notify__text').textContent = `Добавлено: ${name} (${quantity} шт.)`;
        container.append(notification);
        hide(notification);
        fade(notification, true, 300);
        setTimeout(() => fade(notification, false, 300, () => notification.remove()), this.displayTime);
    }
}
