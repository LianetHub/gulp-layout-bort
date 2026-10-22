export function maps() {
    if (!document.querySelector('.map-block')) return;
    function initMaps() {
        document.querySelectorAll('.map-block').forEach(container => {
            if (container.classList.contains('is-initialized') || !container.dataset.coords) return;
            const coords = container.dataset.coords.split(',').map(item => parseFloat(item.trim()));
            const map = new ymaps.Map(container, { center: coords, zoom: 16, controls: ['zoomControl'] }, { suppressMapOpenBlock: true });
            map.geoObjects.add(new ymaps.Placemark(coords, {}, {
                iconLayout: 'default#image', iconImageHref: container.dataset.placemarkLogo,
                iconImageSize: [40, 40], iconImageOffset: [-20, -20]
            }));
            if (window.innerWidth < 768) {
                map.behaviors.disable('scrollZoom');
                map.behaviors.disable('drag');
            }
            container.classList.add('is-initialized');
            map.container.fitToViewport();
            window.addEventListener('resize', () => map.container.fitToViewport());
        });
    }
    if (typeof ymaps !== 'undefined') ymaps.ready(initMaps);
    else {
        const script = document.createElement('script');
        script.async = true;
        script.defer = true;
        script.src = 'https://api-maps.yandex.ru/2.1/?lang=ru_RU';
        script.onload = () => ymaps.ready(initMaps);
        document.head.append(script);
    }
}
