<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

function bt_parking_guide_post_type() {
	return 'parking_map';
}

function bt_parking_guide_meta_key() {
	return '_bt_parking_map_json';
}

function bt_parking_guide_active_map_option_key() {
	return 'bt_parking_active_map_id';
}

function bt_parking_guide_decode_text_entities( $value ) {
	return wp_specialchars_decode( (string) $value, ENT_QUOTES );
}

function bt_parking_guide_sanitize_meta_json( $value ) {
	if ( ! is_string( $value ) ) {
		return '';
	}
	$decoded = json_decode( $value, true );
	if ( ! is_array( $decoded ) ) {
		return '';
	}
	$sanitized = bt_parking_guide_sanitize_map_payload( $decoded );
	if ( is_wp_error( $sanitized ) ) {
		return '';
	}
	return wp_json_encode( $sanitized );
}

function bt_parking_guide_register_post_type() {
	register_post_type(
		bt_parking_guide_post_type(),
		array(
			'labels'       => array(
				'name'          => 'Parking Maps',
				'singular_name' => 'Parking Map',
			),
			'public'       => false,
			'show_ui'      => true,
			'show_in_menu' => true,
			'show_in_rest' => true,
			'supports'     => array( 'title' ),
		)
	);

	register_post_meta(
		bt_parking_guide_post_type(),
		bt_parking_guide_meta_key(),
		array(
			'single'            => true,
			'show_in_rest'      => false,
			'type'              => 'string',
			'sanitize_callback' => 'bt_parking_guide_sanitize_meta_json',
		)
	);
}

function bt_parking_guide_get_default_map_data() {
	$theme_uri = get_stylesheet_directory_uri();

	return array(
		'version' => 1,
		'lotOrder' => array( 'north', 'east', 'south', 'main', 'street', 'bridge1', 'bridge2' ),
		'lots' => array(
			'east'    => array( array( -0.405, -1.045 ), array( 0.185, -1.648 ), array( 0.612, -1.351 ), array( -0.012, -0.794 ) ),
			'south'   => array( array( -0.309, -2.997 ), array( 0.348, -2.575 ), array( 0.101, -2.304 ), array( -0.591, -2.760 ) ),
			'north'   => array( array( -3.865, 0.314 ), array( -3.034, 0.823 ), array( -4.986, 2.656 ), array( -5.166, 2.522 ) ),
			'main'    => array( array( -1.882, -2.299 ), array( -1.402, -1.958 ), array( -1.730, -1.483 ), array( -2.266, -1.639 ) ),
			'street'  => array( array( -4.553, 2.620 ), array( -1.509, -0.167 ), array( 0.547, -2.229 ), array( 0.589, -2.174 ), array( -1.483, -0.102 ), array( -4.538, 2.688 ) ),
			'bridge1' => array( array( 1.258, -2.336 ), array( 2.397, -1.538 ), array( 2.364, -1.480 ), array( 1.230, -2.297 ) ),
			'bridge2' => array( array( 1.375, -2.526 ), array( 2.573, -1.668 ), array( 2.537, -1.621 ), array( 1.343, -2.482 ) ),
		),
		'labels' => array(
			'east'    => "East Lot:\nAcross the street from Bell Tower Brewing Co.\nFREE Nights (after 5PM) & Weekends.",
			'south'   => "South Lot:\nOne door down from Bell Tower Brewing Co.\nFREE Nights (after 5PM) & Weekends.\n311 W Main St., Kent, OH 44240",
			'north'   => "North Lot:\n500 ft North of our building.\nFREE 24/7.\n300 Gougler Ave., Kent, OH 44240",
			'main'    => "Main Lot:\nOur private 18-car parking lot with bike rack\n310 Park Ave., Kent, OH 44240",
			'street'  => "Street Parking:\nFREE 24/7 street parking.",
			'bridge1' => "Street Parking:\nFREE 24/7 street parking.",
			'bridge2' => "Street Parking:\nFREE 24/7 street parking.",
		),
		'guide' => array(
			'title' => 'Parking Guide',
			'intro' => 'Bell Tower Brewing Co. is located at 310 Park Ave., Kent, OH 44240. We have a private 18-car parking lot on-site as well as ample public parking surrounding our building. All highlighted yellow areas on the map are free, public parking available to our guests.',
			'bikeParking' => 'Bike Parking: We have two bike parking areas for your convenience. One is located at our main entrance, and the other is located on the Southeast corner of the building.',
			'altTransportation' => 'Alternative Transportation: The nearest major bus stop & station is the Kent Central Gateway, which is only a few minutes\' walk across the river.',
			'respectNotice' => 'Out of respect for our neighbors, please do not park on Park Ave.',
		),
		'images' => array(
			'background' => $theme_uri . '/images/parkingbackground.webp',
			'guide'      => $theme_uri . '/images/Parking-Map-Graphic-665x1024.png',
		),
	);
}

function bt_parking_guide_round_point( $value ) {
	return round( floatval( $value ), 3 );
}

function bt_parking_guide_normalize_textarea_newlines( $value ) {
	$text = bt_parking_guide_decode_text_entities( $value );

	// Decode escaped newline sequences before sanitization, then normalize line endings.
	$text = str_replace( array( '\r\n', '\n', '\r' ), "\n", $text );
	$text = str_replace( array( "\r\n", "\r" ), "\n", $text );

	// Repair previously-sanitized escaped newlines that became literal "n" after punctuation.
	if ( false === strpos( $text, "\n" ) && false === strpos( $text, '\\' ) ) {
		$text = preg_replace( '/([:.,;])n(?=[A-Z0-9])/', "$1\n", $text );
	}

	return sanitize_textarea_field( $text );
}

function bt_parking_guide_sanitize_points( $points, $fallback ) {
	$sanitized = array();
	if ( is_array( $points ) ) {
		foreach ( $points as $point ) {
			if ( ! is_array( $point ) || count( $point ) < 2 ) {
				continue;
			}
			if ( ! is_numeric( $point[0] ) || ! is_numeric( $point[1] ) ) {
				continue;
			}
			$x = floatval( $point[0] );
			$y = floatval( $point[1] );
			if ( ! is_finite( $x ) || ! is_finite( $y ) ) {
				continue;
			}
			$sanitized[] = array(
				bt_parking_guide_round_point( $x ),
				bt_parking_guide_round_point( $y ),
			);
		}
	}
	if ( empty( $sanitized ) ) {
		return $fallback;
	}
	return $sanitized;
}

function bt_parking_guide_sanitize_map_payload( $input ) {
	if ( ! is_array( $input ) ) {
		return new WP_Error( 'bt_parking_invalid_map', 'Map payload must be an object.' );
	}

	$default = bt_parking_guide_get_default_map_data();
	$lots_in = isset( $input['lots'] ) && is_array( $input['lots'] ) ? $input['lots'] : array();
	if ( empty( $lots_in ) ) {
		return new WP_Error( 'bt_parking_invalid_lots', 'Map payload must include lot coordinates.' );
	}

	$lots = array();
	foreach ( $default['lots'] as $lot_key => $fallback_points ) {
		$current_points = isset( $lots_in[ $lot_key ] ) ? $lots_in[ $lot_key ] : $fallback_points;
		$lots[ $lot_key ] = bt_parking_guide_sanitize_points( $current_points, $fallback_points );
	}

	foreach ( $lots_in as $raw_key => $raw_points ) {
		$lot_key = sanitize_key( $raw_key );
		if ( '' === $lot_key || isset( $lots[ $lot_key ] ) ) {
			continue;
		}
		$lots[ $lot_key ] = bt_parking_guide_sanitize_points( $raw_points, array( array( 0.0, 0.0 ), array( 0.2, 0.0 ), array( 0.2, 0.2 ) ) );
	}

	$labels_in = isset( $input['labels'] ) && is_array( $input['labels'] ) ? $input['labels'] : array();
	$labels = array();
	foreach ( $lots as $lot_key => $points ) {
		unset( $points );
		$default_label = isset( $default['labels'][ $lot_key ] ) ? $default['labels'][ $lot_key ] : strtoupper( $lot_key );
		$raw_label = isset( $labels_in[ $lot_key ] ) ? $labels_in[ $lot_key ] : $default_label;
		$labels[ $lot_key ] = bt_parking_guide_normalize_textarea_newlines( $raw_label );
	}

	$lot_order_in = isset( $input['lotOrder'] ) && is_array( $input['lotOrder'] ) ? $input['lotOrder'] : array_keys( $lots );
	$lot_order = array();
	foreach ( $lot_order_in as $lot_key ) {
		$key = sanitize_key( $lot_key );
		if ( '' !== $key && isset( $lots[ $key ] ) && ! in_array( $key, $lot_order, true ) ) {
			$lot_order[] = $key;
		}
	}
	foreach ( array_keys( $lots ) as $lot_key ) {
		if ( ! in_array( $lot_key, $lot_order, true ) ) {
			$lot_order[] = $lot_key;
		}
	}

	$guide_in = isset( $input['guide'] ) && is_array( $input['guide'] ) ? $input['guide'] : array();
	$guide_default = $default['guide'];
	$guide = array(
		'title'             => sanitize_text_field( bt_parking_guide_decode_text_entities( isset( $guide_in['title'] ) ? $guide_in['title'] : $guide_default['title'] ) ),
		'intro'             => bt_parking_guide_normalize_textarea_newlines( isset( $guide_in['intro'] ) ? $guide_in['intro'] : $guide_default['intro'] ),
		'bikeParking'       => bt_parking_guide_normalize_textarea_newlines( isset( $guide_in['bikeParking'] ) ? $guide_in['bikeParking'] : $guide_default['bikeParking'] ),
		'altTransportation' => bt_parking_guide_normalize_textarea_newlines( isset( $guide_in['altTransportation'] ) ? $guide_in['altTransportation'] : $guide_default['altTransportation'] ),
		'respectNotice'     => bt_parking_guide_normalize_textarea_newlines( isset( $guide_in['respectNotice'] ) ? $guide_in['respectNotice'] : $guide_default['respectNotice'] ),
	);

	$images_in = isset( $input['images'] ) && is_array( $input['images'] ) ? $input['images'] : array();
	$images_default = $default['images'];
	$images = array(
		'background' => esc_url_raw( isset( $images_in['background'] ) ? $images_in['background'] : $images_default['background'] ),
		'guide'      => esc_url_raw( isset( $images_in['guide'] ) ? $images_in['guide'] : $images_default['guide'] ),
	);

	return array(
		'version'   => 1,
		'lotOrder'  => $lot_order,
		'lots'      => $lots,
		'labels'    => $labels,
		'guide'     => $guide,
		'images'    => $images,
		'updatedAt' => current_time( 'c' ),
	);
}

function bt_parking_guide_find_default_map_post_id() {
	$existing = get_page_by_title( 'Default Parking Map', OBJECT, bt_parking_guide_post_type() );
	if ( $existing && isset( $existing->ID ) ) {
		return intval( $existing->ID );
	}
	return 0;
}

function bt_parking_guide_create_default_map_post() {
	$post_id = wp_insert_post(
		array(
			'post_type'   => bt_parking_guide_post_type(),
			'post_title'  => 'Default Parking Map',
			'post_status' => 'publish',
		)
	);
	if ( is_wp_error( $post_id ) || ! $post_id ) {
		return 0;
	}
	$map = bt_parking_guide_get_default_map_data();
	$sanitized = bt_parking_guide_sanitize_map_payload( $map );
	if ( is_wp_error( $sanitized ) ) {
		$sanitized = $map;
	}
	update_post_meta( $post_id, bt_parking_guide_meta_key(), wp_json_encode( $sanitized ) );
	return intval( $post_id );
}

function bt_parking_guide_ensure_default_map() {
	$post_id = bt_parking_guide_find_default_map_post_id();
	if ( ! $post_id ) {
		$post_id = bt_parking_guide_create_default_map_post();
	}
	if ( $post_id ) {
		update_option( bt_parking_guide_active_map_option_key(), $post_id, false );
	}
	return $post_id;
}

function bt_parking_guide_is_valid_map_post( $post_id ) {
	$post_id = intval( $post_id );
	if ( $post_id <= 0 ) {
		return false;
	}
	if ( bt_parking_guide_post_type() !== get_post_type( $post_id ) ) {
		return false;
	}
	$status = get_post_status( $post_id );
	return in_array( $status, array( 'publish', 'draft', 'private' ), true );
}

function bt_parking_guide_get_active_map_id() {
	$active_id = intval( get_option( bt_parking_guide_active_map_option_key(), 0 ) );
	if ( bt_parking_guide_is_valid_map_post( $active_id ) ) {
		return $active_id;
	}

	$posts = get_posts(
		array(
			'post_type'      => bt_parking_guide_post_type(),
			'post_status'    => array( 'publish', 'draft', 'private' ),
			'posts_per_page' => 1,
			'orderby'        => 'date',
			'order'          => 'ASC',
			'fields'         => 'ids',
		)
	);
	if ( ! empty( $posts ) ) {
		$active_id = intval( $posts[0] );
		update_option( bt_parking_guide_active_map_option_key(), $active_id, false );
		return $active_id;
	}

	return bt_parking_guide_ensure_default_map();
}

function bt_parking_guide_get_map_payload( $post_id ) {
	$post_id = intval( $post_id );
	if ( ! bt_parking_guide_is_valid_map_post( $post_id ) ) {
		return bt_parking_guide_get_default_map_data();
	}

	$raw = get_post_meta( $post_id, bt_parking_guide_meta_key(), true );
	if ( ! is_string( $raw ) || '' === trim( $raw ) ) {
		$default = bt_parking_guide_get_default_map_data();
		update_post_meta( $post_id, bt_parking_guide_meta_key(), wp_json_encode( $default ) );
		return $default;
	}
	$decoded = json_decode( $raw, true );
	if ( ! is_array( $decoded ) ) {
		return bt_parking_guide_get_default_map_data();
	}
	$sanitized = bt_parking_guide_sanitize_map_payload( $decoded );
	if ( is_wp_error( $sanitized ) ) {
		return bt_parking_guide_get_default_map_data();
	}
	return $sanitized;
}

function bt_parking_guide_save_map_payload( $post_id, $payload ) {
	$post_id = intval( $post_id );
	if ( ! bt_parking_guide_is_valid_map_post( $post_id ) ) {
		return new WP_Error( 'bt_parking_invalid_post', 'Invalid parking map post.' );
	}
	$sanitized = bt_parking_guide_sanitize_map_payload( $payload );
	if ( is_wp_error( $sanitized ) ) {
		return $sanitized;
	}
	update_post_meta( $post_id, bt_parking_guide_meta_key(), wp_json_encode( $sanitized ) );
	return $sanitized;
}
