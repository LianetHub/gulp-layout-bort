import { deliveryMap } from './delivery-map.js';

export function describeAddress(address) {
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

export function addressPicker(form) {
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
                            ? form.querySelector('.checkout__selected-address .checkout__change')
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
        if (!addForm.reportValidity()) {
            return;
        }

        const address = Object.fromEntries(
            addressFields.map((name) => [name, addForm.elements[name].value.trim()]),
        );

        if (!address.city || !address.street) {
            const field = addForm.elements[address.city ? 'street' : 'city'];

            field.value = '';
            field.reportValidity();

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
