/**
  * Paths to project folders
*/

var paths = {
	input: 'src/',
	output: 'dist/',
	scripts: {
		input: 'src/js/*',
		output: 'dist/js/'
	},
	styles: {
		input: 'src/sass/**/*.{scss,sass}',
		output: 'dist/css/'
	},
  images: {
    input: 'src/img/*',
    output: 'dist/img/'
  },
	copy: {
		input: 'src/copy/**/*',
		output: 'dist/'
	},
  reload: './dist/',
  deploy: {
    src: 'dist/**/*'
  }
};

/**
  * Gulp Packages
*/

// General
var {src, dest, watch, series, parallel} = require('gulp');
var del = require('del');
var flatmap = require('gulp-flatmap');
var lazypipe = require('lazypipe');
var rename = require('gulp-rename');
var notify = require("gulp-notify");

// Styles
var sass = require('gulp-sass');
var prefix = require('gulp-autoprefixer');
var minify = require('gulp-cssnano');

// Images
var imagemin = require('gulp-imagemin');
var imgCompress  = require('imagemin-jpeg-recompress');

// Scripts
var concat = require('gulp-concat');
var uglify = require('gulp-terser');
var optimizejs = require('gulp-optimize-js');

// BrowserSync
var browserSync = require('browser-sync');

// Gh-pages deploy
var ghPages = require('gh-pages');

/**
  * Gulp Tasks
*/

// Remove pre-existing content from output folders
var cleanDist = function (done) {

	// Clean the dist folder
	del.sync([
		paths.output
	]);

	// Signal completion
	return done();

};

// Process, lint, and minify Sass files
var buildStyles = function (done) {

	// Run tasks on all Sass files
	return src(paths.styles.input)
		.pipe(sass({
			outputStyle: 'expanded',
			sourceComments: true
		}).on("error", notify.onError()))
		.pipe(prefix({
			browsers: ['last 2 version', '> 0.25%'],
			cascade: true,
			remove: true
		}))
		.pipe(dest(paths.styles.output))
		.pipe(rename({suffix: '.min'}))
		.pipe(minify({
			discardComments: {
				removeAll: true
			}
		}))
		.pipe(dest(paths.styles.output));

};

// Optimize Images
var optimizeImages = function (done) {

	return src(paths.images.input)
		.pipe(imagemin([
      imagemin.jpegtran({progressive: true}),
      imgCompress({
				loops: 4,
				min: 70,
				max: 80,
				quality: 'high'
			}),
			imagemin.gifsicle(),
			imagemin.optipng(),
			imagemin.svgo()
    ]))
		.pipe(dest(paths.images.output));

};

// Repeated JavaScript tasks
var jsTasks = lazypipe()
	.pipe(optimizejs)
	.pipe(dest, paths.scripts.output)
	.pipe(rename, {suffix: '.min'})
	.pipe(uglify)
	.pipe(optimizejs)
	.pipe(dest, paths.scripts.output);

// Lint, minify, and concatenate scripts
var buildScripts = function (done) {

	// Run tasks on script files
	return src(paths.scripts.input)
		.pipe(flatmap(function(stream, file) {

			// If the file is a directory
			if (file.isDirectory()) {

				// Setup a suffix variable
				var suffix = '';

				// Grab all files and concatenate them
				// If separate polyfills enabled, this will have .polyfills in the filename
				src(file.path + '/*.js')
					.pipe(concat(file.relative + suffix + '.js'))
					.pipe(jsTasks());

				return stream;

			}

			// Otherwise, process the file
			return stream.pipe(jsTasks());

		}));

};

// Copy static files into output folder
var copyFiles = function (done) {

	return src(paths.copy.input)
		.pipe(dest(paths.copy.output));

};

// Watch for changes to the src directory
var startServer = function (done) {

	// Initialize BrowserSync
	browserSync.init({
		server: {
			baseDir: paths.reload
		}
	});

	// Signal completion
	done();

};

// Reload the browser when files change
var reloadBrowser = function (done) {
	browserSync.reload();
	done();
};

// Watch for changes
var watchSource = function (done) {
	watch(paths.input, series(exports.default, reloadBrowser));
	done();
};

// Deplya to github pages
var deploy = function (done) {
  return src(paths.deploy.src)
  .pipe(ghPages({
  }));
};

/**
  * Export Tasks
*/

// Default task
// gulp
exports.default = series(
	cleanDist,
	parallel(
    buildScripts,
    buildStyles,
    optimizeImages,
		copyFiles
	)
);

// Watch and reload
// gulp watch
exports.watch = series(
	exports.default,
	startServer,
	watchSource
);

// Deploy site to github pages
// gulp deploy
exports.deploy = series(
  exports.default,
  deploy
);
