import { delegate } from './dom.js';

export const faq = () => {
    document.querySelectorAll('.faq').forEach(section => {
        const items = [...section.querySelectorAll('.faq__item')];
        const desktop = window.matchMedia('(min-width: 1199.98px)');
        delegate(section, 'click', '.faq__question', (event, question) => {
            const expanded = question.getAttribute('aria-expanded') !== 'true';
            question.setAttribute('aria-expanded', String(expanded));
            question.classList.toggle('is-open', expanded);
            const answer = question.nextElementSibling;
            if (answer?.matches('.faq__answer')) answer.hidden = !expanded;
        });
        delegate(section, 'click', '.faq__filter', (event, button) => {
            const type = button.hasAttribute('data-faq-section') ? 'section' : 'product';
            const value = button.getAttribute(`data-faq-${type}`);
            [...button.parentElement.children].filter(sibling => sibling.matches('.faq__filter')).forEach(sibling => sibling.setAttribute('aria-pressed', String(sibling === button)));
            items.forEach(item => { item.hidden = !(type === 'product' && value === '0') && item.dataset[type] !== value; });
            section.querySelectorAll('.faq__empty').forEach(empty => { empty.hidden = items.some(item => !item.hidden); });
        });
        desktop.addEventListener('change', () => {
            items.forEach(item => { item.hidden = false; });
            section.querySelectorAll('.faq__filter').forEach(button => button.setAttribute('aria-pressed', 'false'));
            section.querySelectorAll('[data-faq-product="0"]').forEach(button => button.setAttribute('aria-pressed', 'true'));
            section.querySelectorAll('.faq__empty').forEach(empty => { empty.hidden = true; });
        });
    });
};
