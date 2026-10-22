export function rangeFilters() {
    document.querySelectorAll('.range').forEach(range => {
        const slider = range.querySelector('.range__slider');
        const start = range.querySelector('.range__control--start');
        const end = range.querySelector('.range__control--end');
        if (!slider || !start || !end || slider.noUiSlider || typeof noUiSlider === 'undefined') return;
        const inputs = [start, end];
        const min = parseInt(start.getAttribute('min'));
        const max = parseInt(end.getAttribute('max')) || 1000000;
        const parseNumber = value => parseInt(value.replace(/\s/g, ''));

        function getTextWidth(text, input) {
            const span = document.createElement('span');
            const style = getComputedStyle(input);
            Object.assign(span.style, { position: 'absolute', visibility: 'hidden', whiteSpace: 'nowrap', font: style.font, letterSpacing: style.letterSpacing });
            span.textContent = String(text || '');
            document.body.append(span);
            const width = span.offsetWidth;
            span.remove();
            return width;
        }

        function updateUnitPosition(input) {
            const units = [...input.parentElement.children].filter(element => element.matches('.range__unit'));
            if (!units.length) return;
            const style = getComputedStyle(input);
            const width = getTextWidth(input.value, input);
            const left = parseFloat(style.paddingLeft) || 0;
            const right = parseFloat(style.paddingRight) || 0;
            const contentWidth = Math.max(0, input.clientWidth - left - right);
            let x = left;
            if (style.textAlign === 'center') x += Math.max(0, (contentWidth - width) / 2);
            else if (['right', 'end'].includes(style.textAlign)) x = input.clientWidth - right - width;
            const currency = units[units.length - 1];
            const currencyLeft = Math.min(x + width + 4, input.clientWidth - right - currency.getBoundingClientRect().width);
            currency.style.left = `${currencyLeft}px`;
            const label = units[0];
            const labelWidth = label.getBoundingClientRect().width;
            let labelLeft = Math.max(left, x - labelWidth - 4);
            if (labelLeft + labelWidth + 4 > currencyLeft) labelLeft = Math.max(left, currencyLeft - labelWidth - 4);
            label.style.left = `${labelLeft}px`;
            units.forEach(unit => unit.classList.add('ready'));
        }

        inputs.forEach(input => {
            const length = parseInt(input.getAttribute('maxlength'));
            if (Number.isFinite(length)) input.setAttribute('maxlength', length - Math.floor((length - 1) / 4));
        });
        noUiSlider.create(slider, {
            start: inputs.map(input => parseNumber(input.value)), connect: true,
            margin: Math.round((max - min) * 0.05), range: { min: [min], max: [max] }
        });
        slider.noUiSlider.on('update', (values, handle) => {
            inputs[handle].value = Math.round(values[handle]);
            updateUnitPosition(inputs[handle]);
        });
        inputs.forEach((input, index) => {
            input.addEventListener('change', () => {
                const values = [null, null];
                values[index] = parseNumber(input.value);
                slider.noUiSlider.set(values);
                updateUnitPosition(input);
            });
            input.addEventListener('input', () => {
                input.value = input.value.replace(/[^\d]/g, '');
                input.classList.add('active');
                updateUnitPosition(input);
            });
            updateUnitPosition(input);
        });
        if (typeof ResizeObserver !== 'undefined') {
            const observer = new ResizeObserver(() => inputs.forEach(updateUnitPosition));
            inputs.forEach(input => observer.observe(input));
        }
        // The reset event also covers external buttons associated through form="id".
        range.closest('form')?.addEventListener('reset', event => setTimeout(() => {
            if (event.defaultPrevented) return;
            inputs.forEach(input => { input.value = input.defaultValue; });
            slider.noUiSlider.set(inputs.map(input => parseNumber(input.defaultValue)));
        }, 0));
    });
}
