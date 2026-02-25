<?php
/**
 * Plugin Name: BT Parking Guide
 * Description: Parking guide React app, Gutenberg block, shortcode, and map persistence API.
 * Version: 1.0.0
 * Author: Belltower
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

require_once __DIR__ . '/includes/map-storage.php';
require_once __DIR__ . '/includes/rest.php';

function bt_parking_guide_plugin_dir_path() {
	return plugin_dir_path( __FILE__ );
}

function bt_parking_guide_plugin_dir_url() {
	return plugin_dir_url( __FILE__ );
}

function bt_parking_guide_get_manifest_paths() {
	return array(
		bt_parking_guide_plugin_dir_path() . 'dist/.vite/manifest.json',
		bt_parking_guide_plugin_dir_path() . 'dist/manifest.json',
	);
}

function bt_parking_guide_get_manifest_path() {
	$paths = bt_parking_guide_get_manifest_paths();
	return $paths[0];
}

function bt_parking_guide_get_manifest() {
	static $manifest = null;
	if ( null !== $manifest ) {
		return $manifest;
	}
	foreach ( bt_parking_guide_get_manifest_paths() as $path ) {
		if ( ! file_exists( $path ) ) {
			continue;
		}
		$raw = file_get_contents( $path );
		if ( false === $raw ) {
			continue;
		}
		$decoded = json_decode( $raw, true );
		if ( is_array( $decoded ) ) {
			$manifest = $decoded;
			return $manifest;
		}
	}
	$manifest = array();
	return $manifest;
}

function bt_parking_guide_get_entry() {
	$manifest = bt_parking_guide_get_manifest();
	$candidates = array( 'index.html', '/src/main.jsx', 'src/main.jsx', '/src/main.js', 'src/main.js' );
	foreach ( $candidates as $candidate ) {
		if ( isset( $manifest[ $candidate ] ) && is_array( $manifest[ $candidate ] ) ) {
			return $manifest[ $candidate ];
		}
	}
	foreach ( $manifest as $entry ) {
		if ( is_array( $entry ) && ! empty( $entry['file'] ) ) {
			return $entry;
		}
	}
	return null;
}

function bt_parking_guide_mark_present() {
	global $bt_parking_guide_present;
	$bt_parking_guide_present = true;
}

function bt_parking_guide_is_present() {
	global $bt_parking_guide_present;
	return ! empty( $bt_parking_guide_present );
}

function bt_parking_guide_scan_posts_for_embed( $posts ) {
	if ( is_admin() || ! is_array( $posts ) || bt_parking_guide_is_present() ) {
		return $posts;
	}

	foreach ( $posts as $post_item ) {
		if ( ! ( $post_item instanceof WP_Post ) ) {
			continue;
		}
		$content = isset( $post_item->post_content ) ? (string) $post_item->post_content : '';
		if ( '' === trim( $content ) ) {
			continue;
		}
		if ( has_shortcode( $content, 'bt_parking_guide' ) || has_block( 'bt/parking-guide', $content ) ) {
			bt_parking_guide_mark_present();
			break;
		}
	}

	return $posts;
}
add_filter( 'the_posts', 'bt_parking_guide_scan_posts_for_embed', 10, 1 );

function bt_parking_guide_request_has_embed() {
	if ( bt_parking_guide_is_present() ) {
		return true;
	}

	$posts = array();
	$current_post = get_post();
	if ( $current_post instanceof WP_Post ) {
		$posts[] = $current_post;
	}

	global $wp_query;
	if ( isset( $wp_query ) && isset( $wp_query->posts ) && is_array( $wp_query->posts ) ) {
		foreach ( $wp_query->posts as $query_post ) {
			if ( $query_post instanceof WP_Post ) {
				$posts[] = $query_post;
			}
		}
	}

	foreach ( $posts as $post_item ) {
		$content = isset( $post_item->post_content ) ? (string) $post_item->post_content : '';
		if ( '' === trim( $content ) ) {
			continue;
		}
		if ( has_shortcode( $content, 'bt_parking_guide' ) || has_block( 'bt/parking-guide', $content ) ) {
			bt_parking_guide_mark_present();
			return true;
		}
	}

	return false;
}

function bt_parking_guide_enqueue_assets() {
	static $did_enqueue = false;
	if ( $did_enqueue ) {
		return;
	}

	$entry = bt_parking_guide_get_entry();
	if ( ! $entry || empty( $entry['file'] ) ) {
		return;
	}
	$did_enqueue = true;

	$dist_url  = bt_parking_guide_plugin_dir_url() . 'dist/';
	$dist_path = bt_parking_guide_plugin_dir_path() . 'dist/';

	if ( ! empty( $entry['css'] ) && is_array( $entry['css'] ) ) {
		foreach ( $entry['css'] as $css_file ) {
			$relative = ltrim( $css_file, '/' );
			$path     = $dist_path . $relative;
			$handle   = 'bt-parking-guide-style-' . md5( $relative );
			wp_enqueue_style(
				$handle,
				$dist_url . $relative,
				array(),
				file_exists( $path ) ? filemtime( $path ) : null
			);
		}
	}

	$script_relative = ltrim( $entry['file'], '/' );
	$handle          = 'bt-parking-guide-module';

	wp_register_script(
		$handle,
		$dist_url . $script_relative,
		array(),
		null,
		true
	);
	wp_script_add_data( $handle, 'type', 'module' );

	wp_localize_script(
		$handle,
		'BT_PARKING_GUIDE_CONFIG',
		array(
			'restUrl'     => get_rest_url(),
			'nonce'       => wp_create_nonce( 'wp_rest' ),
			'isAdmin'     => current_user_can( 'manage_options' ),
			'mapEndpoint' => rest_url( 'bt-parking/v1/map' ),
		)
	);

	wp_enqueue_script( $handle );
}

function bt_parking_guide_force_module_script_tag( $tag, $handle, $src ) {
	if ( 'bt-parking-guide-module' !== $handle ) {
		return $tag;
	}
	if ( false !== strpos( $tag, ' type="module"' ) || false !== strpos( $tag, " type='module'" ) ) {
		return $tag;
	}
	$normalized_src = esc_url( $src );
	return sprintf(
		'<script type="module" src="%1$s" id="%2$s-js"></script>',
		$normalized_src,
		esc_attr( $handle )
	);
}
add_filter( 'script_loader_tag', 'bt_parking_guide_force_module_script_tag', 20, 3 );

function bt_parking_guide_maybe_enqueue_assets() {
	if ( is_admin() ) {
		return;
	}
	if ( bt_parking_guide_request_has_embed() ) {
		bt_parking_guide_enqueue_assets();
	}
}
add_action( 'wp_enqueue_scripts', 'bt_parking_guide_maybe_enqueue_assets' );

function bt_parking_guide_maybe_enqueue_assets_late() {
	if ( is_admin() || ! bt_parking_guide_is_present() ) {
		return;
	}
	bt_parking_guide_enqueue_assets();
}
add_action( 'wp_footer', 'bt_parking_guide_maybe_enqueue_assets_late', 1 );

function bt_parking_guide_render_mount() {
	bt_parking_guide_mark_present();
	return '<div id="bt-parking-guide-root" aria-live="polite"></div>';
}

function bt_parking_guide_shortcode( $atts = array() ) {
	unset( $atts );
	return bt_parking_guide_render_mount();
}
add_shortcode( 'bt_parking_guide', 'bt_parking_guide_shortcode' );

function bt_parking_guide_block_render_callback( $attributes, $content ) {
	unset( $attributes, $content );
	return bt_parking_guide_render_mount();
}

function bt_parking_guide_register_block() {
	wp_register_script(
		'bt-parking-guide-block-editor',
		bt_parking_guide_plugin_dir_url() . 'assets/block-editor.js',
		array( 'wp-blocks', 'wp-element', 'wp-block-editor' ),
		filemtime( bt_parking_guide_plugin_dir_path() . 'assets/block-editor.js' ),
		true
	);

	register_block_type(
		'bt/parking-guide',
		array(
			'api_version'     => 2,
			'editor_script'   => 'bt-parking-guide-block-editor',
			'render_callback' => 'bt_parking_guide_block_render_callback',
		)
	);
}

function bt_parking_guide_activate() {
	bt_parking_guide_register_post_type();
	bt_parking_guide_ensure_default_map();
	flush_rewrite_rules();
}
register_activation_hook( __FILE__, 'bt_parking_guide_activate' );

function bt_parking_guide_after_init() {
	bt_parking_guide_register_post_type();
	bt_parking_guide_register_block();
}
add_action( 'init', 'bt_parking_guide_after_init' );
