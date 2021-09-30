<?php
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
define('AUTH_KEY',         'TYVejWxPsXpLpGkPm2lQe3AKxDSFk8AC9LcR7TTOUX+ZQMzvvjleaEvm3wMEBQgZhJ3nc7zMx5MZUjL76vxiOw==');
define('SECURE_AUTH_KEY',  'C7xAfsnnvToP2LR0TXMFrWyxJVmKsFxudofSq1r/M9jrWPN+MBaPjWJI2vBfZzipgN60Es0x5FbPz/wr2M4FGQ==');
define('LOGGED_IN_KEY',    'gpqK5UJ5P3ndWNQxC4JGe9jceAetTYYMOA3Rr0XS5q4qK7yJafziQXKDsOcRTj1MRVurTHxSXI57EIGGkJ0uVA==');
define('NONCE_KEY',        'WBaHyVUkZYfMOglZRyJ3ITkOpx8mUsvQqyY1DHQ2g6ISnPvFTT8wBpmt1PxzMTyvmbdsrD/Q/TKxNNvozz+c6Q==');
define('AUTH_SALT',        '5uKV4QbOmW3itj1uo6vLUmvikuvBiaRMqpIzn1y05WTgJRjZcKxdv6RdIMvdhhXNXlKgonqA5Yraq60YUFK7Nw==');
define('SECURE_AUTH_SALT', 'sXHrRTVxCYeLRcJy6R6ATDbiWdph12jAE8NIWuvWNtAEybFbyAqAwSAlDHUFLI2aRclA4ufDOcMY4TPts1zNIw==');
define('LOGGED_IN_SALT',   'lnt/sRQlvKzvcHWt+edupfCCSish4+T9ZFKsU3n0VtVptVK4L8aI9zmCuSRxe6SIcaK069YSIQylOa19VWIiwg==');
define('NONCE_SALT',       'fFkbAOyfD5k5O+UGL2mvHrB99gedE8h6s+iTZqrWOzax7zVKrvFETzBXnIjuywU7qnQpAaF/u4+cLq9au7D8SQ==');

/**
 * WordPress Database Table prefix.
 *
 * You can have multiple installations in one database if you give each
 * a unique prefix. Only numbers, letters, and underscores please!
 */
$table_prefix = 'wp_';




/* That's all, stop editing! Happy publishing. */

/** Absolute path to the WordPress directory. */
if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', dirname( __FILE__ ) . '/' );
}

/** Sets up WordPress vars and included files. */
require_once ABSPATH . 'wp-settings.php';
