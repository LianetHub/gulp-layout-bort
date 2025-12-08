export const floatingLabels = () => {

    let floatingInputs = document.querySelectorAll('.form__field > .form__input, .form__field > .form__textarea');


    floatingInputs.forEach(input => {
        checkEmpty(input);

        input.addEventListener('input', e => {
            checkEmpty(e.target);
        });
        input.addEventListener('blur', e => {
            checkEmpty(e.target);
        });
        input.addEventListener('focus', e => {
            checkEmpty(e.target);
        });
        input.addEventListener('change', e => {
            checkEmpty(e.target);
        });
        input.addEventListener('keyup', e => {
            checkEmpty(e.target);
        });
        input.addEventListener('mouseup', e => {
            checkEmpty(e.target);
        });

    });

    function checkEmpty(input) {

        if (input.value.length > 0) {
            input.classList.add('_input');
        } else {
            input.classList.remove('_input');
        }
    }
}