export function orders() {
    const form = document.querySelector('.orders__filters');

    if (!form || form.dataset.initialized) {
        return;
    }

    form.dataset.initialized = 'true';
    form.addEventListener('submit', (event) => event.preventDefault());
}
