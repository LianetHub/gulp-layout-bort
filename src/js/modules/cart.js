import { slide, show, hide, scrollToPosition } from './effects.js';

export function calculateCart(items) {
    return items.reduce((result, item) => ({
        total: result.total + item.price * item.quantity,
        discount: result.discount + Math.max(0, item.oldPrice - item.price) * item.quantity,
        quantity: result.quantity + item.quantity,
        weight: Math.round((result.weight + item.weight * item.quantity) * 100) / 100
    }), { total: 0, discount: 0, quantity: 0, weight: 0 });
}

const money = value => new Intl.NumberFormat('ru-RU').format(value) + ' ₽';
const productWord = count => count % 10 === 1 && count % 100 !== 11 ? 'товар' : count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 12 || count % 100 > 14) ? 'товара' : 'товаров';

export function cart() {
    document.querySelectorAll('.cart').forEach(element => {
        if (element.dataset.cartReady) return;
        element.dataset.cartReady = 'true';
        const rows = () => [...element.querySelectorAll('[data-cart-item]')];
        const message = element.querySelector('.cart__message');
        const announce = text => {
            if (!message) return;
            message.hidden = false;
            message.textContent = text;
        };
        const readItem = (row, quantity = 1) => ({
            price: Number(row.dataset.price),
            oldPrice: Number(row.dataset.oldPrice),
            weight: Number(row.dataset.weight),
            quantity
        });
        function selectAccessory(accessory, selected) {
            const button = accessory.querySelector('.cart-accessory__add');
            accessory.dataset.selected = String(selected);
            button.setAttribute('aria-pressed', String(selected));
            button.setAttribute('aria-label', (selected ? 'Убрать из корзины: ' : 'Добавить: ') + accessory.querySelector('.cart-accessory__name').textContent);
            const icon = button.querySelector('.cart-accessory__icon');
            icon.classList.toggle('icon-cart', !selected);
            icon.textContent = selected ? '✓' : '';
        }
        function update() {
            if (!element.querySelector('[data-cart-total]')) return;
            const items = [];
            rows().forEach(row => {
                const input = row.querySelector('.quantity-block__input');
                const quantity = Math.min(9999, Math.max(1, parseInt(input.value, 10) || 1));
                input.value = quantity;
                items.push(readItem(row, quantity));
                row.querySelector('.cart-item__current').textContent = money(Number(row.dataset.price) * quantity);
                row.querySelectorAll('.cart-accessory[data-selected="true"]').forEach(accessory => items.push(readItem(accessory)));
            });
            const totals = calculateCart(items);
            element.querySelector('[data-cart-total]').textContent = money(totals.total);
            element.querySelector('[data-cart-subtotal]').textContent = money(totals.total + totals.discount);
            element.querySelector('[data-cart-discount]').textContent = '−' + money(totals.discount);
            element.querySelector('[data-cart-count]').textContent = totals.quantity + ' ' + productWord(totals.quantity);
            document.querySelectorAll('.main-actions__item.icon-cart .main-actions__quanitity').forEach(badge => {
                badge.textContent = totals.quantity;
                badge.hidden = totals.quantity === 0;
            });
            element.querySelector('[data-cart-weight]').textContent = totals.weight.toLocaleString('ru-RU', { maximumFractionDigits: 2 }) + ' кг';
            element.querySelector('.cart__empty').hidden = rows().length > 0;
            const checkout = element.querySelector('.cart__total-order');
            if (checkout) {
                const empty = rows().length === 0;
                checkout.disabled = empty;
                checkout.setAttribute('aria-disabled', String(empty));
                if (checkout.tagName === 'A') {
                    if (empty) checkout.removeAttribute('href');
                    else checkout.setAttribute('href', 'checkout.html');
                    checkout.tabIndex = empty ? -1 : 0;
                }
            }
        }
        function initSlider(details) {
            const slider = details.querySelector('.swiper');
            if (!details.open || !slider || typeof Swiper === 'undefined') return;
            if (slider.swiper) { slider.swiper.update(); return; }
            new Swiper(slider, {
                slidesPerView: 1, spaceBetween: 10, watchOverflow: true,
                a11y: { prevSlideMessage: 'Предыдущая рекомендация', nextSlideMessage: 'Следующая рекомендация' },
                breakpoints: { 576: { slidesPerView: 2 } },
                navigation: { prevEl: slider.querySelector('.swiper-button-prev'), nextEl: slider.querySelector('.swiper-button-next') }
            });
        }
        element.querySelectorAll('.cart__recommendations').forEach(details => {
            if (details.open) {
                const accessory = details.querySelector('.cart-accessory');
                if (accessory) selectAccessory(accessory, true);
            }
            details.addEventListener('toggle', () => initSlider(details));
            initSlider(details);
        });
        element.addEventListener('click', event => {
            const remove = event.target.closest('.cart-item__remove');
            if (remove) {
                const row = remove.closest('[data-cart-item]');
                row.querySelectorAll('.swiper').forEach(slider => slider.swiper?.destroy());
                row.remove();
                update();
                return;
            }
            const add = event.target.closest('.cart-accessory__add');
            if (add) {
                const accessory = add.closest('.cart-accessory');
                const selected = accessory.dataset.selected !== 'true';
                selectAccessory(accessory, selected);
                update();
            }
            if (event.target.closest('.quantity-block__up, .quantity-block__down')) update();
        });
        element.addEventListener('input', event => {
            if (event.target.matches('.quantity-block__input')) update();
        });
        element.querySelector('.cart__share')?.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(window.location.href);
                announce('Ссылка на корзину скопирована.');
            } catch {
                announce('Ссылка на корзину: ' + window.location.href);
            }
        });
        element.querySelector('.cart__promo')?.addEventListener('submit', event => {
            event.preventDefault();
            const input = element.querySelector('.cart__promo-input');
            announce(input.value.trim() ? 'Проверка промокода будет доступна при подключении магазина.' : 'Введите промокод.');
            if (!input.value.trim()) input.focus();
        });

        // Retain the existing checkout popup and delivery validation when fields are present.
        const payment = element.querySelector('[name="cart_payment"]');
        const delivery = element.querySelector('[name="cart_delivery"]');
        const address = element.querySelector('[name="cart_delivery_address"]');
        const field = element.querySelector('.cart__checkout-address');
        const hasDelivery = payment && delivery && address && field;
        function validateCartCheckout() {
            if (!hasDelivery) return true;
            let firstInvalid;
            for (const [input, invalid] of [[payment, !payment.value], [delivery, !delivery.value], [address, delivery.value === 'delivery' && !address.value.trim()]]) {
                const parent = input.closest('.form__field');
                parent?.classList.toggle('_error', invalid);
                if (invalid && !firstInvalid) firstInvalid = parent || input;
            }
            if (!firstInvalid) return true;
            scrollToPosition(firstInvalid.getBoundingClientRect().top + window.scrollY - 120);
            return false;
        }
        if (hasDelivery) {
            delivery.addEventListener('change', () => {
                const opening = delivery.value === 'delivery';
                slide(field, opening, 300);
                if (!opening) field.classList.remove('_error');
            });
            if (delivery.value === 'delivery') show(field);
            else { hide(field); field.hidden = true; }
        }
        element.querySelectorAll('.cart__total-order').forEach(button => button.addEventListener('click', event => {
            if (button.tagName === 'A') {
                if (button.getAttribute('aria-disabled') === 'true') event.preventDefault();
                return;
            }
            if (validateCartCheckout() && typeof Fancybox !== 'undefined' && Fancybox) Fancybox.show([{ src: '#order', type: 'inline' }]);
        }));
        if (element.querySelector('[data-cart-total]')) update();
    });
}
