export function mobileCatalog({ closeNavigation }) {
    const catalog = document.querySelector('.mobile-catalog');
    const trigger = document.querySelector('.main-actions__item.icon-dots-grid');
    const desktopTrigger = document.querySelector('.header__catalog');

    if (!catalog || !trigger) {
        return;
    }

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
    let activeTrigger = trigger;
    let locked = false;
    let mobileLayout = media.matches;
    const triggers = [trigger, desktopTrigger].filter(Boolean);

    function position() {
        if (media.matches || catalog.hidden) {
            return;
        }

        const rect = activeTrigger.getBoundingClientRect();

        catalog.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - 302))}px`;
        catalog.style.top = `${rect.bottom + 8}px`;
        catalog.style.maxHeight = `${Math.max(0, window.innerHeight - rect.bottom - 16)}px`;
    }

    function render() {
        const current = stack[stack.length - 1];
        const nested = stack.length > 1;

        panels.forEach((panel) => {
            panel.hidden = panel !== current.panel;
        });
        catalog.classList.toggle('mobile-catalog--nested', nested);
        title.textContent = current.panel.dataset.catalogTitle;
        title.classList.toggle('title-md', !nested);
        title.classList.toggle('title-sm', nested);
        back.hidden = !nested;
        closeButton.hidden = nested;
        back.setAttribute(
            'aria-label',
            nested
                ? `Назад: ${stack[stack.length - 2].panel.dataset.catalogTitle}`
                : 'Назад в каталог',
        );
        body.scrollTop = current.scroll;
    }

    function close(restoreFocus = false) {
        if (catalog.hidden) {
            return;
        }

        catalog.hidden = true;
        triggers.forEach((button) => button.setAttribute('aria-expanded', 'false'));
        catalog
            .querySelectorAll('[data-catalog-target]')
            .forEach((button) => button.setAttribute('aria-expanded', 'false'));
        inertElements.forEach((element) => {
            element.inert = false;
        });
        inertElements = [];
        document.body.classList.remove('open-mobile-catalog');
        if (locked) {
            document.body.style.top = previousBodyTop;
            window.scrollTo({ top: pageScroll, behavior: 'instant' });
        }
        locked = false;
        catalog.style.removeProperty('left');
        catalog.style.removeProperty('top');
        catalog.style.removeProperty('max-height');
        stack = [];
        if (restoreFocus) {
            activeTrigger.focus({ preventScroll: true });
        }
    }

    function open() {
        closeNavigation();
        window.SearchController?.closeSearch();
        pageScroll = window.scrollY;
        previousBodyTop = document.body.style.top;
        stack = [
            {
                panel: root,
                scroll: 0,
                opener: null,
            },
        ];
        render();
        locked = media.matches;
        if (locked) {
            document.body.style.top = `${-pageScroll}px`;
            document.body.classList.add('open-mobile-catalog');
        }
        catalog.hidden = false;
        triggers.forEach((button) => button.setAttribute('aria-expanded', 'true'));
        // Leave the fixed bottom navigation available while blocking the covered page.
        inertElements = (
            locked
                ? [
                      ...document.querySelectorAll(
                          '.header__content-container > :not(.main-actions), .header__bottom, main, footer, .arrow-top',
                      ),
                  ]
                : []
        ).filter((element) => !element.inert);
        inertElements.forEach((element) => {
            element.inert = true;
        });
        position();
        (media.matches ? closeButton : root.querySelector('button, a')).focus({
            preventScroll: true,
        });
    }

    triggers.forEach((button) =>
        button.addEventListener('click', (event) => {
            event.preventDefault();
            activeTrigger = button;
            if (catalog.hidden) {
                open();
            } else {
                close(true);
            }
        }),
    );
    document.addEventListener('click', (event) => {
        if (
            !catalog.hidden &&
            !media.matches &&
            !catalog.contains(event.target) &&
            !triggers.some((button) => button.contains(event.target))
        ) {
            close();
        }
    });
    window.addEventListener('resize', () => {
        const nextMobileLayout = window.innerWidth < 768;

        if (nextMobileLayout !== mobileLayout) {
            mobileLayout = nextMobileLayout;
            close();
        } else {
            position();
        }
    });
    window.addEventListener(
        'scroll',
        () => {
            if (!media.matches) {
                close();
            }
        },
        { passive: true },
    );

    catalog.addEventListener('click', (event) => {
        const button = event.target.closest('[data-catalog-target]');

        if (button) {
            const panel = panels.find((item) => item.id === button.dataset.catalogTarget);

            if (!panel || stack.some((item) => item.panel === panel)) {
                return;
            }

            stack[stack.length - 1].scroll = body.scrollTop;
            button.setAttribute('aria-expanded', 'true');
            stack.push({
                panel,
                scroll: 0,
                opener: button,
            });
            render();
            title.focus({ preventScroll: true });
        } else if (event.target.closest('a')) {
            close();
        }
    });

    back.addEventListener('click', () => {
        if (stack.length < 2) {
            return;
        }

        const previous = stack.pop();

        previous.opener.setAttribute('aria-expanded', 'false');
        render();
        previous.opener.focus({ preventScroll: true });
    });
    closeButton.addEventListener('click', () => close(true));
    actions?.addEventListener('click', (event) => {
        if (event.target.closest('.main-actions__item') !== trigger) {
            close();
        }
    });
    media.addEventListener('change', () => close());
    window.addEventListener('pagehide', () => close());
    document.addEventListener('keydown', (event) => {
        if (catalog.hidden) {
            return;
        }

        if (event.key === 'Escape') {
            event.preventDefault();
            close(true);
        } else if (event.key === 'Tab') {
            if (!media.matches) {
                return;
            }

            const focusable = [
                ...catalog.querySelectorAll('button, a'),
                ...actions.querySelectorAll('a, button'),
            ].filter((element) => !element.closest('[hidden]') && !element.disabled);
            const first = focusable[0];
            const last = focusable[focusable.length - 1];

            if (
                event.shiftKey &&
                (document.activeElement === first || document.activeElement === title)
            ) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        }
    });
}
