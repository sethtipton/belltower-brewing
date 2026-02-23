<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

function bt_parking_guide_rest_permission_edit( WP_REST_Request $request ) {
	if ( ! current_user_can( 'manage_options' ) ) {
		return new WP_Error( 'bt_parking_forbidden', 'You do not have permission to edit parking map data.', array( 'status' => 403 ) );
	}
	$nonce = $request->get_header( 'x-wp-nonce' );
	if ( ! $nonce || ! wp_verify_nonce( $nonce, 'wp_rest' ) ) {
		return new WP_Error( 'bt_parking_invalid_nonce', 'Invalid REST nonce.', array( 'status' => 403 ) );
	}
	return true;
}

function bt_parking_guide_rest_max_payload_bytes() {
	return 200000;
}

function bt_parking_guide_rest_get_map( WP_REST_Request $request ) {
	unset( $request );
	$post_id = bt_parking_guide_get_active_map_id();
	$map = bt_parking_guide_get_map_payload( $post_id );
	return rest_ensure_response(
		array(
			'id'  => intval( $post_id ),
			'map' => $map,
		)
	);
}

function bt_parking_guide_rest_update_map( WP_REST_Request $request ) {
	$raw_body = $request->get_body();
	if ( is_string( $raw_body ) && strlen( $raw_body ) > bt_parking_guide_rest_max_payload_bytes() ) {
		return new WP_Error(
			'bt_parking_payload_too_large',
			'Parking map payload exceeds the maximum allowed size.',
			array(
				'status'    => 413,
				'max_bytes' => bt_parking_guide_rest_max_payload_bytes(),
			)
		);
	}

	$body = $request->get_json_params();
	if ( null === $body && '' !== trim( (string) $raw_body ) ) {
		return new WP_Error(
			'bt_parking_invalid_json',
			'Request body must be valid JSON.',
			array(
				'status' => 400,
			)
		);
	}
	if ( ! is_array( $body ) ) {
		return new WP_Error(
			'bt_parking_invalid_payload',
			'Map payload must be a JSON object.',
			array(
				'status' => 400,
			)
		);
	}

	$map_payload = isset( $body['map'] ) ? $body['map'] : $body;
	if ( ! is_array( $map_payload ) ) {
		return new WP_Error(
			'bt_parking_invalid_map',
			'Map payload must be an object.',
			array(
				'status' => 400,
			)
		);
	}

	$post_id = bt_parking_guide_get_active_map_id();
	$result = bt_parking_guide_save_map_payload( $post_id, $map_payload );
	if ( is_wp_error( $result ) ) {
		$error_data = $result->get_error_data();
		if ( ! is_array( $error_data ) ) {
			$error_data = array();
		}
		if ( ! isset( $error_data['status'] ) ) {
			$error_data['status'] = 400;
		}
		$result->add_data( $error_data, $result->get_error_code() );
		return $result;
	}
	return rest_ensure_response(
		array(
			'id'  => intval( $post_id ),
			'map' => $result,
		)
	);
}

function bt_parking_guide_register_rest_routes() {
	register_rest_route(
		'bt-parking/v1',
		'/map',
		array(
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => 'bt_parking_guide_rest_get_map',
				'permission_callback' => '__return_true',
			),
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => 'bt_parking_guide_rest_update_map',
				'permission_callback' => 'bt_parking_guide_rest_permission_edit',
			),
		)
	);
}
add_action( 'rest_api_init', 'bt_parking_guide_register_rest_routes' );
