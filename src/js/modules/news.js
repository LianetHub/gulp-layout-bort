import { isVisible } from './dom.js';

export const news = () => {
    document.querySelectorAll('.news--listing').forEach(section => {
        const buttons = section.querySelectorAll('.news__btn');
        const cards = [...section.querySelectorAll('.news-card')];
        const desktop = window.matchMedia('(min-width: 767.98px)');
        const updateButton = () => {
            const hasMore = cards.some(card => !isVisible(card));
            buttons.forEach(button => {
                button.disabled = !hasMore;
                button.textContent = hasMore || desktop.matches ? 'Показать еще' : 'Все новости показаны';
            });
        };
        buttons.forEach(button => button.addEventListener('click', () => {
            cards.filter(card => !isVisible(card)).slice(0, 3).forEach(card => card.classList.add('is-visible'));
            updateButton();
        }));
        desktop.addEventListener('change', updateButton);
        updateButton();
    });
};
