export const news = () => {
    $('.news--listing').each(function () {
        const $section = $(this);
        const $button = $section.find('.news__btn');
        const $cards = $section.find('.news-card');
        const desktop = window.matchMedia('(min-width: 767.98px)');

        const updateButton = () => {
            const hasMore = $cards.filter(':hidden').length > 0;
            $button.prop('disabled', !hasMore);
            $button.text(hasMore || desktop.matches ? 'Показать еще' : 'Все новости показаны');
        };

        $button.on('click', function () {
            const $remaining = $cards.filter(':hidden');
            if ($remaining.length) {
                $remaining.slice(0, 3).addClass('is-visible');
            }
            updateButton();
        });
        desktop.addEventListener('change', updateButton);
        updateButton();
    });
};
