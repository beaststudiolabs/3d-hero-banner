<?php
/**
 * Banner version snapshot manager.
 *
 * @package Beastside3DHeroBanner
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class BS3D_Version_Manager {
	/**
	 * Register hooks.
	 */
	public static function init() {
		add_action( 'init', array( __CLASS__, 'register_post_type' ) );
	}

	/**
	 * Register hidden version post type.
	 */
	public static function register_post_type() {
		register_post_type(
			'bs3d_banner_version',
			array(
				'labels'       => array(
					'name' => __( '3D Banner Versions', 'beastside-3d-hero-banner' ),
				),
				'public'       => false,
				'show_ui'      => false,
				'supports'     => array( 'title' ),
				'rewrite'      => false,
				'query_var'    => false,
				'can_export'   => false,
				'has_archive'  => false,
				'show_in_rest' => false,
			)
		);
	}

	/**
	 * Create snapshot for banner.
	 *
	 * @param int    $banner_id Banner ID.
	 * @param string $reason Snapshot reason.
	 */
	public static function create_snapshot( $banner_id, $reason = 'save' ) {
		$banner = get_post( $banner_id );
		if ( ! $banner || 'bs3d_banner' !== $banner->post_type ) {
			return 0;
		}

		$payload = array(
			'banner_id'       => (int) $banner_id,
			'banner_title'    => $banner->post_title,
			'banner_slug'     => $banner->post_name,
			'snapshot_reason' => sanitize_key( $reason ),
			'timestamp'       => gmdate( 'c' ),
			'meta'            => array(
				'scene_config'   => get_post_meta( $banner_id, '_bs3d_scene_config', true ),
				'debug_override' => get_post_meta( $banner_id, '_bs3d_debug_override', true ),
				'poster_url'     => get_post_meta( $banner_id, '_bs3d_poster_url', true ),
				'quality'        => get_post_meta( $banner_id, '_bs3d_quality_profile', true ),
				'mobile_mode'    => get_post_meta( $banner_id, '_bs3d_mobile_mode', true ),
			),
		);

		$hash = md5( wp_json_encode( $payload['meta'] ) );

		$latest = get_posts(
			array(
				'post_type'      => 'bs3d_banner_version',
				'post_status'    => 'publish',
				'posts_per_page' => 1,
				'orderby'        => 'date',
				'order'          => 'DESC',
				'meta_query'     => array(
					array(
						'key'   => '_bs3d_banner_id',
						'value' => (int) $banner_id,
					),
				),
			)
		);

		if ( ! empty( $latest ) ) {
			$latest_hash = get_post_meta( $latest[0]->ID, '_bs3d_snapshot_hash', true );
			if ( $latest_hash && $latest_hash === $hash ) {
				return 0;
			}
		}

		$version_id = wp_insert_post(
			array(
				'post_type'   => 'bs3d_banner_version',
				'post_status' => 'publish',
				'post_title'  => sprintf(
					/* translators: 1: banner title 2: timestamp */
					__( '%1$s @ %2$s', 'beastside-3d-hero-banner' ),
					$banner->post_title,
					gmdate( 'Y-m-d H:i:s' )
				),
			),
			true
		);

		if ( is_wp_error( $version_id ) ) {
			return 0;
		}

		update_post_meta( $version_id, '_bs3d_banner_id', (int) $banner_id );
		update_post_meta( $version_id, '_bs3d_snapshot_payload', wp_json_encode( $payload ) );
		update_post_meta( $version_id, '_bs3d_snapshot_hash', $hash );

		self::prune_versions( $banner_id, 20 );
		return (int) $version_id;
	}

	/**
	 * Get versions for a banner.
	 *
	 * @param int $banner_id Banner ID.
	 * @param int $limit Limit.
	 * @return array<int,WP_Post>
	 */
	public static function get_versions( $banner_id, $limit = 15 ) {
		return get_posts(
			array(
				'post_type'      => 'bs3d_banner_version',
				'post_status'    => 'publish',
				'posts_per_page' => max( 1, (int) $limit ),
				'orderby'        => 'date',
				'order'          => 'DESC',
				'meta_query'     => array(
					array(
						'key'   => '_bs3d_banner_id',
						'value' => (int) $banner_id,
					),
				),
			)
		);
	}

	/**
	 * Restore banner from version snapshot.
	 *
	 * @param int $banner_id Banner ID.
	 * @param int $version_id Version ID.
	 */
	public static function restore_version( $banner_id, $version_id ) {
		$version = get_post( $version_id );
		if ( ! $version || 'bs3d_banner_version' !== $version->post_type ) {
			return false;
		}

		$payload_json = get_post_meta( $version_id, '_bs3d_snapshot_payload', true );
		$payload      = json_decode( (string) $payload_json, true );
		if ( ! is_array( $payload ) || empty( $payload['meta'] ) || ! is_array( $payload['meta'] ) ) {
			return false;
		}

		$meta = $payload['meta'];
		update_post_meta( $banner_id, '_bs3d_scene_config', isset( $meta['scene_config'] ) ? (string) $meta['scene_config'] : '' );
		update_post_meta( $banner_id, '_bs3d_debug_override', isset( $meta['debug_override'] ) ? sanitize_key( (string) $meta['debug_override'] ) : 'inherit' );
		update_post_meta( $banner_id, '_bs3d_poster_url', isset( $meta['poster_url'] ) ? esc_url_raw( (string) $meta['poster_url'] ) : '' );
		update_post_meta( $banner_id, '_bs3d_quality_profile', isset( $meta['quality'] ) ? sanitize_key( (string) $meta['quality'] ) : 'balanced' );
		update_post_meta( $banner_id, '_bs3d_mobile_mode', isset( $meta['mobile_mode'] ) ? sanitize_key( (string) $meta['mobile_mode'] ) : 'adaptive' );

		self::create_snapshot( $banner_id, 'restore' );
		return true;
	}

	/**
	 * Remove old versions.
	 *
	 * @param int $banner_id Banner ID.
	 * @param int $max_versions Max versions to keep.
	 */
	private static function prune_versions( $banner_id, $max_versions ) {
		$versions = self::get_versions( $banner_id, 200 );
		if ( count( $versions ) <= $max_versions ) {
			return;
		}

		$to_delete = array_slice( $versions, $max_versions );
		foreach ( $to_delete as $post ) {
			wp_delete_post( $post->ID, true );
		}
	}
}
