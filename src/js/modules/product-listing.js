export function productListing() {
    const root = document.querySelector('.product-listing');
    if (!root) return;
    const form = root.querySelector('.listing-filter');
    const overlay = root.querySelector('.listing-filter-overlay');
    const opener = root.querySelector('.product-listing__filter-button');
    const grid = root.querySelector('.product-listing__products');
    const items = Array.from(grid.children);
    const selected = root.querySelector('.product-listing__selected');
    const more = root.querySelector('.product-listing__more');
    const pagination = root.querySelector('.product-listing__pagination');
    const sort = root.querySelector('.product-listing__sort');
    const getPageSize = () => window.innerWidth < 576 ? 4 : window.innerWidth < 1200 ? 9 : 12;
    let pageSize = getPageSize();
    let page = 1;
    let visibleLimit = pageSize;
    let previousOverflow = '';
    let applied = new FormData(form);
    let activeTag = 'Промышленные';

    function closeFilter() {
        if (!form.classList.contains('is-open')) return;
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
    document.addEventListener('keydown', event => {
        if (!form.classList.contains('is-open')) return;
        if (event.key === 'Escape') closeFilter();
        if (event.key !== 'Tab') return;
        const focusable = Array.from(form.querySelectorAll('a, button, input, summary')).filter(element => element.getClientRects().length);
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
    window.matchMedia('(min-width: 1199.98px)').addEventListener('change', event => { if (event.matches) closeFilter(); });
    window.addEventListener('resize', () => {
        if (getPageSize() === pageSize) return;
        pageSize = getPageSize();
        page = 1;
        visibleLimit = pageSize;
        render();
    });

    function matches(item) {
        const data = item.dataset;
        const price = Number(data.price);
        if (activeTag && !data.tags.split('|').includes(activeTag)) return false;
        if (applied.get('min_price') && price < Number(applied.get('min_price'))) return false;
        if (applied.get('max_price') && price > Number(applied.get('max_price'))) return false;
        if (applied.has('stock') && data.stock !== 'true') return false;
        const choices = ['power', 'motor', 'control', 'quiet', 'auto_off', 'insulation', 'reverse', 'booster', 'material', 'silent'];
        if (!choices.every(name => !applied.getAll(name).length || applied.getAll(name).includes(data[name]))) return false;
        return ['speed', 'volume', 'performance', 'noise', 'stages', 'cable', 'sink', 'size', 'weight'].every(name => {
            const min = applied.get(`min_${name}`);
            const max = applied.get(`max_${name}`);
            return (!min || Number(data[name]) >= Number(min)) && (!max || Number(data[name]) <= Number(max));
        });
    }

    function renderChips() {
        selected.replaceChildren();
        const addChip = (text, names, value) => {
            const chip = document.createElement('button');
            chip.type = 'button';
            chip.className = 'product-listing__chip icon-cancel-circle';
            chip.textContent = text;
            chip.setAttribute('aria-label', `Удалить фильтр: ${text}`);
            chip.addEventListener('click', () => {
                names.forEach(name => {
                    Array.from(form.elements).filter(input => input.name === name && (value === undefined || input.value === value)).forEach(input => {
                        if (input.type === 'checkbox') input.checked = false;
                        else input.value = '';
                    });
                });
                apply();
            });
            selected.append(chip);
        };
        if (applied.get('min_price') || applied.get('max_price')) addChip(`Цена: от ${applied.get('min_price') || '0'} до ${applied.get('max_price') || '∞'} ₽`, ['min_price', 'max_price']);
        ['power', 'motor', 'control', 'quiet', 'auto_off', 'insulation', 'reverse', 'booster', 'material', 'silent'].forEach(name => applied.getAll(name).forEach(value => {
            const input = Array.from(form.elements).find(element => element.name === name && element.value === value);
            const caption = input.closest('details').querySelector('summary').textContent.trim();
            addChip(name === 'power' ? `Мощность: ${value} Вт` : `${caption}: ${input.closest('label').textContent.trim()}`, [name], value);
        }));
        ['speed', 'volume', 'performance', 'noise', 'stages', 'cable', 'sink', 'size', 'weight'].forEach(name => {
            if (!applied.get(`min_${name}`) && !applied.get(`max_${name}`)) return;
            const input = Array.from(form.elements).find(element => element.name === `min_${name}`);
            addChip(`${input.closest('details').querySelector('summary').textContent.trim()}: ${applied.get(`min_${name}`) || '0'}–${applied.get(`max_${name}`) || '∞'}`, [`min_${name}`, `max_${name}`]);
        });
        if (applied.has('stock')) addChip('В наличии', ['stock']);
        if (selected.children.length) {
            const clear = document.createElement('button');
            clear.type = 'button';
            clear.className = 'product-listing__clear icon-cancel-circle';
            clear.textContent = 'Очистить все';
            clear.addEventListener('click', () => form.reset());
            selected.append(clear);
        }
        selected.hidden = !selected.children.length;
    }

    function render() {
        const filtered = items.filter(matches);
        filtered.sort((a, b) => {
            if (sort.value === 'price-asc') return Number(a.dataset.price) - Number(b.dataset.price);
            if (sort.value === 'price-desc') return Number(b.dataset.price) - Number(a.dataset.price);
            if (sort.value === 'name') return a.querySelector('.product__name').textContent.localeCompare(b.querySelector('.product__name').textContent, 'ru');
            return Number(a.dataset.order) - Number(b.dataset.order);
        });
        items.forEach(item => { item.hidden = true; });
        filtered.forEach((item, index) => {
            grid.append(item);
            item.hidden = index < (page - 1) * pageSize || index >= visibleLimit;
        });
        root.querySelector('.product-listing__count').textContent = `${filtered.length} ${filtered.length % 10 === 1 && filtered.length % 100 !== 11 ? 'товар' : filtered.length % 10 >= 2 && filtered.length % 10 <= 4 && (filtered.length % 100 < 12 || filtered.length % 100 > 14) ? 'товара' : 'товаров'}`;
        root.querySelector('.product-listing__empty').hidden = filtered.length > 0;
        more.hidden = visibleLimit >= filtered.length;
        const pages = Math.ceil(filtered.length / pageSize);
        pagination.hidden = pages < 2;
        pagination.replaceChildren();
        const pageButtons = [1, 2, 3, pages].filter((number, index, list) => number <= pages && list.indexOf(number) === index);
        if (page > 3 && page < pages) pageButtons.splice(3, 0, page);
        ['prev', ...pageButtons, 'next'].forEach(value => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'product-listing__page';
            button.dataset.page = String(value);
            if (typeof value === 'number') button.textContent = value;
            else {
                button.classList.add(value === 'prev' ? 'icon-chevron-left' : 'icon-chevron-right');
                button.setAttribute('aria-label', value === 'prev' ? 'Предыдущая страница' : 'Следующая страница');
            }
            pagination.append(button);
            const number = Number(button.dataset.page);
            if (number) {
                button.hidden = number > pages;
                button.classList.toggle('is-active', number === page);
                if (number === page) button.setAttribute('aria-current', 'page');
                else button.removeAttribute('aria-current');
            } else button.disabled = button.dataset.page === 'prev' ? page === 1 : page >= pages;
        });
        renderChips();
    }

    function apply() {
        applied = new FormData(form);
        page = 1;
        visibleLimit = pageSize;
        render();
    }

    form.addEventListener('submit', event => {
        event.preventDefault();
        if (!form.reportValidity()) return;
        Array.from(form.elements).filter(input => input.name?.startsWith('min_')).forEach(min => {
            const max = form.elements.namedItem(min.name.replace('min_', 'max_'));
            if (max && min.value && max.value && Number(min.value) > Number(max.value)) [min.value, max.value] = [max.value, min.value];
        });
        apply();
        closeFilter();
    });
    form.addEventListener('reset', () => setTimeout(apply, 0));
    sort.addEventListener('change', () => { page = 1; visibleLimit = pageSize; render(); });
    more.addEventListener('click', () => { visibleLimit += pageSize; render(); });
    pagination.addEventListener('click', event => {
        const button = event.target.closest('[data-page]');
        if (!button || button.disabled) return;
        page = button.dataset.page === 'prev' ? page - 1 : button.dataset.page === 'next' ? page + 1 : Number(button.dataset.page);
        visibleLimit = page * pageSize;
        render();
        root.querySelector('.product-listing__toolbar').scrollIntoView({ block: 'start' });
    });
    form.querySelector('.listing-filter__expand').addEventListener('click', event => {
        const button = event.currentTarget;
        const extra = form.querySelector('.listing-filter__extra');
        extra.hidden = !extra.hidden;
        button.textContent = extra.hidden ? 'Показать еще' : 'Скрыть';
        button.setAttribute('aria-expanded', String(!extra.hidden));
    });
    root.querySelectorAll('.product-listing__tag:not(.product-listing__tag--more)').forEach(button => button.addEventListener('click', () => {
        root.querySelectorAll('.product-listing__tag').forEach(tag => { tag.classList.remove('is-active'); tag.setAttribute('aria-pressed', 'false'); });
        button.classList.add('is-active');
        button.setAttribute('aria-pressed', 'true');
        activeTag = button.textContent.trim();
        page = 1;
        visibleLimit = pageSize;
        render();
    }));
    root.querySelector('.product-listing__tag--more').addEventListener('click', event => {
        const button = event.currentTarget;
        const expanded = button.getAttribute('aria-expanded') !== 'true';
        root.querySelector('.product-listing__tags').classList.toggle('is-expanded', expanded);
        button.setAttribute('aria-expanded', String(expanded));
        button.textContent = expanded ? 'Скрыть' : 'Показать еще';
    });
    render();
}
