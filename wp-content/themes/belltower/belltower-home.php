<?php
/**
 * Template Name: Home Page
 *
 * @link https://developer.wordpress.org/themes/basics/template-hierarchy/
 *
 * @package belltower
 */

get_header();
?>

<!-- OG
	<div id="home-head" class="home-head">
		<div class="home-headw2 cwidth">
			<h1>Simple & Seasonal</h1>
			<div class="home-headc1">
				<div class="home-headc1w1">
					<strong>Thursday</strong>
					<p>4-11PM</p>
					<strong>Friday - Sunday</strong>
					<p>12-11PM</p>
				</div>
			</div>
			<div class="home-headc2" style="background-image: url('<?php the_post_thumbnail_url(); ?>')">
				<img alt="bell-outline" src="/wp-content/themes/belltower/images/BTB-Bell-Outline-Green.svg">
			</div>
			<div class="home-headc3">
				<div class="home-headc3w1">
					<strong>Beer</strong>
					<a href='/beer'>What's on Tap</a>
					<strong>Food</strong>
					<a href='/food/menu'>View our Menu</a>
				</div>
			</div>
		</div>
	</div>
-->

	<div id="home-head" class="home-head" style="background-image: url('<?php the_post_thumbnail_url(); ?>')">
		<div class="home-headw2 cwidth">

			<?php dynamic_sidebar( 'bt-home-hero' ); ?>
			
		</div>
	</div>

	<main id="primary" class="site-main bt-home">
		<?php
		while ( have_posts() ) :
			the_post();

			get_template_part( 'template-parts/content', 'page' );

			// If comments are open or we have at least one comment, load up the comment template.
			if ( comments_open() || get_comments_number() ) :
				comments_template();
			endif;

		endwhile; // End of the loop.
		?>
	
	</main><!-- #main -->

<?php
get_sidebar();
get_footer();
