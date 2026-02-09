<?php
/**
 * Optional Elementor widget integration.
 *
 * @package Beastside3DHeroBanner
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Elementor widget class.
 */
class BS3D_Elementor_Widget extends \Elementor\Widget_Base {
	/**
	 * Widget slug.
	 */
	public function get_name() {
		return 'beastside_3d_hero_banner';
	}

	/**
	 * Widget title.
	 */
	public function get_title() {
		return __( 'Beastside 3D Hero Banner', 'beastside-3d-hero-banner' );
	}

	/**
	 * Widget icon.
	 */
	public function get_icon() {
		return 'eicon-slider-push';
	}

	/**
	 * Widget categories.
	 *
	 * @return array<int,string>
	 */
	public function get_categories() {
		return array( 'general' );
	}

	/**
	 * Register controls.
	 */
	protected function register_controls() {
		$this->start_controls_section(
			'content_section',
			array(
				'label' => __( 'Banner', 'beastside-3d-hero-banner' ),
				'tab'   => \Elementor\Controls_Manager::TAB_CONTENT,
			)
		);

		$this->add_control(
			'banner_id',
			array(
				'label'   => __( 'Select Banner', 'beastside-3d-hero-banner' ),
				'type'    => \Elementor\Controls_Manager::SELECT,
				'options' => self::get_banner_options(),
				'default' => '',
			)
		);

		$this->add_control(
			'quality_profile',
			array(
				'label'   => __( 'Quality Override', 'beastside-3d-hero-banner' ),
				'type'    => \Elementor\Controls_Manager::SELECT,
				'options' => array(
					''            => __( 'Use Banner Default', 'beastside-3d-hero-banner' ),
					'balanced'    => __( 'Balanced', 'beastside-3d-hero-banner' ),
					'visual'      => __( 'Visual First', 'beastside-3d-hero-banner' ),
					'performance' => __( 'Performance First', 'beastside-3d-hero-banner' ),
				),
				'default' => '',
			)
		);

		$this->end_controls_section();
	}

	/**
	 * Render widget output.
	 */
	protected function render() {
		$settings  = $this->get_settings_for_display();
		$banner_id = isset( $settings['banner_id'] ) ? absint( $settings['banner_id'] ) : 0;

		if ( ! $banner_id ) {
			echo esc_html__( 'Select a banner in widget settings.', 'beastside-3d-hero-banner' );
			return;
		}

		echo BS3D_Renderer::render_banner(
			$banner_id,
			'elementor',
			'',
			true,
			isset( $settings['quality_profile'] ) ? (string) $settings['quality_profile'] : ''
		); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	}

	/**
	 * Get banner choices for dropdown.
	 *
	 * @return array<string,string>
	 */
	private static function get_banner_options() {
		$options = array(
			'' => __( 'Select...', 'beastside-3d-hero-banner' ),
		);

		$posts = get_posts(
			array(
				'post_type'      => 'bs3d_banner',
				'post_status'    => 'publish',
				'posts_per_page' => 200,
				'orderby'        => 'title',
				'order'          => 'ASC',
			)
		);

		foreach ( $posts as $post ) {
			$options[ (string) $post->ID ] = $post->post_title . ' (#' . $post->ID . ')';
		}

		return $options;
	}
}
