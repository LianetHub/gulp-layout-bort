export const formSubmit = () => {
	const forms = document.querySelectorAll("form");
	forms.forEach((form) => {
		form.addEventListener("submit", formSend);

		if (!form.querySelector('[name="captcha"]')) {
			form.insertAdjacentHTML("beforeend", `<input type="hidden" name="captcha" value="${navigator.userAgent}"/>`);
		}
	});

	document.addEventListener("input", handleFormInput);

	async function formSend(e) {
		e.preventDefault();
		const form = e.target;
		const currentUrl = form.getAttribute("action");
		const error = formValidate(form);

		if (error === 0) {
			try {

				form.classList.add("_sending");

				const response = await fetch(currentUrl, {
					method: "POST",
					body: new FormData(form),
				});

				if (!response.ok) throw new Error("Укажите URL, куда будет запрос в атрибуте action у формы");

				form.reset();
				closeAndShowSuccessModal();

			} catch (error) {

				alert(error.message);
				closeAndShowSuccessModal();

			} finally {
				form.classList.remove("_sending");
			}
		}
	}

	function handleFormInput(e) {
		const { target } = e;
		if (target.classList.contains('_error')) {
			formRemoveError(target);
		}
	}

	function formValidate(form) {
		let error = 0;
		const formReq = form.querySelectorAll("[data-required]");

		formReq.forEach(input => {
			formRemoveError(input);

			if (input.matches("[name='email']") && !emailTest(input.value)) {
				formAddError(input);
				error++;
			} else if (input.matches("[type='checkbox']") && !input.checked) {
				formAddError(input);
				error++;
			} else if (input.value.trim() === "" || (input.matches("[name='message']") && input.value.trim().length < 1)) {
				formAddError(input);
				error++;
			} else if (input.matches("[type='tel']") && !phoneTest(input.value)) {
				formAddError(input);
				error++;
			}
		});

		return error;
	}

	function formAddError(input) {
		input.classList.add("_error");
		input.parentElement.classList.add("_error");
		// input.closest('.form')?.querySelector('.form__error-message')?.classList.add('visible');
	}

	function formRemoveError(input) {
		input.classList.remove("_error");
		input.parentElement.classList.remove("_error");
		// const form = input.closest('.form');
		// if (form && !form.querySelector('._error')) {
		// 	form.querySelector('.form__error-message')?.classList.remove('visible');
		// }
	}

	function emailTest(email) {
		const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
		return re.test(String(email).toLowerCase());
	}

	function phoneTest(phone) {
		const cleaned = phone.replace(/\D/g, '');
		return cleaned.length >= 10 && /^[1-9]\d{9,14}$/.test(cleaned);
	}


	function closeAndShowSuccessModal() {
		if (Fancybox.getInstance()) {
			Fancybox.close(true);
		}
		Fancybox.show([{ src: "#success", type: "inline" }], {
			dragToClose: false,
			closeButton: false,
		});
	}
};