<?php
/**
 * Uninstall handler.
 *
 * @package Beastside3DHeroBanner
 */

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

$timestamp = wp_next_scheduled( 'bs3d_cleanup_diagnostics_daily' );
if ( $timestamp ) {
	wp_unschedule_event( $timestamp, 'bs3d_cleanup_diagnostics_daily' );
}
