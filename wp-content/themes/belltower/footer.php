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


				<!-- Begin Mailchimp Signup Form -->
				<!--
				<div id="mc_embed_signup">
					<form action="https://belltowerbrewing.us17.list-manage.com/subscribe/post?u=f39e6aaf2e41a7b8038679fb5&amp;id=a293f50378" method="post" id="mc-embedded-subscribe-form" name="mc-embedded-subscribe-form" class="validate" target="_blank" novalidate>
						<div id="mc_embed_signup_scroll">
							<div class="mc-field-group">
								<label for="mce-EMAIL">Email Address  <span class="asterisk">*</span></label>
								<input type="email" value="" name="EMAIL" class="required email" id="mce-EMAIL">
							</div>
							<div class="mc-field-group">
								<label for="mce-FNAME">First Name </label>
								<input type="text" value="" name="FNAME" class="" id="mce-FNAME">
							</div>
							<div class="mc-field-group">
								<label for="mce-LNAME">Last Name </label>
								<input type="text" value="" name="LNAME" class="" id="mce-LNAME">
							</div>
							<div id="mce-responses" class="clear">
								<div class="response" id="mce-error-response" style="display:none"></div>
								<div class="response" id="mce-success-response" style="display:none"></div>
							</div>
							<div style="position: absolute; left: -5000px;" aria-hidden="true">
								<input type="text" name="b_f39e6aaf2e41a7b8038679fb5_a293f50378" tabindex="-1" value="">
							</div>
							<div class="clear">
								<input type="submit" value="Go" name="subscribe" id="mc-embedded-subscribe" class="button">
							</div>
						</div>
					</form>
				</div>
				<script type='text/javascript' src='//s3.amazonaws.com/downloads.mailchimp.com/js/mc-validate.js'></script><script type='text/javascript'>(function($) {window.fnames = new Array(); window.ftypes = new Array();fnames[0]='EMAIL';ftypes[0]='email';fnames[1]='FNAME';ftypes[1]='text';fnames[2]='LNAME';ftypes[2]='text';fnames[5]='BIRTHDAY';ftypes[5]='birthday';}(jQuery));var $mcj = jQuery.noConflict(true);</script>
				-->
				<!--End mc_embed_signup-->

			</div>
			

		</div>
	</footer>
</div><!-- #page -->

<?php wp_footer(); ?>

</body>
</html>
