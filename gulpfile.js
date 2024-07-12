const gulp = require('gulp');
const sass = require('gulp-sass')(require('sass'));
//const sourcemaps = require('gulp-sourcemaps');
const browserSync = require('browser-sync').create();

// Compile SCSS into CSS
function style() {
    return gulp.src('wp-content/themes/belltower/sass/**/*.scss')
        //.pipe(sourcemaps.init())
        .pipe(sass().on('error', sass.logError))
       // .pipe(sourcemaps.write())
        .pipe(gulp.dest('wp-content/themes/belltower'))
        .pipe(browserSync.stream());
}

function watch() {
    browserSync.init({
        proxy: 'http://localhost:10003/'
    });
    gulp.watch('wp-content/themes/belltower/sass/**/*.scss', style);
    gulp.watch('./*.html').on('change', browserSync.reload);
    gulp.watch('./js/**/*.js').on('change', browserSync.reload);
}

exports.style = style;
exports.watch = watch;