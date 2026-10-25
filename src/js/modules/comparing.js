export function comparisonRows(rows, activeIds, mode = 'all') {
    return rows.map(row => {
        const values = activeIds.map(index => row.values[index] ?? '—');
        const different = new Set(values).size > 1;
        return { ...row, visible: mode === 'all' || (mode === 'different' ? different : !different) };
    });
}

export function comparing() {
    document.querySelectorAll('.comparing').forEach(root => {
        if (root.dataset.initialized || typeof Swiper === 'undefined') return;
        root.dataset.initialized = 'true';
        const body = root.querySelector('.comparing__body');
        const panel = root.querySelector('.comparing__panel');
        const anchor = root.querySelector('.comparing__anchor');
        const empty = root.querySelector('.comparing__empty');
        const important = root.querySelector('.comparing__important-rows');
        const rowElements = [...root.querySelectorAll('.comparing__content .comparing__block')];
        const rows = rowElements.map(element => ({
            element, key: element.dataset.parameter, values: JSON.parse(element.dataset.values)
        }));
        const items = [...root.querySelector('[data-compare-column="desktop"] .swiper-wrapper').children];
        const ids = items.map(item => item.dataset.compareId);
        const activeIds = ids.map((id, index) => index);
        const desktopQuery = window.matchMedia('(min-width: 1199.98px)');
        let mode = 'all';
        let category = 'disposers';
        let frame = 0;
        let naturalHeight = 0;
        let desktop;
        const columns = [];

        function updateRows() {
            const selected = desktopQuery.matches
                ? activeIds
                : columns.map(swiper => activeIds[swiper.activeIndex]).filter(index => index !== undefined);
            comparisonRows(rows, selected, mode).forEach(({ element, visible, values }) => {
                element.hidden = !visible;
                const cells = [...element.querySelectorAll('.comparing__value')];
                cells.forEach((cell, index) => {
                    cell.hidden = index >= selected.length;
                    cell.textContent = values[selected[index]] ?? '—';
                });
            });
            important.replaceChildren();
            rows.forEach(({ element }) => {
                if (!element.querySelector('.comparing__check').checked || element.hidden) return;
                important.append(element.cloneNode(true));
            });
        }

        function updateSticky() {
            frame = 0;
            if (body.hidden) {
                panel.classList.remove('is-stuck');
                anchor.style.height = '';
                return;
            }
            const top = anchor.getBoundingClientRect().top;
            const bottom = root.querySelector('.comparing__desc').getBoundingClientRect().bottom;
            const stuck = top <= 0 && bottom > panel.getBoundingClientRect().height + 30;
            if (!panel.classList.contains('is-stuck')) naturalHeight = panel.offsetHeight;
            anchor.style.height = stuck ? naturalHeight + 'px' : '';
            panel.classList.toggle('is-stuck', stuck);
        }

        function requestSticky() {
            if (!frame) frame = requestAnimationFrame(updateSticky);
        }

        root.querySelectorAll('[data-compare-column]').forEach(column => {
            const isDesktop = column.dataset.compareColumn === 'desktop';
            const swiper = new Swiper(column.querySelector('.swiper'), {
                speed: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 300,
                slidesPerView: isDesktop ? 'auto' : 1,
                spaceBetween: 20,
                initialSlide: column.dataset.compareColumn === '1' ? 1 : 0,
                rewind: true,
                watchOverflow: true,
                navigation: { prevEl: column.querySelector('.swiper-button-prev'), nextEl: column.querySelector('.swiper-button-next') },
                pagination: {
                    el: column.querySelector('.swiper-pagination'), type: 'fraction',
                    renderFraction: (current, total) => '<span class="' + current + '"></span> из <span class="' + total + '"></span>'
                },
                on: {
                    slideChange() { updateRows(); },
                    resize() { requestSticky(); },
                    setTranslate() {
                        if (isDesktop) root.style.setProperty('--comparing-shift', this.translate + 'px');
                    }
                }
            });
            if (isDesktop) desktop = swiper;
            else columns.push(swiper);
        });

        function setFilter(value) {
            mode = value;
            root.querySelectorAll('[name="compare-filter"]').forEach(input => { input.checked = input.value === mode; });
            root.querySelector('[data-mobile-differences]').checked = mode === 'different';
            updateRows();
            requestSticky();
        }

        function updateEmpty() {
            const noItems = category !== 'disposers' || activeIds.length === 0;
            body.hidden = noItems;
            empty.hidden = !noItems;
            root.querySelector('[data-compare-category="disposers"] .comparing__count').textContent = activeIds.length;
            requestSticky();
        }

        root.addEventListener('change', event => {
            if (event.target.matches('[name="compare-filter"]')) setFilter(event.target.value);
            if (event.target.matches('[data-mobile-differences]')) setFilter(event.target.checked ? 'different' : 'all');
            if (event.target.matches('[data-important]')) {
                const key = event.target.dataset.important;
                const row = rows.find(item => item.key === key);
                row.element.querySelector('.comparing__check').checked = event.target.checked;
                updateRows();
                requestSticky();
            }
        });

        root.addEventListener('click', event => {
            const favorite = event.target.closest('.favorite-btn');
            if (favorite) queueMicrotask(() => {
                const id = favorite.closest('[data-compare-id]').dataset.compareId;
                const active = favorite.classList.contains('active');
                root.querySelectorAll('[data-compare-id]').forEach(item => {
                    if (item.dataset.compareId !== id) return;
                    const button = item.querySelector('.favorite-btn');
                    button.classList.toggle('active', active);
                    button.setAttribute('aria-pressed', String(active));
                });
            });
            const remove = event.target.closest('[data-compare-remove]');
            const clear = event.target.closest('[data-compare-clear]');
            const tab = event.target.closest('[data-compare-category]');
            if (tab) {
                category = tab.dataset.compareCategory;
                root.querySelectorAll('[data-compare-category]').forEach(item => {
                    item.classList.toggle('is-active', item === tab);
                    item.setAttribute('aria-pressed', String(item === tab));
                });
                updateEmpty();
            }
            if (!remove && !clear) return;
            const removed = remove ? remove.closest('[data-compare-id]').dataset.compareId : null;
            const index = removed ? activeIds.findIndex(original => ids[original] === removed) : -1;
            const slideIndexes = clear ? activeIds.map((id, position) => position) : [index];
            if (clear) activeIds.length = 0;
            else if (index >= 0) activeIds.splice(index, 1);
            [desktop, ...columns].forEach(swiper => {
                swiper.removeSlide(slideIndexes);
                swiper.update();
            });
            if (clear?.dataset.compareClear === 'all') {
                root.querySelectorAll('.comparing__count').forEach(count => { count.textContent = '0'; });
            }
            updateRows();
            updateEmpty();
            root.querySelector('.comparing__status').textContent = remove ? 'Товар удалён из сравнения' : 'Сравнение очищено';
            if (remove) {
                const next = root.querySelector('[data-compare-column="' + (desktopQuery.matches ? 'desktop' : '0') + '"] .swiper-slide-active [data-compare-remove]');
                (body.hidden ? root.querySelector('.comparing__catalog') : next)?.focus();
            }
        });

        window.addEventListener('scroll', requestSticky, { passive: true });
        window.addEventListener('resize', () => {
            panel.classList.remove('is-stuck');
            anchor.style.height = '';
            naturalHeight = panel.offsetHeight;
            updateRows();
            requestSticky();
        });
        if (typeof ResizeObserver !== 'undefined') {
            new ResizeObserver(requestSticky).observe(root.querySelector('.comparing__desc'));
        }
        updateRows();
        updateEmpty();
    });
}

