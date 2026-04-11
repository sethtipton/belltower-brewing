const gulp = require('gulp');
const sass = require('gulp-sass')(require('sass'));
const browserSync = require('browser-sync').create();

// Compile SCSS into CSS
function style() {
  return gulp.src('wp-content/themes/belltower/sass/**/*.scss')
    .pipe(sass().on('error', sass.logError))
    .pipe(gulp.dest('wp-content/themes/belltower')) // adjust if you want a subfolder like /assets/css
    .pipe(browserSync.stream());
}

function serve(done) {
  browserSync.init({
    proxy: 'https://belltower.local',
    port: 3000,
    https: false,
    open: false,
    notify: false,
    files: [
      'wp-content/themes/belltower/**/*.css',
      'wp-content/themes/belltower/**/*.php',
      'wp-content/themes/belltower/js/**/*.js'
    ]
  });

  gulp.watch('wp-content/themes/belltower/sass/**/*.scss', style);
  gulp.watch('wp-content/themes/belltower/**/*.php').on('change', browserSync.reload);
  gulp.watch('wp-content/themes/belltower/js/**/*.js').on('change', browserSync.reload);

  done();
}

function watchTheme(done) {
  gulp.watch('wp-content/themes/belltower/sass/**/*.scss', style);
  done();
}

exports.style = style;
exports.serve = gulp.series(style, serve);
exports.watch = gulp.series(style, watchTheme);
exports.default = exports.watch;
