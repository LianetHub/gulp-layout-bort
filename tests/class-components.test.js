import test from 'node:test';
import assert from 'node:assert/strict';
import { loadApp } from './helpers/app.js';

function mapForm() {
    const listeners = new Map();
    const container = { hidden: true, dataset: { mapCenter: '55,37' } };
    const toggle = {
        attributes: {},
        setAttribute(name, value) { this.attributes[name] = value; },
        addEventListener(type, callback) { listeners.set(type, callback); },
    };
    const status = { hidden: true, textContent: '' };
    const elements = { city: { value: '' }, street: { value: '' } };
    return {
        form: {
            elements,
            querySelector(selector) {
                return {
                    '.address-picker__map': container,
                    '.address-picker__map-toggle': toggle,
                    '.address-picker__map-status': status,
                }[selector];
            },
        },
        container, toggle, status, elements,
        click: () => listeners.get('click')(),
    };
}

test('delivery maps isolate loading and reset state and ignore stale geocoding', async () => {
    const { DeliveryMap, MapLoader } = loadApp(['DeliveryMap', 'MapLoader']);
    const maps = [];
    const requests = [];
    const api = {
        Map: class {
            constructor() {
                this.events = { add: (type, callback) => { this.click = callback; } };
                this.geoObjects = { removeAll() {}, add() {} };
                this.container = { fitToViewport() {} };
                maps.push(this);
            }
        },
        Placemark: class {},
        geocode: () => new Promise(resolve => requests.push(resolve)),
    };
    MapLoader.loadMaps = async () => api;
    const first = mapForm();
    const second = mapForm();
    const firstMap = new DeliveryMap().init(first.form);
    new DeliveryMap().init(second.form);
    await Promise.all([first.click(), second.click()]);
    assert.equal(maps.length, 2);

    const firstResult = maps[0].click({ get: () => [55, 37] });
    const secondResult = maps[1].click({ get: () => [56, 38] });
    // Passing reset as a callback must retain its component instance.
    const reset = firstMap.reset;
    reset();
    const result = city => ({ geoObjects: { get: () => ({
        getLocalities: () => [city],
        getThoroughfare: () => 'Улица',
        getPremiseNumber: () => '1',
    }) } });
    requests[0](result('Первый город'));
    requests[1](result('Второй город'));
    await Promise.all([firstResult, secondResult]);
    assert.equal(first.container.hidden, true);
    assert.equal(first.toggle.attributes['aria-expanded'], 'false');
    assert.equal(first.elements.city.value, '');
    assert.equal(second.container.hidden, false);
    assert.equal(second.elements.city.value, 'Второй город');
    assert.equal(second.elements.street.value, 'Улица, 1');
});

test('concurrent map consumers share the same service readiness request', async () => {
    const { MapLoader } = loadApp(['MapLoader']);
    let complete;
    let readyCalls = 0;
    globalThis.ymaps = { ready(callback) { readyCalls++; complete = callback; } };
    try {
        const first = MapLoader.loadMaps();
        const second = MapLoader.loadMaps();
        assert.equal(first, second);
        assert.equal(readyCalls, 1);
        complete();
        assert.equal(await first, globalThis.ymaps);
        assert.equal(await second, globalThis.ymaps);
    } finally {
        delete globalThis.ymaps;
    }
});
