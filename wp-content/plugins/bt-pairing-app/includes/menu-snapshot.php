<?php
/**
 * Canonical menu snapshot helpers (Phase 1 foundation).
 *
 * This is intentionally simple:
 * - one stored latest snapshot
 * - one stored latest normalized beer payload
 * - one stored latest normalized food payload
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

function bt_pairing_menu_snapshot_option_key() {
	return 'bt_pairing_menu_snapshot_latest';
}

function bt_pairing_menu_sources_option_key() {
	return 'bt_pairing_menu_sources_latest';
}

function bt_pairing_menu_schema_version() {
	return 1;
}

function bt_pairing_menu_normalize_item( $raw, $kind ) {
	if ( ! is_array( $raw ) ) {
		return array();
	}

	$name        = isset( $raw['name'] ) ? sanitize_text_field( (string) $raw['name'] ) : '';
	$style       = isset( $raw['style'] ) ? sanitize_text_field( (string) $raw['style'] ) : '';
	$category    = isset( $raw['category'] ) ? sanitize_text_field( (string) $raw['category'] ) : '';
	$description = isset( $raw['description'] ) ? sanitize_textarea_field( (string) $raw['description'] ) : '';
	$id_raw      = isset( $raw['id'] ) ? (string) $raw['id'] : '';
	$id          = '' !== $id_raw ? sanitize_text_field( $id_raw ) : sanitize_title( $name );
	$bt_key      = isset( $raw['btKey'] ) ? sanitize_text_field( (string) $raw['btKey'] ) : '';

	$item = array(
		'id'          => $id,
		'name'        => $name,
		'category'    => $category,
		'style'       => $style,
		'description' => $description,
	);

	if ( '' !== $bt_key ) {
		$item['btKey'] = $bt_key;
	}

	if ( isset( $raw['abv'] ) ) {
		$item['abv'] = is_numeric( $raw['abv'] ) ? (float) $raw['abv'] : sanitize_text_field( (string) $raw['abv'] );
	}
	if ( isset( $raw['ibu'] ) ) {
		$item['ibu'] = is_numeric( $raw['ibu'] ) ? (float) $raw['ibu'] : sanitize_text_field( (string) $raw['ibu'] );
	}
	if ( isset( $raw['hexColor'] ) ) {
		$item['hexColor'] = sanitize_text_field( (string) $raw['hexColor'] );
	}
	if ( isset( $raw['srm'] ) && is_numeric( $raw['srm'] ) ) {
		$item['srm'] = (float) $raw['srm'];
	}

	if ( 'food' === $kind ) {
		if ( isset( $raw['price'] ) ) {
			$item['price'] = sanitize_text_field( (string) $raw['price'] );
		}
		if ( isset( $raw['priceDisplay'] ) ) {
			$item['priceDisplay'] = sanitize_text_field( (string) $raw['priceDisplay'] );
		}
		if ( isset( $raw['tags'] ) ) {
			$item['tags'] = sanitize_text_field( (string) $raw['tags'] );
		}
		if ( isset( $raw['addOns'] ) ) {
			$item['addOns'] = sanitize_text_field( (string) $raw['addOns'] );
		}
	}

	// Remove empty values for cleaner snapshots.
	foreach ( $item as $key => $value ) {
		if ( '' === $value || null === $value ) {
			unset( $item[ $key ] );
		}
	}

	return $item;
}

function bt_pairing_menu_extract_items( $payload ) {
	if ( is_array( $payload ) && isset( $payload['items'] ) && is_array( $payload['items'] ) ) {
		return $payload['items'];
	}
	if ( is_array( $payload ) ) {
		return $payload;
	}
	return array();
}

function bt_pairing_menu_normalize_payload( $kind, $payload, $source = array() ) {
	$kind = 'beer' === $kind ? 'beer' : 'food';
	$items = bt_pairing_menu_extract_items( $payload );
	$normalized_items = array();

	foreach ( $items as $raw_item ) {
		$normalized_item = bt_pairing_menu_normalize_item( is_array( $raw_item ) ? $raw_item : array(), $kind );
		if ( ! empty( $normalized_item ) ) {
			$normalized_items[] = $normalized_item;
		}
	}

	$categories = array_values(
		array_unique(
			array_filter(
				array_map(
					function( $item ) {
						return isset( $item['category'] ) ? (string) $item['category'] : '';
					},
					$normalized_items
				)
			)
		)
	);

	$source_name = isset( $source['name'] ) ? sanitize_text_field( (string) $source['name'] ) : '';
	$source_url  = isset( $source['url'] ) ? esc_url_raw( (string) $source['url'] ) : '';

	return array(
		'kind'       => $kind,
		'generatedAt'=> gmdate( 'c' ),
		'source'     => array(
			'name' => $source_name,
			'url'  => $source_url,
		),
		'counts'     => array(
			'items'      => count( $normalized_items ),
			'categories' => count( $categories ),
		),
		'categories' => $categories,
		'items'      => $normalized_items,
	);
}

function bt_pairing_menu_hash_items( $items ) {
	return md5( wp_json_encode( $items ) );
}

function bt_pairing_menu_build_snapshot( $beer_payload, $food_payload, $meta = array() ) {
	$beer_items = isset( $beer_payload['items'] ) && is_array( $beer_payload['items'] ) ? $beer_payload['items'] : array();
	$food_items = isset( $food_payload['items'] ) && is_array( $food_payload['items'] ) ? $food_payload['items'] : array();
	$beer_hash  = bt_pairing_menu_hash_items( $beer_items );
	$food_hash  = bt_pairing_menu_hash_items( $food_items );

	$source_meta = array(
		'lastIntakeKind' => isset( $meta['lastIntakeKind'] ) ? sanitize_text_field( (string) $meta['lastIntakeKind'] ) : '',
		'rebuiltBy'      => isset( $meta['rebuiltBy'] ) ? sanitize_text_field( (string) $meta['rebuiltBy'] ) : '',
	);

	return array(
		'version'     => bt_pairing_menu_schema_version(),
		'generatedAt' => gmdate( 'c' ),
		'fingerprint' => array(
			'beer'     => $beer_hash,
			'food'     => $food_hash,
			'combined' => sha1( $beer_hash . '|' . $food_hash ),
		),
		'source'      => $source_meta,
		'beer'        => $beer_payload,
		'food'        => $food_payload,
	);
}

function bt_pairing_menu_get_sources() {
	$sources = get_option( bt_pairing_menu_sources_option_key(), array() );
	return is_array( $sources ) ? $sources : array();
}

function bt_pairing_menu_get_snapshot() {
	$snapshot = get_option( bt_pairing_menu_snapshot_option_key(), null );
	return is_array( $snapshot ) ? $snapshot : null;
}

function bt_pairing_menu_save_snapshot( $snapshot, $sources ) {
	update_option( bt_pairing_menu_snapshot_option_key(), $snapshot, false );
	update_option( bt_pairing_menu_sources_option_key(), $sources, false );
}

function bt_pairing_menu_intake_payload( $kind, $payload, $source = array() ) {
	$kind = 'beer' === $kind ? 'beer' : 'food';
	$sources = bt_pairing_menu_get_sources();
	$normalized = bt_pairing_menu_normalize_payload( $kind, $payload, $source );

	$sources[ $kind ] = $normalized;

	$beer_payload = isset( $sources['beer'] ) && is_array( $sources['beer'] ) ? $sources['beer'] : bt_pairing_menu_normalize_payload( 'beer', array(), array( 'name' => 'empty' ) );
	$food_payload = isset( $sources['food'] ) && is_array( $sources['food'] ) ? $sources['food'] : bt_pairing_menu_normalize_payload( 'food', array(), array( 'name' => 'empty' ) );

	$snapshot = bt_pairing_menu_build_snapshot(
		$beer_payload,
		$food_payload,
		array(
			'lastIntakeKind' => $kind,
			'rebuiltBy'      => isset( $source['rebuiltBy'] ) ? $source['rebuiltBy'] : 'intake',
		)
	);

	bt_pairing_menu_save_snapshot( $snapshot, $sources );

	return $snapshot;
}

function bt_pairing_menu_rebuild_snapshot() {
	$sources = bt_pairing_menu_get_sources();
	if ( empty( $sources['beer'] ) || empty( $sources['food'] ) ) {
		return new WP_Error( 'bt_menu_snapshot_missing_sources', 'Cannot rebuild snapshot before both beer and food have been ingested.' );
	}

	$beer_payload = is_array( $sources['beer'] ) ? $sources['beer'] : array();
	$food_payload = is_array( $sources['food'] ) ? $sources['food'] : array();

	$snapshot = bt_pairing_menu_build_snapshot(
		$beer_payload,
		$food_payload,
		array(
			'lastIntakeKind' => 'rebuild',
			'rebuiltBy'      => 'manual',
		)
	);

	bt_pairing_menu_save_snapshot( $snapshot, $sources );
	return $snapshot;
}

function bt_pairing_menu_clear_snapshot() {
	delete_option( bt_pairing_menu_snapshot_option_key() );
	delete_option( bt_pairing_menu_sources_option_key() );
}
