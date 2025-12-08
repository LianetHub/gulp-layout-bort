export const animation = () => {

    const sections = document.querySelectorAll('[data-animate]');

    sections.forEach(section => {

        const callback = function (entries, observer) {
            if (entries[0].isIntersecting) {
                if (section.dataset.animate == "number" && !section.classList.contains('animated')) {
                    counter(section);
                }
                section.classList.add('animated');
            } else {

            }
        };

        const companyObserver = new IntersectionObserver(callback);
        companyObserver.observe(section);

    });


    function counter(counter) {
        let countFinish = +counter.innerText;
        counter.innerText = "0";
        const updateCounter = () => {
            const target = countFinish;
            const count = +counter.innerText;
            const increment = target / 20;
            if (count < target) {
                counter.innerText = `${Math.ceil(count + increment)}`;
                setTimeout(updateCounter, 30);
            } else counter.innerText = target;
        };
        updateCounter();
    }


    // function numberWithCommas(x) {
    //     return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    // }

}