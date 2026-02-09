<?php
/**
 * Frontend rendering and shortcode integration.
 *
 * @package Beastside3DHeroBanner
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class BS3D_Renderer {
	/**
	 * Register hooks.
	 */
	public static function init() {
		add_action( 'wp_enqueue_scripts', array( __CLASS__, 'register_assets' ) );
		add_action( 'admin_enqueue_scripts', array( __CLASS__, 'register_assets' ) );
		add_shortcode( 'beastside_hero_banner', array( __CLASS__, 'render_shortcode' ) );
	}

	/**
	 * Register scripts and styles.
	 */
	public static function register_assets() {
		$dependencies   = array();
		$has_three      = false;
		$has_draco      = false;
		$has_meshopt    = false;
		$has_gltf       = false;

		if ( file_exists( BS3D_PLUGIN_DIR . 'assets/vendor/three/three.min.js' ) ) {
			wp_register_script( 'bs3d-three', BS3D_PLUGIN_URL . 'assets/vendor/three/three.min.js', array(), BS3D_VERSION, true );
			$dependencies[] = 'bs3d-three';
			$has_three      = true;
		}

		if ( file_exists( BS3D_PLUGIN_DIR . 'assets/vendor/three/DRACOLoader.js' ) ) {
			$draco_deps = $has_three ? array( 'bs3d-three' ) : array();
			wp_register_script( 'bs3d-draco-loader', BS3D_PLUGIN_URL . 'assets/vendor/three/DRACOLoader.js', $draco_deps, BS3D_VERSION, true );
			$dependencies[] = 'bs3d-draco-loader';
			$has_draco      = true;
		}

		if ( file_exists( BS3D_PLUGIN_DIR . 'assets/vendor/meshopt/meshopt_decoder.js' ) ) {
			wp_register_script( 'bs3d-meshopt-decoder', BS3D_PLUGIN_URL . 'assets/vendor/meshopt/meshopt_decoder.js', array(), BS3D_VERSION, true );
			$dependencies[] = 'bs3d-meshopt-decoder';
			$has_meshopt    = true;
		}

		if ( file_exists( BS3D_PLUGIN_DIR . 'assets/vendor/three/GLTFLoader.js' ) ) {
			$gltf_deps = $has_three ? array( 'bs3d-three' ) : array();
			if ( $has_draco ) {
				$gltf_deps[] = 'bs3d-draco-loader';
			}
			wp_register_script( 'bs3d-gltf-loader', BS3D_PLUGIN_URL . 'assets/vendor/three/GLTFLoader.js', $gltf_deps, BS3D_VERSION, true );
			$dependencies[] = 'bs3d-gltf-loader';
			$has_gltf       = true;
		}

		wp_register_style(
			'bs3d-frontend',
			BS3D_PLUGIN_URL . 'assets/css/frontend.css',
			array(),
			BS3D_VERSION
		);

		wp_register_script(
			'bs3d-frontend',
			BS3D_PLUGIN_URL . 'assets/js/frontend.js',
			$dependencies,
			BS3D_VERSION,
			true
		);
	}

	/**
	 * Enqueue front-end dependencies.
	 */
	public static function enqueue_assets( $for_admin = false ) {
		wp_enqueue_style( 'bs3d-frontend' );
		wp_enqueue_script( 'bs3d-frontend' );

		$settings = BS3D_Settings::get_settings();
		wp_localize_script(
			'bs3d-frontend',
			'BS3DDebugContext',
			array(
				'restUrl'            => esc_url_raw( rest_url( BS3D_Diagnostics::REST_NAMESPACE . BS3D_Diagnostics::REST_ROUTE ) ),
				'restNonce'          => wp_create_nonce( 'wp_rest' ),
				'globalDebugEnabled' => (bool) $settings['debug_enabled'],
				'overlayEnabled'     => (bool) $settings['debug_overlay_enabled'],
				'verbosity'          => (string) $settings['debug_verbosity'],
				'adminOverlayUser'   => is_user_logged_in() && current_user_can( 'manage_options' ),
				'isAdminRequest'     => (bool) $for_admin,
				'dracoConfigured'    => is_dir( BS3D_PLUGIN_DIR . 'assets/vendor/draco' ),
				'dracoDecoderPath'   => trailingslashit( BS3D_PLUGIN_URL . 'assets/vendor/draco' ),
				'meshoptConfigured'  => file_exists( BS3D_PLUGIN_DIR . 'assets/vendor/meshopt/meshopt_decoder.js' ),
				'meshoptGlobalKey'   => 'MeshoptDecoder',
			)
		);
	}

	/**
	 * Render shortcode [beastside_hero_banner].
	 *
	 * @param array<string,mixed> $atts Shortcode attributes.
	 */
	public static function render_shortcode( $atts ) {
		$atts = shortcode_atts(
			array(
				'id'      => 0,
				'slug'    => '',
				'class'   => '',
				'lazy'    => '1',
				'profile' => '',
			),
			$atts,
			'beastside_hero_banner'
		);

		return self::render_banner_from_args(
			array(
				'id'      => $atts['id'],
				'slug'    => $atts['slug'],
				'class'   => $atts['class'],
				'lazy'    => $atts['lazy'],
				'profile' => $atts['profile'],
				'surface' => 'shortcode',
			)
		);
	}

	/**
	 * Public helper render API.
	 *
	 * @param array<string,mixed> $args Render arguments.
	 */
	public static function render_banner_from_args( array $args = array() ) {
		$banner_id = ! empty( $args['id'] ) ? absint( $args['id'] ) : 0;

		if ( ! $banner_id && ! empty( $args['slug'] ) ) {
			$post = get_page_by_path( sanitize_title( (string) $args['slug'] ), OBJECT, 'bs3d_banner' );
			if ( $post ) {
				$banner_id = (int) $post->ID;
			}
		}

		if ( ! $banner_id ) {
			return '';
		}

		$surface = ! empty( $args['surface'] ) ? sanitize_key( (string) $args['surface'] ) : 'shortcode';
		$class   = ! empty( $args['class'] ) ? sanitize_html_class( (string) $args['class'] ) : '';
		$lazy    = ! isset( $args['lazy'] ) || '0' !== (string) $args['lazy'];
		$profile = ! empty( $args['profile'] ) ? sanitize_key( (string) $args['profile'] ) : '';

		return self::render_banner( $banner_id, $surface, $class, $lazy, $profile );
	}

	/**
	 * Render banner markup for a specific post ID.
	 *
	 * @param int    $banner_id Banner post ID.
	 * @param string $surface Rendering surface.
	 * @param string $extra_class Extra class.
	 * @param bool   $lazy Enable lazy loading.
	 * @param string $profile Override quality profile.
	 */
	public static function render_banner( $banner_id, $surface = 'shortcode', $extra_class = '', $lazy = true, $profile = '' ) {
		$data = BS3D_Banner_Post_Type::get_banner_data( $banner_id );
		if ( empty( $data ) ) {
			return '';
		}

		self::enqueue_assets( false );

		$debug_enabled  = BS3D_Settings::resolve_debug_enabled( (string) $data['debug_override'] );
		$overlay_allowed = $debug_enabled
			&& BS3D_Settings::get( 'debug_overlay_enabled' )
			&& is_user_logged_in()
			&& current_user_can( 'manage_options' );

		$payload = self::build_payload( $data, $surface, $debug_enabled, $overlay_allowed, $lazy, $profile );

		$wrapper_classes = trim( 'bs3d-banner ' . $extra_class );
		ob_start();
		?>
		<div
			class="<?php echo esc_attr( $wrapper_classes ); ?>"
			data-bs3d="<?php echo esc_attr( wp_json_encode( $payload ) ); ?>"
			data-banner-id="<?php echo esc_attr( (string) $data['id'] ); ?>"
			data-banner-slug="<?php echo esc_attr( (string) $data['slug'] ); ?>"
		>
			<div class="bs3d-stage" aria-hidden="true"></div>
			<?php if ( ! empty( $data['poster_url'] ) ) : ?>
				<img class="bs3d-poster" src="<?php echo esc_url( $data['poster_url'] ); ?>" alt="" loading="lazy" />
			<?php endif; ?>
		</div>
		<?php
		return (string) ob_get_clean();
	}

	/**
	 * Build standard payload used by frontend/admin preview renderer.
	 *
	 * @param array<string,mixed> $data Banner data.
	 * @param string              $surface Surface.
	 * @param bool                $debug_enabled Effective debug toggle.
	 * @param bool                $overlay_allowed Overlay permission.
	 * @param bool                $lazy Lazy mode.
	 * @param string              $profile Profile override.
	 * @return array<string,mixed>
	 */
	public static function build_payload( array $data, $surface, $debug_enabled, $overlay_allowed, $lazy, $profile = '' ) {
		return array(
			'bannerId'       => (int) $data['id'],
			'slug'           => (string) $data['slug'],
			'surface'        => sanitize_key( $surface ),
			'effectiveDebug' => (bool) $debug_enabled,
			'overlayEnabled' => (bool) $overlay_allowed,
			'verbosity'      => (string) BS3D_Settings::get( 'debug_verbosity' ),
			'qualityProfile' => ! empty( $profile ) ? $profile : (string) $data['quality'],
			'mobileMode'     => (string) $data['mobile_mode'],
			'lazy'           => (bool) $lazy,
			'scene'          => isset( $data['scene'] ) && is_array( $data['scene'] ) ? $data['scene'] : array(),
			'posterUrl'      => (string) $data['poster_url'],
		);
	}
}
