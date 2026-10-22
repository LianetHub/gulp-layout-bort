import { slide, show, hide, scrollToPosition } from './effects.js';

export function cart() {
    document.querySelectorAll('.cart').forEach(element => {
        const payment = element.querySelector('[name="cart_payment"]');
        const delivery = element.querySelector('[name="cart_delivery"]');
        const address = element.querySelector('[name="cart_delivery_address"]');
        const field = element.querySelector('.cart__checkout-address');
        if (!payment || !delivery || !address || !field) return;
        function toggleDeliveryAddress() {
            const opening = delivery.value === 'delivery';
            slide(field, opening, 300);
            if (!opening) field.classList.remove('_error');
        }
        function validateCartCheckout() {
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
        delivery.addEventListener('change', toggleDeliveryAddress);
        if (delivery.value === 'delivery') show(field);
        else {
            hide(field);
            field.hidden = true;
        }
        element.querySelectorAll('.cart__total-order').forEach(button => button.addEventListener('click', () => {
            if (validateCartCheckout() && typeof Fancybox !== 'undefined' && Fancybox) Fancybox.show([{ src: '#order', type: 'inline' }]);
        }));
    });
}
