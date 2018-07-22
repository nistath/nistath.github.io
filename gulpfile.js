const gulp = require('gulp');
const bs = require('browser-sync').create();
const { spawn } = require('child_process');
const logger = require("eazy-logger").Logger({
  prefix: "[{magenta:Jekyll]",
  useLevelPrefixes: false
});

function spawnJekyll(args) {
  const jekyll = (process.platform == 'win32')? 'jekyll.bat' : 'jekyll';
  return spawn(jekyll, args, {stdio: ['ignore', 1, 2]});
}

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
browsersync.description = `Watch and serve ${siteDir} through BrowserSync.`;

gulp.task('serve', () => spawnJekyll(['serve']));
gulp.task('serve').description = "Watch, build, and serve site with Jekyll.";

gulp.task('build', () => spawnJekyll(['build', '--incremental']));
gulp.task('build').description = `Incrementally build with Jekyll to ${siteDir}.`;

gulp.task('build-watch', () =>
	spawnJekyll(['build', '--incremental', '--watch'])
);
gulp.task('build-watch').description = `Watch and incrementally build with Jekyll to ${siteDir}.`;

// TODO: Add watcher for _config.yml.
gulp.task('watch', gulp.series('build', gulp.parallel('build-watch', browsersync)));
gulp.task('watch').description = "Watch and develop with Jekyll and BrowserSync.";
