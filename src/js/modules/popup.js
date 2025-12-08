export class Popup {
	constructor() {
		this.activePopup = null;
		this.init();
	}

	init() {
		document.addEventListener('click', (e) => this.handleClick(e));
		document.addEventListener('keydown', (e) => this.handleKeydown(e));
	}

	handleClick(e) {
		const target = e.target;

		if (target.closest('[data-modal]')) {
			e.preventDefault();
			this.openPopup(target.closest('[data-modal]'));
		}

		if (target.closest('[data-close-modal]')) {
			e.preventDefault();
			this.closePopup(target.closest('.popup'));
		}

		if (target.classList.contains('popup')) {
			this.closePopup(target.closest('.popup'));
		}
	}

	handleKeydown(e) {
		if (!this.activePopup) return;

		if (e.key === "Escape") {
			this.closePopup(this.activePopup);
		}

		if (e.key === "Enter") {
			e.preventDefault();
		}
	}

	openPopup(trigger) {
		const popupName = trigger.getAttribute('data-href') || trigger.getAttribute('href')?.replace("#", "");
		const modal = document.getElementById(popupName);

		if (!modal) return;

		if (this.activePopup) {
			this.closePopup(this.activePopup, false);
		} else {
			this.lockBody();
		}

		modal.classList.add('open');
		this.setAttributes(modal, { 'aria-hidden': 'false', 'tabindex': '-1' });
		this.setAttributes(trigger, { 'aria-expanded': 'true', 'data-modal': 'open' });

		this.activePopup = modal;
		modal.dispatchEvent(new CustomEvent('popupOpen', { detail: { modal, trigger } }));
	}

	closePopup(modal, unlockBody = true) {
		if (!modal) return;

		modal.classList.remove('open');
		this.setAttributes(modal, { 'aria-hidden': 'true', 'tabindex': null });

		const trigger = document.querySelector('[data-modal="open"]');
		if (trigger) {
			this.setAttributes(trigger, { 'aria-expanded': 'false', 'data-modal': '' });
		}

		if (unlockBody) {
			this.unlockBody();
		}

		this.activePopup = null;
		modal.dispatchEvent(new CustomEvent('popupClose', { detail: { modal } }));
	}

	lockBody() {
		document.body.classList.add('locked');
	}

	unlockBody() {
		document.body.classList.remove('locked');
	}

	setAttributes(element, attributes) {
		Object.keys(attributes).forEach(key => {
			const value = attributes[key];
			if (value === null) {
				element.removeAttribute(key);
			} else {
				element.setAttribute(key, value);
			}
		});
	}
}


