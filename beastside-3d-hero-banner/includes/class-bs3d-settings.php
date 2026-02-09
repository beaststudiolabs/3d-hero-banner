<?php
/**
 * Settings management.
 *
 * @package Beastside3DHeroBanner
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class BS3D_Settings {
	const OPTION_KEY = 'bs3d_settings';

	/**
	 * Register hooks.
	 */
	public static function init() {
		add_action( 'admin_init', array( __CLASS__, 'register_settings' ) );
	}

	/**
	 * Ensure default settings exist.
	 */
	public static function ensure_defaults() {
		if ( false === get_option( self::OPTION_KEY ) ) {
			add_option( self::OPTION_KEY, self::defaults(), '', false );
		}
	}

	/**
	 * Default settings.
	 *
	 * @return array<string,mixed>
	 */
	public static function defaults() {
		return array(
			'debug_enabled'         => true,
			'debug_verbosity'       => 'normal',
			'debug_overlay_enabled' => true,
			'debug_retention_days'  => 14,
		);
	}

	/**
	 * Register WP settings and fields.
	 */
	public static function register_settings() {
		register_setting(
			'bs3d_settings_group',
			self::OPTION_KEY,
			array(
				'type'              => 'array',
				'sanitize_callback' => array( __CLASS__, 'sanitize_settings' ),
				'default'           => self::defaults(),
			)
		);

		add_settings_section(
			'bs3d_debug_section',
			__( 'Debug Controls', 'beastside-3d-hero-banner' ),
			function() {
				echo '<p>' . esc_html__( 'Diagnostics are enabled by default so setup issues are visible immediately.', 'beastside-3d-hero-banner' ) . '</p>';
			},
			'bs3d-settings'
		);

		add_settings_field(
			'bs3d_debug_enabled',
			__( 'Debug Mode', 'beastside-3d-hero-banner' ),
			array( __CLASS__, 'render_debug_enabled_field' ),
			'bs3d-settings',
			'bs3d_debug_section'
		);

		add_settings_field(
			'bs3d_debug_verbosity',
			__( 'Verbosity', 'beastside-3d-hero-banner' ),
			array( __CLASS__, 'render_debug_verbosity_field' ),
			'bs3d-settings',
			'bs3d_debug_section'
		);

		add_settings_field(
			'bs3d_debug_overlay_enabled',
			__( 'Overlay Enabled', 'beastside-3d-hero-banner' ),
			array( __CLASS__, 'render_debug_overlay_field' ),
			'bs3d-settings',
			'bs3d_debug_section'
		);

		add_settings_field(
			'bs3d_debug_retention_days',
			__( 'Retention (Days)', 'beastside-3d-hero-banner' ),
			array( __CLASS__, 'render_retention_field' ),
			'bs3d-settings',
			'bs3d_debug_section'
		);
	}

	/**
	 * Sanitize settings values.
	 *
	 * @param mixed $input Raw settings input.
	 * @return array<string,mixed>
	 */
	public static function sanitize_settings( $input ) {
		$defaults = self::defaults();
		$output   = is_array( $input ) ? $input : array();

		$verbosity = isset( $output['debug_verbosity'] ) ? sanitize_key( (string) $output['debug_verbosity'] ) : $defaults['debug_verbosity'];
		if ( ! in_array( $verbosity, array( 'errors', 'normal', 'verbose' ), true ) ) {
			$verbosity = $defaults['debug_verbosity'];
		}

		return array(
			'debug_enabled'         => ! empty( $output['debug_enabled'] ),
			'debug_verbosity'       => $verbosity,
			'debug_overlay_enabled' => ! empty( $output['debug_overlay_enabled'] ),
			'debug_retention_days'  => 14,
		);
	}

	/**
	 * Get full settings with defaults merged.
	 *
	 * @return array<string,mixed>
	 */
	public static function get_settings() {
		$stored = get_option( self::OPTION_KEY, array() );
		if ( ! is_array( $stored ) ) {
			$stored = array();
		}

		return wp_parse_args( $stored, self::defaults() );
	}

	/**
	 * Get one setting key.
	 *
	 * @param string $key Key name.
	 * @return mixed
	 */
	public static function get( $key ) {
		$settings = self::get_settings();
		return $settings[ $key ] ?? null;
	}

	/**
	 * Resolve effective debug mode from global toggle + per-banner override.
	 *
	 * @param string $override inherit|on|off.
	 */
	public static function resolve_debug_enabled( $override = 'inherit' ) {
		$override = sanitize_key( $override );
		if ( 'on' === $override ) {
			return true;
		}
		if ( 'off' === $override ) {
			return false;
		}

		return ! empty( self::get( 'debug_enabled' ) );
	}

	/**
	 * Get retention days.
	 */
	public static function get_retention_days() {
		return 14;
	}

	/**
	 * Render field: debug enabled.
	 */
	public static function render_debug_enabled_field() {
		$settings = self::get_settings();
		?>
		<label>
			<input type="checkbox" name="<?php echo esc_attr( self::OPTION_KEY ); ?>[debug_enabled]" value="1" <?php checked( ! empty( $settings['debug_enabled'] ) ); ?> />
			<?php esc_html_e( 'Enable debug diagnostics globally', 'beastside-3d-hero-banner' ); ?>
		</label>
		<?php
	}

	/**
	 * Render field: verbosity.
	 */
	public static function render_debug_verbosity_field() {
		$settings  = self::get_settings();
		$verbosity = isset( $settings['debug_verbosity'] ) ? $settings['debug_verbosity'] : 'normal';
		?>
		<select name="<?php echo esc_attr( self::OPTION_KEY ); ?>[debug_verbosity]">
			<option value="errors" <?php selected( 'errors', $verbosity ); ?>><?php esc_html_e( 'Errors Only', 'beastside-3d-hero-banner' ); ?></option>
			<option value="normal" <?php selected( 'normal', $verbosity ); ?>><?php esc_html_e( 'Normal', 'beastside-3d-hero-banner' ); ?></option>
			<option value="verbose" <?php selected( 'verbose', $verbosity ); ?>><?php esc_html_e( 'Verbose', 'beastside-3d-hero-banner' ); ?></option>
		</select>
		<?php
	}

	/**
	 * Render field: overlay.
	 */
	public static function render_debug_overlay_field() {
		$settings = self::get_settings();
		?>
		<label>
			<input type="checkbox" name="<?php echo esc_attr( self::OPTION_KEY ); ?>[debug_overlay_enabled]" value="1" <?php checked( ! empty( $settings['debug_overlay_enabled'] ) ); ?> />
			<?php esc_html_e( 'Show frontend debug overlay for logged-in admins', 'beastside-3d-hero-banner' ); ?>
		</label>
		<?php
	}

	/**
	 * Render field: retention.
	 */
	public static function render_retention_field() {
		?>
		<input type="number" value="14" readonly class="small-text" />
		<p class="description"><?php esc_html_e( 'Fixed to 14 days in v1.', 'beastside-3d-hero-banner' ); ?></p>
		<?php
	}
}
