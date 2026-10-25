const effects = new WeakMap();
const displays = new WeakMap();

export function show(element) {
    if (!element) {
        return;
    }

    cancelEffect(element);
    element.hidden = false;
    if (element.style.display === 'none') {
        element.style.display = displays.get(element) || '';
    }
    if (getComputedStyle(element).display === 'none') {
        element.style.display = 'revert';
    }
}

export function hide(element) {
    if (!element) {
        return;
    }

    cancelEffect(element);
    if (element.style.display !== 'none') {
        displays.set(element, element.style.display);
    }
    element.style.display = 'none';
}

function cancelEffect(element) {
    const running = effects.get(element);

    if (!running) {
        return;
    }

    effects.delete(element);
    clearTimeout(running.timer);
    running.animation.cancel();
}

function animateVisibility(element, opening, duration, callback) {
    if (!element) {
        return;
    }

    const running = effects.get(element);

    if (running?.opening === opening) {
        return;
    }

    const visible = getComputedStyle(element).display !== 'none' && !element.hidden;

    if (!running && visible === opening) {
        return;
    }

    const current = getComputedStyle(element);
    const from = { opacity: current.opacity };

    show(element);
    const style = getComputedStyle(element);
    const expanded = { opacity: style.opacity };
    const collapsed = { opacity: 0 };
    const finish = () => {
        if (!opening) {
            hide(element);
            element.hidden = true;
        }
        callback?.call(element);
    };

    if (!element.animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        finish();

        return;
    }
    const animation = element.animate(
        [running || visible ? from : collapsed, opening ? expanded : collapsed],
        {
            duration,
            easing: 'ease',
            fill: 'both',
        },
    );
    const state = { animation, opening };

    effects.set(element, state);
    const complete = () => {
        if (effects.get(element) !== state) {
            return;
        }

        effects.delete(element);
        clearTimeout(state.timer);
        animation.cancel();
        finish();
    };

    // Background tabs can suspend the animation timeline; keep logical state timely.
    state.timer = setTimeout(complete, duration);
    animation.finished.then(complete, () => {});
}

export const fade = (element, opening, duration = 300, callback) =>
    animateVisibility(element, opening, duration, callback);

const slides = new WeakMap();
export function slide(element, opening, duration = 300) {
    if (!element) {
        return;
    }

    const previous = slides.get(element);

    if (previous?.opening === opening) {
        return;
    }

    const visible = !element.hidden && getComputedStyle(element).display !== 'none';

    if (!previous && visible === opening) {
        return;
    }

    const measure = () => {
        const css = getComputedStyle(element);
        return {
            height: element.getBoundingClientRect().height + 'px',
            paddingTop: css.paddingTop,
            paddingBottom: css.paddingBottom,
            marginTop: css.marginTop,
            marginBottom: css.marginBottom,
            borderTopWidth: css.borderTopWidth,
            borderBottomWidth: css.borderBottomWidth,
        };
    };
    const collapsed = {
        height: '0px',
        paddingTop: '0px',
        paddingBottom: '0px',
        marginTop: '0px',
        marginBottom: '0px',
        borderTopWidth: '0px',
        borderBottomWidth: '0px',
    };
    const from = visible ? measure() : collapsed;
    const original = previous?.original || {
        overflow: element.style.overflow,
        boxSizing: element.style.boxSizing,
    };

    if (previous) {
        slides.delete(element);
        clearTimeout(previous.timer);
        previous.animation.cancel();
    }
    element.hidden = false;
    element.style.boxSizing = 'border-box';
    const expanded = measure();
    const finish = () => {
        element.hidden = !opening;
        element.style.overflow = original.overflow;
        element.style.boxSizing = original.boxSizing;
    };

    if (!element.animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        finish();

        return;
    }
    element.style.overflow = 'hidden';
    const animation = element.animate([from, opening ? expanded : collapsed], {
        duration,
        easing: 'ease',
        fill: 'both',
    });
    const state = {
        animation,
        original,
        opening,
    };

    slides.set(element, state);
    const complete = () => {
        if (slides.get(element) !== state) {
            return;
        }

        slides.delete(element);
        clearTimeout(state.timer);
        animation.cancel();
        finish();
    };

    state.timer = setTimeout(complete, duration);
    animation.finished.then(complete, () => {});
}

export function scrollToPosition(top) {
    window.scrollTo({
        top,
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
            ? 'instant'
            : 'smooth',
    });
}
