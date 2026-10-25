import { delegate } from './dom.js';

export function searchFields() {
    const sync = (input) => {
        const button = input.closest('.search-field')?.querySelector('.search-field__clear');

        if (button) {
            button.hidden = input.value.length === 0;
        }
    };

    document.querySelectorAll('.search-field__input').forEach(sync);
    delegate(document, 'input', '.search-field__input', (event, input) => sync(input));
    delegate(document, 'click', '.search-field__clear', (event, button) => {
        const input = button.closest('.search-field').querySelector('.search-field__input');

        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.focus();
    });
}
