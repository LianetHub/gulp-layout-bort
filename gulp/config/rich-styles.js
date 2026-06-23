const blockComment = (lines) =>
	lines
		.map((line) => line.trim())
		.join("\n");

export const richSharedBlocks = [
	{
		src: "base.scss",
		id: "rich-base",
		out: "_shared/_styles-base.html",
		comment: blockComment([
			"STRUCTURAL STYLES — не изменяйте без необходимости.",
			"Grid, flex, breakpoints, изоляция от стилей хост-сайта.",
		]),
	},
];

export const richProducts = [
	{
		id: "bss-1630",
		blocks: [
			{
				src: "bss-1630/vars.scss",
				id: "rich-vars",
				out: "bss-1630/_styles-vars.html",
				comment: blockComment([
					"THEME VARIABLES — редактируйте этот блок для кастомизации под конкретный сайт.",
					"Все компоненты используют эти переменные через var().",
				]),
			},
			{
				src: "bss-1630/theme.scss",
				id: "rich-theme",
				out: "bss-1630/_styles-theme.html",
				comment: blockComment([
					"THEME STYLES — типографика, цвета компонентов через var().",
					"Для смены темы достаточно изменить #rich-vars; здесь — применение переменных.",
				]),
			},
			{
				src: "bss-1630/components.scss",
				id: "rich-components",
				out: "bss-1630/_styles-components.html",
				comment: blockComment([
					"COMPONENT-SPECIFIC STYLES — дополнительные правила для сложных блоков.",
					"Используют переменные из #rich-vars; при необходимости переопределяйте локально.",
				]),
			},
		],
	},
	{
		id: "bdr-2400-r",
		blocks: [
			{
				src: "bdr-2400-r/vars.scss",
				id: "rich-vars",
				out: "bdr-2400-r/_styles-vars.html",
				comment: blockComment([
					"THEME VARIABLES — редактируйте этот блок для кастомизации под конкретный сайт.",
					"Все компоненты используют эти переменные через var().",
				]),
			},
			{
				src: "bdr-2400-r/theme.scss",
				id: "rich-theme",
				out: "bdr-2400-r/_styles-theme.html",
				comment: blockComment([
					"THEME STYLES — типографика, цвета компонентов через var().",
					"Для смены темы достаточно изменить #rich-vars; здесь — применение переменных.",
				]),
			},
			{
				src: "bdr-2400-r/components.scss",
				id: "rich-components",
				out: "bdr-2400-r/_styles-components.html",
				comment: blockComment([
					"COMPONENT-SPECIFIC STYLES — дополнительные правила для сложных блоков.",
					"Используют переменные из #rich-vars; при необходимости переопределяйте локально.",
				]),
			},
		],
	},
];

export const richStandaloneBlocks = [
	{
		src: "showcase.scss",
		id: "showcase-page",
		out: "_showcase-styles.html",
		comment: blockComment([
			"Стили только для страницы-каталога showcase.html.",
			"НЕ включайте в embeddable-фрагмент для сайтов.",
		]),
	},
];

export const richStyleBlocks = [
	...richSharedBlocks,
	...richProducts.flatMap((product) => product.blocks),
	...richStandaloneBlocks,
];
