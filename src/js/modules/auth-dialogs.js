const digits = value => String(value).replace(/\D/g, '');

export class CodeRequest {
    constructor() { this.reset(); }
    start(phone, now = Date.now()) { this.phone = digits(phone); this.deadline = now + 60000; }
    remaining(now = Date.now()) { return Math.max(0, Math.ceil((this.deadline - now) / 1000)); }
    matches(phone) { return Boolean(this.phone && this.phone === digits(phone)); }
    reset() { this.phone = ''; this.deadline = 0; }
}

export function validateAuthValue(name, value) {
    if (name === 'agreement') return value ? '' : 'Необходимо ваше согласие';
    if (!String(value).trim()) return 'Поле обязательно для заполнения';
    if (name === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim())) return 'Введите корректный e-mail';
    if (name === 'phone' && !/^7\d{10}$/.test(digits(value))) return 'Введите корректный номер телефона';
    if (name === 'code' && !/^\d{4}$/.test(value)) return 'Введите 4 цифры из СМС';
    return '';
}

export function authDialogs() {
    const root = document.querySelector('#sign-in.auth-dialog');
    if (!root || root.dataset.initialized) return;
    root.dataset.initialized = 'true';
    const forms = Object.fromEntries([...root.querySelectorAll('[data-auth-form]')].map(form => [form.dataset.authForm, form]));
    const requests = { phone: new CodeRequest(), register: new CodeRequest() };
    const status = root.querySelector('.auth-dialog__status');
    let interval;
    let view = 'login';
    let method = 'email';
    let opener;

    const announce = text => { status.textContent = text; status.hidden = !text; };
    const error = (input, message) => {
        input.setAttribute('aria-invalid', String(Boolean(message)));
        const field = input.closest('.auth-dialog__field');
        const output = field?.querySelector('.auth-dialog__error');
        if (output) {
            output.id = `${input.id || `auth-${input.form.dataset.authForm}-${input.name}`}-error`;
            output.textContent = message;
            input.setAttribute('aria-describedby', output.id);
        }
        return !message;
    };
    const validate = input => error(input, validateAuthValue(input.name, input.type === 'checkbox' ? input.checked : input.value));
    const focusView = () => forms[view === 'login' ? method : view].querySelector('input:not(:disabled)')?.focus({ preventScroll: true });
    const switchView = name => {
        if (!['login', 'register', 'recovery'].includes(name)) return;
        view = name;
        root.querySelectorAll('[data-auth-view]').forEach(panel => { panel.hidden = panel.dataset.authView !== name; });
        root.classList.toggle('auth-dialog--recovery', name === 'recovery');
        root.setAttribute('aria-labelledby', name === 'login' ? 'auth-title' : `auth-${name}-title`);
        if (name === 'recovery') {
            forms.recovery.elements.email.value = forms.email.elements.email.value;
            root.querySelector('.auth-dialog__email').textContent = forms.recovery.elements.email.value.trim();
        }
        announce('');
        focusView();
    };
    const switchMethod = name => {
        method = name;
        root.querySelectorAll('[data-auth-tab]').forEach(tab => {
            const active = tab.dataset.authTab === name;
            tab.setAttribute('aria-selected', String(active));
            tab.tabIndex = active ? 0 : -1;
        });
        forms.email.hidden = name !== 'email';
        forms.phone.hidden = name !== 'phone';
        announce('');
        forms[name].querySelector('input').focus();
    };
    const updateTimers = () => {
        for (const name of ['phone', 'register']) {
            const seconds = requests[name].remaining();
            forms[name].querySelectorAll('[data-auth-send]').forEach(button => {
                button.disabled = seconds > 0;
                if (name === 'phone') button.textContent = seconds ? `Выслать код повторно через ${seconds} сек.` : requests[name].phone ? 'Выслать код повторно' : 'Получить код';
                else if (button.classList.contains('auth-dialog__resend')) button.textContent = seconds ? `Получить новый код можно через ${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}` : 'Получить новый код';
            });
        }
    };
    const resetRequest = name => {
        requests[name].reset();
        const form = forms[name];
        form.elements.code.value = '';
        error(form.elements.code, '');
        if (name === 'register') {
            form.querySelector('.auth-dialog__get-code').hidden = false;
            form.querySelector('.auth-dialog__field--code').hidden = true;
            form.querySelector('.auth-dialog__code-note').hidden = true;
            form.elements.code.disabled = true;
        }
        updateTimers();
    };
    const sendCode = name => {
        const form = forms[name];
        if (requests[name].remaining() || !validate(form.elements.phone)) {
            if (!requests[name].remaining()) form.elements.phone.focus();
            return;
        }
        requests[name].start(form.elements.phone.value);
        form.elements.code.value = '';
        if (name === 'register') {
            form.querySelector('.auth-dialog__get-code').hidden = true;
            form.querySelector('.auth-dialog__field--code').hidden = false;
            form.querySelector('.auth-dialog__code-note').hidden = false;
            form.elements.code.disabled = false;
        }
        updateTimers();
        form.elements.code.focus();
        announce('Демонстрация ввода кода. Отправка СМС будет доступна после подключения сервиса.');
    };

    document.addEventListener('click', event => {
        const trigger = event.target.closest('[data-auth-open]');
        if (!trigger) return;
        event.preventDefault();
        if (typeof Fancybox === 'undefined') return;
        opener = trigger;
        window.CatalogController?.closeCatalog();
        window.SearchController?.closeSearch();
        window.AuthController?.closeMenu();
        switchView('login');
        switchMethod('email');
        clearInterval(interval);
        updateTimers();
        interval = setInterval(updateTimers, 1000);
        Fancybox.show([{ src: '#sign-in', type: 'inline' }], {
            closeButton: false, dragToClose: false, autoFocus: true, triggerEl: trigger,
            on: {
                done: focusView,
                destroy: () => {
                    clearInterval(interval);
                    root.querySelectorAll('[data-auth-password]').forEach(button => {
                        button.closest('.auth-dialog__password').querySelector('input').type = 'password';
                        button.setAttribute('aria-pressed', 'false');
                        button.setAttribute('aria-label', 'Показать пароль');
                    });
                    opener?.focus({ preventScroll: true });
                }
            }
        });
    });
    root.addEventListener('click', event => {
        const go = event.target.closest('[data-auth-go]');
        if (go) switchView(go.dataset.authGo);
        const tab = event.target.closest('[data-auth-tab]');
        if (tab) switchMethod(tab.dataset.authTab);
        const send = event.target.closest('[data-auth-send]');
        if (send) sendCode(send.dataset.authSend);
        const toggle = event.target.closest('[data-auth-password]');
        if (toggle) {
            const input = toggle.closest('.auth-dialog__password').querySelector('input');
            const visible = input.type === 'password';
            input.type = visible ? 'text' : 'password';
            toggle.setAttribute('aria-pressed', String(visible));
            toggle.setAttribute('aria-label', visible ? 'Скрыть пароль' : 'Показать пароль');
        }
    });
    root.addEventListener('keydown', event => {
        if (!event.target.matches('[data-auth-tab]') || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const name = event.key === 'Home' ? 'email' : event.key === 'End' ? 'phone' : method === 'email' ? 'phone' : 'email';
        switchMethod(name);
        root.querySelector(`[data-auth-tab="${name}"]`).focus();
    });
    root.addEventListener('input', event => {
        const input = event.target;
        if (!input.matches('input')) return;
        const name = input.form.dataset.authForm;
        if (input.name === 'code') input.value = digits(input.value).slice(0, 4);
        if (input.name === 'phone' && requests[name]?.phone && !requests[name].matches(input.value)) {
            resetRequest(name);
            announce('Номер изменён. Получите новый код.');
        } else announce('');
        if (input.getAttribute('aria-invalid') === 'true') validate(input);
        if (name === 'recovery') root.querySelector('.auth-dialog__email').textContent = input.value.trim();
    });
    root.addEventListener('change', event => {
        if (event.target.type === 'checkbox') validate(event.target);
    });
    root.addEventListener('submit', event => {
        event.preventDefault();
        event.stopPropagation();
        const form = event.target;
        const name = form.dataset.authForm;
        announce('');
        let firstInvalid;
        form.querySelectorAll('input[required]:not(:disabled)').forEach(input => { if (!validate(input)) firstInvalid ||= input; });
        if (firstInvalid) { firstInvalid.focus(); return; }
        if (requests[name] && !requests[name].matches(form.elements.phone.value)) {
            if (name === 'register') sendCode(name);
            else { announce('Сначала получите код для указанного номера.'); form.querySelector('[data-auth-send]').focus(); }
            return;
        }
        announce(name === 'recovery' ? 'Отправка письма будет доступна после подключения сервиса восстановления пароля.' : name === 'register' ? 'Данные заполнены. Завершение регистрации будет доступно после подключения сервиса.' : 'Вход будет доступен после подключения сервиса авторизации.');
    });
}
