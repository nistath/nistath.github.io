const gulp = require('gulp');
const clean = require('gulp-clean');
const bs = require("browser-sync").create();
const md = require('gulp-markdown');

const bsOptions = {
	server: "./",
	reloadOnRestart: true,
};

gulp.task('watch', () => {
	bs.watch("css/*.css", function(event, file) {
		if (event === "change") {
			bs.reload("*.css");
		}
	});
	bs.watch("*.html").on("change", bs.reload);
	bs.watch("js/*.js").on("change", bs.reload);

	bs.init(bsOptions);
});

gulp.task('build', () => {
	const src = "md/", dst = "built/";

	gulp.src(dst).
		pipe(clean());

	gulp.src(src + "*.md")
	.pipe(md())
	.pipe(gulp.dest(dst));
});
