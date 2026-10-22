import { delegate } from './dom.js';

export const partsOrder = () => {
    delegate(document, 'change', '.form--parts .form__file-input, .form--request .form__file-input', (event, input) => {
        const names = Array.from(input.files || [], file => file.name);
        input.closest('form')?.querySelectorAll('.form__file-name').forEach(label => {
            label.textContent = names.join(', ');
            label.hidden = !names.length;
        });
    });

    // Register after FormController: invalid submissions stop before this listener.
    delegate(document, 'submit', '.form--parts, .form--request', async (event, form) => {
        event.preventDefault();
        if (form.getAttribute('aria-busy') === 'true') return;
        const endpoint = form.getAttribute('action');
        const status = form.querySelector('.form__status');
        const setStatus = message => {
            if (!status) return;
            status.hidden = false;
            status.textContent = message;
        };
        if (!endpoint || endpoint === '#') {
            setStatus(form.dataset.unavailableMessage || 'Отправка заявки временно недоступна. Пожалуйста, свяжитесь со специалистом по телефонам +7(499)343-62-42 или +7(499)005-23-00.');
            return;
        }
        const buttons = [...form.querySelectorAll('[type="submit"]')];
        const disabled = buttons.map(button => button.disabled);
        form.setAttribute('aria-busy', 'true');
        buttons.forEach(button => { button.disabled = true; });
        setStatus('Отправляем заявку…');
        try {
            const response = await fetch(endpoint, { method: 'POST', body: new FormData(form) });
            if (!response.ok) throw new Error('Request failed');
            form.reset();
            form.querySelectorAll('.form__file-name').forEach(label => {
                label.textContent = '';
                label.hidden = true;
            });
            setStatus('Заявка отправлена. Специалист свяжется с Вами в ближайшее время.');
        } catch {
            setStatus('Не удалось отправить заявку. Попробуйте ещё раз или свяжитесь с нами по телефону.');
        } finally {
            form.removeAttribute('aria-busy');
            buttons.forEach((button, index) => { button.disabled = disabled[index]; });
        }
    });
};
