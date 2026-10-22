import { delegate } from './dom.js';

export class CatalogController {
    constructor() {
        this.selectors = {
            catalog: '.header-catalog', toggler: '.header-catalog__toggler', content: '.header-catalog__content',
            itemParent: '.header-catalog__item--parent', submenu: '.header-catalog__submenu',
            list: '.header-catalog__list', currentTitle: '.header-catalog__current',
            closeBtn: '.header-catalog__close', backBtn: '.header-catalog__back', moreBtn: '.header-catalog__more',
            activeClass: 'active', visibleClass: 'visible', openSubmenuClass: 'open-submenu',
            listSubmenuOpenClass: 'submenu-opened', bodyClass: 'open-catalog-menu'
        };
        this.defaultTitle = 'Каталог';
        this.init();
    }

    init() {
        delegate(document, 'click', this.selectors.toggler, event => {
            event.stopPropagation();
            this.toggleCatalog();
        });
        delegate(document, 'click', this.selectors.closeBtn, () => this.closeCatalog());
        delegate(document, 'click', this.selectors.backBtn, event => {
            event.preventDefault();
            this.goBack();
        });
        document.addEventListener('click', event => {
            if (!event.target.closest(this.selectors.catalog)) this.closeCatalog();
        });
        delegate(document, 'click', this.selectors.moreBtn, (event, button) => {
            event.preventDefault();
            event.stopPropagation();
            this.openSubmenu(button.closest(this.selectors.itemParent));
        });
        document.querySelectorAll(this.selectors.list).forEach(list => list.addEventListener('scroll', () => this.updateActiveSubmenuPosition(), { passive: true }));
        window.addEventListener('scroll', () => this.updateActiveSubmenuPosition(), { passive: true });
        delegate(document, 'mouseover', this.selectors.itemParent, (event, item) => {
            if (window.innerWidth >= 768 && !item.contains(event.relatedTarget)) this.openSubmenu(item);
        });
    }

    updateActiveSubmenuPosition() {
        const item = document.querySelector(`${this.selectors.itemParent}.${this.selectors.openSubmenuClass}`);
        if (item && window.innerWidth >= 768) this.positionSubmenu(item);
    }

    toggleCatalog() {
        const content = document.querySelector(this.selectors.content);
        if (!content) return;
        const opening = !content.classList.contains(this.selectors.visibleClass);
        if (opening) {
            window.SearchController?.closeSearch();
            window.AuthController?.closeMenu();
        }
        document.body.classList.toggle(this.selectors.bodyClass, opening);
        document.querySelectorAll(this.selectors.toggler).forEach(button => button.classList.toggle(this.selectors.activeClass, opening));
        content.classList.toggle(this.selectors.visibleClass, opening);
        if (!opening) this.resetToDefault();
    }

    openSubmenu(item) {
        if (!item) return;
        window.SearchController?.closeBar();
        document.querySelectorAll(this.selectors.itemParent).forEach(other => {
            if (other === item) return;
            other.classList.remove(this.selectors.openSubmenuClass);
            other.querySelectorAll(this.selectors.submenu).forEach(submenu => Object.assign(submenu.style, { top: '', bottom: '' }));
        });
        item.classList.add(this.selectors.openSubmenuClass);
        this.positionSubmenu(item);
        document.querySelectorAll(this.selectors.list).forEach(list => list.classList.add(this.selectors.listSubmenuOpenClass));
        document.querySelectorAll(this.selectors.currentTitle).forEach(title => { title.textContent = item.querySelector(':scope > .header-catalog__link')?.textContent.trim() || ''; });
    }

    positionSubmenu(item) {
        const submenu = item.querySelector(this.selectors.submenu);
        if (!submenu || window.innerWidth < 768) return;
        const rect = item.getBoundingClientRect();
        const height = submenu.getBoundingClientRect().height;
        let top = `${rect.top}px`;
        let bottom = 'auto';
        if (rect.top + height > window.innerHeight) {
            if (height < rect.bottom) {
                top = 'auto';
                bottom = `${window.innerHeight - rect.bottom}px`;
            } else top = `${Math.max(10, window.innerHeight - height - 10)}px`;
        }
        Object.assign(submenu.style, { position: 'fixed', top, bottom });
    }

    goBack() {
        if (document.querySelector(this.selectors.list)?.classList.contains(this.selectors.listSubmenuOpenClass)) this.resetToDefault();
        else this.closeCatalog();
    }

    resetToDefault() {
        document.querySelectorAll(this.selectors.itemParent).forEach(item => {
            item.classList.remove(this.selectors.openSubmenuClass);
            item.querySelectorAll(this.selectors.submenu).forEach(submenu => Object.assign(submenu.style, { top: '', bottom: '', position: '', left: '' }));
        });
        document.querySelectorAll(this.selectors.list).forEach(list => list.classList.remove(this.selectors.listSubmenuOpenClass));
        document.querySelectorAll(this.selectors.currentTitle).forEach(title => { title.textContent = this.defaultTitle; });
    }

    closeCatalog() {
        document.querySelectorAll(this.selectors.toggler).forEach(button => button.classList.remove(this.selectors.activeClass));
        document.querySelectorAll(this.selectors.content).forEach(content => content.classList.remove(this.selectors.visibleClass));
        document.body.classList.remove(this.selectors.bodyClass);
        this.resetToDefault();
    }
}
