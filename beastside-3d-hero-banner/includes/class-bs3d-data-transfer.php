<?php
/**
 * Import/export package workflows.
 *
 * @package Beastside3DHeroBanner
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class BS3D_Data_Transfer {
	const SCHEMA_VERSION = '1.0.0';

	/**
	 * Register hooks.
	 */
	public static function init() {
		add_action( 'admin_post_bs3d_export_package', array( __CLASS__, 'handle_export_package' ) );
		add_action( 'admin_post_bs3d_import_package', array( __CLASS__, 'handle_import_package' ) );
	}

	/**
	 * Render data transfer admin page.
	 */
	public static function render_page() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}

		$banners = get_posts(
			array(
				'post_type'      => 'bs3d_banner',
				'post_status'    => array( 'publish', 'draft' ),
				'posts_per_page' => 300,
				'orderby'        => 'title',
				'order'          => 'ASC',
			)
		);

		$imported = isset( $_GET['imported'] ) ? absint( $_GET['imported'] ) : 0;
		$skipped  = isset( $_GET['skipped'] ) ? absint( $_GET['skipped'] ) : 0;
		$errors   = isset( $_GET['errors'] ) ? absint( $_GET['errors'] ) : 0;
		?>
		<div class="wrap bs3d-admin-wrap">
			<div class="bs3d-page-shell bs3d-page-shell-data-transfer">
				<div class="bs3d-page-header">
					<div>
						<h1><?php esc_html_e( 'Data Transfer', 'beastside-3d-hero-banner' ); ?></h1>
						<p class="bs3d-page-subtitle"><?php esc_html_e( 'Export or import banners, templates, and plugin settings with schema-versioned package support.', 'beastside-3d-hero-banner' ); ?></p>
					</div>
					<span class="bs3d-version-pill"><?php echo esc_html( 'v' . BS3D_VERSION ); ?></span>
				</div>

				<?php if ( isset( $_GET['import_done'] ) && '1' === $_GET['import_done'] ) : ?>
					<div class="notice notice-success is-dismissible">
						<p>
							<?php
							echo esc_html(
								sprintf(
									/* translators: 1 imported, 2 skipped, 3 errors */
									__( 'Import complete. Imported: %1$d, Skipped: %2$d, Errors: %3$d', 'beastside-3d-hero-banner' ),
									$imported,
									$skipped,
									$errors
								)
							);
							?>
						</p>
					</div>
				<?php endif; ?>

				<div class="bs3d-panel">
					<h2><?php esc_html_e( 'Export', 'beastside-3d-hero-banner' ); ?></h2>
					<div class="bs3d-actions">
						<form method="get" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
							<input type="hidden" name="action" value="bs3d_export_package" />
							<input type="hidden" name="mode" value="single" />
							<?php wp_nonce_field( 'bs3d_export_package', 'bs3d_export_nonce' ); ?>
							<select name="banner_id">
								<?php foreach ( $banners as $banner ) : ?>
									<option value="<?php echo esc_attr( (string) $banner->ID ); ?>">
										<?php echo esc_html( $banner->post_title . ' (#' . $banner->ID . ')' ); ?>
									</option>
								<?php endforeach; ?>
							</select>
							<button type="submit" class="button button-primary"><?php esc_html_e( 'Export Single Banner', 'beastside-3d-hero-banner' ); ?></button>
						</form>

						<form method="get" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
							<input type="hidden" name="action" value="bs3d_export_package" />
							<input type="hidden" name="mode" value="bulk" />
							<?php wp_nonce_field( 'bs3d_export_package', 'bs3d_export_nonce' ); ?>
							<button type="submit" class="button"><?php esc_html_e( 'Export Full Package', 'beastside-3d-hero-banner' ); ?></button>
						</form>
					</div>
				</div>

				<div class="bs3d-panel">
					<h2><?php esc_html_e( 'Import', 'beastside-3d-hero-banner' ); ?></h2>
					<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" enctype="multipart/form-data">
						<input type="hidden" name="action" value="bs3d_import_package" />
						<?php wp_nonce_field( 'bs3d_import_package', 'bs3d_import_nonce' ); ?>
						<input type="file" name="bs3d_package_file" accept="application/json,.json" required />
						<select name="conflict_mode">
							<option value="skip"><?php esc_html_e( 'Skip existing by slug', 'beastside-3d-hero-banner' ); ?></option>
							<option value="overwrite_by_slug"><?php esc_html_e( 'Overwrite existing by slug', 'beastside-3d-hero-banner' ); ?></option>
							<option value="import_as_copy"><?php esc_html_e( 'Import as copy', 'beastside-3d-hero-banner' ); ?></option>
						</select>
						<button type="submit" class="button button-primary"><?php esc_html_e( 'Import Package', 'beastside-3d-hero-banner' ); ?></button>
					</form>
				</div>
			</div>
		</div>
		<?php
	}

	/**
	 * Handle export package download.
	 */
	public static function handle_export_package() {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'Unauthorized.', 'beastside-3d-hero-banner' ) );
		}
		check_admin_referer( 'bs3d_export_package', 'bs3d_export_nonce' );

		$mode = isset( $_GET['mode'] ) ? sanitize_key( wp_unslash( $_GET['mode'] ) ) : 'single';
		if ( ! in_array( $mode, array( 'single', 'bulk' ), true ) ) {
			$mode = 'single';
		}

		$banner_id = isset( $_GET['banner_id'] ) ? absint( $_GET['banner_id'] ) : 0;
		$payload   = self::build_export_payload( $mode, $banner_id );

		BS3D_Diagnostics::log(
			array(
				'level'   => 'info',
				'surface' => 'import-export',
				'code'    => 'export_package',
				'message' => 'Package export generated',
				'meta'    => array(
					'mode'      => $mode,
					'banner_id' => $banner_id,
					'banners'   => count( $payload['banners'] ),
					'templates' => count( $payload['templates'] ),
				),
			)
		);

		nocache_headers();
		header( 'Content-Type: application/json; charset=utf-8' );
		header( 'Content-Disposition: attachment; filename=bs3d-package-' . $mode . '-' . gmdate( 'Ymd-His' ) . '.json' );
		echo wp_json_encode( $payload, JSON_PRETTY_PRINT );
		exit;
	}

	/**
	 * Handle import package action.
	 */
	public static function handle_import_package() {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'Unauthorized.', 'beastside-3d-hero-banner' ) );
		}
		check_admin_referer( 'bs3d_import_package', 'bs3d_import_nonce' );

		if ( empty( $_FILES['bs3d_package_file']['tmp_name'] ) ) {
			wp_safe_redirect( add_query_arg( array( 'page' => 'bs3d-data-transfer' ), admin_url( 'admin.php' ) ) );
			exit;
		}

		$conflict_mode = isset( $_POST['conflict_mode'] ) ? sanitize_key( wp_unslash( $_POST['conflict_mode'] ) ) : 'skip';
		if ( ! in_array( $conflict_mode, array( 'skip', 'overwrite_by_slug', 'import_as_copy' ), true ) ) {
			$conflict_mode = 'skip';
		}

		$tmp_file = wp_unslash( $_FILES['bs3d_package_file']['tmp_name'] );
		$json     = file_get_contents( $tmp_file ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
		$payload  = json_decode( (string) $json, true );

		$result = self::import_payload( is_array( $payload ) ? $payload : array(), $conflict_mode );

		BS3D_Diagnostics::log(
			array(
				'level'   => $result['errors'] > 0 ? 'warn' : 'info',
				'surface' => 'import-export',
				'code'    => 'import_package',
				'message' => 'Package import processed',
				'meta'    => array(
					'imported' => $result['imported'],
					'skipped'  => $result['skipped'],
					'errors'   => $result['errors'],
					'mode'     => $conflict_mode,
				),
			)
		);

		wp_safe_redirect(
			add_query_arg(
				array(
					'page'       => 'bs3d-data-transfer',
					'import_done'=> 1,
					'imported'   => $result['imported'],
					'skipped'    => $result['skipped'],
					'errors'     => $result['errors'],
				),
				admin_url( 'admin.php' )
			)
		);
		exit;
	}

	/**
	 * Build export payload.
	 *
	 * @param string $mode single|bulk.
	 * @param int    $banner_id Banner ID for single mode.
	 * @return array<string,mixed>
	 */
	private static function build_export_payload( $mode, $banner_id ) {
		$banners = array();
		if ( 'single' === $mode && $banner_id ) {
			$data = BS3D_Banner_Post_Type::get_banner_data( $banner_id );
			if ( ! empty( $data ) ) {
				$banners[] = self::map_banner_for_export( $data );
			}
		} else {
			$posts = get_posts(
				array(
					'post_type'      => 'bs3d_banner',
					'post_status'    => array( 'publish', 'draft' ),
					'posts_per_page' => 500,
				)
			);
			foreach ( $posts as $post ) {
				$data = BS3D_Banner_Post_Type::get_banner_data( $post->ID );
				if ( ! empty( $data ) ) {
					$banners[] = self::map_banner_for_export( $data );
				}
			}
		}

		$templates = array();
		$template_posts = get_posts(
			array(
				'post_type'      => 'bs3d_template',
				'post_status'    => 'publish',
				'posts_per_page' => 500,
			)
		);
		foreach ( $template_posts as $template ) {
			$payload = BS3D_Template_Post_Type::get_payload( $template->ID );
			if ( empty( $payload ) ) {
				continue;
			}
			$templates[] = array(
				'post' => array(
					'title' => $template->post_title,
					'slug'  => $template->post_name,
					'status'=> $template->post_status,
				),
				'meta' => array(
					'payload' => $payload,
				),
			);
		}

		return array(
			'schemaVersion' => self::SCHEMA_VERSION,
			'exportType'    => $mode,
			'exportedAt'    => gmdate( 'c' ),
			'settings'      => BS3D_Settings::get_settings(),
			'banners'       => $banners,
			'templates'     => $templates,
		);
	}

	/**
	 * Import payload using chosen conflict policy.
	 *
	 * @param array<string,mixed> $payload Package payload.
	 * @param string              $conflict_mode Conflict mode.
	 * @return array<string,int>
	 */
	private static function import_payload( array $payload, $conflict_mode ) {
		$result = array(
			'imported' => 0,
			'skipped'  => 0,
			'errors'   => 0,
		);

		if ( empty( $payload['schemaVersion'] ) || ! is_string( $payload['schemaVersion'] ) ) {
			++$result['errors'];
			return $result;
		}

		if ( ! empty( $payload['settings'] ) && is_array( $payload['settings'] ) ) {
			$sanitized = BS3D_Settings::sanitize_settings( $payload['settings'] );
			update_option( BS3D_Settings::OPTION_KEY, $sanitized, false );
		}

		if ( ! empty( $payload['banners'] ) && is_array( $payload['banners'] ) ) {
			foreach ( $payload['banners'] as $banner_item ) {
				$done = self::import_banner_item( is_array( $banner_item ) ? $banner_item : array(), $conflict_mode );
				$result[ $done ]++;
			}
		}

		if ( ! empty( $payload['templates'] ) && is_array( $payload['templates'] ) ) {
			foreach ( $payload['templates'] as $template_item ) {
				$done = self::import_template_item( is_array( $template_item ) ? $template_item : array(), $conflict_mode );
				$result[ $done ]++;
			}
		}

		return $result;
	}

	/**
	 * Import one banner item.
	 *
	 * @param array<string,mixed> $item Banner item.
	 * @param string              $conflict_mode Conflict mode.
	 * @return string imported|skipped|errors.
	 */
	private static function import_banner_item( array $item, $conflict_mode ) {
		if ( empty( $item['post'] ) || ! is_array( $item['post'] ) || empty( $item['meta'] ) || ! is_array( $item['meta'] ) ) {
			return 'errors';
		}

		$title  = sanitize_text_field( (string) ( $item['post']['title'] ?? __( 'Imported Banner', 'beastside-3d-hero-banner' ) ) );
		$slug   = sanitize_title( (string) ( $item['post']['slug'] ?? '' ) );
		$status = sanitize_key( (string) ( $item['post']['status'] ?? 'draft' ) );
		if ( ! in_array( $status, array( 'publish', 'draft', 'pending', 'private' ), true ) ) {
			$status = 'draft';
		}

		$existing = $slug ? get_page_by_path( $slug, OBJECT, 'bs3d_banner' ) : null;
		$post_id  = 0;

		if ( $existing ) {
			if ( 'skip' === $conflict_mode ) {
				return 'skipped';
			}

			if ( 'overwrite_by_slug' === $conflict_mode ) {
				$post_id = (int) $existing->ID;
				wp_update_post(
					array(
						'ID'          => $post_id,
						'post_title'  => $title,
						'post_status' => $status,
					)
				);
			}
		}

		if ( ! $post_id ) {
			$insert_slug = $slug;
			if ( 'import_as_copy' === $conflict_mode && $slug ) {
				$insert_slug = wp_unique_post_slug( $slug . '-copy', 0, $status, 'bs3d_banner', 0 );
			}

			$post_id = wp_insert_post(
				array(
					'post_type'   => 'bs3d_banner',
					'post_status' => $status,
					'post_title'  => $title,
					'post_name'   => $insert_slug,
				),
				true
			);
			if ( is_wp_error( $post_id ) ) {
				return 'errors';
			}
			$post_id = (int) $post_id;
		}

		$meta = $item['meta'];
		$scene = isset( $meta['scene_config'] ) && is_array( $meta['scene_config'] ) ? $meta['scene_config'] : BS3D_Banner_Post_Type::default_scene_config();
		$scene = BS3D_Banner_Post_Type::sanitize_scene_config( $scene );

		update_post_meta( $post_id, '_bs3d_scene_config', wp_json_encode( $scene ) );
		update_post_meta( $post_id, '_bs3d_debug_override', sanitize_key( (string) ( $meta['debug_override'] ?? 'inherit' ) ) );
		update_post_meta( $post_id, '_bs3d_poster_url', esc_url_raw( (string) ( $meta['poster_url'] ?? '' ) ) );
		update_post_meta( $post_id, '_bs3d_quality_profile', sanitize_key( (string) ( $meta['quality'] ?? 'balanced' ) ) );
		update_post_meta( $post_id, '_bs3d_mobile_mode', sanitize_key( (string) ( $meta['mobile_mode'] ?? 'adaptive' ) ) );
		$viewport_mode = sanitize_key( (string) ( $meta['viewport_mode'] ?? 'standard' ) );
		if ( ! in_array( $viewport_mode, array( 'standard', 'fullscreen' ), true ) ) {
			$viewport_mode = 'standard';
		}
		update_post_meta( $post_id, '_bs3d_viewport_mode', $viewport_mode );

		BS3D_Version_Manager::create_snapshot( $post_id, 'import' );
		return 'imported';
	}

	/**
	 * Import one template item.
	 *
	 * @param array<string,mixed> $item Template item.
	 * @param string              $conflict_mode Conflict mode.
	 * @return string imported|skipped|errors.
	 */
	private static function import_template_item( array $item, $conflict_mode ) {
		if ( empty( $item['post'] ) || ! is_array( $item['post'] ) || empty( $item['meta'] ) || ! is_array( $item['meta'] ) ) {
			return 'errors';
		}

		$title  = sanitize_text_field( (string) ( $item['post']['title'] ?? __( 'Imported Template', 'beastside-3d-hero-banner' ) ) );
		$slug   = sanitize_title( (string) ( $item['post']['slug'] ?? '' ) );
		$status = sanitize_key( (string) ( $item['post']['status'] ?? 'publish' ) );
		if ( ! in_array( $status, array( 'publish', 'draft', 'pending', 'private' ), true ) ) {
			$status = 'publish';
		}

		$existing = $slug ? get_page_by_path( $slug, OBJECT, 'bs3d_template' ) : null;
		$post_id  = 0;

		if ( $existing ) {
			if ( 'skip' === $conflict_mode ) {
				return 'skipped';
			}
			if ( 'overwrite_by_slug' === $conflict_mode ) {
				$post_id = (int) $existing->ID;
				wp_update_post(
					array(
						'ID'          => $post_id,
						'post_title'  => $title,
						'post_status' => $status,
					)
				);
			}
		}

		if ( ! $post_id ) {
			$insert_slug = $slug;
			if ( 'import_as_copy' === $conflict_mode && $slug ) {
				$insert_slug = wp_unique_post_slug( $slug . '-copy', 0, $status, 'bs3d_template', 0 );
			}
			$post_id = wp_insert_post(
				array(
					'post_type'   => 'bs3d_template',
					'post_status' => $status,
					'post_title'  => $title,
					'post_name'   => $insert_slug,
				),
				true
			);
			if ( is_wp_error( $post_id ) ) {
				return 'errors';
			}
			$post_id = (int) $post_id;
		}

		$payload = isset( $item['meta']['payload'] ) && is_array( $item['meta']['payload'] ) ? $item['meta']['payload'] : array();
		if ( ! empty( $payload['scene'] ) && is_array( $payload['scene'] ) ) {
			$payload['scene'] = BS3D_Banner_Post_Type::sanitize_scene_config( $payload['scene'] );
		}
		update_post_meta( $post_id, '_bs3d_template_payload', wp_json_encode( $payload ) );
		return 'imported';
	}

	/**
	 * Convert banner data to export shape.
	 *
	 * @param array<string,mixed> $data Banner data.
	 * @return array<string,mixed>
	 */
	private static function map_banner_for_export( array $data ) {
		return array(
			'post' => array(
				'title'  => $data['title'],
				'slug'   => $data['slug'],
				'status' => isset( $data['status'] ) ? $data['status'] : 'publish',
			),
			'meta' => array(
				'scene_config'   => isset( $data['scene'] ) && is_array( $data['scene'] ) ? $data['scene'] : array(),
				'debug_override' => $data['debug_override'],
				'poster_url'     => $data['poster_url'],
				'quality'        => $data['quality'],
				'mobile_mode'    => $data['mobile_mode'],
				'viewport_mode'  => isset( $data['viewport_mode'] ) ? $data['viewport_mode'] : 'standard',
			),
		);
	}
}
