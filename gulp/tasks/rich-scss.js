import fs from "fs";
import path from "path";
import * as dartSass from "sass";
import {
	richProducts,
	richSharedBlocks,
	richStandaloneBlocks,
} from "../config/rich-styles.js";

function wrapRichStyle(css, block) {
	const comment = block.comment
		.split("\n")
		.map((line) => ` * ${line.trim().replace(/^\*\s*/, "")}`)
		.join("\n");

	const compiledCss = css
		.trim()
		.replace(/^@charset\s+["'][^"']+["'];\s*/i, "");

	return (
		`<style id="${block.id}">\n` +
		`/*\n${comment}\n */\n` +
		`${compiledCss}\n` +
		`</style>\n`
	);
}

function writeStylesAll(product) {
	const partialsDir = path.resolve(`${app.path.srcFolder}/rich/partials`);
	const productDir = path.join(partialsDir, product.id);
	const stylesAllPath = path.join(productDir, "_styles-all.html");

	fs.mkdirSync(productDir, { recursive: true });

	const content = [
		`@@include('partials/${product.id}/_styles-vars.html')`,
		`@@include('partials/_shared/_styles-base.html')`,
		`@@include('partials/${product.id}/_styles-theme.html')`,
		`@@include('partials/${product.id}/_styles-components.html')`,
	].join("\n") + "\n";

	fs.writeFileSync(stylesAllPath, content, "utf8");
}

function compileBlock(block, scssDir, partialsDir) {
	const srcPath = path.join(scssDir, block.src);
	const outPath = path.join(partialsDir, block.out);
	const outDir = path.dirname(outPath);

	fs.mkdirSync(outDir, { recursive: true });

	const result = dartSass.compile(srcPath, {
		style: "expanded",
		loadPaths: [scssDir],
	});

	fs.writeFileSync(outPath, wrapRichStyle(result.css, block), "utf8");
}

export const richScss = (done) => {
	const scssDir = path.resolve(`${app.path.srcFolder}/rich/scss`);
	const partialsDir = path.resolve(`${app.path.srcFolder}/rich/partials`);
	const blocks = [
		...richSharedBlocks,
		...richProducts.flatMap((product) => product.blocks),
		...richStandaloneBlocks,
	];

	try {
		for (const block of blocks) {
			compileBlock(block, scssDir, partialsDir);
		}

		for (const product of richProducts) {
			writeStylesAll(product);
		}
	} catch (error) {
		done(new Error(`Rich SCSS: ${error.message}`));
		return;
	}

	done();
};
