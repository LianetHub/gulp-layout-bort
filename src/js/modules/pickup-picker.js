import { deliveryMap } from './delivery-map.js';

export function pickupPicker(form) {
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
        block.querySelector('.checkout__pickup-title').textContent = 'Пункт выдачи Озон';
        block.querySelector('.checkout__pickup-description').hidden = true;
        block.querySelector('.checkout__pickup-selected').hidden = false;
        block.querySelector('.checkout__pickup-selected-title').textContent = input.dataset.address;
        block.querySelector('.checkout__pickup-hours').textContent =
            input.dataset.hours || 'Ежедневно, 09:00-22:00';
        trigger.querySelector('.checkout__pickup-button-text').textContent =
            'Изменить пункт выдачи';
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
        if (!addForm.reportValidity()) {
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
            input.dataset.hours = 'Ежедневно, 09:00-22:00';
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
