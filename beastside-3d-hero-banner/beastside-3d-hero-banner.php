<?php
/**
 * Plugin Name: Beastside 3D Hero Banner
 * Description: 3D hero banner plugin with diagnostics, debug overlay, Elementor widget, and shortcode support.
 * Version: 0.2.0
 * Author: Beastside
 * Text Domain: beastside-3d-hero-banner
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'BS3D_VERSION', '0.2.0' );
define( 'BS3D_PLUGIN_FILE', __FILE__ );
define( 'BS3D_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'BS3D_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

require_once BS3D_PLUGIN_DIR . 'includes/class-bs3d-settings.php';
require_once BS3D_PLUGIN_DIR . 'includes/class-bs3d-diagnostics.php';
require_once BS3D_PLUGIN_DIR . 'includes/class-bs3d-banner-post-type.php';
require_once BS3D_PLUGIN_DIR . 'includes/class-bs3d-template-post-type.php';
require_once BS3D_PLUGIN_DIR . 'includes/class-bs3d-version-manager.php';
require_once BS3D_PLUGIN_DIR . 'includes/class-bs3d-data-transfer.php';
require_once BS3D_PLUGIN_DIR . 'includes/class-bs3d-renderer.php';
require_once BS3D_PLUGIN_DIR . 'includes/class-bs3d-plugin.php';

register_activation_hook( __FILE__, array( 'BS3D_Plugin', 'activate' ) );
register_deactivation_hook( __FILE__, array( 'BS3D_Plugin', 'deactivate' ) );

BS3D_Plugin::instance()->init();

if ( ! function_exists( 'beastside_render_banner' ) ) {
	/**
	 * Render helper API for theme/plugin integration.
	 *
	 * @param array<string,mixed> $args Render args.
	 */
	function beastside_render_banner( array $args = array() ) {
		return BS3D_Renderer::render_banner_from_args( $args );
	}
}
