import { delegate } from './dom.js';

function renderFiles(input) {
    const list = input.closest('.file-upload')?.querySelector('.file-upload__list');

    if (!list) {
        return;
    }

    list.replaceChildren();
    [...input.files].forEach((file, index) => {
        const item = document.createElement('li');

        item.className = 'file-upload__item';
        const name = document.createElement('span');

        name.className = 'file-upload__name';
        name.textContent = file.name;
        const format = document.createElement('span');
        const extension = file.name.includes('.')
            ? file.name.split('.').pop().toUpperCase()
            : 'FILE';

        format.className =
            'file-upload__format ' + (extension === 'PDF' ? 'icon-pdf' : 'icon-file');
        format.dataset.format = extension.slice(0, 5);
        format.setAttribute('aria-label', 'Формат: ' + extension);
        const info = document.createElement('span');

        info.className = 'file-upload__info';
        const size = document.createElement('span');

        size.className = 'file-upload__size';
        size.textContent =
            file.size < 1024 * 1024
                ? Math.max(1, Math.ceil(file.size / 1024)) + ' КБ'
                : (file.size / (1024 * 1024)).toFixed(1) + ' МБ';
        info.append(name, size);
        const remove = document.createElement('button');

        remove.className = 'file-upload__remove icon-close';
        remove.type = 'button';
        remove.dataset.fileIndex = index;
        remove.setAttribute('aria-label', 'Удалить файл: ' + file.name);
        item.append(format, info, remove);
        list.append(item);
    });
    list.hidden = !input.files.length;
}

export const partsOrder = () => {
    delegate(
        document,
        'change',
        '.form--parts .form__file-input, .form--request .form__file-input',
        (event, input) => renderFiles(input),
    );
    delegate(document, 'click', '.file-upload__remove', (event, button) => {
        const upload = button.closest('.file-upload');
        const input = upload.querySelector('.form__file-input');
        const transfer = new DataTransfer();
        const index = Number(button.dataset.fileIndex);

        [...input.files].forEach((file, position) => {
            if (position !== index) {
                transfer.items.add(file);
            }
        });
        input.files = transfer.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
        const next =
            upload.querySelectorAll('.file-upload__remove')[
                Math.min(index, input.files.length - 1)
            ];

        (next || input).focus();
    });
    delegate(document, 'reset', '.form--parts, .form--request', (event, form) => {
        queueMicrotask(() => {
            if (!event.defaultPrevented) {
                form.querySelectorAll('.form__file-input').forEach(renderFiles);
            }
        });
    });

    // Register after FormController: invalid submissions stop before this listener.
    delegate(document, 'submit', '.form--parts, .form--request', async (event, form) => {
        event.preventDefault();
        if (form.getAttribute('aria-busy') === 'true') {
            return;
        }

        const endpoint = form.getAttribute('action');
        const status = form.querySelector('.form__status');
        const setStatus = (message) => {
            if (!status) {
                return;
            }

            status.hidden = false;
            status.textContent = message;
        };

        if (!endpoint || endpoint === '#') {
            setStatus(
                form.dataset.unavailableMessage ||
                    'Отправка заявки временно недоступна. Пожалуйста, свяжитесь со специалистом по телефонам +7(499)343-62-42 или +7(499)005-23-00.',
            );

            return;
        }
        const buttons = [...form.querySelectorAll('[type="submit"]')];
        const disabled = buttons.map((button) => button.disabled);

        form.setAttribute('aria-busy', 'true');
        buttons.forEach((button) => {
            button.disabled = true;
        });
        setStatus('Отправляем заявку…');
        try {
            const response = await fetch(endpoint, { method: 'POST', body: new FormData(form) });

            if (!response.ok) {
                throw new Error('Request failed');
            }

            form.reset();
            setStatus('Заявка отправлена. Специалист свяжется с Вами в ближайшее время.');
        } catch {
            setStatus(
                'Не удалось отправить заявку. Попробуйте ещё раз или свяжитесь с нами по телефону.',
            );
        } finally {
            form.removeAttribute('aria-busy');
            buttons.forEach((button, index) => {
                button.disabled = disabled[index];
            });
        }
    });
};
