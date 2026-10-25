const initialized = new WeakSet();
const animations = new WeakMap();

export const faq = () => {
    document.querySelectorAll('.faq__item').forEach((item) => {
        const summary = item.querySelector('.faq__question');

        if (!summary || initialized.has(item)) {
            return;
        }

        initialized.add(item);

        summary.addEventListener('click', (event) => {
            event.preventDefault();
            const previous = animations.get(item);
            const opening = previous ? !previous.opening : !item.open;
            const height = item.getBoundingClientRect().height;
            const overflow = previous?.overflow ?? item.style.overflow;

            if (previous) {
                animations.delete(item);
                clearTimeout(previous.timer);
                previous.animation.cancel();
            }

            if (!item.animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                item.open = opening;
                item.style.overflow = overflow;

                return;
            }

            item.open = true;
            const css = getComputedStyle(item);
            const target = opening
                ? item.getBoundingClientRect().height
                : summary.getBoundingClientRect().height +
                  parseFloat(css.borderTopWidth) +
                  parseFloat(css.borderBottomWidth);

            item.style.overflow = 'hidden';
            const animation = item.animate([{ height: `${height}px` }, { height: `${target}px` }], {
                duration: 300,
                easing: 'ease',
                fill: 'both',
            });
            const state = {
                animation,
                opening,
                overflow,
            };

            animations.set(item, state);
            const finish = () => {
                if (animations.get(item) !== state) {
                    return;
                }

                animations.delete(item);
                clearTimeout(state.timer);
                item.open = opening;
                animation.cancel();
                item.style.overflow = overflow;
            };

            // Background tabs can suspend the animation timeline.
            state.timer = setTimeout(finish, 300);
            animation.finished.then(finish, () => {});
        });
    });
};
