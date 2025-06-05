<?php
/**
 * Template Name: Upcoming Events
 *
 * @link https://developer.wordpress.org/themes/basics/template-hierarchy/
 *
 * @package belltower
 */

get_header();
?>

	<main id="primary" class="site-main default-page events-page">

<article id="post-<?php the_ID(); ?>" <?php post_class(); ?>>

       <header id="entry-header" class="entry-header <?php echo esc_attr( get_field( 'apply_overlay_to_featured_image' ) ); ?>" style="background-image: url('<?php the_post_thumbnail_url(); ?>')">

		<?php the_title( '<h1 class="entry-title">', '</h1>' ); ?>
	</header><!-- .entry-header -->

	<!-- ACF Adds cwidth class here if "Page Width" is true -->
	<div class="entry-content <?php if( get_field('limit-width') ): ?>cwidth<?php endif;?>">



		<div class="events-feed">
			<?php
			$paged = (get_query_var('paged')) ? get_query_var('paged') : 1;
			$args = array(
				'post_type' => 'post',
				'post_status' => 'publish',
				'category_name' => 'events',
				'posts_per_page' => 25,
				'paged' => $paged,
				'meta_key' => 'event_date', // ACF field name
				'orderby' => 'meta_value', // Order by the meta value
				'order' => 'ASC', // Ascending order
				'meta_query' => array(
					array(
						'key' => 'event_date',
						'value' => date('Ymd'), // Current date in Ymd format
						'compare' => '>=', // Show events from today onwards
						'type' => 'NUMERIC'
					),
				),
			);
			$arr_posts = new WP_Query($args);

		
			if ( $arr_posts->have_posts() ) :
		
				while ( $arr_posts->have_posts() ) :
					$arr_posts->the_post();
					?>
					<article id="post-<?php the_ID(); ?>" <?php post_class(); ?>>
						
						<?php if ( has_post_thumbnail() ) : ?>
							<a href="<?php the_permalink(); ?>" class="event_thumbnail">
								<?php the_post_thumbnail(); ?>
							</a>
						<?php endif; ?>
						
						<a href="<?php the_permalink(); ?>" class="event_title">
							<h2 class="entry-title"><?php the_title(); ?></h2>
							<span class="event_date">
								<?php the_field('event_date'); ?>
							</span>
							<span class="event_time">
								<?php the_field('event_time'); ?>
							</span>
						</a>
						
						<?php the_excerpt(); ?>

						<a href="<?php the_permalink(); ?>" class="event_readmore">Read More</a>
						
					</article>
					<?php
				endwhile;
				
				//wp_pagenavi(
				//	array(
				//		'query' => $arr_posts,
				//	)
				//);
				
			endif;
			?>

			<?php if ( $arr_posts->max_num_pages > 1 ) : ?>
				<div class="pagination">
					<?php
					echo paginate_links( array(
						'total' => $arr_posts->max_num_pages,
						'current' => max( 1, get_query_var('paged') ),
						'format' => '?paged=%#%',
						'prev_text' => __('« Previous'),
						'next_text' => __('Next »'),
					) );
					?>
				</div>
			<?php endif; ?>


		</div>

	</div><!-- .entry-content -->

	<?php if ( get_edit_post_link() ) : ?>
		<footer class="entry-footer">
			<?php
			edit_post_link(
				sprintf(
					wp_kses(
						/* translators: %s: Name of current post. Only visible to screen readers */
						__( 'Edit <span class="screen-reader-text">%s</span>', 'belltower' ),
						array(
							'span' => array(
								'class' => array(),
							),
						)
					),
					wp_kses_post( get_the_title() )
				),
				'<span class="edit-link">',
				'</span>'
			);
			?>
		</footer><!-- .entry-footer -->
	<?php endif; ?>
</article><!-- #post-<?php the_ID(); ?> -->




	</main><!-- #main -->

<?php
get_sidebar();
get_footer();
