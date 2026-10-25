export function account() {
    const root = document.querySelector('[data-account]');
    if (!root || root.dataset.initialized) return;
    root.dataset.initialized = 'true';
    const profile = root.querySelector('[data-account-profile]');
    const legal = profile.elements.legal;
    const company = root.querySelector('#company-fields');
    const syncLegal = () => {
        company.hidden = !legal.checked;
        company.disabled = !legal.checked;
    };
    legal.addEventListener('change', syncLegal);
    syncLegal();
    const setMenu = menu => {
        root.classList.toggle('account--menu', menu);
        root.querySelector('.account__mobile-title').textContent = menu ? 'Мой кабинет' : 'Личные данные';
    };
    root.querySelector('.account__back').addEventListener('click', () => {
        history.replaceState(null, '', '#menu');
        setMenu(true);
        window.scrollTo(0, 0);
    });
    root.querySelector('[data-account-personal]').addEventListener('click', () => {
        setMenu(false);
        window.scrollTo(0, 0);
    });
    window.addEventListener('hashchange', () => setMenu(location.hash === '#menu'));
    setMenu(location.hash === '#menu');
    root.querySelector('[data-account-logout]').addEventListener('click', event => {
        event.preventDefault();
        root.dispatchEvent(new CustomEvent('account:logout', { bubbles: true }));
    });
    root.querySelectorAll('.account__reveal').forEach(button => {
        button.addEventListener('click', () => {
            const input = button.previousElementSibling;
            const visible = input.type === 'password';
            input.type = visible ? 'text' : 'password';
            button.setAttribute('aria-pressed', String(visible));
            button.setAttribute('aria-label', visible ? 'Скрыть пароль' : 'Показать пароль');
        });
    });
    root.querySelectorAll('form').forEach(form => {
        const status = form.querySelector('.account__status');
        const passwordForm = form.hasAttribute('data-account-password');
        if (passwordForm) {
            const confirm = form.elements['confirm-password'];
            const validate = () => confirm.setCustomValidity(confirm.value && confirm.value !== form.elements['new-password'].value ? 'Пароли не совпадают' : '');
            form.addEventListener('input', validate);
        }
        form.addEventListener('reset', () => {
            status.hidden = true;
            form.querySelectorAll('.account__password .account__input').forEach(input => {
                input.type = 'password';
                input.setCustomValidity('');
            });
            form.querySelectorAll('.account__reveal').forEach(button => {
                button.setAttribute('aria-pressed', 'false');
                button.setAttribute('aria-label', 'Показать пароль');
            });
            setTimeout(syncLegal, 0);
        });
        form.addEventListener('submit', event => {
            event.preventDefault();
            if (!form.reportValidity()) return;
            form.dispatchEvent(new CustomEvent(passwordForm ? 'account:password' : 'account:save', {
                bubbles: true, detail: Object.fromEntries(new FormData(form))
            }));
            status.textContent = 'Данные проверены. Сохранение будет доступно после подключения личного кабинета к серверу.';
            status.hidden = false;
        });
    });
}
