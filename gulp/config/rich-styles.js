export const richStyleBlocks = [
	{
		src: "vars.scss",
		id: "rich-vars",
		out: "_styles-vars.html",
		comment:
			"THEME VARIABLES — редактируйте этот блок для кастомизации под конкретный сайт.\n * Все компоненты используют эти переменные через var().",
	},
	{
		src: "base.scss",
		id: "rich-base",
		out: "_styles-base.html",
		comment:
			"STRUCTURAL STYLES — не изменяйте без необходимости.\n * Grid, flex, breakpoints, изоляция от стилей хост-сайта.",
	},
	{
		src: "theme.scss",
		id: "rich-theme",
		out: "_styles-theme.html",
		comment:
			"THEME STYLES — типографика, цвета компонентов через var().\n * Для смены темы достаточно изменить #rich-vars; здесь — применение переменных.",
	},
	{
		src: "components.scss",
		id: "rich-components",
		out: "_styles-components.html",
		comment:
			"COMPONENT-SPECIFIC STYLES — дополнительные правила для сложных блоков.\n * Используют переменные из #rich-vars; при необходимости переопределяйте локально.",
	},
	{
		src: "showcase.scss",
		id: "showcase-page",
		out: "_showcase-styles.html",
		comment:
			"Стили только для страницы-каталога showcase.html.\n * НЕ включайте в embeddable-фрагмент для сайтов.",
	},
];
