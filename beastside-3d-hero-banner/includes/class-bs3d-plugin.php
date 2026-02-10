<?php
/**
 * Plugin bootstrap wiring.
 *
 * @package Beastside3DHeroBanner
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class BS3D_Plugin {
	/**
	 * Singleton instance.
	 *
	 * @var BS3D_Plugin|null
	 */
	private static $instance = null;

	/**
	 * Get singleton instance.
	 */
	public static function instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Register runtime hooks.
	 */
	public function init() {
		BS3D_Settings::init();
		BS3D_Diagnostics::init();
		BS3D_Banner_Post_Type::init();
		BS3D_Template_Post_Type::init();
		BS3D_Version_Manager::init();
		BS3D_Data_Transfer::init();
		BS3D_Renderer::init();

		add_action( 'admin_menu', array( $this, 'register_admin_menu' ) );
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_admin_assets' ) );
		add_action( 'admin_post_bs3d_clear_logs', array( $this, 'handle_clear_logs' ) );
		add_action( 'admin_post_bs3d_export_logs', array( $this, 'handle_export_logs' ) );
		add_action( 'admin_post_bs3d_duplicate_banner', array( $this, 'handle_duplicate_banner' ) );
		add_action( 'init', array( $this, 'run_startup_checks' ), 50 );
		add_action( 'elementor/widgets/register', array( $this, 'register_elementor_widget' ) );
		add_action( 'init', array( $this, 'track_shortcode_registration' ) );
	}

	/**
	 * Activation callback.
	 */
	public static function activate() {
		BS3D_Settings::ensure_defaults();
		BS3D_Diagnostics::install();
		BS3D_Diagnostics::schedule_cleanup();
		BS3D_Banner_Post_Type::register_post_type();
		BS3D_Template_Post_Type::register_post_type();
		BS3D_Version_Manager::register_post_type();
		flush_rewrite_rules();
	}

	/**
	 * Deactivation callback.
	 */
	public static function deactivate() {
		BS3D_Diagnostics::unschedule_cleanup();
		flush_rewrite_rules();
	}

	/**
	 * Register admin menu pages.
	 */
	public function register_admin_menu() {
		add_menu_page(
			__( 'BS3D Hero Banner', 'beastside-3d-hero-banner' ),
			__( 'BS3D Hero Banner', 'beastside-3d-hero-banner' ),
			'manage_options',
			'bs3d-settings',
			array( $this, 'render_settings_page' ),
			'dashicons-images-alt2',
			57
		);

		add_submenu_page(
			'bs3d-settings',
			__( 'Settings', 'beastside-3d-hero-banner' ),
			__( 'Settings', 'beastside-3d-hero-banner' ),
			'manage_options',
			'bs3d-settings',
			array( $this, 'render_settings_page' )
		);

		add_submenu_page(
			'bs3d-settings',
			__( 'Banners', 'beastside-3d-hero-banner' ),
			__( 'Banners', 'beastside-3d-hero-banner' ),
			'manage_options',
			'edit.php?post_type=bs3d_banner'
		);

		add_submenu_page(
			'bs3d-settings',
			__( 'Templates', 'beastside-3d-hero-banner' ),
			__( 'Templates', 'beastside-3d-hero-banner' ),
			'manage_options',
			'edit.php?post_type=bs3d_template'
		);

		add_submenu_page(
			'bs3d-settings',
			__( 'Diagnostics', 'beastside-3d-hero-banner' ),
			__( 'Diagnostics', 'beastside-3d-hero-banner' ),
			'manage_options',
			'bs3d-diagnostics',
			array( $this, 'render_diagnostics_page' )
		);

		add_submenu_page(
			'bs3d-settings',
			__( 'Data Transfer', 'beastside-3d-hero-banner' ),
			__( 'Data Transfer', 'beastside-3d-hero-banner' ),
			'manage_options',
			'bs3d-data-transfer',
			array( 'BS3D_Data_Transfer', 'render_page' )
		);
	}

	/**
	 * Enqueue admin CSS.
	 *
	 * @param string $hook_suffix Current admin hook.
	 */
	public function enqueue_admin_assets( $hook_suffix ) {
		$screen = get_current_screen();
		if ( ! $screen ) {
			return;
		}

		$page = isset( $_GET['page'] ) ? sanitize_key( wp_unslash( $_GET['page'] ) ) : '';
		if ( in_array( $page, array( 'bs3d-settings', 'bs3d-diagnostics' ), true ) || 'bs3d_banner' === $screen->post_type || false !== strpos( $hook_suffix, 'bs3d' ) ) {
			$admin_css_path    = BS3D_PLUGIN_DIR . 'assets/css/admin.css';
			$admin_css_version = file_exists( $admin_css_path ) ? BS3D_VERSION . '.' . (string) filemtime( $admin_css_path ) : BS3D_VERSION;
			wp_enqueue_style(
				'bs3d-admin',
				BS3D_PLUGIN_URL . 'assets/css/admin.css',
				array(),
				$admin_css_version
			);
		}

		if ( 'bs3d_banner' === $screen->post_type && in_array( $screen->base, array( 'post', 'post-new' ), true ) ) {
			wp_enqueue_media();
			BS3D_Renderer::enqueue_assets( true );
			$composer_js_path    = BS3D_PLUGIN_DIR . 'assets/js/admin-composer.js';
			$composer_js_version = file_exists( $composer_js_path ) ? BS3D_VERSION . '.' . (string) filemtime( $composer_js_path ) : BS3D_VERSION;
			wp_enqueue_script(
				'bs3d-admin-composer',
				BS3D_PLUGIN_URL . 'assets/js/admin-composer.js',
				array( 'bs3d-frontend' ),
				$composer_js_version,
				true
			);
		}
	}

	/**
	 * Render settings page.
	 */
	public function render_settings_page() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		?>
		<div class="wrap bs3d-admin-wrap">
			<div class="bs3d-page-shell bs3d-page-shell-settings">
				<div class="bs3d-page-header">
					<div>
						<h1><?php esc_html_e( 'Beastside 3D Hero Banner Settings', 'beastside-3d-hero-banner' ); ?></h1>
						<p class="bs3d-page-subtitle"><?php esc_html_e( 'Configure global diagnostics, overlay visibility, and debugging defaults for every banner.', 'beastside-3d-hero-banner' ); ?></p>
					</div>
					<span class="bs3d-version-pill"><?php echo esc_html( 'v' . BS3D_VERSION ); ?></span>
				</div>

				<div class="bs3d-panel">
					<form method="post" action="options.php" class="bs3d-settings-form">
						<?php
						settings_fields( 'bs3d_settings_group' );
						do_settings_sections( 'bs3d-settings' );
						submit_button( __( 'Save Settings', 'beastside-3d-hero-banner' ) );
						?>
					</form>
				</div>
			</div>
		</div>
		<?php
	}

	/**
	 * Render diagnostics page.
	 */
	public function render_diagnostics_page() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}

		$filters = array(
			'level'     => isset( $_GET['level'] ) ? sanitize_key( wp_unslash( $_GET['level'] ) ) : '',
			'surface'   => isset( $_GET['surface'] ) ? sanitize_key( wp_unslash( $_GET['surface'] ) ) : '',
			'banner_id' => isset( $_GET['banner_id'] ) ? absint( $_GET['banner_id'] ) : 0,
			'slug'      => isset( $_GET['slug'] ) ? sanitize_title( wp_unslash( $_GET['slug'] ) ) : '',
		);

		$statuses = BS3D_Diagnostics::get_status_checks();
		$logs     = BS3D_Diagnostics::query_logs( $filters, 250 );
		?>
		<div class="wrap bs3d-admin-wrap">
			<div class="bs3d-page-shell bs3d-page-shell-diagnostics">
				<div class="bs3d-page-header">
					<div>
						<h1><?php esc_html_e( 'Diagnostics', 'beastside-3d-hero-banner' ); ?></h1>
						<p class="bs3d-page-subtitle"><?php esc_html_e( 'Track runtime health, inspect logs, and export troubleshooting data for support workflows.', 'beastside-3d-hero-banner' ); ?></p>
					</div>
					<span class="bs3d-version-pill"><?php echo esc_html( 'v' . BS3D_VERSION ); ?></span>
				</div>

				<?php if ( isset( $_GET['cleared'] ) && '1' === $_GET['cleared'] ) : ?>
					<div class="notice notice-success is-dismissible"><p><?php esc_html_e( 'Diagnostics logs cleared.', 'beastside-3d-hero-banner' ); ?></p></div>
				<?php endif; ?>

				<div class="bs3d-panel">
					<div class="bs3d-status-grid">
						<?php foreach ( $statuses as $status ) : ?>
							<div class="bs3d-status-card bs3d-status-<?php echo esc_attr( $status['status'] ); ?>">
								<h3><?php echo esc_html( $status['label'] ); ?></h3>
								<p><?php echo esc_html( $status['details'] ); ?></p>
							</div>
						<?php endforeach; ?>
					</div>
				</div>

				<div class="bs3d-panel">
					<h2><?php esc_html_e( 'Log Filters', 'beastside-3d-hero-banner' ); ?></h2>
					<form method="get" class="bs3d-filter-form">
						<input type="hidden" name="page" value="bs3d-diagnostics" />
						<select name="level">
							<option value=""><?php esc_html_e( 'All Levels', 'beastside-3d-hero-banner' ); ?></option>
							<option value="info" <?php selected( 'info', $filters['level'] ); ?>>info</option>
							<option value="warn" <?php selected( 'warn', $filters['level'] ); ?>>warn</option>
							<option value="error" <?php selected( 'error', $filters['level'] ); ?>>error</option>
						</select>
						<select name="surface">
							<option value=""><?php esc_html_e( 'All Contexts', 'beastside-3d-hero-banner' ); ?></option>
							<option value="admin-preview" <?php selected( 'admin-preview', $filters['surface'] ); ?>>admin-preview</option>
							<option value="frontend" <?php selected( 'frontend', $filters['surface'] ); ?>>frontend</option>
							<option value="elementor" <?php selected( 'elementor', $filters['surface'] ); ?>>elementor</option>
							<option value="shortcode" <?php selected( 'shortcode', $filters['surface'] ); ?>>shortcode</option>
							<option value="import-export" <?php selected( 'import-export', $filters['surface'] ); ?>>import-export</option>
							<option value="startup" <?php selected( 'startup', $filters['surface'] ); ?>>startup</option>
						</select>
						<input type="number" name="banner_id" placeholder="<?php esc_attr_e( 'Banner ID', 'beastside-3d-hero-banner' ); ?>" value="<?php echo esc_attr( $filters['banner_id'] ?: '' ); ?>" />
						<input type="text" name="slug" placeholder="<?php esc_attr_e( 'Slug', 'beastside-3d-hero-banner' ); ?>" value="<?php echo esc_attr( $filters['slug'] ); ?>" />
						<button type="submit" class="button"><?php esc_html_e( 'Apply', 'beastside-3d-hero-banner' ); ?></button>
					</form>

					<div class="bs3d-actions">
						<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
							<input type="hidden" name="action" value="bs3d_clear_logs" />
							<?php wp_nonce_field( 'bs3d_clear_logs' ); ?>
							<button type="submit" class="button button-secondary"><?php esc_html_e( 'Clear Logs', 'beastside-3d-hero-banner' ); ?></button>
						</form>

						<form method="get" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
							<input type="hidden" name="action" value="bs3d_export_logs" />
							<?php wp_nonce_field( 'bs3d_export_logs', 'bs3d_export_nonce' ); ?>
							<input type="hidden" name="level" value="<?php echo esc_attr( $filters['level'] ); ?>" />
							<input type="hidden" name="surface" value="<?php echo esc_attr( $filters['surface'] ); ?>" />
							<input type="hidden" name="banner_id" value="<?php echo esc_attr( (string) $filters['banner_id'] ); ?>" />
							<input type="hidden" name="slug" value="<?php echo esc_attr( $filters['slug'] ); ?>" />
							<button type="submit" class="button button-primary"><?php esc_html_e( 'Export Diagnostics JSON', 'beastside-3d-hero-banner' ); ?></button>
						</form>
					</div>
				</div>

				<div class="bs3d-panel">
					<h2><?php esc_html_e( 'Recent Logs', 'beastside-3d-hero-banner' ); ?></h2>
					<table class="widefat striped bs3d-log-table">
						<thead>
						<tr>
							<th><?php esc_html_e( 'Timestamp (UTC)', 'beastside-3d-hero-banner' ); ?></th>
							<th><?php esc_html_e( 'Level', 'beastside-3d-hero-banner' ); ?></th>
							<th><?php esc_html_e( 'Context', 'beastside-3d-hero-banner' ); ?></th>
							<th><?php esc_html_e( 'Banner', 'beastside-3d-hero-banner' ); ?></th>
							<th><?php esc_html_e( 'Code', 'beastside-3d-hero-banner' ); ?></th>
							<th><?php esc_html_e( 'Message', 'beastside-3d-hero-banner' ); ?></th>
							<th><?php esc_html_e( 'Meta', 'beastside-3d-hero-banner' ); ?></th>
						</tr>
						</thead>
						<tbody>
						<?php if ( empty( $logs ) ) : ?>
							<tr><td colspan="7"><?php esc_html_e( 'No logs found for current filters.', 'beastside-3d-hero-banner' ); ?></td></tr>
						<?php else : ?>
							<?php foreach ( $logs as $row ) : ?>
								<tr>
									<td><?php echo esc_html( (string) $row['created_at'] ); ?></td>
									<td><span class="bs3d-level bs3d-level-<?php echo esc_attr( (string) $row['level'] ); ?>"><?php echo esc_html( (string) $row['level'] ); ?></span></td>
									<td><?php echo esc_html( (string) $row['surface'] ); ?></td>
									<td>
										<?php
										$banner_label = ! empty( $row['banner_id'] ) ? '#' . (int) $row['banner_id'] : '-';
										if ( ! empty( $row['slug'] ) ) {
											$banner_label .= ' / ' . (string) $row['slug'];
										}
										echo esc_html( $banner_label );
										?>
									</td>
									<td><?php echo esc_html( (string) $row['code'] ); ?></td>
									<td><?php echo esc_html( (string) $row['message'] ); ?></td>
									<td><code><?php echo esc_html( (string) $row['meta'] ); ?></code></td>
								</tr>
							<?php endforeach; ?>
						<?php endif; ?>
						</tbody>
					</table>
				</div>
			</div>
		</div>
		<?php
	}

	/**
	 * Clear logs action.
	 */
	public function handle_clear_logs() {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'Unauthorized.', 'beastside-3d-hero-banner' ) );
		}

		check_admin_referer( 'bs3d_clear_logs' );
		BS3D_Diagnostics::clear_logs();

		wp_safe_redirect(
			add_query_arg(
				array(
					'page'    => 'bs3d-diagnostics',
					'cleared' => 1,
				),
				admin_url( 'admin.php' )
			)
		);
		exit;
	}

	/**
	 * Export logs action.
	 */
	public function handle_export_logs() {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'Unauthorized.', 'beastside-3d-hero-banner' ) );
		}

		check_admin_referer( 'bs3d_export_logs', 'bs3d_export_nonce' );

		$filters = array(
			'level'     => isset( $_GET['level'] ) ? sanitize_key( wp_unslash( $_GET['level'] ) ) : '',
			'surface'   => isset( $_GET['surface'] ) ? sanitize_key( wp_unslash( $_GET['surface'] ) ) : '',
			'banner_id' => isset( $_GET['banner_id'] ) ? absint( $_GET['banner_id'] ) : 0,
			'slug'      => isset( $_GET['slug'] ) ? sanitize_title( wp_unslash( $_GET['slug'] ) ) : '',
		);
		$logs = BS3D_Diagnostics::query_logs( $filters, 2000 );

		nocache_headers();
		header( 'Content-Type: application/json; charset=utf-8' );
		header( 'Content-Disposition: attachment; filename=bs3d-diagnostics-' . gmdate( 'Ymd-His' ) . '.json' );

		echo wp_json_encode(
			array(
				'exportedAt' => gmdate( 'c' ),
				'filters'    => $filters,
				'records'    => $logs,
			),
			JSON_PRETTY_PRINT
		);
		exit;
	}

	/**
	 * Duplicate a banner post and all relevant metadata.
	 */
	public function handle_duplicate_banner() {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'Unauthorized.', 'beastside-3d-hero-banner' ) );
		}

		$banner_id = isset( $_GET['banner_id'] ) ? absint( $_GET['banner_id'] ) : 0;
		check_admin_referer( 'bs3d_duplicate_banner_' . $banner_id );

		$banner = get_post( $banner_id );
		if ( ! $banner || 'bs3d_banner' !== $banner->post_type ) {
			wp_safe_redirect( admin_url( 'edit.php?post_type=bs3d_banner' ) );
			exit;
		}

		$new_id = wp_insert_post(
			array(
				'post_type'   => 'bs3d_banner',
				'post_status' => 'draft',
				'post_title'  => $banner->post_title . ' (Copy)',
			),
			true
		);

		if ( is_wp_error( $new_id ) ) {
			wp_safe_redirect( admin_url( 'edit.php?post_type=bs3d_banner' ) );
			exit;
		}

		$meta_keys = array(
			'_bs3d_scene_config',
			'_bs3d_debug_override',
			'_bs3d_poster_url',
			'_bs3d_quality_profile',
			'_bs3d_mobile_mode',
			'_bs3d_viewport_mode',
		);
		foreach ( $meta_keys as $key ) {
			update_post_meta( $new_id, $key, get_post_meta( $banner_id, $key, true ) );
		}

		BS3D_Version_Manager::create_snapshot( $new_id, 'duplicate' );

		wp_safe_redirect( admin_url( 'post.php?action=edit&post=' . (int) $new_id ) );
		exit;
	}

	/**
	 * Startup check logging for critical setup gaps.
	 */
	public function run_startup_checks() {
		$checks = BS3D_Diagnostics::get_status_checks();
		$warns  = array();

		foreach ( $checks as $check ) {
			if ( 'warn' === $check['status'] ) {
				$warns[] = $check['label'] . ':' . $check['details'];
			}
		}

		$new_hash = md5( implode( '|', $warns ) );
		$old_hash = (string) get_option( 'bs3d_startup_warn_hash', '' );

		if ( $new_hash && $new_hash !== $old_hash ) {
			foreach ( $warns as $warn ) {
				BS3D_Diagnostics::log_startup_warning(
					'startup_check_warning',
					$warn,
					array(
						'hook' => 'init',
					)
				);
			}
			update_option( 'bs3d_startup_warn_hash', $new_hash, false );
		}
	}

	/**
	 * Register Elementor widget.
	 *
	 * @param mixed $widgets_manager Elementor manager.
	 */
	public function register_elementor_widget( $widgets_manager ) {
		if ( ! class_exists( '\Elementor\Widget_Base' ) ) {
			update_option( 'bs3d_elementor_widget_registered', false, false );
			return;
		}

		require_once BS3D_PLUGIN_DIR . 'includes/class-bs3d-elementor-widget.php';
		if ( ! class_exists( 'BS3D_Elementor_Widget' ) ) {
			update_option( 'bs3d_elementor_widget_registered', false, false );
			return;
		}

		$widgets_manager->register( new BS3D_Elementor_Widget() );
		update_option( 'bs3d_elementor_widget_registered', true, false );
	}

	/**
	 * Track shortcode state for diagnostics.
	 */
	public function track_shortcode_registration() {
		update_option( 'bs3d_shortcode_registered', shortcode_exists( 'beastside_hero_banner' ), false );
	}
}
