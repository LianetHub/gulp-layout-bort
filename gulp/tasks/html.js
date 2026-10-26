import fileinclude from "gulp-file-include";
import versionNumber from "gulp-version-number";
import htmlBeautify from "gulp-html-beautify";
import { htmlFormatOptions } from "../../scripts/html-format.js";

export const html = () => {
    return app.gulp
        .src(app.path.src.html)
        .pipe(
            app.plugins.plumber(
                app.plugins.notify.onError({
                    title: "HTML",
                    message: "Error: <%= error.message %>",
                })
            )
        )
        .pipe(fileinclude({
            prefix: '@@',
            basepath: '@file',
            indent: true,
            context: {}
        }))
        .pipe(app.plugins.replace(/@img\//g, "img/"))
        .pipe(
            app.plugins.if(
                app.isBuild,
                versionNumber({
                    value: "%DT%",
                    append: {
                        key: "_v",
                        cover: 0,
                        to: ["css", "js"],
                    },
                    output: {
                        file: "gulp/version.json",
                    },
                })
            )
        )
        .pipe(
            app.plugins.if(
                app.isBuild,
                htmlBeautify(htmlFormatOptions)
            )
        )
        .pipe(app.gulp.dest(app.path.build.html))
        .pipe(app.plugins.browsersync.stream());
};
