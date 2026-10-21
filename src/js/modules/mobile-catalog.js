export function mobileCatalog({ closeNavigation }) {
    const catalog = document.querySelector('.mobile-catalog');
    const trigger = document.querySelector('.main-actions__item.icon-dots-grid');
    if (!catalog || !trigger) return;

    const media = window.matchMedia('(max-width: 767.97px)');
    const panels = [...catalog.querySelectorAll('.mobile-catalog__panel')];
    const root = catalog.querySelector('#catalog-root');
    const body = catalog.querySelector('.mobile-catalog__body');
    const title = catalog.querySelector('.mobile-catalog__title');
    const back = catalog.querySelector('.mobile-catalog__back');
    const closeButton = catalog.querySelector('.mobile-catalog__close');
    const actions = document.querySelector('.main-actions');
    let stack = [];
    let pageScroll = 0;
    let previousBodyTop = '';
    let inertElements = [];

    function render() {
        const current = stack[stack.length - 1];
        const nested = stack.length > 1;
        panels.forEach(panel => { panel.hidden = panel !== current.panel; });
        catalog.classList.toggle('mobile-catalog--nested', nested);
        title.textContent = current.panel.dataset.catalogTitle;
        title.classList.toggle('title--catalog', !nested);
        title.classList.toggle('title--catalog-category', nested);
        back.hidden = !nested;
        closeButton.hidden = nested;
        back.setAttribute('aria-label', nested ? `Назад: ${stack[stack.length - 2].panel.dataset.catalogTitle}` : 'Назад в каталог');
        body.scrollTop = current.scroll;
    }

    function close(restoreFocus = false) {
        if (catalog.hidden) return;
        catalog.hidden = true;
        trigger.setAttribute('aria-expanded', 'false');
        catalog.querySelectorAll('[data-catalog-target]').forEach(button => button.setAttribute('aria-expanded', 'false'));
        inertElements.forEach(element => { element.inert = false; });
        inertElements = [];
        document.body.classList.remove('open-mobile-catalog');
        document.body.style.top = previousBodyTop;
        window.scrollTo({ top: pageScroll, behavior: 'instant' });
        stack = [];
        if (restoreFocus && media.matches) trigger.focus({ preventScroll: true });
    }

    function open() {
        closeNavigation();
        window.SearchController?.closeSearch();
        window.CatalogController?.closeCatalog();
        window.AuthController?.closeMenu();
        pageScroll = window.scrollY;
        previousBodyTop = document.body.style.top;
        stack = [{ panel: root, scroll: 0, opener: null }];
        render();
        document.body.style.top = `${-pageScroll}px`;
        document.body.classList.add('open-mobile-catalog');
        catalog.hidden = false;
        trigger.setAttribute('aria-expanded', 'true');
        // Leave the fixed bottom navigation available while blocking the covered page.
        inertElements = [...document.querySelectorAll('.header__content-container > :not(.main-actions), .header__bottom, main, footer, .arrow-top')]
            .filter(element => !element.inert);
        inertElements.forEach(element => { element.inert = true; });
        closeButton.focus({ preventScroll: true });
    }

    trigger.addEventListener('click', event => {
        if (!media.matches) return;
        event.preventDefault();
        if (catalog.hidden) open();
        else close(true);
    });

    catalog.addEventListener('click', event => {
        const button = event.target.closest('[data-catalog-target]');
        if (button) {
            const panel = panels.find(item => item.id === button.dataset.catalogTarget);
            if (!panel || stack.some(item => item.panel === panel)) return;
            stack[stack.length - 1].scroll = body.scrollTop;
            button.setAttribute('aria-expanded', 'true');
            stack.push({ panel, scroll: 0, opener: button });
            render();
            title.focus({ preventScroll: true });
        } else if (event.target.closest('a')) {
            close();
        }
    });

    back.addEventListener('click', () => {
        if (stack.length < 2) return;
        const previous = stack.pop();
        previous.opener.setAttribute('aria-expanded', 'false');
        render();
        previous.opener.focus({ preventScroll: true });
    });
    closeButton.addEventListener('click', () => close(true));
    actions?.addEventListener('click', event => {
        if (event.target.closest('.main-actions__item') !== trigger) close();
    });
    media.addEventListener('change', () => close());
    window.addEventListener('pagehide', () => close());
    document.addEventListener('keydown', event => {
        if (catalog.hidden) return;
        if (event.key === 'Escape') {
            event.preventDefault();
            close(true);
        } else if (event.key === 'Tab') {
            const focusable = [...catalog.querySelectorAll('button, a'), ...actions.querySelectorAll('a, button')]
                .filter(element => !element.closest('[hidden]') && !element.disabled);
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && (document.activeElement === first || document.activeElement === title)) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        }
    });
}
