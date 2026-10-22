import { delegate } from './dom.js';
import { show, hide } from './effects.js';

export class FormController {
    constructor() {
        this.selectors = {
            field: '.form__field', control: '.form__control', errorClass: '_error',
            errorMsg: '.form__error-message', requiredAttr: '[data-required]', submitBtn: '[type="submit"]'
        };
        this.messages = {
            empty: 'Поле обязательно для заполнения', tel: 'Введите корректный номер телефона',
            email: 'Введите корректный e-mail', checkbox: 'Необходимо ваше согласие'
        };
        this.init();
    }

    init() {
        delegate(document, 'submit', 'form', event => this.handleSubmit(event));
        for (const type of ['input', 'change']) {
            delegate(document, type, this.selectors.requiredAttr, (event, field) => {
                if (field.classList.contains(this.selectors.errorClass) || field.closest(this.selectors.field)?.classList.contains(this.selectors.errorClass)) this.validateField(field);
            });
        }
        delegate(document, 'keydown', 'input[type="tel"]', event => this.onPhoneKeyDown(event));
        delegate(document, 'input', 'input[type="tel"]', event => this.onPhoneInput(event));
        delegate(document, 'paste', 'input[type="tel"]', event => this.onPhonePaste(event));
        delegate(document, 'focusin', 'input[type="tel"]', (event, input) => {
            if (!input.value) input.value = '+7 ';
        });
    }

    handleSubmit(event) {
        if (this.validateForm(event.target)) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        return false;
    }

    validateForm(form) {
        let valid = true;
        form.querySelectorAll(this.selectors.requiredAttr).forEach(field => {
            if (!this.validateField(field)) valid = false;
        });
        return valid;
    }

    validateField(field) {
        const value = String(field.value ?? '').trim();
        let error = false;
        let message = this.messages.empty;
        if (field.type === 'tel') {
            error = value.replace(/\D/g, '').length < 11;
            message = this.messages.tel;
        } else if (field.type === 'email') {
            error = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
            message = this.messages.email;
        } else if (field.type === 'checkbox' || field.type === 'radio') {
            error = !field.checked;
            message = this.messages.checkbox;
        } else error = value === '';
        this.toggleErrorState(field, error, message);
        return !error;
    }

    toggleErrorState(field, error, message) {
        const parent = field.closest(this.selectors.field);
        (parent || field).classList.toggle(this.selectors.errorClass, error);
        field.classList.toggle(this.selectors.errorClass, error);
        parent?.querySelectorAll(this.selectors.errorMsg).forEach(label => {
            if (error) {
                label.textContent = message;
                show(label);
            } else hide(label);
        });
    }

    onPhoneInput(event) {
        const input = event.target;
        let numbers = input.value.replace(/\D/g, '');
        if (!numbers) {
            input.value = '';
            return;
        }
        if (input.value.length !== input.selectionStart) {
            if (event.data && /\D/.test(event.data)) input.value = numbers;
            return;
        }
        let formatted;
        if (['7', '8', '9'].includes(numbers[0])) {
            if (numbers[0] === '9') numbers = `7${numbers}`;
            formatted = '+7 (';
            if (numbers.length > 1) formatted += numbers.substring(1, 4);
            if (numbers.length >= 5) formatted += `) ${numbers.substring(4, 7)}`;
            if (numbers.length >= 8) formatted += `-${numbers.substring(7, 9)}`;
            if (numbers.length >= 10) formatted += `-${numbers.substring(9, 11)}`;
        } else formatted = `+${numbers.substring(0, 16)}`;
        input.value = formatted;
    }

    onPhoneKeyDown(event) {
        if (event.key === 'Backspace' && event.target.value.replace(/\D/g, '').length === 1) event.target.value = '';
    }

    onPhonePaste(event) {
        const pasted = event.clipboardData;
        if (pasted && /\D/.test(pasted.getData('Text'))) event.target.value = event.target.value.replace(/\D/g, '');
    }
}

export function subscription() {
    delegate(document, 'submit', '.subscribe__form', (event, form) => {
        event.preventDefault();
        if (!form.reportValidity()) return;
        form.querySelectorAll('.subscribe__status').forEach(status => { status.textContent = 'Подписка пока недоступна. Пожалуйста, попробуйте позже.'; });
    });
}
