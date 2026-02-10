<?php
/**
 * Banner post type and editor fields.
 *
 * @package Beastside3DHeroBanner
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class BS3D_Banner_Post_Type {
	/**
	 * Register hooks.
	 */
	public static function init() {
		add_action( 'init', array( __CLASS__, 'register_post_type' ) );
		add_action( 'add_meta_boxes', array( __CLASS__, 'register_meta_boxes' ) );
		add_action( 'save_post_bs3d_banner', array( __CLASS__, 'save_meta' ) );
	}

	/**
	 * Register banner post type.
	 */
	public static function register_post_type() {
		$labels = array(
			'name'          => __( '3D Banners', 'beastside-3d-hero-banner' ),
			'singular_name' => __( '3D Banner', 'beastside-3d-hero-banner' ),
			'menu_name'     => __( '3D Banners', 'beastside-3d-hero-banner' ),
		);

		register_post_type(
			'bs3d_banner',
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
	 * Register banner meta box fields.
	 */
	public static function register_meta_boxes() {
		add_meta_box(
			'bs3d_banner_config',
			__( 'Banner Composer', 'beastside-3d-hero-banner' ),
			array( __CLASS__, 'render_config_meta_box' ),
			'bs3d_banner',
			'normal',
			'high'
		);
	}

	/**
	 * Default scene config schema.
	 *
	 * @return array<string,mixed>
	 */
	public static function default_scene_config() {
		return array(
			'sceneSchemaVersion' => 2,
			'models'             => array(),
			'background'         => array(
				'mode'         => 'static',
				'color'        => '#111827',
				'imageUrl'     => '',
				'dioramaDepth' => 8,
			),
			'camera'             => array(
				'lensMm'   => 35,
				'position' => array( 'x' => 0, 'y' => 0, 'z' => 5 ),
			),
			'lighting'           => array(
				'ambientEnabled'      => true,
				'ambientIntensity'     => 0.8,
				'directionalIntensity' => 1.15,
				'directionalPosition'  => array( 'x' => 5, 'y' => 10, 'z' => 7 ),
				'shadows'              => true,
				'pointLights'          => self::default_point_lights(),
			),
			'interactions'       => array(
				'tilt'          => true,
				'rotate'        => true,
				'parallax'      => true,
				'tiltIntensity' => 0.2,
				'scrollCamera'  => true,
				'scrollIntensity' => 0.35,
			),
			'fallback'          => array(
				'timeoutMs' => 12000,
			),
		);
	}

	/**
	 * Sanitize and normalize scene config.
	 *
	 * @param mixed $scene Raw scene config.
	 * @return array<string,mixed>
	 */
	public static function sanitize_scene_config( $scene ) {
		$defaults = self::default_scene_config();
		$scene    = is_array( $scene ) ? $scene : array();

		$output                     = $defaults;
		$output['sceneSchemaVersion'] = 2;

		$models = array();
		if ( ! empty( $scene['models'] ) && is_array( $scene['models'] ) ) {
			foreach ( $scene['models'] as $model ) {
				if ( count( $models ) >= 3 ) {
					break;
				}
				if ( ! is_array( $model ) ) {
					continue;
				}

				$url = ! empty( $model['url'] ) ? esc_url_raw( (string) $model['url'] ) : '';
				if ( '' === $url ) {
					continue;
				}

				$models[] = array(
					'url'          => $url,
					'position'     => array(
						'x' => self::to_float( $model['position']['x'] ?? 0, -1000, 1000, 0 ),
						'y' => self::to_float( $model['position']['y'] ?? 0, -1000, 1000, 0 ),
						'z' => self::to_float( $model['position']['z'] ?? 0, -1000, 1000, 0 ),
					),
					'rotation'     => array(
						'x' => self::to_float( $model['rotation']['x'] ?? 0, -360, 360, 0 ),
						'y' => self::to_float( $model['rotation']['y'] ?? 0, -360, 360, 0 ),
						'z' => self::to_float( $model['rotation']['z'] ?? 0, -360, 360, 0 ),
					),
					'scale'        => array(
						'x' => self::to_float( $model['scale']['x'] ?? 1, 0.01, 100, 1 ),
						'y' => self::to_float( $model['scale']['y'] ?? 1, 0.01, 100, 1 ),
						'z' => self::to_float( $model['scale']['z'] ?? 1, 0.01, 100, 1 ),
					),
					'visible'      => self::to_bool( $model['visible'] ?? true ),
					'castShadow'   => self::to_bool( $model['castShadow'] ?? true ),
					'receiveShadow'=> self::to_bool( $model['receiveShadow'] ?? true ),
				);
			}
		}
		$output['models'] = $models;

		$bg = isset( $scene['background'] ) && is_array( $scene['background'] ) ? $scene['background'] : array();
		$bg_mode = isset( $bg['mode'] ) ? sanitize_key( (string) $bg['mode'] ) : 'static';
		if ( ! in_array( $bg_mode, array( 'static', 'diorama' ), true ) ) {
			$bg_mode = 'static';
		}
		$output['background'] = array(
			'mode'         => $bg_mode,
			'color'        => self::to_hex_color( $bg['color'] ?? '#111827', '#111827' ),
			'imageUrl'     => ! empty( $bg['imageUrl'] ) ? esc_url_raw( (string) $bg['imageUrl'] ) : '',
			'dioramaDepth' => self::to_float( $bg['dioramaDepth'] ?? 8, 0, 100, 8 ),
		);

		$camera = isset( $scene['camera'] ) && is_array( $scene['camera'] ) ? $scene['camera'] : array();
		$legacy_fov = self::to_float( $camera['fov'] ?? 45, 20, 100, 45 );
		$lens_mm = isset( $camera['lensMm'] )
			? self::sanitize_lens_mm( $camera['lensMm'] )
			: self::lens_from_fov( $legacy_fov );
		$output['camera'] = array(
			'lensMm'   => $lens_mm,
			'position' => array(
				'x' => self::to_float( $camera['position']['x'] ?? 0, -1000, 1000, 0 ),
				'y' => self::to_float( $camera['position']['y'] ?? 0, -1000, 1000, 0 ),
				'z' => self::to_float( $camera['position']['z'] ?? 5, 0.1, 1000, 5 ),
			),
		);

		$lighting = isset( $scene['lighting'] ) && is_array( $scene['lighting'] ) ? $scene['lighting'] : array();
		$point_lights_input = isset( $lighting['pointLights'] ) && is_array( $lighting['pointLights'] ) ? $lighting['pointLights'] : array();
		$point_lights = self::default_point_lights();
		for ( $index = 0; $index < 3; $index++ ) {
			$point_lights[ $index ] = self::sanitize_point_light( $point_lights_input[ $index ] ?? $point_lights[ $index ], $point_lights[ $index ] );
		}
		$output['lighting'] = array(
			'ambientEnabled'      => self::to_bool( $lighting['ambientEnabled'] ?? true ),
			'ambientIntensity'     => self::to_float( $lighting['ambientIntensity'] ?? 0.8, 0, 5, 0.8 ),
			'directionalIntensity' => self::to_float( $lighting['directionalIntensity'] ?? 1.15, 0, 8, 1.15 ),
			'directionalPosition'  => array(
				'x' => self::to_float( $lighting['directionalPosition']['x'] ?? 5, -1000, 1000, 5 ),
				'y' => self::to_float( $lighting['directionalPosition']['y'] ?? 10, -1000, 1000, 10 ),
				'z' => self::to_float( $lighting['directionalPosition']['z'] ?? 7, -1000, 1000, 7 ),
			),
			'shadows'              => self::to_bool( $lighting['shadows'] ?? true ),
			'pointLights'          => $point_lights,
		);

		$interactions = isset( $scene['interactions'] ) && is_array( $scene['interactions'] ) ? $scene['interactions'] : array();
		$output['interactions'] = array(
			'tilt'            => self::to_bool( $interactions['tilt'] ?? true ),
			'rotate'          => self::to_bool( $interactions['rotate'] ?? true ),
			'parallax'        => self::to_bool( $interactions['parallax'] ?? true ),
			'tiltIntensity'   => self::to_float( $interactions['tiltIntensity'] ?? 0.2, 0, 5, 0.2 ),
			'scrollCamera'    => self::to_bool( $interactions['scrollCamera'] ?? true ),
			'scrollIntensity' => self::to_float( $interactions['scrollIntensity'] ?? 0.35, 0, 2, 0.35 ),
		);

		$fallback = isset( $scene['fallback'] ) && is_array( $scene['fallback'] ) ? $scene['fallback'] : array();
		$output['fallback'] = array(
			'timeoutMs' => (int) self::to_float( $fallback['timeoutMs'] ?? 12000, 3000, 60000, 12000 ),
		);

		return $output;
	}

	/**
	 * Render banner config box.
	 *
	 * @param WP_Post $post Current post.
	 */
	public static function render_config_meta_box( WP_Post $post ) {
		wp_nonce_field( 'bs3d_banner_save_meta', 'bs3d_banner_meta_nonce' );

		$scene_json      = get_post_meta( $post->ID, '_bs3d_scene_config', true );
		$scene_data      = json_decode( (string) $scene_json, true );
		$scene_data      = self::sanitize_scene_config( $scene_data );
		$debug_override  = (string) get_post_meta( $post->ID, '_bs3d_debug_override', true );
		$poster_url      = (string) get_post_meta( $post->ID, '_bs3d_poster_url', true );
		$quality         = (string) get_post_meta( $post->ID, '_bs3d_quality_profile', true );
		$mobile_mode     = (string) get_post_meta( $post->ID, '_bs3d_mobile_mode', true );
		$viewport_mode   = (string) get_post_meta( $post->ID, '_bs3d_viewport_mode', true );
		$template_options = BS3D_Template_Post_Type::get_template_options();
		$versions        = BS3D_Version_Manager::get_versions( $post->ID, 20 );

		if ( '' === $debug_override ) {
			$debug_override = 'inherit';
		}
		if ( '' === $quality ) {
			$quality = 'balanced';
		}
		if ( '' === $mobile_mode ) {
			$mobile_mode = 'adaptive';
		}
		if ( ! in_array( $viewport_mode, array( 'standard', 'fullscreen' ), true ) ) {
			$viewport_mode = 'standard';
		}

		$preview_payload = BS3D_Renderer::build_payload(
			array(
				'id'            => (int) $post->ID,
				'slug'          => $post->post_name,
				'scene'         => $scene_data,
				'poster_url'    => $poster_url,
				'quality'       => $quality,
				'mobile_mode'   => $mobile_mode,
				'viewport_mode' => $viewport_mode,
			),
			'admin-preview',
			true,
			true,
			false,
			$quality
		);

		$duplicate_url = wp_nonce_url(
			admin_url( 'admin-post.php?action=bs3d_duplicate_banner&banner_id=' . $post->ID ),
			'bs3d_duplicate_banner_' . $post->ID
		);
		$lens_options = self::lens_options();
		$point_lights = isset( $scene_data['lighting']['pointLights'] ) && is_array( $scene_data['lighting']['pointLights'] )
			? $scene_data['lighting']['pointLights']
			: self::default_point_lights();
		?>
		<div id="bs3d-composer-root" class="bs3d-composer-root">
			<input type="hidden" id="bs3d_scene_config" name="bs3d_scene_config" value="<?php echo esc_attr( wp_json_encode( $scene_data ) ); ?>" />

			<div class="bs3d-composer-grid">
				<div class="bs3d-composer-row bs3d-composer-row-top">
					<div class="bs3d-composer-preview bs3d-composer-preview-main">
						<div class="bs3d-preview-toolbar">
							<div class="bs3d-toolbar-group">
								<label for="bs3d_admin_edit_mode"><?php esc_html_e( 'Edit Mode', 'beastside-3d-hero-banner' ); ?></label>
								<select id="bs3d_admin_edit_mode" name="bs3d_admin_edit_mode" data-bs3d-control="edit-mode">
									<option value="none"><?php esc_html_e( 'None', 'beastside-3d-hero-banner' ); ?></option>
									<option value="camera"><?php esc_html_e( 'Camera', 'beastside-3d-hero-banner' ); ?></option>
									<option value="pointLight1"><?php esc_html_e( 'Point Light 1', 'beastside-3d-hero-banner' ); ?></option>
									<option value="pointLight2"><?php esc_html_e( 'Point Light 2', 'beastside-3d-hero-banner' ); ?></option>
									<option value="pointLight3"><?php esc_html_e( 'Point Light 3', 'beastside-3d-hero-banner' ); ?></option>
								</select>
							</div>
							<div class="bs3d-toolbar-group">
								<span><?php esc_html_e( 'Drag Plane', 'beastside-3d-hero-banner' ); ?></span>
								<div class="bs3d-plane-switches">
									<label><input type="radio" name="bs3d_admin_drag_plane" value="xy" data-bs3d-control="drag-plane" checked /> XY</label>
									<label><input type="radio" name="bs3d_admin_drag_plane" value="xz" data-bs3d-control="drag-plane" /> XZ</label>
									<label><input type="radio" name="bs3d_admin_drag_plane" value="yz" data-bs3d-control="drag-plane" /> YZ</label>
								</div>
							</div>
						</div>
						<h3><?php esc_html_e( 'Live Preview', 'beastside-3d-hero-banner' ); ?></h3>
						<div class="bs3d-banner bs3d-admin-preview-banner" data-bs3d="<?php echo esc_attr( wp_json_encode( $preview_payload ) ); ?>">
							<div class="bs3d-stage" aria-hidden="true"></div>
							<?php if ( ! empty( $poster_url ) ) : ?>
								<img class="bs3d-poster" src="<?php echo esc_url( $poster_url ); ?>" alt="" loading="lazy" />
							<?php endif; ?>
						</div>
						<p class="description"><?php esc_html_e( 'Drag helpers in Edit Mode to place camera/lights. Preview updates from draft changes in real-time. Data is persisted only when you click Update/Publish.', 'beastside-3d-hero-banner' ); ?></p>
					</div>
					<div class="bs3d-composer-side-panel">
						<div class="bs3d-section-card">
							<h3><?php esc_html_e( 'Camera', 'beastside-3d-hero-banner' ); ?></h3>
							<div class="bs3d-three-col">
								<div>
									<label for="bs3d_camera_lens_mm"><?php esc_html_e( 'Lens', 'beastside-3d-hero-banner' ); ?></label>
									<select id="bs3d_camera_lens_mm" name="bs3d_camera_lens_mm">
										<?php foreach ( $lens_options as $lens_mm ) : ?>
											<option value="<?php echo esc_attr( (string) $lens_mm ); ?>" <?php selected( (int) $lens_mm, (int) $scene_data['camera']['lensMm'] ); ?>><?php echo esc_html( (string) $lens_mm . 'mm' ); ?></option>
										<?php endforeach; ?>
									</select>
								</div>
								<div><label><?php esc_html_e( 'Camera X', 'beastside-3d-hero-banner' ); ?></label><input type="number" step="0.1" name="bs3d_camera_x" value="<?php echo esc_attr( (string) $scene_data['camera']['position']['x'] ); ?>" /></div>
								<div><label><?php esc_html_e( 'Camera Y', 'beastside-3d-hero-banner' ); ?></label><input type="number" step="0.1" name="bs3d_camera_y" value="<?php echo esc_attr( (string) $scene_data['camera']['position']['y'] ); ?>" /></div>
							</div>
							<p><label><?php esc_html_e( 'Camera Z', 'beastside-3d-hero-banner' ); ?></label> <input type="number" step="0.1" min="0.1" name="bs3d_camera_z" value="<?php echo esc_attr( (string) $scene_data['camera']['position']['z'] ); ?>" /></p>
						</div>
						<div class="bs3d-section-card">
							<h3><?php esc_html_e( 'Lighting', 'beastside-3d-hero-banner' ); ?></h3>
							<div class="bs3d-three-col">
								<div><label><input type="checkbox" name="bs3d_ambient_enabled" value="1" <?php checked( ! empty( $scene_data['lighting']['ambientEnabled'] ) ); ?> /> <?php esc_html_e( 'Ambient Enabled', 'beastside-3d-hero-banner' ); ?></label></div>
								<div><label><?php esc_html_e( 'Ambient Intensity', 'beastside-3d-hero-banner' ); ?></label><input type="number" step="0.01" min="0" max="5" name="bs3d_ambient_intensity" value="<?php echo esc_attr( (string) $scene_data['lighting']['ambientIntensity'] ); ?>" /></div>
								<div><label><?php esc_html_e( 'Directional Intensity', 'beastside-3d-hero-banner' ); ?></label><input type="number" step="0.01" min="0" max="8" name="bs3d_directional_intensity" value="<?php echo esc_attr( (string) $scene_data['lighting']['directionalIntensity'] ); ?>" /></div>
							</div>
							<div class="bs3d-three-col">
								<div><label><?php esc_html_e( 'Dir X', 'beastside-3d-hero-banner' ); ?></label><input type="number" step="0.1" name="bs3d_light_x" value="<?php echo esc_attr( (string) $scene_data['lighting']['directionalPosition']['x'] ); ?>" /></div>
								<div><label><?php esc_html_e( 'Dir Y', 'beastside-3d-hero-banner' ); ?></label><input type="number" step="0.1" name="bs3d_light_y" value="<?php echo esc_attr( (string) $scene_data['lighting']['directionalPosition']['y'] ); ?>" /></div>
								<div><label><?php esc_html_e( 'Dir Z', 'beastside-3d-hero-banner' ); ?></label><input type="number" step="0.1" name="bs3d_light_z" value="<?php echo esc_attr( (string) $scene_data['lighting']['directionalPosition']['z'] ); ?>" /></div>
							</div>
							<div class="bs3d-checkbox-row">
								<label><input type="checkbox" name="bs3d_light_shadows" value="1" <?php checked( ! empty( $scene_data['lighting']['shadows'] ) ); ?> /> <?php esc_html_e( 'Enable Shadows', 'beastside-3d-hero-banner' ); ?></label>
							</div>
						</div>
						<div class="bs3d-section-card">
							<h3><?php esc_html_e( 'Point Lights (Up to 3)', 'beastside-3d-hero-banner' ); ?></h3>
							<?php for ( $light_index = 0; $light_index < 3; $light_index++ ) : ?>
								<?php $point_light = isset( $point_lights[ $light_index ] ) && is_array( $point_lights[ $light_index ] ) ? $point_lights[ $light_index ] : self::default_point_lights()[ $light_index ]; ?>
								<div class="bs3d-point-light-card">
									<h4><?php echo esc_html( sprintf( __( 'Point Light %d', 'beastside-3d-hero-banner' ), $light_index + 1 ) ); ?></h4>
									<div class="bs3d-three-col">
										<div><label><input type="checkbox" name="bs3d_point_lights[<?php echo esc_attr( (string) $light_index ); ?>][enabled]" value="1" <?php checked( ! empty( $point_light['enabled'] ) ); ?> /> <?php esc_html_e( 'Enabled', 'beastside-3d-hero-banner' ); ?></label></div>
										<div><label><?php esc_html_e( 'Color', 'beastside-3d-hero-banner' ); ?></label><input type="color" name="bs3d_point_lights[<?php echo esc_attr( (string) $light_index ); ?>][color]" value="<?php echo esc_attr( (string) ( $point_light['color'] ?? '#ffd2ad' ) ); ?>" /></div>
										<div><label><?php esc_html_e( 'Intensity', 'beastside-3d-hero-banner' ); ?></label><input type="number" step="0.01" min="0" max="20" name="bs3d_point_lights[<?php echo esc_attr( (string) $light_index ); ?>][intensity]" value="<?php echo esc_attr( (string) ( $point_light['intensity'] ?? 2.5 ) ); ?>" /></div>
									</div>
									<div class="bs3d-three-col">
										<div><label><?php esc_html_e( 'Distance', 'beastside-3d-hero-banner' ); ?></label><input type="number" step="0.1" min="0" max="200" name="bs3d_point_lights[<?php echo esc_attr( (string) $light_index ); ?>][distance]" value="<?php echo esc_attr( (string) ( $point_light['distance'] ?? 20 ) ); ?>" /></div>
										<div><label><?php esc_html_e( 'Decay', 'beastside-3d-hero-banner' ); ?></label><input type="number" step="0.1" min="0" max="4" name="bs3d_point_lights[<?php echo esc_attr( (string) $light_index ); ?>][decay]" value="<?php echo esc_attr( (string) ( $point_light['decay'] ?? 2 ) ); ?>" /></div>
										<div></div>
									</div>
									<div class="bs3d-three-col">
										<div><label>X</label><input type="number" step="0.01" name="bs3d_point_lights[<?php echo esc_attr( (string) $light_index ); ?>][position][x]" value="<?php echo esc_attr( (string) ( $point_light['position']['x'] ?? 0 ) ); ?>" /></div>
										<div><label>Y</label><input type="number" step="0.01" name="bs3d_point_lights[<?php echo esc_attr( (string) $light_index ); ?>][position][y]" value="<?php echo esc_attr( (string) ( $point_light['position']['y'] ?? 3 ) ); ?>" /></div>
										<div><label>Z</label><input type="number" step="0.01" name="bs3d_point_lights[<?php echo esc_attr( (string) $light_index ); ?>][position][z]" value="<?php echo esc_attr( (string) ( $point_light['position']['z'] ?? 3 ) ); ?>" /></div>
									</div>
								</div>
							<?php endfor; ?>
						</div>
					</div>
				</div>
				<div class="bs3d-composer-row bs3d-composer-row-models">
					<h3><?php esc_html_e( 'Models (Up to 3)', 'beastside-3d-hero-banner' ); ?></h3>
					<div class="bs3d-model-grid">
					<?php for ( $i = 0; $i < 3; $i++ ) : ?>
						<?php $model = isset( $scene_data['models'][ $i ] ) && is_array( $scene_data['models'][ $i ] ) ? $scene_data['models'][ $i ] : array(); ?>
						<div class="bs3d-model-card" data-model-index="<?php echo esc_attr( (string) $i ); ?>">
							<h4><?php echo esc_html( sprintf( __( 'Model %d', 'beastside-3d-hero-banner' ), $i + 1 ) ); ?></h4>
							<p>
								<label><?php esc_html_e( 'Model URL', 'beastside-3d-hero-banner' ); ?></label>
								<span class="bs3d-url-row">
									<input type="url" class="widefat" name="bs3d_models[<?php echo esc_attr( (string) $i ); ?>][url]" value="<?php echo esc_attr( $model['url'] ?? '' ); ?>" placeholder="https://example.com/model.glb" />
									<button
										type="button"
										class="button bs3d-media-button"
										data-target="<?php echo esc_attr( 'bs3d_models[' . (string) $i . '][url]' ); ?>"
										data-title="<?php esc_attr_e( 'Select Model File', 'beastside-3d-hero-banner' ); ?>"
										data-button="<?php esc_attr_e( 'Use Model', 'beastside-3d-hero-banner' ); ?>"
									><?php esc_html_e( 'Media', 'beastside-3d-hero-banner' ); ?></button>
								</span>
							</p>
							<div class="bs3d-three-col">
								<div><label>X</label><input type="number" step="0.01" name="bs3d_models[<?php echo esc_attr( (string) $i ); ?>][position][x]" value="<?php echo esc_attr( (string) ( $model['position']['x'] ?? 0 ) ); ?>" /></div>
								<div><label>Y</label><input type="number" step="0.01" name="bs3d_models[<?php echo esc_attr( (string) $i ); ?>][position][y]" value="<?php echo esc_attr( (string) ( $model['position']['y'] ?? 0 ) ); ?>" /></div>
								<div><label>Z</label><input type="number" step="0.01" name="bs3d_models[<?php echo esc_attr( (string) $i ); ?>][position][z]" value="<?php echo esc_attr( (string) ( $model['position']['z'] ?? 0 ) ); ?>" /></div>
							</div>
							<div class="bs3d-three-col">
								<div><label><?php esc_html_e( 'Rot X', 'beastside-3d-hero-banner' ); ?></label><input type="number" step="0.1" name="bs3d_models[<?php echo esc_attr( (string) $i ); ?>][rotation][x]" value="<?php echo esc_attr( (string) ( $model['rotation']['x'] ?? 0 ) ); ?>" /></div>
								<div><label><?php esc_html_e( 'Rot Y', 'beastside-3d-hero-banner' ); ?></label><input type="number" step="0.1" name="bs3d_models[<?php echo esc_attr( (string) $i ); ?>][rotation][y]" value="<?php echo esc_attr( (string) ( $model['rotation']['y'] ?? 0 ) ); ?>" /></div>
								<div><label><?php esc_html_e( 'Rot Z', 'beastside-3d-hero-banner' ); ?></label><input type="number" step="0.1" name="bs3d_models[<?php echo esc_attr( (string) $i ); ?>][rotation][z]" value="<?php echo esc_attr( (string) ( $model['rotation']['z'] ?? 0 ) ); ?>" /></div>
							</div>
							<div class="bs3d-three-col">
								<div><label><?php esc_html_e( 'Scale X', 'beastside-3d-hero-banner' ); ?></label><input type="number" step="0.01" min="0.01" name="bs3d_models[<?php echo esc_attr( (string) $i ); ?>][scale][x]" value="<?php echo esc_attr( (string) ( $model['scale']['x'] ?? 1 ) ); ?>" /></div>
								<div><label><?php esc_html_e( 'Scale Y', 'beastside-3d-hero-banner' ); ?></label><input type="number" step="0.01" min="0.01" name="bs3d_models[<?php echo esc_attr( (string) $i ); ?>][scale][y]" value="<?php echo esc_attr( (string) ( $model['scale']['y'] ?? 1 ) ); ?>" /></div>
								<div><label><?php esc_html_e( 'Scale Z', 'beastside-3d-hero-banner' ); ?></label><input type="number" step="0.01" min="0.01" name="bs3d_models[<?php echo esc_attr( (string) $i ); ?>][scale][z]" value="<?php echo esc_attr( (string) ( $model['scale']['z'] ?? 1 ) ); ?>" /></div>
							</div>
							<div class="bs3d-checkbox-row">
								<label><input type="checkbox" name="bs3d_models[<?php echo esc_attr( (string) $i ); ?>][visible]" value="1" <?php checked( ! empty( $model['visible'] ) ); ?> /> <?php esc_html_e( 'Visible', 'beastside-3d-hero-banner' ); ?></label>
								<label><input type="checkbox" name="bs3d_models[<?php echo esc_attr( (string) $i ); ?>][castShadow]" value="1" <?php checked( ! empty( $model['castShadow'] ) ); ?> /> <?php esc_html_e( 'Cast Shadow', 'beastside-3d-hero-banner' ); ?></label>
								<label><input type="checkbox" name="bs3d_models[<?php echo esc_attr( (string) $i ); ?>][receiveShadow]" value="1" <?php checked( ! empty( $model['receiveShadow'] ) ); ?> /> <?php esc_html_e( 'Receive Shadow', 'beastside-3d-hero-banner' ); ?></label>
							</div>
						</div>
					<?php endfor; ?>
					</div>
				</div>

				<div class="bs3d-composer-row bs3d-composer-row-settings">
					<div class="bs3d-settings-col bs3d-section-card">
						<h3><?php esc_html_e( 'Background', 'beastside-3d-hero-banner' ); ?></h3>
					<p>
						<label><?php esc_html_e( 'Mode', 'beastside-3d-hero-banner' ); ?></label>
						<select name="bs3d_background_mode" id="bs3d_background_mode">
							<option value="static" <?php selected( 'static', $scene_data['background']['mode'] ); ?>><?php esc_html_e( 'Static', 'beastside-3d-hero-banner' ); ?></option>
							<option value="diorama" <?php selected( 'diorama', $scene_data['background']['mode'] ); ?>><?php esc_html_e( '5-Plane Diorama', 'beastside-3d-hero-banner' ); ?></option>
						</select>
					</p>
					<div class="bs3d-three-col">
						<div>
							<label><?php esc_html_e( 'Background Color', 'beastside-3d-hero-banner' ); ?></label>
							<input type="color" name="bs3d_background_color" value="<?php echo esc_attr( $scene_data['background']['color'] ); ?>" />
						</div>
						<div>
							<label><?php esc_html_e( 'Background Image URL', 'beastside-3d-hero-banner' ); ?></label>
							<span class="bs3d-url-row">
								<input type="url" class="widefat" name="bs3d_background_image" value="<?php echo esc_attr( $scene_data['background']['imageUrl'] ); ?>" />
								<button
									type="button"
									class="button bs3d-media-button"
									data-target="bs3d_background_image"
									data-library="image"
									data-title="<?php esc_attr_e( 'Select Background Image', 'beastside-3d-hero-banner' ); ?>"
									data-button="<?php esc_attr_e( 'Use Background', 'beastside-3d-hero-banner' ); ?>"
								><?php esc_html_e( 'Media', 'beastside-3d-hero-banner' ); ?></button>
							</span>
						</div>
						<div class="bs3d-diorama-only">
							<label><?php esc_html_e( 'Diorama Depth', 'beastside-3d-hero-banner' ); ?></label>
							<input type="number" step="0.1" min="0" name="bs3d_diorama_depth" value="<?php echo esc_attr( (string) $scene_data['background']['dioramaDepth'] ); ?>" />
						</div>
					</div>

					<h4><?php esc_html_e( 'Interaction', 'beastside-3d-hero-banner' ); ?></h4>
					<div class="bs3d-checkbox-row">
						<label><input type="checkbox" name="bs3d_interaction_tilt" value="1" <?php checked( ! empty( $scene_data['interactions']['tilt'] ) ); ?> /> <?php esc_html_e( 'Tilt', 'beastside-3d-hero-banner' ); ?></label>
						<label><input type="checkbox" name="bs3d_interaction_rotate" value="1" <?php checked( ! empty( $scene_data['interactions']['rotate'] ) ); ?> /> <?php esc_html_e( 'Rotate', 'beastside-3d-hero-banner' ); ?></label>
						<label><input type="checkbox" name="bs3d_interaction_parallax" value="1" <?php checked( ! empty( $scene_data['interactions']['parallax'] ) ); ?> /> <?php esc_html_e( 'Parallax', 'beastside-3d-hero-banner' ); ?></label>
						<label><input type="checkbox" name="bs3d_interaction_scroll_camera" value="1" <?php checked( ! empty( $scene_data['interactions']['scrollCamera'] ) ); ?> /> <?php esc_html_e( 'Scroll Moves Camera', 'beastside-3d-hero-banner' ); ?></label>
					</div>
					<div class="bs3d-slider-row">
						<label><?php esc_html_e( 'Tilt Intensity', 'beastside-3d-hero-banner' ); ?></label>
						<input type="range" min="0" max="5" step="0.01" data-bs3d-sync="tilt-intensity" value="<?php echo esc_attr( (string) $scene_data['interactions']['tiltIntensity'] ); ?>" />
						<input type="number" step="0.01" min="0" max="5" name="bs3d_tilt_intensity" data-bs3d-sync="tilt-intensity" value="<?php echo esc_attr( (string) $scene_data['interactions']['tiltIntensity'] ); ?>" />
					</div>
					<div class="bs3d-slider-row">
						<label><?php esc_html_e( 'Scroll Intensity', 'beastside-3d-hero-banner' ); ?></label>
						<input type="range" min="0" max="2" step="0.01" data-bs3d-sync="scroll-intensity" value="<?php echo esc_attr( (string) $scene_data['interactions']['scrollIntensity'] ); ?>" />
						<input type="number" step="0.01" min="0" max="2" name="bs3d_scroll_intensity" data-bs3d-sync="scroll-intensity" value="<?php echo esc_attr( (string) $scene_data['interactions']['scrollIntensity'] ); ?>" />
					</div>

					</div>

					<div class="bs3d-settings-col bs3d-section-card">
						<h3><?php esc_html_e( 'Banner Settings', 'beastside-3d-hero-banner' ); ?></h3>
					<p>
						<label for="bs3d_poster_url"><strong><?php esc_html_e( 'Poster Fallback URL', 'beastside-3d-hero-banner' ); ?></strong></label><br />
						<span class="bs3d-url-row">
							<input type="url" id="bs3d_poster_url" name="bs3d_poster_url" value="<?php echo esc_attr( $poster_url ); ?>" class="widefat" placeholder="https://example.com/poster.jpg" />
							<button
								type="button"
								class="button bs3d-media-button"
								data-target="bs3d_poster_url"
								data-library="image"
								data-title="<?php esc_attr_e( 'Select Poster Image', 'beastside-3d-hero-banner' ); ?>"
								data-button="<?php esc_attr_e( 'Use Poster', 'beastside-3d-hero-banner' ); ?>"
							><?php esc_html_e( 'Media', 'beastside-3d-hero-banner' ); ?></button>
						</span>
					</p>
					<p>
						<label for="bs3d_fallback_timeout_ms"><strong><?php esc_html_e( 'Fallback Timeout (ms)', 'beastside-3d-hero-banner' ); ?></strong></label><br />
						<input type="number" id="bs3d_fallback_timeout_ms" name="bs3d_fallback_timeout_ms" min="3000" max="60000" step="250" value="<?php echo esc_attr( (string) $scene_data['fallback']['timeoutMs'] ); ?>" />
					</p>
					<p>
						<label for="bs3d_debug_override"><strong><?php esc_html_e( 'Debug Override', 'beastside-3d-hero-banner' ); ?></strong></label><br />
						<select id="bs3d_debug_override" name="bs3d_debug_override">
							<option value="inherit" <?php selected( 'inherit', $debug_override ); ?>><?php esc_html_e( 'Inherit Global', 'beastside-3d-hero-banner' ); ?></option>
							<option value="on" <?php selected( 'on', $debug_override ); ?>><?php esc_html_e( 'Force On', 'beastside-3d-hero-banner' ); ?></option>
							<option value="off" <?php selected( 'off', $debug_override ); ?>><?php esc_html_e( 'Force Off', 'beastside-3d-hero-banner' ); ?></option>
						</select>
					</p>
					<p>
						<label for="bs3d_quality_profile"><strong><?php esc_html_e( 'Quality Profile', 'beastside-3d-hero-banner' ); ?></strong></label><br />
						<select id="bs3d_quality_profile" name="bs3d_quality_profile">
							<option value="balanced" <?php selected( 'balanced', $quality ); ?>><?php esc_html_e( 'Balanced', 'beastside-3d-hero-banner' ); ?></option>
							<option value="visual" <?php selected( 'visual', $quality ); ?>><?php esc_html_e( 'Visual First', 'beastside-3d-hero-banner' ); ?></option>
							<option value="performance" <?php selected( 'performance', $quality ); ?>><?php esc_html_e( 'Performance First', 'beastside-3d-hero-banner' ); ?></option>
						</select>
					</p>
					<p>
						<label for="bs3d_mobile_mode"><strong><?php esc_html_e( 'Mobile Interaction Mode', 'beastside-3d-hero-banner' ); ?></strong></label><br />
						<select id="bs3d_mobile_mode" name="bs3d_mobile_mode">
							<option value="adaptive" <?php selected( 'adaptive', $mobile_mode ); ?>><?php esc_html_e( 'Adaptive', 'beastside-3d-hero-banner' ); ?></option>
							<option value="full" <?php selected( 'full', $mobile_mode ); ?>><?php esc_html_e( 'Full', 'beastside-3d-hero-banner' ); ?></option>
							<option value="reduced" <?php selected( 'reduced', $mobile_mode ); ?>><?php esc_html_e( 'Reduced', 'beastside-3d-hero-banner' ); ?></option>
							<option value="off" <?php selected( 'off', $mobile_mode ); ?>><?php esc_html_e( 'Off', 'beastside-3d-hero-banner' ); ?></option>
						</select>
					</p>
					<p>
						<label for="bs3d_viewport_mode"><strong><?php esc_html_e( 'Viewport Height', 'beastside-3d-hero-banner' ); ?></strong></label><br />
						<select id="bs3d_viewport_mode" name="bs3d_viewport_mode">
							<option value="standard" <?php selected( 'standard', $viewport_mode ); ?>><?php esc_html_e( 'Standard', 'beastside-3d-hero-banner' ); ?></option>
							<option value="fullscreen" <?php selected( 'fullscreen', $viewport_mode ); ?>><?php esc_html_e( 'Fullscreen (100vh)', 'beastside-3d-hero-banner' ); ?></option>
						</select>
					</p>

					</div>

					<div class="bs3d-settings-col bs3d-section-card">
						<h3><?php esc_html_e( 'Reuse Workflows', 'beastside-3d-hero-banner' ); ?></h3>
					<p>
						<label><?php esc_html_e( 'Template Name', 'beastside-3d-hero-banner' ); ?></label>
						<input type="text" name="bs3d_template_name" class="regular-text" placeholder="<?php esc_attr_e( 'Hero Template A', 'beastside-3d-hero-banner' ); ?>" />
						<button type="submit" class="button" name="bs3d_action_save_template" value="1"><?php esc_html_e( 'Save Current As Template', 'beastside-3d-hero-banner' ); ?></button>
					</p>
					<p>
						<select name="bs3d_apply_template_id">
							<?php foreach ( $template_options as $template_id => $label ) : ?>
								<option value="<?php echo esc_attr( (string) $template_id ); ?>"><?php echo esc_html( $label ); ?></option>
							<?php endforeach; ?>
						</select>
						<button type="submit" class="button" name="bs3d_action_apply_template" value="1"><?php esc_html_e( 'Apply Template', 'beastside-3d-hero-banner' ); ?></button>
					</p>
					<p>
						<select name="bs3d_restore_version_id">
							<option value=""><?php esc_html_e( 'Select version...', 'beastside-3d-hero-banner' ); ?></option>
							<?php foreach ( $versions as $version ) : ?>
								<option value="<?php echo esc_attr( (string) $version->ID ); ?>">
									<?php echo esc_html( $version->post_title . ' (#' . $version->ID . ')' ); ?>
								</option>
							<?php endforeach; ?>
						</select>
						<button type="submit" class="button" name="bs3d_action_restore_version" value="1"><?php esc_html_e( 'Restore Version', 'beastside-3d-hero-banner' ); ?></button>
					</p>
					<p>
						<a href="<?php echo esc_url( $duplicate_url ); ?>" class="button"><?php esc_html_e( 'Duplicate Banner', 'beastside-3d-hero-banner' ); ?></a>
					</p>
				</div>

				</div>
			</div>
		</div>
		<?php
	}

	/**
	 * Save banner metadata.
	 *
	 * @param int $post_id Post ID.
	 */
	public static function save_meta( $post_id ) {
		if ( ! isset( $_POST['bs3d_banner_meta_nonce'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['bs3d_banner_meta_nonce'] ) ), 'bs3d_banner_save_meta' ) ) {
			return;
		}

		if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
			return;
		}

		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}

		if ( isset( $_POST['bs3d_action_restore_version'] ) && ! empty( $_POST['bs3d_restore_version_id'] ) ) {
			BS3D_Version_Manager::restore_version( $post_id, absint( $_POST['bs3d_restore_version_id'] ) );
			BS3D_Diagnostics::log(
				array(
					'level'      => 'info',
					'surface'    => 'admin-preview',
					'code'       => 'restore_version',
					'message'    => 'Banner version restored',
					'banner_id'  => $post_id,
				),
				true
			);
			return;
		}

		$template_payload = array();
		if ( isset( $_POST['bs3d_action_apply_template'] ) && ! empty( $_POST['bs3d_apply_template_id'] ) ) {
			$template_payload = BS3D_Template_Post_Type::get_payload( absint( $_POST['bs3d_apply_template_id'] ) );
		}

		$scene_config = array();
		if ( ! empty( $template_payload['scene'] ) && is_array( $template_payload['scene'] ) ) {
			$scene_config = $template_payload['scene'];
		} else {
			$scene_config = self::scene_from_post_request();
		}
		$scene_config = self::sanitize_scene_config( $scene_config );
		update_post_meta( $post_id, '_bs3d_scene_config', wp_json_encode( $scene_config ) );

		$override = isset( $_POST['bs3d_debug_override'] ) ? sanitize_key( wp_unslash( $_POST['bs3d_debug_override'] ) ) : 'inherit';
		if ( ! in_array( $override, array( 'inherit', 'on', 'off' ), true ) ) {
			$override = 'inherit';
		}
		if ( ! empty( $template_payload['debug_override'] ) && is_string( $template_payload['debug_override'] ) && isset( $_POST['bs3d_action_apply_template'] ) ) {
			$override = sanitize_key( $template_payload['debug_override'] );
		}
		update_post_meta( $post_id, '_bs3d_debug_override', $override );

		$poster = isset( $_POST['bs3d_poster_url'] ) ? esc_url_raw( wp_unslash( $_POST['bs3d_poster_url'] ) ) : '';
		if ( isset( $_POST['bs3d_action_apply_template'] ) && isset( $template_payload['poster_url'] ) ) {
			$poster = esc_url_raw( (string) $template_payload['poster_url'] );
		}
		update_post_meta( $post_id, '_bs3d_poster_url', $poster );

		$quality = isset( $_POST['bs3d_quality_profile'] ) ? sanitize_key( wp_unslash( $_POST['bs3d_quality_profile'] ) ) : 'balanced';
		if ( isset( $_POST['bs3d_action_apply_template'] ) && isset( $template_payload['quality'] ) ) {
			$quality = sanitize_key( (string) $template_payload['quality'] );
		}
		if ( ! in_array( $quality, array( 'balanced', 'visual', 'performance' ), true ) ) {
			$quality = 'balanced';
		}
		update_post_meta( $post_id, '_bs3d_quality_profile', $quality );

		$mobile_mode = isset( $_POST['bs3d_mobile_mode'] ) ? sanitize_key( wp_unslash( $_POST['bs3d_mobile_mode'] ) ) : 'adaptive';
		if ( isset( $_POST['bs3d_action_apply_template'] ) && isset( $template_payload['mobile_mode'] ) ) {
			$mobile_mode = sanitize_key( (string) $template_payload['mobile_mode'] );
		}
		if ( ! in_array( $mobile_mode, array( 'adaptive', 'full', 'reduced', 'off' ), true ) ) {
			$mobile_mode = 'adaptive';
		}
		update_post_meta( $post_id, '_bs3d_mobile_mode', $mobile_mode );

		$viewport_mode = isset( $_POST['bs3d_viewport_mode'] ) ? sanitize_key( wp_unslash( $_POST['bs3d_viewport_mode'] ) ) : 'standard';
		if ( isset( $_POST['bs3d_action_apply_template'] ) && isset( $template_payload['viewport_mode'] ) ) {
			$viewport_mode = sanitize_key( (string) $template_payload['viewport_mode'] );
		}
		if ( ! in_array( $viewport_mode, array( 'standard', 'fullscreen' ), true ) ) {
			$viewport_mode = 'standard';
		}
		update_post_meta( $post_id, '_bs3d_viewport_mode', $viewport_mode );

		if ( isset( $_POST['bs3d_action_save_template'] ) ) {
			$template_name = isset( $_POST['bs3d_template_name'] ) ? sanitize_text_field( wp_unslash( $_POST['bs3d_template_name'] ) ) : '';
			BS3D_Template_Post_Type::create_from_banner( $post_id, $template_name );
			BS3D_Diagnostics::log(
				array(
					'level'      => 'info',
					'surface'    => 'admin-preview',
					'code'       => 'template_saved',
					'message'    => 'Template created from banner',
					'banner_id'  => $post_id,
				),
				true
			);
		}

		BS3D_Version_Manager::create_snapshot( $post_id, isset( $_POST['bs3d_action_apply_template'] ) ? 'apply_template' : 'save' );
	}

	/**
	 * Fetch stored banner config.
	 *
	 * @param int $post_id Banner post ID.
	 * @return array<string,mixed>
	 */
	public static function get_banner_data( $post_id ) {
		$post = get_post( $post_id );
		if ( ! $post || 'bs3d_banner' !== $post->post_type ) {
			return array();
		}

		$scene_json = get_post_meta( $post_id, '_bs3d_scene_config', true );
		$scene      = json_decode( (string) $scene_json, true );
		$scene      = self::sanitize_scene_config( $scene );
		$viewport_mode = (string) get_post_meta( $post_id, '_bs3d_viewport_mode', true );
		if ( ! in_array( $viewport_mode, array( 'standard', 'fullscreen' ), true ) ) {
			$viewport_mode = 'standard';
		}

		return array(
			'id'             => (int) $post_id,
			'title'          => $post->post_title,
			'slug'           => $post->post_name,
			'status'         => $post->post_status,
			'scene'          => $scene,
			'debug_override' => (string) get_post_meta( $post_id, '_bs3d_debug_override', true ) ?: 'inherit',
			'poster_url'     => (string) get_post_meta( $post_id, '_bs3d_poster_url', true ),
			'quality'        => (string) get_post_meta( $post_id, '_bs3d_quality_profile', true ) ?: 'balanced',
			'mobile_mode'    => (string) get_post_meta( $post_id, '_bs3d_mobile_mode', true ) ?: 'adaptive',
			'viewport_mode'  => $viewport_mode,
		);
	}

	/**
	 * Build scene config from structured POST fields.
	 *
	 * @return array<string,mixed>
	 */
	private static function scene_from_post_request() {
		$scene = self::default_scene_config();

		$models = isset( $_POST['bs3d_models'] ) ? wp_unslash( $_POST['bs3d_models'] ) : array();
		if ( is_array( $models ) ) {
			$scene['models'] = $models;
		}

		$scene['background'] = array(
			'mode'         => isset( $_POST['bs3d_background_mode'] ) ? sanitize_key( wp_unslash( $_POST['bs3d_background_mode'] ) ) : 'static',
			'color'        => isset( $_POST['bs3d_background_color'] ) ? sanitize_text_field( wp_unslash( $_POST['bs3d_background_color'] ) ) : '#111827',
			'imageUrl'     => isset( $_POST['bs3d_background_image'] ) ? esc_url_raw( wp_unslash( $_POST['bs3d_background_image'] ) ) : '',
			'dioramaDepth' => isset( $_POST['bs3d_diorama_depth'] ) ? wp_unslash( $_POST['bs3d_diorama_depth'] ) : 8,
		);

		$scene['camera'] = array(
			'lensMm'   => isset( $_POST['bs3d_camera_lens_mm'] ) ? wp_unslash( $_POST['bs3d_camera_lens_mm'] ) : self::lens_from_fov( isset( $_POST['bs3d_camera_fov'] ) ? wp_unslash( $_POST['bs3d_camera_fov'] ) : 45 ),
			'position' => array(
				'x' => isset( $_POST['bs3d_camera_x'] ) ? wp_unslash( $_POST['bs3d_camera_x'] ) : 0,
				'y' => isset( $_POST['bs3d_camera_y'] ) ? wp_unslash( $_POST['bs3d_camera_y'] ) : 0,
				'z' => isset( $_POST['bs3d_camera_z'] ) ? wp_unslash( $_POST['bs3d_camera_z'] ) : 5,
			),
		);

		$scene['lighting'] = array(
			'ambientEnabled'      => ! empty( $_POST['bs3d_ambient_enabled'] ),
			'ambientIntensity'     => isset( $_POST['bs3d_ambient_intensity'] ) ? wp_unslash( $_POST['bs3d_ambient_intensity'] ) : 0.8,
			'directionalIntensity' => isset( $_POST['bs3d_directional_intensity'] ) ? wp_unslash( $_POST['bs3d_directional_intensity'] ) : 1.15,
			'directionalPosition'  => array(
				'x' => isset( $_POST['bs3d_light_x'] ) ? wp_unslash( $_POST['bs3d_light_x'] ) : 5,
				'y' => isset( $_POST['bs3d_light_y'] ) ? wp_unslash( $_POST['bs3d_light_y'] ) : 10,
				'z' => isset( $_POST['bs3d_light_z'] ) ? wp_unslash( $_POST['bs3d_light_z'] ) : 7,
			),
			'shadows'              => ! empty( $_POST['bs3d_light_shadows'] ),
			'pointLights'          => isset( $_POST['bs3d_point_lights'] ) ? wp_unslash( $_POST['bs3d_point_lights'] ) : array(),
		);

		$scene['interactions'] = array(
			'tilt'            => ! empty( $_POST['bs3d_interaction_tilt'] ),
			'rotate'          => ! empty( $_POST['bs3d_interaction_rotate'] ),
			'parallax'        => ! empty( $_POST['bs3d_interaction_parallax'] ),
			'tiltIntensity'   => isset( $_POST['bs3d_tilt_intensity'] ) ? wp_unslash( $_POST['bs3d_tilt_intensity'] ) : 0.2,
			'scrollCamera'    => ! empty( $_POST['bs3d_interaction_scroll_camera'] ),
			'scrollIntensity' => isset( $_POST['bs3d_scroll_intensity'] ) ? wp_unslash( $_POST['bs3d_scroll_intensity'] ) : 0.35,
		);

		$scene['fallback'] = array(
			'timeoutMs' => isset( $_POST['bs3d_fallback_timeout_ms'] ) ? wp_unslash( $_POST['bs3d_fallback_timeout_ms'] ) : 12000,
		);

		return $scene;
	}

	/**
	 * Allowed lens options in millimeters.
	 *
	 * @return array<int,int>
	 */
	private static function lens_options() {
		return array( 8, 16, 24, 35, 50, 70, 85, 100, 120, 150, 180, 200 );
	}

	/**
	 * Convert legacy FOV value to nearest supported lens value.
	 *
	 * @param mixed $fov FOV value.
	 * @return int
	 */
	private static function lens_from_fov( $fov ) {
		$fov_value = self::to_float( $fov, 20, 100, 45 );
		$focal_mm  = 12 / tan( deg2rad( $fov_value ) / 2 );
		$lenses    = self::lens_options();
		$nearest   = $lenses[0];
		$delta     = abs( $nearest - $focal_mm );

		foreach ( $lenses as $lens ) {
			$next_delta = abs( $lens - $focal_mm );
			if ( $next_delta < $delta ) {
				$nearest = $lens;
				$delta   = $next_delta;
			}
		}

		return (int) $nearest;
	}

	/**
	 * Sanitize lens selection.
	 *
	 * @param mixed $lens_mm Lens value.
	 * @return int
	 */
	private static function sanitize_lens_mm( $lens_mm ) {
		$lens_mm = (int) self::to_float( $lens_mm, 8, 200, 35 );
		$lenses  = self::lens_options();
		if ( in_array( $lens_mm, $lenses, true ) ) {
			return $lens_mm;
		}

		$nearest = $lenses[0];
		$delta   = abs( $nearest - $lens_mm );
		foreach ( $lenses as $lens ) {
			$next_delta = abs( $lens - $lens_mm );
			if ( $next_delta < $delta ) {
				$nearest = $lens;
				$delta   = $next_delta;
			}
		}

		return (int) $nearest;
	}

	/**
	 * Default point light definitions.
	 *
	 * @return array<int,array<string,mixed>>
	 */
	private static function default_point_lights() {
		return array(
			array(
				'enabled'  => false,
				'color'    => '#ffd2ad',
				'intensity'=> 2.5,
				'distance' => 20,
				'decay'    => 2,
				'position' => array( 'x' => -2, 'y' => 3, 'z' => 3 ),
			),
			array(
				'enabled'  => false,
				'color'    => '#f7b3ff',
				'intensity'=> 2.2,
				'distance' => 20,
				'decay'    => 2,
				'position' => array( 'x' => 0, 'y' => 3, 'z' => 2 ),
			),
			array(
				'enabled'  => false,
				'color'    => '#a8e6ff',
				'intensity'=> 2.2,
				'distance' => 20,
				'decay'    => 2,
				'position' => array( 'x' => 2, 'y' => 3, 'z' => 3 ),
			),
		);
	}

	/**
	 * Sanitize point light configuration.
	 *
	 * @param mixed $point_light Raw point light.
	 * @param array<string,mixed>|null $fallback Default fallback.
	 * @return array<string,mixed>
	 */
	private static function sanitize_point_light( $point_light, $fallback = null ) {
		$default = is_array( $fallback ) ? $fallback : self::default_point_lights()[0];
		$light   = is_array( $point_light ) ? $point_light : array();

		return array(
			'enabled'  => self::to_bool( $light['enabled'] ?? $default['enabled'] ),
			'color'    => self::to_hex_color( $light['color'] ?? $default['color'], $default['color'] ),
			'intensity'=> self::to_float( $light['intensity'] ?? $default['intensity'], 0, 20, $default['intensity'] ),
			'distance' => self::to_float( $light['distance'] ?? $default['distance'], 0, 200, $default['distance'] ),
			'decay'    => self::to_float( $light['decay'] ?? $default['decay'], 0, 4, $default['decay'] ),
			'position' => array(
				'x' => self::to_float( $light['position']['x'] ?? $default['position']['x'], -1000, 1000, $default['position']['x'] ),
				'y' => self::to_float( $light['position']['y'] ?? $default['position']['y'], -1000, 1000, $default['position']['y'] ),
				'z' => self::to_float( $light['position']['z'] ?? $default['position']['z'], -1000, 1000, $default['position']['z'] ),
			),
		);
	}

	/**
	 * Sanitize float.
	 *
	 * @param mixed $value Value.
	 * @param float $min Minimum.
	 * @param float $max Maximum.
	 * @param float $fallback Default.
	 */
	private static function to_float( $value, $min, $max, $fallback ) {
		if ( ! is_numeric( $value ) ) {
			return (float) $fallback;
		}
		$number = (float) $value;
		if ( $number < $min ) {
			$number = $min;
		}
		if ( $number > $max ) {
			$number = $max;
		}
		return $number;
	}

	/**
	 * Sanitize bool-like value.
	 *
	 * @param mixed $value Value.
	 */
	private static function to_bool( $value ) {
		if ( is_bool( $value ) ) {
			return $value;
		}
		if ( is_numeric( $value ) ) {
			return (int) $value > 0;
		}
		if ( is_string( $value ) ) {
			$value = strtolower( $value );
			return in_array( $value, array( '1', 'true', 'yes', 'on' ), true );
		}
		return false;
	}

	/**
	 * Sanitize hex color.
	 *
	 * @param mixed  $value Color value.
	 * @param string $fallback Default.
	 */
	private static function to_hex_color( $value, $fallback ) {
		$color = sanitize_hex_color( is_string( $value ) ? $value : '' );
		return $color ? $color : $fallback;
	}
}
