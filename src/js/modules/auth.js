import { delegate } from './dom.js';
import { hide, slide } from './effects.js';

export class AuthController {
    constructor() {
        this.selectors = {
            auth: '.header__auth', toggler: '.header__auth-btn, .person-menu-toggler', menu: '.header__person-menu',
            closeBtn: '.person-menu__close', block: '.person-menu__block', blockCaption: '.person-menu__block-caption',
            blockList: '.person-menu__block-list', activeClass: 'active', visibleClass: 'visible', bodyClass: 'open-person-menu'
        };
        this.init();
    }

    init() {
        delegate(document, 'click', this.selectors.toggler, event => {
            event.preventDefault();
            event.stopPropagation();
            this.toggleMenu();
        });
        delegate(document, 'click', this.selectors.closeBtn, () => this.closeMenu());
        delegate(document, 'click', this.selectors.blockCaption, (event, caption) => this.toggleAccordion(caption.closest(this.selectors.block), caption));
        document.addEventListener('click', event => {
            if (!event.target.closest(this.selectors.auth) && !event.target.closest('.person-menu-toggler')) this.closeMenu();
        });
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape') this.closeMenu();
        });
    }

    toggleMenu() {
        const menu = document.querySelector(this.selectors.menu);
        if (!menu) return;
        const opening = !menu.classList.contains(this.selectors.visibleClass);
        if (opening) {
            window.CatalogController?.closeCatalog();
            window.SearchController?.closeSearch();
        }
        document.body.classList.toggle(this.selectors.bodyClass, opening);
        document.querySelectorAll(this.selectors.toggler).forEach(button => button.classList.toggle(this.selectors.activeClass, opening));
        menu.classList.toggle(this.selectors.visibleClass, opening);
    }

    closeMenu() {
        document.querySelectorAll(this.selectors.toggler).forEach(button => button.classList.remove(this.selectors.activeClass));
        document.querySelectorAll(this.selectors.menu).forEach(menu => menu.classList.remove(this.selectors.visibleClass));
        document.body.classList.remove(this.selectors.bodyClass);
        this.resetAccordions();
    }

    toggleAccordion(block, caption) {
        if (!block) return;
        const opening = !caption.classList.contains(this.selectors.activeClass);
        document.querySelectorAll(this.selectors.block).forEach(other => {
            if (other === block) return;
            other.querySelectorAll(this.selectors.blockCaption).forEach(title => title.classList.remove(this.selectors.activeClass));
            other.querySelectorAll(this.selectors.blockList).forEach(list => slide(list, false, 300));
        });
        caption.classList.toggle(this.selectors.activeClass, opening);
        block.querySelectorAll(this.selectors.blockList).forEach(list => slide(list, opening, 300));
    }

    resetAccordions() {
        document.querySelectorAll(this.selectors.blockCaption).forEach(caption => caption.classList.remove(this.selectors.activeClass));
        document.querySelectorAll(this.selectors.blockList).forEach(hide);
    }
}
