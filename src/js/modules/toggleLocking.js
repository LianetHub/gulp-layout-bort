export function toggleLocking(lockClass) {

    const body = document.body;
    let className = lockClass ? lockClass : "lock";
    let pagePosition;

    if (body.classList.contains(className)) {
        pagePosition = parseInt(document.body.dataset.position, 10);
        body.dataset.position = pagePosition;
        body.style.top = -pagePosition + 'px';
    } else {
        pagePosition = window.scrollY;
        body.style.top = 'auto';
        window.scroll({ top: pagePosition, left: 0 });
        document.body.removeAttribute('data-position');
    }

    let lockPaddingValue = body.classList.contains(className)
        ? "0px"
        : window.innerWidth -
        document.querySelector(".wrapper").offsetWidth +
        "px";

    body.style.paddingRight = lockPaddingValue;
    body.classList.toggle(className);

}