<?php
/**
 * The template for displaying the footer
 *
 * Contains the closing of the #content div and all content after.
 *
 * @link https://developer.wordpress.org/themes/basics/template-files/#template-partials
 *
 * @package belltower
 */

?>
	<footer id="footer" class="site-footer">
		<div class="footerw1 cwidth">

			<?php dynamic_sidebar( 'footer-contact' ); ?>

			<?php
				wp_nav_menu(
					array(
						'theme_location' => 'footer-1',
						'menu_id'        => 'footer-menu',
					)
				);
			?>

			<?php
				wp_nav_menu(
					array(
						'theme_location' => 'social-1',
						'menu_id'        => 'social-menu',
					)
				);
			?>

			<?php dynamic_sidebar( 'footer-newsletter' ); ?>
			

		</div>
	</footer>
</div><!-- #page -->

<?php wp_footer(); ?>

</body>
</html>
