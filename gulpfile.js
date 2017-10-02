const gulp = require('gulp');
const bs = require('browser-sync').create();
const { spawn } = require('child_process');
const logger = require("eazy-logger").Logger({
  prefix: "[{magenta:Jekyll]",
  useLevelPrefixes: false
});

const jekyll = (process.platform == 'win32')? 'jekyll.bat' : 'jekyll';

const siteDir = '_site/';
function jpath(opath) {
	return siteDir + opath;
}

// Private task: You should never need to work directly on the built site.
function browsersync() {
	const bsOpts = {
		server: jpath('./'),
		reloadOnRestart: true,
	};
	const watchOpts = {
		delay: 500,
	};
	const gwatch = (globs, fn) => gulp.watch(jpath(globs), watchOpts, fn);

	gwatch('css/*.css').on('change', () => bs.reload('*.css'));
	gwatch('*.html').on('change', bs.reload);
	gwatch('js/*.js').on('change', bs.reload);

	bs.init(bsOpts);
}
browsersync.description = "Watch and serve " + siteDir + " through BrowserSync.";

// TODO: Generalize jekyll commands.
// TODO: Properly log stdout and stderr.
gulp.task('serve', () =>
  spawn(jekyll, ['serve'], {stdio: 'inherit'})
);
gulp.task('serve').description = "Watch, build, and serve site with jekyll.";

// TODO: Properly log stdout and stderr.
gulp.task('build', () =>
	spawn(jekyll, ['build', '--incremental'], {stdio: 'inherit'})
);
gulp.task('build').description = "Incrementally build with jekyll to " + siteDir + ".";

// TODO: Properly log stdout and stderr.
gulp.task('build-watch', () =>
	spawn(jekyll, ['build', '--incremental', '--watch'], {stdio: 'inherit'})
);
gulp.task('build-watch').description = "Watch and incrementally build with jekyll to " + siteDir + ".";

// TODO: Add watcher for _config.yml.
gulp.task('watch', gulp.series('build', gulp.parallel('build-watch', browsersync)));
gulp.task('watch').description = "Watch and develop with Jekyll and BrowserSync.";
