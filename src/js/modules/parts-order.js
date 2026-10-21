export const partsOrder = () => {
    const $form = $('.form--parts');
    if (!$form.length) return;

    const $files = $form.find('.form__file-input');
    const $fileNames = $form.find('.form__file-name');
    const $status = $form.find('.form__status');

    $files.on('change', function () {
        const names = Array.from(this.files || [], file => file.name);
        $fileNames.text(names.join(', ')).prop('hidden', !names.length);
    });

    // Register after the shared FormController so invalid submissions stop there.
    $(document).on('submit', '.form--parts', async function (event) {
        event.preventDefault();
        if ($(this).attr('aria-busy') === 'true') return;

        const endpoint = this.getAttribute('action');
        $status.prop('hidden', false);
        if (!endpoint || endpoint === '#') {
            $status.text('Отправка заявки временно недоступна. Пожалуйста, свяжитесь со специалистом по телефонам +7(499)343-62-42 или +7(499)005-23-00.');
            return;
        }

        const $submit = $(this).find('[type="submit"]');
        $(this).attr('aria-busy', 'true');
        $submit.prop('disabled', true);
        $status.text('Отправляем заявку…');
        try {
            const response = await fetch(endpoint, { method: 'POST', body: new FormData(this) });
            if (!response.ok) throw new Error('Request failed');
            this.reset();
            $fileNames.empty().prop('hidden', true);
            $status.text('Заявка отправлена. Специалист свяжется с Вами в ближайшее время.');
        } catch {
            $status.text('Не удалось отправить заявку. Попробуйте ещё раз или свяжитесь с нами по телефону.');
        } finally {
            $(this).removeAttr('aria-busy');
            $submit.prop('disabled', false);
        }
    });
};
