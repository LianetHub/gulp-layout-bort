"use strict";

$(function () {

    // preloader
    if ($('.preloader').length > 0) {
        let counting = setInterval(function () {
            let loader = $('#percentage');
            let currval = parseInt(loader.text());

            if (currval < 90) {
                loader.text(++currval);
            } else if (currval < 95 && document.readyState === "interactive") {
                loader.text(95);
            } else if (currval < 99 && document.readyState === "complete") {
                loader.text(99);
            }

            if (currval >= 99 && document.readyState === "complete") {
                clearInterval(counting);
                loader.text(100);
                setTimeout(function () {
                    $('body').removeClass('preloading').addClass('is-loaded');
                }, 300);
            }
        }, 20);
    }

    if (typeof Fancybox !== "undefined" && Fancybox !== null) {
        Fancybox.bind("[data-fancybox]", {
            dragToClose: false,
            closeButton: false,
            closeClick: "outside",

        });
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


    // form submit validation

    function initFormValidation($form) {
        $form.on('submit', function (e) {
            let isValid = true;

            $form.find('[data-required]').each(function () {
                const $input = $(this);
                const inputType = $input.attr('type');
                const inputName = $input.attr('name');

                $input.removeClass('_error');
                $input.parent().removeClass('_error');

                if (inputType === 'checkbox' && !$input.is(':checked')) {
                    $input.addClass('_error');
                    isValid = false;
                } else if (inputName === 'phone' && !phoneTest($input.val())) {
                    $input.addClass('_error');
                    isValid = false;
                } else if (inputName === 'email' && !emailTest($input.val())) {
                    $input.addClass('_error');
                    isValid = false;
                } else if ($input.val().trim() === '') {
                    $input.addClass('_error');
                    isValid = false;
                }
            });

            if (!isValid) {
                e.preventDefault();
            }
        });

        $form.find('[data-required]').on('input change', function () {
            const $input = $(this);
            const inputType = $input.attr('type');
            const inputName = $input.attr('name');

            if (inputType === 'checkbox') {
                if ($input.is(':checked')) {
                    $input.removeClass('_error');
                }
            } else if (inputName === 'phone') {
                if (phoneTest($input.val())) {
                    $input.removeClass('_error');
                }
            } else if (inputName === 'email') {
                if (emailTest($input.val())) {
                    $input.removeClass('_error');
                }
            } else {
                if ($input.val().trim() !== '') {
                    $input.removeClass('_error');
                }
            }
        });
    }

    // Запуск для всех форм
    $('form').each(function () {
        initFormValidation($(this));
    });

    function emailTest(email) {
        const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(String(email).toLowerCase());
    }

    function phoneTest(phone) {
        const cleaned = phone.replace(/\D/g, '');
        return cleaned.length >= 10 && /^[1-9]\d{9,14}$/.test(cleaned);
    }


    // Display filter block in Сatalog if title is active
    $('.filter__block-title.active').each(function () {
        const $title = $(this);
        const $content = $title.next('.filter__block-content');
        $content.slideDown(0);
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
            if (currentVal < 999) {
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
            if (val > 999) val = 999;
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


    // floating Labels
    $('.form__field > .form__control').on('input blur focus change keyup mouseup', function () {
        if ($(this).val().length > 0) {
            $(this).addClass('_input');
        } else {
            $(this).removeClass('_input');
        }
    }).each(function () {
        if ($(this).val().length > 0) {
            $(this).addClass('_input');
        }
    });

    $('.form__field > .form__control').on('animationstart', function (e) {
        if (e.originalEvent.animationName === 'onAutoFillStart' || e.originalEvent.animationName === 'onAutoFillCancel') {
            $(this).addClass('_input');
        }
    });


    // sliders

    // Extend Class for Swiper.js add wrap progress

    class SwiperWithProgress {
        constructor(selector, options) {
            this.selector = selector;
            this.options = options;
            this.init();
        }

        init() {
            if ($(this.selector).length) {
                new Swiper(this.selector, {
                    ...this.options,
                    speed: 800,
                    autoplay: {
                        delay: 8000,
                        stopOnLastSlide: false,
                    },
                    pagination: {
                        el: this.options.paginationEl,
                        type: "fraction",
                        formatFractionCurrent: (number) => {
                            return number < 10 ? '0' + number : number;
                        },
                        formatFractionTotal: (number) => {
                            return number < 10 ? '0' + number : number;
                        },
                        renderFraction: (currentClass, totalClass) => {
                            return '<span class="' + currentClass + '"></span>' +
                                ' <span class="swiper-pagination-progress"></span> ' +
                                '<span class="' + totalClass + '"></span>';
                        }
                    },
                    on: {
                        init: (swiper) => {
                            const progressEl = swiper.pagination.el.querySelector('.swiper-pagination-progress');
                            let speed = swiper.params.speed;
                            let autoplaySpeed = swiper.params.autoplay.delay;
                            progressEl.style.setProperty('--counting-speed', ((speed + autoplaySpeed) / 1000) + 's');
                            progressEl.classList.add('counting');
                        },
                        slideChangeTransitionStart: (swiper) => {
                            const progressEl = swiper.pagination.el.querySelector('.swiper-pagination-progress');
                            progressEl.classList.remove('counting');
                            void progressEl.offsetWidth;
                            progressEl.classList.add('counting');
                        }
                    }
                });
            }
        }
    }

    if ($('.promo__slider').length) {
        new SwiperWithProgress('.promo__slider', {
            slidesPerView: 1,
            effect: "fade",
            fadeEffect: {
                crossFade: true
            },
            navigation: {
                prevEl: '.promo__controls-prev',
                nextEl: '.promo__controls-next'
            },
            paginationEl: '.promo__pagination'
        });
    }

    if ($('.promo__categories').length) {
        new Swiper('.promo__categories', {
            slidesPerView: 1,
            speed: 800,
            loop: true,
            autoplay: {
                delay: 2000,
                stopOnLastSlide: false,
            },
        })
    }

    if ($('.offers__slider').length) {
        new Swiper('.offers__slider', {
            slidesPerView: 1,
            watchOverflow: true,
            autoHeight: true,
            navigation: {
                nextEl: '.offers__next',
                prevEl: '.offers__prev'
            },
        })
    }

    if ($('.goods__slider').length) {
        new Swiper('.goods__slider', {
            slidesPerView: "auto",
            spaceBetween: 24,
            watchOverflow: true,
            navigation: {
                nextEl: '.goods__next',
                prevEl: '.goods__prev'
            },
            breakpoints: {
                1661.98: {
                    slidesPerView: 4,
                },
                1819.98: {
                    slidesPerView: 5,
                }
            }
        })
    }

    if ($('.catalog__block').length) {
        $('.catalog__block').each(function (index, element) {

            const $block = $(element);
            const slider = $block.find('.catalog__block-slider')[0];
            const nextBtn = $block.find('.catalog__block-next')[0];
            const prevBtn = $block.find('.catalog__block-prev')[0];

            new Swiper(slider, {
                slidesPerView: "auto",
                spaceBetween: 16,
                watchOverflow: true,
                navigation: {
                    nextEl: nextBtn,
                    prevEl: prevBtn
                },

            })
        })

    }

    if ($('.reviews__slider').length) {
        new SwiperWithProgress('.reviews__slider', {
            spaceBetween: 8,
            watchOverflow: true,
            autoHeight: true,
            navigation: {
                nextEl: '.reviews__next',
                prevEl: '.reviews__prev'
            },
            paginationEl: '.reviews__pagination',
            breakpoints: {
                767.98: {
                    slidesPerView: 2,
                    spaceBetween: 16,
                    autoHeight: false
                },
                1399.98: {
                    slidesPerView: 3,
                    spaceBetween: 20,
                    autoHeight: false
                },
                1661.98: {
                    slidesPerView: 4,
                    spaceBetween: 24,
                    autoHeight: false
                }
            }
        })
    }

    if ($('.review__images').length) {
        $('.review__images').each(function (index, element) {
            new Swiper(element, {
                slidesPerView: "auto",
                spaceBetween: 8,
                watchOverflow: true,
            })
        })
    }

    if ($('.gallery__slider').length) {
        new SwiperWithProgress('.gallery__slider', {
            slidesPerView: 1,
            spaceBetween: 180,

            watchOverflow: true,
            effect: 'coverflow',
            coverflowEffect: {
                rotate: 0,
                stretch: 10,
                depth: 120,
                modifier: 1,
                slideShadows: false,
            },
            navigation: {
                nextEl: '.gallery__next',
                prevEl: '.gallery__prev'
            },
            paginationEl: '.gallery__pagination',

        })

    }

    if ($('.nav-slider').length) {

        new Swiper('.nav-slider', {
            slidesPerView: "auto",
            spaceBetween: 4,
            initialSlide: $('.nav-slider__item .nav-slider__link.active').parent().index()
        })
    }

    if ($('.blog__slider').length) {
        if (window.innerWidth > 767.98) {

            new Swiper('.blog__slider', {
                slidesPerView: 1,
                spaceBetween: 24,
                watchOverflow: true,
                navigation: {
                    nextEl: '.blog__next',
                    prevEl: '.blog__prev'
                },
                breakpoints: {
                    767.98: {
                        slidesPerView: 3,
                    },
                    1199.98: {
                        slidesPerView: 3,
                    },
                    1661.98: {
                        slidesPerView: 4,
                    },
                }
            })
        }
    }

    if ($('.article__slider').length) {
        $('.article__slider').each(function (index, element) {

            const $slider = $(element);
            const nextBtn = $slider.find('.article__next')[0];
            const prevBtn = $slider.find('.article__prev')[0];
            const pagination = $slider.find('.article__pagination')[0];

            new SwiperWithProgress($slider[0], {
                slidesPerView: 1,
                watchOverflow: true,
                navigation: {
                    nextEl: nextBtn,
                    prevEl: prevBtn
                },
                paginationEl: pagination,

            })
        })

    }

    if ($('.shop__brands-slider').length) {
        new Swiper('.shop__brands-slider', {
            slidesPerView: "auto",
            spaceBetween: 24,
            watchOverflow: true,
            navigation: {
                nextEl: '.shop__brands-next',
                prevEl: '.shop__brands-prev'
            },
            breakpoints: {
                767.98: {
                    spaceBetween: 42,
                },
            }
        })
    }

    if ($('.shop__categories').length) {
        new Swiper('.shop__categories', {
            slidesPerView: "auto",
            spaceBetween: 16,
            watchOverflow: true,

        })

    }

    if ($('.shop-item').length) {
        $('.shop-item').each(function (index, element) {
            const $slider = $(element).find('.shop-item__slider');
            if (!$slider.length) return;

            const pagination = $(element).find('.shop-item__pagination')[0];

            const swiper = new Swiper($slider[0], {
                slidesPerView: 1,
                speed: 0,
                lazy: true,
                watchOverflow: true,
                pagination: {
                    el: pagination,
                    clickable: true
                }
            });

            const $areasWrapper = $('<div class="shop-item__hover-areas"></div>');
            $areasWrapper.css({
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                zIndex: 10
            });

            const slidesCount = swiper.slides.length;

            for (let i = 0; i < slidesCount; i++) {
                const $area = $('<div class="shop-item__hover-area"></div>');
                $area.css({
                    flex: '1 1 0',
                    cursor: 'pointer'
                });

                $area.on('mouseenter', () => {
                    swiper.slideTo(i);
                });

                $areasWrapper.append($area);
            }


            $slider.css('position', 'relative').append($areasWrapper);
        });
    }

    if ($('.goods-item__slider').length) {


        const thumbsSlider = new Swiper('.goods-item__thumbs', {
            slidesPerView: "auto",
            spaceBetween: 8,
            breakpoints: {
                767.98: {
                    spaceBetween: 12,
                }
            }
        })


        const mainSwiper = new Swiper('.goods-item__main-slider', {
            slidesPerView: 1,
            speed: 0,
            watchOverflow: true,
            thumbs: {
                swiper: thumbsSlider
            }
        });


        const $areasWrapper = $('<div class="good-item__hover-areas"></div>');
        $areasWrapper.css({
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            zIndex: 10
        });

        const slidesCount = mainSwiper.slides.length;

        for (let i = 0; i < slidesCount; i++) {
            const $area = $('<div class="good-item__hover-area"></div>');
            $area.css({
                flex: '1 1 0',
                cursor: 'pointer'
            });

            $area.on('mouseenter', () => {
                mainSwiper.slideTo(i);
            });

            $areasWrapper.append($area);
        }


        $('.goods-item__main-slider').css('position', 'relative').append($areasWrapper);
    }

    if ($('.shop__slider').length) {

        if (window.innerWidth > 767.98) {
            new SwiperWithProgress('.shop__slider-block', {
                spaceBetween: 8,
                watchOverflow: true,
                slidesPerView: "auto",
                navigation: {
                    nextEl: '.shop__next',
                    prevEl: '.shop__prev'
                },
                paginationEl: '.shop__slider-pagination',
                breakpoints: {
                    767.98: {
                        spaceBetween: 16
                    },
                    1399.98: {
                        spaceBetween: 20,
                    },
                    1661.98: {
                        spaceBetween: 32,
                    }
                }
            })
        }
    }


    // amination

    // benefits image animation

    const benefitsSection = $('.benefits');
    if (benefitsSection.length) {

        const benefitsLists = $('.benefits__list');
        const benefitsPicture = $('.benefits__picture');

        // image rotation animation

        const maxRotation = 8;
        const isMobile = window.matchMedia("(max-width: 768px)").matches;

        benefitsSection.on('mousemove', function (e) {
            if (!isMobile) {
                const width = benefitsSection.width();
                const height = benefitsSection.height();
                const left = benefitsSection.offset().left;
                const top = benefitsSection.offset().top;
                const mouseX = e.pageX - left - width / 2;
                const mouseY = e.pageY - top - height / 2;
                const rotateY = (mouseX / (width / 2)) * maxRotation;
                const rotateX = (mouseY / (height / 2)) * -maxRotation;
                benefitsPicture.css('transform', `
            perspective(1000px) 
            rotateX(${rotateX}deg) 
            rotateY(${rotateY}deg)
        `);
            }
        });

        benefitsSection.on('mouseleave', function () {
            if (!isMobile) {
                benefitsPicture.css('transform', `
            perspective(1000px)
            rotateX(0deg) 
            rotateY(0deg)
        `);
            }
        });

        benefitsLists.each(function () {
            const startValue = $(this).attr('start');
            if (startValue) {
                $(this).css('--start-num', parseInt(startValue) - 1);
            }
        });

        if (isMobile) {
            const firstItem = benefitsLists.find('.benefits__item').first();
            firstItem.addClass('active');
            firstItem.find('.benefits__item-description').slideDown(150);
        }

        benefitsSection.on('pointerenter', '.benefits__item', function (event) {
            if (event.pointerType === 'mouse') {
                const currentItem = $(this);
                const currentDescription = currentItem.find('.benefits__item-description');
                $('.benefits__item').removeClass('active');
                currentItem.addClass('active');
                $('.benefits__item-description').not(currentDescription).stop().slideUp(150);
                currentDescription.stop().slideDown(150);
            }
        });

        benefitsLists.on('pointerleave', '.benefits__item', function (event) {
            if (event.pointerType === 'mouse') {
                const currentDescription = $(this).find('.benefits__item-description');
                $(this).removeClass('active');
                currentDescription.stop().slideUp(150);
            }
        });

        benefitsSection.on('click', '.benefits__item', function (e) {
            e.preventDefault();
            const currentItem = $(this);
            const currentDescription = currentItem.find('.benefits__item-description');
            if (currentItem.hasClass('active')) {
                currentItem.removeClass('active');
                currentDescription.stop().slideUp(300);
            } else {
                $('.benefits__item').removeClass('active');
                currentItem.addClass('active');
                $('.benefits__item-description').not(currentDescription).stop().slideUp(300);
                currentDescription.stop().slideDown(300);
            }
        });
    }


    // animation on scroll
    const $sections = $('[data-animate]');
    if ($sections.length) {
        $sections.each(function () {
            const $section = $(this);

            const callback = function (entries, observer) {
                if (entries[0].isIntersecting) {
                    if ($section.data('animate') === "number" && !$section.hasClass('animated')) {
                        counter($section);
                    }
                    $section.addClass('animated');
                    setTimeout(() => {
                        $section.addClass('animation-end');
                    }, 600)
                }
            };

            const observer = new IntersectionObserver(callback);
            observer.observe(this);
        });

        function counter($counter) {
            let countFinish = parseInt($counter.text(), 10);
            $counter.text("0");

            const updateCounter = () => {
                const target = countFinish;
                const count = parseInt($counter.text(), 10);
                const increment = Math.ceil(target / 20);

                if (count + increment < target) {
                    $counter.text(count + increment);
                    setTimeout(updateCounter, 100);
                } else {
                    $counter.text(target);
                }
            };
            updateCounter();
        }
    }


    // Phone Russia Mask

    var phoneInputs = document.querySelectorAll('input[type="tel"]');
    var getInputNumbersValue = function (input) {
        return input.value.replace(/\D/g, '');
    };
    var onPhonePaste = function (e) {
        var input = e.target,
            inputNumbersValue = getInputNumbersValue(input);
        var pasted = e.clipboardData || window.clipboardData;
        if (pasted) {
            var pastedText = pasted.getData('Text');
            if (/\D/g.test(pastedText)) {
                input.value = inputNumbersValue;
                return;
            }
        }
    };
    var onPhoneInput = function (e) {
        var input = e.target,
            inputNumbersValue = getInputNumbersValue(input),
            selectionStart = input.selectionStart,
            formattedInputValue = "";
        if (!inputNumbersValue) {
            return input.value = "";
        }
        if (input.value.length != selectionStart) {
            if (e.data && /\D/g.test(e.data)) {
                input.value = inputNumbersValue;
            }
            return;
        }
        if (inputNumbersValue.length > 11) {
            inputNumbersValue = inputNumbersValue.substring(0, 11);
        }
        formattedInputValue = "+7 (";
        if (inputNumbersValue.length >= 2) {
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
        input.value = formattedInputValue;
    };
    var onPhoneKeyDown = function (e) {
        var inputValue = e.target.value.replace(/\D/g, '');
        if (e.keyCode == 8 && inputValue.length == 1) {
            e.target.value = "";
        }
    };
    for (var phoneInput of phoneInputs) {
        phoneInput.addEventListener('focus', function () {
            if (!this.value) {
                this.value = "+7 ";
            }
        });
        phoneInput.addEventListener('keydown', onPhoneKeyDown);
        phoneInput.addEventListener('input', onPhoneInput, false);
        phoneInput.addEventListener('paste', onPhonePaste, false);
    }


    // Function for handling dynamic adaptation
    class DynamicAdapt {
        constructor(type) {
            this.type = type;
            this.оbjects = [];
            this.daClassname = "_dynamic_adapt_";
            this.nodes = $('[data-da]');
        }

        init() {
            // Populate the objects array
            this.nodes.each((i, node) => {
                const $node = $(node);
                const data = $node.data('da').trim();
                const dataArray = data.split(",");
                const оbject = {};
                оbject.element = $node;
                оbject.parent = $node.parent();
                оbject.destination = $(dataArray[0].trim());
                оbject.breakpoint = dataArray[1] ? dataArray[1].trim() : "767";
                оbject.place = dataArray[2] ? dataArray[2].trim() : "last";
                оbject.index = this.indexInParent(оbject.parent, оbject.element);
                this.оbjects.push(оbject);
            });

            this.arraySort(this.оbjects);

            // Array of unique media queries
            this.mediaQueries = this.оbjects.map(item => {
                return `(${this.type}-width: ${item.breakpoint}px),${item.breakpoint}`;
            }).filter((item, index, self) => {
                return self.indexOf(item) === index;
            });

            // Attach listener to media query and call handler on first load
            this.mediaQueries.forEach(media => {
                const mediaSplit = media.split(',');
                const matchMedia = window.matchMedia(mediaSplit[0]);
                const mediaBreakpoint = mediaSplit[1];

                // Array of objects with matching breakpoint
                const objectsFilter = this.оbjects.filter(item => {
                    return item.breakpoint === mediaBreakpoint;
                });

                matchMedia.addListener(() => {
                    this.mediaHandler(matchMedia, objectsFilter);
                });
                this.mediaHandler(matchMedia, objectsFilter);
            });
        }

        mediaHandler(matchMedia, оbjects) {
            if (matchMedia.matches) {
                оbjects.forEach(оbject => {
                    оbject.index = this.indexInParent(оbject.parent, оbject.element);
                    this.moveTo(оbject.place, оbject.element, оbject.destination);
                });
            } else {
                оbjects.forEach(оbject => {
                    if (оbject.element.hasClass(this.daClassname)) {
                        this.moveBack(оbject.parent, оbject.element, оbject.index);
                    }
                });
            }
        }

        // Move function
        moveTo(place, element, destination) {
            element.addClass(this.daClassname);
            if (place === 'last' || place >= destination.children().length) {
                destination.append(element);
            } else if (place === 'first') {
                destination.prepend(element);
            } else {
                destination.children().eq(place).before(element);
            }
        }

        // Return function
        moveBack(parent, element, index) {
            element.removeClass(this.daClassname);
            if (parent.children().eq(index).length) {
                parent.children().eq(index).before(element);
            } else {
                parent.append(element);
            }
        }

        // Get index within parent
        indexInParent(parent, element) {
            const parentChildren = parent.children();
            return parentChildren.index(element);
        }

        // Sort array by breakpoint and place
        arraySort(arr) {
            if (this.type === "min") {
                arr.sort((a, b) => a.breakpoint - b.breakpoint || a.place - b.place);
            } else {
                arr.sort((a, b) => b.breakpoint - a.breakpoint || b.place - a.place);
            }
        }
    }

    const da = new DynamicAdapt("max");
    da.init();


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

    // order form validation

    function validateStep($step) {
        let isValid = true;

        $step.find("[data-required]").each(function () {
            const $field = $(this);
            const value = $field.val().trim();

            if (!value) {
                isValid = false;
                return;
            }

            if ($field.attr("type") === "email") {
                const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailPattern.test(value)) {
                    isValid = false;
                }
            }

            if ($field.attr("type") === "tel") {
                const phonePattern = /^[0-9\-\+\(\)\s]{5,20}$/;
                if (!phonePattern.test(value)) {
                    isValid = false;
                }
            }
        });

        const $radioGroups = $step.find("input[type=radio]").map(function () {
            return $(this).attr("name");
        }).get();

        const uniqueGroups = [...new Set($radioGroups)];

        uniqueGroups.forEach(function (name) {
            if ($step.find(`input[name="${name}"]`).length) {
                if (!$step.find(`input[name="${name}"]:checked`).length) {
                    isValid = false;
                }
            }
        });

        return isValid;
    }

    function checkSteps() {
        let allValid = true;

        $(".order__step").each(function (index) {
            const $step = $(this);
            const $next = $(".order__step").eq(index + 1);

            if (validateStep($step)) {
                $step.addClass("order__step--done");
                if ($next.length) {
                    $next.removeClass("hidden");
                }
            } else {
                $step.removeClass("order__step--done");
                if ($next.length) {
                    $next.addClass("hidden");
                }
                allValid = false;
            }
        });

        const $btn = $(".order__form button[type=submit]");
        const $notifyWarning = $(".order__form-notify--warning");
        const $notifySuccess = $(".order__form-notify--success");

        if (allValid) {
            $btn.prop("disabled", false);
            $notifyWarning.addClass("hidden");
            $notifySuccess.removeClass("hidden");
        } else {
            $btn.prop("disabled", true);
            $notifyWarning.removeClass("hidden");
            $notifySuccess.addClass("hidden");
        }
    }

    $(document).on("input change", ".order__step input, .order__step textarea", function () {
        checkSteps();
    });

    checkSteps();
});


