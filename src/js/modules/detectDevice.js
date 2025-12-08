export default function detectDevice() {

	const userAgent = navigator.userAgent.toLowerCase();

	const isMobile = {
		Android: () => /android/i.test(userAgent),
		iOS: () => /iphone|ipad|ipod/i.test(userAgent),
		any: function () {
			return this.Android() || this.iOS();
		},
	};

	function updateBodyClass() {
		const isTouchDevice = isMobile.any() || window.innerWidth < 992;

		document.body.classList.toggle("_touch", isTouchDevice);
		document.body.classList.toggle("_pc", !isTouchDevice);
	}

	updateBodyClass();

	window.addEventListener("resize", updateBodyClass);
}

