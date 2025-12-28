"use strict";

$(function () {


    if (typeof Fancybox !== "undefined" && Fancybox !== null) {
        Fancybox.bind("[data-fancybox]", {});
    }



    /* =========== Event Handlers ============== */

    $(document).on("click", function (e) {
        const $target = $(e.target);


        // toggle active state favorite
        if ($target.closest('.favorite-btn').length) {
            $target.closest('.favorite-btn').toggleClass('active')
        }

        // toggle active compare btn
        if ($target.closest('.compare-btn').length) {
            $target.toggleClass('active')
        }

        // toggle active setting btn
        if ($target.closest('.setting-btn').length) {
            $target.toggleClass('active')
        }




    });

    // quantity block
    $('.quantity-block').each(function () {
        const $block = $(this);
        const $input = $block.find('.quantity-block__input');
        const $btnUp = $block.find('.quantity-block__up');
        const $btnDown = $block.find('.quantity-block__down');

        $btnUp.on('click', function () {
            let currentVal = parseInt($input.val()) || 0;
            if (currentVal < 9999) {
                $input.val(currentVal + 1);
            }
        });

        $btnDown.on('click', function () {
            let currentVal = parseInt($input.val()) || 0;
            if (currentVal > 1) {
                $input.val(currentVal - 1);
            }
        });

        $input.on('input', function () {
            let val = $input.val().replace(/\D/g, '');
            val = parseInt(val) || 1;
            if (val < 1) val = 1;
            if (val > 9999) val = 9999;
            $input.val(val);
        });


        $input.on('paste', function (e) {
            const pastedData = e.originalEvent.clipboardData.getData('text');
            if (/\D/.test(pastedData)) {
                e.preventDefault();
            }
        });
    });


    /**
    * @class CatalogController
    * @description Manages the header catalog visibility, multi-level mobile navigation, and UI states.
    */

    class CatalogController {
        constructor() {
            this.selectors = {
                catalog: '.header-catalog',
                toggler: '.header-catalog__toggler',
                content: '.header-catalog__content',
                itemParent: '.header-catalog__item--parent',
                moreBtn: '.header-catalog__more',
                backBtn: '.header-catalog__back',
                closeBtn: '.header-catalog__close',
                currentTitle: '.header-catalog__current',
                list: '.header-catalog__list',
                activeClass: 'active',
                visibleClass: 'visible',
                openSubmenuClass: 'open-submenu',
                listSubmenuOpenClass: 'submenu-opened',
                bodyClass: 'open-catalog-menu'
            };

            this.defaultTitle = 'Каталог';
            this.init();
        }

        init() {
            $(document).on('click', this.selectors.toggler, (e) => {
                e.stopPropagation();
                this.toggleCatalog();
            });

            $(document).on('click', this.selectors.closeBtn, () => {
                this.closeCatalog();
            });

            $(document).on('click', this.selectors.backBtn, (e) => {
                e.preventDefault();
                this.goBack();
            });

            $(document).on('click', (e) => {
                if (!$(e.target).closest(this.selectors.catalog).length) {
                    this.closeCatalog();
                }
            });

            $(document).on('click', this.selectors.moreBtn, (e) => {
                e.preventDefault();
                e.stopPropagation();

                const $item = $(e.target).closest(this.selectors.itemParent);
                this.openSubmenu($item);
            });
        }

        toggleCatalog() {
            const $toggler = $(this.selectors.toggler);
            const $content = $(this.selectors.content);
            const isOpening = !$content.hasClass(this.selectors.visibleClass);

            if (isOpening) {
                window.SearchController?.closeSearch();
                window.AuthController?.closeMenu();
                $('body').addClass(this.selectors.bodyClass);
            } else {
                $('body').removeClass(this.selectors.bodyClass);
            }

            $toggler.toggleClass(this.selectors.activeClass);
            $content.toggleClass(this.selectors.visibleClass);

            if (!isOpening) {
                this.resetToDefault();
            }
        }

        openSubmenu($item) {
            const submenuTitle = $item.find('> .header-catalog__link').text().trim();
            const $mainList = $(this.selectors.list);

            window.SearchController?.closeBar();

            $(this.selectors.itemParent).removeClass(this.selectors.openSubmenuClass);
            $item.addClass(this.selectors.openSubmenuClass);

            $mainList.addClass(this.selectors.listSubmenuOpenClass);
            $(this.selectors.currentTitle).text(submenuTitle);
        }

        goBack() {
            const $mainList = $(this.selectors.list);

            if ($mainList.hasClass(this.selectors.listSubmenuOpenClass)) {
                this.resetToDefault();
            } else {
                this.closeCatalog();
            }
        }

        resetToDefault() {
            $(this.selectors.itemParent).removeClass(this.selectors.openSubmenuClass);
            $(this.selectors.list).removeClass(this.selectors.listSubmenuOpenClass);
            $(this.selectors.currentTitle).text(this.defaultTitle);
        }

        closeCatalog() {
            $(this.selectors.toggler).removeClass(this.selectors.activeClass);
            $(this.selectors.content).removeClass(this.selectors.visibleClass);
            $('body').removeClass(this.selectors.bodyClass);
            this.resetToDefault();
        }
    }

    window.CatalogController = new CatalogController();

    /**
    * @class SearchController
    * @description Manages the search behavior, including mobile toggling, input results, and layout conflicts.
    */
    class SearchController {
        constructor() {
            this.selectors = {
                search: '.search',
                content: '.search__content',
                input: '.search__form-input',
                toggler: '.search__toggler',
                bar: '.search__bar',
                activeClass: 'active',
                visibleClass: 'visible'
            };

            this.init();
        }

        init() {
            $(document).on('click', this.selectors.toggler, (e) => {
                e.stopPropagation();
                this.toggleSearch();
            });

            $(document).on('input', this.selectors.input, (e) => {
                this.handleInput($(e.target));
            });

            $(document).on('focus', this.selectors.input, (e) => {
                this.handleInput($(e.target));
            });

            $(document).on('click', (e) => {
                if (!$(e.target).closest(this.selectors.search).length) {
                    this.closeSearch();
                }
            });

            $(document).on('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.closeSearch();
                }
            });
        }

        toggleSearch() {
            const $search = $(this.selectors.search);
            const $toggler = $(this.selectors.toggler);
            const $content = $(this.selectors.content);
            const isOpening = !$content.hasClass(this.selectors.activeClass);

            if (isOpening) {
                window.CatalogController?.closeCatalog();
            }

            $toggler.toggleClass(this.selectors.activeClass);
            $content.toggleClass(this.selectors.activeClass);

            if (isOpening) {
                setTimeout(() => {
                    $search.find(this.selectors.input).focus();
                }, 100);
            }
        }

        handleInput($input) {
            const query = $input.val().trim();
            const $bar = $input.closest(this.selectors.search).find(this.selectors.bar);

            if (query.length >= 1) {
                this.openBar($bar);
            } else {
                this.closeBar($bar);
            }
        }

        openBar($bar) {
            $bar.addClass(this.selectors.visibleClass);
        }

        closeBar($bar = $(this.selectors.bar)) {
            $bar.removeClass(this.selectors.visibleClass);
        }

        closeSearch() {
            $(this.selectors.toggler).removeClass(this.selectors.activeClass);
            $(this.selectors.content).removeClass(this.selectors.activeClass);
            this.closeBar();
        }
    }

    window.SearchController = new SearchController();


    /**
    * @class AuthController
    * @description Manages the user profile menu, including dropdowns, accordions with slide effects, and external interactions.
    */

    class AuthController {
        constructor() {
            this.selectors = {
                auth: '.header__auth',
                toggler: '.header__auth-btn, .person-menu-toggler',
                menu: '.header__person-menu',
                closeBtn: '.person-menu__close',
                block: '.person-menu__block',
                blockCaption: '.person-menu__block-caption',
                blockList: '.person-menu__block-list',
                activeClass: 'active',
                visibleClass: 'visible',
                bodyClass: 'open-person-menu'
            };

            this.init();
        }

        init() {
            $(document).on('click', this.selectors.toggler, (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggleMenu();
            });

            $(document).on('click', this.selectors.closeBtn, () => {
                this.closeMenu();
            });

            $(document).on('click', this.selectors.blockCaption, (e) => {
                const $caption = $(e.target).closest(this.selectors.blockCaption);
                const $block = $caption.closest(this.selectors.block);
                this.toggleAccordion($block, $caption);
            });

            $(document).on('click', (e) => {
                if (!$(e.target).closest(this.selectors.auth).length &&
                    !$(e.target).closest('.person-menu-toggler').length) {
                    this.closeMenu();
                }
            });

            $(document).on('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.closeMenu();
                }
            });
        }

        toggleMenu() {
            const $authBtn = $('.header__auth-btn');
            const $tabletBtn = $('.person-menu-toggler');
            const $menu = $(this.selectors.menu);
            const isOpening = !$menu.hasClass(this.selectors.visibleClass);

            if (isOpening) {
                window.CatalogController?.closeCatalog();
                window.SearchController?.closeSearch();
                $('body').addClass(this.selectors.bodyClass);
            } else {
                $('body').removeClass(this.selectors.bodyClass);
            }

            $authBtn.toggleClass(this.selectors.activeClass);
            $tabletBtn.toggleClass(this.selectors.activeClass);
            $menu.toggleClass(this.selectors.visibleClass);
        }

        closeMenu() {
            $('.header__auth-btn').removeClass(this.selectors.activeClass);
            $('.person-menu-toggler').removeClass(this.selectors.activeClass);
            $(this.selectors.menu).removeClass(this.selectors.visibleClass);
            $('body').removeClass(this.selectors.bodyClass);
            this.resetAccordions();
        }

        toggleAccordion($block, $caption) {
            const $list = $block.find(this.selectors.blockList);
            const $otherBlocks = $(this.selectors.block).not($block);
            const isActive = $caption.hasClass(this.selectors.activeClass);

            $otherBlocks.find(this.selectors.blockCaption).removeClass(this.selectors.activeClass);
            $otherBlocks.find(this.selectors.blockList).slideUp(300);

            if (!isActive) {
                $caption.addClass(this.selectors.activeClass);
                $list.stop().slideDown(300);
            } else {
                $caption.removeClass(this.selectors.activeClass);
                $list.stop().slideUp(300);
            }
        }

        resetAccordions() {
            $(this.selectors.blockCaption).removeClass(this.selectors.activeClass);
            $(this.selectors.blockList).hide();
        }
    }

    window.AuthController = new AuthController();

    // sliders

    /**
    * @class MobileSwiper
    * @param {string} sliderName
    * @param {Object} options
    * * @see https://swiperjs.com/get-started
    */

    class MobileSwiper {
        constructor(sliderName, options) {
            this.$slider = $(sliderName);
            this.options = options;
            this.init = false;
            this.swiper = null;

            if (this.$slider.length) {
                this.handleResize();
                $(window).on("resize", () => this.handleResize());
            }
        }

        handleResize() {
            if (window.innerWidth <= 767.98) {
                if (!this.init) {
                    this.init = true;
                    this.swiper = new Swiper(this.$slider[0], this.options);
                }
            } else if (this.init) {
                this.swiper.destroy();
                this.swiper = null;
                this.init = false;
            }
        }
    }

    if ($('.benefits__list')) {
        new MobileSwiper('.benefits__list .swiper', {
            spaceBetween: 20,
            navigation: {
                nextEl: '.benefits__next',
                prevEl: '.benefits__prev'
            },
            pagination: {
                el: '.benefits__pagination',
                clickable: true
            }
        })
    }

    if ($('.news__slider')) {
        new MobileSwiper('.news__slider .swiper', {
            spaceBetween: 20,
            navigation: {
                nextEl: '.news__next',
                prevEl: '.news__prev'
            },
            pagination: {
                el: '.news__pagination',
                clickable: true
            }
        })
    }

    if ($('.products__slider').length) {
        $('.products__slider').each(function (index, element) {
            const $container = $(element);
            const $slider = $container.find('.swiper');
            if (!$slider.length) return;

            const nextBtn = $container.find('.products__next')[0];
            const prevBtn = $container.find('.products__prev')[0];

            const isSmall = $container.hasClass('products__slider--small');

            const breakpoints = isSmall
                ? {
                    767.98: { slidesPerView: 3 },
                    991.98: { slidesPerView: 4 },
                    1199.98: { slidesPerView: 5 },
                    1419.98: { slidesPerView: 6 }
                }
                : {
                    767.98: { slidesPerView: 2 },
                    991.98: { slidesPerView: 3 },
                    1419.98: { slidesPerView: 4 }
                };

            new Swiper($slider[0], {
                slidesPerView: "auto",
                spaceBetween: 20,
                watchOverflow: true,
                navigation: {
                    nextEl: nextBtn,
                    prevEl: prevBtn
                },
                breakpoints: breakpoints
            });
        });
    }

    if ($('.news__slider')) {
        new Swiper('.news__slider .swiper', {

            slidesPerView: 1,
            spaceBetween: 20,
            watchOverflow: true,
            navigation: {
                nextEl: '.news__next',
                prevEl: '.news__prev'
            },
            pagination: {
                el: '.news__pagination',
                clickable: true
            },
            breakpoints: {
                575.98: {
                    slidesPerView: 1.5
                },
                767.98: {
                    slidesPerView: 2,
                },
                991.98: {
                    slidesPerView: 3,
                },
                1419.98: {
                    slidesPerView: 4,
                }
            }
        })
    }

    if ($('.promotions__grid')) {
        new MobileSwiper('.promotions__grid .swiper', {
            spaceBetween: 20,
            navigation: {
                nextEl: '.promotions__next',
                prevEl: '.promotions__prev'
            },
            pagination: {
                el: '.promotions__pagination',
                clickable: true
            }
        })
    }

    if ($('.sales__slider')) {
        new Swiper('.sales__slider .swiper', {

            slidesPerView: 1,
            spaceBetween: 20,
            watchOverflow: true,
            navigation: {
                nextEl: '.sales__next',
                prevEl: '.sales__prev'
            },
            pagination: {
                el: '.sales__pagination',
                clickable: true
            },
            breakpoints: {
                575.98: {
                    slidesPerView: 1.5
                },
                767.98: {
                    slidesPerView: 2,
                },
                991.98: {
                    slidesPerView: 3,
                },
                1419.98: {
                    slidesPerView: 4,
                }
            }
        })
    }


    /**
     * @class FormController
     * @description Class for managing form validation, phone masking, and error display.
     */
    class FormController {
        constructor() {
            this.selectors = {
                field: '.form__field',
                control: '.form__control',
                errorClass: '_error',
                errorMsg: '.form__error-message',
                requiredAttr: '[data-required]',
                submitBtn: '[type="submit"]'
            };

            this.messages = {
                empty: 'Поле обязательно для заполнения',
                tel: 'Введите корректный номер телефона',
                email: 'Введите корректный e-mail',
                checkbox: 'Необходимо ваше согласие'
            };

            this.init();
        }

        init() {
            $(document).on('submit', 'form', (e) => this.handleSubmit(e));

            $(document).on('input change', this.selectors.requiredAttr, (e) => {
                const $field = $(e.target);
                const $parent = $field.closest(this.selectors.field);

                if ($field.hasClass(this.selectors.errorClass) || $parent.hasClass(this.selectors.errorClass)) {
                    this.validateField($field);
                }
            });

            $(document).on('keydown', 'input[type="tel"]', (e) => this.onPhoneKeyDown(e));
            $(document).on('input', 'input[type="tel"]', (e) => this.onPhoneInput(e));
            $(document).on('paste', 'input[type="tel"]', (e) => this.onPhonePaste(e));
            $(document).on('focus', 'input[type="tel"]', (e) => {
                if (!e.target.value) {
                    e.target.value = "+7 ";
                }
            });
        }

        handleSubmit(e) {
            const $form = $(e.target);

            if (!this.validateForm($form)) {
                e.preventDefault();
                e.stopImmediatePropagation();
                return false;
            }
        }

        validateForm($form) {
            let isValid = true;
            const $requiredFields = $form.find(this.selectors.requiredAttr);

            $requiredFields.each((_, el) => {
                if (!this.validateField($(el))) {
                    isValid = false;
                }
            });

            return isValid;
        }

        validateField($field) {
            const value = $field.val().trim();
            let isError = false;
            let currentMsg = this.messages.empty;

            if ($field.attr('type') === 'tel') {
                if (value.replace(/\D/g, '').length < 11) {
                    isError = true;
                    currentMsg = this.messages.tel;
                }
            } else if ($field.attr('type') === 'email') {
                const emailReg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailReg.test(value)) {
                    isError = true;
                    currentMsg = this.messages.email;
                }
            } else if ($field.attr('type') === 'checkbox' || $field.attr('type') === 'radio') {
                if (!$field.prop('checked')) {
                    isError = true;
                    currentMsg = this.messages.checkbox;
                }
            } else {
                if (value === "") {
                    isError = true;
                    currentMsg = this.messages.empty;
                }
            }

            this.toggleErrorState($field, isError, currentMsg);
            return !isError;
        }

        toggleErrorState($field, isError, message) {
            const $parent = $field.closest(this.selectors.field);
            const $errorLabel = $parent.find(this.selectors.errorMsg);
            const target = $parent.length ? $parent : $field;

            if (isError) {
                target.addClass(this.selectors.errorClass);
                $field.addClass(this.selectors.errorClass);
                if ($errorLabel.length) {
                    $errorLabel.text(message).show();
                }
            } else {
                target.removeClass(this.selectors.errorClass);
                $field.removeClass(this.selectors.errorClass);
                if ($errorLabel.length) {
                    $errorLabel.hide();
                }
            }
        }

        onPhoneInput(e) {
            const input = e.target;
            let inputNumbersValue = input.value.replace(/\D/g, '');
            let formattedInputValue = "";
            const selectionStart = input.selectionStart;

            if (!inputNumbersValue) {
                return input.value = "";
            }

            if (input.value.length != selectionStart) {
                if (e.originalEvent.data && /\D/g.test(e.originalEvent.data)) {
                    input.value = inputNumbersValue;
                }
                return;
            }

            if (["7", "8", "9"].indexOf(inputNumbersValue[0]) > -1) {
                if (inputNumbersValue[0] == "9") inputNumbersValue = "7" + inputNumbersValue;
                let firstChar = "+7";
                formattedInputValue = firstChar + " (";
                if (inputNumbersValue.length > 1) {
                    formattedInputValue += inputNumbersValue.substring(1, 4);
                }
                if (inputNumbersValue.length >= 5) {
                    formattedInputValue += ") " + inputNumbersValue.substring(4, 7);
                }
                if (inputNumbersValue.length >= 8) {
                    formattedInputValue += "-" + inputNumbersValue.substring(7, 9);
                }
                if (inputNumbersValue.length >= 10) {
                    formattedInputValue += "-" + inputNumbersValue.substring(9, 11);
                }
            } else {
                formattedInputValue = "+" + inputNumbersValue.substring(0, 16);
            }

            input.value = formattedInputValue;
        }

        onPhoneKeyDown(e) {
            const inputValue = e.target.value.replace(/\D/g, '');
            if (e.keyCode == 8 && inputValue.length == 1) {
                e.target.value = "";
            }
        }

        onPhonePaste(e) {
            const input = e.target;
            const pasted = e.originalEvent.clipboardData || window.clipboardData;
            if (pasted) {
                const pastedText = pasted.getData('Text');
                if (/\D/g.test(pastedText)) {
                    input.value = input.value.replace(/\D/g, '');
                }
            }
        }
    }

    window.FormController = new FormController();


    /**
     * @class NotifyController
     * @description Class for managing shopping cart notifications.
     */
    class NotifyController {
        constructor() {
            this.containerSelector = '.notify-container';
            this.productSelector = '.product';
            this.btnSelector = '.add-to-cart-btn';
            this.displayTime = 4000;

            this.init();
        }

        init() {
            $(document).on('click', this.btnSelector, (e) => {
                const $btn = $(e.currentTarget);
                const $product = $btn.closest(this.productSelector);
                this.handleAddToCart($product);
            });
        }

        handleAddToCart($product) {
            const name = $product.find('.product__name').text().trim();
            const quantity = $product.find('.quantity-block__input').val() || 1;

            this.show(name, quantity);
        }

        show(name, quantity) {
            const $notify = $(`
            <div class="notify">
                <div class="notify__title title-sm">
                    Товар добавлен <span class="color-accent">в корзину</span>
                </div>
                <div class="notify__text">Добавлено: ${name} (${quantity} шт.)</div>
            </div>
        `);

            $(this.containerSelector).append($notify);

            $notify.hide().fadeIn(300);

            setTimeout(() => {
                $notify.fadeOut(300, function () {
                    $(this).remove();
                });
            }, this.displayTime);
        }
    }

    window.NotifyController = new NotifyController();



    class BaseFilter {
        constructor(element) {
            this.$el = $(element);
            this.$trigger = this.$el.find('.filter-dropdown__trigger');
            this.$text = this.$el.find('.filter-dropdown__text');
            this.$icon = this.$el.find('.filter-dropdown__icon');
            this.$body = this.$el.find('.filter-dropdown__body');
            this.$applyBtn = this.$el.find('.btn-apply');

            this.defaultText = this.$text.data('default');
            this.isApplied = false;

            this.init();
        }

        init() {
            this.$trigger.on('click', (e) => {
                if ($(e.target).hasClass('icon-cross') || $(e.target).closest('.icon-cross').length) {
                    e.stopPropagation();
                    this.reset();
                } else {
                    this.toggle();
                }
            });

            this.$applyBtn.on('click', () => {
                this.apply();
            });

            $(document).on('click', (e) => {
                if (!this.$el.is(e.target) && this.$el.has(e.target).length === 0) {
                    this.close();
                }
            });
        }

        toggle() {
            $('.filter-dropdown').not(this.$el).removeClass('active').find('.filter-dropdown__body').slideUp(200);

            this.$el.toggleClass('active');
            this.$body.slideToggle(200);
        }

        close() {
            this.$el.removeClass('active');
            this.$body.slideUp(200);
        }

        apply() {
            if (this.hasValue()) {
                this.isApplied = true;
                this.updateView();
                this.$icon.removeClass('icon-chevron-down').addClass('icon-cross');
                this.$el.addClass('is-selected');
            } else {
                this.reset();
            }
            this.close();
        }

        reset() {
            this.clearInputs();
            this.isApplied = false;
            this.$text.text(this.defaultText);
            this.$icon.removeClass('icon-cross').addClass('icon-chevron-down');
            this.$el.removeClass('is-selected');

            if (this.$el.hasClass('active')) {
                this.close();
            }
        }

        hasValue() {
            return false;
        }

        updateView() {
            // Override in subclass
        }

        clearInputs() {
            // Override in subclass
        }
    }

    class RadioFilter extends BaseFilter {
        hasValue() {
            return this.$el.find('input[type="radio"]:checked').length > 0;
        }

        updateView() {
            this.$text.text(`${this.defaultText} (1)`);
        }

        clearInputs() {
            this.$el.find('input[type="radio"]').prop('checked', false);
        }
    }

    class CheckboxFilter extends BaseFilter {
        hasValue() {
            return this.$el.find('input[type="checkbox"]:checked').length > 0;
        }

        updateView() {
            const count = this.$el.find('input[type="checkbox"]:checked').length;
            this.$text.text(`${this.defaultText} (${count})`);
        }

        clearInputs() {
            this.$el.find('input[type="checkbox"]').prop('checked', false);
        }
    }

    class RangeFilter extends BaseFilter {
        hasValue() {
            const min = this.$el.find('input[name="min_price"]').val();
            const max = this.$el.find('input[name="max_price"]').val();
            return min !== '' || max !== '';
        }

        updateView() {
            this.$text.text(this.defaultText);
        }

        clearInputs() {
            this.$el.find('input[type="number"]').val('');
        }
    }

    $(document).ready(function () {
        $('.filter-dropdown').each(function () {
            const type = $(this).data('type');

            switch (type) {
                case 'radio':
                    new RadioFilter(this);
                    break;
                case 'checkbox':
                    new CheckboxFilter(this);
                    break;
                case 'range':
                    new RangeFilter(this);
                    break;
            }
        });
    });

    // range slider

    const rangeFilters = $('.range');

    if (rangeFilters.length > 0) {
        rangeFilters.each(function () {
            const rangeSlider = $(this).find('.range__slider')[0];
            const startInput = $(this).find('.range__control--start');
            const endInput = $(this).find('.range__control--end');
            const inputs = [startInput, endInput];
            const form = $(this).closest('form');
            const resetButton = form.find('button[type="reset"]');
            const externalResetButton = $(`button[type="reset"][form="${form.attr('id')}"]`);
            const allResetButtons = $.merge(resetButton, externalResetButton);
            const min = parseInt(startInput.attr('min'));
            const max = parseInt(endInput.attr('max')) || 1000000;
            const margin = Math.round((max - min) * 0.05);



            function parseNumber(value) {
                return parseInt(value.replace(/\s/g, ''));
            }

            function updateMaxLength(input) {
                const maxLength = parseInt(input.attr('maxlength'));
                const numLength = maxLength - Math.floor((maxLength - 1) / 4);
                input.attr('maxlength', numLength);
            }

            function getTextWidth(text, input) {
                const span = document.createElement("span");
                const cs = window.getComputedStyle(input);
                span.style.position = "absolute";
                span.style.visibility = "hidden";
                span.style.whiteSpace = "nowrap";
                span.style.font = cs.font;
                span.style.letterSpacing = cs.letterSpacing;
                span.textContent = String(text || "");
                document.body.appendChild(span);
                const w = span.offsetWidth;
                document.body.removeChild(span);
                return w;
            }

            function updateUnitPosition(input) {
                const $input = $(input);
                const $units = $input.siblings(".range__unit");
                if ($units.length === 0) return;
                const cs = window.getComputedStyle(input);
                const value = $input.val();
                const textWidth = getTextWidth(value, input);
                const paddingLeft = parseFloat(cs.paddingLeft) || 0;
                const paddingRight = parseFloat(cs.paddingRight) || 0;
                const clientWidth = input.clientWidth;
                const contentWidth = Math.max(0, clientWidth - paddingLeft - paddingRight);
                let textStartX;
                const ta = cs.textAlign;
                if (ta === "center") {
                    textStartX = paddingLeft + Math.max(0, (contentWidth - textWidth) / 2);
                } else if (ta === "right" || ta === "end") {
                    textStartX = clientWidth - paddingRight - textWidth;
                } else {
                    textStartX = paddingLeft;
                }
                const gap = 4;
                const $currency = $units.last();
                const currencyWidth = $currency.outerWidth();
                const desiredCurrencyLeft = textStartX + textWidth + gap;
                const maxCurrencyLeft = clientWidth - paddingRight - currencyWidth;
                const currencyLeft = Math.min(desiredCurrencyLeft, maxCurrencyLeft);
                $currency.css("left", currencyLeft + "px");
                const $label = $units.first();
                const labelWidth = $label.outerWidth();
                let desiredLabelLeft = textStartX - labelWidth - gap;
                const minLabelLeft = paddingLeft;
                let labelLeft = Math.max(minLabelLeft, desiredLabelLeft);
                const labelRight = labelLeft + labelWidth;
                if (labelRight + gap > currencyLeft) {
                    labelLeft = Math.max(minLabelLeft, currencyLeft - labelWidth - gap);
                }
                $label.css("left", labelLeft + "px");
                $units.addClass("ready");
            }



            updateMaxLength(startInput);
            updateMaxLength(endInput);

            startInput.val(startInput.val());
            endInput.val(endInput.val());


            noUiSlider.create(rangeSlider, {
                start: [parseNumber(startInput.val()), parseNumber(endInput.val())],
                connect: true,
                margin: margin,
                range: {
                    'min': [min],
                    'max': [max]
                }
            });

            rangeSlider.noUiSlider.on('update', function (values, handle) {
                inputs[handle].val(Math.round(values[handle]));
                updateUnitPosition(inputs[handle][0]);
            });


            const setRangeSlider = (i, value) => {
                let arr = [null, null];
                arr[i] = parseNumber(value);
                rangeSlider.noUiSlider.set(arr);
            };

            $.each(inputs, function (index, input) {
                $(input).on('change', function (e) {
                    setRangeSlider(index, $(this).val());
                });
                $(input).on('input', function (e) {
                    let value = $(this).val();
                    value = value.replace(/[^\d]/g, '');
                    $(this).val(value);
                    $(this).addClass('active');
                });
                $(input).on('input change', function () {
                    updateUnitPosition(this);
                });
                updateUnitPosition(input[0]);
            });
            const ro = new ResizeObserver(() => {
                updateUnitPosition(startInput[0]);
                updateUnitPosition(endInput[0]);
            });
            ro.observe(startInput[0]);
            ro.observe(endInput[0]);
            if (allResetButtons.length > 0) {
                allResetButtons.on('click', function () {
                    setTimeout(function () {
                        startInput.val(startInput[0].defaultValue);
                        endInput.val(endInput[0].defaultValue);
                        rangeSlider.noUiSlider.set([parseNumber(startInput[0].defaultValue), parseNumber(endInput[0].defaultValue)]);
                    }, 0);
                });
            }
        });
    }


    /**
     * @function initScrollToTop
     * @description Manages the "scroll to top" button visibility and smooth scrolling behavior, 
     * resolving conflicts with CSS scroll-behavior.
     */
    const $arrowTop = $('.arrow-top');

    if ($arrowTop.length) {
        const $html = $('html');
        const scrollThreshold = 300;

        $(window).on('scroll', function () {
            if ($(window).scrollTop() > scrollThreshold) {
                $arrowTop.addClass('visible');
            } else {
                $arrowTop.removeClass('visible');
            }
        });

        $arrowTop.on('click', function () {
            const hasSmoothScroll = $html.css('scroll-behavior') === 'smooth';

            if (hasSmoothScroll) {
                $html.css('scroll-behavior', 'auto');
            }

            $('html, body').animate({
                scrollTop: 0
            }, 600, function () {
                if (hasSmoothScroll) {
                    $html.css('scroll-behavior', 'smooth');
                }
            });
        });
    }

    /**
     * @function initHeaderScroll
     * @description Manages header state on scroll to hide the top bar.
     */
    const $header = $('.header');
    if ($header.length) {

        const $window = $(window);
        const scrollThreshold = 100;

        $window.on('scroll', function () {
            const scrollTop = $window.scrollTop();

            if (scrollTop > scrollThreshold) {
                $header.addClass('scroll');
            } else if (scrollTop <= 10) {
                $header.removeClass('scroll');
            }
        });
    }


    /**
    * @function initMaps
    * @description Finds all uninitialized map blocks on the page and creates ymaps.Map objects.
    * Requires data-coords (string with coordinates separated by "; ") and data-placemark-logo.
    * @returns {void}
    */
    /**
 * @function initMaps
 * @description Initializes all map blocks on the page using Yandex Maps API.
 * Supports multiple maps, custom markers, and mobile behavior adjustments.
 * @returns {void}
 */
    function initMaps() {
        $('.map-block').each(function () {
            const $mapContainer = $(this);

            if ($mapContainer.hasClass('is-initialized')) return;

            const coordsData = $mapContainer.data('coords');
            const placemarkURL = $mapContainer.data('placemark-logo');

            if (!coordsData) return;

            const coordsArray = coordsData.split(',').map(item => parseFloat(item.trim()));

            const myMap = new ymaps.Map($mapContainer[0], {
                center: coordsArray,
                zoom: 16,
                controls: ['zoomControl']
            }, {
                suppressMapOpenBlock: true
            });

            const placemark = new ymaps.Placemark(coordsArray, {}, {
                iconLayout: 'default#image',
                iconImageHref: placemarkURL,
                iconImageSize: [40, 40],
                iconImageOffset: [-20, -20]
            });

            myMap.geoObjects.add(placemark);

            if (window.innerWidth < 768) {
                myMap.behaviors.disable('scrollZoom');
                myMap.behaviors.disable('drag');
            }

            $mapContainer.addClass('is-initialized');

            myMap.container.fitToViewport();

            window.addEventListener('resize', () => {
                myMap.container.fitToViewport();
            });
        });
    }

    (function loadYandexMaps() {
        if ($('.map-block').length) {
            if (typeof ymaps !== 'undefined') {
                ymaps.ready(initMaps);
            } else {
                const script = document.createElement("script");
                script.async = true;
                script.defer = true;
                script.src = "https://api-maps.yandex.ru/2.1/?lang=ru_RU";
                script.onload = () => ymaps.ready(initMaps);
                document.head.append(script);
            }
        }
    })();




});


