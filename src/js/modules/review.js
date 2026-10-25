import { delegate } from './dom.js';

export const reviews = () => {
    delegate(document, 'click', '.review__vote', (event, vote) => {
        const card = vote.closest('.review');

        if (!card) {
            return;
        }

        const active = vote.getAttribute('aria-pressed') === 'true';

        card.querySelectorAll('.review__vote').forEach((button) => {
            const counter = button.querySelector('.review__vote-count');

            if (!button.dataset.baseCount) {
                button.dataset.baseCount = counter.textContent;
            }
            const selected = button === vote && !active;

            button.setAttribute('aria-pressed', String(selected));
            const count = (Number(button.dataset.baseCount) || 0) + Number(selected);

            counter.textContent = String(count);
        });
    });
};
