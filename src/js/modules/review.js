import { Pagination } from './pagination.js';
import { delegate } from './dom.js';

export const compareReviews = (first, second, order) => {
    if (order === 'newest') return second.date - first.date;
    if (order === 'highest') return second.rating - first.rating || second.date - first.date;
    if (order === 'lowest') return first.rating - second.rating || second.date - first.date;
    return second.helpful - first.helpful || second.date - first.date;
};

export const reviews = () => {
    document.querySelectorAll('.review-group').forEach(group => {
        const list = group.querySelector('.review-group__list');
        const sort = group.querySelector('.review-sort__select');
        if (!list || !sort) return;
        const cards = Array.from(list.children).filter(card => card.classList.contains('review'));
        const pageSize = Math.max(1, Number(group.dataset.pageSize) || cards.length || 1);
        const paginationElement = group.querySelector('[data-pagination]');
        let pager;

        const render = (page = 1) => {
            const ordered = cards.map((element, index) => ({
                element,
                index,
                date: Date.parse(element.dataset.date) || 0,
                rating: Number(element.dataset.rating) || 0,
                helpful: Number(element.dataset.helpful) || 0
            })).sort((first, second) => compareReviews(first, second, sort.value) || first.index - second.index);

            ordered.forEach((record, index) => {
                record.element.hidden = index < (page - 1) * pageSize || index >= page * pageSize;
                list.append(record.element);
            });
            const status = group.querySelector('.review-group__status');
            if (status) {
                const start = cards.length ? (page - 1) * pageSize + 1 : 0;
                status.textContent = `Отзывы ${start}–${Math.min(page * pageSize, cards.length)} из ${cards.length}`;
            }
        };

        if (paginationElement) {
            pager = new Pagination(paginationElement, {
                totalPages: Math.ceil(cards.length / pageSize),
                onChange: page => {
                    render(page);
                    group.scrollIntoView({ block: 'start', behavior: 'auto' });
                    pager.pages.querySelector('[aria-current="page"]')?.focus({ preventScroll: true });
                }
            });
        }
        sort.addEventListener('change', () => {
            if (pager) pager.setPage(1, false);
            render();
        });
        render();
    });

    delegate(document, 'click', '.review__vote', (event, vote) => {
        const card = vote.closest('.review');
        if (!card) return;
        const active = vote.getAttribute('aria-pressed') === 'true';
        card.querySelectorAll('.review__vote').forEach(button => {
            const counter = button.querySelector('.review__vote-count');
            if (!button.dataset.baseCount) button.dataset.baseCount = counter.textContent;
            const selected = button === vote && !active;
            button.setAttribute('aria-pressed', String(selected));
            const count = (Number(button.dataset.baseCount) || 0) + Number(selected);
            counter.textContent = String(count);
            if (button.dataset.vote === 'helpful') card.dataset.helpful = String(count);
        });
    });
};
