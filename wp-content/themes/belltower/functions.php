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
				'legal' => esc_html__( 'Legal', 'belltower' ),
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
	register_sidebar(
		array(
			'name'          => esc_html__( 'Footer Hours', 'belltower' ),
			'id'            => 'footer-hours',
			'description'   => esc_html__( 'Add footer widgets here for hours column.', 'belltower' ),
			'before_widget' => '<div id="%1$s" class="widget %2$s footer-hours-widget">',
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
	$tokens_path = get_stylesheet_directory() . '/tokens.css';
	$tokens_ver  = file_exists( $tokens_path ) ? filemtime( $tokens_path ) : _S_VERSION;
	wp_enqueue_style( 'belltower-tokens', get_stylesheet_directory_uri() . '/tokens.css', [], $tokens_ver );
	wp_enqueue_style( 'belltower-style', get_stylesheet_uri(), [ 'belltower-tokens' ], _S_VERSION );
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

/**
 * Inject a stable placeholder for the Home menu logo slot without changing the menu editor.
 */
function belltower_nav_logo_slot( $items, $args ) {
	if ( empty( $args->theme_location ) || 'menu-1' !== $args->theme_location ) {
		return $items;
	}
	return preg_replace_callback(
		'/(<li[^>]*class="[^"]*menu-item-home[^"]*"[^>]*>\\s*<a[^>]*>)(.*?)(<\\/a>)/is',
		function( $matches ) {
			$before = $matches[1];
			$label  = trim( wp_strip_all_tags( $matches[2] ) );
			$label  = $label ? $label : esc_html__( 'Home', 'belltower' );
			return $before
				. '<span class="menu-logo-slot" aria-hidden="true"></span>'
				. '<span class="sr-only">' . esc_html( $label ) . '</span>'
				. $matches[3];
		},
		$items,
		1
	);
}
add_filter( 'wp_nav_menu_items', 'belltower_nav_logo_slot', 10, 2 );

/**
 * Opt-in cross-document view transitions for masthead-initiated navigations only.
 */
function belltower_view_transition_opt_in() {
	?>
	<script>
	(function () {
		var STYLE_ID = 'bt-view-transition-optin';
		var STORAGE_KEY = 'bt_vt_nav';

		function prefersReducedMotion() {
			try {
				return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
			} catch (err) {
				return false;
			}
		}

		function supportsViewTransitions() {
			return 'startViewTransition' in document || 'onpagereveal' in window;
		}

		function ensureStyle() {
			if (document.getElementById(STYLE_ID)) return;
			var style = document.createElement('style');
			style.id = STYLE_ID;
			style.textContent = '@view-transition { navigation: auto; }';
			document.head.appendChild(style);
		}

		function removeStyle() {
			var style = document.getElementById(STYLE_ID);
			if (style && style.parentNode) {
				style.parentNode.removeChild(style);
			}
		}

		function setFlag() {
			try {
				sessionStorage.setItem(STORAGE_KEY, '1');
			} catch (err) {
				// Ignore storage failures.
			}
		}

		function consumeFlag() {
			try {
				var val = sessionStorage.getItem(STORAGE_KEY);
				if (val === '1') {
					sessionStorage.removeItem(STORAGE_KEY);
					return true;
				}
			} catch (err) {
				// Ignore storage failures.
			}
			return false;
		}

		function isEligibleLink(anchor, event) {
			if (!anchor || event.defaultPrevented) return false;
			if (event.button !== 0) return false;
			if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
			if (anchor.hasAttribute('download')) return false;
			if (anchor.target && anchor.target !== '_self') return false;
			var href = anchor.getAttribute('href');
			if (!href) return false;
			if (href.charAt(0) === '#') return false;
			var url;
			try {
				url = new URL(anchor.href, window.location.href);
			} catch (err) {
				return false;
			}
			if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
			if (url.origin !== window.location.origin) return false;
			var current = window.location.origin + window.location.pathname + window.location.search;
			var next = url.origin + url.pathname + url.search;
			if (current === next && url.hash) return false;
			return true;
		}

		if (!supportsViewTransitions() || prefersReducedMotion()) {
			return;
		}

		// Destination opt-in (parser-blocking).
		if (consumeFlag()) {
			ensureStyle();
			var cleanup = function () {
				removeStyle();
			};
			if ('onpagereveal' in window) {
				window.addEventListener('pagereveal', function (event) {
					if (event && event.viewTransition && event.viewTransition.finished) {
						event.viewTransition.finished.finally(cleanup);
					} else {
						cleanup();
					}
				}, { once: true });
			}
			window.addEventListener('load', cleanup, { once: true });
		}

		// Source opt-in for masthead link clicks only.
		var masthead = document.getElementById('masthead');
		if (!masthead) return;
		masthead.addEventListener('click', function (event) {
			var anchor = event.target && event.target.closest ? event.target.closest('a') : null;
			if (!anchor || !masthead.contains(anchor)) return;
			if (!isEligibleLink(anchor, event)) return;
			setFlag();
			ensureStyle();
		}, true);
	})();
	</script>
	<?php
}
add_action( 'wp_head', 'belltower_view_transition_opt_in', 0 );

// Remove jquery-migrate on the front-end to reduce render-blocking JS.
add_filter( 'wp_default_scripts', function( $scripts ) {
	if ( is_admin() ) {
		return;
	}
	if ( isset( $scripts->registered['jquery'] ) ) {
		$deps = $scripts->registered['jquery']->deps;
		$scripts->registered['jquery']->deps = array_diff( $deps, array( 'jquery-migrate' ) );
	}
} );

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


// Defer selected front-end scripts.
add_filter(
	'script_loader_tag',
	function( $tag, $handle, $src ) {

		$defer_handles = array(
			'belltower-navigation',
			'belltower-pairing-profiles',
			'belltower-menu',
			'belltower-untappd-menu',
		);
		$defer_src_fragments = array(
			'complianz',
			'simple-banner',
			'cookieblocker',
			'banner-1-optout',
		);

		$should_defer = in_array( $handle, $defer_handles, true );
		if ( ! $should_defer && is_string( $src ) && $src ) {
			foreach ( $defer_src_fragments as $fragment ) {
				if ( false !== strpos( $src, $fragment ) ) {
					$should_defer = true;
					break;
				}
			}
		}

		if ( $should_defer ) {
			if ( false !== strpos( $tag, ' defer' ) || false !== strpos( $tag, ' type="module"' ) ) {
				return $tag;
			}
			return str_replace( '<script ', '<script defer ', $tag );
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
