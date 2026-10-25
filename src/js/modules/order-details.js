export function orderDetails() {
    const root = document.querySelector('[data-order-details]');
    if (!root || root.dataset.initialized) return;
    root.dataset.initialized = 'true';
    const status = root.querySelector('.order-details__announcement');
    root.querySelector('[data-copy-order]').addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText('2504-477215-77804');
            status.textContent = 'Номер заказа скопирован';
        } catch {
            status.textContent = 'Не удалось скопировать номер заказа. Выделите его и скопируйте вручную.';
        }
    });
    root.querySelectorAll('[data-order-action]').forEach(button => {
        button.addEventListener('click', () => {
            const notice = root.querySelector('.order-details__notice');
            notice.hidden = false;
            notice.textContent = button.dataset.orderAction === 'pay'
                ? 'Онлайн-оплата станет доступна после подключения платёжного сервиса.'
                : 'Для отмены заказа свяжитесь с нами: +7 (499) 705-79-79.';
        });
    });
}
