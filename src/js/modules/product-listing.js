export function productListing() {
    const root = document.querySelector('.product-listing');

    if (!root) {
        return;
    }

    const form = root.querySelector('.listing-filter');
    const overlay = root.querySelector('.listing-filter-overlay');
    const opener = root.querySelector('.product-listing__filter-button');
    let previousOverflow = '';

    function closeFilter() {
        if (!form.classList.contains('is-open')) {
            return;
        }

        form.classList.remove('is-open');
        form.removeAttribute('role');
        form.removeAttribute('aria-modal');
        overlay.hidden = true;
        opener.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = previousOverflow;
        opener.focus();
    }

    opener.addEventListener('click', () => {
        previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        form.classList.add('is-open');
        form.setAttribute('role', 'dialog');
        form.setAttribute('aria-modal', 'true');
        overlay.hidden = false;
        opener.setAttribute('aria-expanded', 'true');
        form.querySelector('.listing-filter__close').focus();
    });
    form.querySelector('.listing-filter__close').addEventListener('click', closeFilter);
    overlay.addEventListener('click', closeFilter);
    document.addEventListener('keydown', (event) => {
        if (!form.classList.contains('is-open')) {
            return;
        }

        if (event.key === 'Escape') {
            closeFilter();
        }
        if (event.key !== 'Tab') {
            return;
        }

        const focusable = Array.from(form.querySelectorAll('a, button, input, summary')).filter(
            (element) => element.getClientRects().length,
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    });
    window.matchMedia('(min-width: 1199.98px)').addEventListener('change', (event) => {
        if (event.matches) {
            closeFilter();
        }
    });
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        closeFilter();
    });
    root.querySelector('.product-listing__selected')?.addEventListener('click', (event) => {
        const chip = event.target.closest('.product-listing__chip');
        const clearChip = (item) => {
            const names = (item.dataset.filterFields || '').split(',');

            [...form.elements]
                .filter(
                    (field) =>
                        names.includes(field.name) &&
                        (!item.dataset.filterValue || field.value === item.dataset.filterValue),
                )
                .forEach((field) => {
                    if (field.type === 'checkbox' || field.type === 'radio') {
                        field.checked = false;
                    } else {
                        field.value = '';
                    }
                    field.dispatchEvent(new Event('change', { bubbles: true }));
                });
            item.remove();
        };

        if (chip) {
            clearChip(chip);
        }
        if (event.target.closest('.product-listing__clear')) {
            root.querySelectorAll('.product-listing__chip').forEach(clearChip);
        }
        const selected = root.querySelector('.product-listing__selected');

        if (!selected.querySelector('.product-listing__chip')) {
            selected.hidden = true;
        }
    });
    form.querySelector('.listing-filter__expand').addEventListener('click', (event) => {
        const button = event.currentTarget;
        const extra = form.querySelector('.listing-filter__extra');

        extra.hidden = !extra.hidden;
        button.textContent = extra.hidden ? 'Показать еще' : 'Скрыть';
        button.setAttribute('aria-expanded', String(!extra.hidden));
    });
    root.querySelectorAll('.product-listing__tag:not(.product-listing__tag--more)').forEach(
        (button) =>
            button.addEventListener('click', () => {
                root.querySelectorAll('.product-listing__tag').forEach((tag) => {
                    tag.classList.remove('is-active');
                    tag.setAttribute('aria-pressed', 'false');
                });
                button.classList.add('is-active');
                button.setAttribute('aria-pressed', 'true');
            }),
    );
    root.querySelector('.product-listing__tag--more').addEventListener('click', (event) => {
        const button = event.currentTarget;
        const expanded = button.getAttribute('aria-expanded') !== 'true';

        root.querySelector('.product-listing__tags').classList.toggle('is-expanded', expanded);
        button.setAttribute('aria-expanded', String(expanded));
        button.textContent = expanded ? 'Скрыть' : 'Показать еще';
    });
}
