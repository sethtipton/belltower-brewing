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