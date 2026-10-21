export const paginationItems = (totalPages, currentPage, visibleItems = 7) => {
    if (totalPages <= visibleItems) return Array.from({ length: totalPages }, (_, index) => index + 1);
    const pages = new Set([1, totalPages]);
    const windowSize = Math.max(1, visibleItems - 4);
    const start = Math.max(2, Math.min(currentPage - Math.floor(windowSize / 2), totalPages - windowSize));
    const end = Math.min(totalPages - 1, start + windowSize - 1);
    for (let page = start; page <= end; page++) pages.add(page);
    const result = [];
    [...pages].sort((a, b) => a - b).forEach(page => {
        const previous = result[result.length - 1];
        if (previous && page - previous > 1) result.push('…');
        result.push(page);
    });
    return result;
};

export class Pagination {
    constructor(element, { totalPages = 1, onChange = () => {} } = {}) {
        this.element = element;
        this.pages = element.querySelector('.pagination__pages');
        this.previous = element.querySelector('.pagination__prev');
        this.next = element.querySelector('.pagination__next');
        this.totalPages = Math.max(1, totalPages);
        this.currentPage = 1;
        this.onChange = onChange;
        this.media = window.matchMedia('(min-width: 575.98px)');
        this.media.addEventListener('change', () => this.render());
        element.addEventListener('click', event => {
            const button = event.target.closest('button');
            if (!button || button.disabled) return;
            if (button === this.previous) this.setPage(this.currentPage - 1);
            else if (button === this.next) this.setPage(this.currentPage + 1);
            else if (button.dataset.page) this.setPage(Number(button.dataset.page));
        });
        this.render();
    }

    setPage(page, notify = true) {
        if (!Number.isFinite(page)) return;
        const nextPage = Math.max(1, Math.min(this.totalPages, Math.trunc(page)));
        const changed = nextPage !== this.currentPage;
        this.currentPage = nextPage;
        this.render();
        if (notify && changed) this.onChange(this.currentPage);
    }

    render() {
        this.pages.replaceChildren();
        paginationItems(this.totalPages, this.currentPage, this.media.matches ? 7 : 5).forEach(page => {
            const item = document.createElement(page === '…' ? 'span' : 'button');
            item.className = 'pagination__item';
            item.textContent = String(page);
            if (page !== '…') {
                item.type = 'button';
                item.dataset.page = String(page);
                item.setAttribute('aria-label', `Страница ${page}`);
                if (page === this.currentPage) {
                    item.classList.add('active');
                    item.setAttribute('aria-current', 'page');
                }
            }
            this.pages.append(item);
        });
        this.previous.disabled = this.currentPage === 1;
        this.next.disabled = this.currentPage === this.totalPages;
    }
}
