"use strict";

$(function () {


    if (typeof Fancybox !== "undefined" && Fancybox !== null) {
        Fancybox.bind("[data-fancybox]", {});
    }



    /* =========== Event Handlers ============== */

    $(document).on("click", function (e) {
        const $target = $(e.target);

        // Close the modal catalog on button click or outside click
        if ($target.is(".catalog__close") || (!$target.closest(".catalog").length && $(".catalog").hasClass("catalog--open"))) {
            $(".catalog").removeClass("catalog--open");
            $("body").removeClass("catalog-lock");
        }

        // Open the modal catalog when a user clicks the button
        if ($target.closest(".header__catalog").length) {
            $(".catalog").addClass("catalog--open");
            $("body").addClass("catalog-lock");
        }

        // Clear search input and hide the search bar within the modal catalog
        if ($target.closest(".catalog__search-reset").length) {
            $(".catalog__search-input").val("").trigger("input");
            $(".catalog__searchbar").removeClass("active");
        }

        // Handle tabs inside the modal catalog
        if ($target.closest(".catalog__categories-btn").length) {
            const $button = $target.closest(".catalog__categories-btn");
            const index = $button.parent().index();

            $(".catalog__categories-btn").removeClass("active");
            $button.addClass("active");

            $(".catalog__block").removeClass("active");
            $(".catalog__block").eq(index).addClass("active");
        }

        // Handle submenu logic
        if ($target.closest('.menu__btn').length) {
            const $parentItem = $target.closest('.menu__btn').parent();
            const isMobile = window.matchMedia("(max-width: 1300px)").matches;

            if (isMobile) {
                $parentItem.toggleClass('active');
                $parentItem.find('.submenu').slideToggle(300);
            } else {
                if ($parentItem.hasClass('active')) {
                    $parentItem.removeClass('active');
                } else {
                    $('.menu__item.active').removeClass('active');
                    $parentItem.addClass('active');
                }
            }
        }

        // Close all submenus when clicking outside the menu
        if (!$target.closest('.menu__btn').length && !$target.closest(".menu").length) {
            $('.menu__item.active').removeClass('active');
        }

        // Close all submenus when clicking outside the menu
        if (!$target.closest('.menu').length && !$target.closest('.icon-menu').length) {
            $('.menu__item.active').removeClass('active');
        }

        // Open/close the mobile menu
        if ($target.closest('.icon-menu').length) {
            $('.icon-menu').toggleClass("active");
            $('.menu').toggleClass("menu--open");
            $('body').toggleClass('menu-lock');
        }

        // Correctly close the mobile menu on outside click
        if ($(".menu").hasClass("menu--open") && !$target.closest(".menu").length && !$target.closest(".icon-menu").length) {
            $('.icon-menu').removeClass("active");
            $('.menu').removeClass("menu--open");
            $('body').removeClass('menu-lock');
        }

        // Close Fancybox (modal window) when clicking on the backdrop
        if ($target.is('.fancybox__backdrop')) {
            //    Fancybox.close();
            console.log('tatata');

        }

        // FAQ accordion logic
        if ($target.is('.faq__question')) {
            $target.toggleClass('active');
            $target.next().slideToggle();
        }

        // Catalog filter block accordion
        if ($target.closest('.filter__block-title').length) {
            const $title = $target.closest('.filter__block-title');
            const $content = $title.next('.filter__block-content');

            $title.toggleClass('active');
            $content.stop(true, true).slideToggle();
        }

        // toggle active state favorite
        if ($target.closest('.favorite-btn').length) {
            $target.closest('.favorite-btn').toggleClass('active')
        }

        // toggle active compare btn
        if ($target.closest('.compare-btn').length) {
            $target.toggleClass('active')
        }

        // add to cart btn
        if ($target.closest(".cart-btn").length) {
            const $button = $target.closest(".cart-btn");
            const $span = $button.find("span");

            $button.toggleClass("active");

            if ($button.hasClass("active")) {
                $span.text("в корзине");
            } else {
                $span.text("в корзину");
            }
        }

        // Close filter on button click or outside click
        if ($target.is(".filter__close") || (!$target.closest(".filter").length && $(".filter").hasClass("filter--open"))) {
            $(".filter").removeClass("filter--open");
            $("body").removeClass("filters-lock");
        }

        //  open filter on mobile directions
        if ($target.is('.shop__toggler-filters')) {
            $(".filter").addClass("filter--open");
            $("body").addClass("filters-lock");
        }

        // tabs on product page
        if ($target.is('.goods-item__tab')) {
            $('.goods-item__tab').removeClass('active');
            $target.addClass('active');
            $('.goods-item__tabs-content').removeClass('active');
            $('.goods-item__tabs-content').eq($target.parent().index()).addClass('active');
        }

        // fix anchor link to tab block
        if ($target.is('.goods-item__description-link')) {

            const targetId = $target.attr('href');
            const $targetContent = $(targetId);

            if ($targetContent.length) {
                const tabIndex = $targetContent.closest('.goods-item__tabs-content').index();
                $('.goods-item__tab').eq(tabIndex).trigger('click')

            }
        }

        // close notify block
        if ($target.is('.notify__close')) {
            $target.closest('.notify').addClass('hidden')
        }

        // close nav in article page on mobile
        if ($target.is('.article__sidebar-close') || (!$target.closest(".article__sidebar").length && $(".article__sidebar").hasClass("article__sidebar--open")) || $target.is('.sidebar__link')) {
            $('.article__sidebar').removeClass("article__sidebar--open");
            $('body').removeClass('article-lock')
        }



        // open nav in article page on mobile
        if ($target.is('.article__nav-btn')) {
            $('.article__sidebar').addClass("article__sidebar--open");
            $('body').addClass('article-lock')
        }
    });


    $(document).on("keydown", function (e) {
        if (e.key === "Escape" && $(".catalog").hasClass("catalog--open")) {
            $(".catalog").removeClass("catalog--open");
            $("body").removeClass("catalog-lock");
        }
    });

    // searchbar logic
    $(".catalog__search-input").on("input", function () {
        const query = $(this).val().toLowerCase();
        const $resetBtn = $(".catalog__search-reset");
        if (query.length > 0) {
            $resetBtn.addClass("active");
            $(".catalog__searchbar").addClass("active");
        } else {
            $resetBtn.removeClass("active");
            $(".catalog__searchbar").removeClass("active");
        }
    });



    // "grid" или "rows" в Каталоге

    $('.shop__grid-input').on('change', function () {
        const gridType = $(this).val();
        const $shopItems = $('.shop__items');

        if (gridType === 'rows') {
            $shopItems.addClass('shop__items--row');
        } else {
            $shopItems.removeClass('shop__items--row');
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

    /* =========== Event Handlers ============== */



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
            const $slider = $(element).find('.swiper');
            if (!$slider.length) return;

            const nextBtn = $(element).find('.products__next')[0];
            const prevBtn = $(element).find('.products__prev')[0];

            new Swiper($slider[0], {
                slidesPerView: 4,
                spaceBetween: 15,
                watchOverflow: true,
                navigation: {
                    nextEl: nextBtn,
                    prevEl: prevBtn
                }
            });

        });
    }

    if ($('.news__slider')) {
        new Swiper('.news__slider .swiper', {
            spaceBetween: 20,
            slidesPerView: 4,
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



    // Contacts Block Map
    if ($("#map").length) {
        ymaps.ready(function () {
            var coordinates = [55.83060906893058, 37.416250999999946];
            var myMap = new ymaps.Map('map', {
                center: coordinates,
                zoom: 16,
                controls: ['zoomControl']
            });
            var placemark = new ymaps.Placemark(coordinates, {}, {
                iconLayout: 'default#image',
                iconImageHref: 'img/placemark.svg',
                iconImageSize: [73, 97],
                iconImageOffset: [-36, -97]
            });
            myMap.geoObjects.add(placemark);
            if (window.innerWidth < 768) {
                myMap.behaviors.disable('scrollZoom');
                myMap.behaviors.disable('drag');
            }
            window.addEventListener('resize', function () {
                myMap.container.fitToViewport();
            });
        });
    }


    // custom select
    class CustomSelect {

        static openDropdown = null;

        constructor(selectElement) {
            this.$select = $(selectElement);
            this.placeholder = this.$select.data('placeholder');
            this.listCaption = this.$select.data('list-caption');
            this.defaultText = this.getDefaultText();
            this.selectName = this.$select.attr('name');
            this.$options = this.$select.find('option');
            this.$dropdown = null;
            this.initialState = {};
            this.init();
        }

        init() {
            if (!this.$select.length) return;
            this.saveInitialState();
            this.$select.addClass('hidden');
            this.renderDropdown();
            this.setupEvents();
        }

        saveInitialState() {
            const selectedOption = this.$select.find('option:selected');
            this.initialState = {
                selectedText: selectedOption.text(),
                selectedValue: selectedOption.val(),
            };
        }

        getDefaultText() {
            const selectedOption = this.$select.find('option[selected]');
            if (selectedOption.length) {
                return selectedOption.text();
            } else {
                return this.placeholder || this.$select.find('option:selected').text();
            }
        }

        renderDropdown() {
            const isDisabled = this.$select.is(':disabled');

            const buttonTemplate = `
            <button type="button" class="dropdown__button icon-chevron-down" 
                    aria-expanded="false" 
                    aria-haspopup="true" 
                    ${isDisabled ? 'disabled' : ''}>
                <span class="dropdown__button-text">${this.defaultText}</span>
            </button>
        `;

            this.$dropdown = $('<div>').addClass('dropdown');

            const captionTemplate = this.listCaption ? `<div class="dropdown__caption">${this.listCaption}</div>` : '';

            this.$dropdown.html(`
            ${buttonTemplate}
            <div class="dropdown__body" aria-hidden="true">
               <div class="dropdown__content">
                    ${captionTemplate}
                    <ul class="dropdown__list" role="listbox"></ul>
                </div>
            </div>
        `);

            const list = this.$dropdown.find('.dropdown__list');
            this.$options.each((index, option) => {
                const $option = $(option);
                const value = $option.val();
                const text = $option.text();
                const isSelected = $option.is(':selected');
                const isDisabled = $option.is(':disabled');

                const listItem = $('<li>')
                    .attr('role', 'option')
                    .data('value', value)
                    .attr('aria-checked', isSelected)
                    .addClass('dropdown__list-item')
                    .text(text);

                if (isSelected) listItem.addClass('selected');
                if (isDisabled) {
                    listItem.addClass('disabled');
                    listItem.attr('aria-disabled', 'true');
                }

                list.append(listItem);
            });

            this.$select.after(this.$dropdown);
        }

        setupEvents() {
            const button = this.$dropdown.find('.dropdown__button');
            button.on('click', (event) => {
                event.stopPropagation();
                const isOpen = this.$dropdown.hasClass('visible');
                this.toggleDropdown(!isOpen);
            });

            this.$dropdown.on('click', '.dropdown__list-item', (event) => {
                event.stopPropagation();
                const item = $(event.currentTarget);
                if (!item.hasClass('disabled')) {
                    this.selectOption(item);
                }
            });

            $(document).on('click', () => this.closeDropdown());
            $(document).on('keydown', (event) => {
                if (event.key === 'Escape') this.closeDropdown();
            });

            this.$select.closest('form').on('reset', () => this.restoreInitialState());
        }

        toggleDropdown(isOpen) {
            if (isOpen && CustomSelect.openDropdown && CustomSelect.openDropdown !== this) {
                CustomSelect.openDropdown.closeDropdown();
            }

            const body = this.$dropdown.find('.dropdown__body');
            const list = this.$dropdown.find('.dropdown__list');
            const hasScroll = list[0].scrollHeight > list[0].clientHeight;

            this.$dropdown.toggleClass('visible', isOpen);
            this.$dropdown.find('.dropdown__button').attr('aria-expanded', isOpen);
            body.attr('aria-hidden', !isOpen);

            if (isOpen) {
                CustomSelect.openDropdown = this;
                this.$dropdown.removeClass('dropdown-top');
                const dropdownRect = body[0].getBoundingClientRect();
                const viewportHeight = window.innerHeight;
                if (dropdownRect.bottom > viewportHeight) {
                    this.$dropdown.addClass('dropdown-top');
                }
                list.toggleClass('has-scroll', hasScroll);
            } else {
                if (CustomSelect.openDropdown === this) {
                    CustomSelect.openDropdown = null;
                }
            }
        }

        closeDropdown() {
            this.toggleDropdown(false);
        }

        selectOption(item) {
            const value = item.data('value');
            const text = item.text();

            this.$dropdown.find('.dropdown__list-item').removeClass('selected').attr('aria-checked', 'false');
            item.addClass('selected').attr('aria-checked', 'true');

            this.$dropdown.find('.dropdown__button').addClass('selected');
            this.$dropdown.find('.dropdown__button-text').text(text);
            this.$select.val(value).trigger('change');
            this.closeDropdown();
        }

        restoreInitialState() {
            const hasPlaceholder = this.placeholder !== undefined;

            if (hasPlaceholder) {
                this.$select.prop('selectedIndex', -1).trigger('change');
                this.$dropdown.find('.dropdown__button-text').text(this.placeholder);
                this.$dropdown.find('.dropdown__button').removeClass('selected');
                this.$dropdown.find('.dropdown__list-item').removeClass('selected').attr('aria-checked', 'false');
            } else {
                const state = this.initialState;
                this.$select.val(state.selectedValue).trigger('change');

                this.$dropdown.find('.dropdown__list-item').removeClass('selected').attr('aria-checked', 'false');

                const selectedItem = this.$dropdown.find(`.dropdown__list-item[data-value="${state.selectedValue}"]`);
                if (selectedItem.length) {
                    selectedItem.addClass('selected').attr('aria-checked', 'true');
                }

                this.$dropdown.find('.dropdown__button-text').text(state.selectedText);
                this.$dropdown.find('.dropdown__button').addClass('selected');
            }
        }

        syncSelectedOption() {
            const selectedOption = this.$select.find('option:selected');
            const selectedValue = selectedOption.val();
            const selectedText = selectedOption.text();

            this.$dropdown.find('.dropdown__list-item').removeClass('selected').attr('aria-checked', 'false');

            const selectedItem = this.$dropdown.find(`.dropdown__list-item[data-value="${selectedValue}"]`);
            selectedItem.addClass('selected').attr('aria-checked', 'true');

            this.$dropdown.find('.dropdown__button-text').text(selectedText);
        }
    }

    $('.select').each((index, element) => {
        new CustomSelect(element);
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


    // arrow top

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


});


