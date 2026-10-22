import { delegate, isVisible } from './dom.js';
import { mobileCatalog } from './mobile-catalog.js';

export function header() {
    const burger = document.querySelector('.header__burger');
    const navigation = document.querySelector('#header-menu');
    const backdrop = document.querySelector('.header__backdrop');
    const closeNavigation = (restoreFocus = false) => {
        const wasOpen = navigation?.classList.contains('is-open');
        navigation?.classList.remove('is-open');
        if (backdrop) backdrop.hidden = true;
        document.body.classList.remove('open-navigation');
        if (burger) {
            burger.setAttribute('aria-expanded', 'false');
            burger.setAttribute('aria-label', 'Открыть меню');
            burger.classList.remove('icon-close');
            burger.classList.add('icon-menu');
            if (wasOpen && restoreFocus) burger.focus();
        }
    };
    burger?.addEventListener('click', () => {
        if (!navigation) return;
        if (navigation.classList.contains('is-open')) return closeNavigation();
        window.SearchController?.closeSearch();
        window.CatalogController?.closeCatalog();
        window.AuthController?.closeMenu();
        navigation.classList.add('is-open');
        if (backdrop) backdrop.hidden = false;
        document.body.classList.add('open-navigation');
        burger.setAttribute('aria-expanded', 'true');
        burger.setAttribute('aria-label', 'Закрыть меню');
        burger.classList.replace('icon-menu', 'icon-close');
    });
    backdrop?.addEventListener('click', () => closeNavigation(true));
    delegate(document, 'click', '.header__bottom .menu__link, .main-actions__item, .search__toggler', () => closeNavigation());
    document.addEventListener('keydown', event => {
        if (!navigation?.classList.contains('is-open')) return;
        if (event.key === 'Escape') closeNavigation(true);
        if (event.key !== 'Tab') return;
        const items = [...document.querySelectorAll('.header__content a, .header__content button, .header__content input, .header__bottom a, .header__bottom button, .header__bottom input')].filter(isVisible);
        const first = items[0];
        const last = items[items.length - 1];
        if (first && event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (last && !event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    });
    window.matchMedia('(max-width: 767.97px)').addEventListener('change', () => closeNavigation());
    mobileCatalog({ closeNavigation });
    const element = document.querySelector('.header');
    if (element) window.addEventListener('scroll', () => {
        if (window.scrollY > 100) element.classList.add('scroll');
        else if (window.scrollY <= 10) element.classList.remove('scroll');
    }, { passive: true });
    return { closeNavigation };
}
