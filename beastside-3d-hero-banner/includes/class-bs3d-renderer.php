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
		add_action( 'wp_ajax_bs3d_model_proxy', array( __CLASS__, 'handle_model_proxy' ) );
		add_action( 'wp_ajax_bs3d_model_proxy_public', array( __CLASS__, 'handle_model_proxy_public' ) );
		add_action( 'wp_ajax_nopriv_bs3d_model_proxy_public', array( __CLASS__, 'handle_model_proxy_public' ) );
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
		$site_origin = self::get_site_origin();
		$site_host   = '';
		if ( ! empty( $site_origin ) ) {
			$site_host = (string) wp_parse_url( $site_origin, PHP_URL_HOST );
		}

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
				'modelProxyUrl'      => esc_url_raw( admin_url( 'admin-ajax.php?action=bs3d_model_proxy' ) ),
				'modelProxyNonce'    => wp_create_nonce( 'bs3d_model_proxy' ),
				'modelProxyPublicUrl'=> esc_url_raw( admin_url( 'admin-ajax.php?action=bs3d_model_proxy_public' ) ),
				'siteOrigin'         => $site_origin,
				'siteHost'           => strtolower( sanitize_text_field( $site_host ) ),
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

		$surface_key     = sanitize_key( (string) $surface );
		if ( '' === $surface_key ) {
			$surface_key = 'shortcode';
		}
		$surface_class   = 'bs3d-surface-' . sanitize_html_class( $surface_key );
		$wrapper_classes = trim( 'bs3d-banner ' . $surface_class . ' ' . $extra_class );
		if ( isset( $data['viewport_mode'] ) && 'fullscreen' === $data['viewport_mode'] ) {
			$wrapper_classes = trim( $wrapper_classes . ' bs3d-fullscreen' );
		}
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
			'viewportMode'   => (string) ( isset( $data['viewport_mode'] ) ? $data['viewport_mode'] : 'standard' ),
			'lazy'           => (bool) $lazy,
			'scene'          => isset( $data['scene'] ) && is_array( $data['scene'] ) ? $data['scene'] : array(),
			'posterUrl'      => (string) $data['poster_url'],
			'modelProxySignatures' => self::build_public_proxy_signatures( $data ),
		);
	}

	/**
	 * Proxy model requests for admin preview fallback.
	 */
	public static function handle_model_proxy() {
		if ( ! current_user_can( 'manage_options' ) ) {
			status_header( 403 );
			wp_die( 'Forbidden' );
		}

		$nonce = isset( $_GET['nonce'] ) ? sanitize_text_field( wp_unslash( $_GET['nonce'] ) ) : '';
		if ( ! wp_verify_nonce( $nonce, 'bs3d_model_proxy' ) ) {
			status_header( 403 );
			wp_die( 'Invalid nonce' );
		}

		$raw_url = isset( $_GET['url'] ) ? esc_url_raw( wp_unslash( $_GET['url'] ) ) : '';
		$url     = self::sanitize_model_proxy_url( $raw_url );
		if ( empty( $url ) ) {
			status_header( 400 );
			wp_die( 'Invalid model URL' );
		}

		self::proxy_fetch_and_stream( $url, 'admin-preview' );
	}

	/**
	 * Proxy model requests for frontend render fallback using a banner-bound signature.
	 */
	public static function handle_model_proxy_public() {
		$banner_id = isset( $_GET['banner_id'] ) ? absint( $_GET['banner_id'] ) : 0;
		$model_index = isset( $_GET['model_index'] ) ? (int) wp_unslash( $_GET['model_index'] ) : -1;
		$signature = isset( $_GET['sig'] ) ? sanitize_text_field( wp_unslash( $_GET['sig'] ) ) : '';

		if ( $banner_id <= 0 || $model_index < 0 || $model_index > 2 || empty( $signature ) ) {
			status_header( 400 );
			wp_die( 'Invalid proxy request' );
		}

		$banner_post = get_post( $banner_id );
		if ( ! $banner_post || 'bs3d_banner' !== $banner_post->post_type ) {
			status_header( 404 );
			wp_die( 'Banner not found' );
		}

		if ( 'publish' !== $banner_post->post_status && ! current_user_can( 'manage_options' ) ) {
			status_header( 403 );
			wp_die( 'Banner not available' );
		}

		$url = self::resolve_banner_model_url( $banner_id, $model_index );
		if ( empty( $url ) ) {
			status_header( 404 );
			wp_die( 'Model not found' );
		}

		if ( ! self::verify_public_proxy_signature( $banner_id, $model_index, $url, $signature ) ) {
			BS3D_Diagnostics::log(
				array(
					'level'   => 'warn',
					'surface' => 'frontend',
					'code'    => 'model_proxy_signature_invalid',
					'message' => 'Rejected public model proxy request due to invalid signature.',
					'meta'    => array(
						'bannerId'   => $banner_id,
						'modelIndex' => $model_index + 1,
					),
				),
				false
			);
			status_header( 403 );
			wp_die( 'Invalid signature' );
		}

		self::proxy_fetch_and_stream( $url, 'frontend' );
	}

	/**
	 * Fetch a model URL upstream and stream it to the browser.
	 *
	 * @param string $url Source model URL.
	 * @param string $surface Diagnostics surface.
	 */
	private static function proxy_fetch_and_stream( $url, $surface ) {
		$response = wp_remote_get(
			$url,
			array(
				'timeout'            => 20,
				'redirection'        => 3,
				'reject_unsafe_urls' => true,
				'sslverify'          => true,
				'headers'            => array(
					'Accept' => 'model/gltf-binary,model/gltf+json,application/octet-stream;q=0.9,*/*;q=0.1',
				),
			)
		);

		if ( is_wp_error( $response ) ) {
			BS3D_Diagnostics::log(
				array(
					'level'           => 'error',
					'surface'         => $surface,
					'code'            => 'model_proxy_fetch_failed',
					'message'         => $response->get_error_message(),
					'meta'            => array(
						'url' => $url,
					),
					'effective_debug' => true,
				),
				false
			);
			status_header( 502 );
			wp_die( 'Proxy fetch failed' );
		}

		$status_code = (int) wp_remote_retrieve_response_code( $response );
		if ( $status_code < 200 || $status_code >= 300 ) {
			BS3D_Diagnostics::log(
				array(
					'level'           => 'warn',
					'surface'         => $surface,
					'code'            => 'model_proxy_http_status',
					'message'         => 'Proxy upstream returned non-success status.',
					'meta'            => array(
						'url'        => $url,
						'statusCode' => $status_code,
					),
					'effective_debug' => true,
				),
				false
			);
			status_header( 502 );
			wp_die( 'Proxy upstream status error' );
		}

		$body = self::strip_utf8_bom( (string) wp_remote_retrieve_body( $response ) );
		if ( '' === $body ) {
			status_header( 502 );
			wp_die( 'Proxy upstream returned empty body' );
		}

		$content_type = (string) wp_remote_retrieve_header( $response, 'content-type' );
		if ( empty( $content_type ) ) {
			$content_type = self::infer_model_content_type( $url );
		}

		$content_length = (int) wp_remote_retrieve_header( $response, 'content-length' );
		$max_bytes      = 60 * 1024 * 1024;
		if ( $content_length > $max_bytes || strlen( $body ) > $max_bytes ) {
			status_header( 413 );
			wp_die( 'Model too large for proxy limit' );
		}

		while ( ob_get_level() > 0 ) {
			ob_end_clean();
		}

		nocache_headers();
		header( 'Content-Type: ' . $content_type );
		header( 'X-BS3D-Model-Proxy: 1' );
		header( 'X-Content-Type-Options: nosniff' );
		header( 'Content-Length: ' . strlen( $body ) );
		echo $body; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		exit;
	}

	/**
	 * Build per-model signature map for public proxy fallback.
	 *
	 * @param array<string,mixed> $data Banner data.
	 * @return array<string,string>
	 */
	private static function build_public_proxy_signatures( array $data ) {
		$signatures = array();
		$banner_id  = isset( $data['id'] ) ? absint( $data['id'] ) : 0;
		$scene      = isset( $data['scene'] ) && is_array( $data['scene'] ) ? $data['scene'] : array();
		$models     = isset( $scene['models'] ) && is_array( $scene['models'] ) ? $scene['models'] : array();

		foreach ( $models as $model_index => $model ) {
			if ( ! is_array( $model ) || empty( $model['url'] ) ) {
				continue;
			}
			$url = self::sanitize_model_proxy_url( (string) $model['url'] );
			if ( empty( $url ) ) {
				continue;
			}
			$signatures[ (string) $model_index ] = self::sign_public_proxy_request( $banner_id, $model_index, $url );
		}

		return $signatures;
	}

	/**
	 * Resolve a model URL from banner data using model index.
	 *
	 * @param int $banner_id Banner ID.
	 * @param int $model_index Model index.
	 * @return string
	 */
	private static function resolve_banner_model_url( $banner_id, $model_index ) {
		$banner_data = BS3D_Banner_Post_Type::get_banner_data( $banner_id );
		if ( empty( $banner_data ) || empty( $banner_data['scene'] ) || ! is_array( $banner_data['scene'] ) ) {
			return '';
		}

		$scene  = $banner_data['scene'];
		$models = isset( $scene['models'] ) && is_array( $scene['models'] ) ? $scene['models'] : array();
		if ( ! array_key_exists( $model_index, $models ) || ! is_array( $models[ $model_index ] ) ) {
			return '';
		}

		$model = $models[ $model_index ];
		$url   = isset( $model['url'] ) ? (string) $model['url'] : '';
		return self::sanitize_model_proxy_url( $url );
	}

	/**
	 * Create HMAC signature for public proxy requests.
	 *
	 * @param int    $banner_id Banner ID.
	 * @param int    $model_index Model index.
	 * @param string $url Model URL.
	 * @return string
	 */
	private static function sign_public_proxy_request( $banner_id, $model_index, $url ) {
		$payload = absint( $banner_id ) . '|' . absint( $model_index ) . '|' . strtolower( trim( (string) $url ) );
		return hash_hmac( 'sha256', $payload, wp_salt( 'auth' ) );
	}

	/**
	 * Verify signature for a public proxy request.
	 *
	 * @param int    $banner_id Banner ID.
	 * @param int    $model_index Model index.
	 * @param string $url Model URL.
	 * @param string $signature Signature from request.
	 * @return bool
	 */
	private static function verify_public_proxy_signature( $banner_id, $model_index, $url, $signature ) {
		$expected = self::sign_public_proxy_request( $banner_id, $model_index, $url );
		return hash_equals( $expected, (string) $signature );
	}

	/**
	 * Validate proxy URL input.
	 *
	 * @param string $url Raw URL.
	 * @return string
	 */
	private static function sanitize_model_proxy_url( $url ) {
		$url   = esc_url_raw( (string) $url );
		$parts = wp_parse_url( $url );
		if ( ! is_array( $parts ) ) {
			return '';
		}

		$scheme = isset( $parts['scheme'] ) ? strtolower( (string) $parts['scheme'] ) : '';
		if ( ! in_array( $scheme, array( 'http', 'https' ), true ) ) {
			return '';
		}

		$host = isset( $parts['host'] ) ? strtolower( (string) $parts['host'] ) : '';
		if ( empty( $host ) || self::is_local_or_private_host( $host ) ) {
			return '';
		}

		$path = isset( $parts['path'] ) ? (string) $parts['path'] : '';
		if ( ! preg_match( '/\.(glb|gltf)$/i', $path ) ) {
			return '';
		}

		return $url;
	}

	/**
	 * Determine if host is local/private and should be blocked for proxy.
	 *
	 * @param string $host Hostname.
	 * @return bool
	 */
	private static function is_local_or_private_host( $host ) {
		$host = strtolower( trim( $host ) );
		if ( in_array( $host, array( 'localhost', '127.0.0.1', '::1' ), true ) ) {
			return true;
		}

		if ( filter_var( $host, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4 ) ) {
			return (bool) ! filter_var( $host, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE );
		}

		if ( filter_var( $host, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6 ) ) {
			if ( preg_match( '/^(fc|fd)/i', $host ) ) {
				return true;
			}
			return '::1' === $host;
		}

		return false;
	}

	/**
	 * Infer model content type from URL extension.
	 *
	 * @param string $url URL.
	 * @return string
	 */
	private static function infer_model_content_type( $url ) {
		if ( preg_match( '/\.gltf($|\?)/i', (string) $url ) ) {
			return 'model/gltf+json';
		}
		return 'model/gltf-binary';
	}

	/**
	 * Build canonical site origin for frontend host normalization.
	 *
	 * @return string
	 */
	private static function get_site_origin() {
		$home = wp_parse_url( home_url( '/' ) );
		if ( ! is_array( $home ) || empty( $home['scheme'] ) || empty( $home['host'] ) ) {
			return '';
		}

		$origin = strtolower( (string) $home['scheme'] ) . '://' . strtolower( (string) $home['host'] );
		if ( ! empty( $home['port'] ) ) {
			$origin .= ':' . absint( $home['port'] );
		}

		return $origin;
	}

	/**
	 * Remove a leading UTF-8 BOM from payloads to keep proxy output binary-safe.
	 *
	 * @param string $value Raw payload.
	 * @return string
	 */
	private static function strip_utf8_bom( $value ) {
		if ( 0 === strpos( $value, "\xEF\xBB\xBF" ) ) {
			return substr( $value, 3 );
		}
		return $value;
	}
}
