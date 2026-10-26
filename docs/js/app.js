(function () {
    'use strict';

    // Content is authored in HTML. JavaScript only selects a state and fills runtime values.
    const uiContent = document.getElementById?.('ui-content')?.content;

    function uiText(key, values = {}) {
        const text = uiContent?.querySelector('[data-ui-copy="' + key + '"]')?.textContent || '';
        return formatText(text, values);
    }

    function formatText(text = '', values = {}) {
        return text.replace(/\{(\w+)\}/g, (match, name) =>
            Object.hasOwn(values, name) ? String(values[name]) : match,
        );
    }

    function uiFragment(key) {
        return uiContent.querySelector('[data-ui-fragment="' + key + '"]').content.cloneNode(true);
    }

    function showMessage(element, key, values = {}) {
        const template = uiContent?.querySelector('[data-ui-copy="' + key + '"]');
        if (!template) {
            return;
        }
        const message = template.cloneNode(true);
        message.textContent = uiText(key, values);
        element.replaceChildren(message);
    }

    // === delivery-map ===

    let mapsReady;

    function loadMaps() {
        if (!mapsReady) {
            mapsReady = new Promise((resolve, reject) => {
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
                const existing = document.querySelector('script[src="' + uiText('maps-api') + '"]');
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
                    { once: true },
                );
                script.addEventListener(
                    'error',
                    () => {
                        clearTimeout(timeout);
                        script.remove();
                        reject(new Error('Map loading failed'));
                    },
                    { once: true },
                );
                if (!existing) {
                    script.async = true;
                    script.src = uiText('maps-api');
                    document.head.append(script);
                }
            }).catch((error) => {
                mapsReady = null;
                throw error;
            });
        }

        return mapsReady;
    }

    function deliveryMap(form) {
        const container = form.querySelector('.address-picker__map');
        const toggle = form.querySelector('.address-picker__map-toggle');
        const status = form.querySelector('.address-picker__map-status');

        if (!container || !toggle || !status) {
            return;
        }

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
            if (container.hidden) {
                return;
            }

            status.hidden = false;
            if (map) {
                map.container.fitToViewport();
                showMessage(status, 'delivery-map-01');

                return;
            }
            if (loading) {
                return;
            }

            loading = true;
            showMessage(status, 'delivery-map-02');
            try {
                const api = await loadMaps();

                map = new api.Map(container, {
                    center: container.dataset.mapCenter.split(',').map(Number),
                    zoom: 11,
                    controls: ['zoomControl'],
                });
                if (!container.hidden) {
                    showMessage(status, 'delivery-map-01');
                }
                map.events.add('click', async (event) => {
                    const current = ++request;
                    const coords = event.get('coords');

                    showMessage(status, 'delivery-map-03');
                    try {
                        const result = await api.geocode(coords);

                        if (current !== request || container.hidden) {
                            return;
                        }

                        const place = result.geoObjects.get(0);

                        if (!place) {
                            throw new Error('Address not found');
                        }

                        form.elements.city.value =
                            place.getLocalities()[0] || place.getAdministrativeAreas()[0] || '';
                        form.elements.street.value = [
                            place.getThoroughfare(),
                            place.getPremiseNumber(),
                        ]
                            .filter(Boolean)
                            .join(', ');
                        map.geoObjects.removeAll();
                        map.geoObjects.add(new api.Placemark(coords));
                        showMessage(status, 'delivery-map-04');
                    } catch {
                        if (current === request) {
                            showMessage(status, 'delivery-map-05');
                        }
                    }
                });
            } catch {
                container.hidden = true;
                toggle.setAttribute('aria-expanded', 'false');
                showMessage(status, 'delivery-map-06');
            } finally {
                loading = false;
            }
        });

        return { reset };
    }

    // === pickup-state ===

    function savePickup(points, point, replacingId) {
        return [
            ...points
                .filter((item) => item.id !== replacingId && item.id !== point.id)
                .map((item) => ({ ...item, selected: false })),
            { ...point, selected: true },
        ];
    }

    function removePickup(points, id) {
        const result = points.filter((point) => point.id !== id).map((point) => ({ ...point }));

        if (result.length && !result.some((point) => point.selected)) {
            result[0].selected = true;
        }

        return result;
    }

    function filterPickups(points, query) {
        const normalized = query.trim().toLocaleLowerCase('ru');
        return points.filter((point) =>
            (point.title + ' ' + point.address).toLocaleLowerCase('ru').includes(normalized),
        );
    }

    // === account-pickups ===

    function accountPickups(root) {
        const dialog = document.querySelector('#account-pickup-dialog');
        const list = root.querySelector('#pickup-addresses');

        if (!dialog || !list || dialog.dataset.initialized) {
            return;
        }

        dialog.dataset.initialized = 'true';
        const catalog = [...dialog.querySelectorAll('[data-pickup-id]')].map((button) => ({
            id: button.dataset.pickupId,
            title: button.querySelector('.pickup-dialog__point-title').textContent.trim(),
            address: button.dataset.address,
            hours: button.dataset.hours,
            coords: button.dataset.coords.split(',').map(Number),
            detailTitle: button.querySelector('[data-pickup-detail-title]').textContent,
            detailHours: button.querySelector('[data-pickup-detail-hours]').textContent,
            summary: button.querySelector('[data-pickup-summary]').textContent,
        }));
        const template = list.querySelector('[data-pickup-card]').cloneNode(true);
        const search = dialog.querySelector('.pickup-dialog__input');
        const status = dialog.querySelector('.pickup-dialog__map-status');
        const maps = {};
        let points = [...list.querySelectorAll('[data-pickup-card]')].map((card) => {
            const input = card.querySelector('input');
            return {
                ...catalog.find((point) => point.id === input.value),
                selected: input.checked,
            };
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
                    card.querySelector('.addresses__details').textContent = point.summary;

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
            showMessage(status, 'delivery-map-02');
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
                            iconImageHref: dialog.dataset.mapMarker,
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
                    map.setBounds(map.geoObjects.getBounds(), {
                        checkZoomRange: true,
                        zoomMargin: 35,
                    });
                }
                status.hidden = true;
            } catch {
                if (ticket !== version) {
                    return;
                }

                showMessage(status, 'account-pickups-01');
            }
        };
        const detail = (id) => {
            active = catalog.find((point) => point.id === id);
            if (!active) {
                return;
            }

            showView('detail');
            dialog.querySelector('.pickup-dialog__detail-title').textContent = active.detailTitle;
            dialog.querySelector('.pickup-dialog__address').textContent = active.address;
            dialog.querySelector('.pickup-dialog__hours').textContent = active.detailHours;
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

            points = points.map((point) => ({
                ...point,
                selected: point.id === event.target.value,
            }));
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

    // === account ===

    function account() {
        const root = document.querySelector('[data-account]');

        if (!root || root.dataset.initialized) {
            return;
        }

        root.dataset.initialized = 'true';
        const profile = root.querySelector('[data-account-profile]');
        const legal = profile.elements.legal;
        const company = root.querySelector('#company-fields');
        const syncLegal = () => {
            company.hidden = !legal.checked;
            company.disabled = !legal.checked;
        };

        legal.addEventListener('change', syncLegal);
        syncLegal();
        const setMenu = (menu) => {
            root.classList.toggle('account--menu', menu);
            root.querySelector('.page-heading__title').textContent = menu
                ? uiText('account-01')
                : uiText('account-02');
        };

        root.querySelector('.page-heading__back').addEventListener('click', () => {
            history.replaceState(null, '', '#menu');
            setMenu(true);
            window.scrollTo(0, 0);
        });
        root.querySelector('[data-account-personal]').addEventListener('click', () => {
            setMenu(false);
            window.scrollTo(0, 0);
        });
        window.addEventListener('hashchange', () => setMenu(location.hash === '#menu'));
        setMenu(location.hash === '#menu');
        root.querySelector('[data-account-logout]').addEventListener('click', (event) => {
            event.preventDefault();
            root.dispatchEvent(new CustomEvent('account:logout', { bubbles: true }));
        });
        root.querySelectorAll('.account__reveal').forEach((button) => {
            button.addEventListener('click', () => {
                const input = button.previousElementSibling;
                const visible = input.type === 'password';

                input.type = visible ? 'text' : 'password';
                button.setAttribute('aria-pressed', String(visible));
                button.setAttribute(
                    'aria-label',
                    visible ? button.dataset.passwordHideLabel : button.dataset.passwordShowLabel,
                );
            });
        });
        root.querySelectorAll('form').forEach((form) => {
            const status = form.querySelector('.account__status');
            const passwordForm = form.hasAttribute('data-account-password');

            form.addEventListener('reset', () => {
                status.hidden = true;
                form.querySelectorAll('.account__password .account__input').forEach((input) => {
                    input.type = 'password';
                });
                form.querySelectorAll('.account__reveal').forEach((button) => {
                    button.setAttribute('aria-pressed', 'false');
                    button.setAttribute('aria-label', button.dataset.passwordShowLabel);
                });
                setTimeout(syncLegal, 0);
            });
            form.addEventListener('submit', (event) => {
                event.preventDefault();
                if (!window.FormController.validateForm(form)) {
                    return;
                }

                form.dispatchEvent(
                    new CustomEvent(passwordForm ? 'account:password' : 'account:save', {
                        bubbles: true,
                        detail: Object.fromEntries(new FormData(form)),
                    }),
                );
                showMessage(status, 'account-06');
                status.hidden = false;
            });
        });
    }

    // === address-picker ===

    function describeAddress(address) {
        return {
            title: [address.city, address.street].filter(Boolean).join(', '),
            details: [
                address.apartment && uiText('address-picker-01', { value0: address.apartment }),
                address.entrance && uiText('address-picker-02', { value0: address.entrance }),
                address.floor && uiText('address-picker-03', { value0: address.floor }),
            ]
                .filter(Boolean)
                .join(' · '),
        };
    }

    function addressPicker(form) {
        const picker = document.querySelector('#address-picker');

        if (!picker || picker.dataset.initialized) {
            return;
        }

        picker.dataset.initialized = 'true';
        const list = picker.querySelector('.address-picker__list');
        const addForm = picker.querySelector('.address-picker__form');
        const addressFields = ['city', 'street', 'entrance', 'floor', 'apartment'];
        let selectedId = null;
        let modal;
        const map = deliveryMap(addForm);
        const setView = (name) => {
            picker.querySelectorAll('[data-address-view]').forEach((view) => {
                view.hidden = view.dataset.addressView !== name;
            });
            picker.setAttribute(
                'aria-labelledby',
                name === 'add' ? 'address-add-title' : 'address-picker-title',
            );
        };
        const applyAddress = (input) => {
            const address = input.dataset;
            const description = describeAddress(address);

            selectedId = input.value;
            addressFields.forEach((name) => {
                form.elements[name].value = address[name] || '';
                form.elements[name].required = false;
            });
            form.querySelector('.checkout__selected-title').textContent = description.title;
            form.querySelector('.checkout__selected-details').textContent = description.details;
            form.querySelector('.checkout__selected-details').hidden = !description.details;
            form.querySelector('.checkout__selected-address').hidden = false;
            form.querySelector('.checkout__address-fields').hidden = true;
            form.querySelector('.checkout__address > .checkout__change').hidden = true;
            form.querySelector('.checkout__save').hidden = true;
            modal?.close();
        };

        form.querySelectorAll('.checkout__change').forEach((button) =>
            button.addEventListener('click', () => {
                if (typeof Fancybox === 'undefined') {
                    return;
                }

                setView('list');
                if (selectedId) {
                    list.querySelectorAll('.address-picker__radio').forEach((input) => {
                        input.checked = input.value === selectedId;
                    });
                }
                Fancybox.show([{ src: '#address-picker', type: 'inline' }], {
                    closeButton: false,
                    dragToClose: false,
                    autoFocus: false,
                    on: {
                        done: () => picker.querySelector('.address-picker__radio:checked')?.focus(),
                        destroy: () =>
                            (button.hidden
                                ? form.querySelector(
                                      '.checkout__selected-address .checkout__change',
                                  )
                                : button
                            ).focus(),
                    },
                });
                modal = Fancybox.getInstance();
            }),
        );
        picker.querySelector('.address-picker__add').addEventListener('click', () => {
            addForm.reset();
            map?.reset();
            setView('add');
            addForm.elements.city.focus();
        });
        picker.querySelector('.address-picker__back').addEventListener('click', () => {
            setView('list');
            picker.querySelector('.address-picker__add').focus();
        });
        picker.querySelector('.address-picker__selection').addEventListener('submit', (event) => {
            event.preventDefault();
            const input = list.querySelector('.address-picker__radio:checked');

            if (input) {
                applyAddress(input);
            }
        });
        addForm.addEventListener('submit', (event) => {
            event.preventDefault();
            if (!window.FormController.validateForm(addForm)) {
                return;
            }

            const address = Object.fromEntries(
                addressFields.map((name) => [name, addForm.elements[name].value.trim()]),
            );

            if (!address.city || !address.street) {
                const field = addForm.elements[address.city ? 'street' : 'city'];

                field.value = '';
                window.FormController.validateField(field);

                return;
            }
            const card = list.querySelector('.address-picker__card').cloneNode(true);
            const input = card.querySelector('.address-picker__radio');

            input.value = `address-${list.children.length + 1}`;
            Object.assign(input.dataset, address);
            const description = describeAddress(address);

            card.querySelector('.address-picker__card-title').textContent = description.title;
            card.querySelector('.address-picker__card-details').textContent = description.details;
            list.append(card);
            input.checked = true;
            applyAddress(input);
        });
    }

    // === addresses ===

    function addresses() {
        const root = document.querySelector('[data-addresses]');

        if (!root || root.dataset.initialized) {
            return;
        }

        root.dataset.initialized = 'true';
        const list = root.querySelector('#delivery-addresses');
        const template = list?.querySelector('[data-address-card]')?.cloneNode(true);
        const dialog = document.querySelector('#address-dialog');

        if (!template || !dialog) {
            return;
        }

        const pickups = accountPickups(root);
        const form = dialog.querySelector('form');
        const title = dialog.querySelector('#address-dialog-title');
        const submit = dialog.querySelector('.address-dialog__submit');
        const status = root.querySelector('.addresses__status');
        const fields = ['city', 'street', 'entrance', 'floor', 'apartment', 'comment'];
        let editing = null;
        let trigger;
        let modal;
        let map;
        let mapAddress;
        let request = 0;
        const report = (message) => {
            status.textContent = message;
            status.hidden = false;
        };
        const empty = () => {
            root.querySelector('[data-address-empty]').hidden =
                !!list.children.length || root.querySelector('#delivery-addresses').hidden;
        };
        const fillCard = (card, address) => {
            const input = card.querySelector('input');

            fields.forEach((name) => {
                input.dataset[name] = address[name] || '';
            });
            input.value = address.id;
            input.checked = !!address.selected;
            card.querySelector('.addresses__name').textContent = [address.city, address.street]
                .filter(Boolean)
                .join(', ');
            card.querySelector('.addresses__details').textContent = [
                address.entrance && uiText('addresses-01') + address.entrance,
                address.floor && uiText('addresses-02') + address.floor,
                address.apartment && uiText('addresses-03') + address.apartment,
                address.postcode && uiText('addresses-04') + address.postcode,
                address.comment,
            ]
                .filter(Boolean)
                .join(', ');
            input.dataset.postcode = address.postcode || '';

            return card;
        };

        empty();
        const view = (name) => {
            request++;
            dialog.classList.toggle('address-dialog--map', name === 'map');
            dialog.querySelectorAll('[data-dialog-view]').forEach((part) => {
                part.hidden = part.dataset.dialogView !== name;
            });
            dialog.setAttribute(
                'aria-labelledby',
                name === 'form' ? 'address-dialog-title' : 'address-map-title',
            );
        };

        dialog.querySelector('[data-dialog-view="map"] .address-dialog__title').id =
            'address-map-title';
        const open = (button, card = null) => {
            if (typeof Fancybox === 'undefined') {
                return;
            }

            trigger = button;
            editing = card;
            form.reset();
            fields.forEach((name) => {
                form.elements[name].value = card?.querySelector('input').dataset[name] || '';
            });
            title.textContent = card ? uiText('addresses-05') : uiText('addresses-06');
            submit.textContent = card ? uiText('addresses-07') : uiText('addresses-08');
            view('form');
            Fancybox.show([{ src: '#address-dialog', type: 'inline' }], {
                closeButton: false,
                dragToClose: false,
                autoFocus: false,
                on: {
                    ready: () => form.elements.city.focus(),
                    destroy: () => {
                        request++;
                        trigger?.focus();
                    },
                },
            });
            modal = Fancybox.getInstance();
        };

        root.querySelector('.addresses__add').addEventListener('click', (event) => {
            if (
                root.querySelector('[data-address-tab="pickup"]').getAttribute('aria-selected') ===
                'true'
            ) {
                pickups?.open(event.currentTarget);
            } else {
                open(event.currentTarget);
            }
        });
        list.addEventListener('change', empty);
        list.addEventListener('click', (event) => {
            const card = event.target.closest('[data-address-card]');

            if (!card) {
                return;
            }

            if (event.target.closest('.addresses__edit')) {
                open(event.target.closest('button'), card);
            }
            if (event.target.closest('.addresses__delete')) {
                const checked = card.querySelector('input').checked;

                card.remove();
                if (checked && list.querySelector('input')) {
                    list.querySelector('input').checked = true;
                }
                empty();
                report(uiText('addresses-09'));
                (
                    list.querySelector('.addresses__edit') || root.querySelector('.addresses__add')
                ).focus();
            }
        });
        form.addEventListener('submit', (event) => {
            event.preventDefault();
            fields.forEach((name) => {
                form.elements[name].value = form.elements[name].value.trim();
            });
            if (!window.FormController.validateForm(form)) {
                return;
            }

            const address = Object.fromEntries(new FormData(form));

            address.id = editing?.querySelector('input').value || String(Date.now());
            address.postcode = editing?.querySelector('input').dataset.postcode || '';
            address.selected = editing ? editing.querySelector('input').checked : true;
            if (address.selected) {
                list.querySelectorAll('input').forEach((input) => {
                    input.checked = false;
                });
            }
            if (editing) {
                fillCard(editing, address);
            } else {
                list.append(fillCard(template.cloneNode(true), address));
            }
            empty();
            modal?.close();
        });
        const tabs = [...root.querySelectorAll('[data-address-tab]')];
        const activate = (tab) => {
            tabs.forEach((button) => {
                const selected = button === tab;

                button.setAttribute('aria-selected', String(selected));
                button.tabIndex = selected ? 0 : -1;
                root.querySelector('#' + button.getAttribute('aria-controls')).hidden = !selected;
            });
            const pickup = tab.dataset.addressTab === 'pickup';

            root.classList.toggle('addresses--pickup', pickup);
            root.querySelector('.addresses__add').textContent = pickup
                ? uiText('addresses-10')
                : uiText('addresses-08');
            root.querySelector('.addresses__title').textContent = pickup
                ? uiText('addresses-11')
                : uiText('addresses-12');
            status.hidden = true;
            pickups?.refresh();
            empty();
        };

        tabs.forEach((tab, index) => {
            tab.addEventListener('click', () => activate(tab));
            tab.addEventListener('keydown', (event) => {
                if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
                    return;
                }

                event.preventDefault();
                const next =
                    tabs[
                        event.key === 'Home'
                            ? 0
                            : event.key === 'End'
                              ? tabs.length - 1
                              : (index + 1) % tabs.length
                    ];

                activate(next);
                next.focus();
            });
        });
        if (location.hash === '#pickup') {
            activate(tabs.find((tab) => tab.dataset.addressTab === 'pickup'));
        }
        dialog.querySelector('.address-dialog__back').addEventListener('click', () => {
            view('form');
            form.elements.city.focus();
        });
        dialog.querySelector('.address-dialog__choose').addEventListener('click', () => {
            if (!mapAddress) {
                return;
            }

            form.elements.city.value = mapAddress.city;
            form.elements.street.value = mapAddress.street;
            view('form');
            form.elements.street.focus();
        });
        dialog.querySelector('.address-dialog__map-toggle').addEventListener('click', async () => {
            view('map');
            mapAddress = null;
            const choose = dialog.querySelector('.address-dialog__choose');
            const message = dialog.querySelector('.address-dialog__status');

            choose.disabled = true;
            showMessage(dialog.querySelector('.address-dialog__selected'), 'addresses-13');
            showMessage(message, 'delivery-map-02');
            const current = request;
            try {
                const api = await loadMaps();

                if (current !== request) {
                    return;
                }

                if (!map) {
                    map = new api.Map(dialog.querySelector('.address-dialog__map'), {
                        center: dialog
                            .querySelector('.address-dialog__map')
                            .dataset.mapCenter.split(',')
                            .map(Number),
                        zoom: 13,
                        controls: ['zoomControl'],
                    });
                    map.events.add('click', async (event) => {
                        const pending = ++request;

                        choose.disabled = true;
                        const coords = event.get('coords');

                        showMessage(message, 'delivery-map-03');
                        try {
                            const result = await api.geocode(coords);

                            if (pending !== request) {
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

                            mapAddress = { city, street };
                            map.geoObjects.removeAll();
                            map.geoObjects.add(
                                new api.Placemark(coords, {}, { preset: 'islands#orangeDotIcon' }),
                            );
                            dialog.querySelector('.address-dialog__selected').textContent =
                                city + ', ' + street;
                            message.textContent = '';
                            choose.disabled = false;
                        } catch {
                            if (pending === request) {
                                showMessage(message, 'addresses-14');
                            }
                        }
                    });
                }
                map.container.fitToViewport();
                showMessage(message, 'delivery-map-01');
            } catch {
                if (current === request) {
                    showMessage(message, 'addresses-15');
                }
            }
        });
    }

    // === auth-dialogs ===

    const digits = (value) => String(value).replace(/\D/g, '');

    class CodeRequest {
        constructor() {
            this.reset();
        }
        start(phone, now = Date.now()) {
            this.phone = digits(phone);
            this.deadline = now + 60000;
        }
        remaining(now = Date.now()) {
            return Math.max(0, Math.ceil((this.deadline - now) / 1000));
        }
        matches(phone) {
            return Boolean(this.phone && this.phone === digits(phone));
        }
        reset() {
            this.phone = '';
            this.deadline = 0;
        }
    }

    function validateFieldValue(name, value) {
        if (name === 'agreement') {
            return value ? '' : 'agreement';
        }

        if (!String(value).trim()) {
            return 'required';
        }

        if (name === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim())) {
            return 'email';
        }

        if (name === 'phone' && !/^7\d{10}$/.test(digits(value))) {
            return 'tel';
        }

        if (name === 'code' && !/^\d{4}$/.test(value)) {
            return 'code';
        }

        return '';
    }

    function authDialogs() {
        const root = document.querySelector('#sign-in.auth-dialog');

        if (!root || root.dataset.initialized) {
            return;
        }

        root.dataset.initialized = 'true';
        const forms = Object.fromEntries(
            [...root.querySelectorAll('[data-auth-form]')].map((form) => [
                form.dataset.authForm,
                form,
            ]),
        );
        const requests = { phone: new CodeRequest(), register: new CodeRequest() };
        const status = root.querySelector('.auth-dialog__status');
        let interval;
        let view = 'login';
        let method = 'email';
        let opener;

        const announce = (text) => {
            status.textContent = text;
            status.hidden = !text;
        };
        const validate = (input) => window.FormController.validateField(input);
        const focusView = () =>
            forms[view === 'login' ? method : view]
                .querySelector('input:not(:disabled)')
                ?.focus({ preventScroll: true });
        const switchView = (name) => {
            if (!['login', 'register', 'recovery'].includes(name)) {
                return;
            }

            view = name;
            root.querySelectorAll('[data-auth-view]').forEach((panel) => {
                panel.hidden = panel.dataset.authView !== name;
            });
            root.classList.toggle('auth-dialog--recovery', name === 'recovery');
            root.setAttribute(
                'aria-labelledby',
                name === 'login' ? 'auth-title' : `auth-${name}-title`,
            );
            if (name === 'recovery') {
                forms.recovery.elements.email.value = forms.email.elements.email.value;
                root.querySelector('.auth-dialog__email').textContent =
                    forms.recovery.elements.email.value.trim();
            }
            announce('');
            focusView();
        };
        const switchMethod = (name) => {
            method = name;
            root.querySelectorAll('[data-auth-tab]').forEach((tab) => {
                const active = tab.dataset.authTab === name;

                tab.setAttribute('aria-selected', String(active));
                tab.tabIndex = active ? 0 : -1;
            });
            forms.email.hidden = name !== 'email';
            forms.phone.hidden = name !== 'phone';
            announce('');
            forms[name].querySelector('input').focus();
        };
        const updateTimers = () => {
            for (const name of ['phone', 'register']) {
                const seconds = requests[name].remaining();

                forms[name].querySelectorAll('[data-auth-send]').forEach((button) => {
                    button.disabled = seconds > 0;
                    if (name === 'phone') {
                        button.textContent = seconds
                            ? formatText(button.dataset.codeCountdownLabel, { seconds })
                            : requests[name].phone
                              ? button.dataset.codeResendLabel
                              : button.dataset.codeRequestLabel;
                    } else if (button.classList.contains('auth-dialog__resend')) {
                        button.textContent = seconds
                            ? formatText(button.dataset.codeCountdownLabel, {
                                  minutes: String(Math.floor(seconds / 60)).padStart(2, '0'),
                                  seconds: String(seconds % 60).padStart(2, '0'),
                              })
                            : button.dataset.codeResendLabel;
                    }
                });
            }
        };
        const resetRequest = (name) => {
            requests[name].reset();
            const form = forms[name];

            form.elements.code.value = '';
            window.FormController.toggleErrorState(form.elements.code, false);
            if (name === 'register') {
                form.querySelector('.auth-dialog__get-code').hidden = false;
                form.querySelector('.auth-dialog__field--code').hidden = true;
                form.querySelector('.auth-dialog__code-note').hidden = true;
                form.elements.code.disabled = true;
            }
            updateTimers();
        };
        const sendCode = (name) => {
            const form = forms[name];

            if (requests[name].remaining() || !validate(form.elements.phone)) {
                if (!requests[name].remaining()) {
                    form.elements.phone.focus();
                }

                return;
            }
            requests[name].start(form.elements.phone.value);
            form.elements.code.value = '';
            if (name === 'register') {
                form.querySelector('.auth-dialog__get-code').hidden = true;
                form.querySelector('.auth-dialog__field--code').hidden = false;
                form.querySelector('.auth-dialog__code-note').hidden = false;
                form.elements.code.disabled = false;
            }
            updateTimers();
            form.elements.code.focus();
            announce(status.dataset.codeSentMessage);
        };

        document.addEventListener('click', (event) => {
            const trigger = event.target.closest('[data-auth-open]');

            if (!trigger) {
                return;
            }

            event.preventDefault();
            if (typeof Fancybox === 'undefined') {
                return;
            }

            opener = trigger;
            window.SearchController?.closeSearch();
            switchView('login');
            switchMethod('email');
            clearInterval(interval);
            updateTimers();
            interval = setInterval(updateTimers, 1000);
            Fancybox.show([{ src: '#sign-in', type: 'inline' }], {
                closeButton: false,
                dragToClose: false,
                autoFocus: true,
                triggerEl: trigger,
                on: {
                    done: focusView,
                    destroy: () => {
                        clearInterval(interval);
                        root.querySelectorAll('[data-auth-password]').forEach((button) => {
                            button.closest('.auth-dialog__password').querySelector('input').type =
                                'password';
                            button.setAttribute('aria-pressed', 'false');
                            button.setAttribute('aria-label', button.dataset.passwordShowLabel);
                        });
                        opener?.focus({ preventScroll: true });
                    },
                },
            });
        });
        root.addEventListener('click', (event) => {
            const go = event.target.closest('[data-auth-go]');

            if (go) {
                switchView(go.dataset.authGo);
            }
            const tab = event.target.closest('[data-auth-tab]');

            if (tab) {
                switchMethod(tab.dataset.authTab);
            }
            const send = event.target.closest('[data-auth-send]');

            if (send) {
                sendCode(send.dataset.authSend);
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
        });
        root.addEventListener('keydown', (event) => {
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
                      : method === 'email'
                        ? 'phone'
                        : 'email';

            switchMethod(name);
            root.querySelector(`[data-auth-tab="${name}"]`).focus();
        });
        root.addEventListener('input', (event) => {
            const input = event.target;

            if (!input.matches('input')) {
                return;
            }

            const name = input.form.dataset.authForm;

            if (input.name === 'code') {
                input.value = digits(input.value).slice(0, 4);
            }
            if (
                input.name === 'phone' &&
                requests[name]?.phone &&
                !requests[name].matches(input.value)
            ) {
                resetRequest(name);
                announce(status.dataset.phoneChangedMessage);
            } else {
                announce('');
            }
            if (input.getAttribute('aria-invalid') === 'true') {
                validate(input);
            }
            if (name === 'recovery') {
                root.querySelector('.auth-dialog__email').textContent = input.value.trim();
            }
        });
        root.addEventListener('change', (event) => {
            if (event.target.type === 'checkbox') {
                validate(event.target);
            }
        });
        root.addEventListener('submit', (event) => {
            event.preventDefault();
            event.stopPropagation();
            const form = event.target;
            const name = form.dataset.authForm;

            announce('');
            let firstInvalid;

            form.querySelectorAll('input[required]:not(:disabled)').forEach((input) => {
                if (!validate(input)) {
                    firstInvalid ||= input;
                }
            });
            if (firstInvalid) {
                firstInvalid.focus();

                return;
            }
            if (requests[name] && !requests[name].matches(form.elements.phone.value)) {
                if (name === 'register') {
                    sendCode(name);
                } else {
                    announce(status.dataset.codeRequiredMessage);
                    form.querySelector('[data-auth-send]').focus();
                }

                return;
            }
            announce(
                name === 'recovery'
                    ? status.dataset.recoveryMessage
                    : name === 'register'
                      ? status.dataset.registrationMessage
                      : status.dataset.loginMessage,
            );
        });
    }

    // === cart ===

    function calculateCart(items) {
        return items.reduce(
            (result, item) => ({
                total: result.total + item.price * item.quantity,
                discount: result.discount + Math.max(0, item.oldPrice - item.price) * item.quantity,
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

    const money = (value) =>
        new Intl.NumberFormat('ru-RU').format(value) + uiText('currency-suffix');
    const productWord = (count) =>
        count % 10 === 1 && count % 100 !== 11
            ? uiText('cart-01')
            : count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 12 || count % 100 > 14)
              ? uiText('cart-02')
              : uiText('cart-03');

    function cart() {
        document.querySelectorAll('.cart').forEach((element) => {
            if (element.dataset.cartReady) {
                return;
            }

            element.dataset.cartReady = 'true';
            const rows = () => [...element.querySelectorAll('[data-cart-item]')];
            const message = element.querySelector('.cart__message');
            const announce = (text) => {
                if (!message) {
                    return;
                }

                message.hidden = false;
                message.textContent = text;
            };
            const readItem = (row, quantity = 1) => ({
                price: Number(row.dataset.price),
                oldPrice: Number(row.dataset.oldPrice),
                weight: Number(row.dataset.weight),
                quantity,
            });
            function selectAccessory(accessory, selected) {
                const button = accessory.querySelector('.cart-accessory__add');

                accessory.dataset.selected = String(selected);
                button.setAttribute('aria-pressed', String(selected));
                button.setAttribute(
                    'aria-label',
                    (selected ? uiText('cart-04') : uiText('cart-05')) +
                        accessory.querySelector('.cart-accessory__name').textContent,
                );
                const icon = button.querySelector('.cart-accessory__icon');

                icon.classList.toggle('icon-cart', !selected);
                icon.textContent = selected ? uiText('cart-selected') : '';
            }
            function update() {
                if (!element.querySelector('[data-cart-total]')) {
                    return;
                }

                const items = [];

                rows().forEach((row) => {
                    const input = row.querySelector('.quantity-block__input');
                    const quantity = Math.min(9999, Math.max(1, parseInt(input.value, 10) || 1));

                    input.value = quantity;
                    items.push(readItem(row, quantity));
                    row.querySelector('.cart-item__current').textContent = money(
                        Number(row.dataset.price) * quantity,
                    );
                    row.querySelectorAll('.cart-accessory[data-selected="true"]').forEach(
                        (accessory) => items.push(readItem(accessory)),
                    );
                });
                const totals = calculateCart(items);

                element.querySelector('[data-cart-total]').textContent = money(totals.total);
                element.querySelector('[data-cart-subtotal]').textContent = money(
                    totals.total + totals.discount,
                );
                element.querySelector('[data-cart-discount]').textContent =
                    '−' + money(totals.discount);
                element.querySelector('[data-cart-count]').textContent =
                    totals.quantity + ' ' + productWord(totals.quantity);
                document
                    .querySelectorAll('.main-actions__item.icon-cart .main-actions__quanitity')
                    .forEach((badge) => {
                        badge.textContent = totals.quantity;
                        badge.hidden = totals.quantity === 0;
                    });
                element.querySelector('[data-cart-weight]').textContent =
                    totals.weight.toLocaleString('ru-RU', { maximumFractionDigits: 2 }) +
                    uiText('cart-06');
                element.querySelector('.cart__empty').hidden = rows().length > 0;
                const checkout = element.querySelector('.cart__total-order');

                if (checkout) {
                    const empty = rows().length === 0;

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
            function initSlider(details) {
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
                        prevSlideMessage: uiText('cart-07'),
                        nextSlideMessage: uiText('cart-08'),
                    },
                    breakpoints: { 576: { slidesPerView: 2 } },
                    navigation: {
                        prevEl: slider.querySelector('.swiper-button-prev'),
                        nextEl: slider.querySelector('.swiper-button-next'),
                    },
                });
            }
            element.querySelectorAll('.cart__recommendations').forEach((details) => {
                if (details.open) {
                    const accessory = details.querySelector('.cart-accessory');

                    if (accessory) {
                        selectAccessory(accessory, true);
                    }
                }
                details.addEventListener('toggle', () => initSlider(details));
                initSlider(details);
            });
            element.addEventListener('click', (event) => {
                const remove = event.target.closest('.cart-item__remove');

                if (remove) {
                    const row = remove.closest('[data-cart-item]');

                    row.querySelectorAll('.swiper').forEach((slider) => slider.swiper?.destroy());
                    row.remove();
                    update();

                    return;
                }
                const add = event.target.closest('.cart-accessory__add');

                if (add) {
                    const accessory = add.closest('.cart-accessory');
                    const selected = accessory.dataset.selected !== 'true';

                    selectAccessory(accessory, selected);
                    update();
                    if (selected) {
                        window.NotifyController?.show(
                            accessory.querySelector('.cart-accessory__name').textContent.trim(),
                            1,
                            'cart',
                        );
                    }
                }
                if (event.target.closest('.quantity-block__up, .quantity-block__down')) {
                    update();
                }
            });
            element.addEventListener('input', (event) => {
                if (event.target.matches('.quantity-block__input')) {
                    update();
                }
            });
            element.querySelector('.cart__share')?.addEventListener('click', async () => {
                try {
                    await navigator.clipboard.writeText(window.location.href);
                    announce(uiText('cart-09'));
                } catch {
                    announce(uiText('cart-10') + window.location.href);
                }
            });
            element.querySelector('.cart__promo')?.addEventListener('submit', (event) => {
                event.preventDefault();
                const input = element.querySelector('.cart__promo-input');

                announce(input.value.trim() ? uiText('cart-11') : uiText('cart-12'));
                if (!input.value.trim()) {
                    input.focus();
                }
            });

            element.querySelectorAll('.cart__total-order').forEach((button) =>
                button.addEventListener('click', (event) => {
                    if (button.getAttribute('aria-disabled') === 'true') {
                        event.preventDefault();
                    }
                }),
            );
            if (element.querySelector('[data-cart-total]')) {
                update();
            }
        });
    }

    // === pickup-picker ===

    function pickupPicker(form) {
        const picker = document.querySelector('#pickup-picker');

        if (!picker || picker.dataset.initialized) {
            return null;
        }

        picker.dataset.initialized = 'true';
        const block = form.querySelector('.checkout__pickup');
        const address = form.querySelector('.checkout__address');
        const trigger = block.querySelector('.checkout__pickup-button');
        const error = block.querySelector('.checkout__pickup-error');
        const list = picker.querySelector('.address-picker__list');
        const addForm = picker.querySelector('.address-picker__point-form');
        const inputs = () => [...list.querySelectorAll('.address-picker__radio')];
        const defaultId = inputs().find((input) => input.checked)?.value;
        const map = deliveryMap(addForm);
        let selectedId = '';
        let nextId = 0;
        let modal;
        const setView = (name) => {
            picker.querySelectorAll('[data-pickup-view]').forEach((view) => {
                view.hidden = view.dataset.pickupView !== name;
            });
            picker.classList.toggle('address-picker--adding', name === 'add');
            picker.setAttribute(
                'aria-labelledby',
                name === 'add' ? 'pickup-add-title' : 'pickup-picker-title',
            );
        };
        const updateDelivery = () => {
            const pickup = form.elements.delivery.value === 'ozon';

            address.hidden = pickup;
            block.hidden = !pickup;
            address.querySelectorAll('input').forEach((input) => {
                input.disabled = pickup;
            });
            block.querySelectorAll('input').forEach((input) => {
                input.disabled = !pickup;
            });
            error.hidden = true;
        };
        const applyPoint = (input) => {
            selectedId = input.value;
            form.elements.pickup_point.value = selectedId;
            form.elements.pickup_point_address.value = input.dataset.address;
            block.classList.add('checkout__pickup--selected');
            showMessage(block.querySelector('.checkout__pickup-title'), 'pickup-picker-01');
            block.querySelector('.checkout__pickup-description').hidden = true;
            block.querySelector('.checkout__pickup-selected').hidden = false;
            block.querySelector('.checkout__pickup-selected-title').textContent =
                input.dataset.address;
            block.querySelector('.checkout__pickup-hours').textContent =
                input.dataset.hours || uiText('pickup-picker-02');
            showMessage(trigger.querySelector('.checkout__pickup-button-text'), 'pickup-picker-03');
            error.hidden = true;
            modal?.close();
        };

        form.querySelectorAll('[name="delivery"]').forEach((input) =>
            input.addEventListener('change', updateDelivery),
        );
        updateDelivery();
        trigger.addEventListener('click', () => {
            if (typeof Fancybox === 'undefined') {
                return;
            }

            inputs().forEach((input) => {
                input.checked = input.value === (selectedId || defaultId);
            });
            setView('list');
            Fancybox.show([{ src: '#pickup-picker', type: 'inline' }], {
                closeButton: false,
                dragToClose: false,
                autoFocus: false,
                on: {
                    ready: () => picker.querySelector('.address-picker__radio:checked')?.focus(),
                    destroy: () => {
                        map?.reset();
                        trigger.focus();
                    },
                },
            });
            modal = Fancybox.getInstance();
        });
        picker.querySelector('.address-picker__add').addEventListener('click', () => {
            addForm.reset();
            map?.reset();
            setView('add');
            addForm.elements.city.focus();
        });
        picker.querySelector('.address-picker__back').addEventListener('click', () => {
            map?.reset();
            setView('list');
            picker.querySelector('.address-picker__add').focus();
        });
        picker.querySelector('.address-picker__pickup-form').addEventListener('submit', (event) => {
            event.preventDefault();
            const input = inputs().find((input) => input.checked);

            if (input) {
                applyPoint(input);
            }
        });
        addForm.addEventListener('submit', (event) => {
            event.preventDefault();
            for (const name of ['city', 'street']) {
                addForm.elements[name].value = addForm.elements[name].value.trim();
            }
            if (!window.FormController.validateForm(addForm)) {
                return;
            }

            const title = `${addForm.elements.city.value}, ${addForm.elements.street.value}`;
            const key = (value) => value.toLocaleLowerCase('ru').replace(/\s+/g, ' ').trim();
            let input = inputs().find((item) => key(item.dataset.address) === key(title));

            if (!input) {
                const card = list.querySelector('.address-picker__card').cloneNode(true);

                input = card.querySelector('.address-picker__radio');
                input.value = `ozon-custom-${++nextId}`;
                input.dataset.address = title;
                input.dataset.hours = uiText('pickup-picker-02');
                card.querySelector('.address-picker__card-title').textContent = title;
                list.append(card);
            }
            input.checked = true;
            applyPoint(input);
        });

        return {
            validate() {
                const valid = form.elements.delivery.value !== 'ozon' || Boolean(selectedId);

                error.hidden = valid;
                if (!valid) {
                    trigger.focus();
                }

                return valid;
            },
        };
    }

    // === checkout ===

    function checkout() {
        const form = document.querySelector('#checkout-form');

        if (!form || form.dataset.initialized) {
            return;
        }

        form.dataset.initialized = 'true';
        const status = form.querySelector('.checkout__status');
        const announce = (message) => {
            status.hidden = false;
            status.textContent = message;
        };

        addressPicker(form);
        const pickup = pickupPicker(form);

        form.querySelector('.checkout__promo-button').addEventListener('click', () => {
            const promo = form.elements.promo;

            announce(promo.value.trim() ? uiText('checkout-01') : uiText('cart-12'));
            if (!promo.value.trim()) {
                promo.focus();
            }
        });
        form.addEventListener('submit', (event) => {
            event.preventDefault();
            if (pickup && !pickup.validate()) {
                return;
            }

            if (!window.FormController.validateForm(form)) {
                return;
            }

            form.dispatchEvent(
                new CustomEvent('checkout:submit', {
                    bubbles: true,
                    detail: Object.fromEntries(new FormData(form)),
                }),
            );
            announce(uiText('checkout-02'));
        });
    }

    // === comparing ===

    function comparisonRows(rows, activeIds, mode = 'all') {
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

    function comparing() {
        document.querySelectorAll('.comparing').forEach((root) => {
            if (root.dataset.initialized || typeof Swiper === 'undefined') {
                return;
            }

            root.dataset.initialized = 'true';
            const body = root.querySelector('.comparing__body');
            const panel = root.querySelector('.comparing__panel');
            const anchor = root.querySelector('.comparing__anchor');
            const empty = root.querySelector('.comparing__empty');
            const important = root.querySelector('.comparing__important-rows');
            const rowElements = [...root.querySelectorAll('.comparing__content .comparing__block')];
            const rows = rowElements.map((element) => ({
                element,
                key: element.dataset.parameter,
                values: JSON.parse(element.dataset.values),
            }));
            const items = [
                ...root.querySelector('[data-compare-column="desktop"] .swiper-wrapper').children,
            ];
            const ids = items.map((item) => item.dataset.compareId);
            const activeIds = ids.map((id, index) => index);
            const desktopQuery = window.matchMedia('(min-width: 1199.98px)');
            let mode = 'all';
            const populatedCategory = root.querySelector('[data-compare-category].is-active')
                .dataset.compareCategory;
            let category = populatedCategory;
            let frame = 0;
            let naturalHeight = 0;
            let desktop;
            const columns = [];

            function updateRows() {
                const selected = desktopQuery.matches
                    ? activeIds
                    : columns
                          .map((swiper) => activeIds[swiper.activeIndex])
                          .filter((index) => index !== undefined);

                comparisonRows(rows, selected, mode).forEach(({ element, visible, values }) => {
                    element.hidden = !visible;
                    const cells = [...element.querySelectorAll('.comparing__value')];

                    cells.forEach((cell, index) => {
                        cell.hidden = index >= selected.length;
                        cell.textContent = values[index] ?? '—';
                    });
                });
                important.replaceChildren();
                rows.forEach(({ element }) => {
                    if (!element.querySelector('.comparing__check').checked || element.hidden) {
                        return;
                    }

                    important.append(element.cloneNode(true));
                });
            }

            function updateSticky() {
                frame = 0;
                if (body.hidden) {
                    panel.classList.remove('is-stuck');
                    anchor.style.height = '';

                    return;
                }
                const top = anchor.getBoundingClientRect().top;
                const bottom = root
                    .querySelector('.comparing__desc')
                    .getBoundingClientRect().bottom;
                const stuck = top <= 0 && bottom > panel.getBoundingClientRect().height + 30;

                if (!panel.classList.contains('is-stuck')) {
                    naturalHeight = panel.offsetHeight;
                }
                anchor.style.height = stuck ? naturalHeight + 'px' : '';
                panel.classList.toggle('is-stuck', stuck);
            }

            function requestSticky() {
                if (!frame) {
                    frame = requestAnimationFrame(updateSticky);
                }
            }

            root.querySelectorAll('[data-compare-column]').forEach((column) => {
                const isDesktop = column.dataset.compareColumn === 'desktop';
                const swiper = new Swiper(column.querySelector('.swiper'), {
                    speed: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 300,
                    touchEventsTarget: 'container',
                    grabCursor: true,
                    slidesPerView: isDesktop ? 'auto' : 1,
                    spaceBetween: 20,
                    initialSlide: column.dataset.compareColumn === '1' ? 1 : 0,
                    rewind: true,
                    watchOverflow: true,
                    navigation: {
                        prevEl: column.querySelector('.swiper-button-prev'),
                        nextEl: column.querySelector('.swiper-button-next'),
                    },
                    pagination: {
                        el: column.querySelector('.comparing__pagination'),
                        type: 'fraction',
                        renderFraction: (current, total) => {
                            const fraction = uiFragment('compare-fraction').firstElementChild;
                            fraction.querySelector('[data-fraction-current]').className = current;
                            fraction.querySelector('[data-fraction-total]').className = total;
                            return fraction.outerHTML;
                        },
                    },
                    on: {
                        slideChange() {
                            updateRows();
                            if (
                                !isDesktop &&
                                columns.length === 2 &&
                                this.params.speed > 0 &&
                                !window.matchMedia('(prefers-reduced-motion: reduce)').matches
                            ) {
                                const index = Number(column.dataset.compareColumn);
                                root.querySelectorAll('.comparing__values').forEach((row) => {
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
                                                { opacity: 1, transform: 'translateX(0)' },
                                            ],
                                            { duration: this.params.speed, easing: 'ease-out' },
                                        );
                                    }
                                });
                            }
                        },
                        resize() {
                            requestSticky();
                        },
                        setTranslate() {
                            if (isDesktop) {
                                root.style.setProperty('--comparing-shift', this.translate + 'px');
                            }
                        },
                        setTransition(swiper, duration) {
                            if (isDesktop) {
                                root.style.setProperty('--comparing-duration', duration + 'ms');
                            }
                        },
                        sliderFirstMove() {
                            root.classList.add('is-dragging');
                        },
                        touchEnd() {
                            root.classList.remove('is-dragging');
                        },
                    },
                });

                if (isDesktop) {
                    desktop = swiper;
                } else {
                    columns.push(swiper);
                }
            });

            const description = root.querySelector('.comparing__desc');
            const beginComparisonGesture = (event, point) => {
                if (event.target.closest('a, button, input, select, textarea, label')) {
                    return;
                }
                const bounds = description.getBoundingClientRect();
                const index = point.clientX < bounds.left + bounds.width / 2 ? 0 : 1;
                const swiper = desktopQuery.matches ? desktop : columns[index];
                if (swiper && !swiper.destroyed) {
                    // Swiper keeps ownership of threshold, vertical-scroll detection,
                    // movement, snapping and document-level pointer release.
                    swiper.onTouchStart(event);
                }
            };
            description.addEventListener('pointerdown', (event) => {
                if (event.isPrimary && event.button === 0) {
                    beginComparisonGesture(event, event);
                }
            });
            description.addEventListener(
                'touchstart',
                (event) => {
                    if (event.targetTouches.length === 1) {
                        // Native touch tracking lets Swiper finish a vertical pan after
                        // Chrome emits pointercancel, so the next swipe can start.
                        beginComparisonGesture(event, event.targetTouches[0]);
                    }
                },
                { passive: false },
            );

            function setFilter(value) {
                mode = value;
                root.querySelectorAll('[name="compare-filter"]').forEach((input) => {
                    input.checked = input.value === mode;
                });
                root.querySelector('[data-mobile-differences]').checked = mode === 'different';
                updateRows();
                requestSticky();
            }

            function updateEmpty() {
                const noItems = category !== populatedCategory || activeIds.length === 0;

                body.hidden = noItems;
                empty.hidden = !noItems;
                [...root.querySelectorAll('[data-compare-category]')]
                    .find((tab) => tab.dataset.compareCategory === populatedCategory)
                    .querySelector('.comparing__count').textContent = activeIds.length;
                requestSticky();
            }

            root.addEventListener('change', (event) => {
                if (event.target.matches('[name="compare-filter"]')) {
                    setFilter(event.target.value);
                }
                if (event.target.matches('[data-mobile-differences]')) {
                    setFilter(event.target.checked ? 'different' : 'all');
                }
                if (event.target.matches('[data-important]')) {
                    const key = event.target.dataset.important;
                    const row = rows.find((item) => item.key === key);

                    row.element.querySelector('.comparing__check').checked = event.target.checked;
                    updateRows();
                    requestSticky();
                }
            });

            root.addEventListener('click', (event) => {
                const favorite = event.target.closest('.favorite-btn');

                if (favorite) {
                    queueMicrotask(() => {
                        const id = favorite.closest('[data-compare-id]').dataset.compareId;
                        const active = favorite.classList.contains('active');

                        root.querySelectorAll('[data-compare-id]').forEach((item) => {
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
                    category = tab.dataset.compareCategory;
                    root.querySelectorAll('[data-compare-category]').forEach((item) => {
                        item.classList.toggle('is-active', item === tab);
                        item.setAttribute('aria-pressed', String(item === tab));
                    });
                    updateEmpty();
                }
                if (!remove && !clear) {
                    return;
                }

                const removed = remove
                    ? remove.closest('[data-compare-id]').dataset.compareId
                    : null;
                const index = removed
                    ? activeIds.findIndex((original) => ids[original] === removed)
                    : -1;
                const slideIndexes = clear ? activeIds.map((id, position) => position) : [index];

                if (clear) {
                    activeIds.length = 0;
                } else if (index >= 0) {
                    activeIds.splice(index, 1);
                }
                [desktop, ...columns].forEach((swiper) => {
                    // Hidden responsive columns may not have measured their slides yet.
                    swiper.recalcSlides();
                    swiper.removeSlide(slideIndexes);
                    swiper.update();
                });
                if (clear?.dataset.compareClear === 'all') {
                    root.querySelectorAll('.comparing__count').forEach((count) => {
                        count.textContent = '0';
                    });
                }
                updateRows();
                updateEmpty();
                root.querySelector('.comparing__status').textContent = remove
                    ? uiText('comparing-01')
                    : uiText('comparing-02');
                if (remove) {
                    const next = root.querySelector(
                        '[data-compare-column="' +
                            (desktopQuery.matches ? 'desktop' : '0') +
                            '"] .swiper-slide-active [data-compare-remove]',
                    );

                    (body.hidden ? root.querySelector('.comparing__catalog') : next)?.focus();
                }
            });

            window.addEventListener('scroll', requestSticky, { passive: true });
            window.addEventListener('resize', () => {
                panel.classList.remove('is-stuck');
                anchor.style.height = '';
                naturalHeight = panel.offsetHeight;
                updateRows();
                requestSticky();
            });
            if (typeof ResizeObserver !== 'undefined') {
                new ResizeObserver(requestSticky).observe(root.querySelector('.comparing__desc'));
            }
            updateRows();
            updateEmpty();
        });
    }

    // === dom ===

    // Layout-based visibility also accounts for elements hidden by a parent or CSS.
    const isVisible = (element) =>
        Boolean(
            element &&
            (element.offsetWidth || element.offsetHeight || element.getClientRects().length),
        );

    // Pass the matched element explicitly: native currentTarget remains the listener root.
    function delegate(root, type, selector, callback) {
        root.addEventListener(type, (event) => {
            const element = event.target?.closest?.(selector);

            if (element && root.contains(element)) {
                callback(event, element);
            }
        });
    }

    // === effects ===

    const effects = new WeakMap();
    const displays = new WeakMap();

    function show(element) {
        if (!element) {
            return;
        }

        cancelEffect(element);
        element.hidden = false;
        if (element.style.display === 'none') {
            element.style.display = displays.get(element) || '';
        }
        if (getComputedStyle(element).display === 'none') {
            element.style.display = 'revert';
        }
    }

    function hide(element) {
        if (!element) {
            return;
        }

        cancelEffect(element);
        if (element.style.display !== 'none') {
            displays.set(element, element.style.display);
        }
        element.style.display = 'none';
    }

    function cancelEffect(element) {
        const running = effects.get(element);

        if (!running) {
            return;
        }

        effects.delete(element);
        clearTimeout(running.timer);
        running.animation.cancel();
    }

    function animateVisibility(element, opening, duration, callback) {
        if (!element) {
            return;
        }

        const running = effects.get(element);

        if (running?.opening === opening) {
            return;
        }

        const visible = getComputedStyle(element).display !== 'none' && !element.hidden;

        if (!running && visible === opening) {
            return;
        }

        const current = getComputedStyle(element);
        const from = { opacity: current.opacity };

        show(element);
        const style = getComputedStyle(element);
        const expanded = { opacity: style.opacity };
        const collapsed = { opacity: 0 };
        const finish = () => {
            if (!opening) {
                hide(element);
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
        const state = { animation, opening };

        effects.set(element, state);
        const complete = () => {
            if (effects.get(element) !== state) {
                return;
            }

            effects.delete(element);
            clearTimeout(state.timer);
            animation.cancel();
            finish();
        };

        // Background tabs can suspend the animation timeline; keep logical state timely.
        state.timer = setTimeout(complete, duration);
        animation.finished.then(complete, () => {});
    }

    const fade = (element, opening, duration = 300, callback) =>
        animateVisibility(element, opening, duration, callback);

    const slides = new WeakMap();
    function slide(element, opening, duration = 300) {
        if (!element) {
            return;
        }

        const previous = slides.get(element);

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
            slides.delete(element);
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

        slides.set(element, state);
        const complete = () => {
            if (slides.get(element) !== state) {
                return;
            }

            slides.delete(element);
            clearTimeout(state.timer);
            animation.cancel();
            finish();
        };

        state.timer = setTimeout(complete, duration);
        animation.finished.then(complete, () => {});
    }

    function scrollToPosition(top) {
        window.scrollTo({
            top,
            behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
                ? 'instant'
                : 'smooth',
        });
    }

    // === faq ===

    const initialized = new WeakSet();
    const animations = new WeakMap();

    const faq = () => {
        document.querySelectorAll('.faq__item').forEach((item) => {
            const summary = item.querySelector('.faq__question');

            if (!summary || initialized.has(item)) {
                return;
            }

            initialized.add(item);

            summary.addEventListener('click', (event) => {
                event.preventDefault();
                const previous = animations.get(item);
                const opening = previous ? !previous.opening : !item.open;
                const height = item.getBoundingClientRect().height;
                const overflow = previous?.overflow ?? item.style.overflow;

                if (previous) {
                    animations.delete(item);
                    clearTimeout(previous.timer);
                    previous.animation.cancel();
                }

                if (
                    !item.animate ||
                    window.matchMedia('(prefers-reduced-motion: reduce)').matches
                ) {
                    item.open = opening;
                    item.style.overflow = overflow;

                    return;
                }

                item.open = true;
                const css = getComputedStyle(item);
                const target = opening
                    ? item.getBoundingClientRect().height
                    : summary.getBoundingClientRect().height +
                      parseFloat(css.borderTopWidth) +
                      parseFloat(css.borderBottomWidth);

                item.style.overflow = 'hidden';
                const animation = item.animate(
                    [{ height: `${height}px` }, { height: `${target}px` }],
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

                animations.set(item, state);
                const finish = () => {
                    if (animations.get(item) !== state) {
                        return;
                    }

                    animations.delete(item);
                    clearTimeout(state.timer);
                    item.open = opening;
                    animation.cancel();
                    item.style.overflow = overflow;
                };

                // Background tabs can suspend the animation timeline.
                state.timer = setTimeout(finish, 300);
                animation.finished.then(finish, () => {});
            });
        });
    };

    // === favorites ===

    function favorites() {
        document.querySelectorAll('.favorites').forEach((root) => {
            if (root.dataset.favoritesReady) {
                return;
            }

            root.dataset.favoritesReady = 'true';
            root.addEventListener('click', (event) => {
                if (event.target.closest('.favorites__clear')) {
                    root.querySelectorAll('.favorite-btn').forEach((button) => {
                        button.classList.remove('active');
                        button.setAttribute('aria-pressed', 'false');
                    });
                }
                const remove = event.target.closest('[data-remove-category]');

                remove?.closest('.favorites__category').remove();
            });
        });
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
            delegate(document, 'submit', 'form', (event) => this.handleSubmit(event));
            for (const type of ['input', 'change']) {
                delegate(document, type, this.selectors.requiredAttr, (event, field) => {
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
            delegate(document, 'keydown', 'input[type="tel"]', (event) =>
                this.onPhoneKeyDown(event),
            );
            delegate(document, 'input', 'input[type="tel"]', (event) => this.onPhoneInput(event));
            delegate(document, 'paste', 'input[type="tel"]', (event) => this.onPhonePaste(event));
            delegate(document, 'focusin', 'input[type="tel"]', (event, input) => {
                if (!input.value) {
                    input.value = '+7 ';
                }
            });
            delegate(document, 'reset', 'form', (event, form) => {
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
            let issue = !required && !value ? '' : validateFieldValue(kind, value);

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
                    show(label);
                } else {
                    hide(label);
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
            this.onPhoneInput({ target: input });
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
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }

    function subscription() {
        delegate(document, 'submit', '.subscribe__form', (event, form) => {
            event.preventDefault();
            if (!window.FormController.validateForm(form)) {
                return;
            }

            form.querySelectorAll('.subscribe__status').forEach((status) => {
                status.hidden = false;
            });
        });
    }

    // === mobile-catalog ===

    function mobileCatalog({ closeNavigation }) {
        const catalog = document.querySelector('.mobile-catalog');
        const trigger = document.querySelector('.main-actions__item.icon-dots-grid');
        const desktopTrigger = document.querySelector('.header__catalog');

        if (!catalog || !trigger) {
            return;
        }

        const media = window.matchMedia('(max-width: 767.97px)');
        const panels = [...catalog.querySelectorAll('.mobile-catalog__panel')];
        const root = catalog.querySelector('#catalog-root');
        const body = catalog.querySelector('.mobile-catalog__body');
        const title = catalog.querySelector('.mobile-catalog__title');
        const back = catalog.querySelector('.mobile-catalog__back');
        const closeButton = catalog.querySelector('.mobile-catalog__close');
        const actions = document.querySelector('.main-actions');
        let stack = [];
        let pageScroll = 0;
        let previousBodyTop = '';
        let inertElements = [];
        let activeTrigger = trigger;
        let locked = false;
        let mobileLayout = media.matches;
        const triggers = [trigger, desktopTrigger].filter(Boolean);

        function position() {
            if (media.matches || catalog.hidden) {
                return;
            }

            const rect = activeTrigger.getBoundingClientRect();

            catalog.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - 302))}px`;
            catalog.style.top = `${rect.bottom + 8}px`;
            catalog.style.maxHeight = `${Math.max(0, window.innerHeight - rect.bottom - 16)}px`;
        }

        function render() {
            const current = stack[stack.length - 1];
            const nested = stack.length > 1;

            panels.forEach((panel) => {
                panel.hidden = panel !== current.panel;
            });
            catalog.classList.toggle('mobile-catalog--nested', nested);
            title.textContent = current.panel.dataset.catalogTitle;
            title.classList.toggle('title-md', !nested);
            title.classList.toggle('title-sm', nested);
            back.hidden = !nested;
            closeButton.hidden = nested;
            back.setAttribute(
                'aria-label',
                nested
                    ? uiText('mobile-catalog-01', {
                          value0: stack[stack.length - 2].panel.dataset.catalogTitle,
                      })
                    : uiText('mobile-catalog-02'),
            );
            body.scrollTop = current.scroll;
        }

        function close(restoreFocus = false) {
            if (catalog.hidden) {
                return;
            }

            catalog.hidden = true;
            triggers.forEach((button) => button.setAttribute('aria-expanded', 'false'));
            catalog
                .querySelectorAll('[data-catalog-target]')
                .forEach((button) => button.setAttribute('aria-expanded', 'false'));
            inertElements.forEach((element) => {
                element.inert = false;
            });
            inertElements = [];
            document.body.classList.remove('open-mobile-catalog');
            if (locked) {
                document.body.style.top = previousBodyTop;
                window.scrollTo({ top: pageScroll, behavior: 'instant' });
            }
            locked = false;
            catalog.style.removeProperty('left');
            catalog.style.removeProperty('top');
            catalog.style.removeProperty('max-height');
            stack = [];
            if (restoreFocus) {
                activeTrigger.focus({ preventScroll: true });
            }
        }

        function open() {
            closeNavigation();
            window.SearchController?.closeSearch();
            pageScroll = window.scrollY;
            previousBodyTop = document.body.style.top;
            stack = [
                {
                    panel: root,
                    scroll: 0,
                    opener: null,
                },
            ];
            render();
            locked = media.matches;
            if (locked) {
                document.body.style.top = `${-pageScroll}px`;
                document.body.classList.add('open-mobile-catalog');
            }
            catalog.hidden = false;
            triggers.forEach((button) => button.setAttribute('aria-expanded', 'true'));
            // Leave the fixed bottom navigation available while blocking the covered page.
            inertElements = (
                locked
                    ? [
                          ...document.querySelectorAll(
                              '.header__content-container > :not(.main-actions), .header__bottom, main, footer, .arrow-top',
                          ),
                      ]
                    : []
            ).filter((element) => !element.inert);
            inertElements.forEach((element) => {
                element.inert = true;
            });
            position();
            (media.matches ? closeButton : root.querySelector('button, a')).focus({
                preventScroll: true,
            });
        }

        triggers.forEach((button) =>
            button.addEventListener('click', (event) => {
                event.preventDefault();
                activeTrigger = button;
                if (catalog.hidden) {
                    open();
                } else {
                    close(true);
                }
            }),
        );
        document.addEventListener('click', (event) => {
            if (
                !catalog.hidden &&
                !media.matches &&
                !catalog.contains(event.target) &&
                !triggers.some((button) => button.contains(event.target))
            ) {
                close();
            }
        });
        window.addEventListener('resize', () => {
            const nextMobileLayout = window.innerWidth < 768;

            if (nextMobileLayout !== mobileLayout) {
                mobileLayout = nextMobileLayout;
                close();
            } else {
                position();
            }
        });
        window.addEventListener(
            'scroll',
            () => {
                if (!media.matches) {
                    close();
                }
            },
            { passive: true },
        );

        catalog.addEventListener('click', (event) => {
            const button = event.target.closest('[data-catalog-target]');

            if (button) {
                const panel = panels.find((item) => item.id === button.dataset.catalogTarget);

                if (!panel || stack.some((item) => item.panel === panel)) {
                    return;
                }

                stack[stack.length - 1].scroll = body.scrollTop;
                button.setAttribute('aria-expanded', 'true');
                stack.push({
                    panel,
                    scroll: 0,
                    opener: button,
                });
                render();
                title.focus({ preventScroll: true });
            } else if (event.target.closest('a')) {
                close();
            }
        });

        back.addEventListener('click', () => {
            if (stack.length < 2) {
                return;
            }

            const previous = stack.pop();

            previous.opener.setAttribute('aria-expanded', 'false');
            render();
            previous.opener.focus({ preventScroll: true });
        });
        closeButton.addEventListener('click', () => close(true));
        actions?.addEventListener('click', (event) => {
            if (event.target.closest('.main-actions__item') !== trigger) {
                close();
            }
        });
        media.addEventListener('change', () => close());
        window.addEventListener('pagehide', () => close());
        document.addEventListener('keydown', (event) => {
            if (catalog.hidden) {
                return;
            }

            if (event.key === 'Escape') {
                event.preventDefault();
                close(true);
            } else if (event.key === 'Tab') {
                if (!media.matches) {
                    return;
                }

                const focusable = [
                    ...catalog.querySelectorAll('button, a'),
                    ...actions.querySelectorAll('a, button'),
                ].filter((element) => !element.closest('[hidden]') && !element.disabled);
                const first = focusable[0];
                const last = focusable[focusable.length - 1];

                if (
                    event.shiftKey &&
                    (document.activeElement === first || document.activeElement === title)
                ) {
                    event.preventDefault();
                    last.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault();
                    first.focus();
                }
            }
        });
    }

    // === header ===

    function header() {
        const burger = document.querySelector('.header__burger');
        const navigation = document.querySelector('#header-menu');
        const backdrop = document.querySelector('.header__backdrop');
        const closeNavigation = (restoreFocus = false) => {
            const wasOpen = navigation?.classList.contains('is-open');

            navigation?.classList.remove('is-open');
            if (backdrop) {
                backdrop.hidden = true;
            }
            document.body.classList.remove('open-navigation');
            if (burger) {
                burger.setAttribute('aria-expanded', 'false');
                burger.setAttribute('aria-label', uiText('header-01'));
                burger.classList.remove('icon-close');
                burger.classList.add('icon-menu');
                if (wasOpen && restoreFocus) {
                    burger.focus();
                }
            }
        };

        burger?.addEventListener('click', () => {
            if (!navigation) {
                return;
            }

            if (navigation.classList.contains('is-open')) {
                return closeNavigation();
            }

            window.SearchController?.closeSearch();
            navigation.classList.add('is-open');
            if (backdrop) {
                backdrop.hidden = false;
            }
            document.body.classList.add('open-navigation');
            burger.setAttribute('aria-expanded', 'true');
            burger.setAttribute('aria-label', uiText('header-02'));
            burger.classList.replace('icon-menu', 'icon-close');
        });
        backdrop?.addEventListener('click', () => closeNavigation(true));
        delegate(
            document,
            'click',
            '.header__bottom .menu__link, .main-actions__item, .search__toggler',
            () => closeNavigation(),
        );
        document.addEventListener('keydown', (event) => {
            if (!navigation?.classList.contains('is-open')) {
                return;
            }

            if (event.key === 'Escape') {
                closeNavigation(true);
            }
            if (event.key !== 'Tab') {
                return;
            }

            const items = [
                ...document.querySelectorAll(
                    '.header__content a, .header__content button, .header__content input, .header__bottom a, .header__bottom button, .header__bottom input',
                ),
            ].filter(isVisible);
            const first = items[0];
            const last = items[items.length - 1];

            if (first && event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (last && !event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        });
        window
            .matchMedia('(max-width: 767.97px)')
            .addEventListener('change', () => closeNavigation());
        mobileCatalog({ closeNavigation });
        const element = document.querySelector('.header');

        if (element) {
            const updateHeight = () => {
                document.documentElement.style.setProperty(
                    '--header-height',
                    `${element.getBoundingClientRect().height}px`,
                );
            };

            updateHeight();
            if (typeof ResizeObserver !== 'undefined') {
                new ResizeObserver(updateHeight).observe(element);
            } else {
                window.addEventListener('resize', updateHeight);
            }

            window.addEventListener(
                'scroll',
                () => {
                    if (window.scrollY > 100) {
                        element.classList.add('scroll');
                    } else if (window.scrollY <= 10) {
                        element.classList.remove('scroll');
                    }
                },
                { passive: true },
            );
        }

        return { closeNavigation };
    }

    // === interactions ===

    function normalizeQuantity(value) {
        return Math.min(9999, Math.max(1, parseInt(String(value).replace(/\D/g, ''), 10) || 1));
    }

    function interactions() {
        if (typeof Fancybox !== 'undefined' && Fancybox) {
            Fancybox.bind('[data-fancybox]', { closeExisting: true });
        }
        delegate(document, 'click', '.favorite-btn, .compare-btn', (event, button) => {
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
        });
        delegate(document, 'click', '.review__toggle', (event, button) => {
            const content = button.closest('.review')?.querySelector('.review__content');
            const expanded = button.classList.toggle('is-active');

            content?.classList.toggle('expanded', expanded);
            button.setAttribute('aria-expanded', String(expanded));
            button.textContent = expanded ? uiText('interactions-01') : uiText('interactions-02');
        });
        document.querySelectorAll('.quantity-block').forEach((block) => {
            const input = block.querySelector('.quantity-block__input');

            if (!input) {
                return;
            }

            block.querySelector('.quantity-block__up')?.addEventListener('click', () => {
                const value = normalizeQuantity(input.value);

                if (value < 9999) {
                    input.value = value + 1;
                }
            });
            block.querySelector('.quantity-block__down')?.addEventListener('click', () => {
                const value = normalizeQuantity(input.value);

                if (value > 1) {
                    input.value = value - 1;
                }
            });
            input.addEventListener('input', () => {
                input.value = normalizeQuantity(input.value);
            });
            input.addEventListener('paste', (event) => {
                if (/\D/.test(event.clipboardData.getData('text'))) {
                    event.preventDefault();
                }
            });
        });
        const arrows = document.querySelectorAll('.arrow-top');

        if (arrows.length) {
            window.addEventListener(
                'scroll',
                () =>
                    arrows.forEach((arrow) =>
                        arrow.classList.toggle('visible', window.scrollY > 300),
                    ),
                { passive: true },
            );
            arrows.forEach((arrow) => arrow.addEventListener('click', () => scrollToPosition(0)));
        }
    }

    class NotifyController {
        constructor() {
            this.containerSelector = '.notify-container';
            this.productSelector = '.product, .product-details';
            this.btnSelector = '.add-to-cart-btn';
            this.displayTime = 4000;
            this.init();
        }
        init() {
            delegate(document, 'click', this.btnSelector, (event, button) => {
                if (button.disabled || button.getAttribute('aria-disabled') === 'true') {
                    return;
                }

                this.updateCartButton(button);
                this.handleAddToCart(button.closest(this.productSelector));
            });
        }
        updateCartButton(button) {
            const label = button.dataset.cartAddedLabel;
            const text = button.querySelector('.comparing-card__cart-text');
            const cartIcon = button.querySelector('.icon-cart');
            const image = button.querySelector('img');

            if (text) {
                text.textContent = label;
            } else {
                button.childNodes.forEach((node) => {
                    if (node.nodeType === 3 && node.textContent.trim()) {
                        node.textContent = label;
                    }
                });
            }

            if (cartIcon) {
                cartIcon.classList.replace('icon-cart', 'icon-check');
            } else if (image) {
                const icon = document.createElement('span');

                icon.className = `${image.className} icon-check`;
                icon.setAttribute('aria-hidden', 'true');
                image.replaceWith(icon);
            } else if (button.classList.contains('icon-cart')) {
                button.classList.replace('icon-cart', 'icon-check');
            }

            button.classList.add('is-added');
            if (button.hasAttribute('aria-label')) {
                button.setAttribute('aria-label', label);
            }
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
                cart: { title: uiText('interactions-03'), icon: 'icon-cart' },
                favorite: { title: uiText('interactions-04'), icon: 'icon-heart' },
                compare: { title: uiText('interactions-05'), icon: 'icon-bars' },
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
            close.setAttribute('aria-label', uiText('interactions-06'));
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

    function maps() {
        if (!document.querySelector('.map-block')) {
            return;
        }

        function initMaps(api) {
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
                    { suppressMapOpenBlock: true },
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
        loadMaps()
            .then(initMaps)
            .catch(() => {
                document.querySelectorAll('.map-block').forEach((container) => {
                    if (
                        !container.querySelector('.map-block__status') &&
                        !container.classList.contains('is-initialized')
                    ) {
                        const message = document.createElement('p');
                        message.className = 'map-block__status';
                        message.setAttribute('role', 'status');
                        showMessage(message, 'maps-01');
                        container.append(message);
                    }
                });
            });
    }

    // === news ===

    // News cards and pagination are rendered by templates; loading belongs to the server.
    const news = () => {};

    // === order-details ===

    function orderDetails() {
        const root = document.querySelector('[data-order-details]');
        if (!root || root.dataset.initialized) {
            return;
        }
        root.dataset.initialized = 'true';
        const showState = (container, state) => {
            container.hidden = false;
            container.querySelectorAll('[data-order-state]').forEach((message) => {
                message.hidden = message.dataset.orderState !== state;
            });
        };
        root.querySelector('[data-copy-order]').addEventListener('click', async () => {
            const status = root.querySelector('.order-details__announcement');
            try {
                await navigator.clipboard.writeText(
                    root.querySelector('[data-order-number]').textContent.trim(),
                );
                showState(status, 'copied');
            } catch {
                showState(status, 'copy-error');
            }
        });
        root.querySelectorAll('[data-order-action]').forEach((button) => {
            button.addEventListener('click', () => {
                showState(root.querySelector('.order-details__notice'), button.dataset.orderAction);
            });
        });
    }

    // === orders ===

    function orders() {
        const form = document.querySelector('.orders__filters');

        if (!form || form.dataset.initialized) {
            return;
        }

        form.dataset.initialized = 'true';
        form.addEventListener('submit', (event) => event.preventDefault());
    }

    // === parts-order ===

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
                : uiText('file-unknown');

            format.className =
                'file-upload__format ' + (extension === 'PDF' ? 'icon-pdf' : 'icon-file');
            format.dataset.format = extension.slice(0, 5);
            format.setAttribute('aria-label', uiText('parts-order-01') + extension);
            const info = document.createElement('span');

            info.className = 'file-upload__info';
            const size = document.createElement('span');

            size.className = 'file-upload__size';
            size.textContent =
                file.size < 1024 * 1024
                    ? Math.max(1, Math.ceil(file.size / 1024)) + uiText('parts-order-02')
                    : (file.size / (1024 * 1024)).toFixed(1) + uiText('parts-order-03');
            info.append(name, size);
            const remove = document.createElement('button');

            remove.className = 'file-upload__remove icon-close';
            remove.type = 'button';
            remove.dataset.fileIndex = index;
            remove.setAttribute('aria-label', uiText('parts-order-04') + file.name);
            item.append(format, info, remove);
            list.append(item);
        });
        list.hidden = !input.files.length;
    }

    const partsOrder = () => {
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
                setStatus(form.dataset.unavailableMessage);

                return;
            }
            const buttons = [...form.querySelectorAll('[type="submit"]')];
            const disabled = buttons.map((button) => button.disabled);

            form.setAttribute('aria-busy', 'true');
            buttons.forEach((button) => {
                button.disabled = true;
            });
            setStatus(form.dataset.pendingMessage);
            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    body: new FormData(form),
                });

                if (!response.ok) {
                    throw new Error('Request failed');
                }

                form.reset();
                setStatus(form.dataset.successMessage);
            } catch {
                setStatus(form.dataset.errorMessage);
            } finally {
                form.removeAttribute('aria-busy');
                buttons.forEach((button, index) => {
                    button.disabled = disabled[index];
                });
            }
        });
    };

    // === product-details ===

    function productDetails() {
        document.querySelectorAll('.product-content').forEach((content) => {
            if (content.dataset.productContentReady) {
                return;
            }
            content.dataset.productContentReady = 'true';

            delegate(content, 'click', '.product-content__expand', (event, button) => {
                const expanded = button.getAttribute('aria-expanded') !== 'true';

                content.querySelectorAll('.product-content__rich-image--extra').forEach((image) => {
                    image.hidden = !expanded;
                });
                button.setAttribute('aria-expanded', String(expanded));
                button.textContent = expanded
                    ? uiText('product-details-01')
                    : uiText('interactions-02');
            });
            delegate(content, 'click', '.product-content__tab', (event, tab) => {
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

            delegate(product, 'input', '.quantity-block__input', (event, input) => sync(input));
            delegate(
                product,
                'click',
                '.quantity-block__up, .quantity-block__down',
                (event, button) =>
                    sync(button.closest('.quantity-block').querySelector('.quantity-block__input')),
            );
        });
    }

    // === product-listing ===

    function productListing() {
        const root = document.querySelector('.product-listing');

        if (!root || root.dataset.listingReady) {
            return;
        }

        root.dataset.listingReady = 'true';

        const form = root.querySelector('.listing-filter');
        const overlay = root.querySelector('.listing-filter-overlay');
        const opener = root.querySelector('.product-listing__filter-button');
        let previousOverflow = '';

        function closeFilter() {
            if (!form.classList.contains('is-open')) {
                return;
            }

            form.classList.remove('is-open');
            form.removeAttribute('role');
            form.removeAttribute('aria-modal');
            overlay.hidden = true;
            opener.setAttribute('aria-expanded', 'false');
            document.body.style.overflow = previousOverflow;
            opener.focus();
        }

        opener.addEventListener('click', () => {
            previousOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            form.classList.add('is-open');
            form.setAttribute('role', 'dialog');
            form.setAttribute('aria-modal', 'true');
            overlay.hidden = false;
            opener.setAttribute('aria-expanded', 'true');
            form.querySelector('.listing-filter__close').focus();
        });
        form.querySelector('.listing-filter__close').addEventListener('click', closeFilter);
        overlay.addEventListener('click', closeFilter);
        document.addEventListener('keydown', (event) => {
            if (!form.classList.contains('is-open')) {
                return;
            }

            if (event.key === 'Escape') {
                closeFilter();
            }
            if (event.key !== 'Tab') {
                return;
            }

            const focusable = Array.from(form.querySelectorAll('a, button, input, summary')).filter(
                (element) => element.getClientRects().length,
            );
            const first = focusable[0];
            const last = focusable[focusable.length - 1];

            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        });
        window.matchMedia('(min-width: 1199.98px)').addEventListener('change', (event) => {
            if (event.matches) {
                closeFilter();
            }
        });
        form.addEventListener('submit', (event) => {
            event.preventDefault();
            closeFilter();
        });
        root.querySelector('.product-listing__selected')?.addEventListener('click', (event) => {
            const chip = event.target.closest('.product-listing__chip');
            const clearChip = (item) => {
                const names = (item.dataset.filterFields || '').split(',');

                [...form.elements]
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
                        field.dispatchEvent(new Event('change', { bubbles: true }));
                    });
                item.remove();
            };

            if (chip) {
                clearChip(chip);
            }
            if (event.target.closest('.product-listing__clear')) {
                root.querySelectorAll('.product-listing__chip').forEach(clearChip);
            }
            const selected = root.querySelector('.product-listing__selected');

            if (!selected.querySelector('.product-listing__chip')) {
                selected.hidden = true;
            }
        });
        form.querySelector('.listing-filter__expand').addEventListener('click', (event) => {
            const button = event.currentTarget;
            const extra = form.querySelector('.listing-filter__extra');

            extra.hidden = !extra.hidden;
            button.textContent = extra.hidden
                ? uiText('product-listing-01')
                : uiText('product-listing-02');
            button.setAttribute('aria-expanded', String(!extra.hidden));
        });
        root.querySelectorAll('.product-listing__tag:not(.product-listing__tag--more)').forEach(
            (button) =>
                button.addEventListener('click', () => {
                    root.querySelectorAll('.product-listing__tag').forEach((tag) => {
                        tag.classList.remove('is-active');
                        tag.setAttribute('aria-pressed', 'false');
                    });
                    button.classList.add('is-active');
                    button.setAttribute('aria-pressed', 'true');
                }),
        );
        root.querySelector('.product-listing__tag--more').addEventListener('click', (event) => {
            const button = event.currentTarget;
            const expanded = button.getAttribute('aria-expanded') !== 'true';

            root.querySelector('.product-listing__tags').classList.toggle('is-expanded', expanded);
            button.setAttribute('aria-expanded', String(expanded));
            button.textContent = expanded
                ? uiText('product-listing-02')
                : uiText('product-listing-01');
        });
    }

    // === review ===

    const reviews = () => {
        delegate(document, 'click', '.review__vote', (event, vote) => {
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
        });
    };

    // === search-fields ===

    function searchFields() {
        const sync = (input) => {
            const button = input.closest('.search-field')?.querySelector('.search-field__clear');

            if (button) {
                button.hidden = input.value.length === 0;
            }
        };

        document.querySelectorAll('.search-field__input').forEach(sync);
        delegate(document, 'input', '.search-field__input', (event, input) => sync(input));
        delegate(document, 'click', '.search-field__clear', (event, button) => {
            const input = button.closest('.search-field').querySelector('.search-field__input');

            input.value = '';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.focus();
        });
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
            delegate(document, 'click', this.selectors.toggler, (event) => {
                event.stopPropagation();
                this.toggleSearch();
            });
            for (const type of ['input', 'focusin', 'click']) {
                delegate(document, type, this.selectors.input, (event, input) =>
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
            delegate(document, 'submit', '.search__form', (event, form) => {
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
            delegate(document, 'keydown', this.selectors.input, (event, input) => {
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
            emptyText: uiText('select-01'),
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
                this.search.placeholder = uiText('select-02');
                this.search.setAttribute('aria-label', uiText('select-03'));
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
                    uiText('select-05', {
                        value0: this.native.getAttribute('aria-label') || uiText('select-04'),
                    }),
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
            empty.textContent = query.trim() ? uiText('select-06') : this.options.emptyText;
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
                this.native.dispatchEvent(new Event('input', { bubbles: true }));
                this.native.dispatchEvent(new Event('change', { bubbles: true }));
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
                    instance.close({ restoreFocus: true });
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
            this.search?.focus({ preventScroll: true });

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
                this.close({ restoreFocus: true });
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
                this.native.dispatchEvent(new Event('input', { bubbles: true }));
                this.native.dispatchEvent(new Event('change', { bubbles: true }));
                this.emit('change');
            }

            if (this.native.multiple) {
                this.activeIndex = this.optionEls.indexOf(option);
                this.updateActiveOption();
            } else {
                this.close({ restoreFocus: true });
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
                    (this.native.getAttribute('aria-label') || uiText('select-07')) +
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
                    active.scrollIntoView({ block: 'nearest' });
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
                    this.close({ restoreFocus: true });
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

    const controls = (container) => ({
        navigation: {
            nextEl: container.querySelector('.swiper-button-next'),
            prevEl: container.querySelector('.swiper-button-prev'),
        },
        pagination: { el: container.querySelector('.swiper-pagination'), clickable: true },
    });

    function createSlider(element, options) {
        if (!element || typeof Swiper === 'undefined') {
            return null;
        }

        return element.swiper || new Swiper(element, options);
    }

    function productGalleries() {
        document.querySelectorAll('[data-product-gallery]').forEach((gallery) => {
            const element = gallery.querySelector('.product-tile__slider');

            if (
                !element ||
                element.swiper ||
                typeof Swiper === 'undefined' ||
                element.querySelectorAll('.swiper-slide').length <= 1
            ) {
                return;
            }

            const slider = createSlider(element, {
                slidesPerView: 1,
                nested: true,
                observer: true,
                observeParents: true,
                watchOverflow: true,
                touchEventsTarget: 'container',
                a11y: { slideRole: 'link' },
                speed: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 200,
                pagination: {
                    el: gallery.querySelector('.swiper-pagination'),
                    clickable: true,
                    renderBullet: (index, className) => {
                        const bullet = uiFragment('gallery-bullet').firstElementChild;
                        bullet.className = className;
                        bullet.setAttribute(
                            'aria-label',
                            bullet.getAttribute('aria-label').replace('{number}', index + 1),
                        );
                        return bullet.outerHTML;
                    },
                },
            });
            const areas = document.createElement('div');

            areas.className = 'product-tile__areas';
            areas.setAttribute('aria-hidden', 'true');
            [...slider.slides].forEach((slide, index) => {
                const area = document.createElement('a');

                area.className = 'product-tile__area';
                area.href = slide.href;
                area.tabIndex = -1;
                area.addEventListener('pointerenter', (event) => {
                    if (event.pointerType === 'mouse') {
                        slider.slideTo(index);
                    }
                });
                areas.append(area);
            });
            element.append(areas);
            gallery.addEventListener('pointerleave', (event) => {
                if (event.pointerType === 'mouse') {
                    slider.slideTo(0);
                }
            });
        });
    }

    function sliders() {
        if (typeof Swiper === 'undefined') {
            return;
        }

        document.querySelectorAll('[data-showcase-slider]').forEach((container) => {
            const count = Number(container.dataset.showcaseSlider);
            const breakpoints = {
                576: { slidesPerView: 2 },
                768: { slidesPerView: 3 },
                992: { slidesPerView: count === 3 ? 3 : 4 },
                1200: { slidesPerView: count === 6 ? 5 : count === 5 ? 4 : 3 },
                1320: { slidesPerView: count },
            };

            createSlider(container.querySelector('.swiper'), {
                slidesPerView: 1,
                spaceBetween: count === 3 ? 20 : 10,
                breakpoints,
                watchOverflow: true,
                navigation: controls(container).navigation,
            });
        });
        document.querySelectorAll('.marketing__slider').forEach((container) => {
            createSlider(container.querySelector('.swiper'), {
                slidesPerView: 'auto',
                spaceBetween: 20,
                watchOverflow: true,
                breakpoints: {
                    768: { slidesPerView: 'auto' },
                    992: { slidesPerView: 'auto' },
                    1200: { slidesPerView: 3 },
                },
                navigation: controls(container).navigation,
            });
        });
        document.querySelectorAll('.promotions__slider').forEach((container) => {
            createSlider(container.querySelector('.swiper'), {
                slidesPerView: 1,
                rewind: true,
                watchOverflow: true,
                ...controls(container),
            });
        });
        const newsBreakpoints = {
            575.98: { slidesPerView: 1.5 },
            767.98: { slidesPerView: 2 },
            991.98: { slidesPerView: 3 },
            1419.98: { slidesPerView: 4 },
        };

        document
            .querySelectorAll('.news__slider:not([data-showcase-slider])')
            .forEach((container) => {
                createSlider(container.querySelector('.swiper'), {
                    slidesPerView: 1,
                    spaceBetween: 20,
                    watchOverflow: true,
                    breakpoints: newsBreakpoints,
                    ...controls(container),
                });
            });
        document.querySelectorAll('.product-details__gallery').forEach((gallery) => {
            const product = gallery.closest('.product-details');

            if (!product || gallery.querySelector('.swiper')?.swiper) {
                return;
            }

            const thumbs = [...product.querySelectorAll('.product-details__thumb')];
            const thumbnailContainer = product.querySelector('.product-details__thumbs');
            const thumbnails = createSlider(thumbnailContainer.querySelector('.swiper'), {
                slidesPerView: 3,
                spaceBetween: 10,
                watchOverflow: true,
                breakpoints: { 768: { direction: 'vertical', slidesPerView: 5 } },
                on: {
                    resize() {
                        const activeIndex = gallery.querySelector('.swiper')?.swiper?.activeIndex;

                        this.slideTo(activeIndex ?? 0, 0);
                    },
                },
            });
            const main = createSlider(gallery.querySelector('.swiper'), {
                slidesPerView: 1,
                watchOverflow: true,
                navigation: controls(thumbnailContainer).navigation,
                on: {
                    slideChange() {
                        thumbs.forEach((thumb, index) => {
                            thumb.classList.toggle('active', index === this.activeIndex);
                            thumb.setAttribute('aria-pressed', String(index === this.activeIndex));
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
            delegate(product, 'click', '.product-details__thumb', (event, thumb) =>
                main?.slideTo(thumbs.indexOf(thumb)),
            );
        });
        productGalleries();
    }

    // === tooltips ===

    function tooltipPosition(anchor, size, viewport) {
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

    function tooltips(scope = document) {
        scope.querySelectorAll('.tooltip').forEach((root) => {
            if (root.dataset.tooltipReady) {
                return;
            }

            const trigger = root.querySelector('.tooltip__trigger');
            const content = root.querySelector('.tooltip__content');

            if (!trigger || !content) {
                return;
            }

            root.dataset.tooltipReady = 'true';
            let hovered = false;
            let closeTimer;
            const position = () => {
                const anchor = trigger.getBoundingClientRect();
                const size = content.getBoundingClientRect();
                const next = tooltipPosition(anchor, size, {
                    width: window.innerWidth,
                    height: window.innerHeight,
                });

                content.style.position = 'fixed';
                content.style.left = `${next.left}px`;
                content.style.top = `${next.top}px`;
                content.style.transform = 'none';
                content.dataset.side = next.side;
                content.style.setProperty(
                    '--tooltip-arrow-y',
                    `${Math.max(16, Math.min(size.height - 16, (anchor.top + anchor.bottom) / 2 - next.top))}px`,
                );
            };
            const show = () => {
                clearTimeout(closeTimer);
                root.classList.remove('is-dismissed');
                position();
                root.classList.add('is-visible');
            };
            const hide = () => {
                clearTimeout(closeTimer);
                root.classList.remove('is-visible');
                root.classList.add('is-dismissed');
            };

            root.addEventListener('pointerenter', () => {
                hovered = true;
                show();
            });
            root.addEventListener('pointerleave', () => {
                hovered = false;
                if (!root.contains(document.activeElement)) {
                    closeTimer = setTimeout(hide, 180);
                }
            });
            root.addEventListener('focusin', show);
            root.addEventListener('focusout', (event) => {
                if (!root.contains(event.relatedTarget) && !hovered) {
                    hide();
                }
            });
            root.addEventListener('keydown', (event) => {
                if (event.key === 'Escape') {
                    hide();
                }
            });
            document.addEventListener('keydown', (event) => {
                if (event.key === 'Escape') {
                    hide();
                }
            });
            window.addEventListener('resize', () => {
                if (root.classList.contains('is-visible')) {
                    position();
                }
            });
            window.addEventListener(
                'scroll',
                (event) => {
                    if (!content.contains(event.target)) {
                        hide();
                    }
                },
                { capture: true, passive: true },
            );
        });
    }

    // === Application initialization ===

    let appInitialized = false;

    function init() {
        if (appInitialized) {
            return;
        }
        appInitialized = true;

        CustomSelect.initAll();
        tooltips();
        addresses();
        orders();
        orderDetails();
        account();
        reviews();
        news();
        faq();
        const navigation = header();

        searchFields();
        interactions();
        window.SearchController = new SearchController(navigation);
        sliders();
        window.FormController = new FormController();
        authDialogs();
        partsOrder();
        subscription();
        window.NotifyController = new NotifyController();
        maps();
        comparing();
        cart();
        productListing();
        productDetails();
        checkout();
        favorites();
    }

    // Start the application once the document is ready.
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
