import { select } from './modules/select.js';
import { partsOrder } from './modules/parts-order.js';
import { reviews } from './modules/review.js';
import { faq } from './modules/faq.js';
import { news } from './modules/news.js';
import { header } from './modules/header.js';
import { CatalogController } from './modules/catalog.js';
import { SearchController } from './modules/search.js';
import { AuthController } from './modules/auth.js';
import { sliders } from './modules/sliders.js';
import { FormController, subscription } from './modules/forms.js';
import { filters } from './modules/filters.js';
import { rangeFilters } from './modules/range.js';
import { interactions, NotifyController } from './modules/interactions.js';
import { maps } from './modules/maps.js';
import { compare } from './modules/compare.js';
import { cart } from './modules/cart.js';

function init() {
    select();
    reviews();
    news();
    faq();
    const navigation = header();
    interactions();
    window.CatalogController = new CatalogController();
    window.SearchController = new SearchController(navigation);
    window.AuthController = new AuthController();
    sliders();
    window.FormController = new FormController();
    partsOrder();
    subscription();
    window.NotifyController = new NotifyController();
    filters();
    rangeFilters();
    maps();
    compare();
    cart();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
else init();
