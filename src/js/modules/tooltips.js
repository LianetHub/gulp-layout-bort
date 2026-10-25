export function tooltipPosition(anchor, size, viewport) {
    const gap = 12;
    const margin = 8;
    let side = 'right';
    let left = anchor.right + gap;
    let top = (anchor.top + anchor.bottom - size.height) / 2;

    if (left + size.width > viewport.width - margin) {
        side = 'left';
        left = anchor.left - gap - size.width;
        if (left < margin) {
            side = anchor.bottom + gap + size.height <= viewport.height - margin ? 'bottom' : 'top';
            left = (anchor.left + anchor.right - size.width) / 2;
            top = side === 'bottom' ? anchor.bottom + gap : anchor.top - gap - size.height;
        }
    }

    return {
        left: Math.max(margin, Math.min(left, viewport.width - size.width - margin)),
        top: Math.max(margin, Math.min(top, viewport.height - size.height - margin)),
        side,
    };
}

export function tooltips(scope = document) {
    scope.querySelectorAll('.tooltip').forEach((root) => {
        if (root.dataset.tooltipReady) {
            return;
        }

        const trigger = root.querySelector('.tooltip__trigger');
        const content = root.querySelector('.tooltip__content');

        if (!trigger || !content) {
            return;
        }

        root.dataset.tooltipReady = 'true';
        let hovered = false;
        let closeTimer;
        const position = () => {
            const anchor = trigger.getBoundingClientRect();
            const size = content.getBoundingClientRect();
            const next = tooltipPosition(anchor, size, {
                width: window.innerWidth,
                height: window.innerHeight,
            });

            content.style.position = 'fixed';
            content.style.left = `${next.left}px`;
            content.style.top = `${next.top}px`;
            content.style.transform = 'none';
            content.dataset.side = next.side;
            content.style.setProperty(
                '--tooltip-arrow-y',
                `${Math.max(16, Math.min(size.height - 16, (anchor.top + anchor.bottom) / 2 - next.top))}px`,
            );
        };
        const show = () => {
            clearTimeout(closeTimer);
            root.classList.remove('is-dismissed');
            position();
            root.classList.add('is-visible');
        };
        const hide = () => {
            clearTimeout(closeTimer);
            root.classList.remove('is-visible');
            root.classList.add('is-dismissed');
        };

        root.addEventListener('pointerenter', () => {
            hovered = true;
            show();
        });
        root.addEventListener('pointerleave', () => {
            hovered = false;
            if (!root.contains(document.activeElement)) {
                closeTimer = setTimeout(hide, 180);
            }
        });
        root.addEventListener('focusin', show);
        root.addEventListener('focusout', (event) => {
            if (!root.contains(event.relatedTarget) && !hovered) {
                hide();
            }
        });
        root.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                hide();
            }
        });
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                hide();
            }
        });
        window.addEventListener('resize', () => {
            if (root.classList.contains('is-visible')) {
                position();
            }
        });
        window.addEventListener(
            'scroll',
            (event) => {
                if (!content.contains(event.target)) {
                    hide();
                }
            },
            { capture: true, passive: true },
        );
    });
}
