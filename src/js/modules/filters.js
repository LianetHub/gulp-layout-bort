import { slide } from './effects.js';

class BaseFilter {
    constructor(element) {
        this.el = element;
        this.trigger = element.querySelector('.filter-dropdown__trigger');
        this.text = element.querySelector('.filter-dropdown__text');
        this.icon = element.querySelector('.filter-dropdown__icon');
        this.body = element.querySelector('.filter-dropdown__body');
        this.defaultText = this.text?.dataset.default || '';
        this.isApplied = false;
        this.trigger?.addEventListener('click', event => {
            if (event.target.closest('.icon-cross')) {
                event.stopPropagation();
                this.reset();
            } else this.toggle();
        });
        element.querySelectorAll('.btn-apply').forEach(button => button.addEventListener('click', () => this.apply()));
        document.addEventListener('click', event => {
            if (!element.contains(event.target)) this.close();
        });
        element.closest('form')?.addEventListener('reset', () => setTimeout(() => this.reset(), 0));
    }

    toggle() {
        document.querySelectorAll('.filter-dropdown').forEach(other => {
            if (other === this.el) return;
            other.classList.remove('active');
            other.querySelectorAll('.filter-dropdown__body').forEach(body => slide(body, false, 200));
        });
        const opening = this.el.classList.toggle('active');
        slide(this.body, opening, 200);
    }

    close() {
        this.el.classList.remove('active');
        slide(this.body, false, 200);
    }

    apply() {
        if (this.hasValue()) {
            this.isApplied = true;
            this.updateView();
            this.icon?.classList.remove('icon-chevron-down');
            this.icon?.classList.add('icon-cross');
            this.el.classList.add('is-selected');
        } else this.reset();
        this.close();
    }

    reset() {
        this.clearInputs();
        this.isApplied = false;
        if (this.text) this.text.textContent = this.defaultText;
        this.icon?.classList.remove('icon-cross');
        this.icon?.classList.add('icon-chevron-down');
        this.el.classList.remove('is-selected');
        if (this.el.classList.contains('active')) this.close();
    }
}

class ChoiceFilter extends BaseFilter {
    get type() { return this.el.dataset.type === 'radio' ? 'radio' : 'checkbox'; }
    hasValue() { return Boolean(this.el.querySelector(`input[type="${this.type}"]:checked`)); }
    updateView() {
        const count = this.el.querySelectorAll(`input[type="${this.type}"]:checked`).length;
        if (this.text) this.text.textContent = `${this.defaultText} (${count})`;
    }
    clearInputs() { this.el.querySelectorAll(`input[type="${this.type}"]`).forEach(input => { input.checked = false; }); }
}

class RangeFilter extends BaseFilter {
    hasValue() {
        return ['min', 'max'].some(name => {
            const input = this.el.querySelector(`input[name*="${name}"]`);
            return input && input.value !== '';
        });
    }
    updateView() { if (this.text) this.text.textContent = this.defaultText; }
    clearInputs() { this.el.querySelectorAll('input[type="number"]').forEach(input => { input.value = ''; }); }
}

export function filters() {
    document.querySelectorAll('.filter-dropdown').forEach(element => {
        if (['radio', 'checkbox'].includes(element.dataset.type)) new ChoiceFilter(element);
        else if (element.dataset.type === 'range') new RangeFilter(element);
    });
}
