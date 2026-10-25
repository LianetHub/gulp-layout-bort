export function orders() {
    const root = document.querySelector('[data-orders]');
    if (!root || root.dataset.initialized) return;
    root.dataset.initialized = 'true';
    const form = root.querySelector('.orders__filters');
    const cards = [...root.querySelectorAll('[data-order]')];
    const mobile = window.matchMedia('(width < 767.98px)');
    const filter = () => {
        const values = Object.fromEntries(new FormData(form));
        const query = values.query.trim().toLocaleLowerCase('ru');
        let count = 0;
        cards.forEach(card => {
            const status = mobile.matches ? 'processing' : card.dataset.status;
            const payment = mobile.matches ? (card.dataset.mobilePayment === 'Оплачен' ? 'paid' : 'unpaid') : card.dataset.payment;
            const matches = card.dataset.search.toLocaleLowerCase('ru').includes(query)
                && (!values.period || card.dataset.date.startsWith(values.period))
                && (!values.status || status === values.status)
                && (!values.payment || payment === values.payment);
            card.hidden = !matches;
            if (matches) count++;
        });
        root.querySelector('.orders__empty').hidden = count > 0;
    };
    form.addEventListener('submit', event => { event.preventDefault(); filter(); });
    form.addEventListener('input', filter);
    form.addEventListener('change', filter);
    mobile.addEventListener('change', filter);
}
