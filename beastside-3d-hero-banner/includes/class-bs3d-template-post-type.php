<?php
/**
 * Template post type and helpers.
 *
 * @package Beastside3DHeroBanner
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class BS3D_Template_Post_Type {
	/**
	 * Register hooks.
	 */
	public static function init() {
		add_action( 'init', array( __CLASS__, 'register_post_type' ) );
	}

	/**
	 * Register template post type.
	 */
	public static function register_post_type() {
		$labels = array(
			'name'          => __( '3D Templates', 'beastside-3d-hero-banner' ),
			'singular_name' => __( '3D Template', 'beastside-3d-hero-banner' ),
			'menu_name'     => __( '3D Templates', 'beastside-3d-hero-banner' ),
		);

		register_post_type(
			'bs3d_template',
			array(
				'labels'          => $labels,
				'public'          => false,
				'show_ui'         => true,
				'show_in_menu'    => false,
				'supports'        => array( 'title' ),
				'capability_type' => 'post',
				'map_meta_cap'    => true,
				'rewrite'         => false,
			)
		);
	}

	/**
	 * Create a template payload from banner config.
	 *
	 * @param int    $banner_id Banner ID.
	 * @param string $template_name Template name.
	 * @return int|WP_Error
	 */
	public static function create_from_banner( $banner_id, $template_name ) {
		$banner_data = BS3D_Banner_Post_Type::get_banner_data( $banner_id );
		if ( empty( $banner_data ) ) {
			return new WP_Error( 'bs3d_invalid_banner', __( 'Invalid banner for template creation.', 'beastside-3d-hero-banner' ) );
		}

		$template_name = sanitize_text_field( $template_name );
		if ( '' === $template_name ) {
			$template_name = sprintf(
				/* translators: %s banner title */
				__( '%s Template', 'beastside-3d-hero-banner' ),
				$banner_data['title']
			);
		}

		$template_id = wp_insert_post(
			array(
				'post_type'   => 'bs3d_template',
				'post_status' => 'publish',
				'post_title'  => $template_name,
			),
			true
		);

		if ( is_wp_error( $template_id ) ) {
			return $template_id;
		}

		$payload = array(
			'scene'          => $banner_data['scene'],
			'poster_url'     => $banner_data['poster_url'],
			'quality'        => $banner_data['quality'],
			'mobile_mode'    => $banner_data['mobile_mode'],
			'debug_override' => $banner_data['debug_override'],
		);

		update_post_meta( $template_id, '_bs3d_template_payload', wp_json_encode( $payload ) );
		return (int) $template_id;
	}

	/**
	 * Get template payload.
	 *
	 * @param int $template_id Template ID.
	 * @return array<string,mixed>
	 */
	public static function get_payload( $template_id ) {
		$post = get_post( $template_id );
		if ( ! $post || 'bs3d_template' !== $post->post_type ) {
			return array();
		}

		$payload_json = get_post_meta( $template_id, '_bs3d_template_payload', true );
		$payload      = json_decode( (string) $payload_json, true );
		if ( ! is_array( $payload ) ) {
			return array();
		}
		return $payload;
	}

	/**
	 * Get template options for select controls.
	 *
	 * @return array<string,string>
	 */
	public static function get_template_options() {
		$options = array(
			'' => __( 'Select template...', 'beastside-3d-hero-banner' ),
		);

		$templates = get_posts(
			array(
				'post_type'      => 'bs3d_template',
				'post_status'    => 'publish',
				'posts_per_page' => 200,
				'orderby'        => 'title',
				'order'          => 'ASC',
			)
		);

		foreach ( $templates as $template ) {
			$options[ (string) $template->ID ] = $template->post_title . ' (#' . $template->ID . ')';
		}

		return $options;
	}
}
