// Preserve behavioral fixtures' entry names while exercising the class APIs.
const entries = {
    describeAddress: 'AddressPicker.describeAddress',
    comparisonRows: 'ComparisonController.comparisonRows',
    calculateCart: 'CartController.calculateCart',
    validateFieldValue: 'AuthDialogs.validateFieldValue',
    savePickup: 'PickupState.savePickup',
    removePickup: 'PickupState.removePickup',
    filterPickups: 'PickupState.filterPickups',
    tooltipPosition: 'Tooltip.tooltipPosition',
    normalizeQuantity: 'InteractionsController.normalizeQuantity',
    loadMaps: 'MapLoader.loadMaps',
    faq: 'FaqController.initAll',
    favorites: 'FavoritesController.initAll',
    productGalleries: 'ProductGallery.initAll',
    tooltips: 'Tooltip.initAll',
    cart: 'CartController.initAll',
    comparing: 'ComparisonController.initAll',
    checkout: '(...args) => new CheckoutController().init(...args)',
    interactions: '(...args) => new InteractionsController().init(...args)',
    productDetails: '(...args) => new ProductDetailsController().init(...args)',
    sliders: '(...args) => new SlidersController().init(...args)',
};

export function classExports(names) {
    return names.map((name) => `${name}: ${Object.hasOwn(entries, name) ? entries[name] : name}`).join(', ');
}
