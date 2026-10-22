import { slide, toggleSlide } from './effects.js';

// Explicit helpers for legacy callers; native element prototypes remain untouched.
export default function initSlideToggle() {
    return {
        slideToggle: (element, duration = 400, callback) => toggleSlide(element, duration, callback),
        slideUp: (element, duration = 400, callback) => slide(element, false, duration, callback),
        slideDown: (element, duration = 400, callback) => slide(element, true, duration, callback)
    };
}
