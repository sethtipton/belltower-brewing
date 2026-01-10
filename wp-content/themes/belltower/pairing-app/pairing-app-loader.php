<?php
/**
 * Pairing App loader.
 *
 * Drop this file in themes/belltower/pairing-app/pairing-app-loader.php
 * Then include it from your theme's functions.php:
 * require_once get_stylesheet_directory() . '/pairing-app/pairing-app-loader.php';
 *
 * This file registers the [pairing_app] shortcode and enqueues built assets
 * from pairing-app/dist using Vite's manifest.json for hashed filenames.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

function bt_pairing_app_enqueue_assets() {
	$theme_dir     = get_stylesheet_directory();
	$manifest_path = null;
	$manifest_candidates = array(
		$theme_dir . '/pairing-app/dist/manifest.json',
		$theme_dir . '/pairing-app/dist/.vite/manifest.json',
	);
	// Prefer top-level manifest; fallback to .vite/manifest if needed.
	if ( file_exists( $manifest_candidates[0] ) ) {
		$manifest_path = $manifest_candidates[0];
	} elseif ( file_exists( $manifest_candidates[1] ) ) {
		$manifest_path = $manifest_candidates[1];
	}
	$dist_url      = get_stylesheet_directory_uri() . '/pairing-app/dist';

	if ( ! file_exists( $manifest_path ) ) {
		wp_register_script( 'bt-pairing-app-debug', '', array(), null, true );
		wp_enqueue_script( 'bt-pairing-app-debug' );
		wp_add_inline_script(
			'bt-pairing-app-debug',
			'console.warn("[pairing-app] manifest missing", ' . wp_json_encode( $manifest_candidates ) . ');',
			'before'
		);
		return;
	}

	$manifest = json_decode( file_get_contents( $manifest_path ), true );
	if ( ! $manifest ) {
		wp_register_script( 'bt-pairing-app-debug', '', array(), null, true );
		wp_enqueue_script( 'bt-pairing-app-debug' );
		wp_add_inline_script(
			'bt-pairing-app-debug',
			'console.warn("[pairing-app] manifest unreadable", ' . wp_json_encode( $manifest_path ) . ');',
			'before'
		);
		return;
	}

	$entry_key_candidates = array( '/src/main.jsx', 'src/main.jsx', '/src/main.js', 'src/main.js' );
	$entry                = null;
	foreach ( $entry_key_candidates as $k ) {
		if ( isset( $manifest[ $k ] ) ) {
			$entry = $manifest[ $k ];
			break;
		}
	}
	if ( ! $entry ) {
		$first = reset( $manifest );
		$entry = $first ?: null;
	}
	if ( ! $entry ) {
		wp_register_script( 'bt-pairing-app-debug', '', array(), null, true );
		wp_enqueue_script( 'bt-pairing-app-debug' );
		wp_add_inline_script(
			'bt-pairing-app-debug',
			'console.warn("[pairing-app] manifest missing entry keys", ' . wp_json_encode( array_keys( $manifest ) ) . ');',
			'before'
		);
		return;
	}

	if ( $entry && isset( $entry['file'] ) ) {
		if ( ! empty( $entry['css'] ) && is_array( $entry['css'] ) ) {
			foreach ( $entry['css'] as $css_file ) {
				$css_path = $theme_dir . '/pairing-app/dist/' . ltrim( $css_file, '/' );
				wp_enqueue_style(
					'bt-pairing-app-style-' . md5( $css_file ),
					$dist_url . '/' . ltrim( $css_file, '/' ),
					array(),
					file_exists( $css_path ) ? filemtime( $css_path ) : null
				);
			}
		}

		$script_url = $dist_url . '/' . ltrim( $entry['file'], '/' );
		$script_path = $theme_dir . '/pairing-app/dist/' . ltrim( $entry['file'], '/' );
		wp_register_script(
			'bt-pairing-app',
			$script_url,
			array(),
			null,
			true
		);
		wp_script_add_data( 'bt-pairing-app', 'type', 'module' );

		wp_localize_script(
			'bt-pairing-app',
			'PAIRING_APP',
			array(
				'siteUrl' => get_site_url(),
				'restUrl' => get_rest_url(),
				'nonce'   => wp_create_nonce( 'wp_rest' ),
				'isAdmin' => current_user_can( 'manage_options' ),
				'cacheHash' => get_option( 'bt_pairing_latest_hash', '' ),
			)
		);

		wp_add_inline_script(
			'bt-pairing-app',
			'console.info("[pairing-app] enqueue", ' . wp_json_encode( array( 'entry' => $entry ) ) . ');',
			'before'
		);
		wp_enqueue_script( 'bt-pairing-app' );
	}
}
add_action( 'wp_enqueue_scripts', 'bt_pairing_app_enqueue_assets' );

/**
 * Shortcode [pairing_app] — prints the root div where React will mount.
 */
function bt_pairing_app_shortcode( $atts = array() ) {
	global $bt_pairing_app_present;
	$bt_pairing_app_present = true;
	bt_pairing_app_enqueue_assets();
	return '<div id="pairing-app-root" aria-live="polite"></div><script>console.info("[pairing-app] shortcode rendered", { root: !!document.getElementById("pairing-app-root") });</script>';
}
add_shortcode( 'pairing_app', 'bt_pairing_app_shortcode' );
