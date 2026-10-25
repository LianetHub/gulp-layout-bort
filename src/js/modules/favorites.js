export function favorites() {
    document.querySelectorAll('.favorites').forEach((root) => {
        if (root.dataset.favoritesReady) {
            return;
        }

        root.dataset.favoritesReady = 'true';
        root.addEventListener('click', (event) => {
            if (event.target.closest('.favorites__clear')) {
                root.querySelectorAll('.favorite-btn').forEach((button) => {
                    button.classList.remove('active');
                    button.setAttribute('aria-pressed', 'false');
                });
            }
            const remove = event.target.closest('[data-remove-category]');

            remove?.closest('.favorites__category').remove();
        });
    });
}
