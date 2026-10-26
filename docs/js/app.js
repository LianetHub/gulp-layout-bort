(function () {
    'use strict';

    class TextUtils {
        static showMessage(element, text) {
            element.textContent = text;
        }

        static digits(value) {
            return String(value).replace(/\D/g, '');
        }

        static money(value) {
            return new Intl.NumberFormat('ru-RU').format(value) + ' ₽';
        }

        static productWord(count) {
            return count % 10 === 1 && count % 100 !== 11
                ? 'товар'
                : count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 12 || count % 100 > 14)
                  ? 'товара'
                  : 'товаров';
        }
    }

    // === delivery-map ===

    class MapLoader {
        static mapsReady = undefined;

        static loadMaps() {
            const mapsUrl = 'https://api-maps.yandex.ru/2.1/?lang=ru_RU';

            if (!MapLoader.mapsReady) {
                MapLoader.mapsReady = new Promise((resolve, reject) => {
                    const ready = () => {
                        if (typeof ymaps === 'undefined') {
                            reject(new Error('Map service unavailable'));

                            return;
                        }
                        ymaps.ready(() => resolve(ymaps));
                    };

                    if (typeof ymaps !== 'undefined') {
                        ready();

                        return;
                    }
                    const existing = document.querySelector(`script[src="${mapsUrl}"]`);
                    const script = existing || document.createElement('script');
                    const timeout = setTimeout(() => {
                        script.remove();
                        reject(new Error('Map loading timed out'));
                    }, 15000);

                    script.addEventListener(
                        'load',
                        () => {
                            clearTimeout(timeout);
                            ready();
                        },
                        {
                            once: true,
                        },
                    );
                    script.addEventListener(
                        'error',
                        () => {
                            clearTimeout(timeout);
                            script.remove();
                            reject(new Error('Map loading failed'));
                        },
                        {
                            once: true,
                        },
                    );
                    if (!existing) {
                        script.async = true;
                        script.src = mapsUrl;
                        document.head.append(script);
                    }
                }).catch((error) => {
                    MapLoader.mapsReady = null;
                    throw error;
                });
            }

            return MapLoader.mapsReady;
        }
    }

    class DeliveryMap {
        constructor() {
            this.reset = this.reset.bind(this);
            this.toggleMap = this.toggleMap.bind(this);
        }

        init(form) {
            this.form = form;
            this.container = this.form.querySelector('.address-picker__map');
            this.toggle = this.form.querySelector('.address-picker__map-toggle');
            this.status = this.form.querySelector('.address-picker__map-status');

            if (!this.container || !this.toggle || !this.status) {
                return;
            }

            this.map = undefined;
            this.loading = false;
            this.request = 0;

            this.toggle.addEventListener('click', this.toggleMap);

            return this;
        }

        reset() {
            this.request++;
            this.container.hidden = true;
            this.toggle.setAttribute('aria-expanded', 'false');
            this.status.hidden = true;
            this.map?.geoObjects.removeAll();
        }

        async toggleMap() {
            this.container.hidden = !this.container.hidden;
            this.toggle.setAttribute('aria-expanded', String(!this.container.hidden));
            if (this.container.hidden) {
                return;
            }

            this.status.hidden = false;
            if (this.map) {
                this.map.container.fitToViewport();
                TextUtils.showMessage(this.status, 'Нажмите на карте, чтобы выбрать адрес.');

                return;
            }
            if (this.loading) {
                return;
            }

            this.loading = true;
            TextUtils.showMessage(this.status, 'Загрузка карты…');
            try {
                const api = await MapLoader.loadMaps();

                this.map = new api.Map(this.container, {
                    center: this.container.dataset.mapCenter.split(',').map(Number),
                    zoom: 11,
                    controls: ['zoomControl'],
                });
                if (!this.container.hidden) {
                    TextUtils.showMessage(this.status, 'Нажмите на карте, чтобы выбрать адрес.');
                }
                this.map.events.add('click', async (event) => {
                    const current = ++this.request;
                    const coords = event.get('coords');

                    TextUtils.showMessage(this.status, 'Определяем адрес…');
                    try {
                        const result = await api.geocode(coords);

                        if (current !== this.request || this.container.hidden) {
                            return;
                        }

                        const place = result.geoObjects.get(0);

                        if (!place) {
                            throw new Error('Address not found');
                        }

                        this.form.elements.city.value =
                            place.getLocalities()[0] || place.getAdministrativeAreas()[0] || '';
                        this.form.elements.street.value = [
                            place.getThoroughfare(),
                            place.getPremiseNumber(),
                        ]
                            .filter(Boolean)
                            .join(', ');
                        this.map.geoObjects.removeAll();
                        this.map.geoObjects.add(new api.Placemark(coords));
                        TextUtils.showMessage(
                            this.status,
                            'Адрес выбран. Проверьте город и улицу перед добавлением.',
                        );
                    } catch {
                        if (current === this.request) {
                            TextUtils.showMessage(
                                this.status,
                                'Не удалось определить адрес. Заполните город и улицу вручную.',
                            );
                        }
                    }
                });
            } catch {
                this.container.hidden = true;
                this.toggle.setAttribute('aria-expanded', 'false');
                TextUtils.showMessage(
                    this.status,
                    'Не удалось загрузить карту. Адрес можно ввести вручную.',
                );
            } finally {
                this.loading = false;
            }
        }
    }

    // === pickup-state ===

    class PickupState {
        static savePickup(points, point, replacingId) {
            return [
                ...points
                    .filter((item) => item.id !== replacingId && item.id !== point.id)
                    .map((item) => ({
                        ...item,
                        selected: false,
                    })),
                {
                    ...point,
                    selected: true,
                },
            ];
        }

        static removePickup(points, id) {
            const result = points
                .filter((point) => point.id !== id)
                .map((point) => ({
                    ...point,
                }));

            if (result.length && !result.some((point) => point.selected)) {
                result[0].selected = true;
            }

            return result;
        }

        static filterPickups(points, query) {
            const normalized = query.trim().toLocaleLowerCase('ru');
            return points.filter((point) =>
                (point.title + ' ' + point.address).toLocaleLowerCase('ru').includes(normalized),
            );
        }
    }

    // === account-pickups ===

    class AccountPickups {
        constructor() {
            this.render = this.render.bind(this);
            this.showView = this.showView.bind(this);
            this.visiblePoints = this.visiblePoints.bind(this);
            this.drawMap = this.drawMap.bind(this);
            this.detail = this.detail.bind(this);
            this.filter = this.filter.bind(this);
            this.open = this.open.bind(this);
            this.refresh = this.refresh.bind(this);
            this.backToList = this.backToList.bind(this);
            this.choosePoint = this.choosePoint.bind(this);
            this.selectSavedPoint = this.selectSavedPoint.bind(this);
            this.handleSavedPointAction = this.handleSavedPointAction.bind(this);
        }

        init(root) {
            this.root = root;
            this.dialog = document.querySelector('#account-pickup-dialog');
            this.list = this.root.querySelector('#pickup-addresses');

            if (!this.dialog || !this.list || this.dialog.dataset.initialized) {
                return;
            }

            this.dialog.dataset.initialized = 'true';
            this.catalog = [...this.dialog.querySelectorAll('[data-pickup-id]')].map((button) => ({
                id: button.dataset.pickupId,
                title: button.querySelector('.pickup-dialog__point-title').textContent.trim(),
                address: button.dataset.address,
                hours: button.dataset.hours,
                coords: button.dataset.coords.split(',').map(Number),
                detailTitle: button.querySelector('[data-pickup-detail-title]').textContent,
                detailHours: button.querySelector('[data-pickup-detail-hours]').textContent,
                summary: button.querySelector('[data-pickup-summary]').textContent,
            }));
            this.template = this.list.querySelector('[data-pickup-card]').cloneNode(true);
            this.search = this.dialog.querySelector('.pickup-dialog__input');
            this.status = this.dialog.querySelector('.pickup-dialog__map-status');
            this.maps = {};
            this.points = [...this.list.querySelectorAll('[data-pickup-card]')].map((card) => {
                const input = card.querySelector('input');
                return {
                    ...this.catalog.find((point) => point.id === input.value),
                    selected: input.checked,
                };
            });
            this.active = undefined;
            this.replacingId = undefined;
            this.modal = undefined;
            this.trigger = undefined;
            this.version = 0;
            this.currentView = 'list';

            this.search.addEventListener('input', this.filter);
            this.dialog
                .querySelectorAll('[data-pickup-id]')
                .forEach((button) =>
                    button.addEventListener('click', () => this.detail(button.dataset.pickupId)),
                );
            this.dialog
                .querySelector('.pickup-dialog__back')
                .addEventListener('click', this.backToList);
            this.dialog
                .querySelector('.pickup-dialog__choose')
                .addEventListener('click', this.choosePoint);

            this.list.addEventListener('change', this.selectSavedPoint);
            this.list.addEventListener('click', this.handleSavedPointAction);

            return this;
        }

        render() {
            this.list.replaceChildren(
                ...this.points.map((point) => {
                    const card = this.template.cloneNode(true);
                    const input = card.querySelector('input');

                    input.value = point.id;
                    input.checked = !!point.selected;
                    card.querySelector('.addresses__name').textContent = point.title;
                    card.querySelector('.addresses__details').textContent = point.summary;

                    return card;
                }),
            );
            this.root.querySelector('[data-pickup-empty]').hidden =
                this.list.hidden || this.points.length > 0;
        }

        showView(name) {
            this.version++;
            this.currentView = name;
            this.dialog.classList.toggle('pickup-dialog--detail', name === 'detail');
            this.dialog.querySelectorAll('[data-account-pickup-view]').forEach((view) => {
                view.hidden = view.dataset.accountPickupView !== name;
            });
            this.dialog.setAttribute(
                'aria-labelledby',
                name === 'list' ? 'account-pickup-title' : 'account-pickup-detail-title',
            );
        }

        visiblePoints() {
            return PickupState.filterPickups(this.catalog, this.search.value);
        }

        async drawMap(name) {
            const ticket = this.version;

            this.status.hidden = false;
            TextUtils.showMessage(this.status, 'Загрузка карты…');
            try {
                const api = await MapLoader.loadMaps();

                if (ticket !== this.version) {
                    return;
                }

                if (!this.maps[name]) {
                    const container = this.dialog.querySelector('[data-pickup-map="' + name + '"]');

                    this.maps[name] = new api.Map(container, {
                        center: this.catalog[0].coords,
                        zoom: 12,
                        controls: ['zoomControl'],
                    });
                    const observer = new ResizeObserver(() => {
                        if (container.offsetWidth && this.currentView === name) {
                            this.maps[name].container.fitToViewport();
                        }
                    });

                    observer.observe(container);
                }
                const map = this.maps[name];

                map.geoObjects.removeAll();
                const shown = name === 'detail' ? [this.active] : this.visiblePoints();

                shown.forEach((point) => {
                    const marker = new api.Placemark(
                        point.coords,
                        {
                            hintContent: point.title,
                        },
                        {
                            iconLayout: 'default#image',
                            iconImageHref: this.dialog.dataset.mapMarker,
                            iconImageSize: [40, 40],
                            iconImageOffset: [-20, -40],
                        },
                    );

                    marker.events.add('click', () => this.detail(point.id));
                    map.geoObjects.add(marker);
                });
                map.container.fitToViewport();
                if (shown.length === 1) {
                    map.setCenter(shown[0].coords, 14);
                } else if (shown.length > 1) {
                    map.setBounds(map.geoObjects.getBounds(), {
                        checkZoomRange: true,
                        zoomMargin: 35,
                    });
                }
                this.status.hidden = true;
            } catch {
                if (ticket !== this.version) {
                    return;
                }

                TextUtils.showMessage(
                    this.status,
                    'Не удалось загрузить карту. Выберите пункт из списка.',
                );
            }
        }

        detail(id) {
            this.active = this.catalog.find((point) => point.id === id);
            if (!this.active) {
                return;
            }

            this.showView('detail');
            this.dialog.querySelector('.pickup-dialog__detail-title').textContent =
                this.active.detailTitle;
            this.dialog.querySelector('.pickup-dialog__address').textContent = this.active.address;
            this.dialog.querySelector('.pickup-dialog__hours').textContent =
                this.active.detailHours;
            this.drawMap('detail');
            this.dialog.querySelector('.pickup-dialog__back').focus();
        }

        filter() {
            const visible = this.visiblePoints();

            this.dialog.querySelectorAll('[data-pickup-id]').forEach((button) => {
                button.hidden = !visible.some((point) => point.id === button.dataset.pickupId);
            });
            this.dialog.querySelector('.pickup-dialog__empty').hidden = !!visible.length;
            if (this.currentView === 'list') {
                this.drawMap('list');
            }
        }

        open(button, id) {
            if (typeof Fancybox === 'undefined') {
                return;
            }

            this.trigger = button;
            this.replacingId = id;
            this.search.value = '';
            this.showView('list');
            this.dialog.querySelectorAll('[data-pickup-id]').forEach((option) => {
                option.hidden = false;
            });
            this.dialog.querySelector('.pickup-dialog__empty').hidden = true;
            Fancybox.show(
                [
                    {
                        src: '#account-pickup-dialog',
                        type: 'inline',
                    },
                ],
                {
                    closeButton: false,
                    dragToClose: false,
                    autoFocus: false,
                    on: {
                        ready: () => {
                            this.drawMap('list');
                            this.search.focus();
                        },
                        destroy: () => {
                            this.version++;
                            const fallback =
                                this.list.querySelector('.addresses__edit') ||
                                this.root.querySelector('.addresses__add');

                            (this.trigger?.isConnected ? this.trigger : fallback)?.focus();
                        },
                    },
                },
            );
            this.modal = Fancybox.getInstance();
        }

        refresh(...args) {
            return this.render(...args);
        }

        backToList() {
            this.showView('list');
            this.drawMap('list');
            const button = this.dialog.querySelector('[data-pickup-id="' + this.active.id + '"]');

            (button && !button.hidden ? button : this.search).focus();
        }

        choosePoint() {
            if (!this.active) {
                return;
            }

            this.points = PickupState.savePickup(this.points, this.active, this.replacingId);
            this.render();
            this.modal?.close();
        }

        selectSavedPoint(event) {
            if (!event.target.matches('.addresses__radio')) {
                return;
            }

            this.points = this.points.map((point) => ({
                ...point,
                selected: point.id === event.target.value,
            }));
        }

        handleSavedPointAction(event) {
            const card = event.target.closest('[data-pickup-card]');

            if (!card) {
                return;
            }

            const id = card.querySelector('input').value;

            if (event.target.closest('.addresses__edit')) {
                this.open(event.target.closest('button'), id);
            }
            if (event.target.closest('.addresses__delete')) {
                this.points = PickupState.removePickup(this.points, id);
                this.render();
                (
                    this.list.querySelector('.addresses__edit') ||
                    this.root.querySelector('.addresses__add')
                ).focus();
            }
        }
    }

    // === account ===

    class AccountController {
        constructor() {
            this.syncLegal = this.syncLegal.bind(this);
            this.setMenu = this.setMenu.bind(this);
            this.showMenu = this.showMenu.bind(this);
            this.showProfile = this.showProfile.bind(this);
            this.handleHashChange = this.handleHashChange.bind(this);
        }

        init() {
            this.root = document.querySelector('[data-account]');

            if (!this.root || this.root.dataset.initialized) {
                return;
            }

            this.root.dataset.initialized = 'true';
            this.profile = this.root.querySelector('[data-account-profile]');
            this.legal = this.profile.elements.legal;
            this.company = this.root.querySelector('#company-fields');

            this.legal.addEventListener('change', this.syncLegal);
            this.syncLegal();

            this.root.querySelector('.page-heading__back').addEventListener('click', this.showMenu);
            this.root
                .querySelector('[data-account-personal]')
                .addEventListener('click', this.showProfile);
            window.addEventListener('hashchange', this.handleHashChange);
            this.setMenu(location.hash === '#menu');
            this.root.querySelectorAll('.account__reveal').forEach((button) => {
                button.addEventListener('click', () => {
                    const input = button.previousElementSibling;
                    const visible = input.type === 'password';

                    input.type = visible ? 'text' : 'password';
                    button.setAttribute('aria-pressed', String(visible));
                    button.setAttribute(
                        'aria-label',
                        visible
                            ? button.dataset.passwordHideLabel
                            : button.dataset.passwordShowLabel,
                    );
                });
            });
            this.root.querySelectorAll('form').forEach((form) => {
                form.addEventListener('reset', () => {
                    form.querySelectorAll('.account__password .account__input').forEach((input) => {
                        input.type = 'password';
                    });
                    form.querySelectorAll('.account__reveal').forEach((button) => {
                        button.setAttribute('aria-pressed', 'false');
                        button.setAttribute('aria-label', button.dataset.passwordShowLabel);
                    });
                    setTimeout(this.syncLegal, 0);
                });
            });

            return this;
        }

        syncLegal() {
            this.company.hidden = !this.legal.checked;
            this.company.disabled = !this.legal.checked;
        }

        setMenu(menu) {
            this.root.classList.toggle('account--menu', menu);
            this.root.querySelector('.page-heading__title').textContent = menu
                ? 'Мой кабинет'
                : 'Личные данные';
        }

        showMenu() {
            history.replaceState(null, '', '#menu');
            this.setMenu(true);
            window.scrollTo(0, 0);
        }

        showProfile() {
            this.setMenu(false);
            window.scrollTo(0, 0);
        }

        handleHashChange() {
            return this.setMenu(location.hash === '#menu');
        }
    }

    // === address-picker ===

    class AddressPicker {
        static describeAddress(address) {
            return {
                title: [address.city, address.street].filter(Boolean).join(', '),
                details: [
                    address.apartment && `Кв. / офис ${address.apartment}`,
                    address.entrance && `подъезд ${address.entrance}`,
                    address.floor && `этаж ${address.floor}`,
                ]
                    .filter(Boolean)
                    .join(' · '),
            };
        }

        constructor() {
            this.setView = this.setView.bind(this);
            this.applyAddress = this.applyAddress.bind(this);
            this.showAddForm = this.showAddForm.bind(this);
            this.showList = this.showList.bind(this);
            this.selectAddress = this.selectAddress.bind(this);
            this.addAddress = this.addAddress.bind(this);
        }

        init(form) {
            this.form = form;
            this.picker = document.querySelector('#address-picker');

            if (!this.picker || this.picker.dataset.initialized) {
                return;
            }

            this.picker.dataset.initialized = 'true';
            this.list = this.picker.querySelector('.address-picker__list');
            this.addForm = this.picker.querySelector('.address-picker__form');
            this.addressFields = ['city', 'street', 'entrance', 'floor', 'apartment'];
            this.selectedId = null;
            this.modal = undefined;
            this.map = new DeliveryMap().init(this.addForm);

            this.form.querySelectorAll('.checkout__change').forEach((button) =>
                button.addEventListener('click', () => {
                    if (typeof Fancybox === 'undefined') {
                        return;
                    }

                    this.setView('list');
                    if (this.selectedId) {
                        this.list.querySelectorAll('.address-picker__radio').forEach((input) => {
                            input.checked = input.value === this.selectedId;
                        });
                    }
                    Fancybox.show(
                        [
                            {
                                src: '#address-picker',
                                type: 'inline',
                            },
                        ],
                        {
                            closeButton: false,
                            dragToClose: false,
                            autoFocus: false,
                            on: {
                                done: () =>
                                    this.picker
                                        .querySelector('.address-picker__radio:checked')
                                        ?.focus(),
                                destroy: () =>
                                    (button.hidden
                                        ? this.form.querySelector(
                                              '.checkout__selected-address .checkout__change',
                                          )
                                        : button
                                    ).focus(),
                            },
                        },
                    );
                    this.modal = Fancybox.getInstance();
                }),
            );
            this.picker
                .querySelector('.address-picker__add')
                .addEventListener('click', this.showAddForm);
            this.picker
                .querySelector('.address-picker__back')
                .addEventListener('click', this.showList);
            this.picker
                .querySelector('.address-picker__selection')
                .addEventListener('submit', this.selectAddress);
            this.addForm.addEventListener('submit', this.addAddress);

            return this;
        }

        setView(name) {
            this.picker.querySelectorAll('[data-address-view]').forEach((view) => {
                view.hidden = view.dataset.addressView !== name;
            });
            this.picker.setAttribute(
                'aria-labelledby',
                name === 'add' ? 'address-add-title' : 'address-picker-title',
            );
        }

        applyAddress(input) {
            const address = input.dataset;
            const description = AddressPicker.describeAddress(address);

            this.selectedId = input.value;
            this.addressFields.forEach((name) => {
                this.form.elements[name].value = address[name] || '';
                this.form.elements[name].required = false;
            });
            this.form.querySelector('.checkout__selected-title').textContent = description.title;
            this.form.querySelector('.checkout__selected-details').textContent =
                description.details;
            this.form.querySelector('.checkout__selected-details').hidden = !description.details;
            this.form.querySelector('.checkout__selected-address').hidden = false;
            this.form.querySelector('.checkout__address-fields').hidden = true;
            this.form.querySelector('.checkout__address > .checkout__change').hidden = true;
            this.form.querySelector('.checkout__save').hidden = true;
            this.modal?.close();
        }

        showAddForm() {
            this.addForm.reset();
            this.map?.reset();
            this.setView('add');
            this.addForm.elements.city.focus();
        }

        showList() {
            this.setView('list');
            this.picker.querySelector('.address-picker__add').focus();
        }

        selectAddress(event) {
            event.preventDefault();
            const input = this.list.querySelector('.address-picker__radio:checked');

            if (input) {
                this.applyAddress(input);
            }
        }

        addAddress(event) {
            event.preventDefault();
            if (!window.FormController.validateForm(this.addForm)) {
                return;
            }

            const address = Object.fromEntries(
                this.addressFields.map((name) => [name, this.addForm.elements[name].value.trim()]),
            );

            if (!address.city || !address.street) {
                const field = this.addForm.elements[address.city ? 'street' : 'city'];

                field.value = '';
                window.FormController.validateField(field);

                return;
            }
            const card = this.list.querySelector('.address-picker__card').cloneNode(true);
            const input = card.querySelector('.address-picker__radio');

            input.value = `address-${this.list.children.length + 1}`;
            Object.assign(input.dataset, address);
            const description = AddressPicker.describeAddress(address);

            card.querySelector('.address-picker__card-title').textContent = description.title;
            card.querySelector('.address-picker__card-details').textContent = description.details;
            this.list.append(card);
            input.checked = true;
            this.applyAddress(input);
        }
    }

    // === addresses ===

    class AddressesController {
        constructor() {
            this.report = this.report.bind(this);
            this.empty = this.empty.bind(this);
            this.fillCard = this.fillCard.bind(this);
            this.view = this.view.bind(this);
            this.open = this.open.bind(this);
            this.activate = this.activate.bind(this);
            this.add = this.add.bind(this);
            this.handleAddressAction = this.handleAddressAction.bind(this);
            this.saveAddress = this.saveAddress.bind(this);
            this.backToForm = this.backToForm.bind(this);
            this.chooseMapAddress = this.chooseMapAddress.bind(this);
            this.showMap = this.showMap.bind(this);
        }

        init() {
            this.root = document.querySelector('[data-addresses]');

            if (!this.root || this.root.dataset.initialized) {
                return;
            }

            this.root.dataset.initialized = 'true';
            this.list = this.root.querySelector('#delivery-addresses');
            this.template = this.list?.querySelector('[data-address-card]')?.cloneNode(true);
            this.dialog = document.querySelector('#address-dialog');

            if (!this.template || !this.dialog) {
                return;
            }

            this.pickups = new AccountPickups().init(this.root);
            this.form = this.dialog.querySelector('form');
            this.title = this.dialog.querySelector('#address-dialog-title');
            this.submit = this.dialog.querySelector('.address-dialog__submit');
            this.status = this.root.querySelector('.addresses__status');
            this.fields = ['city', 'street', 'entrance', 'floor', 'apartment', 'comment'];
            this.editing = null;
            this.trigger = undefined;
            this.modal = undefined;
            this.map = undefined;
            this.mapAddress = undefined;
            this.request = 0;

            this.empty();

            this.dialog.querySelector('[data-dialog-view="map"] .address-dialog__title').id =
                'address-map-title';

            this.root.querySelector('.addresses__add').addEventListener('click', this.add);
            this.list.addEventListener('change', this.empty);
            this.list.addEventListener('click', this.handleAddressAction);
            this.form.addEventListener('submit', this.saveAddress);
            this.tabs = [...this.root.querySelectorAll('[data-address-tab]')];

            this.tabs.forEach((tab, index) => {
                tab.addEventListener('click', () => this.activate(tab));
                tab.addEventListener('keydown', (event) => {
                    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
                        return;
                    }

                    event.preventDefault();
                    const next =
                        this.tabs[
                            event.key === 'Home'
                                ? 0
                                : event.key === 'End'
                                  ? this.tabs.length - 1
                                  : (index + 1) % this.tabs.length
                        ];

                    this.activate(next);
                    next.focus();
                });
            });
            if (location.hash === '#pickup') {
                this.activate(this.tabs.find((tab) => tab.dataset.addressTab === 'pickup'));
            }
            this.dialog
                .querySelector('.address-dialog__back')
                .addEventListener('click', this.backToForm);
            this.dialog
                .querySelector('.address-dialog__choose')
                .addEventListener('click', this.chooseMapAddress);
            this.dialog
                .querySelector('.address-dialog__map-toggle')
                .addEventListener('click', this.showMap);

            return this;
        }

        report(message) {
            this.status.textContent = message;
            this.status.hidden = false;
        }

        empty() {
            this.root.querySelector('[data-address-empty]').hidden =
                !!this.list.children.length ||
                this.root.querySelector('#delivery-addresses').hidden;
        }

        fillCard(card, address) {
            const input = card.querySelector('input');

            this.fields.forEach((name) => {
                input.dataset[name] = address[name] || '';
            });
            input.value = address.id;
            input.checked = !!address.selected;
            card.querySelector('.addresses__name').textContent = [address.city, address.street]
                .filter(Boolean)
                .join(', ');
            card.querySelector('.addresses__details').textContent = [
                address.entrance && 'Подъезд ' + address.entrance,
                address.floor && 'этаж ' + address.floor,
                address.apartment && 'кв. ' + address.apartment,
                address.postcode && 'индекс ' + address.postcode,
                address.comment,
            ]
                .filter(Boolean)
                .join(', ');
            input.dataset.postcode = address.postcode || '';

            return card;
        }

        view(name) {
            this.request++;
            this.dialog.classList.toggle('address-dialog--map', name === 'map');
            this.dialog.querySelectorAll('[data-dialog-view]').forEach((part) => {
                part.hidden = part.dataset.dialogView !== name;
            });
            this.dialog.setAttribute(
                'aria-labelledby',
                name === 'form' ? 'address-dialog-title' : 'address-map-title',
            );
        }

        open(button, card = null) {
            if (typeof Fancybox === 'undefined') {
                return;
            }

            this.trigger = button;
            this.editing = card;
            this.form.reset();
            this.fields.forEach((name) => {
                this.form.elements[name].value = card?.querySelector('input').dataset[name] || '';
            });
            this.title.textContent = card
                ? 'Редактировать адрес доставки'
                : 'Добавить новый адрес доставки';
            this.submit.textContent = card ? 'Сохранить изменения' : 'Добавить новый адрес';
            this.view('form');
            Fancybox.show(
                [
                    {
                        src: '#address-dialog',
                        type: 'inline',
                    },
                ],
                {
                    closeButton: false,
                    dragToClose: false,
                    autoFocus: false,
                    on: {
                        ready: () => this.form.elements.city.focus(),
                        destroy: () => {
                            this.request++;
                            this.trigger?.focus();
                        },
                    },
                },
            );
            this.modal = Fancybox.getInstance();
        }

        activate(tab) {
            this.tabs.forEach((button) => {
                const selected = button === tab;

                button.setAttribute('aria-selected', String(selected));
                button.tabIndex = selected ? 0 : -1;
                this.root.querySelector('#' + button.getAttribute('aria-controls')).hidden =
                    !selected;
            });
            const pickup = tab.dataset.addressTab === 'pickup';

            this.root.classList.toggle('addresses--pickup', pickup);
            this.root.querySelector('.addresses__add').textContent = pickup
                ? 'Добавить пункт выдачи'
                : 'Добавить новый адрес';
            this.root.querySelector('.addresses__title').textContent = pickup
                ? 'Адреса и пункты выдачи'
                : 'Адреса доставки';
            this.status.hidden = true;
            this.pickups?.refresh();
            this.empty();
        }

        add(event) {
            if (
                this.root
                    .querySelector('[data-address-tab="pickup"]')
                    .getAttribute('aria-selected') === 'true'
            ) {
                this.pickups?.open(event.currentTarget);
            } else {
                this.open(event.currentTarget);
            }
        }

        handleAddressAction(event) {
            const card = event.target.closest('[data-address-card]');

            if (!card) {
                return;
            }

            if (event.target.closest('.addresses__edit')) {
                this.open(event.target.closest('button'), card);
            }
            if (event.target.closest('.addresses__delete')) {
                const checked = card.querySelector('input').checked;

                card.remove();
                if (checked && this.list.querySelector('input')) {
                    this.list.querySelector('input').checked = true;
                }
                this.empty();
                this.report('Адрес удалён.');
                (
                    this.list.querySelector('.addresses__edit') ||
                    this.root.querySelector('.addresses__add')
                ).focus();
            }
        }

        saveAddress(event) {
            event.preventDefault();
            this.fields.forEach((name) => {
                this.form.elements[name].value = this.form.elements[name].value.trim();
            });
            if (!window.FormController.validateForm(this.form)) {
                return;
            }

            const address = Object.fromEntries(new FormData(this.form));

            address.id = this.editing?.querySelector('input').value || String(Date.now());
            address.postcode = this.editing?.querySelector('input').dataset.postcode || '';
            address.selected = this.editing ? this.editing.querySelector('input').checked : true;
            if (address.selected) {
                this.list.querySelectorAll('input').forEach((input) => {
                    input.checked = false;
                });
            }
            if (this.editing) {
                this.fillCard(this.editing, address);
            } else {
                this.list.append(this.fillCard(this.template.cloneNode(true), address));
            }
            this.empty();
            this.modal?.close();
        }

        backToForm() {
            this.view('form');
            this.form.elements.city.focus();
        }

        chooseMapAddress() {
            if (!this.mapAddress) {
                return;
            }

            this.form.elements.city.value = this.mapAddress.city;
            this.form.elements.street.value = this.mapAddress.street;
            this.view('form');
            this.form.elements.street.focus();
        }

        async showMap() {
            this.view('map');
            this.mapAddress = null;
            const choose = this.dialog.querySelector('.address-dialog__choose');
            const message = this.dialog.querySelector('.address-dialog__status');

            choose.disabled = true;
            TextUtils.showMessage(
                this.dialog.querySelector('.address-dialog__selected'),
                'Выберите точку на карте',
            );
            TextUtils.showMessage(message, 'Загрузка карты…');
            const current = this.request;
            try {
                const api = await MapLoader.loadMaps();

                if (current !== this.request) {
                    return;
                }

                if (!this.map) {
                    this.map = new api.Map(this.dialog.querySelector('.address-dialog__map'), {
                        center: this.dialog
                            .querySelector('.address-dialog__map')
                            .dataset.mapCenter.split(',')
                            .map(Number),
                        zoom: 13,
                        controls: ['zoomControl'],
                    });
                    this.map.events.add('click', async (event) => {
                        const pending = ++this.request;

                        choose.disabled = true;
                        const coords = event.get('coords');

                        TextUtils.showMessage(message, 'Определяем адрес…');
                        try {
                            const result = await api.geocode(coords);

                            if (pending !== this.request) {
                                return;
                            }

                            const place = result.geoObjects.get(0);
                            const city =
                                place?.getLocalities()[0] || place?.getAdministrativeAreas()[0];
                            const street = [place?.getThoroughfare(), place?.getPremiseNumber()]
                                .filter(Boolean)
                                .join(', ');

                            if (!city || !street) {
                                throw new Error('No street address');
                            }

                            this.mapAddress = {
                                city,
                                street,
                            };
                            this.map.geoObjects.removeAll();
                            this.map.geoObjects.add(
                                new api.Placemark(
                                    coords,
                                    {},
                                    {
                                        preset: 'islands#orangeDotIcon',
                                    },
                                ),
                            );
                            this.dialog.querySelector('.address-dialog__selected').textContent =
                                city + ', ' + street;
                            message.textContent = '';
                            choose.disabled = false;
                        } catch {
                            if (pending === this.request) {
                                TextUtils.showMessage(
                                    message,
                                    'Не удалось определить адрес. Выберите другую точку или введите адрес вручную.',
                                );
                            }
                        }
                    });
                }
                this.map.container.fitToViewport();
                TextUtils.showMessage(message, 'Нажмите на карте, чтобы выбрать адрес.');
            } catch {
                if (current === this.request) {
                    TextUtils.showMessage(
                        message,
                        'Не удалось загрузить карту. Вернитесь к вводу адреса вручную.',
                    );
                }
            }
        }
    }

    // === auth-dialogs ===

    class AuthDialogs {
        static validateFieldValue(name, value) {
            if (name === 'agreement') {
                return value ? '' : 'agreement';
            }

            if (!String(value).trim()) {
                return 'required';
            }

            if (name === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim())) {
                return 'email';
            }

            if (name === 'phone' && !/^7\d{10}$/.test(TextUtils.digits(value))) {
                return 'tel';
            }

            if (name === 'code' && !/^\d{4}$/.test(value)) {
                return 'code';
            }

            return '';
        }

        constructor() {
            this.validate = this.validate.bind(this);
            this.focusView = this.focusView.bind(this);
            this.switchView = this.switchView.bind(this);
            this.switchMethod = this.switchMethod.bind(this);
            this.resetCode = this.resetCode.bind(this);
            this.showCodeInput = this.showCodeInput.bind(this);
            this.open = this.open.bind(this);
            this.handleAction = this.handleAction.bind(this);
            this.handleTabKeydown = this.handleTabKeydown.bind(this);
            this.handleInput = this.handleInput.bind(this);
            this.handleChange = this.handleChange.bind(this);
            this.submit = this.submit.bind(this);
        }

        init() {
            this.root = document.querySelector('#sign-in.auth-dialog');

            if (!this.root || this.root.dataset.initialized) {
                return;
            }

            this.root.dataset.initialized = 'true';
            this.forms = Object.fromEntries(
                [...this.root.querySelectorAll('[data-auth-form]')].map((form) => [
                    form.dataset.authForm,
                    form,
                ]),
            );
            this.codePhones = {};
            this.view = 'login';
            this.method = 'email';
            this.opener = undefined;

            document.addEventListener('click', this.open);
            this.root.addEventListener('click', this.handleAction);
            this.root.addEventListener('keydown', this.handleTabKeydown);
            this.root.addEventListener('input', this.handleInput);
            this.root.addEventListener('change', this.handleChange);
            this.root.addEventListener('submit', this.submit);

            return this;
        }

        validate(input) {
            return window.FormController.validateField(input);
        }

        focusView() {
            return this.forms[this.view === 'login' ? this.method : this.view]
                .querySelector('input:not(:disabled)')
                ?.focus({
                    preventScroll: true,
                });
        }

        switchView(name) {
            if (!['login', 'register', 'recovery'].includes(name)) {
                return;
            }

            this.view = name;
            this.root.querySelectorAll('[data-auth-view]').forEach((panel) => {
                panel.hidden = panel.dataset.authView !== name;
            });
            this.root.classList.toggle('auth-dialog--recovery', name === 'recovery');
            this.root.setAttribute(
                'aria-labelledby',
                name === 'login' ? 'auth-title' : `auth-${name}-title`,
            );
            if (name === 'recovery') {
                this.forms.recovery.elements.email.value = this.forms.email.elements.email.value;
                this.root.querySelector('.auth-dialog__email').textContent =
                    this.forms.recovery.elements.email.value.trim();
            }
            this.focusView();
        }

        switchMethod(name) {
            this.method = name;
            this.root.querySelectorAll('[data-auth-tab]').forEach((tab) => {
                const active = tab.dataset.authTab === name;

                tab.setAttribute('aria-selected', String(active));
                tab.tabIndex = active ? 0 : -1;
            });
            this.forms.email.hidden = name !== 'email';
            this.forms.phone.hidden = name !== 'phone';
            this.forms[name].querySelector('input').focus();
        }

        resetCode(name) {
            delete this.codePhones[name];
            const form = this.forms[name];

            form.elements.code.value = '';
            window.FormController.toggleErrorState(form.elements.code, false);
            if (name === 'register') {
                form.querySelector('.auth-dialog__get-code').hidden = false;
                form.querySelector('.auth-dialog__field--code').hidden = true;
                form.querySelector('.auth-dialog__code-note').hidden = true;
                form.elements.code.disabled = true;
            }
        }

        showCodeInput(name) {
            const form = this.forms[name];
            if (!this.validate(form.elements.phone)) {
                form.elements.phone.focus();
                return;
            }
            this.codePhones[name] = TextUtils.digits(form.elements.phone.value);
            form.elements.code.value = '';
            if (name === 'register') {
                form.querySelector('.auth-dialog__get-code').hidden = true;
                form.querySelector('.auth-dialog__field--code').hidden = false;
                form.querySelector('.auth-dialog__code-note').hidden = false;
                form.elements.code.disabled = false;
            }
            form.elements.code.focus();
        }

        open(event) {
            const trigger = event.target.closest('[data-auth-open]');

            if (!trigger) {
                return;
            }

            event.preventDefault();
            if (typeof Fancybox === 'undefined') {
                return;
            }

            this.opener = trigger;
            window.SearchController?.closeSearch();
            this.switchView('login');
            this.switchMethod('email');
            Fancybox.show(
                [
                    {
                        src: '#sign-in',
                        type: 'inline',
                    },
                ],
                {
                    closeButton: false,
                    dragToClose: false,
                    autoFocus: true,
                    triggerEl: trigger,
                    on: {
                        done: this.focusView,
                        destroy: () => {
                            this.root.querySelectorAll('[data-auth-password]').forEach((button) => {
                                button
                                    .closest('.auth-dialog__password')
                                    .querySelector('input').type = 'password';
                                button.setAttribute('aria-pressed', 'false');
                                button.setAttribute('aria-label', button.dataset.passwordShowLabel);
                            });
                            this.opener?.focus({
                                preventScroll: true,
                            });
                        },
                    },
                },
            );
        }

        handleAction(event) {
            const go = event.target.closest('[data-auth-go]');

            if (go) {
                this.switchView(go.dataset.authGo);
            }
            const tab = event.target.closest('[data-auth-tab]');

            if (tab) {
                this.switchMethod(tab.dataset.authTab);
            }
            const send = event.target.closest('[data-auth-send]');

            if (send) {
                this.showCodeInput(send.dataset.authSend);
            }
            const toggle = event.target.closest('[data-auth-password]');

            if (toggle) {
                const input = toggle.closest('.auth-dialog__password').querySelector('input');
                const visible = input.type === 'password';

                input.type = visible ? 'text' : 'password';
                toggle.setAttribute('aria-pressed', String(visible));
                toggle.setAttribute(
                    'aria-label',
                    visible ? toggle.dataset.passwordHideLabel : toggle.dataset.passwordShowLabel,
                );
            }
        }

        handleTabKeydown(event) {
            if (
                !event.target.matches('[data-auth-tab]') ||
                !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)
            ) {
                return;
            }

            event.preventDefault();
            const name =
                event.key === 'Home'
                    ? 'email'
                    : event.key === 'End'
                      ? 'phone'
                      : this.method === 'email'
                        ? 'phone'
                        : 'email';

            this.switchMethod(name);
            this.root.querySelector(`[data-auth-tab="${name}"]`).focus();
        }

        handleInput(event) {
            const input = event.target;

            if (!input.matches('input')) {
                return;
            }

            const name = input.form.dataset.authForm;

            if (input.name === 'code') {
                input.value = TextUtils.digits(input.value).slice(0, 4);
            }
            if (
                input.name === 'phone' &&
                this.codePhones[name] &&
                this.codePhones[name] !== TextUtils.digits(input.value)
            ) {
                this.resetCode(name);
            }
            if (input.getAttribute('aria-invalid') === 'true') {
                this.validate(input);
            }
            if (name === 'recovery') {
                this.root.querySelector('.auth-dialog__email').textContent = input.value.trim();
            }
        }

        handleChange(event) {
            if (event.target.type === 'checkbox') {
                this.validate(event.target);
            }
        }

        submit(event) {
            const form = event.target;
            let firstInvalid;
            form.querySelectorAll('input[required]:not(:disabled)').forEach((input) => {
                if (!this.validate(input)) {
                    firstInvalid ||= input;
                }
            });
            if (firstInvalid) {
                event.preventDefault();
                firstInvalid.focus();
            }
        }
    }

    // === cart ===

    class CartController {
        static calculateCart(items) {
            return items.reduce(
                (result, item) => ({
                    total: result.total + item.price * item.quantity,
                    discount:
                        result.discount + Math.max(0, item.oldPrice - item.price) * item.quantity,
                    quantity: result.quantity + item.quantity,
                    weight: Math.round((result.weight + item.weight * item.quantity) * 100) / 100,
                }),
                {
                    total: 0,
                    discount: 0,
                    quantity: 0,
                    weight: 0,
                },
            );
        }

        static initAll() {
            document
                .querySelectorAll('.cart')
                .forEach((element) => new CartController().init(element));
        }

        constructor() {
            this.rows = this.rows.bind(this);
            this.announce = this.announce.bind(this);
            this.readItem = this.readItem.bind(this);
            this.selectAccessory = this.selectAccessory.bind(this);
            this.update = this.update.bind(this);
            this.initSlider = this.initSlider.bind(this);
            this.handleClick = this.handleClick.bind(this);
            this.handleQuantityInput = this.handleQuantityInput.bind(this);
            this.share = this.share.bind(this);
        }

        init(element) {
            this.element = element;
            if (this.element.dataset.cartReady) {
                return;
            }

            this.element.dataset.cartReady = 'true';

            this.message = this.element.querySelector('.cart__message');

            this.element.querySelectorAll('.cart__recommendations').forEach((details) => {
                if (details.open) {
                    const accessory = details.querySelector('.cart-accessory');

                    if (accessory) {
                        this.selectAccessory(accessory, true);
                    }
                }
                details.addEventListener('toggle', () => this.initSlider(details));
                this.initSlider(details);
            });
            this.element.addEventListener('click', this.handleClick);
            this.element.addEventListener('input', this.handleQuantityInput);
            this.element.querySelector('.cart__share')?.addEventListener('click', this.share);

            this.element.querySelectorAll('.cart__total-order').forEach((button) =>
                button.addEventListener('click', (event) => {
                    if (button.getAttribute('aria-disabled') === 'true') {
                        event.preventDefault();
                    }
                }),
            );
            if (this.element.querySelector('[data-cart-total]')) {
                this.update();
            }

            return this;
        }

        rows() {
            return [...this.element.querySelectorAll('[data-cart-item]')];
        }

        announce(text) {
            if (!this.message) {
                return;
            }

            this.message.hidden = false;
            this.message.textContent = text;
        }

        readItem(row, quantity = 1) {
            return {
                price: Number(row.dataset.price),
                oldPrice: Number(row.dataset.oldPrice),
                weight: Number(row.dataset.weight),
                quantity,
            };
        }

        selectAccessory(accessory, selected) {
            const button = accessory.querySelector('.cart-accessory__add');

            accessory.dataset.selected = String(selected);
            button.setAttribute('aria-pressed', String(selected));
            button.setAttribute(
                'aria-label',
                (selected ? 'Убрать из корзины: ' : 'Добавить: ') +
                    accessory.querySelector('.cart-accessory__name').textContent,
            );
            const icon = button.querySelector('.cart-accessory__icon');

            icon.classList.toggle('icon-cart', !selected);
            icon.textContent = selected ? '✓' : '';
        }

        update() {
            if (!this.element.querySelector('[data-cart-total]')) {
                return;
            }

            const items = [];

            this.rows().forEach((row) => {
                const input = row.querySelector('.quantity-block__input');
                const quantity = Math.min(9999, Math.max(1, parseInt(input.value, 10) || 1));

                input.value = quantity;
                items.push(this.readItem(row, quantity));
                row.querySelector('.cart-item__current').textContent = TextUtils.money(
                    Number(row.dataset.price) * quantity,
                );
                row.querySelectorAll('.cart-accessory[data-selected="true"]').forEach((accessory) =>
                    items.push(this.readItem(accessory)),
                );
            });
            const totals = CartController.calculateCart(items);

            this.element.querySelector('[data-cart-total]').textContent = TextUtils.money(
                totals.total,
            );
            this.element.querySelector('[data-cart-subtotal]').textContent = TextUtils.money(
                totals.total + totals.discount,
            );
            this.element.querySelector('[data-cart-discount]').textContent =
                '−' + TextUtils.money(totals.discount);
            this.element.querySelector('[data-cart-count]').textContent =
                totals.quantity + ' ' + TextUtils.productWord(totals.quantity);
            document
                .querySelectorAll('.main-actions__item.icon-cart .main-actions__quanitity')
                .forEach((badge) => {
                    badge.textContent = totals.quantity;
                    badge.hidden = totals.quantity === 0;
                });
            this.element.querySelector('[data-cart-weight]').textContent =
                totals.weight.toLocaleString('ru-RU', {
                    maximumFractionDigits: 2,
                }) + ' кг';
            this.element.querySelector('.cart__empty').hidden = this.rows().length > 0;
            const checkout = this.element.querySelector('.cart__total-order');

            if (checkout) {
                const empty = this.rows().length === 0;

                checkout.disabled = empty;
                checkout.setAttribute('aria-disabled', String(empty));
                if (checkout.tagName === 'A') {
                    if (empty) {
                        checkout.removeAttribute('href');
                    } else {
                        checkout.setAttribute('href', 'checkout.html');
                    }
                    checkout.tabIndex = empty ? -1 : 0;
                }
            }
        }

        initSlider(details) {
            const slider = details.querySelector('.swiper');

            if (!details.open || !slider || typeof Swiper === 'undefined') {
                return;
            }

            if (slider.swiper) {
                slider.swiper.update();

                return;
            }
            new Swiper(slider, {
                slidesPerView: 1,
                spaceBetween: 10,
                watchOverflow: true,
                a11y: {
                    prevSlideMessage: 'Предыдущая рекомендация',
                    nextSlideMessage: 'Следующая рекомендация',
                },
                breakpoints: {
                    576: {
                        slidesPerView: 2,
                    },
                },
                navigation: {
                    prevEl: slider.querySelector('.swiper-button-prev'),
                    nextEl: slider.querySelector('.swiper-button-next'),
                },
            });
        }

        handleClick(event) {
            const remove = event.target.closest('.cart-item__remove');

            if (remove) {
                const row = remove.closest('[data-cart-item]');

                row.querySelectorAll('.swiper').forEach((slider) => slider.swiper?.destroy());
                row.remove();
                this.update();

                return;
            }
            const add = event.target.closest('.cart-accessory__add');

            if (add) {
                const accessory = add.closest('.cart-accessory');
                const selected = accessory.dataset.selected !== 'true';

                this.selectAccessory(accessory, selected);
                this.update();
                if (selected) {
                    window.NotifyController?.show(
                        accessory.querySelector('.cart-accessory__name').textContent.trim(),
                        1,
                        'cart',
                    );
                }
            }
            if (event.target.closest('.quantity-block__up, .quantity-block__down')) {
                this.update();
            }
        }

        handleQuantityInput(event) {
            if (event.target.matches('.quantity-block__input')) {
                this.update();
            }
        }

        async share() {
            try {
                await navigator.clipboard.writeText(window.location.href);
                this.announce('Ссылка на корзину скопирована.');
                window.NotifyController?.show(window.location.href, 1, 'cart-share');
            } catch {
                this.announce('Ссылка на корзину: ' + window.location.href);
            }
        }
    }

    // === pickup-picker ===

    class PickupPicker {
        constructor() {
            this.inputs = this.inputs.bind(this);
            this.setView = this.setView.bind(this);
            this.updateDelivery = this.updateDelivery.bind(this);
            this.applyPoint = this.applyPoint.bind(this);
            this.validate = this.validate.bind(this);
            this.open = this.open.bind(this);
            this.showAddForm = this.showAddForm.bind(this);
            this.showList = this.showList.bind(this);
            this.selectPoint = this.selectPoint.bind(this);
            this.addPoint = this.addPoint.bind(this);
        }

        init(form) {
            this.form = form;
            this.picker = document.querySelector('#pickup-picker');

            if (!this.picker || this.picker.dataset.initialized) {
                return null;
            }

            this.picker.dataset.initialized = 'true';
            this.block = this.form.querySelector('.checkout__pickup');
            this.address = this.form.querySelector('.checkout__address');
            this.trigger = this.block.querySelector('.checkout__pickup-button');
            this.error = this.block.querySelector('.checkout__pickup-error');
            this.list = this.picker.querySelector('.address-picker__list');
            this.addForm = this.picker.querySelector('.address-picker__point-form');

            this.defaultId = this.inputs().find((input) => input.checked)?.value;
            this.map = new DeliveryMap().init(this.addForm);
            this.selectedId = '';
            this.nextId = 0;
            this.modal = undefined;

            this.form
                .querySelectorAll('[name="delivery"]')
                .forEach((input) => input.addEventListener('change', this.updateDelivery));
            this.updateDelivery();
            this.trigger.addEventListener('click', this.open);
            this.picker
                .querySelector('.address-picker__add')
                .addEventListener('click', this.showAddForm);
            this.picker
                .querySelector('.address-picker__back')
                .addEventListener('click', this.showList);
            this.picker
                .querySelector('.address-picker__pickup-form')
                .addEventListener('submit', this.selectPoint);
            this.addForm.addEventListener('submit', this.addPoint);

            return this;
        }

        inputs() {
            return [...this.list.querySelectorAll('.address-picker__radio')];
        }

        setView(name) {
            this.picker.querySelectorAll('[data-pickup-view]').forEach((view) => {
                view.hidden = view.dataset.pickupView !== name;
            });
            this.picker.classList.toggle('address-picker--adding', name === 'add');
            this.picker.setAttribute(
                'aria-labelledby',
                name === 'add' ? 'pickup-add-title' : 'pickup-picker-title',
            );
        }

        updateDelivery() {
            const pickup = this.form.elements.delivery.value === 'ozon';

            this.address.hidden = pickup;
            this.block.hidden = !pickup;
            this.address.querySelectorAll('input').forEach((input) => {
                input.disabled = pickup;
            });
            this.block.querySelectorAll('input').forEach((input) => {
                input.disabled = !pickup;
            });
            this.error.hidden = true;
        }

        applyPoint(input) {
            this.selectedId = input.value;
            this.form.elements.pickup_point.value = this.selectedId;
            this.form.elements.pickup_point_address.value = input.dataset.address;
            this.block.classList.add('checkout__pickup--selected');
            TextUtils.showMessage(
                this.block.querySelector('.checkout__pickup-title'),
                'Пункт выдачи Озон',
            );
            this.block.querySelector('.checkout__pickup-description').hidden = true;
            this.block.querySelector('.checkout__pickup-selected').hidden = false;
            this.block.querySelector('.checkout__pickup-selected-title').textContent =
                input.dataset.address;
            this.block.querySelector('.checkout__pickup-hours').textContent =
                input.dataset.hours || 'Ежедневно, 09:00-22:00';
            TextUtils.showMessage(
                this.trigger.querySelector('.checkout__pickup-button-text'),
                'Изменить пункт выдачи',
            );
            this.error.hidden = true;
            this.modal?.close();
        }

        validate() {
            const valid = this.form.elements.delivery.value !== 'ozon' || Boolean(this.selectedId);

            this.error.hidden = valid;
            if (!valid) {
                this.trigger.focus();
            }

            return valid;
        }

        open() {
            if (typeof Fancybox === 'undefined') {
                return;
            }

            this.inputs().forEach((input) => {
                input.checked = input.value === (this.selectedId || this.defaultId);
            });
            this.setView('list');
            Fancybox.show(
                [
                    {
                        src: '#pickup-picker',
                        type: 'inline',
                    },
                ],
                {
                    closeButton: false,
                    dragToClose: false,
                    autoFocus: false,
                    on: {
                        ready: () =>
                            this.picker.querySelector('.address-picker__radio:checked')?.focus(),
                        destroy: () => {
                            this.map?.reset();
                            this.trigger.focus();
                        },
                    },
                },
            );
            this.modal = Fancybox.getInstance();
        }

        showAddForm() {
            this.addForm.reset();
            this.map?.reset();
            this.setView('add');
            this.addForm.elements.city.focus();
        }

        showList() {
            this.map?.reset();
            this.setView('list');
            this.picker.querySelector('.address-picker__add').focus();
        }

        selectPoint(event) {
            event.preventDefault();
            const input = this.inputs().find((input) => input.checked);

            if (input) {
                this.applyPoint(input);
            }
        }

        addPoint(event) {
            event.preventDefault();
            for (const name of ['city', 'street']) {
                this.addForm.elements[name].value = this.addForm.elements[name].value.trim();
            }
            if (!window.FormController.validateForm(this.addForm)) {
                return;
            }

            const title = `${this.addForm.elements.city.value}, ${this.addForm.elements.street.value}`;
            const key = (value) => value.toLocaleLowerCase('ru').replace(/\s+/g, ' ').trim();
            let input = this.inputs().find((item) => key(item.dataset.address) === key(title));

            if (!input) {
                const card = this.list.querySelector('.address-picker__card').cloneNode(true);

                input = card.querySelector('.address-picker__radio');
                input.value = `ozon-custom-${++this.nextId}`;
                input.dataset.address = title;
                input.dataset.hours = 'Ежедневно, 09:00-22:00';
                card.querySelector('.address-picker__card-title').textContent = title;
                this.list.append(card);
            }
            input.checked = true;
            this.applyPoint(input);
        }
    }

    // === checkout ===

    class CheckoutController {
        constructor() {
            this.submit = this.submit.bind(this);
        }

        init() {
            this.form = document.querySelector('#checkout-form');

            if (!this.form || this.form.dataset.initialized) {
                return;
            }

            this.form.dataset.initialized = 'true';

            new AddressPicker().init(this.form);
            this.pickup = new PickupPicker().init(this.form);
            this.form.addEventListener('submit', this.submit);

            return this;
        }

        submit(event) {
            if (this.pickup && !this.pickup.validate()) {
                event.preventDefault();
                return;
            }
            if (!window.FormController.validateForm(this.form)) {
                event.preventDefault();
            }
        }
    }

    // === comparing ===

    class ComparisonController {
        static comparisonRows(rows, activeIds, mode = 'all') {
            return rows.map((row) => {
                const values = activeIds.map((index) => row.values[index] ?? '—');
                const different = new Set(values).size > 1;
                return {
                    ...row,
                    values,
                    visible: mode === 'all' || (mode === 'different' ? different : !different),
                };
            });
        }

        static initAll() {
            document
                .querySelectorAll('.comparing')
                .forEach((root) => new ComparisonController().init(root));
        }

        constructor() {
            this.updateRows = this.updateRows.bind(this);
            this.updateSticky = this.updateSticky.bind(this);
            this.requestSticky = this.requestSticky.bind(this);
            this.beginComparisonGesture = this.beginComparisonGesture.bind(this);
            this.setFilter = this.setFilter.bind(this);
            this.updateEmpty = this.updateEmpty.bind(this);
            this.handlePointerDown = this.handlePointerDown.bind(this);
            this.handleTouchStart = this.handleTouchStart.bind(this);
            this.handleChange = this.handleChange.bind(this);
            this.handleClick = this.handleClick.bind(this);
            this.handleResize = this.handleResize.bind(this);
        }

        init(root) {
            const controller = this;
            this.root = root;
            if (this.root.dataset.initialized || typeof Swiper === 'undefined') {
                return;
            }

            this.root.dataset.initialized = 'true';
            this.body = this.root.querySelector('.comparing__body');
            this.panel = this.root.querySelector('.comparing__panel');
            this.anchor = this.root.querySelector('.comparing__anchor');
            this.empty = this.root.querySelector('.comparing__empty');
            this.important = this.root.querySelector('.comparing__important-rows');
            this.rowElements = [
                ...this.root.querySelectorAll('.comparing__content .comparing__block'),
            ];
            this.rows = this.rowElements.map((element) => ({
                element,
                key: element.dataset.parameter,
                values: JSON.parse(element.dataset.values),
            }));
            this.items = [
                ...this.root.querySelector('[data-compare-column="desktop"] .swiper-wrapper')
                    .children,
            ];
            this.ids = this.items.map((item) => item.dataset.compareId);
            this.activeIds = this.ids.map((id, index) => index);
            this.desktopQuery = window.matchMedia('(min-width: 1199.98px)');
            this.mode = 'all';
            this.populatedCategory = this.root.querySelector(
                '[data-compare-category].is-active',
            ).dataset.compareCategory;
            this.category = this.populatedCategory;
            this.frame = 0;
            this.naturalHeight = 0;
            this.desktop = undefined;
            this.columns = [];

            this.root.querySelectorAll('[data-compare-column]').forEach((column) => {
                const isDesktop = column.dataset.compareColumn === 'desktop';
                const updateEdges = (swiper) => {
                    column.classList.toggle('has-prev', !swiper.isBeginning && !swiper.isLocked);
                    column.classList.toggle('has-next', !swiper.isEnd && !swiper.isLocked);
                };
                const swiper = new Swiper(column.querySelector('.swiper'), {
                    speed: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 300,
                    touchEventsTarget: 'container',
                    grabCursor: true,
                    slidesPerView: isDesktop ? 'auto' : 1,
                    spaceBetween: 20,
                    initialSlide: column.dataset.compareColumn === '1' ? 1 : 0,
                    watchOverflow: true,
                    navigation: {
                        prevEl: column.querySelector('.swiper-button-prev'),
                        nextEl: column.querySelector('.swiper-button-next'),
                    },
                    pagination: {
                        el: column.querySelector('.comparing__pagination'),
                        type: 'fraction',
                        renderFraction: (current, total) =>
                            `<span class="comparing__fraction"><span class="${current}"></span> из <span class="${total}"></span></span>`,
                    },
                    on: {
                        init() {
                            updateEdges(this);
                        },
                        progress() {
                            updateEdges(this);
                        },
                        update() {
                            updateEdges(this);
                        },
                        slideChange() {
                            controller.updateRows();
                            if (
                                !isDesktop &&
                                controller.columns.length === 2 &&
                                this.params.speed > 0 &&
                                !window.matchMedia('(prefers-reduced-motion: reduce)').matches
                            ) {
                                const index = Number(column.dataset.compareColumn);
                                controller.root
                                    .querySelectorAll('.comparing__values')
                                    .forEach((row) => {
                                        const cell = row.children[index];
                                        if (cell && !cell.hidden && cell.animate) {
                                            cell.getAnimations().forEach((animation) =>
                                                animation.cancel(),
                                            );
                                            cell.animate(
                                                [
                                                    {
                                                        opacity: 0,
                                                        transform:
                                                            'translateX(' +
                                                            (this.swipeDirection === 'prev'
                                                                ? -24
                                                                : 24) +
                                                            'px)',
                                                    },
                                                    {
                                                        opacity: 1,
                                                        transform: 'translateX(0)',
                                                    },
                                                ],
                                                {
                                                    duration: this.params.speed,
                                                    easing: 'ease-out',
                                                },
                                            );
                                        }
                                    });
                            }
                        },
                        resize() {
                            updateEdges(this);
                            controller.requestSticky();
                        },
                        setTranslate() {
                            if (isDesktop) {
                                controller.root.style.setProperty(
                                    '--comparing-shift',
                                    this.translate + 'px',
                                );
                            }
                        },
                        setTransition(swiper, duration) {
                            if (isDesktop) {
                                controller.root.style.setProperty(
                                    '--comparing-duration',
                                    duration + 'ms',
                                );
                            }
                        },
                        sliderFirstMove() {
                            controller.root.classList.add('is-dragging');
                        },
                        touchEnd() {
                            controller.root.classList.remove('is-dragging');
                        },
                    },
                });

                if (isDesktop) {
                    this.desktop = swiper;
                } else {
                    this.columns.push(swiper);
                }
            });

            this.description = this.root.querySelector('.comparing__desc');

            this.description.addEventListener('pointerdown', this.handlePointerDown);
            this.description.addEventListener('touchstart', this.handleTouchStart, {
                passive: false,
            });

            this.root.addEventListener('change', this.handleChange);

            this.root.addEventListener('click', this.handleClick);

            window.addEventListener('scroll', this.requestSticky, {
                passive: true,
            });
            window.addEventListener('resize', this.handleResize);
            if (typeof ResizeObserver !== 'undefined') {
                new ResizeObserver(this.requestSticky).observe(
                    this.root.querySelector('.comparing__desc'),
                );
            }
            this.updateRows();
            this.updateEmpty();

            return this;
        }

        updateRows() {
            const selected = this.desktopQuery.matches
                ? this.activeIds
                : this.columns
                      .map((swiper) => this.activeIds[swiper.activeIndex])
                      .filter((index) => index !== undefined);

            ComparisonController.comparisonRows(this.rows, selected, this.mode).forEach(
                ({ element, visible, values }) => {
                    element.hidden = !visible;
                    const cells = [...element.querySelectorAll('.comparing__value')];

                    cells.forEach((cell, index) => {
                        cell.hidden = index >= selected.length;
                        cell.textContent = values[index] ?? '—';
                    });
                },
            );
            const copies = new Map(
                [...this.important.children].map((element) => [element.dataset.parameter, element]),
            );
            let position = 0;
            this.rows.forEach(({ element }) => {
                if (!element.querySelector('.comparing__check').checked || element.hidden) {
                    return;
                }

                const key = element.dataset.parameter;
                const copy = copies.get(key) || element.cloneNode(true);
                const values = [...element.querySelectorAll('.comparing__value')];

                copy.querySelectorAll('.comparing__value').forEach((cell, index) => {
                    cell.textContent = values[index].textContent;
                    cell.hidden = values[index].hidden;
                });
                if (this.important.children[position] !== copy) {
                    this.important.insertBefore(copy, this.important.children[position] || null);
                }
                copies.delete(key);
                position++;
            });
            copies.forEach((element) => element.remove());
        }

        updateSticky() {
            this.frame = 0;
            if (this.body.hidden) {
                this.panel.classList.remove('is-stuck');
                this.anchor.style.height = '';

                return;
            }
            const top = this.anchor.getBoundingClientRect().top;
            const bottom = this.root
                .querySelector('.comparing__desc')
                .getBoundingClientRect().bottom;
            const stuck = top <= 0 && bottom > this.panel.getBoundingClientRect().height + 30;

            if (!this.panel.classList.contains('is-stuck')) {
                this.naturalHeight = this.panel.offsetHeight;
            }
            this.anchor.style.height = stuck ? this.naturalHeight + 'px' : '';
            this.panel.classList.toggle('is-stuck', stuck);
        }

        requestSticky() {
            if (!this.frame) {
                this.frame = requestAnimationFrame(this.updateSticky);
            }
        }

        beginComparisonGesture(event, point) {
            if (event.target.closest('a, button, input, select, textarea, label')) {
                return;
            }
            const bounds = this.description.getBoundingClientRect();
            const index = point.clientX < bounds.left + bounds.width / 2 ? 0 : 1;
            const swiper = this.desktopQuery.matches ? this.desktop : this.columns[index];
            if (swiper && !swiper.destroyed) {
                // Swiper keeps ownership of threshold, vertical-scroll detection,
                // movement, snapping and document-level pointer release.
                swiper.onTouchStart(event);
            }
        }

        setFilter(value) {
            this.mode = value;
            this.root.querySelectorAll('[name="compare-filter"]').forEach((input) => {
                input.checked = input.value === this.mode;
            });
            this.root.querySelector('[data-mobile-differences]').checked =
                this.mode === 'different';
            this.updateRows();
            this.requestSticky();
        }

        updateEmpty() {
            const noItems = this.category !== this.populatedCategory || this.activeIds.length === 0;

            this.body.hidden = noItems;
            this.empty.hidden = !noItems;
            [...this.root.querySelectorAll('[data-compare-category]')]
                .find((tab) => tab.dataset.compareCategory === this.populatedCategory)
                .querySelector('.comparing__count').textContent = this.activeIds.length;
            this.requestSticky();
        }

        handlePointerDown(event) {
            if (event.isPrimary && event.button === 0) {
                this.beginComparisonGesture(event, event);
            }
        }

        handleTouchStart(event) {
            if (event.targetTouches.length === 1) {
                // Native touch tracking lets Swiper finish a vertical pan after
                // Chrome emits pointercancel, so the next swipe can start.
                this.beginComparisonGesture(event, event.targetTouches[0]);
            }
        }

        handleChange(event) {
            if (event.target.matches('[name="compare-filter"]')) {
                this.setFilter(event.target.value);
            }
            if (event.target.matches('[data-mobile-differences]')) {
                this.setFilter(event.target.checked ? 'different' : 'all');
            }
            if (event.target.matches('[data-important]')) {
                const key = event.target.dataset.important;
                const row = this.rows.find((item) => item.key === key);

                row.element.querySelector('.comparing__check').checked = event.target.checked;
                this.updateRows();
                this.requestSticky();
            }
        }

        handleClick(event) {
            const favorite = event.target.closest('.favorite-btn');

            if (favorite) {
                queueMicrotask(() => {
                    const id = favorite.closest('[data-compare-id]').dataset.compareId;
                    const active = favorite.classList.contains('active');

                    this.root.querySelectorAll('[data-compare-id]').forEach((item) => {
                        if (item.dataset.compareId !== id) {
                            return;
                        }

                        const button = item.querySelector('.favorite-btn');

                        button.classList.toggle('active', active);
                        button.setAttribute('aria-pressed', String(active));
                    });
                });
            }
            const remove = event.target.closest('[data-compare-remove]');
            const clear = event.target.closest('[data-compare-clear]');
            const tab = event.target.closest('[data-compare-category]');

            if (tab) {
                this.category = tab.dataset.compareCategory;
                this.root.querySelectorAll('[data-compare-category]').forEach((item) => {
                    item.classList.toggle('is-active', item === tab);
                    item.setAttribute('aria-pressed', String(item === tab));
                });
                this.updateEmpty();
            }
            if (!remove && !clear) {
                return;
            }

            const removed = remove ? remove.closest('[data-compare-id]').dataset.compareId : null;
            const index = removed
                ? this.activeIds.findIndex((original) => this.ids[original] === removed)
                : -1;
            const slideIndexes = clear ? this.activeIds.map((id, position) => position) : [index];

            if (clear) {
                this.activeIds.length = 0;
            } else if (index >= 0) {
                this.activeIds.splice(index, 1);
            }
            [this.desktop, ...this.columns].forEach((swiper) => {
                // Hidden responsive columns may not have measured their slides yet.
                swiper.recalcSlides();
                swiper.removeSlide(slideIndexes);
                swiper.update();
            });
            if (clear?.dataset.compareClear === 'all') {
                this.root.querySelectorAll('.comparing__count').forEach((count) => {
                    count.textContent = '0';
                });
            }
            this.updateRows();
            this.updateEmpty();
            this.root.querySelector('.comparing__status').textContent = remove
                ? 'Товар удалён из сравнения'
                : 'Сравнение очищено';
            if (remove) {
                const next = this.root.querySelector(
                    '[data-compare-column="' +
                        (this.desktopQuery.matches ? 'desktop' : '0') +
                        '"] .swiper-slide-active [data-compare-remove]',
                );

                (this.body.hidden ? this.root.querySelector('.comparing__catalog') : next)?.focus();
            }
        }

        handleResize() {
            this.panel.classList.remove('is-stuck');
            this.anchor.style.height = '';
            this.naturalHeight = this.panel.offsetHeight;
            this.updateRows();
            this.requestSticky();
        }
    }

    // === dom ===

    // Layout-based visibility also accounts for elements hidden by a parent or CSS.
    class Dom {
        static isVisible(element) {
            return Boolean(
                element &&
                (element.offsetWidth || element.offsetHeight || element.getClientRects().length),
            );
        }

        static delegate(root, type, selector, callback) {
            root.addEventListener(type, (event) => {
                const element = event.target?.closest?.(selector);

                if (element && root.contains(element)) {
                    callback(event, element);
                }
            });
        }
    }

    // Pass the matched element explicitly: native currentTarget remains the listener root.

    // === effects ===

    class Effects {
        static effects = new WeakMap();

        static displays = new WeakMap();

        static slides = new WeakMap();

        static show(element) {
            if (!element) {
                return;
            }

            Effects.cancelEffect(element);
            element.hidden = false;
            if (element.style.display === 'none') {
                element.style.display = Effects.displays.get(element) || '';
            }
            if (getComputedStyle(element).display === 'none') {
                element.style.display = 'revert';
            }
        }

        static hide(element) {
            if (!element) {
                return;
            }

            Effects.cancelEffect(element);
            if (element.style.display !== 'none') {
                Effects.displays.set(element, element.style.display);
            }
            element.style.display = 'none';
        }

        static cancelEffect(element) {
            const running = Effects.effects.get(element);

            if (!running) {
                return;
            }

            Effects.effects.delete(element);
            clearTimeout(running.timer);
            running.animation.cancel();
        }

        static animateVisibility(element, opening, duration, callback) {
            if (!element) {
                return;
            }

            const running = Effects.effects.get(element);

            if (running?.opening === opening) {
                return;
            }

            const visible = getComputedStyle(element).display !== 'none' && !element.hidden;

            if (!running && visible === opening) {
                return;
            }

            const current = getComputedStyle(element);
            const from = {
                opacity: current.opacity,
            };

            Effects.show(element);
            const style = getComputedStyle(element);
            const expanded = {
                opacity: style.opacity,
            };
            const collapsed = {
                opacity: 0,
            };
            const finish = () => {
                if (!opening) {
                    Effects.hide(element);
                    element.hidden = true;
                }
                callback?.call(element);
            };

            if (!element.animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                finish();

                return;
            }
            const animation = element.animate(
                [running || visible ? from : collapsed, opening ? expanded : collapsed],
                {
                    duration,
                    easing: 'ease',
                    fill: 'both',
                },
            );
            const state = {
                animation,
                opening,
            };

            Effects.effects.set(element, state);
            const complete = () => {
                if (Effects.effects.get(element) !== state) {
                    return;
                }

                Effects.effects.delete(element);
                clearTimeout(state.timer);
                animation.cancel();
                finish();
            };

            // Background tabs can suspend the animation timeline; keep logical state timely.
            state.timer = setTimeout(complete, duration);
            animation.finished.then(complete, () => {});
        }

        static fade(element, opening, duration = 300, callback) {
            return Effects.animateVisibility(element, opening, duration, callback);
        }

        static slide(element, opening, duration = 300) {
            if (!element) {
                return;
            }

            const previous = Effects.slides.get(element);

            if (previous?.opening === opening) {
                return;
            }

            const visible = !element.hidden && getComputedStyle(element).display !== 'none';

            if (!previous && visible === opening) {
                return;
            }

            const measure = () => {
                const css = getComputedStyle(element);
                return {
                    height: element.getBoundingClientRect().height + 'px',
                    paddingTop: css.paddingTop,
                    paddingBottom: css.paddingBottom,
                    marginTop: css.marginTop,
                    marginBottom: css.marginBottom,
                    borderTopWidth: css.borderTopWidth,
                    borderBottomWidth: css.borderBottomWidth,
                };
            };
            const collapsed = {
                height: '0px',
                paddingTop: '0px',
                paddingBottom: '0px',
                marginTop: '0px',
                marginBottom: '0px',
                borderTopWidth: '0px',
                borderBottomWidth: '0px',
            };
            const from = visible ? measure() : collapsed;
            const original = previous?.original || {
                overflow: element.style.overflow,
                boxSizing: element.style.boxSizing,
            };

            if (previous) {
                Effects.slides.delete(element);
                clearTimeout(previous.timer);
                previous.animation.cancel();
            }
            element.hidden = false;
            element.style.boxSizing = 'border-box';
            const expanded = measure();
            const finish = () => {
                element.hidden = !opening;
                element.style.overflow = original.overflow;
                element.style.boxSizing = original.boxSizing;
            };

            if (!element.animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                finish();

                return;
            }
            element.style.overflow = 'hidden';
            const animation = element.animate([from, opening ? expanded : collapsed], {
                duration,
                easing: 'ease',
                fill: 'both',
            });
            const state = {
                animation,
                original,
                opening,
            };

            Effects.slides.set(element, state);
            const complete = () => {
                if (Effects.slides.get(element) !== state) {
                    return;
                }

                Effects.slides.delete(element);
                clearTimeout(state.timer);
                animation.cancel();
                finish();
            };

            state.timer = setTimeout(complete, duration);
            animation.finished.then(complete, () => {});
        }

        static scrollToPosition(top) {
            window.scrollTo({
                top,
                behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
                    ? 'instant'
                    : 'smooth',
            });
        }
    }

    // === faq ===

    class FaqController {
        static initialized = new WeakSet();

        static animations = new WeakMap();

        static initAll() {
            document
                .querySelectorAll('.faq__item')
                .forEach((item) => new FaqController().init(item));
        }

        constructor() {
            this.toggle = this.toggle.bind(this);
        }

        init(item) {
            this.item = item;
            this.summary = this.item.querySelector('.faq__question');

            if (!this.summary || FaqController.initialized.has(this.item)) {
                return;
            }

            FaqController.initialized.add(this.item);

            this.summary.addEventListener('click', this.toggle);

            return this;
        }

        toggle(event) {
            event.preventDefault();
            const previous = FaqController.animations.get(this.item);
            const opening = previous ? !previous.opening : !this.item.open;
            const height = this.item.getBoundingClientRect().height;
            const overflow = previous?.overflow ?? this.item.style.overflow;

            if (previous) {
                FaqController.animations.delete(this.item);
                clearTimeout(previous.timer);
                previous.animation.cancel();
            }

            if (
                !this.item.animate ||
                window.matchMedia('(prefers-reduced-motion: reduce)').matches
            ) {
                this.item.open = opening;
                this.item.style.overflow = overflow;

                return;
            }

            this.item.open = true;
            const css = getComputedStyle(this.item);
            const target = opening
                ? this.item.getBoundingClientRect().height
                : this.summary.getBoundingClientRect().height +
                  parseFloat(css.borderTopWidth) +
                  parseFloat(css.borderBottomWidth);

            this.item.style.overflow = 'hidden';
            const animation = this.item.animate(
                [
                    {
                        height: `${height}px`,
                    },
                    {
                        height: `${target}px`,
                    },
                ],
                {
                    duration: 300,
                    easing: 'ease',
                    fill: 'both',
                },
            );
            const state = {
                animation,
                opening,
                overflow,
            };

            FaqController.animations.set(this.item, state);
            const finish = () => {
                if (FaqController.animations.get(this.item) !== state) {
                    return;
                }

                FaqController.animations.delete(this.item);
                clearTimeout(state.timer);
                this.item.open = opening;
                animation.cancel();
                this.item.style.overflow = overflow;
            };

            // Background tabs can suspend the animation timeline.
            state.timer = setTimeout(finish, 300);
            animation.finished.then(finish, () => {});
        }
    }

    // === favorites ===

    class FavoritesController {
        static initAll() {
            document
                .querySelectorAll('.favorites')
                .forEach((root) => new FavoritesController().init(root));
        }

        constructor() {
            this.handleClick = this.handleClick.bind(this);
        }

        init(root) {
            this.root = root;
            if (this.root.dataset.favoritesReady) {
                return;
            }

            this.root.dataset.favoritesReady = 'true';
            this.root.addEventListener('click', this.handleClick);

            return this;
        }

        handleClick(event) {
            if (event.target.closest('.favorites__clear')) {
                this.root.querySelectorAll('.favorite-btn').forEach((button) => {
                    button.classList.remove('active');
                    button.setAttribute('aria-pressed', 'false');
                });
            }
            const remove = event.target.closest('[data-remove-category]');

            remove?.closest('.favorites__category').remove();
        }
    }

    // === forms ===

    class FormController {
        constructor() {
            this.selectors = {
                field: '.form__field',
                control: '.form__control',
                errorClass: '_error',
                errorMsg: '.form__error-message',
                requiredAttr: '[data-required], [data-validate]',
                submitBtn: '[type="submit"]',
            };
            this.errorId = 0;
            this.init();
        }

        init() {
            Dom.delegate(document, 'submit', 'form', (event) => this.handleSubmit(event));
            for (const type of ['input', 'change']) {
                Dom.delegate(document, type, this.selectors.requiredAttr, (event, field) => {
                    if (
                        field.classList.contains(this.selectors.errorClass) ||
                        field
                            .closest(this.selectors.field)
                            ?.classList.contains(this.selectors.errorClass)
                    ) {
                        this.validateField(field);
                    }
                    field.form?.querySelectorAll('[data-validate-match]').forEach((confirm) => {
                        if (
                            confirm.dataset.validateMatch === field.name &&
                            confirm.getAttribute('aria-invalid') === 'true'
                        ) {
                            this.validateField(confirm);
                        }
                    });
                });
            }
            Dom.delegate(document, 'keydown', 'input[type="tel"]', (event) =>
                this.onPhoneKeyDown(event),
            );
            Dom.delegate(document, 'input', 'input[type="tel"]', (event) =>
                this.onPhoneInput(event),
            );
            Dom.delegate(document, 'paste', 'input[type="tel"]', (event) =>
                this.onPhonePaste(event),
            );
            Dom.delegate(document, 'focusin', 'input[type="tel"]', (event, input) => {
                if (!input.value) {
                    input.value = '+7 ';
                }
            });
            Dom.delegate(document, 'reset', 'form', (event, form) => {
                queueMicrotask(() => {
                    if (event.defaultPrevented) {
                        return;
                    }
                    form.querySelectorAll(this.selectors.requiredAttr).forEach((field) => {
                        this.toggleErrorState(field, false, '');
                    });
                });
            });
        }

        handleSubmit(event) {
            if (this.validateForm(event.target)) {
                return;
            }

            event.preventDefault();
            event.stopImmediatePropagation();

            return false;
        }

        validateForm(form) {
            let valid = true;

            form.querySelectorAll(this.selectors.requiredAttr).forEach((field) => {
                if (!this.validateField(field)) {
                    valid = false;
                }
            });

            return valid;
        }

        validateField(field) {
            if (field.matches(':disabled')) {
                this.toggleErrorState(field, false);
                return true;
            }

            const value = String(field.value ?? '').trim();
            const required = field.hasAttribute('data-required');
            const kind =
                field.type === 'tel'
                    ? 'phone'
                    : field.type === 'email'
                      ? 'email'
                      : field.name === 'code'
                        ? 'code'
                        : 'text';
            let issue = !required && !value ? '' : AuthDialogs.validateFieldValue(kind, value);

            if (field.type === 'radio' && field.name && field.form) {
                issue = [...field.form.elements].some(
                    (option) =>
                        option.type === 'radio' &&
                        option.name === field.name &&
                        !option.matches(':disabled') &&
                        option.checked,
                )
                    ? ''
                    : 'agreement';
            } else if (field.type === 'checkbox' || field.type === 'radio') {
                issue = required && !field.checked ? 'agreement' : '';
            }
            if (
                !issue &&
                value &&
                field.dataset?.validateMatch &&
                value !== field.form.elements[field.dataset.validateMatch]?.value
            ) {
                issue = 'mismatch';
            }
            if (!issue && value && field.validity && !field.validity.valid) {
                issue = 'invalid';
            }
            this.toggleErrorState(field, Boolean(issue), issue);

            return !issue;
        }

        toggleErrorState(field, error, issue = '') {
            const parent = field.closest(this.selectors.field);

            (parent || field).classList.toggle(this.selectors.errorClass, error);
            field.classList.toggle(this.selectors.errorClass, error);
            field.setAttribute('aria-invalid', String(error));
            const labels = [...(parent?.querySelectorAll(this.selectors.errorMsg) || [])];
            const active =
                labels.find((label) => label.dataset.validationError === issue) ||
                labels.find((label) => !label.dataset.validationError);
            const describedBy = new Set(
                (field.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean),
            );
            labels.forEach((label) => {
                label.id ||= `validation-error-${++this.errorId}`;
                describedBy.add(label.id);
                if (error && label === active) {
                    Effects.show(label);
                } else {
                    Effects.hide(label);
                }
            });
            if (describedBy.size) {
                field.setAttribute('aria-describedby', [...describedBy].join(' '));
            }
        }

        onPhoneInput(event) {
            const input = event.target;
            let numbers = input.value.replace(/\D/g, '');

            if (!numbers) {
                input.value = '';

                return;
            }
            if (input.value.length !== input.selectionStart) {
                if (event.data && /\D/.test(event.data)) {
                    input.value = numbers;
                }

                return;
            }
            let formatted;

            if (['7', '8', '9'].includes(numbers[0])) {
                if (numbers[0] === '9') {
                    numbers = `7${numbers}`;
                }
                formatted = '+7 (';
                if (numbers.length > 1) {
                    formatted += numbers.substring(1, 4);
                }
                if (numbers.length >= 5) {
                    formatted += `) ${numbers.substring(4, 7)}`;
                }
                if (numbers.length >= 8) {
                    formatted += `-${numbers.substring(7, 9)}`;
                }
                if (numbers.length >= 10) {
                    formatted += `-${numbers.substring(9, 11)}`;
                }
            } else {
                formatted = `+${numbers.substring(0, 16)}`;
            }
            input.value = formatted;
        }

        onPhoneKeyDown(event) {
            if (event.key === 'Backspace' && event.target.value.replace(/\D/g, '').length === 1) {
                event.target.value = '';
            }
        }

        onPhonePaste(event) {
            const pasted = event.clipboardData;

            if (!pasted) {
                return;
            }

            const value = pasted.getData('text');
            if (!/\d/.test(value)) {
                event.preventDefault();
                return;
            }

            event.preventDefault();
            const input = event.target;
            const start = input.selectionStart ?? input.value.length;
            const end = input.selectionEnd ?? start;
            const fullNumber = value.replace(/\D/g, '').length >= 10;
            const prefix = fullNumber ? '' : input.value.slice(0, start);
            const suffix = fullNumber ? '' : input.value.slice(end);
            const digitsBeforeCursor = (prefix + value).replace(/\D/g, '').length;

            input.value = prefix + value + suffix;
            this.onPhoneInput({
                target: input,
            });
            if (!fullNumber && suffix) {
                let digitsSeen = 0;
                let cursor = 0;
                while (cursor < input.value.length && digitsSeen < digitsBeforeCursor) {
                    if (/\d/.test(input.value[cursor])) {
                        digitsSeen++;
                    }
                    cursor++;
                }
                input.setSelectionRange(cursor, cursor);
            }
            input.dispatchEvent(
                new Event('input', {
                    bubbles: true,
                }),
            );
        }
    }

    // === mobile-catalog ===

    class MobileCatalog {
        constructor() {
            this.position = this.position.bind(this);
            this.render = this.render.bind(this);
            this.close = this.close.bind(this);
            this.open = this.open.bind(this);
            this.handleOutsideClick = this.handleOutsideClick.bind(this);
            this.handleResize = this.handleResize.bind(this);
            this.handleScroll = this.handleScroll.bind(this);
            this.handleCatalogClick = this.handleCatalogClick.bind(this);
            this.goBack = this.goBack.bind(this);
            this.handleClose = this.handleClose.bind(this);
            this.handleActionClick = this.handleActionClick.bind(this);
            this.handleMediaChange = this.handleMediaChange.bind(this);
            this.handlePageHide = this.handlePageHide.bind(this);
            this.handleKeydown = this.handleKeydown.bind(this);
        }

        init({ closeNavigation }) {
            this.closeNavigation = closeNavigation;
            this.catalog = document.querySelector('.mobile-catalog');
            this.trigger = document.querySelector('.main-actions__item.icon-dots-grid');
            this.desktopTrigger = document.querySelector('.header__catalog');

            if (!this.catalog || !this.trigger) {
                return;
            }

            this.media = window.matchMedia('(max-width: 767.97px)');
            this.panels = [...this.catalog.querySelectorAll('.mobile-catalog__panel')];
            this.root = this.catalog.querySelector('#catalog-root');
            this.body = this.catalog.querySelector('.mobile-catalog__body');
            this.title = this.catalog.querySelector('.mobile-catalog__title');
            this.back = this.catalog.querySelector('.mobile-catalog__back');
            this.closeButton = this.catalog.querySelector('.mobile-catalog__close');
            this.actions = document.querySelector('.main-actions');
            this.stack = [];
            this.pageScroll = 0;
            this.previousBodyTop = '';
            this.inertElements = [];
            this.activeTrigger = this.trigger;
            this.locked = false;
            this.mobileLayout = this.media.matches;
            this.triggers = [this.trigger, this.desktopTrigger].filter(Boolean);

            this.triggers.forEach((button) =>
                button.addEventListener('click', (event) => {
                    event.preventDefault();
                    this.activeTrigger = button;
                    if (this.catalog.hidden) {
                        this.open();
                    } else {
                        this.close(true);
                    }
                }),
            );
            document.addEventListener('click', this.handleOutsideClick);
            window.addEventListener('resize', this.handleResize);
            window.addEventListener('scroll', this.handleScroll, {
                passive: true,
            });

            this.catalog.addEventListener('click', this.handleCatalogClick);

            this.back.addEventListener('click', this.goBack);
            this.closeButton.addEventListener('click', this.handleClose);
            this.actions?.addEventListener('click', this.handleActionClick);
            this.media.addEventListener('change', this.handleMediaChange);
            window.addEventListener('pagehide', this.handlePageHide);
            document.addEventListener('keydown', this.handleKeydown);

            return this;
        }

        position() {
            if (this.media.matches || this.catalog.hidden) {
                return;
            }

            const rect = this.activeTrigger.getBoundingClientRect();

            this.catalog.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - 302))}px`;
            this.catalog.style.top = `${rect.bottom + 8}px`;
            this.catalog.style.maxHeight = `${Math.max(0, window.innerHeight - rect.bottom - 16)}px`;
        }

        render() {
            const current = this.stack[this.stack.length - 1];
            const nested = this.stack.length > 1;

            this.panels.forEach((panel) => {
                panel.hidden = panel !== current.panel;
            });
            this.catalog.classList.toggle('mobile-catalog--nested', nested);
            this.title.textContent = current.panel.dataset.catalogTitle;
            this.title.classList.toggle('title-md', !nested);
            this.title.classList.toggle('title-sm', nested);
            this.back.hidden = !nested;
            this.closeButton.hidden = nested;
            this.back.setAttribute(
                'aria-label',
                nested
                    ? `Назад: ${this.stack[this.stack.length - 2].panel.dataset.catalogTitle}`
                    : 'Назад в каталог',
            );
            this.body.scrollTop = current.scroll;
        }

        close(restoreFocus = false) {
            if (this.catalog.hidden) {
                return;
            }

            this.catalog.hidden = true;
            this.triggers.forEach((button) => button.setAttribute('aria-expanded', 'false'));
            this.catalog
                .querySelectorAll('[data-catalog-target]')
                .forEach((button) => button.setAttribute('aria-expanded', 'false'));
            this.inertElements.forEach((element) => {
                element.inert = false;
            });
            this.inertElements = [];
            document.body.classList.remove('open-mobile-catalog');
            if (this.locked) {
                document.body.style.top = this.previousBodyTop;
                window.scrollTo({
                    top: this.pageScroll,
                    behavior: 'instant',
                });
            }
            this.locked = false;
            this.catalog.style.removeProperty('left');
            this.catalog.style.removeProperty('top');
            this.catalog.style.removeProperty('max-height');
            this.stack = [];
            if (restoreFocus) {
                this.activeTrigger.focus({
                    preventScroll: true,
                });
            }
        }

        open() {
            this.closeNavigation();
            window.SearchController?.closeSearch();
            this.pageScroll = window.scrollY;
            this.previousBodyTop = document.body.style.top;
            this.stack = [
                {
                    panel: this.root,
                    scroll: 0,
                    opener: null,
                },
            ];
            this.render();
            this.locked = this.media.matches;
            if (this.locked) {
                document.body.style.top = `${-this.pageScroll}px`;
                document.body.classList.add('open-mobile-catalog');
            }
            this.catalog.hidden = false;
            this.triggers.forEach((button) => button.setAttribute('aria-expanded', 'true'));
            // Leave the fixed bottom navigation available while blocking the covered page.
            this.inertElements = (
                this.locked
                    ? [
                          ...document.querySelectorAll(
                              '.header__content-container > :not(.main-actions), .header__bottom, main, footer, .arrow-top',
                          ),
                      ]
                    : []
            ).filter((element) => !element.inert);
            this.inertElements.forEach((element) => {
                element.inert = true;
            });
            this.position();
            (this.media.matches ? this.closeButton : this.root.querySelector('button, a')).focus({
                preventScroll: true,
            });
        }

        handleOutsideClick(event) {
            if (
                !this.catalog.hidden &&
                !this.media.matches &&
                !this.catalog.contains(event.target) &&
                !this.triggers.some((button) => button.contains(event.target))
            ) {
                this.close();
            }
        }

        handleResize() {
            const nextMobileLayout = window.innerWidth < 768;

            if (nextMobileLayout !== this.mobileLayout) {
                this.mobileLayout = nextMobileLayout;
                this.close();
            } else {
                this.position();
            }
        }

        handleScroll() {
            if (!this.media.matches) {
                this.close();
            }
        }

        handleCatalogClick(event) {
            const button = event.target.closest('[data-catalog-target]');

            if (button) {
                const panel = this.panels.find((item) => item.id === button.dataset.catalogTarget);

                if (!panel || this.stack.some((item) => item.panel === panel)) {
                    return;
                }

                this.stack[this.stack.length - 1].scroll = this.body.scrollTop;
                button.setAttribute('aria-expanded', 'true');
                this.stack.push({
                    panel,
                    scroll: 0,
                    opener: button,
                });
                this.render();
                this.title.focus({
                    preventScroll: true,
                });
            } else if (event.target.closest('a')) {
                this.close();
            }
        }

        goBack() {
            if (this.stack.length < 2) {
                return;
            }

            const previous = this.stack.pop();

            previous.opener.setAttribute('aria-expanded', 'false');
            this.render();
            previous.opener.focus({
                preventScroll: true,
            });
        }

        handleClose() {
            return this.close(true);
        }

        handleActionClick(event) {
            if (event.target.closest('.main-actions__item') !== this.trigger) {
                this.close();
            }
        }

        handleMediaChange() {
            return this.close();
        }

        handlePageHide() {
            return this.close();
        }

        handleKeydown(event) {
            if (this.catalog.hidden) {
                return;
            }

            if (event.key === 'Escape') {
                event.preventDefault();
                this.close(true);
            } else if (event.key === 'Tab') {
                if (!this.media.matches) {
                    return;
                }

                const focusable = [
                    ...this.catalog.querySelectorAll('button, a'),
                    ...this.actions.querySelectorAll('a, button'),
                ].filter((element) => !element.closest('[hidden]') && !element.disabled);
                const first = focusable[0];
                const last = focusable[focusable.length - 1];

                if (
                    event.shiftKey &&
                    (document.activeElement === first || document.activeElement === this.title)
                ) {
                    event.preventDefault();
                    last.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault();
                    first.focus();
                }
            }
        }
    }

    // === header ===

    class HeaderController {
        constructor() {
            this.closeNavigation = this.closeNavigation.bind(this);
            this.toggleNavigation = this.toggleNavigation.bind(this);
            this.handleBackdropClick = this.handleBackdropClick.bind(this);
            this.handleKeydown = this.handleKeydown.bind(this);
            this.handleMediaChange = this.handleMediaChange.bind(this);
            this.handleNavigationClick = this.handleNavigationClick.bind(this);
            this.updateHeight = this.updateHeight.bind(this);
            this.handleScroll = this.handleScroll.bind(this);
        }

        init() {
            this.burger = document.querySelector('.header__burger');
            this.navigation = document.querySelector('#header-menu');
            this.backdrop = document.querySelector('.header__backdrop');

            this.burger?.addEventListener('click', this.toggleNavigation);
            this.backdrop?.addEventListener('click', this.handleBackdropClick);
            Dom.delegate(
                document,
                'click',
                '.header__bottom .menu__link, .main-actions__item, .search__toggler',
                this.handleNavigationClick,
            );
            document.addEventListener('keydown', this.handleKeydown);
            window
                .matchMedia('(max-width: 767.97px)')
                .addEventListener('change', this.handleMediaChange);
            new MobileCatalog().init({
                closeNavigation: this.closeNavigation,
            });
            this.element = document.querySelector('.header');

            if (this.element) {
                this.updateHeight();
                if (typeof ResizeObserver !== 'undefined') {
                    new ResizeObserver(this.updateHeight).observe(this.element);
                } else {
                    window.addEventListener('resize', this.updateHeight);
                }

                window.addEventListener('scroll', this.handleScroll, {
                    passive: true,
                });
            }

            return this;
        }

        updateHeight() {
            document.documentElement.style.setProperty(
                '--header-height',
                `${this.element.getBoundingClientRect().height}px`,
            );
        }

        handleScroll() {
            if (window.scrollY > 100) {
                this.element.classList.add('scroll');
            } else if (window.scrollY <= 10) {
                this.element.classList.remove('scroll');
            }
        }

        closeNavigation(restoreFocus = false) {
            const wasOpen = this.navigation?.classList.contains('is-open');

            this.navigation?.classList.remove('is-open');
            if (this.backdrop) {
                this.backdrop.hidden = true;
            }
            document.body.classList.remove('open-navigation');
            if (this.burger) {
                this.burger.setAttribute('aria-expanded', 'false');
                this.burger.setAttribute('aria-label', 'Открыть меню');
                this.burger.classList.remove('icon-close');
                this.burger.classList.add('icon-menu');
                if (wasOpen && restoreFocus) {
                    this.burger.focus();
                }
            }
        }

        toggleNavigation() {
            if (!this.navigation) {
                return;
            }

            if (this.navigation.classList.contains('is-open')) {
                return this.closeNavigation();
            }

            window.SearchController?.closeSearch();
            this.navigation.classList.add('is-open');
            if (this.backdrop) {
                this.backdrop.hidden = false;
            }
            document.body.classList.add('open-navigation');
            this.burger.setAttribute('aria-expanded', 'true');
            this.burger.setAttribute('aria-label', 'Закрыть меню');
            this.burger.classList.replace('icon-menu', 'icon-close');
        }

        handleBackdropClick() {
            return this.closeNavigation(true);
        }

        handleKeydown(event) {
            if (!this.navigation?.classList.contains('is-open')) {
                return;
            }

            if (event.key === 'Escape') {
                this.closeNavigation(true);
            }
            if (event.key !== 'Tab') {
                return;
            }

            const items = [
                ...document.querySelectorAll(
                    '.header__content a, .header__content button, .header__content input, .header__bottom a, .header__bottom button, .header__bottom input',
                ),
            ].filter(Dom.isVisible);
            const first = items[0];
            const last = items[items.length - 1];

            if (first && event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (last && !event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        }

        handleMediaChange() {
            return this.closeNavigation();
        }

        handleNavigationClick() {
            return this.closeNavigation();
        }
    }

    // === interactions ===

    class InteractionsController {
        static normalizeQuantity(value) {
            return Math.min(9999, Math.max(1, parseInt(String(value).replace(/\D/g, ''), 10) || 1));
        }

        constructor() {
            this.toggleProductAction = this.toggleProductAction.bind(this);
            this.toggleReview = this.toggleReview.bind(this);
        }

        init() {
            if (typeof Fancybox !== 'undefined' && Fancybox) {
                Fancybox.bind('[data-fancybox]', {
                    closeExisting: true,
                });
            }
            Dom.delegate(
                document,
                'click',
                '.favorite-btn, .compare-btn',
                this.toggleProductAction,
            );
            Dom.delegate(document, 'click', '.review__toggle', this.toggleReview);
            document.querySelectorAll('.quantity-block').forEach((block) => {
                const input = block.querySelector('.quantity-block__input');

                if (!input) {
                    return;
                }

                block.querySelector('.quantity-block__up')?.addEventListener('click', () => {
                    const value = InteractionsController.normalizeQuantity(input.value);

                    if (value < 9999) {
                        input.value = value + 1;
                    }
                });
                block.querySelector('.quantity-block__down')?.addEventListener('click', () => {
                    const value = InteractionsController.normalizeQuantity(input.value);

                    if (value > 1) {
                        input.value = value - 1;
                    }
                });
                input.addEventListener('input', () => {
                    input.value = InteractionsController.normalizeQuantity(input.value);
                });
                input.addEventListener('paste', (event) => {
                    if (/\D/.test(event.clipboardData.getData('text'))) {
                        event.preventDefault();
                    }
                });
            });
            this.arrows = document.querySelectorAll('.arrow-top');

            if (this.arrows.length) {
                window.addEventListener(
                    'scroll',
                    () =>
                        this.arrows.forEach((arrow) =>
                            arrow.classList.toggle('visible', window.scrollY > 300),
                        ),
                    {
                        passive: true,
                    },
                );
                this.arrows.forEach((arrow) =>
                    arrow.addEventListener('click', () => Effects.scrollToPosition(0)),
                );
            }

            return this;
        }

        toggleProductAction(event, button) {
            const selected = button.classList.toggle('active');

            button.setAttribute('aria-pressed', String(selected));
            if (selected) {
                const product = button.closest(
                    '.product, .product-details, .comparing-card, .order-product, .cart-item',
                );
                const name =
                    product
                        ?.querySelector(
                            '.product__name, .comparing-card__name, .order-product__name, .cart-item__name',
                        )
                        ?.textContent.trim() || '';

                window.NotifyController?.show(
                    name,
                    1,
                    button.classList.contains('favorite-btn') ? 'favorite' : 'compare',
                );
            }
        }

        toggleReview(event, button) {
            const content = button.closest('.review')?.querySelector('.review__content');
            const expanded = button.classList.toggle('is-active');

            content?.classList.toggle('expanded', expanded);
            button.setAttribute('aria-expanded', String(expanded));
            button.textContent = expanded ? 'Скрыть отзыв' : 'Показать полностью';
        }
    }

    class NotifyController {
        constructor() {
            this.containerSelector = '.notify-container';
            this.productSelector = '.product, .product-details';
            this.btnSelector = '.add-to-cart-btn';
            this.displayTime = 4000;
            this.cartButtonStates = new WeakMap();
            this.init();
        }

        init() {
            Dom.delegate(document, 'click', this.btnSelector, (event, button) => {
                if (button.disabled || button.getAttribute('aria-disabled') === 'true') {
                    return;
                }

                if (this.updateCartButton(button)) {
                    this.handleAddToCart(button.closest(this.productSelector));
                }
            });
        }

        updateCartButton(button) {
            const original = this.cartButtonStates.get(button);

            if (original) {
                original.text.forEach(([node, value]) => {
                    node.textContent = value;
                });
                original.icon?.classList.replace('icon-tick', 'icon-cart');
                original.replacement?.replaceWith(original.image);
                if (original.label !== null) {
                    button.setAttribute('aria-label', original.label);
                }
                button.classList.remove('is-added');
                button.setAttribute('aria-pressed', 'false');
                this.cartButtonStates.delete(button);

                return false;
            }

            const label = button.dataset.cartAddedLabel;
            const text = button.querySelector('.comparing-card__cart-text');
            const cartIcon = button.querySelector('.icon-cart');
            const image = button.querySelector('img');
            const nodes = text
                ? [text]
                : [...button.childNodes].filter(
                      (node) => node.nodeType === 3 && node.textContent.trim(),
                  );
            const state = {
                text: nodes.map((node) => [node, node.textContent]),
                label: button.getAttribute('aria-label'),
                icon: cartIcon || (button.classList.contains('icon-cart') ? button : null),
                image,
            };

            nodes.forEach((node) => {
                node.textContent = label;
            });

            if (cartIcon) {
                cartIcon.classList.replace('icon-cart', 'icon-tick');
            } else if (image) {
                const icon = document.createElement('span');

                icon.className = `${image.className} icon-tick`;
                icon.setAttribute('aria-hidden', 'true');
                image.replaceWith(icon);
                state.replacement = icon;
            } else if (button.classList.contains('icon-cart')) {
                button.classList.replace('icon-cart', 'icon-tick');
            }

            button.classList.add('is-added');
            button.setAttribute('aria-pressed', 'true');
            this.cartButtonStates.set(button, state);
            if (button.hasAttribute('aria-label')) {
                button.setAttribute('aria-label', label);
            }

            return true;
        }

        handleAddToCart(product) {
            this.show(
                product?.querySelector('.product__name')?.textContent.trim() || '',
                product?.querySelector('.quantity-block__input')?.value || 1,
            );
        }

        show(name, quantity = 1, type = 'cart') {
            const container = document.querySelector(this.containerSelector);

            if (!container) {
                return;
            }

            container.setAttribute('aria-live', 'polite');
            container.setAttribute('aria-relevant', 'additions');
            const states = {
                cart: {
                    title: 'В корзине',
                    icon: 'icon-cart',
                },
                favorite: {
                    title: 'В избранном',
                    icon: 'icon-heart',
                },
                compare: {
                    title: 'В сравнении',
                    icon: 'icon-bars',
                },
                'order-copy': {
                    title: 'Номер заказа скопирован',
                    icon: 'icon-copy',
                },
                'cart-share': {
                    title: 'URL корзины скопирован',
                    icon: 'icon-copy',
                },
            };
            const state = states[type] || states.cart;
            const notification = document.createElement('div');

            notification.className = 'notify';
            const icon = document.createElement('span');

            icon.className = 'notify__icon ' + state.icon;
            icon.setAttribute('aria-hidden', 'true');
            const body = document.createElement('div');

            body.className = 'notify__body';
            const title = document.createElement('p');

            title.className = 'notify__title';
            title.textContent = state.title;
            const text = document.createElement('p');

            text.className = 'notify__text';
            text.textContent = name;
            body.append(title, text);
            const close = document.createElement('button');

            close.type = 'button';
            close.className = 'notify__close icon-close';
            close.setAttribute('aria-label', 'Закрыть уведомление');
            notification.append(icon, body, close);
            let timer;
            const remove = () => {
                clearTimeout(timer);
                notification.remove();
            };
            const start = () => {
                clearTimeout(timer);
                timer = setTimeout(remove, this.displayTime);
            };

            close.addEventListener('click', remove);
            notification.addEventListener('pointerenter', () => clearTimeout(timer));
            notification.addEventListener('pointerleave', () => {
                if (!notification.contains(document.activeElement)) {
                    start();
                }
            });
            notification.addEventListener('focusin', () => clearTimeout(timer));
            notification.addEventListener('focusout', (event) => {
                if (!notification.contains(event.relatedTarget)) {
                    start();
                }
            });
            container.append(notification);
            if (container.children.length > 3) {
                container.firstElementChild.remove();
            }
            start();
        }
    }

    // === maps ===

    class MapsController {
        constructor() {
            this.initMaps = this.initMaps.bind(this);
        }

        init() {
            if (!document.querySelector('.map-block')) {
                return;
            }

            MapLoader.loadMaps()
                .then(this.initMaps)
                .catch(() => {
                    document.querySelectorAll('.map-block').forEach((container) => {
                        if (
                            !container.querySelector('.map-block__status') &&
                            !container.classList.contains('is-initialized')
                        ) {
                            const message = document.createElement('p');
                            message.className = 'map-block__status';
                            message.setAttribute('role', 'status');
                            TextUtils.showMessage(
                                message,
                                'Не удалось загрузить карту. Адрес указан в контактной информации.',
                            );
                            container.append(message);
                        }
                    });
                });

            return this;
        }

        initMaps(api) {
            document.querySelectorAll('.map-block').forEach((container) => {
                if (container.classList.contains('is-initialized') || !container.dataset.coords) {
                    return;
                }

                const coords = container.dataset.coords
                    .split(',')
                    .map((item) => parseFloat(item.trim()));
                const map = new api.Map(
                    container,
                    {
                        center: coords,
                        zoom: 16,
                        controls: ['zoomControl'],
                    },
                    {
                        suppressMapOpenBlock: true,
                    },
                );

                map.geoObjects.add(
                    new api.Placemark(
                        coords,
                        {},
                        {
                            iconLayout: 'default#image',
                            iconImageHref: container.dataset.placemarkLogo,
                            iconImageSize: [40, 40],
                            iconImageOffset: [-20, -20],
                        },
                    ),
                );
                if (window.innerWidth < 768) {
                    map.behaviors.disable('scrollZoom');
                    map.behaviors.disable('drag');
                }
                container.classList.add('is-initialized');
                map.container.fitToViewport();
                window.addEventListener('resize', () => map.container.fitToViewport());
            });
        }
    }

    // === news ===

    // News cards and pagination are rendered by templates; loading belongs to the server.
    class NewsController {
        init() {
            return this;
        }
    }

    // === order-details ===

    class OrderDetailsController {
        constructor() {
            this.showState = this.showState.bind(this);
            this.copyOrder = this.copyOrder.bind(this);
        }

        init() {
            this.root = document.querySelector('[data-order-details]');
            if (!this.root || this.root.dataset.initialized) {
                return;
            }
            this.root.dataset.initialized = 'true';

            this.root.querySelector('[data-copy-order]').addEventListener('click', this.copyOrder);

            return this;
        }

        showState(container, state) {
            container.hidden = false;
            container.querySelectorAll('[data-order-state]').forEach((message) => {
                message.hidden = message.dataset.orderState !== state;
            });
        }

        async copyOrder() {
            const status = this.root.querySelector('.order-details__announcement');
            try {
                await navigator.clipboard.writeText(
                    this.root.querySelector('[data-order-number]').textContent.trim(),
                );
                this.showState(status, 'copied');
                window.NotifyController?.show(
                    this.root.querySelector('[data-order-number]').textContent.trim(),
                    1,
                    'order-copy',
                );
            } catch {
                this.showState(status, 'copy-error');
            }
        }
    }

    // === orders ===

    class OrdersController {
        constructor() {
            this.submit = this.submit.bind(this);
        }

        init() {
            this.form = document.querySelector('.orders__filters');

            if (!this.form || this.form.dataset.initialized) {
                return;
            }

            this.form.dataset.initialized = 'true';
            this.form.addEventListener('submit', this.submit);

            return this;
        }

        submit(event) {
            return event.preventDefault();
        }
    }

    // === parts-order ===

    class PartsOrderController {
        static renderFiles(input) {
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

                format.className = 'file-upload__format icon-file';
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

        constructor() {
            this.handleFileChange = this.handleFileChange.bind(this);
            this.removeFile = this.removeFile.bind(this);
            this.resetFiles = this.resetFiles.bind(this);
        }

        init() {
            Dom.delegate(
                document,
                'change',
                '.form--parts .form__file-input, .form--request .form__file-input',
                this.handleFileChange,
            );
            Dom.delegate(document, 'click', '.file-upload__remove', this.removeFile);
            Dom.delegate(document, 'reset', '.form--parts, .form--request', this.resetFiles);

            return this;
        }

        handleFileChange(event, input) {
            return PartsOrderController.renderFiles(input);
        }

        removeFile(event, button) {
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
            input.dispatchEvent(
                new Event('change', {
                    bubbles: true,
                }),
            );
            const next =
                upload.querySelectorAll('.file-upload__remove')[
                    Math.min(index, input.files.length - 1)
                ];

            (next || input).focus();
        }

        resetFiles(event, form) {
            queueMicrotask(() => {
                if (!event.defaultPrevented) {
                    form.querySelectorAll('.form__file-input').forEach(
                        PartsOrderController.renderFiles,
                    );
                }
            });
        }
    }

    // === product-details ===

    class ProductDetailsController {
        init() {
            document.querySelectorAll('.product-content').forEach((content) => {
                if (content.dataset.productContentReady) {
                    return;
                }
                content.dataset.productContentReady = 'true';

                Dom.delegate(content, 'click', '.product-content__expand', (event, button) => {
                    const expanded = button.getAttribute('aria-expanded') !== 'true';

                    content
                        .querySelectorAll('.product-content__rich-image--extra')
                        .forEach((image) => {
                            image.hidden = !expanded;
                        });
                    button.setAttribute('aria-expanded', String(expanded));
                    button.textContent = expanded ? 'Свернуть' : 'Показать полностью';
                });
                Dom.delegate(content, 'click', '.product-content__tab', (event, tab) => {
                    content
                        .querySelectorAll('.product-content__tab')
                        .forEach((link) => link.classList.toggle('active', link === tab));
                });
            });
            document.querySelectorAll('.product-details').forEach((product) => {
                if (product.dataset.productDetailsReady) {
                    return;
                }
                product.dataset.productDetailsReady = 'true';

                const sync = (input) =>
                    product.querySelectorAll('.quantity-block__input').forEach((other) => {
                        other.value = input.value;
                    });

                Dom.delegate(product, 'input', '.quantity-block__input', (event, input) =>
                    sync(input),
                );
                Dom.delegate(
                    product,
                    'click',
                    '.quantity-block__up, .quantity-block__down',
                    (event, button) =>
                        sync(
                            button
                                .closest('.quantity-block')
                                .querySelector('.quantity-block__input'),
                        ),
                );
            });

            return this;
        }
    }

    // === product-listing ===

    class ProductListingController {
        constructor() {
            this.closeFilter = this.closeFilter.bind(this);
            this.openFilter = this.openFilter.bind(this);
            this.handleKeydown = this.handleKeydown.bind(this);
            this.handleMediaChange = this.handleMediaChange.bind(this);
            this.submitFilter = this.submitFilter.bind(this);
            this.clearSelectedFilters = this.clearSelectedFilters.bind(this);
            this.toggleExtraFilters = this.toggleExtraFilters.bind(this);
            this.toggleTags = this.toggleTags.bind(this);
        }

        init() {
            this.root = document.querySelector('.product-listing');

            if (!this.root || this.root.dataset.listingReady) {
                return;
            }

            this.root.dataset.listingReady = 'true';

            this.form = this.root.querySelector('.listing-filter');
            this.overlay = this.root.querySelector('.listing-filter-overlay');
            this.opener = this.root.querySelector('.product-listing__filter-button');
            this.previousOverflow = '';

            this.opener.addEventListener('click', this.openFilter);
            this.form
                .querySelector('.listing-filter__close')
                .addEventListener('click', this.closeFilter);
            this.overlay.addEventListener('click', this.closeFilter);
            document.addEventListener('keydown', this.handleKeydown);
            window
                .matchMedia('(min-width: 1199.98px)')
                .addEventListener('change', this.handleMediaChange);
            this.form.addEventListener('submit', this.submitFilter);
            this.root
                .querySelector('.product-listing__selected')
                ?.addEventListener('click', this.clearSelectedFilters);
            this.form
                .querySelector('.listing-filter__expand')
                .addEventListener('click', this.toggleExtraFilters);
            this.root
                .querySelectorAll('.product-listing__tag:not(.product-listing__tag--more)')
                .forEach((button) =>
                    button.addEventListener('click', () => {
                        this.root.querySelectorAll('.product-listing__tag').forEach((tag) => {
                            tag.classList.remove('is-active');
                            tag.setAttribute('aria-pressed', 'false');
                        });
                        button.classList.add('is-active');
                        button.setAttribute('aria-pressed', 'true');
                    }),
                );
            this.root
                .querySelector('.product-listing__tag--more')
                .addEventListener('click', this.toggleTags);

            return this;
        }

        closeFilter() {
            if (!this.form.classList.contains('is-open')) {
                return;
            }

            this.form.classList.remove('is-open');
            this.form.removeAttribute('role');
            this.form.removeAttribute('aria-modal');
            this.overlay.hidden = true;
            this.opener.setAttribute('aria-expanded', 'false');
            document.body.style.overflow = this.previousOverflow;
            this.opener.focus();
        }

        openFilter() {
            this.previousOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            this.form.classList.add('is-open');
            this.form.setAttribute('role', 'dialog');
            this.form.setAttribute('aria-modal', 'true');
            this.overlay.hidden = false;
            this.opener.setAttribute('aria-expanded', 'true');
            this.form.querySelector('.listing-filter__close').focus();
        }

        handleKeydown(event) {
            if (!this.form.classList.contains('is-open')) {
                return;
            }

            if (event.key === 'Escape') {
                this.closeFilter();
            }
            if (event.key !== 'Tab') {
                return;
            }

            const focusable = Array.from(
                this.form.querySelectorAll('a, button, input, summary'),
            ).filter((element) => element.getClientRects().length);
            const first = focusable[0];
            const last = focusable[focusable.length - 1];

            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        }

        handleMediaChange(event) {
            if (event.matches) {
                this.closeFilter();
            }
        }

        submitFilter(event) {
            event.preventDefault();
            this.closeFilter();
        }

        clearSelectedFilters(event) {
            const chip = event.target.closest('.product-listing__chip');
            const clearChip = (item) => {
                const names = (item.dataset.filterFields || '').split(',');

                [...this.form.elements]
                    .filter(
                        (field) =>
                            names.includes(field.name) &&
                            (!item.dataset.filterValue || field.value === item.dataset.filterValue),
                    )
                    .forEach((field) => {
                        if (field.type === 'checkbox' || field.type === 'radio') {
                            field.checked = false;
                        } else {
                            field.value = '';
                        }
                        field.dispatchEvent(
                            new Event('change', {
                                bubbles: true,
                            }),
                        );
                    });
                item.remove();
            };

            if (chip) {
                clearChip(chip);
            }
            if (event.target.closest('.product-listing__clear')) {
                this.root.querySelectorAll('.product-listing__chip').forEach(clearChip);
            }
            const selected = this.root.querySelector('.product-listing__selected');

            if (!selected.querySelector('.product-listing__chip')) {
                selected.hidden = true;
            }
        }

        toggleExtraFilters(event) {
            const button = event.currentTarget;
            const extra = this.form.querySelector('.listing-filter__extra');

            extra.hidden = !extra.hidden;
            button.textContent = extra.hidden ? 'Показать еще' : 'Скрыть';
            button.setAttribute('aria-expanded', String(!extra.hidden));
        }

        toggleTags(event) {
            const button = event.currentTarget;
            const expanded = button.getAttribute('aria-expanded') !== 'true';

            this.root
                .querySelector('.product-listing__tags')
                .classList.toggle('is-expanded', expanded);
            button.setAttribute('aria-expanded', String(expanded));
            button.textContent = expanded ? 'Скрыть' : 'Показать еще';
        }
    }

    // === review ===

    class ReviewsController {
        constructor() {
            this.vote = this.vote.bind(this);
        }

        init() {
            Dom.delegate(document, 'click', '.review__vote', this.vote);

            return this;
        }

        vote(event, vote) {
            const card = vote.closest('.review');

            if (!card) {
                return;
            }

            const active = vote.getAttribute('aria-pressed') === 'true';

            card.querySelectorAll('.review__vote').forEach((button) => {
                const counter = button.querySelector('.review__vote-count');

                if (!button.dataset.baseCount) {
                    button.dataset.baseCount = counter.textContent;
                }
                const selected = button === vote && !active;

                button.setAttribute('aria-pressed', String(selected));
                const count = (Number(button.dataset.baseCount) || 0) + Number(selected);

                counter.textContent = String(count);
            });
        }
    }

    // === search-fields ===

    class SearchFieldsController {
        constructor() {
            this.sync = this.sync.bind(this);
            this.handleInput = this.handleInput.bind(this);
            this.clear = this.clear.bind(this);
        }

        init() {
            document.querySelectorAll('.search-field__input').forEach(this.sync);
            Dom.delegate(document, 'input', '.search-field__input', this.handleInput);
            Dom.delegate(document, 'click', '.search-field__clear', this.clear);

            return this;
        }

        sync(input) {
            const button = input.closest('.search-field')?.querySelector('.search-field__clear');

            if (button) {
                button.hidden = input.value.length === 0;
            }
        }

        handleInput(event, input) {
            return this.sync(input);
        }

        clear(event, button) {
            const input = button.closest('.search-field').querySelector('.search-field__input');

            input.value = '';
            input.dispatchEvent(
                new Event('input', {
                    bubbles: true,
                }),
            );
            input.focus();
        }
    }

    // === search ===

    class SearchController {
        constructor({ closeNavigation }) {
            this.closeNavigation = closeNavigation;
            this.selectors = {
                search: '.search',
                content: '.search__content',
                input: '.search__form-input',
                toggler: '.search__toggler',
                bar: '.search__bar',
                activeClass: 'active',
                visibleClass: 'visible',
            };
            this.init();
        }

        init() {
            Dom.delegate(document, 'click', this.selectors.toggler, (event) => {
                event.stopPropagation();
                this.toggleSearch();
            });
            for (const type of ['input', 'focusin', 'click']) {
                Dom.delegate(document, type, this.selectors.input, (event, input) =>
                    this.handleInput(input),
                );
            }
            document.addEventListener('click', (event) => {
                if (!event.target.closest(this.selectors.search)) {
                    this.closeSearch();
                }
            });
            document.addEventListener('keydown', (event) => {
                if (event.key === 'Escape') {
                    this.closeSearch(true);
                }
            });
            Dom.delegate(document, 'submit', '.search__form', (event, form) => {
                const input = form.querySelector(this.selectors.input);

                if (!input) {
                    return;
                }

                input.value = input.value.trim();
                if (!input.value) {
                    event.preventDefault();
                    input.focus();
                }
            });
            Dom.delegate(document, 'keydown', this.selectors.input, (event, input) => {
                if (event.key !== 'ArrowDown') {
                    return;
                }

                const bar = input.closest(this.selectors.search)?.querySelector(this.selectors.bar);

                if (bar && !bar.hidden) {
                    event.preventDefault();
                    bar.querySelector('a')?.focus();
                }
            });
            window
                .matchMedia('(max-width: 767.97px)')
                .addEventListener('change', () => this.closeSearch());
        }

        toggleSearch() {
            const content = document.querySelector(this.selectors.content);

            if (!content) {
                return;
            }

            const opening = !content.classList.contains(this.selectors.activeClass);

            if (opening) {
                this.closeNavigation();
            }
            document.querySelectorAll(this.selectors.toggler).forEach((button) => {
                button.classList.toggle(this.selectors.activeClass, opening);
                button.setAttribute('aria-expanded', String(opening));
            });
            content.classList.toggle(this.selectors.activeClass, opening);
            if (opening) {
                document.querySelector(this.selectors.input)?.focus();
            } else {
                this.closeBar();
            }
        }

        handleInput(input) {
            const search = input.closest(this.selectors.search);

            if (!search) {
                return;
            }

            const query = input.value.trim();

            search.querySelectorAll('.search__clear').forEach((button) => {
                button.hidden = !query.length;
            });
            search
                .querySelectorAll('.search__all')
                .forEach((link) =>
                    link.setAttribute('href', `search.html?s=${encodeURIComponent(query)}`),
                );
            const bar = search.querySelector(this.selectors.bar);

            if (query.length) {
                this.openBar(bar);
            } else {
                this.closeBar(bar);
            }
        }

        openBar(bar) {
            if (!bar) {
                return;
            }

            bar.hidden = false;
            bar.classList.add(this.selectors.visibleClass);
            bar.closest(this.selectors.search)
                ?.querySelectorAll(this.selectors.input)
                .forEach((input) => input.setAttribute('aria-expanded', 'true'));
        }

        closeBar(bar) {
            const bars = bar ? [bar] : document.querySelectorAll(this.selectors.bar);

            bars.forEach((element) => {
                element.hidden = true;
                element.classList.remove(this.selectors.visibleClass);
                element
                    .closest(this.selectors.search)
                    ?.querySelectorAll(this.selectors.input)
                    .forEach((input) => input.setAttribute('aria-expanded', 'false'));
            });
        }

        closeSearch(restoreFocus = false) {
            const wasOpen = document
                .querySelector(this.selectors.content)
                ?.classList.contains(this.selectors.activeClass);

            document.querySelectorAll(this.selectors.toggler).forEach((button) => {
                button.classList.remove(this.selectors.activeClass);
                button.setAttribute('aria-expanded', 'false');
            });
            document
                .querySelectorAll(this.selectors.content)
                .forEach((content) => content.classList.remove(this.selectors.activeClass));
            this.closeBar();
            if (restoreFocus && wasOpen) {
                document.querySelector(this.selectors.toggler)?.focus();
            }
        }
    }

    // === select ===

    /**
     * Accessible custom select driven by a native <select>.
     * The native element stays in the DOM and remains the source of truth for
     * value / name / form / required / validation / change / reset.
     *
     * Usage:
     *   new CustomSelect(select, options)
     *   CustomSelect.init(select, options)
     *   CustomSelect.initAll(scope, options)
     */

    class CustomSelect {
        static ROOT_CLASS = 'custom-select';

        static NATIVE_CLASS = 'custom-select__native';

        static TRIGGER_CLASS = 'custom-select__trigger';

        static VALUE_CLASS = 'custom-select__value';

        static LIST_CLASS = 'custom-select__list';

        static OPTION_CLASS = 'custom-select__option';

        static GROUP_CLASS = 'custom-select__group';

        static GROUP_LABEL_CLASS = 'custom-select__group-label';

        static EMPTY_CLASS = 'custom-select__empty';

        static OPEN_CLASS = 'is-open';

        static OPEN_TOP_CLASS = 'is-open-top';

        static DETACHED_CLASS = 'is-detached';

        static SELECTED_CLASS = 'is-selected';

        static ACTIVE_CLASS = 'is-active';

        static DISABLED_CLASS = 'is-disabled';

        static FOCUSED_CLASS = 'is-focused';

        static INVALID_CLASS = 'is-invalid';

        static TYPEAHEAD_TIMEOUT = 500;

        static MIRRORED_ATTRIBUTES = ['aria-describedby', 'aria-errormessage', 'title'];

        static matchesOption(label, query) {
            const normalize = (value) =>
                String(value).trim().toLocaleLowerCase('ru').replaceAll('ё', 'е');
            return normalize(label).includes(normalize(query));
        }

        static DEFAULTS = {
            appendTo: null,
            maxHeight: 300,
            searchable: false,
            emptyText: 'Нет доступных вариантов',
            formatSelected: (labels) => labels.join(', '),
            triggerIcon: 'icon-chevron-down',
        };

        static uid = 0;

        static hooksInstalled = false;

        /**
         * @param {string} base
         * @returns {string}
         */
        static uniqueId(base) {
            let id = base;
            while (document.getElementById(id)) {
                CustomSelect.uid += 1;
                id = `${base}-${CustomSelect.uid}`;
            }

            return id;
        }

        /**
         * `select.value`, `select.selectedIndex` and `option.selected` change no
         * attribute and fire no event, so a MutationObserver cannot see them. The
         * prototype setters are wrapped once and forward to the original before asking
         * the owning instance to re-sync; elements without an instance are untouched.
         */
        static installNativeHooks() {
            if (CustomSelect.hooksInstalled) {
                return;
            }

            CustomSelect.hooksInstalled = true;

            const instanceFor = (select) => {
                const instance = CustomSelect.instances.get(select);
                return instance && !instance._isSyncing ? instance : null;
            };

            const hook = (prototype, property, resolve) => {
                const descriptor = Object.getOwnPropertyDescriptor(prototype, property);

                if (!descriptor?.set) {
                    return;
                }

                Object.defineProperty(prototype, property, {
                    ...descriptor,
                    set(value) {
                        descriptor.set.call(this, value);
                        resolve(this)?.syncFromNative();
                    },
                });
            };

            hook(HTMLSelectElement.prototype, 'value', instanceFor);
            hook(HTMLSelectElement.prototype, 'selectedIndex', instanceFor);
            hook(HTMLOptionElement.prototype, 'selected', (option) => {
                const select = option.closest('select');
                return select ? instanceFor(select) : null;
            });
        }

        static instances = new WeakMap();

        static openInstance = null;

        static _documentBound = 0;

        /**
         * @param {HTMLSelectElement} select
         * @param {Partial<typeof CustomSelect.DEFAULTS>} [options]
         */
        constructor(select, options = {}) {
            if (!(select instanceof HTMLSelectElement)) {
                throw new TypeError('CustomSelect: expected a <select> element');
            }

            const existing = CustomSelect.instances.get(select);

            if (existing) {
                return existing;
            }

            this.native = select;
            this.options = {
                ...CustomSelect.DEFAULTS,
                ...this._readDataOptions(),
                ...options,
            };

            this.isOpen = false;
            this.activeIndex = -1;
            this.optionEls = [];
            this.typeaheadBuffer = '';
            this.typeaheadTimer = null;
            this._isSyncing = false;
            this._createdRoot = false;

            this._onTriggerPointerDown = this._onTriggerPointerDown.bind(this);
            this._onTriggerKeydown = this._onTriggerKeydown.bind(this);
            this._onTriggerFocus = this._onTriggerFocus.bind(this);
            this._onTriggerBlur = this._onTriggerBlur.bind(this);
            this._onListPointerDown = this._onListPointerDown.bind(this);
            this._onListClick = this._onListClick.bind(this);
            this._onNativeChange = this._onNativeChange.bind(this);
            this._onFormReset = this._onFormReset.bind(this);
            this._onViewportChange = this._onViewportChange.bind(this);
            this._onMutation = this._onMutation.bind(this);

            CustomSelect.installNativeHooks();
            CustomSelect.instances.set(select, this);

            this.init();
        }

        /**
         * @param {HTMLSelectElement} select
         * @param {Partial<typeof CustomSelect.DEFAULTS>} [options]
         * @returns {CustomSelect}
         */
        static init(select, options) {
            return new CustomSelect(select, options);
        }

        /**
         * @param {ParentNode} [scope]
         * @param {Partial<typeof CustomSelect.DEFAULTS>} [options]
         * @returns {CustomSelect[]}
         */
        static initAll(scope = document, options) {
            return Array.from(scope.querySelectorAll('select[data-custom-select]')).map(
                (select) => new CustomSelect(select, options),
            );
        }

        /**
         * @param {HTMLSelectElement} select
         * @returns {CustomSelect | undefined}
         */
        static get(select) {
            return CustomSelect.instances.get(select);
        }

        init() {
            this.render();
            this.renderOptions();
            this.bindEvents();
            this.bindDocumentEvents();
            this.bindNativeSelectEvents();
            this.syncFromNative();
            this.updateDisabled();
            this.updateValidity();
        }

        // render

        render() {
            const parent = this.native.parentElement;

            if (parent && parent.classList.contains(CustomSelect.ROOT_CLASS)) {
                this.root = parent;
            } else {
                this.root = document.createElement('div');
                this.root.className = CustomSelect.ROOT_CLASS;
                this._createdRoot = true;
                this.native.replaceWith(this.root);
                this.root.append(this.native);
            }

            this.originalTabIndex = this.native.getAttribute('tabindex');
            this.originalAriaHidden = this.native.getAttribute('aria-hidden');
            this.native.classList.add(CustomSelect.NATIVE_CLASS);
            this.native.setAttribute('aria-hidden', 'true');
            this.native.tabIndex = -1;
            this.root.classList.toggle(
                'custom-select--chip',
                this.native.hasAttribute('data-select-chip'),
            );

            const base = this.native.id || `custom-select-${(CustomSelect.uid += 1)}`;

            this.baseId = base;

            this.trigger = document.createElement('button');
            this.trigger.type = 'button';
            this.trigger.className = CustomSelect.TRIGGER_CLASS;
            if (this.options.triggerIcon) {
                this.trigger.classList.add(this.options.triggerIcon);
            }
            this.trigger.id = CustomSelect.uniqueId(`${base}-trigger`);
            this.trigger.setAttribute('aria-haspopup', 'listbox');
            this.trigger.setAttribute('role', 'combobox');
            this.trigger.setAttribute('aria-expanded', 'false');

            this.valueEl = document.createElement('span');
            this.valueEl.className = CustomSelect.VALUE_CLASS;
            this.trigger.append(this.valueEl);

            this.list = document.createElement('div');
            this.list.className = CustomSelect.LIST_CLASS;
            this.list.id = CustomSelect.uniqueId(`${base}-listbox`);
            this.list.setAttribute('role', 'listbox');
            this.list.tabIndex = -1;
            this.list.hidden = true;
            this.updateMultiple();
            if (this.options.maxHeight) {
                this.list.style.maxHeight = `${this.options.maxHeight / 16}rem`;
            }

            this.trigger.setAttribute('aria-controls', this.list.id);

            this.native.after(this.trigger);
            this.dropdown = document.createElement('div');
            this.dropdown.className = 'custom-select__dropdown';
            this.dropdown.hidden = true;
            this.trigger.after(this.dropdown);
            if (this.options.searchable) {
                this.search = document.createElement('input');
                this.search.type = 'search';
                this.search.className = 'custom-select__search';
                this.search.placeholder = 'Поиск';
                this.search.setAttribute('aria-label', 'Поиск вариантов');
                this.search.setAttribute('role', 'combobox');
                this.search.setAttribute('aria-controls', this.list.id);
                this.search.setAttribute('aria-autocomplete', 'list');
                this.search.addEventListener('input', () => this.filterOptions(this.search.value));
                this.search.addEventListener('keydown', (event) => {
                    if (
                        ['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', 'Escape', 'Tab'].includes(
                            event.key,
                        )
                    ) {
                        this._onTriggerKeydown(event);
                    }
                });
                this.dropdown.append(this.search);
            }
            this.dropdown.append(this.list);
            if (this.native.hasAttribute('data-select-chip')) {
                this.clearButton = document.createElement('button');
                this.clearButton.type = 'button';
                this.clearButton.className = 'custom-select__clear icon-close';
                this.clearButton.setAttribute(
                    'aria-label',
                    `Очистить: ${this.native.getAttribute('aria-label') || 'выбор'}`,
                );
                this.clearButton.addEventListener('click', () => {
                    this.clear();
                    this.close();
                    this.trigger.focus();
                });
                this.root.append(this.clearButton);
            }

            if (this.options.appendTo) {
                this.list.classList.add(CustomSelect.DETACHED_CLASS);
                this.options.appendTo.append(this.dropdown);
            }

            this.updateAccessibleName();
        }

        updateAccessibleName() {
            const ariaLabel = this.native.getAttribute('aria-label');

            if (ariaLabel) {
                this.trigger.setAttribute('aria-label', ariaLabel);
            } else {
                this.trigger.removeAttribute('aria-label');
            }

            const labelIds = [];
            const ariaLabelledBy = this.native.getAttribute('aria-labelledby');

            if (ariaLabelledBy) {
                labelIds.push(ariaLabelledBy);
            } else {
                const label = this._findLabel();

                if (label) {
                    if (!label.id) {
                        label.id = CustomSelect.uniqueId(`${this.baseId}-label`);
                    }
                    labelIds.push(label.id);
                }
            }

            if (labelIds.length) {
                // Trigger content is the current value; keeping its own id in the list
                // makes the accessible name read as "<label> <value>".
                this.trigger.setAttribute(
                    'aria-labelledby',
                    `${labelIds.join(' ')} ${this.trigger.id}`,
                );
            } else {
                this.trigger.removeAttribute('aria-labelledby');
            }

            CustomSelect.MIRRORED_ATTRIBUTES.forEach((name) => {
                const value = this.native.getAttribute(name);

                if (value) {
                    this.trigger.setAttribute(name, value);
                } else {
                    this.trigger.removeAttribute(name);
                }
            });

            if (this.native.required) {
                this.trigger.setAttribute('aria-required', 'true');
            } else {
                this.trigger.removeAttribute('aria-required');
            }
        }

        renderOptions() {
            const activeValue = this.optionEls[this.activeIndex]?.dataset.value ?? null;

            this.list.textContent = '';
            this.optionEls = [];

            Array.from(this.native.children).forEach((child) => {
                if (child instanceof HTMLOptGroupElement) {
                    const group = document.createElement('div');

                    group.className = CustomSelect.GROUP_CLASS;
                    group.setAttribute('role', 'group');
                    group.setAttribute('aria-label', child.label);

                    const label = document.createElement('div');

                    label.className = CustomSelect.GROUP_LABEL_CLASS;
                    label.textContent = child.label;
                    label.setAttribute('aria-hidden', 'true');
                    group.append(label);

                    Array.from(child.children).forEach((option) => {
                        if (option instanceof HTMLOptionElement) {
                            group.append(this.renderOption(option, child.disabled));
                        }
                    });

                    this.list.append(group);

                    return;
                }

                if (child instanceof HTMLOptionElement) {
                    this.list.append(this.renderOption(child, false));
                }
            });

            if (!this.optionEls.length) {
                const empty = document.createElement('div');

                empty.className = CustomSelect.EMPTY_CLASS;
                empty.textContent = this.options.emptyText;
                this.list.append(empty);
            }

            this.activeIndex =
                activeValue === null
                    ? -1
                    : this.optionEls.findIndex((el) => el.dataset.value === activeValue);
            this.filterOptions(this.search?.value || '');
            this.updateActiveOption();
        }

        filterOptions(query = '') {
            this.optionEls.forEach((el) => {
                const option = this.native.options[Number(el.dataset.index)];

                el.hidden = option.hidden || !CustomSelect.matchesOption(option.text, query);
            });
            this.list.querySelectorAll(`.${CustomSelect.GROUP_CLASS}`).forEach((group) => {
                group.hidden = ![...group.querySelectorAll(`.${CustomSelect.OPTION_CLASS}`)].some(
                    (el) => !el.hidden,
                );
            });
            let empty = this.list.querySelector(`.${CustomSelect.EMPTY_CLASS}`);

            if (!empty) {
                empty = document.createElement('div');
                empty.className = CustomSelect.EMPTY_CLASS;
                empty.setAttribute('role', 'status');
                this.list.append(empty);
            }
            empty.textContent = query.trim() ? 'Ничего не найдено' : this.options.emptyText;
            empty.hidden = this.optionEls.some((el) => !el.hidden);
            this.activeIndex = this.optionEls.indexOf(this.enabledOptions[0]);
            this.updateActiveOption();
            if (this.isOpen) {
                this.updatePosition();
            }
        }

        clear() {
            const before = this._currentValue();

            this._mutateNative(() => {
                if (this.native.multiple) {
                    [...this.native.options].forEach((option) => {
                        option.selected = false;
                    });
                } else {
                    this.native.selectedIndex = [...this.native.options].findIndex(
                        (option) => option.value === '',
                    );
                }
            });
            this.syncFromNative();
            if (before !== this._currentValue()) {
                this.native.dispatchEvent(
                    new Event('input', {
                        bubbles: true,
                    }),
                );
                this.native.dispatchEvent(
                    new Event('change', {
                        bubbles: true,
                    }),
                );
                this.emit('change');
            }
        }

        /**
         * @param {HTMLOptionElement} option
         * @param {boolean} groupDisabled
         * @returns {HTMLElement}
         */
        renderOption(option, groupDisabled) {
            const index = this.optionEls.length;
            const el = document.createElement('div');
            const disabled = option.disabled || groupDisabled;

            el.className = CustomSelect.OPTION_CLASS;
            el.id = CustomSelect.uniqueId(`${this.baseId}-option-${index}`);
            el.setAttribute('role', 'option');
            el.setAttribute('aria-selected', option.selected ? 'true' : 'false');
            el.dataset.value = option.value;
            el.dataset.index = String(option.index);
            el.textContent = option.text;

            if (disabled) {
                el.setAttribute('aria-disabled', 'true');
                el.classList.add(CustomSelect.DISABLED_CLASS);
            }
            if (option.selected) {
                el.classList.add(CustomSelect.SELECTED_CLASS);
            }

            this.optionEls.push(el);

            return el;
        }

        // events

        bindEvents() {
            this.trigger.addEventListener('click', this._onTriggerPointerDown);
            this.trigger.addEventListener('keydown', this._onTriggerKeydown);
            this.trigger.addEventListener('focus', this._onTriggerFocus);
            this.trigger.addEventListener('blur', this._onTriggerBlur);
            this.list.addEventListener('pointerdown', this._onListPointerDown);
            this.list.addEventListener('click', this._onListClick);
            this.dropdown.addEventListener('focusout', this._onTriggerBlur);
        }

        bindDocumentEvents() {
            if (CustomSelect._documentBound === 0) {
                CustomSelect._onDocumentPointerDown = (event) => {
                    const instance = CustomSelect.openInstance;

                    if (!instance) {
                        return;
                    }

                    if (
                        instance.root.contains(event.target) ||
                        instance.dropdown.contains(event.target)
                    ) {
                        return;
                    }

                    instance.close();
                };

                CustomSelect._onDocumentKeydown = (event) => {
                    if (event.key !== 'Escape') {
                        return;
                    }

                    const instance = CustomSelect.openInstance;

                    if (!instance) {
                        return;
                    }

                    event.preventDefault();
                    instance.close({
                        restoreFocus: true,
                    });
                };

                document.addEventListener('pointerdown', CustomSelect._onDocumentPointerDown, true);
                document.addEventListener('keydown', CustomSelect._onDocumentKeydown, true);
            }

            CustomSelect._documentBound += 1;
        }

        unbindDocumentEvents() {
            CustomSelect._documentBound -= 1;

            if (CustomSelect._documentBound <= 0) {
                CustomSelect._documentBound = 0;
                document.removeEventListener(
                    'pointerdown',
                    CustomSelect._onDocumentPointerDown,
                    true,
                );
                document.removeEventListener('keydown', CustomSelect._onDocumentKeydown, true);
            }
        }

        bindNativeSelectEvents() {
            this.native.addEventListener('change', this._onNativeChange);
            this._onInvalid = (event) => {
                event.preventDefault();
                this.native.setAttribute('aria-invalid', 'true');
                this.trigger.focus();
            };
            this.native.addEventListener('invalid', this._onInvalid);

            this.form = this.native.form;
            if (this.form) {
                this.form.addEventListener('reset', this._onFormReset);
            }

            this.observer = new MutationObserver(this._onMutation);
            this.observer.observe(this.native, {
                childList: true,
                subtree: true,
                characterData: true,
                attributes: true,
            });
        }

        // state

        open() {
            if (this.isOpen || this.native.disabled) {
                return;
            }

            if (CustomSelect.openInstance && CustomSelect.openInstance !== this) {
                CustomSelect.openInstance.close();
            }

            this.isOpen = true;
            this.dropdown.hidden = false;
            this.list.hidden = false;
            if (this.search) {
                this.search.value = '';
                this.search.setAttribute('aria-expanded', 'true');
            }
            this.filterOptions('');
            this.root.classList.add(CustomSelect.OPEN_CLASS);
            this.trigger.setAttribute('aria-expanded', 'true');
            CustomSelect.openInstance = this;

            const selected = this.optionEls.find((el) =>
                el.classList.contains(CustomSelect.SELECTED_CLASS),
            );
            const fallback = this.enabledOptions[0] || null;

            this.activeIndex = this.optionEls.indexOf(
                selected &&
                    !selected.hidden &&
                    !selected.classList.contains(CustomSelect.DISABLED_CLASS)
                    ? selected
                    : fallback,
            );
            this.updateActiveOption();

            this.updatePosition();
            window.addEventListener('scroll', this._onViewportChange, true);
            window.addEventListener('resize', this._onViewportChange);
            this.search?.focus({
                preventScroll: true,
            });

            this.emit('open');
        }

        /**
         * @param {{ restoreFocus?: boolean }} [params]
         */
        close({ restoreFocus = false } = {}) {
            if (!this.isOpen) {
                return;
            }

            this.isOpen = false;
            this.dropdown.hidden = true;
            this.list.hidden = true;
            this.search?.setAttribute('aria-expanded', 'false');
            this.root.classList.remove(CustomSelect.OPEN_CLASS, CustomSelect.OPEN_TOP_CLASS);
            this.trigger.setAttribute('aria-expanded', 'false');
            this.trigger.removeAttribute('aria-activedescendant');
            this.activeIndex = -1;
            this.updateActiveOption();
            this._resetTypeahead();

            if (CustomSelect.openInstance === this) {
                CustomSelect.openInstance = null;
            }

            window.removeEventListener('scroll', this._onViewportChange, true);
            window.removeEventListener('resize', this._onViewportChange);

            if (restoreFocus) {
                this.trigger.focus();
            }

            this.emit('close');
        }

        toggle() {
            if (this.isOpen) {
                this.close({
                    restoreFocus: true,
                });
            } else {
                this.open();
            }
        }

        /**
         * @param {string} value
         */
        select(value) {
            const option = this.optionEls.find((el) => el.dataset.value === value);

            if (option) {
                this.selectOption(option);
            }
        }

        reset() {
            this._mutateNative(() => {
                Array.from(this.native.options).forEach((option) => {
                    option.selected = option.defaultSelected;
                });
            });
            this.syncFromNative();
        }

        refresh() {
            this.updateAccessibleName();
            this.renderOptions();
            this.syncFromNative();
            this.updateDisabled();
            this.updateValidity();
        }

        destroy() {
            this.close();
            this.observer?.disconnect();
            this.unbindDocumentEvents();

            this.trigger.removeEventListener('click', this._onTriggerPointerDown);
            this.trigger.removeEventListener('keydown', this._onTriggerKeydown);
            this.trigger.removeEventListener('focus', this._onTriggerFocus);
            this.trigger.removeEventListener('blur', this._onTriggerBlur);
            this.list.removeEventListener('pointerdown', this._onListPointerDown);
            this.list.removeEventListener('click', this._onListClick);
            this.dropdown.removeEventListener('focusout', this._onTriggerBlur);
            this.native.removeEventListener('change', this._onNativeChange);
            this.native.removeEventListener('invalid', this._onInvalid);
            this.form?.removeEventListener('reset', this._onFormReset);
            this._resetTypeahead();

            this.trigger.remove();
            this.dropdown.remove();
            this.clearButton?.remove();
            if (this.originalTabIndex === null) {
                this.native.removeAttribute('tabindex');
            } else {
                this.native.setAttribute('tabindex', this.originalTabIndex);
            }
            if (this.originalAriaHidden === null) {
                this.native.removeAttribute('aria-hidden');
            } else {
                this.native.setAttribute('aria-hidden', this.originalAriaHidden);
            }
            this.native.classList.remove(CustomSelect.NATIVE_CLASS);
            this.root.classList.remove(
                CustomSelect.OPEN_CLASS,
                CustomSelect.OPEN_TOP_CLASS,
                CustomSelect.DISABLED_CLASS,
                CustomSelect.FOCUSED_CLASS,
                CustomSelect.INVALID_CLASS,
            );

            if (this._createdRoot) {
                this.root.replaceWith(this.native);
            }

            CustomSelect.instances.delete(this.native);
        }

        /**
         * @param {HTMLElement} option
         */
        selectOption(option) {
            if (
                !option ||
                option.hidden ||
                this.native.disabled ||
                option.classList.contains(CustomSelect.DISABLED_CLASS)
            ) {
                return;
            }

            const nativeOption = this.native.options[Number(option.dataset.index)];

            if (!nativeOption) {
                return;
            }

            const previousValue = this._currentValue();

            this._mutateNative(() => {
                if (this.native.multiple) {
                    nativeOption.selected = !nativeOption.selected;
                } else {
                    this.native.selectedIndex = nativeOption.index;
                }
            });

            this.syncFromNative();

            if (this._currentValue() !== previousValue) {
                this.native.dispatchEvent(
                    new Event('input', {
                        bubbles: true,
                    }),
                );
                this.native.dispatchEvent(
                    new Event('change', {
                        bubbles: true,
                    }),
                );
                this.emit('change');
            }

            if (this.native.multiple) {
                this.activeIndex = this.optionEls.indexOf(option);
                this.updateActiveOption();
            } else {
                this.close({
                    restoreFocus: true,
                });
            }
        }

        /**
         * Applies a write to the native select without letting the observer or the
         * patched accessors react to our own change.
         *
         * @param {() => void} mutate
         */
        _mutateNative(mutate) {
            this._isSyncing = true;
            mutate();
            this.observer?.takeRecords();
            this._isSyncing = false;
        }

        syncFromNative() {
            const valueLabels = [];
            let placeholder = '';

            this.optionEls.forEach((el) => {
                const nativeOption = this.native.options[Number(el.dataset.index)];
                const isSelected = Boolean(nativeOption?.selected);

                el.setAttribute('aria-selected', isSelected ? 'true' : 'false');
                el.classList.toggle(CustomSelect.SELECTED_CLASS, isSelected);

                if (!isSelected) {
                    return;
                }

                if (nativeOption.value) {
                    valueLabels.push(el.textContent);
                } else if (!placeholder) {
                    placeholder = el.textContent;
                }
            });

            const hasValue = valueLabels.length > 0;

            this.valueEl.textContent = hasValue
                ? this.options.formatSelected(valueLabels)
                : placeholder || this.optionEls[0]?.textContent || '';
            this.valueEl.classList.toggle(CustomSelect.SELECTED_CLASS, hasValue);
            if (this.native.hasAttribute('data-select-chip')) {
                this.valueEl.textContent =
                    (this.native.getAttribute('aria-label') || 'Выбрано') +
                    (hasValue ? `: ${valueLabels.length}` : '');
                this.root.classList.toggle('has-value', hasValue);
                this.clearButton.hidden = !hasValue;
            }
            this.updateValidity();
        }

        updateActiveOption() {
            this.optionEls.forEach((el, index) => {
                el.classList.toggle(CustomSelect.ACTIVE_CLASS, index === this.activeIndex);
            });

            const active = this.optionEls[this.activeIndex];

            if (active && this.isOpen) {
                this.trigger.setAttribute('aria-activedescendant', active.id);
                this.search?.setAttribute('aria-activedescendant', active.id);
                if (typeof active.scrollIntoView === 'function') {
                    active.scrollIntoView({
                        block: 'nearest',
                    });
                }
            } else {
                this.trigger.removeAttribute('aria-activedescendant');
                this.search?.removeAttribute('aria-activedescendant');
            }
        }

        updateMultiple() {
            if (this.native.multiple) {
                this.list.setAttribute('aria-multiselectable', 'true');
            } else {
                this.list.removeAttribute('aria-multiselectable');
            }
        }

        updateDisabled() {
            const disabled = this.native.disabled;

            this.trigger.disabled = disabled;
            if (this.clearButton) {
                this.clearButton.disabled = disabled;
            }
            this.root.classList.toggle(CustomSelect.DISABLED_CLASS, disabled);
            if (disabled) {
                this.close();
            }
        }

        updateValidity() {
            const invalid = this.native.classList.contains('_error')
                ? 'true'
                : this.native.getAttribute('aria-invalid');

            if (invalid && invalid !== 'false') {
                this.trigger.setAttribute('aria-invalid', invalid);
                this.root.classList.add(CustomSelect.INVALID_CLASS);
            } else {
                this.trigger.removeAttribute('aria-invalid');
                this.root.classList.remove(CustomSelect.INVALID_CLASS);
            }
        }

        updatePosition() {
            const triggerRect = this.trigger.getBoundingClientRect();
            const below = window.innerHeight - triggerRect.bottom - 12;
            const above = triggerRect.top - 12;
            const up =
                below < Math.min(this.options.maxHeight, this.dropdown.scrollHeight) &&
                above > below;
            const height = Math.max(0, Math.min(this.options.maxHeight, up ? above : below));

            this.root.classList.toggle(CustomSelect.OPEN_TOP_CLASS, up);
            Object.assign(this.dropdown.style, {
                position: 'fixed',
                width: `${Math.min(Math.max(triggerRect.width, 200), window.innerWidth - 16)}px`,
                left: `${Math.max(8, Math.min(triggerRect.left, window.innerWidth - Math.max(triggerRect.width, 200) - 8))}px`,
                maxHeight: `${height}px`,
                top: up ? 'auto' : `${Math.max(8, triggerRect.bottom + 4)}px`,
                bottom: up ? `${Math.max(8, window.innerHeight - triggerRect.top + 4)}px` : 'auto',
            });
        }

        /**
         * @param {"open" | "close" | "change"} name
         */
        emit(name) {
            this.root.dispatchEvent(
                new CustomEvent(`custom-select:${name}`, {
                    bubbles: true,
                    detail: {
                        instance: this,
                        select: this.native,
                        value: this.native.value,
                    },
                }),
            );
        }

        get enabledOptions() {
            return this.optionEls.filter(
                (el) => !el.hidden && !el.classList.contains(CustomSelect.DISABLED_CLASS),
            );
        }

        // handlers

        /**
         * @param {PointerEvent} event
         */
        _onTriggerPointerDown(event) {
            if (event.button !== undefined && event.button !== 0) {
                return;
            }

            event.preventDefault();
            this.trigger.focus();
            this.toggle();
        }

        /**
         * @param {PointerEvent} event
         */
        _onListPointerDown(event) {
            // Keep focus on the trigger so the option click is not preceded by a blur.
            // Touch is excluded, otherwise the dropdown could not be panned.
            if (event.pointerType === 'touch') {
                return;
            }

            event.preventDefault();
        }

        /**
         * @param {MouseEvent} event
         */
        _onListClick(event) {
            const option = event.target.closest(`.${CustomSelect.OPTION_CLASS}`);

            if (!option || !this.list.contains(option)) {
                return;
            }

            this.selectOption(option);
        }

        _onTriggerFocus() {
            this.root.classList.add(CustomSelect.FOCUSED_CLASS);
        }

        _onTriggerBlur() {
            this.root.classList.remove(CustomSelect.FOCUSED_CLASS);
            setTimeout(() => {
                if (
                    !this.root.contains(document.activeElement) &&
                    !this.dropdown.contains(document.activeElement)
                ) {
                    this.close();
                }
            }, 0);
        }

        _onNativeChange() {
            if (this._isSyncing) {
                return;
            }

            if (this.native.validity.valid && !this.native.classList.contains('_error')) {
                this.native.setAttribute('aria-invalid', 'false');
            }
            this.syncFromNative();
        }

        _onFormReset(event) {
            // The reset event fires before the control values are restored.
            setTimeout(() => {
                if (event.defaultPrevented) {
                    return;
                }

                this.native.removeAttribute('aria-invalid');
                this.native.classList.remove('_error');
                const field = this.native.closest('.form__field');

                field?.classList.remove('_error');
                field?.querySelectorAll('.form__error-message').forEach((message) => {
                    message.hidden = true;
                    message.style.display = 'none';
                });
                if (this.search) {
                    this.search.value = '';
                }
                this.filterOptions('');
                this.syncFromNative();
                this.close();
            }, 0);
        }

        _onViewportChange() {
            if (this.isOpen) {
                this.updatePosition();
            }
        }

        /**
         * @param {MutationRecord[]} records
         */
        _onMutation(records) {
            if (this._isSyncing) {
                return;
            }

            let needsRefresh = false;

            records.forEach((record) => {
                if (record.target !== this.native) {
                    needsRefresh = true;

                    return;
                }

                if (record.type !== 'attributes') {
                    needsRefresh = true;

                    return;
                }

                switch (record.attributeName) {
                    case 'disabled':
                        this.updateDisabled();
                        break;
                    case 'aria-invalid':
                        this.updateValidity();
                        break;
                    case 'required':
                    case 'aria-label':
                    case 'aria-labelledby':
                    case 'aria-describedby':
                    case 'aria-errormessage':
                    case 'title':
                        this.updateAccessibleName();
                        break;
                    case 'multiple':
                        this.updateMultiple();
                        needsRefresh = true;
                        break;
                    case 'class':
                        this.updateValidity();
                        break;
                    default:
                        needsRefresh = true;
                }
            });

            if (needsRefresh) {
                this.refresh();
            }
        }

        /**
         * @param {KeyboardEvent} event
         */
        _onTriggerKeydown(event) {
            const { key } = event;

            if (key === 'Tab') {
                this.close();

                return;
            }

            if (key === 'Escape') {
                if (this.isOpen) {
                    event.preventDefault();
                    this.close({
                        restoreFocus: true,
                    });
                }

                return;
            }

            if (key === 'ArrowDown' || key === 'ArrowUp') {
                event.preventDefault();

                if (!this.isOpen) {
                    this.open();
                    if (key === 'ArrowUp') {
                        this._setActiveIndex(
                            this.optionEls.indexOf(this.enabledOptions.at(-1) || null),
                        );
                    }

                    return;
                }

                this._moveActive(key === 'ArrowDown' ? 1 : -1);

                return;
            }

            if (key === 'Home' && this.isOpen) {
                event.preventDefault();
                this._setActiveIndex(this.optionEls.indexOf(this.enabledOptions[0] || null));

                return;
            }

            if (key === 'End' && this.isOpen) {
                event.preventDefault();
                this._setActiveIndex(this.optionEls.indexOf(this.enabledOptions.at(-1) || null));

                return;
            }

            if (key === 'Enter' || key === ' ' || key === 'Spacebar') {
                event.preventDefault();

                if (!this.isOpen) {
                    this.open();

                    return;
                }

                this.selectOption(this.optionEls[this.activeIndex]);

                return;
            }

            if (key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
                this.handleTypeahead(key);
            }
        }

        /**
         * @param {string} char
         */
        handleTypeahead(char) {
            if (!this.isOpen) {
                this.open();
            }

            this.typeaheadBuffer += char.toLowerCase();

            if (this.typeaheadTimer) {
                clearTimeout(this.typeaheadTimer);
            }
            this.typeaheadTimer = setTimeout(
                () => this._resetTypeahead(),
                CustomSelect.TYPEAHEAD_TIMEOUT,
            );

            const enabled = this.enabledOptions;
            const match = enabled.find((el) =>
                el.textContent.toLowerCase().startsWith(this.typeaheadBuffer),
            );

            if (match) {
                this._setActiveIndex(this.optionEls.indexOf(match));
            }
        }

        _resetTypeahead() {
            this.typeaheadBuffer = '';
            if (this.typeaheadTimer) {
                clearTimeout(this.typeaheadTimer);
                this.typeaheadTimer = null;
            }
        }

        /**
         * @param {number} index
         */
        _setActiveIndex(index) {
            if (index < 0) {
                return;
            }

            this.activeIndex = index;
            this.updateActiveOption();
        }

        /**
         * @param {number} delta
         */
        _moveActive(delta) {
            const enabled = this.enabledOptions;

            if (!enabled.length) {
                return;
            }

            const current = this.optionEls[this.activeIndex];
            let index = enabled.indexOf(current);

            if (index === -1) {
                index = delta > 0 ? -1 : 0;
            }

            const next = enabled[(index + delta + enabled.length) % enabled.length];

            this._setActiveIndex(this.optionEls.indexOf(next));
        }

        /**
         * @returns {string}
         */
        _currentValue() {
            if (!this.native.multiple) {
                return this.native.value;
            }

            return Array.from(this.native.selectedOptions)
                .map((option) => option.value)
                .join('\u0000');
        }

        /**
         * @returns {HTMLLabelElement | null}
         */
        _findLabel() {
            if (this.native.labels?.length) {
                const label = this.native.labels[0];
                return label.querySelector('.form__label, .product-listing__sr-only') || label;
            }

            return this.native.closest('label');
        }

        /**
         * @returns {Partial<typeof CustomSelect.DEFAULTS>}
         */
        _readDataOptions() {
            const data = {};
            const { maxHeight, emptyText, triggerIcon, appendTo } = this.native.dataset;

            if (maxHeight) {
                data.maxHeight = Number(maxHeight);
            }
            if (emptyText) {
                data.emptyText = emptyText;
            }
            if (triggerIcon !== undefined) {
                data.triggerIcon = triggerIcon;
            }
            if (appendTo) {
                data.appendTo = document.querySelector(appendTo);
            }
            data.searchable =
                this.native.hasAttribute('data-has-search') &&
                this.native.dataset.hasSearch !== 'false';

            return data;
        }
    }

    // === sliders ===

    class SlidersController {
        static controls(container) {
            return {
                navigation: {
                    nextEl: container.querySelector('.swiper-button-next'),
                    prevEl: container.querySelector('.swiper-button-prev'),
                },
                pagination: {
                    el: container.querySelector('.swiper-pagination'),
                    clickable: true,
                },
            };
        }

        static createSlider(element, options) {
            if (!element || typeof Swiper === 'undefined') {
                return null;
            }

            return element.swiper || new Swiper(element, options);
        }

        init() {
            if (typeof Swiper === 'undefined') {
                return;
            }

            document.querySelectorAll('[data-showcase-slider]').forEach((container) => {
                const count = Number(container.dataset.showcaseSlider);
                const breakpoints = {
                    576: {
                        slidesPerView: 2,
                    },
                    768: {
                        slidesPerView: 3,
                    },
                    992: {
                        slidesPerView: count === 3 ? 3 : 4,
                    },
                    1200: {
                        slidesPerView: count === 6 ? 5 : count === 5 ? 4 : 3,
                    },
                    1320: {
                        slidesPerView: count,
                    },
                };

                SlidersController.createSlider(container.querySelector('.swiper'), {
                    slidesPerView: 1,
                    spaceBetween: count === 3 ? 20 : 10,
                    breakpoints,
                    watchOverflow: true,
                    navigation: SlidersController.controls(container).navigation,
                });
            });
            document.querySelectorAll('.marketing__slider').forEach((container) => {
                SlidersController.createSlider(container.querySelector('.swiper'), {
                    slidesPerView: 'auto',
                    spaceBetween: 20,
                    watchOverflow: true,
                    breakpoints: {
                        768: {
                            slidesPerView: 'auto',
                        },
                        992: {
                            slidesPerView: 'auto',
                        },
                        1200: {
                            slidesPerView: 3,
                        },
                    },
                    navigation: SlidersController.controls(container).navigation,
                });
            });
            document.querySelectorAll('.promotions__slider').forEach((container) => {
                SlidersController.createSlider(container.querySelector('.swiper'), {
                    slidesPerView: 1,
                    rewind: true,
                    watchOverflow: true,
                    autoplay: {
                        delay: 5000,
                        disableOnInteraction: false,
                    },
                    ...SlidersController.controls(container),
                });
            });
            this.newsBreakpoints = {
                575.98: {
                    slidesPerView: 1.5,
                },
                767.98: {
                    slidesPerView: 2,
                },
                991.98: {
                    slidesPerView: 3,
                },
                1419.98: {
                    slidesPerView: 4,
                },
            };

            document
                .querySelectorAll('.news__slider:not([data-showcase-slider])')
                .forEach((container) => {
                    SlidersController.createSlider(container.querySelector('.swiper'), {
                        slidesPerView: 1,
                        spaceBetween: 20,
                        watchOverflow: true,
                        breakpoints: this.newsBreakpoints,
                        ...SlidersController.controls(container),
                    });
                });
            document.querySelectorAll('.product-details__gallery').forEach((gallery) => {
                const product = gallery.closest('.product-details');

                if (!product || gallery.querySelector('.swiper')?.swiper) {
                    return;
                }

                const thumbs = [...product.querySelectorAll('.product-details__thumb')];
                const thumbnailContainer = product.querySelector('.product-details__thumbs');
                const thumbnails = SlidersController.createSlider(
                    thumbnailContainer.querySelector('.swiper'),
                    {
                        slidesPerView: 3,
                        spaceBetween: 10,
                        watchOverflow: true,
                        breakpoints: {
                            768: {
                                direction: 'vertical',
                                slidesPerView: 5,
                            },
                        },
                        on: {
                            resize() {
                                const activeIndex =
                                    gallery.querySelector('.swiper')?.swiper?.activeIndex;

                                this.slideTo(activeIndex ?? 0, 0);
                            },
                        },
                    },
                );
                const main = SlidersController.createSlider(gallery.querySelector('.swiper'), {
                    slidesPerView: 1,
                    watchOverflow: true,
                    navigation: SlidersController.controls(thumbnailContainer).navigation,
                    on: {
                        slideChange() {
                            thumbs.forEach((thumb, index) => {
                                thumb.classList.toggle('active', index === this.activeIndex);
                                thumb.setAttribute(
                                    'aria-pressed',
                                    String(index === this.activeIndex),
                                );
                            });
                            thumbnails?.slideTo(this.activeIndex);
                            const zoom = gallery.querySelector('.product-details__zoom');

                            if (zoom) {
                                zoom.href = this.slides[this.activeIndex].href;
                            }
                        },
                    },
                });

                thumbs.forEach((thumb, index) => {
                    thumb.classList.toggle('active', index === 0);
                    thumb.setAttribute('aria-pressed', String(index === 0));
                });
                Dom.delegate(product, 'click', '.product-details__thumb', (event, thumb) =>
                    main?.slideTo(thumbs.indexOf(thumb)),
                );
            });
            ProductGallery.initAll();

            return this;
        }
    }

    class ProductGallery {
        static initAll() {
            document
                .querySelectorAll('[data-product-gallery]')
                .forEach((gallery) => new ProductGallery().init(gallery));
        }

        constructor() {
            this.resetSlide = this.resetSlide.bind(this);
        }

        init(gallery) {
            this.gallery = gallery;
            this.element = this.gallery.querySelector('.product-tile__slider');

            if (
                !this.element ||
                this.element.swiper ||
                typeof Swiper === 'undefined' ||
                this.element.querySelectorAll('.swiper-slide').length <= 1
            ) {
                return;
            }

            this.slider = SlidersController.createSlider(this.element, {
                slidesPerView: 1,
                nested: true,
                observer: true,
                observeParents: true,
                watchOverflow: true,
                touchEventsTarget: 'container',
                a11y: {
                    slideRole: 'group',
                },
                speed: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 200,
                pagination: {
                    el: this.gallery.querySelector('.swiper-pagination'),
                    clickable: true,
                    renderBullet: (index, className) =>
                        `<span class="${className}" aria-label="Фотография ${index + 1}"></span>`,
                },
            });
            this.gallery.querySelector('.swiper-pagination')?.addEventListener('click', (event) => {
                event.preventDefault();
            });
            this.areas = document.createElement('div');

            this.areas.className = 'product-tile__areas';
            this.areas.setAttribute('aria-hidden', 'true');
            [...this.slider.slides].forEach((slide, index) => {
                const area = document.createElement('span');

                area.className = 'product-tile__area';
                area.addEventListener('pointerenter', (event) => {
                    if (event.pointerType === 'mouse') {
                        this.slider.slideTo(index);
                    }
                });
                this.areas.append(area);
            });
            this.element.append(this.areas);
            this.gallery.addEventListener('pointerleave', this.resetSlide);

            return this;
        }

        resetSlide(event) {
            if (event.pointerType === 'mouse') {
                this.slider.slideTo(0);
            }
        }
    }

    // === tooltips ===

    class Tooltip {
        static tooltipPosition(anchor, size, viewport) {
            const gap = 12;
            const margin = 8;
            let side = 'right';
            let left = anchor.right + gap;
            let top = (anchor.top + anchor.bottom - size.height) / 2;

            if (left + size.width > viewport.width - margin) {
                side = 'left';
                left = anchor.left - gap - size.width;
                if (left < margin) {
                    side =
                        anchor.bottom + gap + size.height <= viewport.height - margin
                            ? 'bottom'
                            : 'top';
                    left = (anchor.left + anchor.right - size.width) / 2;
                    top = side === 'bottom' ? anchor.bottom + gap : anchor.top - gap - size.height;
                }
            }

            return {
                left: Math.max(margin, Math.min(left, viewport.width - size.width - margin)),
                top: Math.max(margin, Math.min(top, viewport.height - size.height - margin)),
                side,
            };
        }

        static initAll(scope = document) {
            scope.querySelectorAll('.tooltip').forEach((root) => new Tooltip().init(root));
        }

        constructor() {
            this.position = this.position.bind(this);
            this.show = this.show.bind(this);
            this.hide = this.hide.bind(this);
            this.handlePointerEnter = this.handlePointerEnter.bind(this);
            this.handlePointerLeave = this.handlePointerLeave.bind(this);
            this.handleFocusOut = this.handleFocusOut.bind(this);
            this.handleKeydown = this.handleKeydown.bind(this);
            this.handleDocumentKeydown = this.handleDocumentKeydown.bind(this);
            this.handleResize = this.handleResize.bind(this);
            this.handleScroll = this.handleScroll.bind(this);
        }

        init(root) {
            this.root = root;
            if (this.root.dataset.tooltipReady) {
                return;
            }

            this.trigger = this.root.querySelector('.tooltip__trigger');
            this.content = this.root.querySelector('.tooltip__content');

            if (!this.trigger || !this.content) {
                return;
            }

            this.root.dataset.tooltipReady = 'true';
            this.hovered = false;
            this.closeTimer = undefined;

            this.root.addEventListener('pointerenter', this.handlePointerEnter);
            this.root.addEventListener('pointerleave', this.handlePointerLeave);
            this.root.addEventListener('focusin', this.show);
            this.root.addEventListener('focusout', this.handleFocusOut);
            this.root.addEventListener('keydown', this.handleKeydown);
            document.addEventListener('keydown', this.handleDocumentKeydown);
            window.addEventListener('resize', this.handleResize);
            window.addEventListener('scroll', this.handleScroll, {
                capture: true,
                passive: true,
            });

            return this;
        }

        position() {
            const anchor = this.trigger.getBoundingClientRect();
            const size = this.content.getBoundingClientRect();
            const next = Tooltip.tooltipPosition(anchor, size, {
                width: window.innerWidth,
                height: window.innerHeight,
            });

            this.content.style.position = 'fixed';
            this.content.style.left = `${next.left}px`;
            this.content.style.top = `${next.top}px`;
            this.content.style.transform = 'none';
            this.content.dataset.side = next.side;
            this.content.style.setProperty(
                '--tooltip-arrow-y',
                `${Math.max(16, Math.min(size.height - 16, (anchor.top + anchor.bottom) / 2 - next.top))}px`,
            );
        }

        show() {
            clearTimeout(this.closeTimer);
            this.root.classList.remove('is-dismissed');
            this.position();
            this.root.classList.add('is-visible');
        }

        hide() {
            clearTimeout(this.closeTimer);
            this.root.classList.remove('is-visible');
            this.root.classList.add('is-dismissed');
        }

        handlePointerEnter() {
            this.hovered = true;
            this.show();
        }

        handlePointerLeave() {
            this.hovered = false;
            if (!this.root.contains(document.activeElement)) {
                this.closeTimer = setTimeout(this.hide, 180);
            }
        }

        handleFocusOut(event) {
            if (!this.root.contains(event.relatedTarget) && !this.hovered) {
                this.hide();
            }
        }

        handleKeydown(event) {
            if (event.key === 'Escape') {
                this.hide();
            }
        }

        handleDocumentKeydown(event) {
            if (event.key === 'Escape') {
                this.hide();
            }
        }

        handleResize() {
            if (this.root.classList.contains('is-visible')) {
                this.position();
            }
        }

        handleScroll(event) {
            if (!this.content.contains(event.target)) {
                this.hide();
            }
        }
    }

    // === Application initialization ===

    class Application {
        static appInitialized = false;

        static init() {
            if (Application.appInitialized) {
                return;
            }
            Application.appInitialized = true;

            CustomSelect.initAll();
            Tooltip.initAll();
            new AddressesController().init();
            new OrdersController().init();
            new OrderDetailsController().init();
            new AccountController().init();
            new ReviewsController().init();
            new NewsController().init();
            FaqController.initAll();
            const navigation = new HeaderController().init();

            new SearchFieldsController().init();
            new InteractionsController().init();
            window.SearchController = new SearchController(navigation);
            new SlidersController().init();
            window.FormController = new FormController();
            new AuthDialogs().init();
            new PartsOrderController().init();
            window.NotifyController = new NotifyController();
            new MapsController().init();
            ComparisonController.initAll();
            CartController.initAll();
            new ProductListingController().init();
            new ProductDetailsController().init();
            new CheckoutController().init();
            FavoritesController.initAll();
        }
    }

    // Start the application once the document is ready.
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', Application.init, {
            once: true,
        });
    } else {
        Application.init();
    }
})();
