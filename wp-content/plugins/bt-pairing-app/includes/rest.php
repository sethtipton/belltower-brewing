<?php
/**
 * Pairing REST routes and helpers migrated from theme.
 */
/**
 * Beer color REST endpoint: batches descriptions to Responses API and returns SRM/hex.
 */
add_action(
	'rest_api_init',
	function() {
		register_rest_route(
			'bt/v1',
			'/beer-colors',
			array(
				'methods'             => 'POST',
				'callback'            => 'bt_beer_colors_handler',
				'permission_callback' => '__return_true', // Consider tightening if needed.
			)
		);
	}
);

function bt_beer_colors_handler( WP_REST_Request $request ) {
	$body = $request->get_json_params();
	if ( empty( $body['items'] ) || ! is_array( $body['items'] ) ) {
		return new WP_REST_Response( array( 'error' => 'missing items' ), 400 );
	}

	$items = array_map(
		function( $it ) {
			return array(
				'id'          => isset( $it['id'] ) ? (string) $it['id'] : '',
				'description' => isset( $it['description'] ) ? (string) $it['description'] : '',
			);
		},
		$body['items']
	);

	$cache_key = 'bt_beer_colors_v2_' . md5( wp_json_encode( $items ) );
	$cached    = get_transient( $cache_key );
	if ( $cached ) {
		return rest_ensure_response( $cached );
	}
	$openai = bt_pairing_app_get_openai_config();
	$openai_key   = isset( $openai['api_key'] ) ? (string) $openai['api_key'] : '';
	$openai_model = isset( $openai['model'] ) ? (string) $openai['model'] : '';
	if ( '' === $openai_key ) {
		return bt_pairing_app_openai_error_response();
	}

	$prompt = bt_build_color_extractor_prompt( $items );

	$payload = array(
		'model' => $openai_model,
		'input' => array(
			array(
				'role'    => 'user',
				'content' => $prompt,
			),
		),
	);

	// Log payload metrics for debugging.
	error_log(
			'[bt_beer_colors] request ' . wp_json_encode(
				array(
					'model'       => $openai_model,
				'items_count' => count( $items ),
				'payload_len' => strlen( wp_json_encode( $payload ) ),
				'prompt'      => $prompt,
			)
		)
	);

	$response = wp_remote_post(
		'https://api.openai.com/v1/responses',
		array(
			'headers' => array(
				'Authorization' => 'Bearer ' . $openai_key,
				'Content-Type'  => 'application/json',
			),
			'body'    => wp_json_encode( $payload ),
			'timeout' => 20,
		)
	);

	// Debug logging for connectivity issues.
	$log_ctx = array(
		'route'       => 'beer-colors',
		'url'         => 'https://api.openai.com/v1/responses',
		'model'       => $openai_model,
		'items_count' => count( $items ),
		'payload_len' => strlen( wp_json_encode( $payload ) ),
	);
	if ( is_wp_error( $response ) ) {
		error_log( '[bt_beer_colors] error ' . wp_json_encode( array_merge( $log_ctx, array( 'error' => $response->get_error_message() ) ) ) );
		return new WP_REST_Response( array( 'error' => $response->get_error_message() ), 500 );
	}
	$http_code = wp_remote_retrieve_response_code( $response );
	error_log( '[bt_beer_colors] response ' . wp_json_encode( array_merge( $log_ctx, array( 'status' => $http_code ) ) ) );

	if ( is_wp_error( $response ) ) {
		return new WP_REST_Response( array( 'error' => $response->get_error_message() ), 500 );
	}

	$code       = wp_remote_retrieve_response_code( $response );
	$resp_body  = wp_remote_retrieve_body( $response );
	$resp_dec   = json_decode( $resp_body, true );
	$answer_txt = '';

	if ( isset( $resp_dec['output'][0]['content'][0]['text'] ) ) {
		$answer_txt = $resp_dec['output'][0]['content'][0]['text'];
	} elseif ( isset( $resp_dec['output_text'] ) ) {
		$answer_txt = $resp_dec['output_text'];
	} elseif ( isset( $resp_dec['output'][0]['text'] ) ) {
		$answer_txt = $resp_dec['output'][0]['text'];
	} elseif ( isset( $resp_dec['output'][0]['content'] ) && is_array( $resp_dec['output'][0]['content'] ) ) {
		foreach ( $resp_dec['output'][0]['content'] as $c ) {
			if ( is_string( $c ) ) {
				$answer_txt .= $c;
			} elseif ( is_array( $c ) && isset( $c['text'] ) ) {
				$answer_txt .= $c['text'];
			}
		}
	}

	$json_array = bt_try_parse_response_json_array( $answer_txt ? $answer_txt : $resp_body );
	if ( ! $json_array || ! is_array( $json_array ) ) {
		return new WP_REST_Response(
			array(
				'error' => 'Could not parse model output',
				'raw'   => $resp_body,
				'body'  => $resp_dec,
			),
			$code >= 200 && $code < 300 ? 500 : $code
		);
	}

	$results = array();
	foreach ( $json_array as $obj ) {
		$id   = isset( $obj['id'] ) ? (string) $obj['id'] : uniqid( 'beer_' );
		$seed = isset( $obj['id'] ) ? $id : '';
		$computed = bt_compute_color_from_attributes( $obj, $seed );
		$results[] = array_merge( array( 'id' => $id ), $computed );
	}

	set_transient( $cache_key, $results, 60 * DAY_IN_SECONDS );
	bt_beer_colors_index_add( $cache_key );

	return rest_ensure_response( $results );
}

function bt_build_color_extractor_prompt( $items ) {
	$json = wp_json_encode( $items, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE );

	return "You are a precise extractor. Given the following JSON array of beer objects with fields {id, style, description}, return ONLY a JSON array of objects with fields:
- id (string)
- style (string|null)
- explicit_color_words (array of strings)
- clarity (\"clear\"|\"hazy\"|\"cloudy\"|\"opaque\"|null)
- fruit_tint (string|null)
- abv (number|null)
- ibu (number|null)

Rules:
- Preserve the id exactly as provided (do NOT change, slugify, or rename).
- If a field is unknown, set it to null or an empty array (for explicit_color_words).
- Output only valid JSON, no extra text or commentary.

Input:
{$json}

Return only valid JSON (no extra text).";
}

function bt_try_parse_response_json_array( $text ) {
	if ( ! is_string( $text ) ) {
		return null;
	}
	$first = strpos( $text, '[' );
	$last  = strrpos( $text, ']' );
	if ( false === $first || false === $last || $last <= $first ) {
		return null;
	}
	$substr = substr( $text, $first, $last - $first + 1 );
	$arr    = json_decode( $substr, true );
	return is_array( $arr ) ? $arr : null;
}

/**
 * Attempt to extract a JSON object from a model response, stripping markdown fences if present.
 */
function bt_extract_json_object( $text ) {
	if ( ! is_string( $text ) ) {
		return null;
	}
	$clean = trim( $text );

	// Strip ```json ... ``` fences.
	if ( preg_match( '/```json\s*(\{.*?\})\s*```/s', $clean, $matches ) ) {
		$clean = $matches[1];
	}

	// Try to capture from first { to last }.
	$first = strpos( $clean, '{' );
	$last  = strrpos( $clean, '}' );
	if ( false !== $first && false !== $last && $last > $first ) {
		$substr = substr( $clean, $first, $last - $first + 1 );
		$decoded = json_decode( $substr, true );
		if ( is_array( $decoded ) ) {
			return $decoded;
		}
	}

	// Fallback: straight decode.
	$decoded = json_decode( $clean, true );
	return is_array( $decoded ) ? $decoded : null;
}


function bt_hex_to_rgb( $hex ) {
	$clean = ltrim( (string) $hex, '#' );
	if ( strlen( $clean ) != 6 ) {
		return array( 0, 0, 0 );
	}
	return array(
		hexdec( substr( $clean, 0, 2 ) ),
		hexdec( substr( $clean, 2, 2 ) ),
		hexdec( substr( $clean, 4, 2 ) ),
	);
}

function bt_rgb_to_hex( $rgb ) {
	$r = max( 0, min( 255, (int) round( $rgb[0] ) ) );
	$g = max( 0, min( 255, (int) round( $rgb[1] ) ) );
	$b = max( 0, min( 255, (int) round( $rgb[2] ) ) );
	return sprintf( '#%02X%02X%02X', $r, $g, $b );
}

function bt_interpolate_hex( $hex_a, $hex_b, $t ) {
	$t = max( 0, min( 1, (float) $t ) );
	$a = bt_hex_to_rgb( $hex_a );
	$b = bt_hex_to_rgb( $hex_b );
	return bt_rgb_to_hex(
		array(
			$a[0] + ( $b[0] - $a[0] ) * $t,
			$a[1] + ( $b[1] - $a[1] ) * $t,
			$a[2] + ( $b[2] - $a[2] ) * $t,
		)
	);
}

function bt_srm_to_hex( $srm ) {
	$stops = array(
		array( 'srm' => 1,  'hex' => '#F8F5D7' ),
		array( 'srm' => 3,  'hex' => '#F4E9B9' ),
		array( 'srm' => 6,  'hex' => '#E9D792' ),
		array( 'srm' => 8,  'hex' => '#E2C06A' ),
		array( 'srm' => 10, 'hex' => '#D8B055' ),
		array( 'srm' => 12, 'hex' => '#C99745' ),
		array( 'srm' => 14, 'hex' => '#C07A2E' ),
		array( 'srm' => 16, 'hex' => '#A96630' ),
		array( 'srm' => 18, 'hex' => '#8F4B2D' ),
		array( 'srm' => 22, 'hex' => '#7A4330' ),
		array( 'srm' => 26, 'hex' => '#624032' ),
		array( 'srm' => 30, 'hex' => '#4C332E' ),
		array( 'srm' => 36, 'hex' => '#2F2320' ),
		array( 'srm' => 40, 'hex' => '#0B0B0B' ),
	);
	$srm = max( 1, min( 40, (float) $srm ) );
	$lower = $stops[0];
	$upper = end( $stops );
	foreach ( $stops as $stop ) {
		if ( $srm <= $stop['srm'] ) {
			$upper = $stop;
			break;
		}
		$lower = $stop;
	}
	if ( $upper['srm'] === $lower['srm'] ) {
		return $upper['hex'];
	}
	$t = ( $srm - $lower['srm'] ) / ( $upper['srm'] - $lower['srm'] );
	return bt_interpolate_hex( $lower['hex'], $upper['hex'], $t );
}

function bt_compute_color_from_attributes( $attrs, $seed = '' ) {
	$style = strtolower( sanitize_text_field( $attrs['style'] ?? '' ) );
	$words = array_map( 'strtolower', (array) ( $attrs['explicit_color_words'] ?? array() ) );
	$abv   = isset( $attrs['abv'] ) ? floatval( $attrs['abv'] ) : null;
	$fruit = strtolower( sanitize_text_field( (string) ( $attrs['fruit_tint'] ?? '' ) ) );

	$style_map = array(
		'pilsner'            => array( 2, 6 ),
		'schwarzbier'        => array( 16, 30 ),
		'stout'              => array( 30, 45 ),
		'porter'             => array( 20, 30 ),
		'hefeweizen'         => array( 3, 6 ),
		'brown ale'          => array( 15, 20 ),
		'barleywine'         => array( 10, 22 ),
		'cream ale'          => array( 3, 6 ),
		'festbier'           => array( 4, 7 ),
		'dubbel'             => array( 12, 18 ),
		'california common'  => array( 8, 15 ),
		'lager'              => array( 2, 6 ),
		'ipa'                => array( 6, 12 ),
		'pale ale'           => array( 4, 8 ),
	);

	$style_key = $style;
	if ( ! isset( $style_map[ $style_key ] ) && $style_key ) {
		foreach ( array_keys( $style_map ) as $candidate ) {
			if ( strpos( $style_key, $candidate ) !== false ) {
				$style_key = $candidate;
				break;
			}
		}
	}

	if ( isset( $style_map[ $style_key ] ) ) {
		list( $min, $max ) = $style_map[ $style_key ];
	} else {
		$min = 6;
		$max = 12;
	}

	if ( in_array( 'black', $words, true ) || in_array( 'very dark', $words, true ) ) {
		$min = 36;
		$max = 45;
	} elseif ( in_array( 'brown', $words, true ) ) {
		$min = min( $min, 15 );
		$max = max( $max, 22 );
	} elseif ( in_array( 'amber', $words, true ) || in_array( 'copper', $words, true ) ) {
		$min = min( $min, 10 );
		$max = max( $max, 14 );
	} elseif ( in_array( 'golden', $words, true ) ) {
		$min = min( $min, 4 );
		$max = max( $max, 8 );
	} elseif ( in_array( 'crimson', $words, true ) || in_array( 'red', $words, true ) || $fruit ) {
		$min = 6;
		$max = 14;
	}

	if ( $abv !== null && $abv > 8 ) {
		$min += 1;
		$max += 2;
	}

	$range = max( 0.1, $max - $min );
	$ratio = 0.5;
	if ( is_string( $seed ) && $seed != '' ) {
		$ratio = ( abs( crc32( $seed ) ) % 1000 ) / 1000;
	}
	$srm = $min + ( $range * $ratio );
	$hex = bt_srm_to_hex( $srm );

	return array(
		'style'           => $attrs['style'] ?? null,
		'srm'             => round( $srm, 1 ),
		'srm_range'       => array( $min, $max ),
		'hex'             => $hex,
		'confidence'      => 0.8,
		'short_rationale' => $attrs['short_rationale'] ?? '',
	);
}

function bt_compute_color_map_from_beers( $beer_catalog ) {
	$map = array();
	if ( ! is_array( $beer_catalog ) ) {
		return $map;
	}
	foreach ( $beer_catalog as $beer_item ) {
		if ( ! is_array( $beer_item ) ) {
			continue;
		}
		$id = isset( $beer_item['id'] ) ? (string) $beer_item['id'] : ( isset( $beer_item['name'] ) ? sanitize_title( $beer_item['name'] ) : '' );
		if ( ! $id ) {
			continue;
		}
		$attrs = array(
			'style'                => $beer_item['style'] ?? '',
			'explicit_color_words' => array(),
			'fruit_tint'           => '',
			'abv'                  => isset( $beer_item['abv'] ) ? floatval( $beer_item['abv'] ) : null,
		);
		$computed = bt_compute_color_from_attributes( $attrs, $id );
		$map[ $id ] = array(
			'hex' => $computed['hex'],
			'srm' => $computed['srm'],
		);
	}
	return $map;
}

/**
 * Helpers for pairing/history caching.
 */
function bt_pairing_hash_string( $value ) {
	$str  = (string) $value;
	$hash = 5381;
	$len  = strlen( $str );
	for ( $i = 0; $i < $len; $i++ ) {
		$hash = ( ( $hash << 5 ) + $hash ) ^ ord( $str[ $i ] );
		$hash = $hash & 0xffffffff;
	}
	if ( $hash < 0 ) {
		$hash += 0x100000000;
	}
	return base_convert( $hash, 10, 36 );
}

function bt_pairing_fingerprint_beers( $items ) {
	if ( ! is_array( $items ) ) {
		return 'empty';
	}
	$normalized = array();
	foreach ( $items as $item ) {
		if ( ! is_array( $item ) ) {
			continue;
		}
		$key = '';
		if ( ! empty( $item['btKey'] ) ) {
			$key = (string) $item['btKey'];
		} elseif ( isset( $item['id'] ) ) {
			$key = (string) $item['id'];
		} elseif ( ! empty( $item['slug'] ) ) {
			$key = (string) $item['slug'];
		} elseif ( ! empty( $item['name'] ) ) {
			$key = (string) $item['name'];
		}
		$style   = isset( $item['style'] ) ? (string) $item['style'] : '';
		$profile = '';
		if ( isset( $item['pairingProfile'] ) ) {
			$profile = wp_json_encode( $item['pairingProfile'] );
		}
		$normalized[] = $key . '|' . $style . '|' . $profile;
	}
	sort( $normalized );
	$joined = implode( '||', $normalized );
	return $joined ? bt_pairing_hash_string( $joined ) : 'empty';
}

function bt_pairing_fingerprint_food( $items ) {
	if ( ! is_array( $items ) ) {
		return 'empty';
	}
	$normalized = array();
	foreach ( $items as $item ) {
		if ( ! is_array( $item ) ) {
			continue;
		}
		$key = '';
		if ( ! empty( $item['btKey'] ) ) {
			$key = (string) $item['btKey'];
		} elseif ( isset( $item['id'] ) ) {
			$key = (string) $item['id'];
		} elseif ( ! empty( $item['slug'] ) ) {
			$key = (string) $item['slug'];
		} elseif ( ! empty( $item['name'] ) ) {
			$key = (string) $item['name'];
		}
		$category = isset( $item['category'] ) ? (string) $item['category'] : '';
		$normalized[] = $key . '|' . $category;
	}
	sort( $normalized );
	$joined = implode( '||', $normalized );
	return $joined ? bt_pairing_hash_string( $joined ) : 'empty';
}

function bt_pairing_cache_hash_from_payload( $beer_data, $food_data ) {
	$beer_items = is_array( $beer_data ) && isset( $beer_data['items'] ) && is_array( $beer_data['items'] )
		? $beer_data['items']
		: ( is_array( $beer_data ) ? $beer_data : array() );
	$food_items = is_array( $food_data ) && isset( $food_data['items'] ) && is_array( $food_data['items'] )
		? $food_data['items']
		: ( is_array( $food_data ) ? $food_data : array() );
	if ( empty( $beer_items ) || empty( $food_items ) ) {
		return '';
	}
	$beer_hash = bt_pairing_fingerprint_beers( $beer_items );
	$food_hash = bt_pairing_fingerprint_food( $food_items );
	return $beer_hash . '.' . $food_hash;
}

function bt_pairing_cache_key_from_hash( $hash ) {
	$hash = sanitize_key( (string) $hash );
	return $hash ? 'bt_pairing_cache_' . $hash : '';
}

function bt_pairing_cache_index() {
	$list = get_option( 'bt_pairing_cache_keys', array() );
	return is_array( $list ) ? $list : array();
}

function bt_pairing_cache_index_add( $key ) {
	if ( ! $key ) {
		return;
	}
	$list = bt_pairing_cache_index();
	if ( ! in_array( $key, $list, true ) ) {
		$list[] = $key;
		update_option( 'bt_pairing_cache_keys', $list, false );
	}
}

function bt_pairing_cache_index_clear() {
	update_option( 'bt_pairing_cache_keys', array(), false );
}

function bt_beer_colors_index() {
	$list = get_option( 'bt_beer_colors_cache_keys', array() );
	return is_array( $list ) ? $list : array();
}

function bt_beer_colors_index_add( $cache_key ) {
	if ( ! $cache_key ) {
		return;
	}
	$list = bt_beer_colors_index();
	if ( ! in_array( $cache_key, $list, true ) ) {
		$list[] = $cache_key;
		update_option( 'bt_beer_colors_cache_keys', $list, false );
	}
}

function bt_beer_colors_index_clear() {
	update_option( 'bt_beer_colors_cache_keys', array(), false );
}

function bt_pairing_text_kind_normalize( $kind ) {
	$kind = sanitize_key( (string) $kind );
	return in_array( $kind, array( 'history', 'fun_facts' ), true ) ? $kind : 'history';
}

function bt_pairing_text_cache_hash( $hash ) {
	return sanitize_key( (string) $hash );
}

function bt_pairing_text_key( $kind, $hash, $slug ) {
	$kind = bt_pairing_text_kind_normalize( $kind );
	$slug = sanitize_title( $slug );
	$hash = bt_pairing_text_cache_hash( $hash );
	if ( ! $slug || ! $hash ) {
		return '';
	}
	return 'bt_' . $kind . '_' . $hash . '_' . $slug;
}

function bt_pairing_text_index_option_key( $kind ) {
	$kind = bt_pairing_text_kind_normalize( $kind );
	return 'bt_' . $kind . '_cache_index_v2';
}

function bt_pairing_text_index_get( $kind ) {
	$raw = get_option( bt_pairing_text_index_option_key( $kind ), array() );
	return is_array( $raw ) ? $raw : array();
}

function bt_pairing_text_index_add( $kind, $hash, $slug ) {
	$hash = bt_pairing_text_cache_hash( $hash );
	$slug = sanitize_title( $slug );
	if ( ! $hash || ! $slug ) {
		return;
	}
	$index = bt_pairing_text_index_get( $kind );
	if ( ! isset( $index[ $hash ] ) || ! is_array( $index[ $hash ] ) ) {
		$index[ $hash ] = array();
	}
	if ( ! in_array( $slug, $index[ $hash ], true ) ) {
		$index[ $hash ][] = $slug;
		update_option( bt_pairing_text_index_option_key( $kind ), $index, false );
	}
}

function bt_pairing_text_index_remove_hash( $kind, $hash ) {
	$hash = bt_pairing_text_cache_hash( $hash );
	if ( ! $hash ) {
		return;
	}
	$index = bt_pairing_text_index_get( $kind );
	if ( isset( $index[ $hash ] ) ) {
		unset( $index[ $hash ] );
		update_option( bt_pairing_text_index_option_key( $kind ), $index, false );
	}
}

function bt_pairing_text_index_hash_slugs( $kind, $hash ) {
	$index = bt_pairing_text_index_get( $kind );
	$hash  = bt_pairing_text_cache_hash( $hash );
	if ( ! $hash || ! isset( $index[ $hash ] ) || ! is_array( $index[ $hash ] ) ) {
		return array();
	}
	return array_values(
		array_filter(
			array_map( 'sanitize_title', $index[ $hash ] )
		)
	);
}

function bt_pairing_text_index_clear( $kind ) {
	update_option( bt_pairing_text_index_option_key( $kind ), array(), false );
}

// Legacy helpers kept for compatibility during migration.
function bt_pairing_history_key( $slug ) {
	return 'bt_history_' . sanitize_title( $slug );
}

function bt_pairing_history_index() {
	$list = get_option( 'bt_history_cache_keys', array() );
	return is_array( $list ) ? $list : array();
}

function bt_pairing_history_index_add( $slug ) {
	$slug = sanitize_title( $slug );
	if ( ! $slug ) {
		return;
	}
	$list = bt_pairing_history_index();
	if ( ! in_array( $slug, $list, true ) ) {
		$list[] = $slug;
		update_option( 'bt_history_cache_keys', $list, false );
	}
}

function bt_pairing_history_index_remove( $slug ) {
	$slug = sanitize_title( $slug );
	if ( ! $slug ) {
		return;
	}
	$list = bt_pairing_history_index();
	$next = array_values( array_diff( $list, array( $slug ) ) );
	update_option( 'bt_history_cache_keys', $next, false );
}

function bt_pairing_history_index_clear() {
	update_option( 'bt_history_cache_keys', array(), false );
}

function bt_pairings_static_index() {
	$list = get_option( 'bt_pairings_static_keys', array() );
	return is_array( $list ) ? $list : array();
}

function bt_pairings_static_index_add( $cache_key ) {
	if ( ! $cache_key ) {
		return;
	}
	$list = bt_pairings_static_index();
	if ( ! in_array( $cache_key, $list, true ) ) {
		$list[] = $cache_key;
		update_option( 'bt_pairings_static_keys', $list, false );
	}
}

function bt_pairings_static_hash_index_get() {
	$raw = get_option( 'bt_pairings_static_hash_index_v2', array() );
	return is_array( $raw ) ? $raw : array();
}

function bt_pairings_static_hash_index_add( $hash, $cache_key ) {
	$hash = sanitize_key( (string) $hash );
	if ( ! $hash || ! $cache_key ) {
		return;
	}
	$index = bt_pairings_static_hash_index_get();
	if ( ! isset( $index[ $hash ] ) || ! is_array( $index[ $hash ] ) ) {
		$index[ $hash ] = array();
	}
	if ( ! in_array( $cache_key, $index[ $hash ], true ) ) {
		$index[ $hash ][] = $cache_key;
		update_option( 'bt_pairings_static_hash_index_v2', $index, false );
	}
}

function bt_pairings_static_hash_index_remove_hash( $hash ) {
	$hash = sanitize_key( (string) $hash );
	if ( ! $hash ) {
		return;
	}
	$index = bt_pairings_static_hash_index_get();
	if ( isset( $index[ $hash ] ) ) {
		unset( $index[ $hash ] );
		update_option( 'bt_pairings_static_hash_index_v2', $index, false );
	}
}

function bt_pairings_static_hash_index_keys( $hash ) {
	$index = bt_pairings_static_hash_index_get();
	$hash  = sanitize_key( (string) $hash );
	if ( ! $hash || ! isset( $index[ $hash ] ) || ! is_array( $index[ $hash ] ) ) {
		return array();
	}
	return $index[ $hash ];
}

function bt_pairings_static_index_clear() {
	update_option( 'bt_pairings_static_keys', array(), false );
	update_option( 'bt_pairings_static_hash_index_v2', array(), false );
}

/**
 * Pairing App feature flags.
 */
function bt_pairing_feature_defaults() {
	return array(
		'help_form'     => true,
		'history'       => true,
		'fun_facts'     => true,
		'food_pairings' => true,
	);
}

function bt_pairing_normalize_feature_flag( $value, $default = true ) {
	if ( is_bool( $value ) ) {
		return $value;
	}
	if ( is_string( $value ) ) {
		$filtered = filter_var( $value, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE );
		if ( null !== $filtered ) {
			return $filtered;
		}
	}
	if ( is_int( $value ) ) {
		return (bool) $value;
	}
	return $default;
}

function bt_pairing_get_feature_flags() {
	$defaults = bt_pairing_feature_defaults();
	$stored   = get_option( 'bt_pairing_feature_flags', array() );
	if ( ! is_array( $stored ) ) {
		$stored = array();
	}
	$flags = array();
	foreach ( $defaults as $key => $default ) {
		if ( array_key_exists( $key, $stored ) ) {
			$flags[ $key ] = bt_pairing_normalize_feature_flag( $stored[ $key ], $default );
		} else {
			$flags[ $key ] = $default;
		}
	}
	return $flags;
}

function bt_pairing_set_feature_flags( $incoming ) {
	$defaults = bt_pairing_feature_defaults();
	if ( ! is_array( $incoming ) || empty( $incoming ) ) {
		return new WP_Error(
			'bt_pairing_invalid_flags',
			'Invalid feature flags payload.',
			array( 'status' => 400 )
		);
	}
	$next     = array();
	$source   = $incoming;
	foreach ( $defaults as $key => $default ) {
		if ( array_key_exists( $key, $source ) ) {
			$next[ $key ] = bt_pairing_normalize_feature_flag( $source[ $key ], $default );
		} else {
			$next[ $key ] = $default;
		}
	}
	update_option( 'bt_pairing_feature_flags', $next, false );
	return $next;
}

/**
 * Fetch a batch of histories from the external Responses API.
 *
 * @param array $items Array of beer items (slug, name, description).
 * @param int   $timeout Timeout seconds.
 * @return array Map slug => history text (only filled on success).
 */
function bt_fetch_beer_text_batch( $kind, $items, $timeout = 3 ) {
	if ( empty( $items ) ) {
		return array();
	}
	$kind = bt_pairing_text_kind_normalize( $kind );
	$clean = array();
	foreach ( $items as $it ) {
		$slug = sanitize_title( $it['slug'] ?? '' );
		if ( ! $slug ) {
			continue;
		}
		$clean[] = array(
			'slug'        => $slug,
			'name'        => isset( $it['name'] ) ? sanitize_text_field( $it['name'] ) : '',
			'description' => isset( $it['description'] ) ? wp_strip_all_tags( $it['description'] ) : '',
		);
	}
	if ( empty( $clean ) ) {
		return array();
	}
	$openai = bt_pairing_app_get_openai_config();
	$openai_key   = isset( $openai['api_key'] ) ? (string) $openai['api_key'] : '';
	$openai_model = isset( $openai['model'] ) ? (string) $openai['model'] : '';
	if ( '' === $openai_key ) {
		return array();
	}

	$items_json = wp_json_encode( $clean );
	$prompt = 'history' === $kind
		? <<<PROMPT
	You are a concise beer historian. For each beer provided (slug, description, style), return one "history_text" string
	with two short paragraphs (3–5 sentences each, <=200 words total) about the styles origins, cultural context, and traditions.
  
	Hard rules:
	- Do NOT reuse any phrases, sentence structure, or specific facts from the provided description.
	- Do NOT mention the brewery, venue, or beer name unless the style itself is named.
	- Do NOT mention specific ingredients, flavors, or aromatics from the description.
	- Avoid any “story rooted in its ingredients” phrasing or similar templates.
	- Always return distinct style-level history.
  
	Output:
	- Always key results by the provided slug exactly.
	- JSON only: { "texts": { "slug-one": "history text", "...": "..." } }
  
	If unsure, provide a brief, accurate history of the styles origin and tradition.

Input beers (array): {$items_json}
Return JSON only: { "texts": { "slug-one": "history text", "...": "..." } }
PROMPT
		: <<<PROMPT
	You are a beer educator writing concise fun facts. For each beer provided (slug, description, style), return one "fun_facts_text" string
	with two short paragraphs (3-5 sentences each, <=200 words total) focused on surprising style trivia, traditions, and cultural facts.

	Hard rules:
	- Do NOT reuse exact phrases from the provided description.
	- Do NOT include brewery-specific claims.
	- Keep the tone playful but accurate.
	- Focus on fun facts, not full style history recaps.

	Output:
	- Always key results by the provided slug exactly.
	- JSON only: { "texts": { "slug-one": "fun facts text", "...": "..." } }

Input beers (array): {$items_json}
Return JSON only: { "texts": { "slug-one": "fun facts text", "...": "..." } }
PROMPT;

	$payload = array(
		'model' => $openai_model,
		'input' => array(
			array(
				'role'    => 'user',
				'content' => $prompt,
			),
		),
	);

	$response = wp_remote_post(
		'https://api.openai.com/v1/responses',
		array(
			'headers' => array(
				'Authorization' => 'Bearer ' . $openai_key,
				'Content-Type'  => 'application/json',
			),
			'body'    => wp_json_encode( $payload ),
			'timeout' => $timeout,
		)
	);

	if ( is_wp_error( $response ) ) {
		return array();
	}

	$resp_body = wp_remote_retrieve_body( $response );
	$decoded   = json_decode( $resp_body, true );
	$text      = '';
	if ( isset( $decoded['output'][0]['content'][0]['text'] ) ) {
		$text = $decoded['output'][0]['content'][0]['text'];
	} elseif ( isset( $decoded['output_text'] ) ) {
		$text = $decoded['output_text'];
	} elseif ( isset( $decoded['output'][0]['text'] ) ) {
		$text = $decoded['output'][0]['text'];
	} elseif ( isset( $decoded['output'][0]['content'] ) && is_array( $decoded['output'][0]['content'] ) ) {
		foreach ( $decoded['output'][0]['content'] as $c ) {
			if ( is_string( $c ) ) {
				$text .= $c;
			} elseif ( is_array( $c ) && isset( $c['text'] ) ) {
				$text .= $c['text'];
			}
		}
	}

	$maybe = bt_extract_json_object( $text ? $text : $resp_body );
	if ( is_array( $maybe ) && isset( $maybe['texts'] ) && is_array( $maybe['texts'] ) ) {
		return $maybe['texts'];
	}
	if ( is_array( $maybe ) && isset( $maybe['histories'] ) && is_array( $maybe['histories'] ) ) {
		return $maybe['histories'];
	}

	return array();
}

/**
 * REST: pairing histories (per-beer).
 */
add_action(
	'rest_api_init',
	function() {
		register_rest_route(
			'bt/v1',
			'/pairing/history',
			array(
				'methods'             => 'POST',
				'callback'            => 'bt_pairing_history',
				'permission_callback' => '__return_true',
			)
		);
	}
);

/**
 * REST: pairing feature flags.
 */
add_action(
	'rest_api_init',
	function() {
		register_rest_route(
			'bt/v1',
			'/pairing/features',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => function() {
					return rest_ensure_response( bt_pairing_get_feature_flags() );
				},
				'permission_callback' => '__return_true',
			)
		);
		register_rest_route(
			'bt/v1',
			'/pairing/features',
			array(
				'methods'             => WP_REST_Server::EDITABLE,
				'callback'            => function( WP_REST_Request $request ) {
					$body = $request->get_json_params();
					return rest_ensure_response( bt_pairing_set_feature_flags( $body ) );
				},
				'permission_callback' => function() {
					return current_user_can( 'manage_options' );
				},
			)
		);
		register_rest_route(
			'bt/v1',
			'/pairing/fun-facts',
			array(
				'methods'             => 'POST',
				'callback'            => function( WP_REST_Request $request ) {
					return bt_pairing_beer_text( $request, 'fun_facts' );
				},
				'permission_callback' => '__return_true',
			)
		);
	}
);

function bt_pairing_history( WP_REST_Request $request ) {
	return bt_pairing_beer_text( $request, 'history' );
}

function bt_pairing_beer_text( WP_REST_Request $request, $kind = 'history' ) {
	$kind  = bt_pairing_text_kind_normalize( $kind );
	$body  = json_decode( $request->get_body(), true );
	$slugs = isset( $body['slugs'] ) && is_array( $body['slugs'] ) ? $body['slugs'] : array();
	$items = isset( $body['items'] ) && is_array( $body['items'] ) ? $body['items'] : array();
	$hash  = isset( $body['hash'] ) ? bt_pairing_text_cache_hash( $body['hash'] ) : '';
	$requested = array();
	// Prefer items (slug/name/description) when provided.
	foreach ( $items as $it ) {
		$name        = isset( $it['name'] ) ? sanitize_text_field( $it['name'] ) : '';
		$slug        = sanitize_title( $it['slug'] ?? $name );
		$description = isset( $it['description'] ) ? wp_strip_all_tags( $it['description'] ) : '';
		$style       = isset( $it['style'] ) ? sanitize_text_field( $it['style'] ) : '';
		if ( $slug ) {
			$requested[ $slug ] = array(
				'slug'        => $slug,
				'name'        => $name,
				'description' => $description,
				'style'       => $style,
			);
		}
	}
	// Add any bare slugs not covered above.
	if ( is_array( $slugs ) ) {
		foreach ( $slugs as $slug_raw ) {
			$slug = sanitize_title( $slug_raw );
			if ( $slug && ! isset( $requested[ $slug ] ) ) {
				$requested[ $slug ] = array(
					'slug'        => $slug,
					'name'        => '',
					'description' => '',
				);
			}
		}
	}
	if ( empty( $requested ) ) {
		return new WP_REST_Response( array( 'error' => 'Missing slugs' ), 400 );
	}
	$slugs = array_keys( $requested );
	if ( ! $hash ) {
		$hash = get_option( 'bt_pairing_latest_hash', '' );
		$hash = bt_pairing_text_cache_hash( $hash );
	}
	if ( ! $hash ) {
		$hash = 'fallback';
	}

	$allow_force = current_user_can( 'manage_options' );
	$force       = ! empty( $body['force'] ) && $allow_force;

	$histories = array();
	$cached    = array();
	$missing   = array();

	foreach ( $slugs as $slug ) {
		if ( $force ) {
			$missing[] = $slug;
			continue;
		}
		$key = bt_pairing_text_key( $kind, $hash, $slug );
		$val = get_transient( $key );
		if ( false !== $val && null !== $val ) {
			$histories[ $slug ] = $val;
			$cached[]           = $slug;
		} else {
			$missing[] = $slug;
		}
	}

	if ( ! empty( $missing ) ) {
		// Fetch one at a time to maximize success rate.
		$batches = array_chunk( $missing, 1 );
		foreach ( $batches as $batch ) {
			$attempts = 0;
			$fetched  = array();
			while ( $attempts < 2 && empty( $fetched ) ) {
				$attempts++;
				$subset  = array();
				foreach ( $batch as $slug ) {
					if ( isset( $requested[ $slug ] ) ) {
						$subset[] = $requested[ $slug ];
					}
				}
				$fetched = bt_fetch_beer_text_batch( $kind, $subset, 3 );
			}
			if ( ! empty( $fetched ) ) {
				$normalized = array();
				foreach ( $fetched as $k => $v ) {
					$norm = sanitize_title( $k );
					if ( $norm ) {
						$normalized[ $norm ] = $v;
					}
				}
				foreach ( $batch as $slug ) {
					$val = null;
					if ( isset( $fetched[ $slug ] ) ) {
						$val = $fetched[ $slug ];
					} elseif ( isset( $normalized[ $slug ] ) ) {
						$val = $normalized[ $slug ];
					}
					if ( $val ) {
						$histories[ $slug ] = $val;
						set_transient( bt_pairing_text_key( $kind, $hash, $slug ), $val, WEEK_IN_SECONDS );
						bt_pairing_text_index_add( $kind, $hash, $slug );
					}
				}
			}
		}
	}

	// Fallback: if any requested slug still lacks history, generate a short placeholder and cache it.
	foreach ( $requested as $slug => $item ) {
		if ( isset( $histories[ $slug ] ) && $histories[ $slug ] ) {
			continue;
		}
		$name        = $item['name'] ?? $slug;
		$description = $item['description'] ?? '';
		$style       = $item['style'] ?? '';
		$fallback    = ( 'fun_facts' === $kind )
			? ( $style
				? sprintf(
					'%s is a %s. Fun fact: this style is known for regional traditions and long-running pub culture. %s',
					$name,
					$style,
					$description ? wp_strip_all_tags( $description ) : ''
				)
				: sprintf(
					'%s has fun facts tied to how brewers and drinkers popularized this style over time. %s',
					$name,
					$description ? wp_strip_all_tags( $description ) : ''
				) )
			: ( $style
				? sprintf(
					'%s is a %s. This style has a long tradition; expect notes that reflect its classic roots. %s',
					$name,
					$style,
					$description ? wp_strip_all_tags( $description ) : ''
				)
				: sprintf(
					'%s has a story rooted in its ingredients and brewing approach. %s',
					$name,
					$description ? wp_strip_all_tags( $description ) : ''
				) );
		$histories[ $slug ] = $fallback;
		set_transient( bt_pairing_text_key( $kind, $hash, $slug ), $fallback, WEEK_IN_SECONDS );
		bt_pairing_text_index_add( $kind, $hash, $slug );
	}

	$partial = array();
	foreach ( $slugs as $slug ) {
		if ( ! isset( $histories[ $slug ] ) || null === $histories[ $slug ] ) {
			$partial[] = $slug;
		}
	}

	return new WP_REST_Response(
		array(
			'kind'      => $kind,
			'hash'      => $hash,
			'histories' => $histories,
			'partial'   => ! empty( $partial ),
			'cached'    => $cached,
		),
		200
	);
}

/**
 * Static pairings (beer -> food) REST endpoint.
 */
if ( ! defined( 'BT_STATIC_PAIRINGS_PROMPT_VERSION' ) ) {
	define( 'BT_STATIC_PAIRINGS_PROMPT_VERSION', 1 );
}
if ( ! defined( 'BT_STATIC_PAIRINGS_SCHEMA_VERSION' ) ) {
	define( 'BT_STATIC_PAIRINGS_SCHEMA_VERSION', 1 );
}

add_action(
	'rest_api_init',
	function() {
		register_rest_route(
			'bt/v1',
			'/pairings/static',
			array(
				'methods'             => 'POST',
				'callback'            => 'bt_pairings_static',
				'permission_callback' => '__return_true',
			)
		);
	}
);

function bt_pairings_static( WP_REST_Request $request ) {
	$body     = json_decode( $request->get_body(), true );
	$beer     = isset( $body['beerData'] ) && is_array( $body['beerData'] ) ? $body['beerData'] : null;
	$food     = isset( $body['foodData'] ) && is_array( $body['foodData'] ) ? $body['foodData'] : null;
	$force    = ! empty( $body['force'] );
	$prompt_v = isset( $body['promptVersion'] ) ? intval( $body['promptVersion'] ) : BT_STATIC_PAIRINGS_PROMPT_VERSION;

	if ( $force && ! current_user_can( 'manage_options' ) ) {
		return new WP_REST_Response( array( 'error' => 'forbidden' ), 403 );
	}

	if ( empty( $beer['items'] ) || empty( $food['items'] ) || ! is_array( $beer['items'] ) || ! is_array( $food['items'] ) ) {
		return new WP_REST_Response( array( 'error' => 'missing data' ), 400 );
	}
	$openai = bt_pairing_app_get_openai_config();
	$openai_key   = isset( $openai['api_key'] ) ? (string) $openai['api_key'] : '';
	$openai_model = isset( $openai['model'] ) ? (string) $openai['model'] : '';
	if ( '' === $openai_key ) {
		return bt_pairing_app_openai_error_response();
	}

	$profile_v = isset( $beer['pairingProfileVersion'] ) ? intval( $beer['pairingProfileVersion'] ) : ( isset( $food['pairingProfileVersion'] ) ? intval( $food['pairingProfileVersion'] ) : 1 );
	$beer_hash = bt_pairing_fingerprint_beers( $beer['items'] );
	$food_hash = bt_pairing_fingerprint_food( $food['items'] );
	$menu_hash = sanitize_key( $beer_hash . '.' . $food_hash );
	$cache_key = 'bt_pairings_static_' . sha1( $profile_v . '|' . $prompt_v . '|' . $beer_hash . '|' . $food_hash );

	if ( ! $force ) {
		$cached = get_transient( $cache_key );
		if ( $cached && is_array( $cached ) ) {
			$cached['source']['cached'] = true;
			return rest_ensure_response( $cached );
		}
	}

	$beer_items = array_slice( $beer['items'], 0, 60 );
	$food_items = array_slice( $food['items'], 0, 250 );
	$beer_keys  = array();
	$food_keys  = array();

	$beer_payload = array();
	foreach ( $beer_items as $item ) {
		if ( ! is_array( $item ) || empty( $item['btKey'] ) ) {
			continue;
		}
		$pp = isset( $item['pairingProfile'] ) && is_array( $item['pairingProfile'] ) ? $item['pairingProfile'] : array();
		$beer_keys[] = $item['btKey'];
		$beer_payload[] = array(
			'beerKey'  => $item['btKey'],
			'style'    => $item['style'] ?? ( $item['category'] ?? '' ),
			'abv'      => $pp['abv'] ?? null,
			'ibu'      => $pp['ibu'] ?? null,
			'body'     => $pp['body'] ?? '',
			'sweetness'=> $pp['sweetness'] ?? '',
			'axes'     => $pp['axes'] ?? array(),
			'tags'     => isset( $pp['tags'] ) && is_array( $pp['tags'] ) ? array_slice( $pp['tags'], 0, 6 ) : array(),
		);
	}

	$food_payload = array();
	foreach ( $food_items as $item ) {
		if ( ! is_array( $item ) || empty( $item['btKey'] ) ) {
			continue;
		}
		$pp = isset( $item['pairingProfile'] ) && is_array( $item['pairingProfile'] ) ? $item['pairingProfile'] : array();
		$food_keys[] = $item['btKey'];
		$food_payload[] = array(
			'foodKey'  => $item['btKey'],
			'category' => $item['category'] ?? 'uncategorized',
			'primary'  => $pp['primary'] ?? '',
			'prep'     => $pp['prep'] ?? '',
			'axes'     => $pp['axes'] ?? array(),
			'tags'     => isset( $pp['tags'] ) && is_array( $pp['tags'] ) ? array_slice( $pp['tags'], 0, 6 ) : array(),
		);
	}

	if ( empty( $beer_payload ) || empty( $food_payload ) ) {
		return new WP_REST_Response( array( 'error' => 'missing items' ), 400 );
	}

	$prompt = bt_build_static_pairings_prompt( $beer_payload, $food_payload );

	$payload = array(
		'model' => $openai_model,
		'input' => array(
			array(
				'role'    => 'user',
				'content' => $prompt,
			),
		),
	);

	$response = wp_remote_post(
		'https://api.openai.com/v1/responses',
		array(
			'headers' => array(
				'Authorization' => 'Bearer ' . $openai_key,
				'Content-Type'  => 'application/json',
			),
			'body'    => wp_json_encode( $payload ),
			'timeout' => 60,
		)
	);

	if ( is_wp_error( $response ) ) {
		return new WP_REST_Response( array( 'error' => $response->get_error_message() ), 500 );
	}

	$resp_body = wp_remote_retrieve_body( $response );
	$decoded   = json_decode( $resp_body, true );
	$answer_text = '';
	if ( isset( $decoded['output'][0]['content'][0]['text'] ) ) {
		$answer_text = $decoded['output'][0]['content'][0]['text'];
	} elseif ( isset( $decoded['output_text'] ) ) {
		$answer_text = $decoded['output_text'];
	} elseif ( isset( $decoded['output'][0]['text'] ) ) {
		$answer_text = $decoded['output'][0]['text'];
	} elseif ( isset( $decoded['output'][0]['content'] ) && is_array( $decoded['output'][0]['content'] ) ) {
		foreach ( $decoded['output'][0]['content'] as $c ) {
			if ( is_string( $c ) ) {
				$answer_text .= $c;
			} elseif ( is_array( $c ) && isset( $c['text'] ) ) {
				$answer_text .= $c['text'];
			}
		}
	}

	$parsed = bt_extract_json_object( $answer_text ? $answer_text : $resp_body );
	$pairings = bt_normalize_static_pairings_response( $parsed, $beer_keys, $food_keys );

	$result = array(
		'schemaVersion'     => BT_STATIC_PAIRINGS_SCHEMA_VERSION,
		'kind'              => 'pairings-static',
		'generatedAt'       => current_time( 'c' ),
		'source'            => array(
			'beerGeneratedAt'       => isset( $beer['generatedAt'] ) ? sanitize_text_field( $beer['generatedAt'] ) : 'unknown',
			'foodGeneratedAt'       => isset( $food['generatedAt'] ) ? sanitize_text_field( $food['generatedAt'] ) : 'unknown',
			'pairingProfileVersion' => $profile_v,
			'promptVersion'         => $prompt_v,
			'menuHash'              => $menu_hash,
			'cached'                => false,
		),
		'counts'            => array(
			'beers' => count( $beer_payload ),
			'food'  => count( $food_payload ),
		),
		'pairingsByBeerKey' => $pairings,
	);

	set_transient( $cache_key, $result, 7 * DAY_IN_SECONDS );
	bt_pairings_static_index_add( $cache_key );
	bt_pairings_static_hash_index_add( $menu_hash, $cache_key );

	return rest_ensure_response( $result );
}

function bt_build_static_pairings_prompt( $beers, $foods ) {
	$beer_json = wp_json_encode( $beers, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE );
	$food_json = wp_json_encode( $foods, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE );

	return <<<PROMPT
You are pairing beers to menu items. Return ONLY JSON, no prose.

Rules:
- Use only provided beerKey and foodKey values.
- For each beerKey, choose exactly 2 mains and 1 side.
- why must be <= 20 words.
- Output JSON format:
{
  "pairingsByBeerKey": {
    "beerKey": {
      "mains": [
        { "foodKey": "...", "why": "..." },
        { "foodKey": "...", "why": "..." }
      ],
      "side": { "foodKey": "...", "why": "..." }
    }
  }
}

Beers:
{$beer_json}

Food:
{$food_json}
PROMPT;
}

function bt_normalize_static_pairings_response( $parsed, $beer_keys, $food_keys ) {
	$valid_beers = array_fill_keys( $beer_keys, true );
	$valid_food  = array_fill_keys( $food_keys, true );
	$result      = array();

	foreach ( $beer_keys as $beer_key ) {
		$result[ $beer_key ] = array(
			'mains' => array(),
			'side'  => null,
		);
	}

	if ( ! is_array( $parsed ) || empty( $parsed['pairingsByBeerKey'] ) || ! is_array( $parsed['pairingsByBeerKey'] ) ) {
		return $result;
	}

	foreach ( $parsed['pairingsByBeerKey'] as $beer_key => $data ) {
		if ( ! isset( $valid_beers[ $beer_key ] ) || ! is_array( $data ) ) {
			continue;
		}
		$mains = array();
		if ( isset( $data['mains'] ) && is_array( $data['mains'] ) ) {
			foreach ( $data['mains'] as $entry ) {
				if ( count( $mains ) >= 2 || ! is_array( $entry ) ) {
					continue;
				}
				$food_key = isset( $entry['foodKey'] ) ? sanitize_text_field( $entry['foodKey'] ) : '';
				$why      = isset( $entry['why'] ) ? sanitize_text_field( $entry['why'] ) : '';
				if ( ! $food_key || ! isset( $valid_food[ $food_key ] ) ) {
					continue;
				}
				$mains[] = array(
					'foodKey' => $food_key,
					'why'     => $why,
				);
			}
		}

		$side = null;
		if ( isset( $data['side'] ) && is_array( $data['side'] ) ) {
			$food_key = isset( $data['side']['foodKey'] ) ? sanitize_text_field( $data['side']['foodKey'] ) : '';
			$why      = isset( $data['side']['why'] ) ? sanitize_text_field( $data['side']['why'] ) : '';
			if ( $food_key && isset( $valid_food[ $food_key ] ) ) {
				$side = array(
					'foodKey' => $food_key,
					'why'     => $why,
				);
			}
		}

		$result[ $beer_key ] = array(
			'mains' => array_slice( $mains, 0, 2 ),
			'side'  => $side,
		);
	}

	return $result;
}

/**
 * Admin-only purge route for pairing/history caches.
 */
add_action(
	'rest_api_init',
	function() {
		register_rest_route(
			'bt/v1',
			'/pairing/purge',
			array(
				'methods'             => 'POST',
				'callback'            => 'bt_pairing_purge',
				'permission_callback' => function () {
					return current_user_can( 'manage_options' );
				},
			)
		);
	}
);

function bt_pairing_purge( WP_REST_Request $request ) {
	$body   = json_decode( $request->get_body(), true );
	$target = isset( $body['target'] ) ? $body['target'] : 'all';
	$slug   = isset( $body['slug'] ) ? sanitize_title( $body['slug'] ) : '';
	$hash   = isset( $body['hash'] ) ? sanitize_key( (string) $body['hash'] ) : '';

	if ( in_array( $target, array( 'history', 'all' ), true ) ) {
		if ( $hash ) {
			$slugs = bt_pairing_text_index_hash_slugs( 'history', $hash );
			foreach ( $slugs as $s ) {
				$key = bt_pairing_text_key( 'history', $hash, $s );
				if ( $key ) {
					delete_transient( $key );
				}
			}
			bt_pairing_text_index_remove_hash( 'history', $hash );
		} elseif ( $slug ) {
			// Legacy fallback.
			delete_transient( bt_pairing_history_key( $slug ) );
			bt_pairing_history_index_remove( $slug );
		} else {
			$index = bt_pairing_text_index_get( 'history' );
			foreach ( $index as $h => $hash_slugs ) {
				if ( ! is_array( $hash_slugs ) ) {
					continue;
				}
				foreach ( $hash_slugs as $s ) {
					$key = bt_pairing_text_key( 'history', $h, $s );
					if ( $key ) {
						delete_transient( $key );
					}
				}
			}
			bt_pairing_text_index_clear( 'history' );
			// Legacy cleanup.
			$list = bt_pairing_history_index();
			foreach ( $list as $s ) {
				delete_transient( bt_pairing_history_key( $s ) );
			}
			bt_pairing_history_index_clear();
		}
	}

	if ( in_array( $target, array( 'fun-facts', 'fun_facts', 'all' ), true ) ) {
		if ( $hash ) {
			$slugs = bt_pairing_text_index_hash_slugs( 'fun_facts', $hash );
			foreach ( $slugs as $s ) {
				$key = bt_pairing_text_key( 'fun_facts', $hash, $s );
				if ( $key ) {
					delete_transient( $key );
				}
			}
			bt_pairing_text_index_remove_hash( 'fun_facts', $hash );
		} else {
			$index = bt_pairing_text_index_get( 'fun_facts' );
			foreach ( $index as $h => $hash_slugs ) {
				if ( ! is_array( $hash_slugs ) ) {
					continue;
				}
				foreach ( $hash_slugs as $s ) {
					$key = bt_pairing_text_key( 'fun_facts', $h, $s );
					if ( $key ) {
						delete_transient( $key );
					}
				}
			}
			bt_pairing_text_index_clear( 'fun_facts' );
		}
	}

	if ( in_array( $target, array( 'pairings-static', 'all' ), true ) ) {
		if ( $hash ) {
			$keys = bt_pairings_static_hash_index_keys( $hash );
			foreach ( $keys as $key ) {
				delete_transient( $key );
			}
			bt_pairings_static_hash_index_remove_hash( $hash );
		} else {
			$list = bt_pairings_static_index();
			foreach ( $list as $key ) {
				delete_transient( $key );
			}
			bt_pairings_static_index_clear();
		}
	}

	if ( in_array( $target, array( 'pairing', 'all' ), true ) ) {
		$list = bt_pairing_cache_index();
		foreach ( $list as $key ) {
			delete_transient( $key );
		}
		bt_pairing_cache_index_clear();
	}

	if ( in_array( $target, array( 'colors', 'all' ), true ) ) {
		$list = bt_beer_colors_index();
		foreach ( $list as $key ) {
			delete_transient( $key );
		}
		bt_beer_colors_index_clear();
	}

	if ( in_array( $target, array( 'menu-snapshot', 'all' ), true ) ) {
		bt_pairing_menu_clear_snapshot();
	}

	return new WP_REST_Response( array( 'purged' => true ), 200 );
}

/**
 * Canonical menu snapshot REST routes (Phase 1).
 */
add_action(
	'rest_api_init',
	function() {
		register_rest_route(
			'bt/v1',
			'/menu-snapshot',
			array(
				array(
					'methods'             => 'GET',
					'callback'            => 'bt_pairing_menu_snapshot_get',
					'permission_callback' => '__return_true',
				),
				array(
					'methods'             => 'DELETE',
					'callback'            => 'bt_pairing_menu_snapshot_clear',
					'permission_callback' => function () {
						return current_user_can( 'manage_options' );
					},
				),
			)
		);
		register_rest_route(
			'bt/v1',
			'/menu-snapshot/intake',
			array(
				'methods'             => 'POST',
				'callback'            => 'bt_pairing_menu_snapshot_intake',
				'permission_callback' => '__return_true',
			)
		);
		register_rest_route(
			'bt/v1',
			'/menu-snapshot/rebuild',
			array(
				'methods'             => 'POST',
				'callback'            => 'bt_pairing_menu_snapshot_rebuild',
				'permission_callback' => function () {
					return current_user_can( 'manage_options' );
				},
			)
		);
	}
);

function bt_pairing_menu_snapshot_get() {
	$snapshot = bt_pairing_menu_get_snapshot();
	if ( ! is_array( $snapshot ) ) {
		return new WP_REST_Response( array( 'error' => 'snapshot_missing' ), 404 );
	}
	return new WP_REST_Response( $snapshot, 200 );
}

function bt_pairing_menu_snapshot_intake( WP_REST_Request $request ) {
	$body = $request->get_json_params();
	if ( ! is_array( $body ) ) {
		return new WP_REST_Response( array( 'error' => 'invalid_body' ), 400 );
	}

	$kind = isset( $body['kind'] ) ? sanitize_key( (string) $body['kind'] ) : '';
	if ( ! in_array( $kind, array( 'beer', 'food' ), true ) ) {
		return new WP_REST_Response( array( 'error' => 'invalid_kind' ), 400 );
	}

	$payload = isset( $body['payload'] ) && is_array( $body['payload'] ) ? $body['payload'] : array();
	$source  = isset( $body['source'] ) && is_array( $body['source'] ) ? $body['source'] : array();

	$source_meta = array(
		'name'      => isset( $source['name'] ) ? sanitize_text_field( (string) $source['name'] ) : 'theme-bridge',
		'url'       => isset( $source['url'] ) ? esc_url_raw( (string) $source['url'] ) : '',
		'rebuiltBy' => 'intake',
	);

	$snapshot = bt_pairing_menu_intake_payload( $kind, $payload, $source_meta );
	return new WP_REST_Response(
		array(
			'ok'          => true,
			'kind'        => $kind,
			'fingerprint' => isset( $snapshot['fingerprint'] ) ? $snapshot['fingerprint'] : null,
		),
		200
	);
}

function bt_pairing_menu_snapshot_rebuild() {
	$snapshot = bt_pairing_menu_rebuild_snapshot();
	if ( is_wp_error( $snapshot ) ) {
		return new WP_REST_Response(
			array(
				'error'   => $snapshot->get_error_code(),
				'message' => $snapshot->get_error_message(),
			),
			400
		);
	}
	return new WP_REST_Response(
		array(
			'ok'          => true,
			'fingerprint' => isset( $snapshot['fingerprint'] ) ? $snapshot['fingerprint'] : null,
		),
		200
	);
}

function bt_pairing_menu_snapshot_clear() {
	bt_pairing_menu_clear_snapshot();
	return new WP_REST_Response( array( 'ok' => true, 'cleared' => true ), 200 );
}

/**
 * Pairing REST endpoint: proxies to OpenAI Responses API.
 */
add_action(
	'rest_api_init',
	function() {
		register_rest_route(
			'bt/v1',
			'/pairing',
			array(
				array(
					'methods'             => 'GET',
					'callback'            => 'bt_pairing_get_cached',
					'permission_callback' => '__return_true',
				),
				array(
					'methods'             => 'POST',
					'callback'            => 'bt_proxy_pairing',
					'permission_callback' => '__return_true',
				),
			)
		);
		register_rest_route(
			'bt/v1',
			'/pairing/status',
			array(
				'methods'             => 'GET',
				'callback'            => 'bt_pairing_cache_status',
				'permission_callback' => function () {
					return current_user_can( 'manage_options' );
				},
			)
		);
	}
);

function bt_pairing_get_cached( WP_REST_Request $request ) {
	$hash = sanitize_key( $request->get_param( 'hash' ) );
	if ( ! $hash ) {
		return new WP_REST_Response( array( 'error' => 'Missing hash' ), 400 );
	}
	$key = bt_pairing_cache_key_from_hash( $hash );
	if ( ! $key ) {
		return new WP_REST_Response( array( 'error' => 'Invalid hash' ), 400 );
	}
	$cached = get_transient( $key );
	if ( ! is_array( $cached ) || empty( $cached['data'] ) ) {
		return new WP_REST_Response( null, 204 );
	}
	return new WP_REST_Response(
		array(
			'data'      => $cached['data'],
			'fetchedAt' => isset( $cached['fetchedAt'] ) ? intval( $cached['fetchedAt'] ) : null,
			'hash'      => $hash,
		),
		200
	);
}

function bt_pairing_cache_status( WP_REST_Request $request ) {
	$hash = sanitize_key( $request->get_param( 'hash' ) );
	if ( ! $hash ) {
		return new WP_REST_Response( array( 'error' => 'Missing hash' ), 400 );
	}
	$key = bt_pairing_cache_key_from_hash( $hash );
	if ( ! $key ) {
		return new WP_REST_Response( array( 'error' => 'Invalid hash' ), 400 );
	}
	$cached = get_transient( $key );
	$cached_ok = is_array( $cached ) && ! empty( $cached['data'] );
	return new WP_REST_Response(
		array(
			'cached'    => $cached_ok,
			'fetchedAt' => $cached_ok && isset( $cached['fetchedAt'] ) ? intval( $cached['fetchedAt'] ) : null,
			'hash'      => $hash,
		),
		200
	);
}

function bt_proxy_pairing( WP_REST_Request $request ) {
	$body    = json_decode( $request->get_body(), true );
	$answers = array();
	$force   = ! empty( $body['force'] ) && current_user_can( 'manage_options' );
	$preload = ! empty( $body['preload'] );
	if ( isset( $body['answers'] ) && is_array( $body['answers'] ) ) {
		$answers = $body['answers'];
	}
	// Allow refresh calls (e.g., /pairing/refresh) that pass only { force: true }.
	if ( empty( $answers ) && $force ) {
		$answers = array( 'refresh' => true );
	}

	if ( empty( $answers ) ) {
		return new WP_REST_Response( array( 'error' => 'Missing answers' ), 400 );
	}
	$openai = bt_pairing_app_get_openai_config();
	$openai_key   = isset( $openai['api_key'] ) ? (string) $openai['api_key'] : '';
	$openai_model = isset( $openai['model'] ) ? (string) $openai['model'] : '';
	if ( '' === $openai_key ) {
		return bt_pairing_app_openai_error_response();
	}

	$beer_data = ( isset( $body['beerData'] ) && is_array( $body['beerData'] ) ) ? $body['beerData'] : null;
	$food_data = ( isset( $body['foodData'] ) && is_array( $body['foodData'] ) ) ? $body['foodData'] : null;

	$beer_catalog = $beer_data && isset( $beer_data['items'] ) ? $beer_data['items'] : ( is_array( $beer_data ) ? $beer_data : array() );
	$color_map    = bt_compute_color_map_from_beers( $beer_catalog );
	$allowed_beers = array();
	foreach ( $beer_catalog as $beer_item ) {
		if ( is_array( $beer_item ) && ! empty( $beer_item['name'] ) ) {
			$allowed_beers[] = $beer_item['name'];
		}
	}

	$inline_beer_json  = $beer_data ? wp_json_encode( $beer_data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) : 'null';
	$user_answers_json = wp_json_encode( $answers, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE );
	$prompt            = <<<PROMPT
		You are a sensory scientist and beer history educator. Be concise, fun and informative.
		Data:
		- inline_beer_json: {$inline_beer_json} (use these beers only)
		- user_answers: {$user_answers_json}
		Checklist:
		1) Only recommend beers present in inline_beer_json; do not invent or rename.
		2) Reuse beer.description verbatim; no fabricated local history.
		3) Always return 5 matches: primary (best), neighbor (adjacent style), contrast (different profile but respect low-ABV requests).
		4) Reference 1–2 user inputs in match_sentence; keep confidence bands (>0.75 High; 0.40–0.75 Medium; <0.40 Low).
		5) Use canonical_tag_set and tag_synonyms seeded from the beer data; infer reasonably.
		6) Create a short, fun success_message for a local brewery; mention 1–2 user inputs and that 5 beers are highlighted below, ordered by score. Prefer phrasing that ends with “here at Belltower.”
		Return EXACTLY this JSON, no extra prose:
		{
		"matches": [
			{
			"beer": { "name": "string", "style": "string", "abv": "string", "ibu": "string", "description": "string" },
			"score": 0.0,
			"confidence": "High|Medium|Low",
			"top_tags": ["string","string","string"],
			"match_sentence": "string"
			},
			{ "..." : "..." },
			{ "..." : "..." }
		],
		"success_message": "string",
		"canonical_tag_set": ["tropical","citrus","roasty","caramel","banana","clove","dry","creamy","crisp","smoky","spicy","tart","funky"],
		"tag_synonyms": {
			"tropical": ["mango","pineapple","passionfruit","juicy"],
			"citrus": ["orange","grapefruit","lemon","lime"]
		},
		"explainers": {
			"why_three": "string",
			"confidence_thresholds": { "high_gt": 0.75, "medium_ge": 0.40, "low_lt": 0.40 }
		}
		}
		PROMPT;

	$payload = array(
		'model' => $openai_model,
		'input' => array(
			array(
				'role'    => 'user',
				'content' => $prompt,
			),
		),
	);

	// Log payload metrics for debugging.
	error_log(
			'[bt_pairing] request ' . wp_json_encode(
				array(
					'model'       => $openai_model,
				'items_count' => is_array( $beer_catalog ) ? count( $beer_catalog ) : 0,
				'payload_len' => strlen( wp_json_encode( $payload ) ),
				'prompt'      => $prompt,
			)
		)
	);

	$response = wp_remote_post(
		'https://api.openai.com/v1/responses',
		array(
			'headers' => array(
				'Authorization' => 'Bearer ' . $openai_key,
				'Content-Type'  => 'application/json',
			),
			'body'    => wp_json_encode( $payload ),
			'timeout' => 50,
		)
	);

	if ( is_wp_error( $response ) ) {
		return new WP_REST_Response( array( 'error' => $response->get_error_message() ), 500 );
	}

	$http      = wp_remote_retrieve_response_code( $response );
	$resp_body = wp_remote_retrieve_body( $response );

	try {
		$decoded = json_decode( $resp_body, true );
	} catch ( Exception $e ) {
		return new WP_REST_Response( array( 'answer' => $resp_body, 'status' => $http ), $http );
	}

	if ( JSON_ERROR_NONE !== json_last_error() ) {
		return new WP_REST_Response( array( 'answer' => $resp_body, 'status' => $http ), $http );
	}

	$answer_text = '';
	if ( isset( $decoded['output'][0]['content'][0]['text'] ) ) {
		$answer_text = $decoded['output'][0]['content'][0]['text'];
	} elseif ( isset( $decoded['output_text'] ) ) {
		$answer_text = $decoded['output_text'];
	} elseif ( isset( $decoded['output'][0]['text'] ) ) {
		$answer_text = $decoded['output'][0]['text'];
	} elseif ( isset( $decoded['output'][0]['content'] ) && is_array( $decoded['output'][0]['content'] ) ) {
		foreach ( $decoded['output'][0]['content'] as $c ) {
			if ( is_string( $c ) ) {
				$answer_text .= $c;
			} elseif ( is_array( $c ) && isset( $c['text'] ) ) {
				$answer_text .= $c['text'];
			}
		}
	}

	$maybe_json = json_decode( trim( $answer_text ), true );
	if ( ! ( is_array( $maybe_json ) && isset( $maybe_json['matches'] ) ) ) {
		$maybe_json = bt_extract_json_object( $answer_text ? $answer_text : $resp_body );
	}
	if ( is_array( $maybe_json ) && isset( $maybe_json['matches'] ) ) {
		$payload = array(
			'result' => $maybe_json,
			'status' => $http,
			'prompt' => $prompt,
			'colors' => $color_map,
		);
		if ( $preload ) {
			$hash = bt_pairing_cache_hash_from_payload( $beer_data, $food_data );
			$key  = bt_pairing_cache_key_from_hash( $hash );
			if ( $key ) {
				$cached = array(
					'data'      => $payload,
					'fetchedAt' => time(),
					'hash'      => $hash,
				);
				set_transient( $key, $cached, 7 * DAY_IN_SECONDS );
				bt_pairing_cache_index_add( $key );
				update_option( 'bt_pairing_latest_hash', $hash, false );
			}
		}
		return new WP_REST_Response( $payload, 200 );
	}

	$payload = array(
		'answer' => $answer_text ? $answer_text : $decoded,
		'status' => $http,
		'prompt' => $prompt,
		'colors' => $color_map,
	);
	if ( $preload ) {
		$hash = bt_pairing_cache_hash_from_payload( $beer_data, $food_data );
		$key  = bt_pairing_cache_key_from_hash( $hash );
		if ( $key ) {
			$cached = array(
				'data'      => $payload,
				'fetchedAt' => time(),
				'hash'      => $hash,
			);
			set_transient( $key, $cached, 7 * DAY_IN_SECONDS );
			bt_pairing_cache_index_add( $key );
			update_option( 'bt_pairing_latest_hash', $hash, false );
		}
	}
	return new WP_REST_Response( $payload, 200 );
}

/**
 * Minimal admin-only purge buttons (frontend).
 */
function bt_pairing_admin_buttons() {
	$is_admin_user = is_user_logged_in() && current_user_can( 'manage_options' );
	$is_preview    = 'local' === wp_get_environment_type() && isset( $_GET['bt_pairing_admin_preview'] ) && ! $is_admin_user;
	if ( ! $is_admin_user && ! $is_preview ) {
		return;
	}
	global $bt_pairing_app_present;
	if ( empty( $bt_pairing_app_present ) ) {
		return;
	}
	$nonce                     = wp_create_nonce( 'wp_rest' );
	$endpoint                  = esc_url_raw( rest_url( 'bt/v1/pairing/purge' ) );
	$snapshot_endpoint         = esc_url_raw( rest_url( 'bt/v1/menu-snapshot' ) );
	$snapshot_rebuild_endpoint = esc_url_raw( rest_url( 'bt/v1/menu-snapshot/rebuild' ) );
	$pairing_endpoint          = esc_url_raw( rest_url( 'bt/v1/pairing' ) );
	$static_endpoint           = esc_url_raw( rest_url( 'bt/v1/pairings/static' ) );
	?>
	<div
		class="bt-pairing-admin-tools"
		id="bt-pairing-admin-tools"
		role="region"
		aria-labelledby="bt-pairing-admin-title"
		data-preview-only="<?php echo $is_preview ? 'true' : 'false'; ?>"
	>
		<div class="bt-pairing-admin-header">
			<div class="bt-pairing-admin-intro">
				<p class="bt-pairing-admin-kicker">Admin tools</p>
				<h2 class="bt-pairing-admin-title" id="bt-pairing-admin-title">Pairing data tools</h2>
				<p class="bt-pairing-admin-summary">Update saved menu data, refresh page extras, and warm pairing results for visitors.</p>
			</div>
			<button type="button" class="bt-pairing-admin-toggle" aria-expanded="true" aria-controls="bt-pairing-admin-body">
				Hide tools
			</button>
		</div>
		<div class="bt-pairing-admin-body" id="bt-pairing-admin-body">
			<p class="bt-pairing-admin-checklist">
				<strong>Typical update:</strong> after the beer list or food sheet changes, run <strong>Sync menu data</strong>, then <strong>Warm visitor pairings</strong> if you want guests to skip the first-load wait.
			</p>
			<?php if ( $is_preview ) : ?>
				<p class="bt-pairing-admin-preview-note" role="note">
					Preview mode is on. Layout and copy are visible, but actions stay disabled until you log into WordPress as an admin.
				</p>
			<?php endif; ?>
			<div class="bt-pairing-admin-feedback" id="bt-pairing-feedback" role="status" aria-live="polite" aria-atomic="true"></div>
			<section class="bt-pairing-admin-section bt-pairing-admin-section--status" aria-labelledby="bt-pairing-admin-status-title">
				<h3 class="bt-pairing-section-title" id="bt-pairing-admin-status-title">Status</h3>
				<div class="bt-pairing-status-grid">
					<div class="bt-pairing-status-card">
						<div class="bt-pairing-status-label">Current page data</div>
						<div class="bt-pairing-status-value" id="bt-pairing-menu-meta" role="status" aria-live="polite">Checking beer and food data…</div>
					</div>
					<div class="bt-pairing-status-card">
						<div class="bt-pairing-status-label">Visitor pairing cache</div>
						<div class="bt-pairing-status-value" id="bt-pairing-refresh-meta" role="status" aria-live="polite">Not warmed yet.</div>
					</div>
					<div class="bt-pairing-status-card">
						<div class="bt-pairing-status-label">Static food pairings</div>
						<div class="bt-pairing-status-value" id="bt-pairing-static-meta" role="status" aria-live="polite">Not loaded yet.</div>
					</div>
					<div class="bt-pairing-status-card">
						<div class="bt-pairing-status-label">Page readiness</div>
						<div class="bt-pairing-status-value" id="bt-pairing-ready" role="status" aria-live="polite">Waiting for page status…</div>
					</div>
				</div>
			</section>
			<section class="bt-pairing-admin-section" aria-labelledby="bt-pairing-common-title">
				<h3 class="bt-pairing-section-title" id="bt-pairing-common-title">Most common tasks</h3>
				<div class="bt-pairing-admin-task-list">
					<div class="bt-pairing-admin-task bt-pairing-admin-task--featured">
						<div class="bt-pairing-admin-task-copy">
							<h4 class="bt-pairing-admin-task-title">1. Sync menu data</h4>
							<p class="bt-pairing-admin-task-text">Pull the latest beer list and food sheet already loaded on this page into the saved pairing dataset.</p>
							<p class="bt-pairing-admin-meta"><span class="bt-pairing-scope">Saved server data</span> Run this first after menu changes.</p>
						</div>
						<div class="bt-pairing-admin-actions">
							<button type="button" class="bt-pairing-action bt-pairing-button bt-pairing-button--primary bt-feature-action" data-feature-action="refresh-menu" data-pending-label="Syncing menu data…">Sync menu data</button>
						</div>
					</div>
					<div class="bt-pairing-admin-task bt-pairing-admin-task--featured">
						<div class="bt-pairing-admin-task-copy">
							<h4 class="bt-pairing-admin-task-title">2. Warm visitor pairings</h4>
							<p class="bt-pairing-admin-task-text" id="bt-pairing-help-refresh">Pre-generate pairing results so guests see recommendations faster the next time they load this page.</p>
							<p class="bt-pairing-admin-meta"><span class="bt-pairing-scope">Visitor speed</span> Run after syncing menu data.</p>
						</div>
						<div class="bt-pairing-admin-actions">
							<button type="button" class="bt-pairing-refresh bt-pairing-button bt-pairing-button--secondary" aria-describedby="bt-pairing-help-refresh" data-default-label="Warm visitor pairings" data-pending-label="Warming visitor pairings…">Warm visitor pairings</button>
						</div>
						<p class="bt-pairing-inline-hint" id="bt-pairing-refresh-hint" role="status" aria-live="polite">Warm visitor pairings needs both beer and food data on this page.</p>
					</div>
				</div>
			</section>
			<section class="bt-pairing-admin-section" aria-labelledby="bt-pairing-features-title">
				<h3 class="bt-pairing-section-title" id="bt-pairing-features-title">Refresh this page’s extras</h3>
				<p class="bt-pairing-section-help">Use these when one part of the pairing experience looks stale on this page. <strong>Refresh</strong> rebuilds it now. <strong>Clear cached copy</strong> removes the saved copy so the next refresh can start clean.</p>
				<div class="bt-pairing-admin-task-list" id="bt-pairing-feature-controls">
					<div class="bt-pairing-admin-task bt-pairing-admin-task--compact">
						<div class="bt-pairing-admin-task-copy">
							<h4 class="bt-pairing-admin-task-title">Beer colors</h4>
							<p class="bt-pairing-admin-task-text">Rebuild the color swatches used in the beer cards.</p>
							<p class="bt-pairing-admin-meta"><span class="bt-pairing-scope">This page + saved cache</span></p>
						</div>
						<div class="bt-pairing-admin-actions bt-pairing-admin-actions--split">
							<button type="button" class="bt-pairing-action bt-pairing-button bt-pairing-button--secondary bt-feature-action" data-feature-action="refresh-colors" data-pending-label="Refreshing beer colors…">Refresh</button>
							<button type="button" class="bt-pairing-action bt-pairing-button bt-pairing-button--subtle bt-feature-action" data-feature-action="clear-colors" data-pending-label="Clearing beer color cache…">Clear cached copy</button>
						</div>
					</div>
					<div class="bt-pairing-admin-task bt-pairing-admin-task--compact" data-requires-feature="show_history">
						<div class="bt-pairing-admin-task-copy">
							<h4 class="bt-pairing-admin-task-title">Beer history</h4>
							<p class="bt-pairing-admin-task-text">Refresh the short history notes shown on each beer.</p>
							<p class="bt-pairing-admin-meta"><span class="bt-pairing-scope">This page + saved cache</span></p>
						</div>
						<div class="bt-pairing-admin-actions bt-pairing-admin-actions--split">
							<button type="button" class="bt-pairing-action bt-pairing-button bt-pairing-button--secondary bt-feature-action" data-feature-action="refresh-history" data-pending-label="Refreshing beer history…">Refresh</button>
							<button type="button" class="bt-pairing-action bt-pairing-button bt-pairing-button--subtle bt-feature-action" data-feature-action="clear-history" data-pending-label="Clearing beer history cache…">Clear cached copy</button>
						</div>
					</div>
					<div class="bt-pairing-admin-task bt-pairing-admin-task--compact" data-requires-feature="show_fun_facts">
						<div class="bt-pairing-admin-task-copy">
							<h4 class="bt-pairing-admin-task-title">Fun facts</h4>
							<p class="bt-pairing-admin-task-text">Refresh the fun facts shown in the beer details.</p>
							<p class="bt-pairing-admin-meta"><span class="bt-pairing-scope">This page + saved cache</span></p>
						</div>
						<div class="bt-pairing-admin-actions bt-pairing-admin-actions--split">
							<button type="button" class="bt-pairing-action bt-pairing-button bt-pairing-button--secondary bt-feature-action" data-feature-action="refresh-fun-facts" data-pending-label="Refreshing fun facts…">Refresh</button>
							<button type="button" class="bt-pairing-action bt-pairing-button bt-pairing-button--subtle bt-feature-action" data-feature-action="clear-fun-facts" data-pending-label="Clearing fun facts cache…">Clear cached copy</button>
						</div>
					</div>
					<div class="bt-pairing-admin-task bt-pairing-admin-task--compact" data-requires-feature="show_pairings">
						<div class="bt-pairing-admin-task-copy">
							<h4 class="bt-pairing-admin-task-title">Food pairings</h4>
							<p class="bt-pairing-admin-task-text">Refresh the suggested food pairings shown inside the beer cards.</p>
							<p class="bt-pairing-admin-meta"><span class="bt-pairing-scope">This page + saved cache</span></p>
						</div>
						<div class="bt-pairing-admin-actions bt-pairing-admin-actions--split">
							<button type="button" class="bt-pairing-action bt-pairing-button bt-pairing-button--secondary bt-feature-action" data-feature-action="refresh-static-pairings" data-pending-label="Refreshing food pairings…">Refresh</button>
							<button type="button" class="bt-pairing-action bt-pairing-button bt-pairing-button--subtle bt-feature-action" data-feature-action="clear-static-pairings" data-pending-label="Clearing food pairing cache…">Clear cached copy</button>
						</div>
					</div>
					<div class="bt-pairing-admin-task bt-pairing-admin-task--compact bt-pairing-admin-task--warning">
						<div class="bt-pairing-admin-task-copy">
							<h4 class="bt-pairing-admin-task-title">All page extras</h4>
							<p class="bt-pairing-admin-task-text">Clear cached colors, history, fun facts, and food pairings for this page in one step.</p>
							<p class="bt-pairing-admin-meta"><span class="bt-pairing-scope">This page + saved caches</span> Use this when several extras look out of date.</p>
						</div>
						<div class="bt-pairing-admin-actions">
							<button type="button" class="bt-pairing-action bt-pairing-button bt-pairing-button--subtle bt-feature-action" data-feature-action="clear-feature-caches" data-pending-label="Clearing page extras…" data-confirm-message="Clear all cached extras for this page? This removes saved copies for colors, history, fun facts, and food pairings so they can be rebuilt cleanly.">Clear all page extras</button>
						</div>
					</div>
				</div>
			</section>
			<details class="bt-pairing-admin-section bt-pairing-admin-section--advanced">
				<summary class="bt-pairing-advanced-summary">Advanced maintenance</summary>
				<p class="bt-pairing-section-help">Use these only when the saved menu dataset itself is wrong or you need to force a clean rebuild.</p>
				<div class="bt-pairing-admin-task-list">
					<div class="bt-pairing-admin-task bt-pairing-admin-task--compact">
						<div class="bt-pairing-admin-task-copy">
							<h4 class="bt-pairing-admin-task-title">Rebuild saved menu data</h4>
							<p class="bt-pairing-admin-task-text">Rebuild the saved menu snapshot from the latest menu data already ingested on the server.</p>
							<p class="bt-pairing-admin-meta"><span class="bt-pairing-scope">Saved server data</span> Use this if saved menu data still looks wrong after syncing.</p>
						</div>
						<div class="bt-pairing-admin-actions">
							<button type="button" class="bt-pairing-action bt-pairing-button bt-pairing-button--secondary bt-feature-action" data-feature-action="rebuild-snapshot" data-pending-label="Rebuilding saved menu data…">Rebuild saved data</button>
						</div>
					</div>
					<div class="bt-pairing-admin-task bt-pairing-admin-task--compact bt-pairing-admin-task--danger">
						<div class="bt-pairing-admin-task-copy">
							<h4 class="bt-pairing-admin-task-title">Clear saved menu data</h4>
							<p class="bt-pairing-admin-task-text">Remove the saved menu snapshot entirely. Visitors may see slower or incomplete pairing results until you sync menu data again.</p>
							<p class="bt-pairing-admin-meta"><span class="bt-pairing-scope">Saved server data</span> Only use this when you need a full reset.</p>
						</div>
						<div class="bt-pairing-admin-actions">
							<button type="button" class="bt-pairing-action bt-pairing-button bt-pairing-button--danger bt-feature-action" data-feature-action="clear-menu" data-pending-label="Clearing saved menu data…" data-confirm-message="Clear the saved menu data? Visitors may see stale or missing pairing results until you sync menu data again.">Clear saved data</button>
						</div>
					</div>
				</div>
			</details>
		</div>
	</div>
	<script>
		(() => {
			const buttons = document.querySelectorAll('.bt-pairing-action');
			const featureButtons = document.querySelectorAll('.bt-feature-action');
			const refreshBtn = document.querySelector('.bt-pairing-refresh');
			const adminTools = document.getElementById('bt-pairing-admin-tools');
			const adminToggle = adminTools ? adminTools.querySelector('.bt-pairing-admin-toggle') : null;
			const adminBody = document.getElementById('bt-pairing-admin-body');
			const previewOnly = adminTools?.dataset.previewOnly === 'true';
			const refreshHint = document.getElementById('bt-pairing-refresh-hint');
			const menuMeta = document.getElementById('bt-pairing-menu-meta');
			const refreshMeta = document.getElementById('bt-pairing-refresh-meta');
			const staticMeta = document.getElementById('bt-pairing-static-meta');
			const readyMeta = document.getElementById('bt-pairing-ready');
			const feedback = document.getElementById('bt-pairing-feedback');
			const featureRows = document.querySelectorAll('[data-requires-feature]');
			if (!buttons.length && !refreshBtn) return;
			const actionCopy = {
				'refresh-menu': {
					success: 'Saved menu data updated from the beer list and food sheet currently loaded on this page.',
					error: 'Could not sync menu data. Reload the page and confirm both beer and food data are available before trying again.'
				},
				'clear-menu': {
					success: 'Saved menu data cleared. Sync menu data again before warming visitor pairings.',
					error: 'Could not clear saved menu data.'
				},
				'rebuild-snapshot': {
					success: 'Saved menu data rebuilt.',
					error: 'Could not rebuild the saved menu data.'
				},
				'clear-feature-caches': {
					success: 'Cleared cached page extras. Refresh any feature below if you want fresh content right away.',
					error: 'Could not clear the page extras.'
				},
				'refresh-colors': {
					success: 'Beer colors refreshed for this page.',
					error: 'Could not refresh beer colors.'
				},
				'clear-colors': {
					success: 'Beer color cache cleared for this page.',
					error: 'Could not clear the beer color cache.'
				},
				'refresh-history': {
					success: 'Beer history refreshed for this page.',
					error: 'Could not refresh beer history.'
				},
				'clear-history': {
					success: 'Beer history cache cleared for this page.',
					error: 'Could not clear the beer history cache.'
				},
				'refresh-fun-facts': {
					success: 'Fun facts refreshed for this page.',
					error: 'Could not refresh fun facts.'
				},
				'clear-fun-facts': {
					success: 'Fun facts cache cleared for this page.',
					error: 'Could not clear the fun facts cache.'
				},
				'refresh-static-pairings': {
					success: 'Food pairings refreshed for this page.',
					error: 'Could not refresh food pairings.'
				},
				'clear-static-pairings': {
					success: 'Food pairing cache cleared for this page.',
					error: 'Could not clear the food pairing cache.'
				},
				'preload-pairings': {
					success: 'Visitor pairing cache warmed for this page.',
					error: 'Could not warm visitor pairings.'
				}
			};
			const getPageFeatures = () => {
				const root = document.getElementById('bt-pairing-app-root');
				const attrBool = (value, fallback) => {
					if (value === '1' || value === 'true') return true;
					if (value === '0' || value === 'false') return false;
					return fallback;
				};
				const raw = window.BT_PAIRING_APP_PAGE_FEATURES
					|| (window.BT_PAIRING_APP_CONFIG && window.BT_PAIRING_APP_CONFIG.pageFeatures)
					|| {};
				return {
					show_quiz: root ? attrBool(root.dataset.showQuiz, raw.show_quiz !== false) : raw.show_quiz !== false,
					show_flight: root ? attrBool(root.dataset.showFlight, raw.show_flight !== false) : raw.show_flight !== false,
					show_history: root ? attrBool(root.dataset.showHistory, raw.show_history !== false) : raw.show_history !== false,
					show_fun_facts: root ? attrBool(root.dataset.showFunFacts, raw.show_fun_facts !== false) : raw.show_fun_facts !== false,
					show_pairings: root ? attrBool(root.dataset.showPairings, raw.show_pairings !== false) : raw.show_pairings !== false,
				};
			};
			let pageFeatures = getPageFeatures();
			let pageCacheHash = '';
			const announceFeedback = (message, type = 'info') => {
				if (!feedback) return;
				feedback.textContent = message || '';
				feedback.classList.remove('is-success', 'is-error', 'is-info');
				if (!message) return;
				feedback.classList.add(type === 'error' ? 'is-error' : type === 'success' ? 'is-success' : 'is-info');
			};
			const setButtonBusy = (button, busy) => {
				if (!button) return;
				const defaultLabel = button.dataset.defaultLabel || button.textContent || '';
				if (!button.dataset.defaultLabel) {
					button.dataset.defaultLabel = defaultLabel;
				}
				button.disabled = !!busy;
				button.setAttribute('aria-busy', busy ? 'true' : 'false');
				button.textContent = busy ? (button.dataset.pendingLabel || defaultLabel) : (button.dataset.defaultLabel || defaultLabel);
			};
			const setAdminCollapsed = (collapsed) => {
				if (!adminTools || !adminToggle) return;
				adminTools.classList.toggle('bt-pairing-admin-tools--collapsed', collapsed);
				adminToggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
				if (adminBody) {
					adminBody.hidden = collapsed;
				}
				adminToggle.textContent = collapsed ? 'Show tools' : 'Hide tools';
			};
			if (adminTools && adminToggle) {
				adminToggle.addEventListener('click', () => {
					const isCollapsed = adminTools.classList.contains('bt-pairing-admin-tools--collapsed');
					setAdminCollapsed(!isCollapsed);
				});
			}
			const formatTime = (value) => {
				if (!value) return '—';
				const date = new Date(value);
				return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
			};
			const safeString = (value) => {
				if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
				return '';
			};
			const hashString = (value) => {
				const str = safeString(value);
				let hash = 5381;
				for (let i = 0; i < str.length; i++) {
					hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
					hash = hash >>> 0;
				}
				return hash.toString(36);
			};
			const toItems = (payload) => {
				if (Array.isArray(payload)) return payload;
				if (payload && typeof payload === 'object' && Array.isArray(payload.items)) return payload.items;
				return [];
			};
			const getBeerFingerprint = (items) => {
				if (!Array.isArray(items) || !items.length) return null;
				const normalized = items.map((item) => {
					if (!item || typeof item !== 'object') return '';
					const key = item.btKey || item.id || item.slug || item.name || '';
					const style = item.style || '';
					const profile = item.pairingProfile ? JSON.stringify(item.pairingProfile) : '';
					return `${key}|${style}|${profile}`;
				}).filter(Boolean).sort().join('||');
				return normalized ? hashString(normalized) : null;
			};
			const getFoodFingerprint = (items) => {
				if (!Array.isArray(items) || !items.length) return null;
				const normalized = items.map((item) => {
					if (!item || typeof item !== 'object') return '';
					const key = item.btKey || item.id || item.slug || item.name || '';
					const category = item.category || '';
					return `${key}|${category}`;
				}).filter(Boolean).sort().join('||');
				return normalized ? hashString(normalized) : null;
			};
			const readJsonScript = (id) => {
				const script = document.getElementById(id);
				if (!script || !script.textContent) return null;
				try {
					return JSON.parse(script.textContent);
				} catch (err) {
					return null;
				}
			};
			const isKind = (payload, kind) => payload && typeof payload === 'object' && (!payload.kind || payload.kind === kind);
			const readBeerData = () => {
				const win = window;
				const direct = win.__BT_BEER_DATA;
				if (isKind(direct, 'beer')) return direct;
				const nested = win.__BT_DATA && win.__BT_DATA.beer;
				if (isKind(nested, 'beer')) return nested;
				const script = readJsonScript('bt-beer-data');
				if (isKind(script, 'beer')) return script;
				return null;
			};
			const readFoodData = () => {
				const win = window;
				const direct = win.__BT_FOOD_DATA;
				if (isKind(direct, 'food')) return direct;
				const nested = win.__BT_DATA && win.__BT_DATA.food;
				if (isKind(nested, 'food')) return nested;
				const scriptFood = readJsonScript('bt-food-data');
				if (isKind(scriptFood, 'food')) return scriptFood;
				const scriptLegacy = readJsonScript('bt-menu-data');
				if (isKind(scriptLegacy, 'food')) return scriptLegacy;
				return null;
			};
			const PRELOAD_LABEL = 'Warm visitor pairings';
			const setRefreshState = ({ disabled, label, hint }) => {
				if (refreshBtn) {
					refreshBtn.disabled = previewOnly ? true : !!disabled;
					refreshBtn.setAttribute('aria-disabled', previewOnly || disabled ? 'true' : 'false');
					if (label) refreshBtn.textContent = label;
				}
				if (refreshHint) {
					refreshHint.textContent = hint || '';
					refreshHint.style.display = hint ? 'block' : 'none';
				}
			};
			const upsertJsonScript = (id, value) => {
				let script = document.getElementById(id);
				if (!script) {
					script = document.createElement('script');
					script.type = 'application/json';
					script.id = id;
					document.body.appendChild(script);
				}
				script.textContent = JSON.stringify(value || {});
			};
			const applyMenuSnapshotRuntime = (snapshot) => {
				const win = window;
				const canonical = snapshot && typeof snapshot === 'object' ? snapshot : null;
				win.__BT_CANONICAL_MENU_SNAPSHOT = canonical;
				win.__BT_DATA = win.__BT_DATA && typeof win.__BT_DATA === 'object' ? win.__BT_DATA : {};
				if (!canonical || !canonical.beer || !canonical.food) {
					const emptyBeer = { kind: 'beer', items: [] };
					const emptyFood = { kind: 'food', items: [] };
					delete win.__BT_DATA.beer;
					delete win.__BT_DATA.food;
					win.__BT_BEER_DATA = null;
					win.__BT_FOOD_DATA = null;
					win.__BT_MENU_DATA = null;
					upsertJsonScript('bt-beer-data', emptyBeer);
					upsertJsonScript('bt-food-data', emptyFood);
					upsertJsonScript('bt-menu-data', emptyFood);
					document.dispatchEvent(new CustomEvent('btBeerDataReady', { detail: emptyBeer }));
					document.dispatchEvent(new CustomEvent('btFoodDataReady', { detail: emptyFood }));
					document.dispatchEvent(new CustomEvent('btPairingReset', { detail: { action: 'menu-sync', empty: true } }));
					return;
				}
				win.__BT_DATA.beer = canonical.beer;
				win.__BT_DATA.food = canonical.food;
				win.__BT_BEER_DATA = canonical.beer;
				win.__BT_FOOD_DATA = canonical.food;
				win.__BT_MENU_DATA = canonical.food;
				upsertJsonScript('bt-beer-data', canonical.beer);
				upsertJsonScript('bt-food-data', canonical.food);
				upsertJsonScript('bt-menu-data', canonical.food);
				document.dispatchEvent(new CustomEvent('btBeerDataReady', { detail: canonical.beer }));
				document.dispatchEvent(new CustomEvent('btFoodDataReady', { detail: canonical.food }));
				document.dispatchEvent(new CustomEvent('btPairingReset', { detail: { action: 'menu-sync' } }));
			};
			const syncMenuSnapshotRuntime = async ({ allowEmpty = false } = {}) => {
				const res = await fetch('<?php echo esc_js( $snapshot_endpoint ); ?>', {
					method: 'GET',
					credentials: 'same-origin',
					headers: {
						'Content-Type': 'application/json',
						'X-WP-Nonce': '<?php echo esc_js( $nonce ); ?>',
					},
				});
				if (!res.ok) {
					if (allowEmpty && res.status === 404) {
						applyMenuSnapshotRuntime(null);
						return null;
					}
					throw new Error(`Snapshot read failed (${res.status})`);
				}
				const data = await res.json();
				applyMenuSnapshotRuntime(data && data.snapshot ? data.snapshot : null);
				return data && data.snapshot ? data.snapshot : null;
			};
			const readCanonicalBeerData = () => {
				const snapBeer = window.__BT_CANONICAL_MENU_SNAPSHOT?.beer;
				if (snapBeer && Array.isArray(snapBeer.items)) return snapBeer;
				return readBeerData();
			};
			const readCanonicalFoodData = () => {
				const snapFood = window.__BT_CANONICAL_MENU_SNAPSHOT?.food;
				if (snapFood && Array.isArray(snapFood.items)) return snapFood;
				return readFoodData();
			};
			const postMenuIntake = async (kind, payload, sourceName) => {
				if (!payload || !Array.isArray(payload.items)) return;
				await fetch('<?php echo esc_js( rest_url( 'bt/v1/menu-snapshot/intake' ) ); ?>', {
					method: 'POST',
					credentials: 'same-origin',
					headers: {
						'Content-Type': 'application/json',
						'X-WP-Nonce': '<?php echo esc_js( $nonce ); ?>',
					},
					body: JSON.stringify({
						kind,
						payload,
						source: { name: sourceName, url: window.location.href },
					}),
				});
			};
			const applyFeatureControlVisibility = () => {
				pageFeatures = getPageFeatures();
				featureRows.forEach((row) => {
					const required = row.getAttribute('data-requires-feature');
					const visible = !required || pageFeatures[required];
					row.style.display = visible ? '' : 'none';
				});
			};
			const clearFeatureCaches = async () => {
				const actions = ['clear-colors'];
				if (pageFeatures.show_history) actions.push('clear-history');
				if (pageFeatures.show_fun_facts) actions.push('clear-fun-facts');
				if (pageFeatures.show_pairings) actions.push('clear-static-pairings');
				for (const action of actions) {
					document.dispatchEvent(new CustomEvent('btPairingAdminAction', { detail: { action } }));
				}
			};
			const rebuildSnapshot = async () => {
				const res = await fetch('<?php echo esc_js( $snapshot_rebuild_endpoint ); ?>', {
					method: 'POST',
					credentials: 'same-origin',
					headers: {
						'Content-Type': 'application/json',
						'X-WP-Nonce': '<?php echo esc_js( $nonce ); ?>',
					},
				});
				if (!res.ok) {
					throw new Error(`Snapshot rebuild failed (${res.status})`);
				}
			};
			const clearSnapshot = async () => {
				const res = await fetch('<?php echo esc_js( $snapshot_endpoint ); ?>', {
					method: 'DELETE',
					credentials: 'same-origin',
					headers: {
						'Content-Type': 'application/json',
						'X-WP-Nonce': '<?php echo esc_js( $nonce ); ?>',
					},
				});
				if (!res.ok) {
					throw new Error(`Snapshot clear failed (${res.status})`);
				}
			};
			const refreshMenuSnapshot = async () => {
				const beer = readCanonicalBeerData();
				const food = readCanonicalFoodData();
				if (!beer || !food) {
					throw new Error('Menu refresh requires current page beer + food data.');
				}
				await postMenuIntake('beer', beer, 'admin-page-refresh');
				await postMenuIntake('food', food, 'admin-page-refresh');
				await rebuildSnapshot();
			};
			const updateAvailability = () => {
				const beerData = readBeerData();
				const foodData = readFoodData();
				const beerItems = toItems(beerData);
				const foodItems = toItems(foodData);
				const beerHash = getBeerFingerprint(beerItems);
				const foodHash = getFoodFingerprint(foodItems);
				if (menuMeta) {
					if (beerHash && foodHash) {
						menuMeta.textContent = `Ready · ${beerItems.length} beers and ${foodItems.length} food items loaded on this page.`;
					} else {
						menuMeta.textContent = 'Waiting for both beer and food data to load on this page.';
					}
				}
				if (!beerHash || !foodHash) {
					if (refreshMeta) refreshMeta.textContent = 'Not warmed yet.';
					setRefreshState({
						disabled: true,
						label: PRELOAD_LABEL,
						hint: 'Warm visitor pairings needs both beer and food data on this page.',
					});
					return;
				}
				setRefreshState({ disabled: false, label: PRELOAD_LABEL, hint: '' });
			};
			const refreshPairingCache = async () => {
				if (!refreshBtn) return;
				const beerData = readBeerData();
				const foodData = readFoodData();
				if (!beerData || !foodData) {
					setRefreshState({
						disabled: true,
						label: PRELOAD_LABEL,
						hint: 'Warm visitor pairings needs both beer and food data on this page.',
					});
					return;
				}
				const payload = {
					beerData,
					foodData,
					preload: true,
					answers: { mood: '', body: '', bitterness: '', flavorFocus: [], alcoholPreference: '' },
				};
				const staticPayload = {
					beerData,
					foodData,
					force: true,
				};
				setRefreshState({ disabled: true, label: 'Warming visitor pairings…', hint: '' });
				announceFeedback('Warming visitor pairings…');
				try {
					const res = await fetch('<?php echo esc_js( $pairing_endpoint ); ?>', {
						method: 'POST',
						credentials: 'same-origin',
						headers: {
							'Content-Type': 'application/json',
							'X-WP-Nonce': '<?php echo esc_js( $nonce ); ?>',
						},
						body: JSON.stringify(payload),
					});
					if (!res.ok) {
						console.warn('Refresh failed', res.status);
						announceFeedback(actionCopy['preload-pairings'].error, 'error');
					} else {
						document.dispatchEvent(new CustomEvent('btPairingRefresh', { detail: { action: 'refresh' } }));
						await fetch('<?php echo esc_js( $static_endpoint ); ?>', {
							method: 'POST',
							credentials: 'same-origin',
							headers: {
								'Content-Type': 'application/json',
								'X-WP-Nonce': '<?php echo esc_js( $nonce ); ?>',
							},
							body: JSON.stringify(staticPayload),
						});
						const nowLabel = formatTime(Date.now());
						setRefreshState({ disabled: false, label: `Warmed ${nowLabel}`, hint: '' });
						if (refreshMeta) refreshMeta.textContent = `Warmed ${nowLabel}.`;
						announceFeedback(actionCopy['preload-pairings'].success, 'success');
					}
				} catch (err) {
					console.error('Refresh error', err);
					announceFeedback(actionCopy['preload-pairings'].error, 'error');
				} finally {
					if (refreshBtn.textContent === 'Warming visitor pairings…') {
						setRefreshState({ disabled: false, label: PRELOAD_LABEL, hint: '' });
					}
					updateAvailability();
				}
			};
			const purgeTargetByHash = async (target) => {
				if (!target) return;
				const body = { target };
				if (pageCacheHash) body.hash = pageCacheHash;
				const res = await fetch('<?php echo esc_js( $endpoint ); ?>', {
					method: 'POST',
					credentials: 'same-origin',
					headers: {
						'Content-Type': 'application/json',
						'X-WP-Nonce': '<?php echo esc_js( $nonce ); ?>',
					},
					body: JSON.stringify(body),
				});
				if (!res.ok) {
					throw new Error(`Purge failed (${res.status})`);
				}
			};
			featureButtons.forEach((btn) => {
				btn.addEventListener('click', async () => {
					const action = btn.getAttribute('data-feature-action') || '';
					const required = btn.closest('[data-requires-feature]')?.getAttribute('data-requires-feature');
					const confirmMessage = btn.getAttribute('data-confirm-message');
					if (!action) return;
					if (previewOnly) {
						announceFeedback('Preview mode is on. Log into WordPress as an admin to run these actions.', 'info');
						return;
					}
					if (required && !pageFeatures[required]) return;
					if (confirmMessage && !window.confirm(confirmMessage)) return;
					setButtonBusy(btn, true);
					announceFeedback(btn.dataset.pendingLabel || 'Working…');
					try {
						if (action === 'refresh-menu') {
							await refreshMenuSnapshot();
							await syncMenuSnapshotRuntime();
						} else if (action === 'clear-menu') {
							await clearSnapshot();
							await syncMenuSnapshotRuntime({ allowEmpty: true });
						} else if (action === 'rebuild-snapshot') {
							await rebuildSnapshot();
							await syncMenuSnapshotRuntime();
						} else if (action === 'clear-feature-caches') {
							await purgeTargetByHash('colors');
							if (pageFeatures.show_history) await purgeTargetByHash('history');
							if (pageFeatures.show_fun_facts) await purgeTargetByHash('fun_facts');
							if (pageFeatures.show_pairings) await purgeTargetByHash('pairings-static');
							await clearFeatureCaches();
						} else if (action === 'refresh-colors') {
							await purgeTargetByHash('colors');
							document.dispatchEvent(new CustomEvent('btPairingAdminAction', { detail: { action } }));
						} else if (action === 'clear-colors') {
							await purgeTargetByHash('colors');
							document.dispatchEvent(new CustomEvent('btPairingAdminAction', { detail: { action } }));
						} else if (action === 'refresh-history') {
							await purgeTargetByHash('history');
							document.dispatchEvent(new CustomEvent('btPairingAdminAction', { detail: { action } }));
						} else if (action === 'clear-history') {
							await purgeTargetByHash('history');
							document.dispatchEvent(new CustomEvent('btPairingAdminAction', { detail: { action } }));
						} else if (action === 'refresh-fun-facts') {
							await purgeTargetByHash('fun_facts');
							document.dispatchEvent(new CustomEvent('btPairingAdminAction', { detail: { action } }));
						} else if (action === 'clear-fun-facts') {
							await purgeTargetByHash('fun_facts');
							document.dispatchEvent(new CustomEvent('btPairingAdminAction', { detail: { action } }));
						} else if (action === 'refresh-static-pairings') {
							await purgeTargetByHash('pairings-static');
							document.dispatchEvent(new CustomEvent('btPairingAdminAction', { detail: { action } }));
						} else if (action === 'clear-static-pairings') {
							await purgeTargetByHash('pairings-static');
							document.dispatchEvent(new CustomEvent('btPairingAdminAction', { detail: { action } }));
						} else {
							document.dispatchEvent(new CustomEvent('btPairingAdminAction', { detail: { action } }));
						}
						announceFeedback(actionCopy[action]?.success || 'Done.', 'success');
					} catch (err) {
						console.error('Feature action failed', action, err);
						announceFeedback(actionCopy[action]?.error || 'This action could not be completed.', 'error');
					} finally {
						setButtonBusy(btn, false);
						updateAvailability();
					}
				});
			});
			if (refreshBtn) {
				if (previewOnly) {
					refreshBtn.disabled = true;
				} else {
					refreshBtn.addEventListener('click', refreshPairingCache);
				}
			}
			document.addEventListener('btPairingStatus', (event) => {
				const detail = event && event.detail ? event.detail : {};
				if (readyMeta) {
					readyMeta.textContent = detail.pairingsReady ? 'Ready for visitors.' : 'Still loading or not warmed yet.';
				}
				if (staticMeta) {
					const updated = formatTime(detail.staticLastUpdated);
					const store = detail.staticStore ? ` from ${detail.staticStore}` : '';
					staticMeta.textContent = detail.staticLastUpdated ? `Updated ${updated}${store}.` : 'Not loaded yet.';
				}
				if (detail.lastFetched && refreshMeta) {
					refreshMeta.textContent = `Warmed ${formatTime(detail.lastFetched)}.`;
				}
			});
			document.addEventListener('btPairingPageContext', (event) => {
				const detail = event && event.detail ? event.detail : {};
				pageCacheHash = typeof detail.cacheHash === 'string' ? detail.cacheHash : '';
				applyFeatureControlVisibility();
			});
			applyFeatureControlVisibility();
			updateAvailability();
			if (previewOnly) {
				announceFeedback('Preview mode is on. Log into WordPress as an admin to run these actions.', 'info');
				buttons.forEach((button) => {
					button.disabled = true;
				});
				if (refreshBtn) refreshBtn.disabled = true;
			}
			document.addEventListener('btBeerDataReady', updateAvailability);
			document.addEventListener('btFoodDataReady', updateAvailability);
		})();
	</script>
	<?php
}
add_action( 'wp_footer', 'bt_pairing_admin_buttons' );
