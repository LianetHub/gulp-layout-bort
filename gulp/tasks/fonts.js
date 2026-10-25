import fs from "fs";
import fonter from "gulp-fonter";
import ttf2woff2 from "gulp-ttf2woff2";

export const otf2ttf = () => {
    return app.gulp
        .src(`${app.path.srcFolder}/fonts/*.otf`, {})
        .pipe(
            app.plugins.plumber(
                app.plugins.notify.onError({
                    title: "FONTS",
                    message: "Error: <%= error.message %>",
                })
            )
        )
        .pipe(
            fonter({
                formats: ["ttf"],
            })
        )
        .pipe(app.gulp.dest(`${app.path.srcFolder}/fonts/`));
};

export const ttfToWoff = () => {
    return app.gulp
        .src(`${app.path.srcFolder}/fonts/*.ttf`, {})
        .pipe(
            app.plugins.plumber(
                app.plugins.notify.onError({
                    title: "FONTS",
                    message: "Error: <%= error.message %>",
                })
            )
        )
        .pipe(
            fonter({
                formats: ["woff"],
            })
        )
        .pipe(app.gulp.dest(`${app.path.build.fonts}`))
        .pipe(app.gulp.src(`${app.path.srcFolder}/fonts/*.ttf`))
        .pipe(ttf2woff2())
        .pipe(app.gulp.dest(`${app.path.build.fonts}`));
};
export const copyWoff = () => {
    return app.gulp
        .src(`${app.path.srcFolder}/fonts/*.woff`)
        .pipe(app.gulp.dest(`${app.path.build.fonts}`))
        .pipe(app.gulp.src(`${app.path.srcFolder}/fonts/*.woff2`))
        .pipe(app.gulp.dest(`${app.path.build.fonts}`));
};

export const fontsStyle = async () => {
    const sourceFolder = app.path.srcFolder + '/fonts';
    const fonts = [...new Set(fs.readdirSync(sourceFolder)
        .filter(file => /\.(?:ttf|otf|woff2?)$/i.test(file))
        .map(file => file.replace(/\.[^.]+$/, '')))].sort();
    const styles = fonts.map(file => {
        const variable = /-VariableFont_/i.test(file);
        const family = file.split('-')[0];
        const weight = variable ? '100 900' : 400;
        return `@font-face {
    font-family: '${family}';
    src: url("../fonts/${file}.woff2") format("woff2"), url("../fonts/${file}.woff") format("woff");
    font-weight: ${weight};
${variable ? '    font-stretch: 75% 125%;\n' : ''}    font-style: normal;
    font-display: swap;
}`;
    }).join('\n') + '\n';
    const destination = app.path.srcFolder + '/scss/fonts.scss';
    if (!fs.existsSync(destination) || fs.readFileSync(destination, 'utf8') !== styles) {
        fs.writeFileSync(destination, styles);
    }
};
