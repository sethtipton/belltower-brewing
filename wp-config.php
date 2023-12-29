<?php

// BEGIN iThemes Security - Do not modify or remove this line
// iThemes Security Config Details: 2
define( 'DISALLOW_FILE_EDIT', true ); // Disable File Editor - Security > Settings > WordPress Tweaks > File Editor
// END iThemes Security - Do not modify or remove this line

/**
 * The base configuration for WordPress
 *
 * The wp-config.php creation script uses this file during the
 * installation. You don't have to use the web site, you can
 * copy this file to "wp-config.php" and fill in the values.
 *
 * This file contains the following configurations:
 *
 * * MySQL settings
 * * Secret keys
 * * Database table prefix
 * * ABSPATH
 *
 * @link https://codex.wordpress.org/Editing_wp-config.php
 *
 * @package WordPress
 */

// ** MySQL settings - You can get this info from your web host ** //
/** The name of the database for WordPress */
define( 'DB_NAME', 'local' ); 

/** MySQL database username */
define( 'DB_USER', 'root' );

/** MySQL database password */
define( 'DB_PASSWORD', 'root' );

/** MySQL hostname */
define( 'DB_HOST', 'localhost' );

/** Database Charset to use in creating database tables. */
define( 'DB_CHARSET', 'utf8' );

/** The Database Collate type. Don't change this if in doubt. */
define( 'DB_COLLATE', '' );

/**
 * Authentication Unique Keys and Salts.
 *
 * Change these to different unique phrases!
 * You can generate these using the {@link https://api.wordpress.org/secret-key/1.1/salt/ WordPress.org secret-key service}
 * You can change these at any point in time to invalidate all existing cookies. This will force all users to have to log in again.
 *
 * @since 2.6.0
 */
define('AUTH_KEY',         'aG4+h8BJiE8U8FTUY8OMmYBsIHn9u599nzh9QrvqMf7iQD+M4Eujl2taqM4cb0mhzK7ssBCk4bf2bLn3Iw494Q==');
define('SECURE_AUTH_KEY',  'yyU1+IAYrvuk23fuui+J8BR919X0+KiMNhPFp9xoVAjAVseHnFL5fsbRrZfpsL93fguRape6UJwffHR2syyyoA==');
define('LOGGED_IN_KEY',    'lLyRUto1RWqGBjn3MFfP7Vkt9HdKD2nEnBan8sAyOdnu0hTeGrmyoYBOUg7fY+sln/5gfr2k6JZySR7k9W1oAw==');
define('NONCE_KEY',        'yHFdAgSavKx9Ybo5WskwOejWxOmjogAGuJ5Um8Lxx29lYoimCzxt10J1DlhpMXWUoLPV9noIrWBX3/3VvOXR3A==');
define('AUTH_SALT',        'U1jX6vFFSqYVmbPiWEllDyyNU7y8gwyxKc0FoiELxSOU6lo7miiXtzwTdXO1kzqi52rj3KeM1FXAaxpaoypxxQ==');
define('SECURE_AUTH_SALT', 'z2orufsEmaB0Y88zBj5G1IK1ZC1ZYoCDdckqM5W5QoIhHPiDdx5j9Yh3mxtXRsovMRLmBXn6QoampJae/bDI/Q==');
define('LOGGED_IN_SALT',   'uRNcL1dnXWZVs/fGDTVD1y7uOUd0mEh57MflbtWUfUqUXKwjOK5bIquEQtrFIwOX/4JeRJ14mPjVilGNtNZIGg==');
define('NONCE_SALT',       'YsNOxT79Z8MwIBaUDDBaY5GjfskmGzclyiQkKZfxqKONrYymzrXaFR8vLvi3+41/GXmUxqEoKW4zfOXSVkS5kA==');

/**
 * WordPress Database Table prefix.
 *
 * You can have multiple installations in one database if you give each
 * a unique prefix. Only numbers, letters, and underscores please!
 */
$table_prefix = 'wp_';




define( 'WP_ENVIRONMENT_TYPE', 'local' );
/* That's all, stop editing! Happy publishing. */

/** Absolute path to the WordPress directory. */
if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', dirname( __FILE__ ) . '/' );
}

/** Sets up WordPress vars and included files. */
require_once ABSPATH . 'wp-settings.php';
