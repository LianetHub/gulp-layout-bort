import IMask from 'imask';
import { codeArray } from './codes.js';

export const intInputMask = () => {

    const inputs = document.querySelectorAll("input[type='tel']");



    inputs.forEach(input => {

        const mask = IMask(input, {
            mask: codeArray,
            dispatch: (appended, dynamicMasked) => {
                const number = (dynamicMasked.value + appended).replace(/\D/g, '');

                return dynamicMasked.compiledMasks.find(m => number.indexOf(m.startsWith) === 0);
            }
        })
    })
}
