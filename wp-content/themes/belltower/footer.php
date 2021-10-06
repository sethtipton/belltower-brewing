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

			<div class="footerc1">
				<?php dynamic_sidebar( 'footer-contact' ); ?>
			</div>

			<div class="footerc2">
				<strong>Info</strong>
				<?php
					wp_nav_menu(
						array(
							'theme_location' => 'footer-1',
							'menu_id'        => 'footer-menu',
						)
					);
				?>
			</div>

			<div class="footerc3">
				<strong>Social</strong>
				<?php
					wp_nav_menu(
						array(
							'theme_location' => 'social-1',
							'menu_id'        => 'social-menu',
						)
					);
				?>
			</div>

			<div class="footerc4">
				<?php dynamic_sidebar( 'footer-newsletter' ); ?>
			</div>
			

		</div>
	</footer>
</div><!-- #page -->

<?php wp_footer(); ?>

</body>
</html>
