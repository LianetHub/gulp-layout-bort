export function selectFavoriteProducts(products, category = 'all', sort = 'popular', removed = []) {
    const deleted = new Set(removed);
    const result = products.filter(product => !deleted.has(product.id) && (category === 'all' || product.category === category));
    return result.sort((a, b) => {
        if (sort === 'price-asc') return a.price - b.price || a.order - b.order;
        if (sort === 'price-desc') return b.price - a.price || a.order - b.order;
        if (sort === 'name') return a.name.localeCompare(b.name, 'ru') || a.order - b.order;
        return a.order - b.order;
    });
}

export function favorites() {
    document.querySelectorAll('.favorites').forEach(root => {
        if (root.dataset.favoritesReady) return;
        root.dataset.favoritesReady = 'true';
        const grid = root.querySelector('.favorites__products');
        const sort = root.querySelector('.favorites__sort');
        const more = root.querySelector('.favorites__more');
        const pagination = root.querySelector('.favorites__pagination');
        const clear = root.querySelector('.favorites__clear');
        const status = root.querySelector('.favorites__status');
        const filters = [...root.querySelectorAll('.favorites__filter')];
        const products = [...grid.querySelectorAll('[data-favorite-id]')].map(element => ({
            id: element.dataset.favoriteId, category: element.dataset.category,
            price: Number(element.dataset.price), order: Number(element.dataset.order),
            name: element.querySelector('.product__name').textContent.trim(), element
        }));
        const storageKey = 'bort-favorites-removed-v1';
        let removed = [];
        try {
            const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
            if (Array.isArray(saved)) removed = saved.filter(id => typeof id === 'string' && products.some(p => p.id === id));
        } catch { /* Favorites remain usable when browser storage is unavailable. */ }
        let category = 'all';
        let page = 1;
        let expanded = 1;
        const tablet = window.matchMedia('(min-width: 767.98px)');
        const pageSize = () => tablet.matches ? 3 : 1;
        const available = () => selectFavoriteProducts(products, category, sort.value, removed);
        const announce = message => { status.textContent = message; };
        const save = () => { try { localStorage.setItem(storageKey, JSON.stringify(removed)); } catch { /* Storage is optional. */ } };
        const pageButton = (label, target, disabled = false, icon = '') => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'favorites__page';
            button.dataset.page = target;
            button.disabled = disabled;
            if (icon) {
                button.setAttribute('aria-label', label);
                const image = document.createElement('img');
                image.className = 'favorites__page-icon favorites__page-icon--' + icon;
                image.src = 'img/favorites/arrow-' + icon + '.svg';
                image.alt = '';
                image.width = image.height = 20;
                button.append(image);
            } else {
                button.textContent = label;
                button.setAttribute('aria-label', 'Страница ' + label);
                if (target === page) {
                    button.classList.add('is-active');
                    button.setAttribute('aria-current', 'page');
                }
            }
            return button;
        };
        function render() {
            const all = selectFavoriteProducts(products, 'all', 'popular', removed);
            if (category !== 'all' && !all.some(p => p.category === category)) category = 'all';
            const filtered = available();
            const size = pageSize();
            const pages = Math.max(1, Math.ceil(filtered.length / size));
            page = Math.min(page, pages);
            const start = (page - 1) * size;
            products.forEach(p => { p.element.hidden = true; });
            filtered.forEach((p, index) => {
                grid.append(p.element);
                p.element.hidden = index < start || index >= start + size * expanded;
            });
            filters.forEach(button => {
                const id = button.dataset.category;
                const count = id === 'all' ? all.length : all.filter(p => p.category === id).length;
                button.querySelector('.favorites__count').textContent = count;
                button.classList.toggle('is-active', category === id);
                button.setAttribute('aria-pressed', String(category === id));
                if (id !== 'all') button.closest('.favorites__category').hidden = count === 0;
            });
            clear.disabled = all.length === 0;
            sort.hidden = filtered.length === 0;
            root.querySelector('.favorites__empty').hidden = filtered.length !== 0;
            more.hidden = start + size * expanded >= filtered.length;
            pagination.replaceChildren();
            pagination.hidden = pages <= 1;
            pagination.append(pageButton('Предыдущая страница', page - 1, page === 1, 'prev'));
            const numbers = [...new Set([1, ...Array.from({ length: 3 }, (_, i) => Math.max(2, Math.min(page - 1, pages - 3)) + i), pages])].filter(n => n <= pages).sort((a, b) => a - b);
            numbers.forEach((number, index) => {
                if (index && number - numbers[index - 1] > 1) {
                    const dots = document.createElement('span');
                    dots.className = 'favorites__ellipsis';
                    dots.textContent = '…';
                    pagination.append(dots);
                }
                pagination.append(pageButton(String(number), number));
            });
            pagination.append(pageButton('Следующая страница', page + 1, page === pages, 'next'));
        }
        const resetPage = () => { page = expanded = 1; render(); };
        const removeProducts = ids => {
            removed = [...new Set([...removed, ...ids])];
            save();
            resetPage();
            announce('Товары удалены из избранного. Осталось: ' + (products.length - removed.length));
        };
        function confirm(dialogId, trigger, ids, categoryName) {
            const dialog = document.getElementById(dialogId);
            if (!dialog || dialog.open) return;
            if (categoryName) {
                const message = dialog.querySelector('.favorite-dialog__message');
                const name = document.createElement('strong');
                name.className = 'favorite-dialog__category';
                name.textContent = categoryName;
                message.replaceChildren('Вы хотите удалить ', name, ' из избранного?');
            }
            dialog.querySelector('[data-dialog-confirm]').onclick = () => {
                removeProducts(ids);
                dialog.close('confirm');
            };
            dialog.onclose = () => {
                const visible = !trigger.disabled && trigger.getClientRects().length && !trigger.closest('[hidden]');
                (visible ? trigger : root.querySelector('.favorites__filter[data-category="all"]')).focus({ preventScroll: true });
            };
            dialog.showModal();
        }
        root.addEventListener('click', event => {
            const filter = event.target.closest('.favorites__filter');
            if (filter) { category = filter.dataset.category; resetPage(); return; }
            const removeCategory = event.target.closest('[data-remove-category]');
            if (removeCategory) {
                const id = removeCategory.dataset.removeCategory;
                const label = removeCategory.closest('.favorites__category').querySelector('.favorites__filter').childNodes[0].textContent.trim();
                confirm('favorite-category-dialog', removeCategory, products.filter(p => p.category === id).map(p => p.id), label);
                return;
            }
            const remove = event.target.closest('[data-remove-favorite]');
            if (remove) { removeProducts([remove.closest('[data-favorite-id]').dataset.favoriteId]); root.querySelector('.favorites__filter.is-active').focus({ preventScroll: true }); }
        });
        clear.addEventListener('click', () => confirm('favorite-clear-dialog', clear, products.map(p => p.id)));
        sort.addEventListener('change', resetPage);
        more.addEventListener('click', () => { expanded++; render(); announce('Показано товаров: ' + grid.querySelectorAll('[data-favorite-id]:not([hidden])').length); });
        pagination.addEventListener('click', event => {
            const button = event.target.closest('[data-page]');
            if (!button || button.disabled) return;
            page = Number(button.dataset.page);
            expanded = 1;
            render();
            pagination.querySelector('[aria-current="page"]')?.focus({ preventScroll: true });
            announce('Страница ' + page);
        });
        tablet.addEventListener('change', resetPage);
        ['favorite-category-dialog', 'favorite-clear-dialog'].forEach(id => {
            const dialog = document.getElementById(id);
            dialog?.addEventListener('click', event => {
                if (event.target.closest('[data-dialog-close]')) dialog.close();
                if (event.target === dialog) {
                    const rect = dialog.getBoundingClientRect();
                    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
                }
            });
        });
        render();
    });
}
