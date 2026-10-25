import { loadMaps } from './delivery-map.js';
import { savePickup, removePickup, filterPickups } from './pickup-state.js';

const catalog = [
    {
        'id': '427-110',
        'title': 'Ozon — ул. Ленина, д. 15',
        'address': 'г. Москва, ул. Ленина, д. 15, кв./офис 10',
        'hours': '10:00–21:00',
        'distance': '1.2 км',
        'coords': [55.706, 37.541],
    },
    {
        'id': '427-111',
        'title': 'Ozon — пр-т Мира, д. 102, корп. 1',
        'address': 'г. Москва, пр-т Мира, д. 102, корп. 1',
        'hours': '09:00–22:00',
        'distance': '2.4 км',
        'coords': [55.713, 37.58],
    },
    {
        'id': '427-112',
        'title': 'Ozon — ул. Попова, д. 4',
        'address': 'г. Москва, ул. Попова, д. 4',
        'hours': '10:00–20:00',
        'distance': '3.1 км',
        'coords': [55.687, 37.553],
    },
];

export function accountPickups(root) {
    const dialog = document.querySelector('#account-pickup-dialog');
    const list = root.querySelector('#pickup-addresses');

    if (!dialog || !list || dialog.dataset.initialized) {
        return;
    }

    dialog.dataset.initialized = 'true';
    const template = list.querySelector('[data-pickup-card]').cloneNode(true);
    const search = dialog.querySelector('.pickup-dialog__input');
    const status = dialog.querySelector('.pickup-dialog__map-status');
    const maps = {};
    let points = [...list.querySelectorAll('[data-pickup-card]')].map((card) => {
        const input = card.querySelector('input');
        return { ...catalog.find((point) => point.id === input.value), selected: input.checked };
    });
    let active;
    let replacingId;
    let modal;
    let trigger;
    let version = 0;
    let currentView = 'list';
    const render = () => {
        list.replaceChildren(
            ...points.map((point) => {
                const card = template.cloneNode(true);
                const input = card.querySelector('input');

                input.value = point.id;
                input.checked = !!point.selected;
                card.querySelector('.addresses__name').textContent = point.title;
                card.querySelector('.addresses__details').textContent =
                    'Пн-Вс: ' + point.hours + ' • Срок хранения: 5 дней';

                return card;
            }),
        );
        root.querySelector('[data-pickup-empty]').hidden = list.hidden || points.length > 0;
    };
    const showView = (name) => {
        version++;
        currentView = name;
        dialog.classList.toggle('pickup-dialog--detail', name === 'detail');
        dialog.querySelectorAll('[data-account-pickup-view]').forEach((view) => {
            view.hidden = view.dataset.accountPickupView !== name;
        });
        dialog.setAttribute(
            'aria-labelledby',
            name === 'list' ? 'account-pickup-title' : 'account-pickup-detail-title',
        );
    };
    const visiblePoints = () => filterPickups(catalog, search.value);
    const drawMap = async (name) => {
        const ticket = version;

        status.hidden = false;
        status.textContent = 'Загрузка карты…';
        try {
            const api = await loadMaps();

            if (ticket !== version) {
                return;
            }

            if (!maps[name]) {
                const container = dialog.querySelector('[data-pickup-map="' + name + '"]');

                maps[name] = new api.Map(container, {
                    center: catalog[0].coords,
                    zoom: 12,
                    controls: ['zoomControl'],
                });
                const observer = new ResizeObserver(() => {
                    if (container.offsetWidth && currentView === name) {
                        maps[name].container.fitToViewport();
                    }
                });

                observer.observe(container);
            }
            const map = maps[name];

            map.geoObjects.removeAll();
            const shown = name === 'detail' ? [active] : visiblePoints();

            shown.forEach((point) => {
                const marker = new api.Placemark(
                    point.coords,
                    { hintContent: point.title },
                    {
                        iconLayout: 'default#image',
                        iconImageHref: 'img/pickup/pin.svg',
                        iconImageSize: [40, 40],
                        iconImageOffset: [-20, -40],
                    },
                );

                marker.events.add('click', () => detail(point.id));
                map.geoObjects.add(marker);
            });
            map.container.fitToViewport();
            if (shown.length === 1) {
                map.setCenter(shown[0].coords, 14);
            } else if (shown.length > 1) {
                map.setBounds(map.geoObjects.getBounds(), { checkZoomRange: true, zoomMargin: 35 });
            }
            status.hidden = true;
        } catch {
            if (ticket !== version) {
                return;
            }

            status.textContent = 'Не удалось загрузить карту. Выберите пункт из списка.';
        }
    };
    const detail = (id) => {
        active = catalog.find((point) => point.id === id);
        if (!active) {
            return;
        }

        showView('detail');
        dialog.querySelector('.pickup-dialog__detail-title').textContent =
            'Пункт Ozon №' + active.id;
        dialog.querySelector('.pickup-dialog__address').textContent = active.address;
        dialog.querySelector('.pickup-dialog__hours').textContent =
            'Пн-Вс ' + active.hours + ' (без перерыва)';
        drawMap('detail');
        dialog.querySelector('.pickup-dialog__back').focus();
    };
    const filter = () => {
        const visible = visiblePoints();

        dialog.querySelectorAll('[data-pickup-id]').forEach((button) => {
            button.hidden = !visible.some((point) => point.id === button.dataset.pickupId);
        });
        dialog.querySelector('.pickup-dialog__empty').hidden = !!visible.length;
        if (currentView === 'list') {
            drawMap('list');
        }
    };

    search.addEventListener('input', filter);
    dialog
        .querySelectorAll('[data-pickup-id]')
        .forEach((button) =>
            button.addEventListener('click', () => detail(button.dataset.pickupId)),
        );
    dialog.querySelector('.pickup-dialog__back').addEventListener('click', () => {
        showView('list');
        drawMap('list');
        const button = dialog.querySelector('[data-pickup-id="' + active.id + '"]');

        (button && !button.hidden ? button : search).focus();
    });
    dialog.querySelector('.pickup-dialog__choose').addEventListener('click', () => {
        if (!active) {
            return;
        }

        points = savePickup(points, active, replacingId);
        render();
        modal?.close();
    });
    const open = (button, id) => {
        if (typeof Fancybox === 'undefined') {
            return;
        }

        trigger = button;
        replacingId = id;
        search.value = '';
        showView('list');
        dialog.querySelectorAll('[data-pickup-id]').forEach((option) => {
            option.hidden = false;
        });
        dialog.querySelector('.pickup-dialog__empty').hidden = true;
        Fancybox.show([{ src: '#account-pickup-dialog', type: 'inline' }], {
            closeButton: false,
            dragToClose: false,
            autoFocus: false,
            on: {
                ready: () => {
                    drawMap('list');
                    search.focus();
                },
                destroy: () => {
                    version++;
                    const fallback =
                        list.querySelector('.addresses__edit') ||
                        root.querySelector('.addresses__add');

                    (trigger?.isConnected ? trigger : fallback)?.focus();
                },
            },
        });
        modal = Fancybox.getInstance();
    };

    list.addEventListener('change', (event) => {
        if (!event.target.matches('.addresses__radio')) {
            return;
        }

        points = points.map((point) => ({ ...point, selected: point.id === event.target.value }));
    });
    list.addEventListener('click', (event) => {
        const card = event.target.closest('[data-pickup-card]');

        if (!card) {
            return;
        }

        const id = card.querySelector('input').value;

        if (event.target.closest('.addresses__edit')) {
            open(event.target.closest('button'), id);
        }
        if (event.target.closest('.addresses__delete')) {
            points = removePickup(points, id);
            render();
            (
                list.querySelector('.addresses__edit') || root.querySelector('.addresses__add')
            ).focus();
        }
    });

    return { open, refresh: render };
}
