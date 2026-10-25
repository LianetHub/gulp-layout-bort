import { delegate } from './dom.js';
import { scrollToPosition } from './effects.js';

export function interactions() {
    if (typeof Fancybox !== 'undefined' && Fancybox) {
        Fancybox.bind('[data-fancybox]', { closeExisting: true });
    }
    delegate(document, 'click', '.favorite-btn, .compare-btn', (event, button) => {
        const selected = button.classList.toggle('active');

        button.setAttribute('aria-pressed', String(selected));
        if (selected) {
            const product = button.closest(
                '.product, .product-details, .comparing-card, .order-product, .cart-item',
            );
            const name =
                product
                    ?.querySelector(
                        '.product__name, .comparing-card__name, .order-product__name, .cart-item__name',
                    )
                    ?.textContent.trim() || '';

            window.NotifyController?.show(
                name,
                1,
                button.classList.contains('favorite-btn') ? 'favorite' : 'compare',
            );
        }
    });
    delegate(document, 'click', '.review__toggle', (event, button) => {
        const content = button.closest('.review')?.querySelector('.review__content');
        const expanded = button.classList.toggle('is-active');

        content?.classList.toggle('expanded', expanded);
        button.setAttribute('aria-expanded', String(expanded));
        button.textContent = expanded ? 'Скрыть отзыв' : 'Показать полностью';
    });
    document.querySelectorAll('.quantity-block').forEach((block) => {
        const input = block.querySelector('.quantity-block__input');

        if (!input) {
            return;
        }

        block.querySelector('.quantity-block__up')?.addEventListener('click', () => {
            const value = parseInt(input.value) || 0;

            if (value < 9999) {
                input.value = value + 1;
            }
        });
        block.querySelector('.quantity-block__down')?.addEventListener('click', () => {
            const value = parseInt(input.value) || 0;

            if (value > 1) {
                input.value = value - 1;
            }
        });
        input.addEventListener('input', () => {
            input.value = Math.min(
                9999,
                Math.max(1, parseInt(input.value.replace(/\D/g, '')) || 1),
            );
        });
        input.addEventListener('paste', (event) => {
            if (/\D/.test(event.clipboardData.getData('text'))) {
                event.preventDefault();
            }
        });
    });
    const arrows = document.querySelectorAll('.arrow-top');

    if (arrows.length) {
        window.addEventListener(
            'scroll',
            () =>
                arrows.forEach((arrow) => arrow.classList.toggle('visible', window.scrollY > 300)),
            { passive: true },
        );
        arrows.forEach((arrow) => arrow.addEventListener('click', () => scrollToPosition(0)));
    }
}

export class NotifyController {
    constructor() {
        this.containerSelector = '.notify-container';
        this.productSelector = '.product, .product-details';
        this.btnSelector = '.add-to-cart-btn';
        this.displayTime = 4000;
        this.init();
    }
    init() {
        delegate(document, 'click', this.btnSelector, (event, button) => {
            if (button.disabled || button.getAttribute('aria-disabled') === 'true') {
                return;
            }

            this.handleAddToCart(button.closest(this.productSelector));
        });
    }
    handleAddToCart(product) {
        this.show(
            product?.querySelector('.product__name')?.textContent.trim() || '',
            product?.querySelector('.quantity-block__input')?.value || 1,
        );
    }
    show(name, quantity = 1, type = 'cart') {
        const container = document.querySelector(this.containerSelector);

        if (!container) {
            return;
        }

        container.setAttribute('aria-live', 'polite');
        container.setAttribute('aria-relevant', 'additions');
        const states = {
            cart: { title: 'В корзине', icon: 'icon-cart' },
            favorite: { title: 'В избранном', icon: 'icon-heart' },
            compare: { title: 'В сравнении', icon: 'icon-bars' },
        };
        const state = states[type] || states.cart;
        const notification = document.createElement('div');

        notification.className = 'notify';
        const icon = document.createElement('span');

        icon.className = 'notify__icon ' + state.icon;
        icon.setAttribute('aria-hidden', 'true');
        const body = document.createElement('div');

        body.className = 'notify__body';
        const title = document.createElement('p');

        title.className = 'notify__title';
        title.textContent = state.title;
        const text = document.createElement('p');

        text.className = 'notify__text';
        text.textContent = name;
        body.append(title, text);
        const close = document.createElement('button');

        close.type = 'button';
        close.className = 'notify__close icon-close';
        close.setAttribute('aria-label', 'Закрыть уведомление');
        notification.append(icon, body, close);
        let timer;
        const remove = () => {
            clearTimeout(timer);
            notification.remove();
        };
        const start = () => {
            clearTimeout(timer);
            timer = setTimeout(remove, this.displayTime);
        };

        close.addEventListener('click', remove);
        notification.addEventListener('pointerenter', () => clearTimeout(timer));
        notification.addEventListener('pointerleave', () => {
            if (!notification.contains(document.activeElement)) {
                start();
            }
        });
        notification.addEventListener('focusin', () => clearTimeout(timer));
        notification.addEventListener('focusout', (event) => {
            if (!notification.contains(event.relatedTarget)) {
                start();
            }
        });
        container.append(notification);
        if (container.children.length > 3) {
            container.firstElementChild.remove();
        }
        start();
    }
}
