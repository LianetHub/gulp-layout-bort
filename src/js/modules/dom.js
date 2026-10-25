// Layout-based visibility also accounts for elements hidden by a parent or CSS.
export const isVisible = (element) =>
    Boolean(
        element && (element.offsetWidth || element.offsetHeight || element.getClientRects().length),
    );

// Pass the matched element explicitly: native currentTarget remains the listener root.
export function delegate(root, type, selector, callback) {
    root.addEventListener(type, (event) => {
        const element = event.target?.closest?.(selector);

        if (element && root.contains(element)) {
            callback(event, element);
        }
    });
}
