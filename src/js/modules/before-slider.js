export const beforeSlider = () => {

    const sliders = document.querySelectorAll('.before-slider');
    if (sliders.length === 0) return;

    sliders.forEach(slider => {
        const sliderInput = slider.querySelector('.before-slider__input');
        const foreground = slider.querySelector('.before-slider__after');
        const sliderBtn = slider.querySelector('.before-slider__button');

        ["input", "change"].forEach((type) => {
            sliderInput.addEventListener(type, (e) => {
                const sliderPos = e.target.value;

                foreground.style.setProperty('--value', `${sliderPos}%`);
                sliderBtn.style.left = `calc(${sliderPos}% - ${sliderBtn.getBoundingClientRect().width / 2}px)`;
            });
        });
    })

}