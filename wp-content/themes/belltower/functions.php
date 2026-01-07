<?php
/**
 * belltower functions and definitions
 *
 * @link https://developer.wordpress.org/themes/basics/theme-functions/
 *
 * @package belltower
 */

if ( ! defined( '_S_VERSION' ) ) {
	// Replace the version number of the theme on each release.
	define( '_S_VERSION', '1.0.0' );
}

// OpenAI keys should be defined in wp-config.php or a private secrets file (e.g., BT_OPENAI_API_KEY).
if ( ! defined( 'OPENAI_API_KEY' ) && defined( 'BT_OPENAI_API_KEY' ) ) {
	define( 'OPENAI_API_KEY', BT_OPENAI_API_KEY );
}
if ( ! defined( 'OPENAI_MODEL' ) && defined( 'BT_OPENAI_MODEL' ) ) {
	define( 'OPENAI_MODEL', BT_OPENAI_MODEL );
}
// Fallback placeholders (no real keys in repo).
if ( ! defined( 'OPENAI_API_KEY' ) ) {
	define( 'OPENAI_API_KEY', '' );
}
if ( ! defined( 'OPENAI_MODEL' ) ) {
	define( 'OPENAI_MODEL', 'gpt-4.1-mini' );
}

if ( ! function_exists( 'belltower_setup' ) ) :
	/**
	 * Sets up theme defaults and registers support for various WordPress features.
	 *
	 * Note that this function is hooked into the after_setup_theme hook, which
	 * runs before the init hook. The init hook is too late for some features, such
	 * as indicating support for post thumbnails.
	 */
	function belltower_setup() {
		/*
		 * Make theme available for translation.
		 * Translations can be filed in the /languages/ directory.
		 * If you're building a theme based on belltower, use a find and replace
		 * to change 'belltower' to the name of your theme in all the template files.
		 */
		load_theme_textdomain( 'belltower', get_template_directory() . '/languages' );

		// Add default posts and comments RSS feed links to head.
		add_theme_support( 'automatic-feed-links' );

		add_theme_support('editor-styles');
		add_editor_style( 'style.css' );

		function custom_excerpt_more($more) {
			return ' […] <a class="read-more" href="' . get_permalink(get_the_ID()) . '">Read More</a>';
		}
		add_filter('excerpt_more', 'custom_excerpt_more');
		

		/*
		 * Let WordPress manage the document title.
		 * By adding theme support, we declare that this theme does not use a
		 * hard-coded <title> tag in the document head, and expect WordPress to
		 * provide it for us.
		 */
		add_theme_support( 'title-tag' );

		/*
		 * Enable support for Post Thumbnails on posts and pages.
		 *
		 * @link https://developer.wordpress.org/themes/functionality/featured-images-post-thumbnails/
		 */
		add_theme_support( 'post-thumbnails' );

		// This theme uses wp_nav_menu() in one location.
		register_nav_menus(
			array(
				'menu-1' => esc_html__( 'Primary', 'belltower' ),
				'footer-1' => esc_html__( 'Footer', 'belltower' ),
				'social-1' => esc_html__( 'Social', 'belltower' ),
			)
		);

		/*
		 * Switch default core markup for search form, comment form, and comments
		 * to output valid HTML5.
		 */
		add_theme_support(
			'html5',
			array(
				'search-form',
				'comment-form',
				'comment-list',
				'gallery',
				'caption',
				'style',
				'script',
			)
		);

		// Set up the WordPress core custom background feature.
		add_theme_support(
			'custom-background',
			apply_filters(
				'belltower_custom_background_args',
				array(
					'default-color' => 'ffffff',
					'default-image' => '',
				)
			)
		);

		// Add theme support for selective refresh for widgets.
		add_theme_support( 'customize-selective-refresh-widgets' );

		/**
		 * Add support for core custom logo.
		 *
		 * @link https://codex.wordpress.org/Theme_Logo
		 */
		add_theme_support(
			'custom-logo',
			array(
				'height'      => 250,
				'width'       => 250,
				'flex-width'  => true,
				'flex-height' => true,
			)
		);

		// Disable Gutenberg Custom Colors
		add_theme_support( 'disable-custom-colors' );

		// Disable Gutenberg Custom Gradients
		add_theme_support( 'disable-custom-gradients' );

		$btdarkestgreen = '#515441';
		// a11y fail $btdarkgreen    = '#808166';
		$btdarkgreen    = '#585945';
		$btblack        = '#231F20';
		$btpink         = '#E0CDC0';
		$btlightgreen   = '#BAB488';
		$btyellow       = '#b8a881';
		$btred          = '#BA583B';
		$btwhite        = '#E5E5E5';
		$btpurewhite    = '#FFFFFF';

		// Editor Color Palette
		add_theme_support( 'editor-color-palette', array(
			array(
				'name'  => __( 'Darkest Green', 'belltower' ),
				'slug'  => 'darkest-green',
				'color'	=> $btdarkestgreen,
			),
			array(
				'name'  => __( 'Dark Green', 'belltower' ),
				'slug'  => 'dark-green',
				'color'	=> $btdarkgreen,
			),
			array(
				'name'	=> __( 'Black', 'belltower' ),
				'slug'	=> 'black',
				'color'	=> $btblack,
			),
			array(
				'name'  => __( 'Pink', 'belltower' ),
				'slug'  => 'pink',
				'color'	=> $btpink,
			),
			array(
				'name'  => __( 'Light Green', 'belltower' ),
				'slug'  => 'light-green',
				'color' => $btlightgreen,
			),
			array(
				'name'  => __( 'Yellow', 'belltower' ),
				'slug'  => 'yellow',
				'color' => $btyellow,
			),
			array(
				'name'  => __( 'Red', 'belltower' ),
				'slug'  => 'red',
				'color' => $btred,
			),
			array(
				'name'	=> __( 'White', 'belltower' ),
				'slug'	=> 'white',
				'color'	=> $btwhite,
			),
			array(
				'name'	=> __( 'Pure White', 'belltower' ),
				'slug'	=> 'pure-white',
				'color'	=> $btpurewhite,
			),
		) );


		function display_events_by_date() {
			ob_start(); // Start output buffering
		
			$paged = (get_query_var('paged')) ? get_query_var('paged') : 1;
			$args = array(
				'post_type' => 'post',
				'post_status' => 'publish',
				'category_name' => 'events',
				'posts_per_page' => 10,
				'paged' => $paged,
				'meta_key' => 'event_date', // ACF field name
				'orderby' => 'meta_value', // Order by the meta value
				'order' => 'ASC', // Ascending order
				'meta_query' => array(
					array(
						'key' => 'event_date',
						'value' => date('Ymd'), // Current date in Ymd format
						'compare' => '>=', // Show events from today onwards
						'type' => 'DATE'
					),
				),
			);
			$arr_posts = new WP_Query($args);
		
			if ($arr_posts->have_posts()) :
				echo '<ul class="wp-block-latest-posts__list wp-block-latest-posts event-feed cwidth">'; // Start of the list
				while ($arr_posts->have_posts()) : $arr_posts->the_post();
					$post_link = esc_url(get_permalink());
					$title = get_the_title();
		
					// Check if title is empty and provide default
					$title = $title ? $title : __('(no title)');
		
					echo '<li>';
					// Featured Image
					if (has_post_thumbnail()) {
						$featured_image = get_the_post_thumbnail(null, 'full', array('class' => 'wp-block-latest-posts__featured-image alignleft', 'style' => 'max-width: 450px; height: auto;',
					));
						echo sprintf('<a href="%1$s">%2$s</a>', $post_link, $featured_image);
					}
		
					// Title
					echo sprintf('<a class="wp-block-latest-posts__post-title" href="%1$s">%2$s</a>', $post_link, esc_html($title));
		
					// Post Meta (Date, Author)
					// Adjust or remove these sections based on your requirements
					echo '<div class="wp-block-latest-posts__post-meta">';
					//echo '<span class="post-date">' . get_the_date() . '</span>';

					// Retrieve the event_date field
					$event_date = get_field('event_date');
					$formatted_date = $event_date ? date_i18n('F j, Y', strtotime($event_date)) : '';
					if ($formatted_date) {
						echo '<div class="event-date">Join Us on ' . esc_html($formatted_date) . '</div>';
					}
		
					// Excerpt
					echo '<div class="wp-block-latest-posts__post-excerpt">';
					echo get_the_excerpt();
					echo '</div>';

                                        if ( get_field( 'google_calendar_link' ) ) :
                                                $calendar_link = get_field( 'google_calendar_link' );
                                                echo '<a class="googlecal" target="_blank" href="' . esc_url( $calendar_link ) . '">Add this event to your Google calendar</a>';
                                        endif;
		
					echo '</li>';
				endwhile;
				echo '</ul>'; // End of the list
			endif;
		
			wp_reset_postdata(); // Reset post data
		
			return ob_get_clean(); // Return the buffered output
		}
		add_shortcode('events_by_date', 'display_events_by_date');
		
		

	}
endif;
add_action( 'after_setup_theme', 'belltower_setup' );

/**
 * Set the content width in pixels, based on the theme's design and stylesheet.
 *
 * Priority 0 to make it available to lower priority callbacks.
 *
 * @global int $content_width
 */
function belltower_content_width() {
	// This variable is intended to be overruled from themes.
	// Open WPCS issue: {@link https://github.com/WordPress-Coding-Standards/WordPress-Coding-Standards/issues/1043}.
	// phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound
	$GLOBALS['content_width'] = apply_filters( 'belltower_content_width', 640 );
}
add_action( 'after_setup_theme', 'belltower_content_width', 0 );

/**
 * Set a custom Excerpt Length.
 */
/*
function wpdocs_custom_excerpt_length( $length ) {
	return 100;
}
add_filter( 'excerpt_length', 'wpdocs_custom_excerpt_length', 999 );
*/

/**
 * Register widget area.
 *
 * @link https://developer.wordpress.org/themes/functionality/sidebars/#registering-a-sidebar
 */
function belltower_widgets_init() {
	register_sidebar(
		array(
			'name'          => esc_html__( 'Homepage Hero Text', 'belltower' ),
			'id'            => 'bt-home-hero',
			'description'   => esc_html__( 'Add widgets here to change the text in the homepage hero.', 'belltower' ),
			'before_widget' => '<div id="%1$s" class="widget %2$s">',
			'after_widget'  => '</div>',
			'before_title'  => '<h2 class="widget-title">',
			'after_title'   => '</h2>',
		)
	);
	register_sidebar(
		array(
			'name'          => esc_html__( 'Sidebar', 'belltower' ),
			'id'            => 'sidebar-1',
			'description'   => esc_html__( 'Add widgets here.', 'belltower' ),
			'before_widget' => '<section id="%1$s" class="widget %2$s">',
			'after_widget'  => '</section>',
			'before_title'  => '<h2 class="widget-title">',
			'after_title'   => '</h2>',
		)
	);
	register_sidebar(
		array(
			'name'          => esc_html__( 'Footer Contact', 'belltower' ),
			'id'            => 'footer-contact',
			'description'   => esc_html__( 'Add footer widgets here for contact info column.', 'belltower' ),
			'before_widget' => '<div id="%1$s" class="widget %2$s">',
			'after_widget'  => '</div>',
			'before_title'  => '<h2 class="widget-title">',
			'after_title'   => '</h2>',
		)
	);
	register_sidebar(
		array(
			'name'          => esc_html__( 'Footer Newsletter', 'belltower' ),
			'id'            => 'footer-newsletter',
			'description'   => esc_html__( 'Add footer widgets here for contact form column.', 'belltower' ),
			'before_widget' => '<div id="%1$s" class="widget %2$s">',
			'after_widget'  => '</div>',
			'before_title'  => '<h2 class="widget-title">',
			'after_title'   => '</h2>',
		)
	);
}
add_action( 'widgets_init', 'belltower_widgets_init' );

/**
 * Enqueue scripts and styles.
 */
function belltower_scripts() {
	wp_enqueue_style( 'belltower-style', get_stylesheet_uri(), [], _S_VERSION );
	wp_style_add_data( 'belltower-style', 'rtl', 'replace' );
	wp_enqueue_script( 'belltower-navigation', get_template_directory_uri() . '/js/navigation.js', [], _S_VERSION, true );
	wp_enqueue_script( 'belltower-skip-link-focus-fix', get_template_directory_uri() . '/js/skip-link-focus-fix.js', [], _S_VERSION, true );
	$profiles_ver = filemtime( get_stylesheet_directory() . '/js/pairing-profiles.js' );
	wp_enqueue_script( 'belltower-pairing-profiles', get_stylesheet_directory_uri() . '/js/pairing-profiles.js', [], $profiles_ver, true );
	$ver = filemtime( get_stylesheet_directory() . '/js/menu-from-sheets.js' );
	wp_enqueue_script( 'belltower-menu', get_stylesheet_directory_uri() . '/js/menu-from-sheets.js', array( 'belltower-pairing-profiles' ), $ver, true );
	$sheetId = '1o79G07EDWRihxOlh9GSJvG-_VBaE5ByZULdd_6lqm7Q';
	$gid     = 0;
	$csvURL  = "https://docs.google.com/spreadsheets/d/{$sheetId}/export?format=csv&gid={$gid}";
	$drinks_csv = "https://docs.google.com/spreadsheets/d/{$sheetId}/gviz/tq?tqx=out:csv&sheet=" . rawurlencode( 'Drinks' );
	wp_localize_script(
		'belltower-menu',
		'belltowerMenu',
		[
			'csvURL'       => $csvURL,
			'drinksCsvURL' => $drinks_csv,
		]
	);
	$untappd_ver = filemtime( get_stylesheet_directory() . '/js/untappd-menu.js' );
	wp_enqueue_script( 'belltower-untappd-menu', get_stylesheet_directory_uri() . '/js/untappd-menu.js', array( 'belltower-pairing-profiles' ), $untappd_ver, true );

	if ( is_singular() && comments_open() && get_option( 'thread_comments' ) ) {
		wp_enqueue_script( 'comment-reply' );
	}
}
add_action( 'wp_enqueue_scripts', 'belltower_scripts' );

function belltower_menu_shortcode( $atts ) {
	$atts = shortcode_atts( [ 'category' => '' ], $atts, 'brewery_menu' );
	$cat  = esc_attr( $atts['category'] );

	return sprintf(
		'<div class="brewery-menu" data-category="%s"></div>',
		$cat
	);
}
add_shortcode( 'brewery_menu', 'belltower_menu_shortcode' );

function belltower_drinks_menu_shortcode( $atts ) {
	$atts = shortcode_atts( [ 'category' => '' ], $atts, 'drinks_menu' );
	$cat  = esc_attr( $atts['category'] );

	return sprintf(
		'<div class="drinks-menu" data-category="%s"></div>',
		$cat
	);
}
add_shortcode( 'drinks_menu', 'belltower_drinks_menu_shortcode' );

/**
 * Keg list shortcode: [keg_list type="retail|wholesale|both"].
 */
function belltower_enqueue_keg_list_assets() {
	static $enqueued = false;
	if ( $enqueued ) {
		return;
	}
	$ver = filemtime( get_stylesheet_directory() . '/js/keg-list.js' );
	wp_enqueue_script( 'belltower-keg-list', get_stylesheet_directory_uri() . '/js/keg-list.js', array(), $ver, true );

	$base_csv = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRH9pj_Qm42Yes2dksIPJIYAx3-0RdJr7hX_1rEQsKAaeDMrqBdNS0JE2tvNlMQReTOC2IHAwdT_Kvx/pub?output=csv';
	wp_localize_script(
		'belltower-keg-list',
		'kegListConfig',
		array(
			'baseCsv' => $base_csv,
			'sheets'  => array(
				'retail'    => 'Retail Keg Pricing',
				'wholesale' => 'Wholesale Keg Pricing',
			),
		)
	);

	$enqueued = true;
}

function belltower_keg_list_shortcode( $atts = array() ) {
	$atts = shortcode_atts(
		array(
			'type' => 'retail',
		),
		$atts,
		'keg_list'
	);

	$type = strtolower( $atts['type'] );
	if ( ! in_array( $type, array( 'retail', 'wholesale', 'both' ), true ) ) {
		$type = 'retail';
	}

	belltower_enqueue_keg_list_assets();

	return sprintf(
		'<div class="keg-list" data-type="%s" aria-live="polite"></div>',
		esc_attr( $type )
	);
}
add_shortcode( 'keg_list', 'belltower_keg_list_shortcode' );

function belltower_untappd_menu_shortcode( $atts ) {
	$atts = shortcode_atts(
		[
			'location_id' => '38757',
			'menu_id'     => '150549',
			'class'       => '',
			'id'          => '',
		],
		$atts,
		'untappd_menu'
	);

	$container_id = $atts['id']
		? sanitize_html_class( $atts['id'] )
		: 'bt-untappd-' . wp_generate_uuid4();

	$class_attr = $atts['class'] ? ' ' . esc_attr( $atts['class'] ) : '';

	// Ensure the embed + snapshot script is present.
	wp_enqueue_script( 'belltower-untappd-menu' );

	return sprintf(
		'<div id="%1$s" class="cwidth bt-untappd-menu%2$s" data-location-id="%3$s" data-menu-id="%4$s"></div>',
		esc_attr( $container_id ),
		$class_attr,
		esc_attr( $atts['location_id'] ),
		esc_attr( $atts['menu_id'] )
	);
}
add_shortcode( 'untappd_menu', 'belltower_untappd_menu_shortcode' );

require_once get_stylesheet_directory() . '/pairing-app/pairing-app-loader.php';

// Ensure the pairing app bundle loads as an ES module.
add_filter(
	'script_loader_tag',
	function( $tag, $handle, $src ) {
		if ( 'bt-pairing-app' === $handle ) {
			// Emit as ES module for Vite dev/prod.
			return sprintf(
				'<script type="module" id="%s-js" src="%s"></script>',
				esc_attr( $handle ),
				esc_url( $src )
			);
		}
		return $tag;
	},
	10,
	3
);

function belltower_legend_shortcode() {
	return '<div class="brewery-legend"></div>';
}
add_shortcode( 'brewery_legend', 'belltower_legend_shortcode' );

add_action( 'init', function() {
	register_post_type( 'partner', [
		'labels'       => [
			'name'          => 'Partners',
			'singular_name' => 'Partner',
		],
		'public'       => true,
		'has_archive'  => false,
		'show_in_rest' => true,
		'supports'     => [ 'title' ],
	] );
} );

add_shortcode( 'partners_grid', function() {

	$query = new WP_Query( [
		'post_type'      => 'partner',
		'posts_per_page' => -1,
		'orderby'        => 'title',
		'order'          => 'ASC',
	] );

	if ( ! $query->have_posts() ) {
		return '<p>No partners found.</p>';
	}

	// unique id for accessible labeling
	$label_id = 'partners-' . esc_attr( uniqid() );
	$html  = '<section class="partners-grid" aria-labelledby="' . $label_id . '">';
	$html .= '<ul class="partners-list" role="list">';

	while ( $query->have_posts() ) {
		$query->the_post();
		$display_name = get_the_title();
		$website_url  = get_field( 'website' );

		$label_parts = array_filter( [
			$display_name ? wp_strip_all_tags( $display_name ) : '',
		] );
		$label = implode( ' — ', $label_parts );

		// Build HTML-safe label with part-after-dash wrapped in a span.
		// This handles en-dash (U+2013), em-dash (U+2014) and regular hyphen.
		$label_html = esc_html( $label ); // fallback
		if ( preg_match( '/[\x{2013}\x{2014}-]/u', $label ) ) {
			$parts = preg_split( '/\s*[\x{2013}\x{2014}-]\s*/u', $label, 2 );
			$before = isset( $parts[0] ) ? $parts[0] : '';
			$after  = isset( $parts[1] ) ? $parts[1] : '';

			// keep the visible dash outside the location span (you can move it inside if you prefer)
			$label_html = esc_html( $before )
			            . ' <span class="partner-sep" aria-hidden="true">–</span> '
			            . '<span class="partner-location">' . esc_html( $after ) . '</span>';
		}

		$html .= '<li class="partner" role="listitem">';
		if ( $website_url ) {
			$html .= '<a class="partner-link" href="' . esc_url( $website_url ) . '" target="_blank" rel="noopener noreferrer">'
			       . $label_html
			       . '<span class="screen-reader-text"> — opens in a new tab</span>'
				   . '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" role="img" aria-label="Open in new window">
						<path data-anim d="M3 3h18v18H3z M14 3h7v7 M10 14L21 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
						</svg>'
			       . '</a>';
		} else {
			$html .= '<span class="partner-name">' . $label_html . '</span>';
		}
		$html .= '</li>';
	}

	wp_reset_postdata();

	$html .= '</ul>';
	$html .= '</section>';

	return $html;
} );

/**
 * Beer color REST endpoint: batches descriptions to Responses API and returns SRM/hex.
 */
add_action(
	'rest_api_init',
	function() {
		register_rest_route(
			'bt/v1',
			'/beer-colors',
			array(
				'methods'             => 'POST',
				'callback'            => 'bt_beer_colors_handler',
				'permission_callback' => '__return_true', // Consider tightening if needed.
			)
		);
	}
);

function bt_beer_colors_handler( WP_REST_Request $request ) {
	$body = $request->get_json_params();
	if ( empty( $body['items'] ) || ! is_array( $body['items'] ) ) {
		return new WP_REST_Response( array( 'error' => 'missing items' ), 400 );
	}

	$items = array_map(
		function( $it ) {
			return array(
				'id'          => isset( $it['id'] ) ? (string) $it['id'] : '',
				'description' => isset( $it['description'] ) ? (string) $it['description'] : '',
			);
		},
		$body['items']
	);

	$cache_key = 'bt_beer_colors_' . md5( wp_json_encode( $items ) );
	$cached    = get_transient( $cache_key );
	if ( $cached ) {
		return rest_ensure_response( $cached );
	}

	$prompt = bt_build_color_extractor_prompt( $items );

	$payload = array(
		'model' => OPENAI_MODEL,
		'input' => array(
			array(
				'role'    => 'user',
				'content' => $prompt,
			),
		),
	);

	// Log payload metrics for debugging.
	error_log(
		'[bt_beer_colors] request ' . wp_json_encode(
			array(
				'model'       => OPENAI_MODEL,
				'items_count' => count( $items ),
				'payload_len' => strlen( wp_json_encode( $payload ) ),
				'prompt'      => $prompt,
			)
		)
	);

	$response = wp_remote_post(
		'https://api.openai.com/v1/responses',
		array(
			'headers' => array(
				'Authorization' => 'Bearer ' . OPENAI_API_KEY,
				'Content-Type'  => 'application/json',
			),
			'body'    => wp_json_encode( $payload ),
			'timeout' => 20,
		)
	);

	// Debug logging for connectivity issues.
	$log_ctx = array(
		'route'       => 'beer-colors',
		'url'         => 'https://api.openai.com/v1/responses',
		'model'       => OPENAI_MODEL,
		'items_count' => count( $items ),
		'payload_len' => strlen( wp_json_encode( $payload ) ),
	);
	if ( is_wp_error( $response ) ) {
		error_log( '[bt_beer_colors] error ' . wp_json_encode( array_merge( $log_ctx, array( 'error' => $response->get_error_message() ) ) ) );
		return new WP_REST_Response( array( 'error' => $response->get_error_message() ), 500 );
	}
	$http_code = wp_remote_retrieve_response_code( $response );
	error_log( '[bt_beer_colors] response ' . wp_json_encode( array_merge( $log_ctx, array( 'status' => $http_code ) ) ) );

	if ( is_wp_error( $response ) ) {
		return new WP_REST_Response( array( 'error' => $response->get_error_message() ), 500 );
	}

	$code       = wp_remote_retrieve_response_code( $response );
	$resp_body  = wp_remote_retrieve_body( $response );
	$resp_dec   = json_decode( $resp_body, true );
	$answer_txt = '';

	if ( isset( $resp_dec['output'][0]['content'][0]['text'] ) ) {
		$answer_txt = $resp_dec['output'][0]['content'][0]['text'];
	} elseif ( isset( $resp_dec['output_text'] ) ) {
		$answer_txt = $resp_dec['output_text'];
	} elseif ( isset( $resp_dec['output'][0]['text'] ) ) {
		$answer_txt = $resp_dec['output'][0]['text'];
	} elseif ( isset( $resp_dec['output'][0]['content'] ) && is_array( $resp_dec['output'][0]['content'] ) ) {
		foreach ( $resp_dec['output'][0]['content'] as $c ) {
			if ( is_string( $c ) ) {
				$answer_txt .= $c;
			} elseif ( is_array( $c ) && isset( $c['text'] ) ) {
				$answer_txt .= $c['text'];
			}
		}
	}

	$json_array = bt_try_parse_response_json_array( $answer_txt ? $answer_txt : $resp_body );
	if ( ! $json_array || ! is_array( $json_array ) ) {
		return new WP_REST_Response(
			array(
				'error' => 'Could not parse model output',
				'raw'   => $resp_body,
				'body'  => $resp_dec,
			),
			$code >= 200 && $code < 300 ? 500 : $code
		);
	}

	$results = array();
	foreach ( $json_array as $obj ) {
		$id       = isset( $obj['id'] ) ? (string) $obj['id'] : uniqid( 'beer_' );
		$computed = bt_compute_color_from_attributes( $obj );
		$results[] = array_merge( array( 'id' => $id ), $computed );
	}

	set_transient( $cache_key, $results, 12 * HOUR_IN_SECONDS );

	return rest_ensure_response( $results );
}

function bt_build_color_extractor_prompt( $items ) {
	$json = wp_json_encode( $items, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE );

	return "You are a precise extractor. Given the following JSON array of beer objects with fields {id, style, description}, return ONLY a JSON array of objects with fields:
- id (string)
- style (string|null)
- explicit_color_words (array of strings)
- clarity (\"clear\"|\"hazy\"|\"cloudy\"|\"opaque\"|null)
- fruit_tint (string|null)
- abv (number|null)
- ibu (number|null)

Rules:
- Preserve the id exactly as provided (do NOT change, slugify, or rename).
- If a field is unknown, set it to null or an empty array (for explicit_color_words).
- Output only valid JSON, no extra text or commentary.

Input:
{$json}

Return only valid JSON (no extra text).";
}

function bt_try_parse_response_json_array( $text ) {
	if ( ! is_string( $text ) ) {
		return null;
	}
	$first = strpos( $text, '[' );
	$last  = strrpos( $text, ']' );
	if ( false === $first || false === $last || $last <= $first ) {
		return null;
	}
	$substr = substr( $text, $first, $last - $first + 1 );
	$arr    = json_decode( $substr, true );
	return is_array( $arr ) ? $arr : null;
}

/**
 * Attempt to extract a JSON object from a model response, stripping markdown fences if present.
 */
function bt_extract_json_object( $text ) {
	if ( ! is_string( $text ) ) {
		return null;
	}
	$clean = trim( $text );

	// Strip ```json ... ``` fences.
	if ( preg_match( '/```json\s*(\{.*?\})\s*```/s', $clean, $matches ) ) {
		$clean = $matches[1];
	}

	// Try to capture from first { to last }.
	$first = strpos( $clean, '{' );
	$last  = strrpos( $clean, '}' );
	if ( false !== $first && false !== $last && $last > $first ) {
		$substr = substr( $clean, $first, $last - $first + 1 );
		$decoded = json_decode( $substr, true );
		if ( is_array( $decoded ) ) {
			return $decoded;
		}
	}

	// Fallback: straight decode.
	$decoded = json_decode( $clean, true );
	return is_array( $decoded ) ? $decoded : null;
}

function bt_compute_color_from_attributes( $attrs ) {
	$style = strtolower( sanitize_text_field( $attrs['style'] ?? '' ) );
	$words = array_map( 'strtolower', (array) ( $attrs['explicit_color_words'] ?? array() ) );
	$abv   = isset( $attrs['abv'] ) ? floatval( $attrs['abv'] ) : null;
	$fruit = strtolower( sanitize_text_field( (string) ( $attrs['fruit_tint'] ?? '' ) ) );

	$style_map = array(
		'pilsner'            => array( 2, 6 ),
		'schwarzbier'        => array( 16, 30 ),
		'stout'              => array( 30, 45 ),
		'porter'             => array( 20, 30 ),
		'hefeweizen'         => array( 3, 6 ),
		'brown ale'          => array( 15, 20 ),
		'barleywine'         => array( 10, 22 ),
		'cream ale'          => array( 3, 6 ),
		'festbier'           => array( 4, 7 ),
		'dubbel'             => array( 12, 18 ),
		'california common'  => array( 8, 15 ),
		'lager'              => array( 2, 6 ),
		'ipa'                => array( 6, 12 ),
		'pale ale'           => array( 4, 8 ),
	);

	if ( isset( $style_map[ $style ] ) ) {
		list( $min, $max ) = $style_map[ $style ];
	} else {
		$min = 6;
		$max = 12;
	}

	if ( in_array( 'black', $words, true ) || in_array( 'very dark', $words, true ) ) {
		$min = 36;
		$max = 45;
	} elseif ( in_array( 'brown', $words, true ) ) {
		$min = min( $min, 15 );
		$max = max( $max, 22 );
	} elseif ( in_array( 'amber', $words, true ) || in_array( 'copper', $words, true ) ) {
		$min = min( $min, 10 );
		$max = max( $max, 14 );
	} elseif ( in_array( 'golden', $words, true ) ) {
		$min = min( $min, 4 );
		$max = max( $max, 8 );
	} elseif ( in_array( 'crimson', $words, true ) || in_array( 'red', $words, true ) || $fruit ) {
		$min = 6;
		$max = 14;
	}

	if ( $abv !== null && $abv > 8 ) {
		$min += 1;
		$max += 2;
	}

	$srm = round( ( $min + $max ) / 2 );

	if ( $srm <= 3 ) {
		$hex = '#F4E9B9';
	} elseif ( $srm <= 6 ) {
		$hex = '#E9D792';
	} elseif ( $srm <= 9 ) {
		$hex = '#D8B055';
	} elseif ( $srm <= 14 ) {
		$hex = '#C07A2E';
	} elseif ( $srm <= 18 ) {
		$hex = '#8F4B2D';
	} elseif ( $srm <= 25 ) {
		$hex = '#624032';
	} elseif ( $srm <= 35 ) {
		$hex = '#442E2A';
	} else {
		$hex = '#0B0B0B';
	}

	return array(
		'style'           => $attrs['style'] ?? null,
		'srm'             => $srm,
		'srm_range'       => array( $min, $max ),
		'hex'             => $hex,
		'confidence'      => 0.8,
		'short_rationale' => $attrs['short_rationale'] ?? '',
	);
}

function bt_compute_color_map_from_beers( $beer_catalog ) {
	$map = array();
	if ( ! is_array( $beer_catalog ) ) {
		return $map;
	}
	foreach ( $beer_catalog as $beer_item ) {
		if ( ! is_array( $beer_item ) ) {
			continue;
		}
		$id = isset( $beer_item['id'] ) ? (string) $beer_item['id'] : ( isset( $beer_item['name'] ) ? sanitize_title( $beer_item['name'] ) : '' );
		if ( ! $id ) {
			continue;
		}
		$attrs = array(
			'style'                => $beer_item['style'] ?? '',
			'explicit_color_words' => array(),
			'fruit_tint'           => '',
			'abv'                  => isset( $beer_item['abv'] ) ? floatval( $beer_item['abv'] ) : null,
		);
		$computed = bt_compute_color_from_attributes( $attrs );
		$map[ $id ] = array(
			'hex' => $computed['hex'],
			'srm' => $computed['srm'],
		);
	}
	return $map;
}

/**
 * Helpers for pairing/history caching.
 */
function bt_pairing_hash_string( $value ) {
	$str  = (string) $value;
	$hash = 5381;
	$len  = strlen( $str );
	for ( $i = 0; $i < $len; $i++ ) {
		$hash = ( ( $hash << 5 ) + $hash ) ^ ord( $str[ $i ] );
		$hash = $hash & 0xffffffff;
	}
	if ( $hash < 0 ) {
		$hash += 0x100000000;
	}
	return base_convert( $hash, 10, 36 );
}

function bt_pairing_fingerprint_beers( $items ) {
	if ( ! is_array( $items ) ) {
		return 'empty';
	}
	$normalized = array();
	foreach ( $items as $item ) {
		if ( ! is_array( $item ) ) {
			continue;
		}
		$key = '';
		if ( ! empty( $item['btKey'] ) ) {
			$key = (string) $item['btKey'];
		} elseif ( isset( $item['id'] ) ) {
			$key = (string) $item['id'];
		} elseif ( ! empty( $item['slug'] ) ) {
			$key = (string) $item['slug'];
		} elseif ( ! empty( $item['name'] ) ) {
			$key = (string) $item['name'];
		}
		$style   = isset( $item['style'] ) ? (string) $item['style'] : '';
		$profile = '';
		if ( isset( $item['pairingProfile'] ) ) {
			$profile = wp_json_encode( $item['pairingProfile'] );
		}
		$normalized[] = $key . '|' . $style . '|' . $profile;
	}
	sort( $normalized );
	$joined = implode( '||', $normalized );
	return $joined ? bt_pairing_hash_string( $joined ) : 'empty';
}

function bt_pairing_fingerprint_food( $items ) {
	if ( ! is_array( $items ) ) {
		return 'empty';
	}
	$normalized = array();
	foreach ( $items as $item ) {
		if ( ! is_array( $item ) ) {
			continue;
		}
		$key = '';
		if ( ! empty( $item['btKey'] ) ) {
			$key = (string) $item['btKey'];
		} elseif ( isset( $item['id'] ) ) {
			$key = (string) $item['id'];
		} elseif ( ! empty( $item['slug'] ) ) {
			$key = (string) $item['slug'];
		} elseif ( ! empty( $item['name'] ) ) {
			$key = (string) $item['name'];
		}
		$category = isset( $item['category'] ) ? (string) $item['category'] : '';
		$normalized[] = $key . '|' . $category;
	}
	sort( $normalized );
	$joined = implode( '||', $normalized );
	return $joined ? bt_pairing_hash_string( $joined ) : 'empty';
}

function bt_pairing_cache_hash_from_payload( $beer_data, $food_data ) {
	$beer_items = is_array( $beer_data ) && isset( $beer_data['items'] ) && is_array( $beer_data['items'] )
		? $beer_data['items']
		: ( is_array( $beer_data ) ? $beer_data : array() );
	$food_items = is_array( $food_data ) && isset( $food_data['items'] ) && is_array( $food_data['items'] )
		? $food_data['items']
		: ( is_array( $food_data ) ? $food_data : array() );
	if ( empty( $beer_items ) || empty( $food_items ) ) {
		return '';
	}
	$beer_hash = bt_pairing_fingerprint_beers( $beer_items );
	$food_hash = bt_pairing_fingerprint_food( $food_items );
	return $beer_hash . '.' . $food_hash;
}

function bt_pairing_cache_key_from_hash( $hash ) {
	$hash = sanitize_key( (string) $hash );
	return $hash ? 'bt_pairing_cache_' . $hash : '';
}

function bt_pairing_cache_index() {
	$list = get_option( 'bt_pairing_cache_keys', array() );
	return is_array( $list ) ? $list : array();
}

function bt_pairing_cache_index_add( $key ) {
	if ( ! $key ) {
		return;
	}
	$list = bt_pairing_cache_index();
	if ( ! in_array( $key, $list, true ) ) {
		$list[] = $key;
		update_option( 'bt_pairing_cache_keys', $list, false );
	}
}

function bt_pairing_cache_index_clear() {
	update_option( 'bt_pairing_cache_keys', array(), false );
}

function bt_pairing_history_key( $slug ) {
	return 'bt_history_' . sanitize_title( $slug );
}

function bt_pairing_history_index() {
	$list = get_option( 'bt_history_cache_keys', array() );
	return is_array( $list ) ? $list : array();
}

function bt_pairing_history_index_add( $slug ) {
	$slug = sanitize_title( $slug );
	if ( ! $slug ) {
		return;
	}
	$list = bt_pairing_history_index();
	if ( ! in_array( $slug, $list, true ) ) {
		$list[] = $slug;
		update_option( 'bt_history_cache_keys', $list, false );
	}
}

function bt_pairing_history_index_remove( $slug ) {
	$slug = sanitize_title( $slug );
	if ( ! $slug ) {
		return;
	}
	$list = bt_pairing_history_index();
	$next = array_values( array_diff( $list, array( $slug ) ) );
	update_option( 'bt_history_cache_keys', $next, false );
}

function bt_pairing_history_index_clear() {
	update_option( 'bt_history_cache_keys', array(), false );
}

function bt_pairings_static_index() {
	$list = get_option( 'bt_pairings_static_keys', array() );
	return is_array( $list ) ? $list : array();
}

function bt_pairings_static_index_add( $cache_key ) {
	if ( ! $cache_key ) {
		return;
	}
	$list = bt_pairings_static_index();
	if ( ! in_array( $cache_key, $list, true ) ) {
		$list[] = $cache_key;
		update_option( 'bt_pairings_static_keys', $list, false );
	}
}

function bt_pairings_static_index_clear() {
	update_option( 'bt_pairings_static_keys', array(), false );
}

/**
 * Fetch a batch of histories from the external Responses API.
 *
 * @param array $items Array of beer items (slug, name, description).
 * @param int   $timeout Timeout seconds.
 * @return array Map slug => history text (only filled on success).
 */
function bt_fetch_history_batch( $items, $timeout = 3 ) {
	if ( empty( $items ) ) {
		return array();
	}
	$clean = array();
	foreach ( $items as $it ) {
		$slug = sanitize_title( $it['slug'] ?? '' );
		if ( ! $slug ) {
			continue;
		}
		$clean[] = array(
			'slug'        => $slug,
			'name'        => isset( $it['name'] ) ? sanitize_text_field( $it['name'] ) : '',
			'description' => isset( $it['description'] ) ? wp_strip_all_tags( $it['description'] ) : '',
		);
	}
	if ( empty( $clean ) ) {
		return array();
	}

	$items_json = wp_json_encode( $clean );
	$prompt     = <<<PROMPT
You are a concise beer historian. For each beer provided (slug, description, style), return one "history_fun" string with two short paragraphs (3–5 sentences each, <=200 words total) about style/ingredient origin and fun-facts. Do NOT copy or paraphrase the beer description; avoid reusing its phrases or ingredients. Always key results by the provided slug exactly; if unsure, provide a brief history of the beer’s style and serving traditions (no placeholders, no “We are gathering…”, "…has a story rooted in its ingredients and brewing approach…" text). Never return placeholder phrases; always return style-based history and fun-facts distinct from the description.

Input beers (array): {$items_json}
Return JSON only: { "histories": { "slug-one": "history_fun text", "...": "..." } }
PROMPT;

	$payload = array(
		'model' => OPENAI_MODEL,
		'input' => array(
			array(
				'role'    => 'user',
				'content' => $prompt,
			),
		),
	);

	$response = wp_remote_post(
		'https://api.openai.com/v1/responses',
		array(
			'headers' => array(
				'Authorization' => 'Bearer ' . OPENAI_API_KEY,
				'Content-Type'  => 'application/json',
			),
			'body'    => wp_json_encode( $payload ),
			'timeout' => $timeout,
		)
	);

	if ( is_wp_error( $response ) ) {
		return array();
	}

	$resp_body = wp_remote_retrieve_body( $response );
	$decoded   = json_decode( $resp_body, true );
	$text      = '';
	if ( isset( $decoded['output'][0]['content'][0]['text'] ) ) {
		$text = $decoded['output'][0]['content'][0]['text'];
	} elseif ( isset( $decoded['output_text'] ) ) {
		$text = $decoded['output_text'];
	} elseif ( isset( $decoded['output'][0]['text'] ) ) {
		$text = $decoded['output'][0]['text'];
	} elseif ( isset( $decoded['output'][0]['content'] ) && is_array( $decoded['output'][0]['content'] ) ) {
		foreach ( $decoded['output'][0]['content'] as $c ) {
			if ( is_string( $c ) ) {
				$text .= $c;
			} elseif ( is_array( $c ) && isset( $c['text'] ) ) {
				$text .= $c['text'];
			}
		}
	}

	$maybe = bt_extract_json_object( $text ? $text : $resp_body );
	if ( is_array( $maybe ) && isset( $maybe['histories'] ) && is_array( $maybe['histories'] ) ) {
		return $maybe['histories'];
	}

	return array();
}

/**
 * REST: pairing histories (per-beer).
 */
add_action(
	'rest_api_init',
	function() {
		register_rest_route(
			'bt/v1',
			'/pairing/history',
			array(
				'methods'             => 'POST',
				'callback'            => 'bt_pairing_history',
				'permission_callback' => '__return_true',
			)
		);
	}
);

function bt_pairing_history( WP_REST_Request $request ) {
	$body  = json_decode( $request->get_body(), true );
	$slugs = isset( $body['slugs'] ) && is_array( $body['slugs'] ) ? $body['slugs'] : array();
	$items = isset( $body['items'] ) && is_array( $body['items'] ) ? $body['items'] : array();
	$requested = array();
	// Prefer items (slug/name/description) when provided.
	foreach ( $items as $it ) {
		$name        = isset( $it['name'] ) ? sanitize_text_field( $it['name'] ) : '';
		$slug        = sanitize_title( $it['slug'] ?? $name );
		$description = isset( $it['description'] ) ? wp_strip_all_tags( $it['description'] ) : '';
		$style       = isset( $it['style'] ) ? sanitize_text_field( $it['style'] ) : '';
		if ( $slug ) {
			$requested[ $slug ] = array(
				'slug'        => $slug,
				'name'        => $name,
				'description' => $description,
				'style'       => $style,
			);
		}
	}
	// Add any bare slugs not covered above.
	if ( is_array( $slugs ) ) {
		foreach ( $slugs as $slug_raw ) {
			$slug = sanitize_title( $slug_raw );
			if ( $slug && ! isset( $requested[ $slug ] ) ) {
				$requested[ $slug ] = array(
					'slug'        => $slug,
					'name'        => '',
					'description' => '',
				);
			}
		}
	}
	if ( empty( $requested ) ) {
		return new WP_REST_Response( array( 'error' => 'Missing slugs' ), 400 );
	}
	$slugs = array_keys( $requested );
	error_log( '[bt_history] requested ' . wp_json_encode( $requested ) );

	$allow_force = current_user_can( 'manage_options' );
	$force       = ! empty( $body['force'] ) && $allow_force;

	$histories = array();
	$cached    = array();
	$missing   = array();

	foreach ( $slugs as $slug ) {
		if ( $force ) {
			$missing[] = $slug;
			continue;
		}
		$key = bt_pairing_history_key( $slug );
		$val = get_transient( $key );
		if ( false !== $val && null !== $val ) {
			$histories[ $slug ] = $val;
			$cached[]           = $slug;
		} else {
			$missing[] = $slug;
		}
	}

	if ( ! empty( $missing ) ) {
		// Fetch one at a time to maximize success rate.
		$batches = array_chunk( $missing, 1 );
		foreach ( $batches as $batch ) {
			$attempts = 0;
			$fetched  = array();
			while ( $attempts < 2 && empty( $fetched ) ) {
				$attempts++;
				$subset  = array();
				foreach ( $batch as $slug ) {
					if ( isset( $requested[ $slug ] ) ) {
						$subset[] = $requested[ $slug ];
					}
				}
				$fetched = bt_fetch_history_batch( $subset, 3 );
				error_log( '[bt_history] batch fetched ' . wp_json_encode( $fetched ) );
			}
			if ( ! empty( $fetched ) ) {
				$normalized = array();
				foreach ( $fetched as $k => $v ) {
					$norm = sanitize_title( $k );
					if ( $norm ) {
						$normalized[ $norm ] = $v;
					}
				}
				foreach ( $batch as $slug ) {
					$val = null;
					if ( isset( $fetched[ $slug ] ) ) {
						$val = $fetched[ $slug ];
					} elseif ( isset( $normalized[ $slug ] ) ) {
						$val = $normalized[ $slug ];
					}
					if ( $val ) {
						$histories[ $slug ] = $val;
						set_transient( bt_pairing_history_key( $slug ), $val, WEEK_IN_SECONDS );
						bt_pairing_history_index_add( $slug );
					}
				}
			}
		}
	}

	// Fallback: if any requested slug still lacks history, generate a short placeholder and cache it.
	foreach ( $requested as $slug => $item ) {
		if ( isset( $histories[ $slug ] ) && $histories[ $slug ] ) {
			continue;
		}
		$name        = $item['name'] ?? $slug;
		$description = $item['description'] ?? '';
		$style       = $item['style'] ?? '';
		$fallback    = $style
			? sprintf(
				'%s is a %s. This style has a long tradition; expect notes that reflect its classic roots. %s',
				$name,
				$style,
				$description ? wp_strip_all_tags( $description ) : ''
			)
			: sprintf(
				'%s has a story rooted in its ingredients and brewing approach. %s',
				$name,
				$description ? wp_strip_all_tags( $description ) : ''
			);
		$histories[ $slug ] = $fallback;
		set_transient( bt_pairing_history_key( $slug ), $fallback, WEEK_IN_SECONDS );
		bt_pairing_history_index_add( $slug );
	}

	$partial = array();
	foreach ( $slugs as $slug ) {
		if ( ! isset( $histories[ $slug ] ) || null === $histories[ $slug ] ) {
			$partial[] = $slug;
		}
	}

	return new WP_REST_Response(
		array(
			'histories' => $histories,
			'partial'   => ! empty( $partial ),
			'cached'    => $cached,
		),
		200
	);
}

/**
 * Static pairings (beer -> food) REST endpoint.
 */
define( 'BT_STATIC_PAIRINGS_PROMPT_VERSION', 1 );
define( 'BT_STATIC_PAIRINGS_SCHEMA_VERSION', 1 );

add_action(
	'rest_api_init',
	function() {
		register_rest_route(
			'bt/v1',
			'/pairings/static',
			array(
				'methods'             => 'POST',
				'callback'            => 'bt_pairings_static',
				'permission_callback' => '__return_true',
			)
		);
	}
);

function bt_pairings_static( WP_REST_Request $request ) {
	$body     = json_decode( $request->get_body(), true );
	$beer     = isset( $body['beerData'] ) && is_array( $body['beerData'] ) ? $body['beerData'] : null;
	$food     = isset( $body['foodData'] ) && is_array( $body['foodData'] ) ? $body['foodData'] : null;
	$force    = ! empty( $body['force'] );
	$prompt_v = isset( $body['promptVersion'] ) ? intval( $body['promptVersion'] ) : BT_STATIC_PAIRINGS_PROMPT_VERSION;

	if ( $force && ! current_user_can( 'manage_options' ) ) {
		return new WP_REST_Response( array( 'error' => 'forbidden' ), 403 );
	}

	if ( empty( $beer['items'] ) || empty( $food['items'] ) || ! is_array( $beer['items'] ) || ! is_array( $food['items'] ) ) {
		return new WP_REST_Response( array( 'error' => 'missing data' ), 400 );
	}

	$profile_v = isset( $beer['pairingProfileVersion'] ) ? intval( $beer['pairingProfileVersion'] ) : ( isset( $food['pairingProfileVersion'] ) ? intval( $food['pairingProfileVersion'] ) : 1 );
	$beer_gen  = isset( $beer['generatedAt'] ) ? sanitize_text_field( $beer['generatedAt'] ) : 'unknown';
	$food_gen  = isset( $food['generatedAt'] ) ? sanitize_text_field( $food['generatedAt'] ) : 'unknown';
	$cache_key = 'bt_pairings_static_' . sha1( $profile_v . '|' . $prompt_v . '|' . $beer_gen . '|' . $food_gen );

	if ( ! $force ) {
		$cached = get_transient( $cache_key );
		if ( $cached && is_array( $cached ) ) {
			$cached['source']['cached'] = true;
			return rest_ensure_response( $cached );
		}
	}

	$beer_items = array_slice( $beer['items'], 0, 60 );
	$food_items = array_slice( $food['items'], 0, 250 );
	$beer_keys  = array();
	$food_keys  = array();

	$beer_payload = array();
	foreach ( $beer_items as $item ) {
		if ( ! is_array( $item ) || empty( $item['btKey'] ) ) {
			continue;
		}
		$pp = isset( $item['pairingProfile'] ) && is_array( $item['pairingProfile'] ) ? $item['pairingProfile'] : array();
		$beer_keys[] = $item['btKey'];
		$beer_payload[] = array(
			'beerKey'  => $item['btKey'],
			'style'    => $item['style'] ?? ( $item['category'] ?? '' ),
			'abv'      => $pp['abv'] ?? null,
			'ibu'      => $pp['ibu'] ?? null,
			'body'     => $pp['body'] ?? '',
			'sweetness'=> $pp['sweetness'] ?? '',
			'axes'     => $pp['axes'] ?? array(),
			'tags'     => isset( $pp['tags'] ) && is_array( $pp['tags'] ) ? array_slice( $pp['tags'], 0, 6 ) : array(),
		);
	}

	$food_payload = array();
	foreach ( $food_items as $item ) {
		if ( ! is_array( $item ) || empty( $item['btKey'] ) ) {
			continue;
		}
		$pp = isset( $item['pairingProfile'] ) && is_array( $item['pairingProfile'] ) ? $item['pairingProfile'] : array();
		$food_keys[] = $item['btKey'];
		$food_payload[] = array(
			'foodKey'  => $item['btKey'],
			'category' => $item['category'] ?? 'uncategorized',
			'primary'  => $pp['primary'] ?? '',
			'prep'     => $pp['prep'] ?? '',
			'axes'     => $pp['axes'] ?? array(),
			'tags'     => isset( $pp['tags'] ) && is_array( $pp['tags'] ) ? array_slice( $pp['tags'], 0, 6 ) : array(),
		);
	}

	if ( empty( $beer_payload ) || empty( $food_payload ) ) {
		return new WP_REST_Response( array( 'error' => 'missing items' ), 400 );
	}

	$prompt = bt_build_static_pairings_prompt( $beer_payload, $food_payload );

	$payload = array(
		'model' => OPENAI_MODEL,
		'input' => array(
			array(
				'role'    => 'user',
				'content' => $prompt,
			),
		),
	);

	$response = wp_remote_post(
		'https://api.openai.com/v1/responses',
		array(
			'headers' => array(
				'Authorization' => 'Bearer ' . OPENAI_API_KEY,
				'Content-Type'  => 'application/json',
			),
			'body'    => wp_json_encode( $payload ),
			'timeout' => 60,
		)
	);

	if ( is_wp_error( $response ) ) {
		return new WP_REST_Response( array( 'error' => $response->get_error_message() ), 500 );
	}

	$resp_body = wp_remote_retrieve_body( $response );
	$decoded   = json_decode( $resp_body, true );
	$answer_text = '';
	if ( isset( $decoded['output'][0]['content'][0]['text'] ) ) {
		$answer_text = $decoded['output'][0]['content'][0]['text'];
	} elseif ( isset( $decoded['output_text'] ) ) {
		$answer_text = $decoded['output_text'];
	} elseif ( isset( $decoded['output'][0]['text'] ) ) {
		$answer_text = $decoded['output'][0]['text'];
	} elseif ( isset( $decoded['output'][0]['content'] ) && is_array( $decoded['output'][0]['content'] ) ) {
		foreach ( $decoded['output'][0]['content'] as $c ) {
			if ( is_string( $c ) ) {
				$answer_text .= $c;
			} elseif ( is_array( $c ) && isset( $c['text'] ) ) {
				$answer_text .= $c['text'];
			}
		}
	}

	$parsed = bt_extract_json_object( $answer_text ? $answer_text : $resp_body );
	$pairings = bt_normalize_static_pairings_response( $parsed, $beer_keys, $food_keys );

	$result = array(
		'schemaVersion'     => BT_STATIC_PAIRINGS_SCHEMA_VERSION,
		'kind'              => 'pairings-static',
		'generatedAt'       => current_time( 'c' ),
		'source'            => array(
			'beerGeneratedAt'       => $beer_gen,
			'foodGeneratedAt'       => $food_gen,
			'pairingProfileVersion' => $profile_v,
			'promptVersion'         => $prompt_v,
			'cached'                => false,
		),
		'counts'            => array(
			'beers' => count( $beer_payload ),
			'food'  => count( $food_payload ),
		),
		'pairingsByBeerKey' => $pairings,
	);

	set_transient( $cache_key, $result, 7 * DAY_IN_SECONDS );
	bt_pairings_static_index_add( $cache_key );

	return rest_ensure_response( $result );
}

function bt_build_static_pairings_prompt( $beers, $foods ) {
	$beer_json = wp_json_encode( $beers, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE );
	$food_json = wp_json_encode( $foods, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE );

	return <<<PROMPT
You are pairing beers to menu items. Return ONLY JSON, no prose.

Rules:
- Use only provided beerKey and foodKey values.
- For each beerKey, choose exactly 2 mains and 1 side.
- why must be <= 20 words.
- Output JSON format:
{
  "pairingsByBeerKey": {
    "beerKey": {
      "mains": [
        { "foodKey": "...", "why": "..." },
        { "foodKey": "...", "why": "..." }
      ],
      "side": { "foodKey": "...", "why": "..." }
    }
  }
}

Beers:
{$beer_json}

Food:
{$food_json}
PROMPT;
}

function bt_normalize_static_pairings_response( $parsed, $beer_keys, $food_keys ) {
	$valid_beers = array_fill_keys( $beer_keys, true );
	$valid_food  = array_fill_keys( $food_keys, true );
	$result      = array();

	foreach ( $beer_keys as $beer_key ) {
		$result[ $beer_key ] = array(
			'mains' => array(),
			'side'  => null,
		);
	}

	if ( ! is_array( $parsed ) || empty( $parsed['pairingsByBeerKey'] ) || ! is_array( $parsed['pairingsByBeerKey'] ) ) {
		return $result;
	}

	foreach ( $parsed['pairingsByBeerKey'] as $beer_key => $data ) {
		if ( ! isset( $valid_beers[ $beer_key ] ) || ! is_array( $data ) ) {
			continue;
		}
		$mains = array();
		if ( isset( $data['mains'] ) && is_array( $data['mains'] ) ) {
			foreach ( $data['mains'] as $entry ) {
				if ( count( $mains ) >= 2 || ! is_array( $entry ) ) {
					continue;
				}
				$food_key = isset( $entry['foodKey'] ) ? sanitize_text_field( $entry['foodKey'] ) : '';
				$why      = isset( $entry['why'] ) ? sanitize_text_field( $entry['why'] ) : '';
				if ( ! $food_key || ! isset( $valid_food[ $food_key ] ) ) {
					continue;
				}
				$mains[] = array(
					'foodKey' => $food_key,
					'why'     => $why,
				);
			}
		}

		$side = null;
		if ( isset( $data['side'] ) && is_array( $data['side'] ) ) {
			$food_key = isset( $data['side']['foodKey'] ) ? sanitize_text_field( $data['side']['foodKey'] ) : '';
			$why      = isset( $data['side']['why'] ) ? sanitize_text_field( $data['side']['why'] ) : '';
			if ( $food_key && isset( $valid_food[ $food_key ] ) ) {
				$side = array(
					'foodKey' => $food_key,
					'why'     => $why,
				);
			}
		}

		$result[ $beer_key ] = array(
			'mains' => array_slice( $mains, 0, 2 ),
			'side'  => $side,
		);
	}

	return $result;
}

/**
 * Admin-only purge route for pairing/history caches.
 */
add_action(
	'rest_api_init',
	function() {
		register_rest_route(
			'bt/v1',
			'/pairing/purge',
			array(
				'methods'             => 'POST',
				'callback'            => 'bt_pairing_purge',
				'permission_callback' => function () {
					return current_user_can( 'manage_options' );
				},
			)
		);
	}
);

function bt_pairing_purge( WP_REST_Request $request ) {
	$body   = json_decode( $request->get_body(), true );
	$target = isset( $body['target'] ) ? $body['target'] : 'all';
	$slug   = isset( $body['slug'] ) ? sanitize_title( $body['slug'] ) : '';

	if ( in_array( $target, array( 'history', 'all' ), true ) ) {
		if ( $slug ) {
			delete_transient( bt_pairing_history_key( $slug ) );
			bt_pairing_history_index_remove( $slug );
		} else {
			$list = bt_pairing_history_index();
			foreach ( $list as $s ) {
				delete_transient( bt_pairing_history_key( $s ) );
			}
			bt_pairing_history_index_clear();
		}
	}

	if ( in_array( $target, array( 'pairings-static', 'all' ), true ) ) {
		$list = bt_pairings_static_index();
		foreach ( $list as $key ) {
			delete_transient( $key );
		}
		bt_pairings_static_index_clear();
	}

	if ( in_array( $target, array( 'pairing', 'all' ), true ) ) {
		$list = bt_pairing_cache_index();
		foreach ( $list as $key ) {
			delete_transient( $key );
		}
		bt_pairing_cache_index_clear();
	}

	return new WP_REST_Response( array( 'purged' => true ), 200 );
}

/**
 * Pairing REST endpoint: proxies to OpenAI Responses API.
 */
add_action(
	'rest_api_init',
	function() {
		register_rest_route(
			'bt/v1',
			'/pairing',
			array(
				array(
					'methods'             => 'GET',
					'callback'            => 'bt_pairing_get_cached',
					'permission_callback' => '__return_true',
				),
				array(
					'methods'             => 'POST',
					'callback'            => 'bt_proxy_pairing',
					'permission_callback' => '__return_true',
				),
			)
		);
		register_rest_route(
			'bt/v1',
			'/pairing/status',
			array(
				'methods'             => 'GET',
				'callback'            => 'bt_pairing_cache_status',
				'permission_callback' => function () {
					return current_user_can( 'manage_options' );
				},
			)
		);
	}
);

function bt_pairing_get_cached( WP_REST_Request $request ) {
	$hash = sanitize_key( $request->get_param( 'hash' ) );
	if ( ! $hash ) {
		return new WP_REST_Response( array( 'error' => 'Missing hash' ), 400 );
	}
	$key = bt_pairing_cache_key_from_hash( $hash );
	if ( ! $key ) {
		return new WP_REST_Response( array( 'error' => 'Invalid hash' ), 400 );
	}
	$cached = get_transient( $key );
	if ( ! is_array( $cached ) || empty( $cached['data'] ) ) {
		return new WP_REST_Response( array( 'error' => 'Not found' ), 404 );
	}
	return new WP_REST_Response(
		array(
			'data'      => $cached['data'],
			'fetchedAt' => isset( $cached['fetchedAt'] ) ? intval( $cached['fetchedAt'] ) : null,
			'hash'      => $hash,
		),
		200
	);
}

function bt_pairing_cache_status( WP_REST_Request $request ) {
	$hash = sanitize_key( $request->get_param( 'hash' ) );
	if ( ! $hash ) {
		return new WP_REST_Response( array( 'error' => 'Missing hash' ), 400 );
	}
	$key = bt_pairing_cache_key_from_hash( $hash );
	if ( ! $key ) {
		return new WP_REST_Response( array( 'error' => 'Invalid hash' ), 400 );
	}
	$cached = get_transient( $key );
	$cached_ok = is_array( $cached ) && ! empty( $cached['data'] );
	return new WP_REST_Response(
		array(
			'cached'    => $cached_ok,
			'fetchedAt' => $cached_ok && isset( $cached['fetchedAt'] ) ? intval( $cached['fetchedAt'] ) : null,
			'hash'      => $hash,
		),
		200
	);
}

function bt_proxy_pairing( WP_REST_Request $request ) {
	$body    = json_decode( $request->get_body(), true );
	$answers = array();
	$force   = ! empty( $body['force'] ) && current_user_can( 'manage_options' );
	$preload = ! empty( $body['preload'] );
	if ( isset( $body['answers'] ) && is_array( $body['answers'] ) ) {
		$answers = $body['answers'];
	}
	// Allow refresh calls (e.g., /pairing/refresh) that pass only { force: true }.
	if ( empty( $answers ) && $force ) {
		$answers = array( 'refresh' => true );
	}

	if ( empty( $answers ) ) {
		return new WP_REST_Response( array( 'error' => 'Missing answers' ), 400 );
	}

	$beer_data = ( isset( $body['beerData'] ) && is_array( $body['beerData'] ) ) ? $body['beerData'] : null;
	$food_data = ( isset( $body['foodData'] ) && is_array( $body['foodData'] ) ) ? $body['foodData'] : null;

	$beer_catalog = $beer_data && isset( $beer_data['items'] ) ? $beer_data['items'] : ( is_array( $beer_data ) ? $beer_data : array() );
	$color_map    = bt_compute_color_map_from_beers( $beer_catalog );
	$allowed_beers = array();
	foreach ( $beer_catalog as $beer_item ) {
		if ( is_array( $beer_item ) && ! empty( $beer_item['name'] ) ) {
			$allowed_beers[] = $beer_item['name'];
		}
	}

	$inline_beer_json  = $beer_data ? wp_json_encode( $beer_data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) : 'null';
	$user_answers_json = wp_json_encode( $answers, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE );
	$prompt            = <<<PROMPT
		You are a sensory scientist and beer history educator. Be concise, fun and informative.
		Data:
		- inline_beer_json: {$inline_beer_json} (use these beers only)
		- user_answers: {$user_answers_json}
		Checklist:
		1) Only recommend beers present in inline_beer_json; do not invent or rename.
		2) Reuse beer.description verbatim; no fabricated local history.
		3) Always return 5 matches: primary (best), neighbor (adjacent style), contrast (different profile but respect low-ABV requests).
		4) Reference 1–2 user inputs in match_sentence; keep confidence bands (>0.75 High; 0.40–0.75 Medium; <0.40 Low).
		5) Use canonical_tag_set and tag_synonyms seeded from the beer data; infer reasonably.
		Return EXACTLY this JSON, no extra prose:
		{
		"matches": [
			{
			"beer": { "name": "string", "style": "string", "abv": "string", "ibu": "string", "description": "string" },
			"score": 0.0,
			"confidence": "High|Medium|Low",
			"top_tags": ["string","string","string"],
			"match_sentence": "string"
			},
			{ "..." : "..." },
			{ "..." : "..." }
		],
		"canonical_tag_set": ["tropical","citrus","roasty","caramel","banana","clove","dry","creamy","crisp","smoky","spicy","tart","funky"],
		"tag_synonyms": {
			"tropical": ["mango","pineapple","passionfruit","juicy"],
			"citrus": ["orange","grapefruit","lemon","lime"]
		},
		"explainers": {
			"why_three": "string",
			"confidence_thresholds": { "high_gt": 0.75, "medium_ge": 0.40, "low_lt": 0.40 }
		}
		}
		PROMPT;

	$payload = array(
		'model' => OPENAI_MODEL,
		'input' => array(
			array(
				'role'    => 'user',
				'content' => $prompt,
			),
		),
	);

	// Log payload metrics for debugging.
	error_log(
		'[bt_pairing] request ' . wp_json_encode(
			array(
				'model'       => OPENAI_MODEL,
				'items_count' => is_array( $beer_catalog ) ? count( $beer_catalog ) : 0,
				'payload_len' => strlen( wp_json_encode( $payload ) ),
				'prompt'      => $prompt,
			)
		)
	);

	$response = wp_remote_post(
		'https://api.openai.com/v1/responses',
		array(
			'headers' => array(
				'Authorization' => 'Bearer ' . OPENAI_API_KEY,
				'Content-Type'  => 'application/json',
			),
			'body'    => wp_json_encode( $payload ),
			'timeout' => 50,
		)
	);

	if ( is_wp_error( $response ) ) {
		return new WP_REST_Response( array( 'error' => $response->get_error_message() ), 500 );
	}

	$http      = wp_remote_retrieve_response_code( $response );
	$resp_body = wp_remote_retrieve_body( $response );

	try {
		$decoded = json_decode( $resp_body, true );
	} catch ( Exception $e ) {
		return new WP_REST_Response( array( 'answer' => $resp_body, 'status' => $http ), $http );
	}

	if ( JSON_ERROR_NONE !== json_last_error() ) {
		return new WP_REST_Response( array( 'answer' => $resp_body, 'status' => $http ), $http );
	}

	$answer_text = '';
	if ( isset( $decoded['output'][0]['content'][0]['text'] ) ) {
		$answer_text = $decoded['output'][0]['content'][0]['text'];
	} elseif ( isset( $decoded['output_text'] ) ) {
		$answer_text = $decoded['output_text'];
	} elseif ( isset( $decoded['output'][0]['text'] ) ) {
		$answer_text = $decoded['output'][0]['text'];
	} elseif ( isset( $decoded['output'][0]['content'] ) && is_array( $decoded['output'][0]['content'] ) ) {
		foreach ( $decoded['output'][0]['content'] as $c ) {
			if ( is_string( $c ) ) {
				$answer_text .= $c;
			} elseif ( is_array( $c ) && isset( $c['text'] ) ) {
				$answer_text .= $c['text'];
			}
		}
	}

	$maybe_json = json_decode( trim( $answer_text ), true );
	if ( ! ( is_array( $maybe_json ) && isset( $maybe_json['matches'] ) ) ) {
		$maybe_json = bt_extract_json_object( $answer_text ? $answer_text : $resp_body );
	}
	if ( is_array( $maybe_json ) && isset( $maybe_json['matches'] ) ) {
		$payload = array(
			'result' => $maybe_json,
			'status' => $http,
			'prompt' => $prompt,
			'colors' => $color_map,
		);
		if ( $preload ) {
			$hash = bt_pairing_cache_hash_from_payload( $beer_data, $food_data );
			$key  = bt_pairing_cache_key_from_hash( $hash );
			if ( $key ) {
				$cached = array(
					'data'      => $payload,
					'fetchedAt' => time(),
					'hash'      => $hash,
				);
				set_transient( $key, $cached, 7 * DAY_IN_SECONDS );
				bt_pairing_cache_index_add( $key );
			}
		}
		return new WP_REST_Response( $payload, 200 );
	}

	$payload = array(
		'answer' => $answer_text ? $answer_text : $decoded,
		'status' => $http,
		'prompt' => $prompt,
		'colors' => $color_map,
	);
	if ( $preload ) {
		$hash = bt_pairing_cache_hash_from_payload( $beer_data, $food_data );
		$key  = bt_pairing_cache_key_from_hash( $hash );
		if ( $key ) {
			$cached = array(
				'data'      => $payload,
				'fetchedAt' => time(),
				'hash'      => $hash,
			);
			set_transient( $key, $cached, 7 * DAY_IN_SECONDS );
			bt_pairing_cache_index_add( $key );
		}
	}
	return new WP_REST_Response( $payload, 200 );
}

/**
 * Minimal admin-only purge buttons (frontend).
 */
function bt_pairing_admin_buttons() {
	if ( ! is_user_logged_in() || ! current_user_can( 'manage_options' ) ) {
		return;
	}
	global $bt_pairing_app_present;
	if ( empty( $bt_pairing_app_present ) ) {
		return;
	}
	$nonce    = wp_create_nonce( 'wp_rest' );
	$endpoint = esc_url_raw( rest_url( 'bt/v1/pairing/purge' ) );
	$status_endpoint = esc_url_raw( rest_url( 'bt/v1/pairing/status' ) );
	$pairing_endpoint = esc_url_raw( rest_url( 'bt/v1/pairing' ) );
	?>
	<div class="bt-pairing-admin-tools" style="position:fixed;right:1rem;bottom:1rem;z-index:9999;gap:0.5rem;display:flex;flex-direction:column;max-width:240px;">
		<button type="button" class="bt-pairing-purge" data-target="history">Purge Histories</button>
		<button type="button" class="bt-pairing-purge" data-target="pairings-static">Purge Static Pairings</button>
		<button type="button" class="bt-pairing-purge" data-target="pairing">Purge Pairing</button>
		<button type="button" class="bt-pairing-refresh">Refresh Now</button>
		<div id="bt-pairing-status" style="font-size:0.8rem;line-height:1.2;">Pairing cache: checking…</div>
	</div>
	<script>
	(() => {
		const buttons = document.querySelectorAll('.bt-pairing-purge');
		const refreshBtn = document.querySelector('.bt-pairing-refresh');
		const statusEl = document.getElementById('bt-pairing-status');
		if (!buttons.length) return;
		const safeString = (value) => {
			if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
			return '';
		};
		const hashString = (value) => {
			const str = safeString(value);
			let hash = 5381;
			for (let i = 0; i < str.length; i++) {
				hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
				hash = hash >>> 0;
			}
			return hash.toString(36);
		};
		const toItems = (payload) => {
			if (Array.isArray(payload)) return payload;
			if (payload && typeof payload === 'object' && Array.isArray(payload.items)) return payload.items;
			return [];
		};
		const getBeerFingerprint = (items) => {
			if (!Array.isArray(items) || !items.length) return null;
			const normalized = items.map((item) => {
				if (!item || typeof item !== 'object') return '';
				const key = item.btKey || item.id || item.slug || item.name || '';
				const style = item.style || '';
				const profile = item.pairingProfile ? JSON.stringify(item.pairingProfile) : '';
				return `${key}|${style}|${profile}`;
			}).filter(Boolean).sort().join('||');
			return normalized ? hashString(normalized) : null;
		};
		const getFoodFingerprint = (items) => {
			if (!Array.isArray(items) || !items.length) return null;
			const normalized = items.map((item) => {
				if (!item || typeof item !== 'object') return '';
				const key = item.btKey || item.id || item.slug || item.name || '';
				const category = item.category || '';
				return `${key}|${category}`;
			}).filter(Boolean).sort().join('||');
			return normalized ? hashString(normalized) : null;
		};
		const readJsonScript = (id) => {
			const script = document.getElementById(id);
			if (!script || !script.textContent) return null;
			try {
				return JSON.parse(script.textContent);
			} catch (err) {
				return null;
			}
		};
		const isKind = (payload, kind) => payload && typeof payload === 'object' && (!payload.kind || payload.kind === kind);
		const readBeerData = () => {
			const win = window;
			const direct = win.__BT_BEER_DATA;
			if (isKind(direct, 'beer')) return direct;
			const nested = win.__BT_DATA && win.__BT_DATA.beer;
			if (isKind(nested, 'beer')) return nested;
			const script = readJsonScript('bt-beer-data');
			if (isKind(script, 'beer')) return script;
			return null;
		};
		const readFoodData = () => {
			const win = window;
			const direct = win.__BT_FOOD_DATA;
			if (isKind(direct, 'food')) return direct;
			const nested = win.__BT_DATA && win.__BT_DATA.food;
			if (isKind(nested, 'food')) return nested;
			const scriptFood = readJsonScript('bt-food-data');
			if (isKind(scriptFood, 'food')) return scriptFood;
			const scriptLegacy = readJsonScript('bt-menu-data');
			if (isKind(scriptLegacy, 'food')) return scriptLegacy;
			return null;
		};
		const updateStatus = async () => {
			if (!statusEl) return;
			const beerData = readBeerData();
			const foodData = readFoodData();
			const beerItems = toItems(beerData);
			const foodItems = toItems(foodData);
			const beerHash = getBeerFingerprint(beerItems);
			const foodHash = getFoodFingerprint(foodItems);
			if (!beerHash || !foodHash) {
				statusEl.textContent = 'Pairing cache: waiting for beer + food data.';
				return;
			}
			const hash = `${beerHash}.${foodHash}`;
			statusEl.textContent = `Pairing cache: checking (${hash})`;
			try {
				const res = await fetch(`<?php echo esc_js( $status_endpoint ); ?>?hash=${encodeURIComponent(hash)}`, {
					credentials: 'same-origin',
					headers: { 'X-WP-Nonce': '<?php echo esc_js( $nonce ); ?>' },
				});
				const json = await res.json().catch(() => null);
				if (!json || !res.ok) {
					statusEl.textContent = `Pairing cache: error (${hash})`;
					return;
				}
				const fetchedAt = json.fetchedAt ? new Date(json.fetchedAt * 1000).toLocaleString() : 'never';
				statusEl.textContent = json.cached
					? `Pairing cache: ready (${hash}) — last refreshed ${fetchedAt}`
					: `Pairing cache: needs refetch (${hash})`;
			} catch (err) {
				statusEl.textContent = `Pairing cache: error (${hash})`;
			}
		};
		const refreshPairingCache = async () => {
			if (!refreshBtn) return;
			const beerData = readBeerData();
			const foodData = readFoodData();
			if (!beerData || !foodData) {
				if (statusEl) statusEl.textContent = 'Pairing cache: waiting for beer + food data.';
				return;
			}
			const payload = {
				beerData,
				foodData,
				preload: true,
				answers: { mood: '', body: '', bitterness: '', flavorFocus: [], alcoholPreference: '' },
			};
			refreshBtn.disabled = true;
			refreshBtn.textContent = 'Refreshing…';
			try {
				const res = await fetch('<?php echo esc_js( $pairing_endpoint ); ?>', {
					method: 'POST',
					credentials: 'same-origin',
					headers: {
						'Content-Type': 'application/json',
						'X-WP-Nonce': '<?php echo esc_js( $nonce ); ?>',
					},
					body: JSON.stringify(payload),
				});
				if (!res.ok) {
					console.warn('Refresh failed', res.status);
				}
			} catch (err) {
				console.error('Refresh error', err);
			} finally {
				refreshBtn.disabled = false;
				refreshBtn.textContent = 'Refresh Now';
				updateStatus();
			}
		};
		const clearStaticPairingsCache = () => {
			const keys = [];
			try {
				if (window.localStorage) {
					for (let i = 0; i < window.localStorage.length; i++) {
						const key = window.localStorage.key(i);
						if (key && key.indexOf('bt_static_pairings_') === 0) keys.push(key);
					}
					keys.forEach((key) => window.localStorage.removeItem(key));
				}
			} catch (err) {
				console.warn('Unable to clear localStorage static pairings', err);
			}
			try {
				if (window.sessionStorage) {
					for (let i = 0; i < window.sessionStorage.length; i++) {
						const key = window.sessionStorage.key(i);
						if (key && key.indexOf('bt_static_pairings_') === 0) keys.push(key);
					}
					keys.forEach((key) => window.sessionStorage.removeItem(key));
				}
			} catch (err) {
				console.warn('Unable to clear sessionStorage static pairings', err);
			}
		};
		buttons.forEach((btn) => {
			btn.addEventListener('click', async () => {
				const target = btn.getAttribute('data-target') || 'all';
				btn.disabled = true;
				if (target === 'pairings-static' || target === 'all') {
					clearStaticPairingsCache();
				}
				try {
					const res = await fetch('<?php echo esc_js( $endpoint ); ?>', {
						method: 'POST',
						credentials: 'same-origin',
						headers: {
							'Content-Type': 'application/json',
							'X-WP-Nonce': '<?php echo esc_js( $nonce ); ?>',
						},
						body: JSON.stringify({ target }),
					});
					if (!res.ok) {
						console.warn('Purge failed', res.status);
					}
				} catch (err) {
					console.error('Purge error', err);
				} finally {
					btn.disabled = false;
				}
			});
		});
		if (refreshBtn) {
			refreshBtn.addEventListener('click', refreshPairingCache);
		}
		updateStatus();
		document.addEventListener('btBeerDataReady', updateStatus);
		document.addEventListener('btFoodDataReady', updateStatus);
	})();
	</script>
	<?php
}
add_action( 'wp_footer', 'bt_pairing_admin_buttons' );

add_filter( 'cmplz_autofocus', '__return_false' );

/**
 * Implement the Custom Header feature.
 */
require get_template_directory() . '/inc/custom-header.php';

/**
 * Custom template tags for this theme.
 */
require get_template_directory() . '/inc/template-tags.php';

/**
 * Functions which enhance the theme by hooking into WordPress.
 */
require get_template_directory() . '/inc/template-functions.php';

/**
 * Customizer additions.
 */
require get_template_directory() . '/inc/customizer.php';

/**
 * Load Jetpack compatibility file.
 */
if ( defined( 'JETPACK__VERSION' ) ) {
	require get_template_directory() . '/inc/jetpack.php';
}
