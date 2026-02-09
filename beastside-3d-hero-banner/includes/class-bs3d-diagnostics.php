<?php
/**
 * Diagnostics storage, API, and status checks.
 *
 * @package Beastside3DHeroBanner
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class BS3D_Diagnostics {
	const REST_NAMESPACE = 'bs3d/v1';
	const REST_ROUTE     = '/diagnostic';

	/**
	 * Register diagnostics hooks.
	 */
	public static function init() {
		add_action( 'rest_api_init', array( __CLASS__, 'register_rest_routes' ) );
		add_action( 'bs3d_cleanup_diagnostics_daily', array( __CLASS__, 'cleanup_old_logs' ) );
	}

	/**
	 * Install diagnostics table.
	 */
	public static function install() {
		global $wpdb;
		require_once ABSPATH . 'wp-admin/includes/upgrade.php';

		$table_name      = self::table_name();
		$charset_collate = $wpdb->get_charset_collate();

		$sql = "CREATE TABLE {$table_name} (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			created_at datetime NOT NULL,
			level varchar(10) NOT NULL,
			banner_id bigint(20) unsigned NULL,
			slug varchar(200) NULL,
			surface varchar(32) NOT NULL,
			code varchar(64) NOT NULL,
			message text NOT NULL,
			meta longtext NULL,
			PRIMARY KEY  (id),
			KEY level (level),
			KEY surface (surface),
			KEY banner_id (banner_id),
			KEY slug (slug(64)),
			KEY created_at (created_at)
		) {$charset_collate};";

		dbDelta( $sql );
	}

	/**
	 * Schedule retention cleanup.
	 */
	public static function schedule_cleanup() {
		if ( ! wp_next_scheduled( 'bs3d_cleanup_diagnostics_daily' ) ) {
			wp_schedule_event( time() + HOUR_IN_SECONDS, 'daily', 'bs3d_cleanup_diagnostics_daily' );
		}
	}

	/**
	 * Remove scheduled cleanup.
	 */
	public static function unschedule_cleanup() {
		$timestamp = wp_next_scheduled( 'bs3d_cleanup_diagnostics_daily' );
		if ( $timestamp ) {
			wp_unschedule_event( $timestamp, 'bs3d_cleanup_diagnostics_daily' );
		}
	}

	/**
	 * Diagnostics table name.
	 */
	public static function table_name() {
		global $wpdb;
		return $wpdb->prefix . 'bs3d_diagnostics';
	}

	/**
	 * Register REST endpoint for frontend diagnostics.
	 */
	public static function register_rest_routes() {
		register_rest_route(
			self::REST_NAMESPACE,
			self::REST_ROUTE,
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'permission_callback' => '__return_true',
				'callback'            => array( __CLASS__, 'handle_rest_log' ),
			)
		);
	}

	/**
	 * Handle REST diagnostics POST.
	 *
	 * @param WP_REST_Request $request REST request.
	 */
	public static function handle_rest_log( WP_REST_Request $request ) {
		$payload = $request->get_json_params();
		if ( ! is_array( $payload ) ) {
			$payload = array();
		}

		$critical = ! empty( $payload['critical'] );
		$logged   = self::log(
			array(
				'level'           => isset( $payload['level'] ) ? $payload['level'] : 'info',
				'banner_id'       => isset( $payload['bannerId'] ) ? (int) $payload['bannerId'] : 0,
				'slug'            => isset( $payload['slug'] ) ? $payload['slug'] : '',
				'surface'         => isset( $payload['surface'] ) ? $payload['surface'] : 'frontend',
				'code'            => isset( $payload['code'] ) ? $payload['code'] : 'unknown',
				'message'         => isset( $payload['message'] ) ? $payload['message'] : '',
				'meta'            => isset( $payload['meta'] ) ? $payload['meta'] : array(),
				'effective_debug' => ! empty( $payload['effectiveDebug'] ),
			),
			$critical
		);

		return rest_ensure_response(
			array(
				'logged' => $logged,
			)
		);
	}

	/**
	 * Persist one diagnostics record.
	 *
	 * @param array<string,mixed> $args Record args.
	 * @param bool                $critical Allow logging even when debug disabled.
	 */
	public static function log( array $args, $critical = false ) {
		$effective_debug = array_key_exists( 'effective_debug', $args )
			? (bool) $args['effective_debug']
			: (bool) BS3D_Settings::get( 'debug_enabled' );

		if ( ! $critical && ! $effective_debug ) {
			return false;
		}

		$level = isset( $args['level'] ) ? sanitize_key( (string) $args['level'] ) : 'info';
		if ( ! in_array( $level, array( 'info', 'warn', 'error' ), true ) ) {
			$level = 'info';
		}

		$surface = isset( $args['surface'] ) ? sanitize_key( (string) $args['surface'] ) : 'frontend';
		if ( ! in_array( $surface, array( 'admin-preview', 'frontend', 'elementor', 'shortcode', 'import-export', 'startup' ), true ) ) {
			$surface = 'frontend';
		}

		$record = array(
			'created_at' => gmdate( 'Y-m-d H:i:s' ),
			'level'      => $level,
			'banner_id'  => empty( $args['banner_id'] ) ? null : absint( $args['banner_id'] ),
			'slug'       => empty( $args['slug'] ) ? null : sanitize_title( (string) $args['slug'] ),
			'surface'    => $surface,
			'code'       => sanitize_key( isset( $args['code'] ) ? (string) $args['code'] : 'unknown' ),
			'message'    => sanitize_text_field( isset( $args['message'] ) ? (string) $args['message'] : '' ),
			'meta'       => wp_json_encode( self::sanitize_meta( $args['meta'] ?? array() ) ),
		);

		global $wpdb;
		$result = $wpdb->insert(
			self::table_name(),
			$record,
			array( '%s', '%s', '%d', '%s', '%s', '%s', '%s', '%s' )
		);

		return false !== $result;
	}

	/**
	 * Persist a startup critical diagnostics record.
	 *
	 * @param string              $code Code.
	 * @param string              $message Message.
	 * @param array<string,mixed> $meta Metadata.
	 */
	public static function log_startup_warning( $code, $message, array $meta = array() ) {
		return self::log(
			array(
				'level'   => 'warn',
				'surface' => 'startup',
				'code'    => $code,
				'message' => $message,
				'meta'    => $meta,
			),
			true
		);
	}

	/**
	 * Query logs with filters.
	 *
	 * @param array<string,mixed> $filters Filters.
	 * @param int                 $limit Row limit.
	 * @return array<int,array<string,mixed>>
	 */
	public static function query_logs( array $filters = array(), $limit = 200 ) {
		global $wpdb;

		$where      = array( '1=1' );
		$parameters = array();

		if ( ! empty( $filters['level'] ) ) {
			$where[]      = 'level = %s';
			$parameters[] = sanitize_key( (string) $filters['level'] );
		}

		if ( ! empty( $filters['surface'] ) ) {
			$where[]      = 'surface = %s';
			$parameters[] = sanitize_key( (string) $filters['surface'] );
		}

		if ( ! empty( $filters['banner_id'] ) ) {
			$where[]      = 'banner_id = %d';
			$parameters[] = absint( $filters['banner_id'] );
		}

		if ( ! empty( $filters['slug'] ) ) {
			$where[]      = 'slug LIKE %s';
			$parameters[] = '%' . $wpdb->esc_like( sanitize_title( (string) $filters['slug'] ) ) . '%';
		}

		$limit = max( 1, min( 2000, (int) $limit ) );
		$sql   = 'SELECT * FROM ' . self::table_name() . ' WHERE ' . implode( ' AND ', $where ) . ' ORDER BY id DESC LIMIT ' . $limit;

		if ( ! empty( $parameters ) ) {
			$sql = $wpdb->prepare( $sql, $parameters );
		}

		$rows = $wpdb->get_results( $sql, ARRAY_A );
		return is_array( $rows ) ? $rows : array();
	}

	/**
	 * Clear all diagnostics records.
	 */
	public static function clear_logs() {
		global $wpdb;
		$wpdb->query( 'DELETE FROM ' . self::table_name() );
	}

	/**
	 * Apply retention policy.
	 */
	public static function cleanup_old_logs() {
		global $wpdb;

		$retention_days = BS3D_Settings::get_retention_days();
		$cutoff         = gmdate( 'Y-m-d H:i:s', time() - ( DAY_IN_SECONDS * $retention_days ) );
		$wpdb->query(
			$wpdb->prepare(
				'DELETE FROM ' . self::table_name() . ' WHERE created_at < %s',
				$cutoff
			)
		);
	}

	/**
	 * Get last successful render timestamp.
	 */
	public static function get_last_success_timestamp() {
		global $wpdb;
		return $wpdb->get_var(
			"SELECT created_at FROM " . self::table_name() . " WHERE code = 'render_success' ORDER BY id DESC LIMIT 1"
		);
	}

	/**
	 * Get last error timestamp.
	 */
	public static function get_last_error_timestamp() {
		global $wpdb;
		return $wpdb->get_var(
			"SELECT created_at FROM " . self::table_name() . " WHERE level = 'error' ORDER BY id DESC LIMIT 1"
		);
	}

	/**
	 * Build status checks shown in diagnostics panel.
	 *
	 * @return array<int,array<string,string>>
	 */
	public static function get_status_checks() {
		$three_exists    = file_exists( BS3D_PLUGIN_DIR . 'assets/vendor/three/three.min.js' );
		$gltf_exists     = file_exists( BS3D_PLUGIN_DIR . 'assets/vendor/three/GLTFLoader.js' );
		$draco_config    = is_dir( BS3D_PLUGIN_DIR . 'assets/vendor/draco' );
		$meshopt_config  = file_exists( BS3D_PLUGIN_DIR . 'assets/vendor/meshopt/meshopt_decoder.js' );
		$elementor_ready = (bool) get_option( 'bs3d_elementor_widget_registered', false );
		$shortcode_ready = shortcode_exists( 'beastside_hero_banner' );
		$last_success    = self::get_last_success_timestamp();
		$last_error      = self::get_last_error_timestamp();

		return array(
			array(
				'label'   => __( 'Three.js Runtime Availability', 'beastside-3d-hero-banner' ),
				'status'  => $three_exists ? 'ok' : 'warn',
				'details' => $three_exists ? __( 'three.min.js detected in plugin assets.', 'beastside-3d-hero-banner' ) : __( 'three.min.js not found in assets/vendor/three.', 'beastside-3d-hero-banner' ),
			),
			array(
				'label'   => __( 'GLTF Loader Availability', 'beastside-3d-hero-banner' ),
				'status'  => $gltf_exists ? 'ok' : 'warn',
				'details' => $gltf_exists ? __( 'GLTFLoader.js detected.', 'beastside-3d-hero-banner' ) : __( 'GLTFLoader.js not found in assets/vendor/three.', 'beastside-3d-hero-banner' ),
			),
			array(
				'label'   => __( 'Draco Decoder Configuration', 'beastside-3d-hero-banner' ),
				'status'  => $draco_config ? 'ok' : 'warn',
				'details' => $draco_config ? __( 'Draco decoder directory detected.', 'beastside-3d-hero-banner' ) : __( 'Draco decoder directory missing at assets/vendor/draco.', 'beastside-3d-hero-banner' ),
			),
			array(
				'label'   => __( 'Meshopt Decoder Configuration', 'beastside-3d-hero-banner' ),
				'status'  => $meshopt_config ? 'ok' : 'warn',
				'details' => $meshopt_config ? __( 'Meshopt decoder detected.', 'beastside-3d-hero-banner' ) : __( 'meshopt_decoder.js missing at assets/vendor/meshopt.', 'beastside-3d-hero-banner' ),
			),
			array(
				'label'   => __( 'Elementor Widget Registration', 'beastside-3d-hero-banner' ),
				'status'  => $elementor_ready ? 'ok' : 'warn',
				'details' => $elementor_ready ? __( 'Widget registration hook has run.', 'beastside-3d-hero-banner' ) : __( 'Widget is not registered (Elementor may be inactive).', 'beastside-3d-hero-banner' ),
			),
			array(
				'label'   => __( 'Shortcode Registration', 'beastside-3d-hero-banner' ),
				'status'  => $shortcode_ready ? 'ok' : 'warn',
				'details' => $shortcode_ready ? __( 'Shortcode [beastside_hero_banner] is active.', 'beastside-3d-hero-banner' ) : __( 'Shortcode is not registered.', 'beastside-3d-hero-banner' ),
			),
			array(
				'label'   => __( 'Last Successful Render', 'beastside-3d-hero-banner' ),
				'status'  => $last_success ? 'ok' : 'warn',
				'details' => $last_success ? sprintf( __( 'Last success at %s (UTC).', 'beastside-3d-hero-banner' ), $last_success ) : __( 'No render_success event recorded yet.', 'beastside-3d-hero-banner' ),
			),
			array(
				'label'   => __( 'Last Error Timestamp', 'beastside-3d-hero-banner' ),
				'status'  => $last_error ? 'warn' : 'ok',
				'details' => $last_error ? sprintf( __( 'Last error at %s (UTC).', 'beastside-3d-hero-banner' ), $last_error ) : __( 'No errors recorded yet.', 'beastside-3d-hero-banner' ),
			),
		);
	}

	/**
	 * Remove sensitive fields and sanitize metadata.
	 *
	 * @param mixed $meta Raw metadata.
	 * @param int   $depth Recursion depth.
	 * @return mixed
	 */
	private static function sanitize_meta( $meta, $depth = 0 ) {
		if ( $depth > 4 ) {
			return null;
		}

		if ( is_array( $meta ) ) {
			$clean = array();
			$count = 0;
			foreach ( $meta as $key => $value ) {
				if ( $count >= 40 ) {
					break;
				}

				$clean_key = sanitize_key( (string) $key );
				if ( preg_match( '/password|token|secret|authorization|cookie|email|nonce/i', (string) $clean_key ) ) {
					continue;
				}

				$clean[ $clean_key ] = self::sanitize_meta( $value, $depth + 1 );
				++$count;
			}
			return $clean;
		}

		if ( is_bool( $meta ) || is_int( $meta ) || is_float( $meta ) ) {
			return $meta;
		}

		if ( is_string( $meta ) ) {
			$trimmed = wp_strip_all_tags( $meta );
			if ( filter_var( $trimmed, FILTER_VALIDATE_URL ) ) {
				$parts = wp_parse_url( $trimmed );
				if ( is_array( $parts ) ) {
					$url = '';
					if ( ! empty( $parts['scheme'] ) ) {
						$url .= $parts['scheme'] . '://';
					}
					if ( ! empty( $parts['host'] ) ) {
						$url .= $parts['host'];
					}
					if ( ! empty( $parts['path'] ) ) {
						$url .= $parts['path'];
					}
					return esc_url_raw( $url );
				}
			}
			return sanitize_text_field( substr( $trimmed, 0, 400 ) );
		}

		return null;
	}
}
