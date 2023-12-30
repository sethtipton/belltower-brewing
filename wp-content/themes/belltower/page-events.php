<?php
/**
 * Template Name: Events Page
 *
 * @link https://developer.wordpress.org/themes/basics/template-hierarchy/
 *
 * @package belltower
 */

get_header();
?>

	<main id="primary" class="site-main default-page events-page">

<!-- 
		<div class="events-feed">
			<?php
			$paged = (get_query_var('paged')) ? get_query_var('paged') : 1;
			$args = array(
				'post_type' => 'post',
				'post_status' => 'publish',
				'category_name' => 'events',
				'posts_per_page' => 5,
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

		
			if ( $arr_posts->have_posts() ) :
		
				while ( $arr_posts->have_posts() ) :
					$arr_posts->the_post();
					?>
					<article id="post-<?php the_ID(); ?>" <?php post_class(); ?>>
						<?php
						if ( has_post_thumbnail() ) :
							the_post_thumbnail();
						endif;
						?>
						<header class="entry-header">
							<h1 class="entry-title"><?php the_title(); ?></h1>
						</header>
						<div class="entry-content">
							<?php the_excerpt(); ?>
							<a href="<?php the_permalink(); ?>">Read Mores</a>
						</div>
					</article>
					<?php
				endwhile;
				/*
				wp_pagenavi(
					array(
						'query' => $arr_posts,
					)
				);
				*/
			endif;
			?>
		</div>
-->
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
