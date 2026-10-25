import { delegate } from './dom.js';

export function productDetails() {
    document.querySelectorAll('.product-content').forEach((content) => {
        delegate(content, 'click', '.product-content__expand', (event, button) => {
            const expanded = button.getAttribute('aria-expanded') !== 'true';

            content.querySelectorAll('.product-content__rich-image--extra').forEach((image) => {
                image.hidden = !expanded;
            });
            button.setAttribute('aria-expanded', String(expanded));
            button.textContent = expanded ? 'Свернуть' : 'Показать полностью';
        });
        delegate(content, 'click', '.product-content__tab', (event, tab) => {
            content
                .querySelectorAll('.product-content__tab')
                .forEach((link) => link.classList.toggle('active', link === tab));
        });
    });
    document.querySelectorAll('.product-details').forEach((product) => {
        const sync = (input) =>
            product.querySelectorAll('.quantity-block__input').forEach((other) => {
                other.value = input.value;
            });

        delegate(product, 'input', '.quantity-block__input', (event, input) => sync(input));
        delegate(product, 'click', '.quantity-block__up, .quantity-block__down', (event, button) =>
            sync(button.closest('.quantity-block').querySelector('.quantity-block__input')),
        );
    });
}
