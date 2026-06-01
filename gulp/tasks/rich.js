import fileinclude from "gulp-file-include";

export const richHtml = () => {
	return app.gulp
		.src(`${app.path.srcFolder}/rich/*.html`)
		.pipe(
			app.plugins.plumber(
				app.plugins.notify.onError({
					title: "Rich HTML",
					message: "Error: <%= error.message %>",
				})
			)
		)
		.pipe(
			fileinclude({
				prefix: "@@",
				basepath: `${app.path.srcFolder}/rich/`,
				indent: true,
				context: {},
			})
		)
		.pipe(app.gulp.dest(app.path.build.rich))
		.pipe(app.plugins.browsersync.stream());
};

export const richCopy = () => {
	return app.gulp
		.src(`${app.path.srcFolder}/rich/img/**/*.*`)
		.pipe(app.gulp.dest(`${app.path.build.rich}/img`));
};
