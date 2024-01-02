<?php
/**
 * The template for displaying all single posts
 *
 * @link https://developer.wordpress.org/themes/basics/template-hierarchy/#single-post
 *
 * @package belltower
 */

get_header();
?>
	<main id="primary" class="site-main default-page btpost-page">

		<?php
		while ( have_posts() ) :
			the_post();

			get_template_part( 'template-parts/content', get_post_type() );

			// Check if the 'google_calendar_link' field has a value
			if(get_field('google_calendar_link')): 
				$googleCalendarLink = get_field('google_calendar_link');
				echo '<div class="googlecalwrap cwidth">';
				echo '<a class="googlecal" target="_blank" href="' . esc_url($googleCalendarLink) . '">Add this event to your Google calendar</a>';
				echo '</div>';
			endif;

			the_post_navigation(
				array(
					'prev_text' => '<span class="nav-subtitle">' . esc_html__( 'Previous:', 'belltower' ) . '</span> <span class="nav-title">%title</span>',
					'next_text' => '<span class="nav-subtitle">' . esc_html__( 'Next:', 'belltower' ) . '</span> <span class="nav-title">%title</span>',
				)
			);

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
