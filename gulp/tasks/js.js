// Copy the readable browser source unchanged in development and production.
export const js = () => {
    return app.gulp.src(app.path.src.js)
        .pipe(app.gulp.dest(app.path.build.js))
        .pipe(app.plugins.browsersync.stream());
};

export const copyJsLibs = () => {
    return app.gulp.src(app.path.src.jsLibs)
        .pipe(app.gulp.dest(app.path.build.jsLibs));
};
