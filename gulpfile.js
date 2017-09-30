const gulp = require('gulp');
const bs = require("browser-sync").create();

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

	bs.init(bsOptions);
});
