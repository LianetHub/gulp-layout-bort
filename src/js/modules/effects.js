const effects = new WeakMap();
const displays = new WeakMap();

export function show(element) {
    if (!element) return;
    cancelEffect(element);
    element.hidden = false;
    if (element.style.display === 'none') element.style.display = displays.get(element) || '';
    if (getComputedStyle(element).display === 'none') element.style.display = 'revert';
}

export function hide(element) {
    if (!element) return;
    cancelEffect(element);
    if (element.style.display !== 'none') displays.set(element, element.style.display);
    element.style.display = 'none';
}

function cancelEffect(element) {
    const running = effects.get(element);
    if (!running) return;
    effects.delete(element);
    clearTimeout(running.timer);
    running.animation.cancel();
    element.style.overflow = running.overflow;
}

function animateVisibility(element, opening, duration, slide, callback) {
    if (!element) return;
    const running = effects.get(element);
    if (running?.opening === opening) return;
    const visible = getComputedStyle(element).display !== 'none' && !element.hidden;
    if (!running && visible === opening) return;
    const current = getComputedStyle(element);
    const from = slide ? {
        height: `${element.getBoundingClientRect().height}px`,
        paddingTop: current.paddingTop, paddingBottom: current.paddingBottom,
        marginTop: current.marginTop, marginBottom: current.marginBottom
    } : { opacity: current.opacity };
    show(element);
    const style = getComputedStyle(element);
    const expanded = slide ? {
        height: `${element.getBoundingClientRect().height}px`,
        paddingTop: style.paddingTop, paddingBottom: style.paddingBottom,
        marginTop: style.marginTop, marginBottom: style.marginBottom
    } : { opacity: style.opacity };
    // Animate border-box height without changing the component's box sizing.
    if (slide && style.boxSizing !== 'border-box') {
        for (const frame of [from, expanded]) {
            frame.height = `${Math.max(0, parseFloat(frame.height) - parseFloat(frame.paddingTop) - parseFloat(frame.paddingBottom) - parseFloat(style.borderTopWidth) - parseFloat(style.borderBottomWidth))}px`;
        }
    }
    const collapsed = slide ? { height: '0px', paddingTop: '0px', paddingBottom: '0px', marginTop: '0px', marginBottom: '0px' } : { opacity: 0 };
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
    const overflow = element.style.overflow;
    if (slide) element.style.overflow = 'hidden';
    const animation = element.animate([running || visible ? from : collapsed, opening ? expanded : collapsed], {
        duration, easing: 'ease', fill: 'both'
    });
    const state = { animation, overflow, opening };
    effects.set(element, state);
    const complete = () => {
        if (effects.get(element) !== state) return;
        effects.delete(element);
        clearTimeout(state.timer);
        animation.cancel();
        element.style.overflow = overflow;
        finish();
    };
    // Background tabs can suspend the animation timeline; keep logical state timely.
    state.timer = setTimeout(complete, duration);
    animation.finished.then(complete, () => {});
}

export const slide = (element, opening, duration = 300, callback) => animateVisibility(element, opening, duration, true, callback);
export const fade = (element, opening, duration = 300, callback) => animateVisibility(element, opening, duration, false, callback);
export function toggleSlide(element, duration = 300, callback) {
    if (!element) return;
    const opening = effects.get(element)?.opening ?? (!element.hidden && getComputedStyle(element).display !== 'none');
    slide(element, !opening, duration, callback);
}

export function scrollToPosition(top) {
    window.scrollTo({ top, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
}
