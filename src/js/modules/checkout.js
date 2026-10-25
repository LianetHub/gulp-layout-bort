import { addressPicker } from './address-picker.js';
import { pickupPicker } from './pickup-picker.js';

export function checkout() {
    const form = document.querySelector('#checkout-form');

    if (!form || form.dataset.initialized) {
        return;
    }

    form.dataset.initialized = 'true';
    const status = form.querySelector('.checkout__status');
    const announce = (message) => {
        status.hidden = false;
        status.textContent = message;
    };

    addressPicker(form);
    const pickup = pickupPicker(form);

    form.querySelector('.checkout__promo-button').addEventListener('click', () => {
        const promo = form.elements.promo;

        announce(
            promo.value.trim()
                ? 'Проверка промокода будет доступна после подключения сервиса заказов.'
                : 'Введите промокод.',
        );
        if (!promo.value.trim()) {
            promo.focus();
        }
    });
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        if (pickup && !pickup.validate()) {
            return;
        }

        if (!form.checkValidity()) {
            return;
        }

        form.dispatchEvent(
            new CustomEvent('checkout:submit', {
                bubbles: true,
                detail: Object.fromEntries(new FormData(form)),
            }),
        );
        announce(
            'Данные заполнены. Отправка заказа будет доступна после подключения сервиса заказов.',
        );
    });
}
