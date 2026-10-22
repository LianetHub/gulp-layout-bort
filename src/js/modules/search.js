import { delegate } from './dom.js';

export class SearchController {
    constructor({ closeNavigation }) {
        this.closeNavigation = closeNavigation;
        this.selectors = {
            search: '.search', content: '.search__content', input: '.search__form-input',
            toggler: '.search__toggler', bar: '.search__bar', activeClass: 'active', visibleClass: 'visible'
        };
        this.init();
    }

    init() {
        delegate(document, 'click', this.selectors.toggler, event => {
            event.stopPropagation();
            this.toggleSearch();
        });
        for (const type of ['input', 'focusin', 'click']) {
            delegate(document, type, this.selectors.input, (event, input) => this.handleInput(input));
        }
        document.addEventListener('click', event => {
            if (!event.target.closest(this.selectors.search)) this.closeSearch();
        });
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape') this.closeSearch(true);
        });
        delegate(document, 'click', '.search__clear', (event, button) => {
            const input = button.closest(this.selectors.search)?.querySelector(this.selectors.input);
            if (!input) return;
            input.value = '';
            this.handleInput(input);
            input.focus();
        });
        delegate(document, 'submit', '.search__form', (event, form) => {
            const input = form.querySelector(this.selectors.input);
            if (!input) return;
            input.value = input.value.trim();
            if (!input.value) {
                event.preventDefault();
                input.focus();
            }
        });
        delegate(document, 'keydown', this.selectors.input, (event, input) => {
            if (event.key !== 'ArrowDown') return;
            const bar = input.closest(this.selectors.search)?.querySelector(this.selectors.bar);
            if (bar && !bar.hidden) {
                event.preventDefault();
                bar.querySelector('a')?.focus();
            }
        });
        window.matchMedia('(max-width: 767.97px)').addEventListener('change', () => this.closeSearch());
    }

    toggleSearch() {
        const content = document.querySelector(this.selectors.content);
        if (!content) return;
        const opening = !content.classList.contains(this.selectors.activeClass);
        if (opening) {
            this.closeNavigation();
            window.CatalogController?.closeCatalog();
        }
        document.querySelectorAll(this.selectors.toggler).forEach(button => {
            button.classList.toggle(this.selectors.activeClass, opening);
            button.setAttribute('aria-expanded', String(opening));
        });
        content.classList.toggle(this.selectors.activeClass, opening);
        if (opening) document.querySelector(this.selectors.input)?.focus();
        else this.closeBar();
    }

    handleInput(input) {
        const search = input.closest(this.selectors.search);
        if (!search) return;
        const query = input.value.trim();
        search.querySelectorAll('.search__clear').forEach(button => { button.hidden = !query.length; });
        search.querySelectorAll('.search__all').forEach(link => link.setAttribute('href', `search.html?s=${encodeURIComponent(query)}`));
        const bar = search.querySelector(this.selectors.bar);
        if (query.length) this.openBar(bar);
        else this.closeBar(bar);
    }

    openBar(bar) {
        if (!bar) return;
        bar.hidden = false;
        bar.classList.add(this.selectors.visibleClass);
        bar.closest(this.selectors.search)?.querySelectorAll(this.selectors.input).forEach(input => input.setAttribute('aria-expanded', 'true'));
    }

    closeBar(bar) {
        const bars = bar ? [bar] : document.querySelectorAll(this.selectors.bar);
        bars.forEach(element => {
            element.hidden = true;
            element.classList.remove(this.selectors.visibleClass);
            element.closest(this.selectors.search)?.querySelectorAll(this.selectors.input).forEach(input => input.setAttribute('aria-expanded', 'false'));
        });
    }

    closeSearch(restoreFocus = false) {
        const wasOpen = document.querySelector(this.selectors.content)?.classList.contains(this.selectors.activeClass);
        document.querySelectorAll(this.selectors.toggler).forEach(button => {
            button.classList.remove(this.selectors.activeClass);
            button.setAttribute('aria-expanded', 'false');
        });
        document.querySelectorAll(this.selectors.content).forEach(content => content.classList.remove(this.selectors.activeClass));
        this.closeBar();
        if (restoreFocus && wasOpen) document.querySelector(this.selectors.toggler)?.focus();
    }
}
