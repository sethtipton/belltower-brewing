<?php

// BEGIN iThemes Security - Do not modify or remove this line
// iThemes Security Config Details: 2
define( 'DISALLOW_FILE_EDIT', true ); // Disable File Editor - Security > Settings > WordPress Tweaks > File Editor
// END iThemes Security - Do not modify or remove this line

function is_local_environment() {
	echo 'Current HTTP_HOST: ' . $_SERVER['HTTP_HOST']; // Debugging line
	$local_domains = ['localhost', '127.0.0.1', 'localhost:10003', '127.0.0.1:8080', 'your-local-domain.com'];
	return in_array($_SERVER['HTTP_HOST'], $local_domains);
}

if (is_local_environment()) {
	echo "Local environment detected.";

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

}else {

	echo "production environment detected.";
	define( 'ITSEC_ENCRYPTION_KEY', 'T0NxckNXfkF4IERPZEg/a2xnVVRNUXlfMGxEWjYvPHR4PDkxSFd4TGxFSkUxT3Y0ZCNhdShSKj59QikmR19fcw==' );

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
	 * @link https://wordpress.org/support/article/editing-wp-config-php/
	 *
	 * @package WordPress
	 */

	// ** MySQL settings - You can get this info from your web host ** //
	/** The name of the database for WordPress */
	define('DB_NAME', 'sethtipt_WPQWA');

	/** MySQL database username */
	define('DB_USER', 'sethtipt_WPQWA');

	/** MySQL database password */
	define('DB_PASSWORD', 'e0-rsY7CAuvTP<cPe');

	/** MySQL hostname */
	define('DB_HOST', 'localhost');

	/** Database Charset to use in creating database tables. */
	define( 'DB_CHARSET', 'utf8' );

	/** The Database Collate type. Don't change this if in doubt. */
	define( 'DB_COLLATE', '' );

	/**#@+
	 * Authentication Unique Keys and Salts.
	 *
	 * Change these to different unique phrases!
	 * You can generate these using the {@link https://api.wordpress.org/secret-key/1.1/salt/ WordPress.org secret-key service}
	 * You can change these at any point in time to invalidate all existing cookies. This will force all users to have to log in again.
	 *
	 * @since 2.6.0
	 */
	define('AUTH_KEY', '664cb4f0a97910b56911d046af311244882defa71ec52d015c28ddaf09e05b53');
	define('SECURE_AUTH_KEY', '3ca2989bcf85c3a7799a05b8eb8bca386dd7e9766a895f4e9689736a9051ada2');
	define('LOGGED_IN_KEY', '4d395425c4e351ee66efbffc1eb036352c0718004d7098067999b6fde6484146');
	define('NONCE_KEY', '6e77d80cf875e8f9660926c56370ed0504a2aa8a92aaa0d82b00b70e935ef203');
	define('AUTH_SALT', 'cb0b236901a6e578329cfe09405ca43ccdf7c0a4f19b04d1cb9c8d16a07add9e');
	define('SECURE_AUTH_SALT', '67d136ea5bb2196e48245dbc9748f681f263ce4f407f115fd975965c35284f7c');
	define('LOGGED_IN_SALT', 'a4a549d159040020e30d06da6d8b31d62992d3373371c06e057a9912a566fffc');
	define('NONCE_SALT', 'de789fbce0a5a432c97b4c2f21966af0dc33412e46baaf0d4b7e06d7d5be49c8');

	/**#@-*/

	/**
	 * WordPress Database Table prefix.
	 *
	 * You can have multiple installations in one database if you give each
	 * a unique prefix. Only numbers, letters, and underscores please!
	 */
	$table_prefix = 'siH_';
	define('WP_CRON_LOCK_TIMEOUT', 120);
	define('AUTOSAVE_INTERVAL', 300);
	define('WP_POST_REVISIONS', 5);
	define('EMPTY_TRASH_DAYS', 7);
	define('WP_AUTO_UPDATE_CORE', true);

	/**
	 * For developers: WordPress debugging mode.
	 *
	 * Change this to true to enable the display of notices during development.
	 * It is strongly recommended that plugin and theme developers use WP_DEBUG
	 * in their development environments.
	 *
	 * For information on other constants that can be used for debugging,
	 * visit the documentation.
	 *
	 * @link https://wordpress.org/support/article/debugging-in-wordpress/
	 */
	define( 'WP_DEBUG', false );

	/* That's all, stop editing! Happy publishing. */

	/** Absolute path to the WordPress directory. */
	if ( ! defined( 'ABSPATH' ) ) {
		define( 'ABSPATH', __DIR__ . '/' );
	}

	/** Sets up WordPress vars and included files. */
	require_once ABSPATH . 'wp-settings.php';

}
