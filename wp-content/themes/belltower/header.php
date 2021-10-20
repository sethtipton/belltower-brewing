<?php
/**
 * The header for our theme
 *
 * This is the template that displays all of the <head> section and everything up until <div id="content">
 *
 * @link https://developer.wordpress.org/themes/basics/template-files/#template-partials
 *
 * @package belltower
 */

?>
<!doctype html>
<html <?php language_attributes(); ?>>
<head>
	<meta charset="<?php bloginfo( 'charset' ); ?>">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<link rel="profile" href="https://gmpg.org/xfn/11">

	<?php wp_head(); ?>

	<!-- Global site tag (gtag.js) - Google Analytics -->
	<script async src="https://www.googletagmanager.com/gtag/js?id=UA-177426451-1"></script>
	<script>
		window.dataLayer = window.dataLayer || [];
		function gtag(){dataLayer.push(arguments);}
		gtag('js', new Date());
		gtag('config', 'UA-177426451-1');
	</script>
	<!-- End Google Analytics -->

</head>

<body <?php body_class(); ?>>
<?php wp_body_open(); ?>
<div id="page" class="site swidth">
	<a class="skip-link screen-reader-text" href="#primary"><?php esc_html_e( 'Skip to content', 'belltower' ); ?></a>
	<div id="pixel-to-watch"></div>
	<header id="masthead" class="site-header">

		<!--
		<div class="site-branding">
			<?php
			the_custom_logo();
			if ( is_front_page() && is_home() ) :
				?>
				<h1 class="site-title"><a href="<?php echo esc_url( home_url( '/' ) ); ?>" rel="home"><?php bloginfo( 'name' ); ?></a></h1>
				<?php
			else :
				?>
				<p class="site-title"><a href="<?php echo esc_url( home_url( '/' ) ); ?>" rel="home"><?php bloginfo( 'name' ); ?></a></p>
				<?php
			endif;
			$belltower_description = get_bloginfo( 'description', 'display' );
			if ( $belltower_description || is_customize_preview() ) :
				?>
				<p class="site-description"><?php echo $belltower_description; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></p>
			<?php endif; ?>
		</div>
		-->

		<div class="site-header-w1 cwidth">

			<nav id="site-navigation" class="main-navigation">
				
				<button class="menu-toggle" aria-controls="primary-menu" aria-expanded="false">
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" preserveAspectRatio="none">
						<title>Menu</title>
						<path d="M16,4 L2,4" class="p1"></path>
						<path d="M2,12 L22,12" class="p2"></path>
						<path d="M2,20 L16,20" class="p3"></path>
						<path d="M0,12 L24,12" class="p4"></path>
						<path d="M0,12 L24,12" class="p5"></path>
					</svg>
					<span><?php esc_html_e( 'Menu', 'belltower' ); ?></span>
				</button>

				<?php
				wp_nav_menu(
					array(
						'theme_location' => 'menu-1',
						'menu_id'        => 'primary-menu',
					)
				);
				?>
			</nav><!-- #site-navigation -->

		</div>


	</header><!-- #masthead -->
