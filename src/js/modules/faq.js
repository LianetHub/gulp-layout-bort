export const faq = () => {
    $('.faq').each(function () {
        const $faq = $(this);
        const $items = $faq.find('.faq__item');
        const desktop = window.matchMedia('(min-width: 1199.98px)');

        $faq.on('click', '.faq__question', function () {
            const expanded = this.getAttribute('aria-expanded') !== 'true';
            $(this).attr('aria-expanded', String(expanded)).toggleClass('is-open', expanded);
            $(this).next('.faq__answer').prop('hidden', !expanded);
        });

        $faq.on('click', '.faq__filter', function () {
            const type = this.hasAttribute('data-faq-section') ? 'section' : 'product';
            const value = this.getAttribute(`data-faq-${type}`);
            $(this).siblings('.faq__filter').attr('aria-pressed', 'false');
            $(this).attr('aria-pressed', 'true');
            $items.each(function () {
                this.hidden = !(type === 'product' && value === '0') && this.dataset[type] !== value;
            });
            $faq.find('.faq__empty').prop('hidden', $items.filter(function () { return !this.hidden; }).length > 0);
        });

        desktop.addEventListener('change', () => {
            $items.prop('hidden', false);
            $faq.find('.faq__filter').attr('aria-pressed', 'false');
            $faq.find('[data-faq-product="0"]').attr('aria-pressed', 'true');
            $faq.find('.faq__empty').prop('hidden', true);
        });
    });
};
