import { account } from './modules/account.js';
import { addresses } from './modules/addresses.js';
import { orders } from './modules/orders.js';
import { orderDetails } from './modules/order-details.js';
import { partsOrder } from './modules/parts-order.js';
import { reviews } from './modules/review.js';
import { faq } from './modules/faq.js';
import { news } from './modules/news.js';
import { header } from './modules/header.js';
import { SearchController } from './modules/search.js';
import { authDialogs } from './modules/auth-dialogs.js';
import { sliders } from './modules/sliders.js';
import { FormController, subscription } from './modules/forms.js';
import { interactions, NotifyController } from './modules/interactions.js';
import { maps } from './modules/maps.js';
import { comparing } from './modules/comparing.js';
import { cart } from './modules/cart.js';
import { productListing } from './modules/product-listing.js';
import { productDetails } from './modules/product-details.js';
import { favorites } from './modules/favorites.js';
import { checkout } from './modules/checkout.js';
import { searchFields } from './modules/search-fields.js';
import { initCustomSelects } from './modules/select.js';
import { tooltips } from './modules/tooltips.js';

function init() {
    initCustomSelects();
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

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
    init();
}
