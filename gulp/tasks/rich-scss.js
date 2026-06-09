import fs from "fs";
import path from "path";
import * as dartSass from "sass";
import { richStyleBlocks } from "../config/rich-styles.js";

function wrapRichStyle(css, block) {
	const comment = block.comment
		.split("\n")
		.map((line) => ` * ${line.trim().replace(/^\*\s*/, "")}`)
		.join("\n");

	const compiledCss = css
		.trim()
		.replace(/^@charset\s+["'][^"']+["'];\s*/i, "");

	return (
		`<!-- AUTO-GENERATED from src/rich/scss/${block.src} — редактируйте SCSS, не этот файл -->\n` +
		`<style id="${block.id}">\n` +
		`/*\n${comment}\n */\n` +
		`${compiledCss}\n` +
		`</style>\n`
	);
}

export const richScss = (done) => {
	const scssDir = path.resolve(`${app.path.srcFolder}/rich/scss`);
	const partialsDir = path.resolve(`${app.path.srcFolder}/rich/partials`);

	for (const block of richStyleBlocks) {
		const srcPath = path.join(scssDir, block.src);
		const outPath = path.join(partialsDir, block.out);

		try {
			const result = dartSass.compile(srcPath, {
				style: "expanded",
				loadPaths: [scssDir],
			});

			fs.writeFileSync(outPath, wrapRichStyle(result.css, block), "utf8");
		} catch (error) {
			done(
				new Error(
					`Rich SCSS (${block.src}): ${error.message}`
				)
			);
			return;
		}
	}

	done();
};
