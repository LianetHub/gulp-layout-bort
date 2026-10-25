import { loadMaps } from './delivery-map.js';
import { accountPickups } from './account-pickups.js';

export function addresses() {
    const root = document.querySelector('[data-addresses]');
    if (!root || root.dataset.initialized) return;
    root.dataset.initialized = 'true';
    const list = root.querySelector('#delivery-addresses');
    const template = list?.querySelector('[data-address-card]')?.cloneNode(true);
    const dialog = document.querySelector('#address-dialog');
    if (!template || !dialog) return;
    const pickups = accountPickups(root);
    const form = dialog.querySelector('form');
    const title = dialog.querySelector('#address-dialog-title');
    const submit = dialog.querySelector('.address-dialog__submit');
    const status = root.querySelector('.addresses__status');
    const fields = ['city', 'street', 'entrance', 'floor', 'apartment', 'comment'];
    const storageKey = 'bort-account-addresses';
    let editing = null;
    let trigger;
    let modal;
    let map;
    let mapAddress;
    let request = 0;
    const report = message => { status.textContent = message; status.hidden = false; };
    const empty = () => { root.querySelector('[data-address-empty]').hidden = !!list.children.length || root.querySelector('#delivery-addresses').hidden; };
    const persist = () => {
        try {
            localStorage.setItem(storageKey, JSON.stringify([...list.children].map(card => {
                const input = card.querySelector('input');
                return { ...input.dataset, id: input.value, selected: input.checked };
            })));
        } catch { report('Не удалось сохранить адреса в браузере. Изменения доступны до перезагрузки страницы.'); }
        empty();
    };
    const fillCard = (card, address) => {
        const input = card.querySelector('input');
        fields.forEach(name => { input.dataset[name] = address[name] || ''; });
        input.value = address.id;
        input.checked = !!address.selected;
        card.querySelector('.addresses__name').textContent = [address.city, address.street].filter(Boolean).join(', ');
        card.querySelector('.addresses__details').textContent = [
            address.entrance && 'Подъезд ' + address.entrance,
            address.floor && 'этаж ' + address.floor,
            address.apartment && 'кв. ' + address.apartment,
            address.postcode && 'индекс ' + address.postcode,
            address.comment
        ].filter(Boolean).join(', ');
        input.dataset.postcode = address.postcode || '';
        return card;
    };
    list.querySelectorAll('input').forEach(input => { input.dataset.postcode = '108809'; });
    try {
        const saved = JSON.parse(localStorage.getItem(storageKey));
        if (Array.isArray(saved) && saved.every(item => item && typeof item.city === 'string' && typeof item.street === 'string' && typeof item.id === 'string')) {
            list.replaceChildren(...saved.map(address => fillCard(template.cloneNode(true), address)));
        }
    } catch { /* Keep the initial addresses if storage is unavailable. */ }
    empty();
    const view = name => {
        request++;
        dialog.classList.toggle('address-dialog--map', name === 'map');
        dialog.querySelectorAll('[data-dialog-view]').forEach(part => { part.hidden = part.dataset.dialogView !== name; });
        dialog.setAttribute('aria-labelledby', name === 'form' ? 'address-dialog-title' : 'address-map-title');
    };
    dialog.querySelector('[data-dialog-view="map"] .address-dialog__title').id = 'address-map-title';
    const open = (button, card = null) => {
        if (typeof Fancybox === 'undefined') return;
        trigger = button;
        editing = card;
        form.reset();
        fields.forEach(name => { form.elements[name].value = card?.querySelector('input').dataset[name] || ''; });
        title.textContent = card ? 'Редактировать адрес доставки' : 'Добавить новый адрес доставки';
        submit.textContent = card ? 'Сохранить изменения' : 'Добавить новый адрес';
        view('form');
        Fancybox.show([{ src: '#address-dialog', type: 'inline' }], {
            closeButton: false, dragToClose: false, autoFocus: false,
            on: { ready: () => form.elements.city.focus(), destroy: () => { request++; trigger?.focus(); } }
        });
        modal = Fancybox.getInstance();
    };
    root.querySelector('.addresses__add').addEventListener('click', event => {
        if (root.querySelector('[data-address-tab="pickup"]').getAttribute('aria-selected') === 'true') pickups?.open(event.currentTarget);
        else open(event.currentTarget);
    });
    list.addEventListener('change', persist);
    list.addEventListener('click', event => {
        const card = event.target.closest('[data-address-card]');
        if (!card) return;
        if (event.target.closest('.addresses__edit')) open(event.target.closest('button'), card);
        if (event.target.closest('.addresses__delete')) {
            const checked = card.querySelector('input').checked;
            card.remove();
            if (checked && list.querySelector('input')) list.querySelector('input').checked = true;
            persist();
            report('Адрес удалён.');
            (list.querySelector('.addresses__edit') || root.querySelector('.addresses__add')).focus();
        }
    });
    form.addEventListener('submit', event => {
        event.preventDefault();
        fields.forEach(name => { form.elements[name].value = form.elements[name].value.trim(); });
        if (!form.reportValidity()) return;
        const address = Object.fromEntries(new FormData(form));
        address.id = editing?.querySelector('input').value || String(Date.now());
        address.postcode = editing?.querySelector('input').dataset.postcode || '';
        address.selected = editing ? editing.querySelector('input').checked : true;
        if (address.selected) list.querySelectorAll('input').forEach(input => { input.checked = false; });
        if (editing) fillCard(editing, address);
        else list.append(fillCard(template.cloneNode(true), address));
        persist();
        modal?.close();
    });
    const tabs = [...root.querySelectorAll('[data-address-tab]')];
    const activate = tab => {
        tabs.forEach(button => {
            const selected = button === tab;
            button.setAttribute('aria-selected', String(selected));
            button.tabIndex = selected ? 0 : -1;
            root.querySelector('#' + button.getAttribute('aria-controls')).hidden = !selected;
        });
        const pickup = tab.dataset.addressTab === 'pickup';
        root.classList.toggle('addresses--pickup', pickup);
        root.querySelector('.addresses__add').textContent = pickup ? 'Добавить пункт выдачи' : 'Добавить новый адрес';
        root.querySelector('.addresses__title').textContent = pickup ? 'Адреса и пункты выдачи' : 'Адреса доставки';
        status.hidden = true;
        pickups?.refresh();
        empty();
    };
    tabs.forEach((tab, index) => {
        tab.addEventListener('click', () => activate(tab));
        tab.addEventListener('keydown', event => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
            event.preventDefault();
            const next = tabs[event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + 1) % tabs.length];
            activate(next); next.focus();
        });
    });
    if (location.hash === '#pickup') activate(tabs.find(tab => tab.dataset.addressTab === 'pickup'));
    dialog.querySelector('.address-dialog__back').addEventListener('click', () => { view('form'); form.elements.city.focus(); });
    dialog.querySelector('.address-dialog__choose').addEventListener('click', () => {
        if (!mapAddress) return;
        form.elements.city.value = mapAddress.city;
        form.elements.street.value = mapAddress.street;
        view('form'); form.elements.street.focus();
    });
    dialog.querySelector('.address-dialog__map-toggle').addEventListener('click', async () => {
        view('map');
        mapAddress = null;
        const choose = dialog.querySelector('.address-dialog__choose');
        const message = dialog.querySelector('.address-dialog__status');
        choose.disabled = true;
        dialog.querySelector('.address-dialog__selected').textContent = 'Выберите точку на карте';
        message.textContent = 'Загрузка карты…';
        const current = request;
        try {
            const api = await loadMaps();
            if (current !== request) return;
            if (!map) {
                map = new api.Map(dialog.querySelector('.address-dialog__map'), { center: [55.678, 37.565], zoom: 13, controls: ['zoomControl'] });
                map.events.add('click', async event => {
                    const pending = ++request;
                    choose.disabled = true;
                    const coords = event.get('coords');
                    message.textContent = 'Определяем адрес…';
                    try {
                        const result = await api.geocode(coords);
                        if (pending !== request) return;
                        const place = result.geoObjects.get(0);
                        const city = place?.getLocalities()[0] || place?.getAdministrativeAreas()[0];
                        const street = [place?.getThoroughfare(), place?.getPremiseNumber()].filter(Boolean).join(', ');
                        if (!city || !street) throw new Error('No street address');
                        mapAddress = { city, street };
                        map.geoObjects.removeAll();
                        map.geoObjects.add(new api.Placemark(coords, {}, { preset: 'islands#orangeDotIcon' }));
                        dialog.querySelector('.address-dialog__selected').textContent = city + ', ' + street;
                        message.textContent = '';
                        choose.disabled = false;
                    } catch { if (pending === request) message.textContent = 'Не удалось определить адрес. Выберите другую точку или введите адрес вручную.'; }
                });
            }
            map.container.fitToViewport();
            message.textContent = 'Нажмите на карте, чтобы выбрать адрес.';
        } catch { if (current === request) message.textContent = 'Не удалось загрузить карту. Вернитесь к вводу адреса вручную.'; }
    });
}

