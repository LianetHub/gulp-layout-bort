let mapsReady;

function loadMaps() {
    if (!mapsReady) mapsReady = new Promise((resolve, reject) => {
        const ready = () => {
            if (typeof ymaps === 'undefined') { reject(new Error('Map service unavailable')); return; }
            ymaps.ready(() => resolve(ymaps));
        };
        if (typeof ymaps !== 'undefined') { ready(); return; }
        const existing = document.querySelector('script[src*="api-maps.yandex.ru/2.1/"]');
        const script = existing || document.createElement('script');
        const timeout = setTimeout(() => reject(new Error('Map loading timed out')), 15000);
        script.addEventListener('load', () => { clearTimeout(timeout); ready(); }, { once: true });
        script.addEventListener('error', () => { clearTimeout(timeout); script.remove(); reject(new Error('Map loading failed')); }, { once: true });
        if (!existing) {
            script.async = true;
            script.src = 'https://api-maps.yandex.ru/2.1/?lang=ru_RU';
            document.head.append(script);
        }
    }).catch(error => { mapsReady = null; throw error; });
    return mapsReady;
}

export function deliveryMap(form) {
    const container = form.querySelector('.address-picker__map');
    const toggle = form.querySelector('.address-picker__map-toggle');
    const status = form.querySelector('.address-picker__map-status');
    if (!container || !toggle || !status) return;
    let map;
    let loading = false;
    let request = 0;
    const reset = () => {
        request++;
        container.hidden = true;
        toggle.setAttribute('aria-expanded', 'false');
        status.hidden = true;
        map?.geoObjects.removeAll();
    };
    toggle.addEventListener('click', async () => {
        container.hidden = !container.hidden;
        toggle.setAttribute('aria-expanded', String(!container.hidden));
        if (container.hidden) return;
        status.hidden = false;
        if (map) { map.container.fitToViewport(); status.textContent = 'Нажмите на карте, чтобы выбрать адрес.'; return; }
        if (loading) return;
        loading = true;
        status.textContent = 'Загрузка карты…';
        try {
            const api = await loadMaps();
            map = new api.Map(container, { center: [55.751244, 37.618423], zoom: 11, controls: ['zoomControl'] });
            if (!container.hidden) status.textContent = 'Нажмите на карте, чтобы выбрать адрес.';
            map.events.add('click', async event => {
                const current = ++request;
                const coords = event.get('coords');
                status.textContent = 'Определяем адрес…';
                try {
                    const result = await api.geocode(coords);
                    if (current !== request || container.hidden) return;
                    const place = result.geoObjects.get(0);
                    if (!place) throw new Error('Address not found');
                    form.elements.city.value = place.getLocalities()[0] || place.getAdministrativeAreas()[0] || '';
                    form.elements.street.value = [place.getThoroughfare(), place.getPremiseNumber()].filter(Boolean).join(', ');
                    map.geoObjects.removeAll();
                    map.geoObjects.add(new api.Placemark(coords));
                    status.textContent = 'Адрес выбран. Проверьте город и улицу перед добавлением.';
                } catch { if (current === request) status.textContent = 'Не удалось определить адрес. Заполните город и улицу вручную.'; }
            });
        } catch {
            container.hidden = true;
            toggle.setAttribute('aria-expanded', 'false');
            status.textContent = 'Не удалось загрузить карту. Адрес можно ввести вручную.';
        } finally { loading = false; }
    });
    return { reset };
}
