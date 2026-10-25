import { fade, show, hide } from './effects.js';
import { comparing } from './comparing.js';

export function compare() {
    comparing();
    document.querySelectorAll('.compare__table').forEach(table => {
        const rows = [...table.querySelectorAll('.compare__row')];
        const button = table.closest('.compare')?.querySelector('.compare__more-btn');
        if (!button) return;
        function updateVisibility() {
            const mobile = window.innerWidth <= 767.98;
            const expanded = button.classList.contains('is-expanded');
            rows.forEach((row, index) => {
                if (!mobile || expanded || index < 3) show(row);
                else hide(row);
            });
            if (mobile) {
                show(button);
                button.textContent = expanded ? 'Скрыть' : 'Показать больше';
            } else hide(button);
        }
        button.addEventListener('click', () => {
            const expanded = button.classList.toggle('is-expanded');
            rows.forEach((row, index) => {
                if (index >= 3) fade(row, expanded, 300);
            });
            button.textContent = expanded ? 'Скрыть' : 'Показать больше';
        });
        updateVisibility();
        window.addEventListener('resize', updateVisibility);
    });
}
