export const select = () => {
    const setButtonText = (button, text) => {
        const textEl = button.querySelector('.dropdown__button-text');
        if (textEl) {
            textEl.textContent = text;
        }
    };

    const toggleDropdown = (dropdown, isOpen) => {
        const btn = dropdown.querySelector('.dropdown__button');
        const list = dropdown.querySelector('.dropdown__list');
        btn.setAttribute('aria-expanded', isOpen);
        list.setAttribute('aria-hidden', !isOpen);
        if (isOpen) {
            dropdown.classList.add('visible');
        } else {
            dropdown.classList.remove('visible');
        }
    };

    const setupDropdown = dropdown => {
        const dropdownBtn = dropdown.querySelector('.dropdown__button');
        const dropdownList = dropdown.querySelector('.dropdown__list');
        const dropdownItems = dropdownList.querySelectorAll('.dropdown__list-item');
        const dropdownInput = dropdown.querySelector('.dropdown__input');

        dropdown.setAttribute('role', 'listbox');
        dropdownItems.forEach(item => item.setAttribute('role', 'option'));

        if (dropdownInput.value) {
            dropdown.classList.add('is-selected');
            dropdownBtn.classList.add('selected');
        }

        dropdownBtn.addEventListener('click', () => {
            if (dropdownBtn.disabled) {
                return;
            }
            const isOpen = dropdownBtn.getAttribute('aria-expanded') === 'true';
            toggleDropdown(dropdown, !isOpen);
        });

        dropdownItems.forEach(item => {
            item.addEventListener('click', () => {
                dropdownItems.forEach(el => {
                    el.classList.remove('active');
                    el.removeAttribute('aria-checked');
                });
                item.classList.add('active');
                item.setAttribute('aria-checked', 'true');
                setButtonText(dropdownBtn, item.textContent.trim());
                dropdownBtn.classList.add('selected');
                dropdown.classList.add('is-selected');
                dropdownInput.value = item.dataset.value;
                toggleDropdown(dropdown, false);
                dropdownInput.dispatchEvent(new Event('change'));
            });
        });
    };

    const closeAllDropdownsOnClickOutside = e => {
        document.querySelectorAll('.dropdown.visible').forEach(dropdown => {
            if (!dropdown.contains(e.target)) {
                toggleDropdown(dropdown, false);
            }
        });
    };

    const closeAllDropdownsOnEscape = e => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.dropdown.visible').forEach(dropdown => {
                toggleDropdown(dropdown, false);
            });
        }
    };

    document.querySelectorAll('.dropdown').forEach(setupDropdown);
    document.addEventListener('click', closeAllDropdownsOnClickOutside);
    document.addEventListener('keydown', closeAllDropdownsOnEscape);
};
