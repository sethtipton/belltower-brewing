const gulp = require('gulp');
const sass = require('gulp-sass');
const sourcemaps = require('gulp-sourcemaps');
const browserSync = require('browser-sync').create();

//compile scss into css
function style() {
    return gulp.src('wp-content/themes/belltower/sass/**/*.scss')
    .pipe(sass().on('error',sass.logError))
    .pipe(sourcemaps.init())
    .pipe(gulp.dest('wp-content/themes/belltower'))
    //.pipe(sourcemaps.write('wp-content/themes/belltower'))
    .pipe(sourcemaps.write())
    .pipe(browserSync.stream());
}
function watch() {
    browserSync.init({
        proxy: 'http://localhost:10003/'
    });
    gulp.watch('wp-content/themes/belltower/sass/**/*.scss', style)
    gulp.watch('./*.html').on('change',browserSync.reload);
    gulp.watch('./js/**/*.js').on('change', browserSync.reload);
}
exports.style = style;
exports.watch = watch;