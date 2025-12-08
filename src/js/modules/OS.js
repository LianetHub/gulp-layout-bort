export const OS = () => {
	const isMobile = {
		Android: function () {
			return navigator.userAgent.match(/Android/i);
		},
		BlackBerry: function () {
			return navigator.userAgent.match(/BlackBerry/i);
		},
		iOS: function () {
			return navigator.userAgent.match(/iPhone|iPad|iPod/i);
		},
		Opera: function () {
			return navigator.userAgent.match(/Opera Mini/i);
		},
		Windows: function () {
			return navigator.userAgent.match(/IEMobile/i);
		},
		any: function () {
			return (
				isMobile.Android() ||
				isMobile.BlackBerry() ||
				isMobile.iOS() ||
				isMobile.Opera() ||
				isMobile.Windows());
		},
	};
	

	function getNavigator() {
		if (isMobile.any() || window.innerWidth < 992) {
			document.body.classList.remove("_pc");
			document.body.classList.add("_touch");
		} else {
			document.body.classList.remove("_touch");
			document.body.classList.add("_pc");
		}
	}

	getNavigator();

	window.addEventListener('resize', () => {
		getNavigator()
	})

	
}

