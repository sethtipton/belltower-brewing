<?php
/**
 * Plugin Name: BT Pairing App
 * Description: Pairing React app, Gutenberg block, shortcode, and bt/v1 pairing REST endpoints.
 * Version: 1.0.0
 * Author: Belltower
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

require_once __DIR__ . '/includes/menu-snapshot.php';
require_once __DIR__ . '/includes/rest.php';

function bt_pairing_app_plugin_dir_path() {
	return plugin_dir_path( __FILE__ );
}

function bt_pairing_app_plugin_dir_url() {
	return plugin_dir_url( __FILE__ );
}

function bt_pairing_app_get_manifest_paths() {
	return array(
		bt_pairing_app_plugin_dir_path() . 'dist/.vite/manifest.json',
		bt_pairing_app_plugin_dir_path() . 'dist/manifest.json',
	);
}

function bt_pairing_app_get_manifest_path() {
	$paths = bt_pairing_app_get_manifest_paths();
	return $paths[0];
}

function bt_pairing_app_get_manifest() {
	static $manifest = null;
	if ( null !== $manifest ) {
		return $manifest;
	}
	foreach ( bt_pairing_app_get_manifest_paths() as $path ) {
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

function bt_pairing_app_get_entry() {
	$manifest = bt_pairing_app_get_manifest();
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

function bt_pairing_app_get_openai_config() {
	$key = '';
	$model = '';
	if ( defined( 'OPENAI_API_KEY' ) && is_string( OPENAI_API_KEY ) && '' !== trim( OPENAI_API_KEY ) ) {
		$key = trim( OPENAI_API_KEY );
	} elseif ( defined( 'BT_OPENAI_API_KEY' ) && is_string( BT_OPENAI_API_KEY ) && '' !== trim( BT_OPENAI_API_KEY ) ) {
		$key = trim( BT_OPENAI_API_KEY );
	}
	if ( defined( 'OPENAI_MODEL' ) && is_string( OPENAI_MODEL ) && '' !== trim( OPENAI_MODEL ) ) {
		$model = trim( OPENAI_MODEL );
	} elseif ( defined( 'BT_OPENAI_MODEL' ) && is_string( BT_OPENAI_MODEL ) && '' !== trim( BT_OPENAI_MODEL ) ) {
		$model = trim( BT_OPENAI_MODEL );
	}
	if ( '' === $model ) {
		$model = 'gpt-4.1-mini';
	}
	return array(
		'api_key' => $key,
		'model'   => $model,
	);
}

function bt_pairing_app_openai_error_response() {
	return new WP_REST_Response(
		array(
			'error'   => 'openai_not_configured',
			'message' => 'OpenAI API credentials are not configured. Define OPENAI_API_KEY (or BT_OPENAI_API_KEY).',
		),
		503
	);
}

function bt_pairing_app_activate() {
	if ( false === get_option( 'bt_pairing_feature_flags', false ) ) {
		update_option( 'bt_pairing_feature_flags', bt_pairing_feature_defaults(), false );
	}
}
register_activation_hook( __FILE__, 'bt_pairing_app_activate' );

function bt_pairing_app_bool_from_attr( $value, $default = true ) {
	if ( null === $value || '' === $value ) {
		return (bool) $default;
	}
	if ( is_bool( $value ) ) {
		return $value;
	}
	$raw = strtolower( trim( (string) $value ) );
	if ( in_array( $raw, array( '1', 'true', 'yes', 'on' ), true ) ) {
		return true;
	}
	if ( in_array( $raw, array( '0', 'false', 'no', 'off' ), true ) ) {
		return false;
	}
	return (bool) $default;
}

function bt_pairing_app_default_page_features() {
	$flags = bt_pairing_get_feature_flags();
	return array(
		'show_quiz'      => ! empty( $flags['help_form'] ),
		'show_flight'    => true,
		'show_history'   => ! empty( $flags['history'] ),
		'show_fun_facts' => ! empty( $flags['fun_facts'] ),
		'show_pairings'  => ! empty( $flags['food_pairings'] ),
	);
}

function bt_pairing_app_normalize_page_features( $raw = array() ) {
	$defaults = bt_pairing_app_default_page_features();
	return array(
		'show_quiz'      => bt_pairing_app_bool_from_attr( isset( $raw['show_quiz'] ) ? $raw['show_quiz'] : null, $defaults['show_quiz'] ),
		'show_flight'    => bt_pairing_app_bool_from_attr( isset( $raw['show_flight'] ) ? $raw['show_flight'] : null, $defaults['show_flight'] ),
		'show_history'   => bt_pairing_app_bool_from_attr( isset( $raw['show_history'] ) ? $raw['show_history'] : null, $defaults['show_history'] ),
		'show_fun_facts' => bt_pairing_app_bool_from_attr( isset( $raw['show_fun_facts'] ) ? $raw['show_fun_facts'] : null, $defaults['show_fun_facts'] ),
		'show_pairings'  => bt_pairing_app_bool_from_attr( isset( $raw['show_pairings'] ) ? $raw['show_pairings'] : null, $defaults['show_pairings'] ),
	);
}

function bt_pairing_app_set_page_features( $features ) {
	global $bt_pairing_app_page_features;
	$bt_pairing_app_page_features = bt_pairing_app_normalize_page_features( is_array( $features ) ? $features : array() );
}

function bt_pairing_app_get_page_features() {
	global $bt_pairing_app_page_features;
	if ( is_array( $bt_pairing_app_page_features ) ) {
		return bt_pairing_app_normalize_page_features( $bt_pairing_app_page_features );
	}
	return bt_pairing_app_default_page_features();
}

function bt_pairing_app_mark_present() {
	global $bt_pairing_app_present;
	$bt_pairing_app_present = true;
}

function bt_pairing_app_is_present() {
	global $bt_pairing_app_present;
	return ! empty( $bt_pairing_app_present );
}

function bt_pairing_app_scan_posts_for_embed( $posts ) {
	if ( is_admin() || ! is_array( $posts ) || bt_pairing_app_is_present() ) {
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
		if ( has_shortcode( $content, 'bt_pairing_app' ) || has_block( 'bt/pairing-app', $content ) ) {
			bt_pairing_app_mark_present();
			break;
		}
	}

	return $posts;
}
add_filter( 'the_posts', 'bt_pairing_app_scan_posts_for_embed', 10, 1 );

function bt_pairing_app_request_has_embed() {
	if ( bt_pairing_app_is_present() ) {
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
		if ( has_shortcode( $content, 'bt_pairing_app' ) || has_block( 'bt/pairing-app', $content ) ) {
			bt_pairing_app_mark_present();
			return true;
		}
	}

	return false;
}

function bt_pairing_app_enqueue_assets() {
	static $did_enqueue = false;
	if ( $did_enqueue ) {
		return;
	}

	$entry = bt_pairing_app_get_entry();
	if ( ! $entry || empty( $entry['file'] ) ) {
		return;
	}
	$did_enqueue = true;

	$dist_url  = bt_pairing_app_plugin_dir_url() . 'dist/';
	$dist_path = bt_pairing_app_plugin_dir_path() . 'dist/';

	if ( ! empty( $entry['css'] ) && is_array( $entry['css'] ) ) {
		foreach ( $entry['css'] as $css_file ) {
			$relative = ltrim( $css_file, '/' );
			$path     = $dist_path . $relative;
			$handle   = 'bt-pairing-app-style-' . md5( $relative );
			wp_enqueue_style(
				$handle,
				$dist_url . $relative,
				array(),
				file_exists( $path ) ? filemtime( $path ) : null
			);
		}
	}

	$script_relative = ltrim( $entry['file'], '/' );
	$script_path     = $dist_path . $script_relative;
	$handle          = 'bt-pairing-app-module';

	wp_register_script(
		$handle,
		$dist_url . $script_relative,
		array(),
		file_exists( $script_path ) ? filemtime( $script_path ) : null,
		true
	);
	wp_script_add_data( $handle, 'type', 'module' );

	$openai_configured = '' !== (string) bt_pairing_app_get_openai_config()['api_key'];

	wp_localize_script(
		$handle,
		'BT_PAIRING_APP_CONFIG',
		array(
				'features' => ( function() {
					$flags = bt_pairing_get_feature_flags();
						return array(
							'helpForm'     => ! empty( $flags['help_form'] ),
							'history'      => ! empty( $flags['history'] ),
							'funFacts'     => ! empty( $flags['fun_facts'] ),
							'fun_facts'    => ! empty( $flags['fun_facts'] ),
							'foodPairings' => ! empty( $flags['food_pairings'] ),
						);
					} )(),
				'pageFeatures' => bt_pairing_app_get_page_features(),
				'restUrl'   => get_rest_url(),
				'nonce'     => wp_create_nonce( 'wp_rest' ),
				'isAdmin'   => current_user_can( 'manage_options' ),
				'openaiConfigured' => $openai_configured,
				'cacheHash' => get_option( 'bt_pairing_latest_hash', '' ),
				'siteUrl'   => get_site_url(),
				'menuSnapshot' => bt_pairing_menu_get_snapshot(),
			)
		);

	$snapshot = bt_pairing_menu_get_snapshot();
	$inline_snapshot = wp_json_encode( $snapshot );
	if ( $inline_snapshot ) {
		$bootstrap = '(function(){'
			. 'var snapshot=' . $inline_snapshot . ';'
			. 'if(!snapshot||typeof snapshot!=="object"){return;}'
			. 'window.__BT_CANONICAL_MENU_SNAPSHOT=snapshot;'
			. 'window.__BT_DATA=window.__BT_DATA||{};'
			. 'if(snapshot.beer&&typeof snapshot.beer==="object"){window.__BT_DATA.beer=snapshot.beer;window.__BT_BEER_DATA=snapshot.beer;}'
			. 'if(snapshot.food&&typeof snapshot.food==="object"){window.__BT_DATA.food=snapshot.food;window.__BT_FOOD_DATA=snapshot.food;window.__BT_MENU_DATA=snapshot.food;}'
			. '})();';
		wp_add_inline_script( $handle, $bootstrap, 'before' );
	}

	$page_features_json = wp_json_encode( bt_pairing_app_get_page_features() );
	if ( $page_features_json ) {
		$page_bootstrap = '(function(){window.BT_PAIRING_APP_PAGE_FEATURES=' . $page_features_json . ';})();';
		wp_add_inline_script( $handle, $page_bootstrap, 'before' );
	}

	wp_enqueue_script( $handle );
}

function bt_pairing_app_force_module_script_tag( $tag, $handle, $src ) {
	if ( 'bt-pairing-app-module' !== $handle ) {
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
add_filter( 'script_loader_tag', 'bt_pairing_app_force_module_script_tag', 20, 3 );

function bt_pairing_app_maybe_enqueue_assets() {
	if ( is_admin() ) {
		return;
	}
	if ( bt_pairing_app_request_has_embed() ) {
		bt_pairing_app_enqueue_assets();
	}
}
add_action( 'wp_enqueue_scripts', 'bt_pairing_app_maybe_enqueue_assets' );

function bt_pairing_app_maybe_enqueue_assets_late() {
	if ( is_admin() || ! bt_pairing_app_is_present() ) {
		return;
	}
	bt_pairing_app_enqueue_assets();
}
add_action( 'wp_footer', 'bt_pairing_app_maybe_enqueue_assets_late', 1 );

function bt_pairing_app_render_mount( $page_features = array() ) {
	bt_pairing_app_mark_present();
	$normalized = bt_pairing_app_normalize_page_features( is_array( $page_features ) ? $page_features : array() );
	bt_pairing_app_set_page_features( $normalized );
	return sprintf(
		'<div id="bt-pairing-app-root" aria-live="polite" data-show-quiz="%1$s" data-show-flight="%2$s" data-show-history="%3$s" data-show-fun-facts="%4$s" data-show-pairings="%5$s"></div>',
		$normalized['show_quiz'] ? '1' : '0',
		$normalized['show_flight'] ? '1' : '0',
		$normalized['show_history'] ? '1' : '0',
		$normalized['show_fun_facts'] ? '1' : '0',
		$normalized['show_pairings'] ? '1' : '0'
	);
}

function bt_pairing_app_shortcode( $atts = array() ) {
	$defaults = bt_pairing_app_default_page_features();
	$atts = shortcode_atts(
		array(
			'show_quiz'      => $defaults['show_quiz'] ? '1' : '0',
			'show_flight'    => $defaults['show_flight'] ? '1' : '0',
			'show_history'   => $defaults['show_history'] ? '1' : '0',
			'show_fun_facts' => $defaults['show_fun_facts'] ? '1' : '0',
			'show_pairings'  => $defaults['show_pairings'] ? '1' : '0',
		),
		$atts,
		'bt_pairing_app'
	);
	return bt_pairing_app_render_mount( $atts );
}
add_shortcode( 'bt_pairing_app', 'bt_pairing_app_shortcode' );

function bt_pairing_app_block_render_callback( $attributes, $content ) {
	unset( $content );
	$raw = is_array( $attributes ) ? $attributes : array();
	return bt_pairing_app_render_mount(
		array(
			'show_quiz'      => isset( $raw['show_quiz'] ) ? $raw['show_quiz'] : null,
			'show_flight'    => isset( $raw['show_flight'] ) ? $raw['show_flight'] : null,
			'show_history'   => isset( $raw['show_history'] ) ? $raw['show_history'] : null,
			'show_fun_facts' => isset( $raw['show_fun_facts'] ) ? $raw['show_fun_facts'] : null,
			'show_pairings'  => isset( $raw['show_pairings'] ) ? $raw['show_pairings'] : null,
		)
	);
}

function bt_pairing_app_register_block() {
	wp_register_script(
		'bt-pairing-app-block-editor',
		bt_pairing_app_plugin_dir_url() . 'assets/block-editor.js',
		array( 'wp-blocks', 'wp-element', 'wp-block-editor' ),
		filemtime( bt_pairing_app_plugin_dir_path() . 'assets/block-editor.js' ),
		true
	);

	register_block_type(
		'bt/pairing-app',
		array(
			'api_version'     => 2,
			'editor_script'   => 'bt-pairing-app-block-editor',
			'render_callback' => 'bt_pairing_app_block_render_callback',
		)
	);
}
add_action( 'init', 'bt_pairing_app_register_block' );
