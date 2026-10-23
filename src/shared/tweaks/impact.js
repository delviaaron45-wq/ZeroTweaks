"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_IMPACT = exports.tweakImpact = void 0;
exports.getTweakImpact = getTweakImpact;
exports.isFineTune = isFineTune;
/**
 * Impact map per tweak id.
 *
 * ALTO  -> Real, measurable gains on this machine class (refresh rate, XMP/EXPO,
 *          dedicated GPU selection, thermal throttling).
 * MEDIO -> Measurable but smaller / hardware dependent (power plan, network,
 *          driver, startup apps, storage).
 * BAJO  -> Community "fine tuning" whose effect is small or unproven. These go
 *          into the "Ajustes finos" card and are disabled by default.
 */
exports.tweakImpact = {
    // ---- system_performance ----
    'system.win32priorityseparation': 'bajo',
    'system.systemresponsiveness': 'bajo',
    'system.mmcss_games': 'medio',
    'system.networkthrottling': 'bajo',
    'system.networkthrottlingindex': 'bajo',
    // ---- gaming_fps ----
    'gaming.disable_gamedvr': 'medio',
    'gaming.game_mode': 'medio',
    'gaming.cpu_priority_high': 'medio',
    // ---- gpu ----
    'gpu.hags': 'medio',
    'gpu.preference_high_perf': 'alto',
    'gpu.disable_fullscreen_opt': 'bajo',
    'gpu.disable_mpo': 'medio',
    'gpu.vrr_windowed': 'medio',
    'gpu.nvidia_low_latency': 'alto',
    'gpu.nvidia_power_mgmt': 'medio',
    'gpu.nvidia_shader_cache': 'bajo',
    'gpu.amd_anti_lag': 'alto',
    'gpu.amd_chill': 'bajo',
    'gpu.intel_power': 'bajo',
    'gpu.resizable_bar': 'medio',
    // ---- network_tcp ----
    'network.disable_nagle': 'bajo',
    'network.tcp_autotuning': 'bajo',
    'network.ecn': 'bajo',
    'network.rss': 'bajo',
    'network.adapter_power_save': 'medio',
    'network.bandwidth_reservation': 'bajo',
    // ---- power_cpu ----
    'power.ultimate_performance': 'alto',
    'power.high_performance': 'alto',
    'power.disable_core_parking': 'medio',
    'power.boost_mode': 'alto',
    'power.pcie_link_off': 'bajo',
    'power.usb_selective_suspend': 'medio',
    'power.hibernate_off': 'medio',
    'power.fast_startup_off': 'bajo',
    // ---- ram_storage ----
    'storage.disable_last_access': 'bajo',
    'storage.trim_status': 'bajo',
    'storage.optimize_volumes': 'bajo',
    'storage.smart_status': 'medio',
    'ram.memory_compression': 'medio',
    'ram.pagefile_system': 'bajo',
    'ram.clear_standby': 'bajo',
    'ram.info_report': 'bajo',
    'ram.xmp_expo': 'alto',
    // ---- peripherals_input ----
    'peripherals.mouse_accel_off': 'bajo',
    'peripherals.mouse_queue': 'bajo',
    'peripherals.keyboard_queue': 'bajo',
    'peripherals.msi_mode_gpu': 'medio',
    'peripherals.msi_mode_network': 'bajo',
    'peripherals.interrupt_affinity': 'bajo',
    'peripherals.hpet_off': 'bajo',
    'peripherals.dynamic_tick_disable': 'bajo',
    'peripherals.usb_polling': 'bajo',
    'peripherals.timer_resolution': 'alto',
    // ---- debloat_apps ----
    'debloat.remove_apps': 'medio',
    'debloat.onedrive_autostart': 'bajo',
    'debloat.startup_apps': 'medio',
    'debloat.clean_temp': 'bajo',
    'debloat.xbox_game_bar': 'medio',
    'debloat.discord_overlay': 'bajo',
    // ---- privacy_telemetry ----
    'privacy.telemetry_minimum': 'bajo',
    'privacy.diagtrack': 'bajo',
    'privacy.dmwappush': 'bajo',
    'privacy.advertising_id': 'bajo',
    'privacy.tailored_experiences': 'bajo',
    'privacy.location': 'bajo',
    'privacy.cortana_web': 'bajo',
    'privacy.activity_history': 'bajo',
    // ---- services ----
    'services.sysmain_manual': 'bajo',
    'services.wsearch_manual': 'bajo',
    'services.spooler_manual': 'bajo',
    'services.fax_disabled': 'bajo',
    'services.remote_registry_disabled': 'bajo',
    'services.maps_disabled': 'bajo',
    'services.xbox_manual': 'bajo',
    'services.bluetooth_manual': 'bajo',
    'services.wu_manual': 'medio',
    'services.list_report': 'bajo',
    // ---- explorer_ui ----
    'explorer.show_extensions': 'bajo',
    'explorer.show_hidden': 'bajo',
    'explorer.show_protected': 'bajo',
    'explorer.disable_thumbnails': 'bajo',
    'explorer.separate_process': 'bajo',
    'explorer.disable_start_web': 'bajo',
    'explorer.classic_context_menu': 'bajo',
    'explorer.disable_notifications': 'bajo',
    'explorer.taskbar_small': 'bajo',
    'explorer.disable_taskbar_anim': 'bajo',
    'explorer.disable_window_anim': 'bajo',
    'explorer.disable_snap': 'bajo',
};
/** Default impact when a tweak is not present in the map. */
exports.DEFAULT_IMPACT = 'bajo';
function getTweakImpact(tweakId) {
    return exports.tweakImpact[tweakId] ?? exports.DEFAULT_IMPACT;
}
/** Low impact tweaks -> "Ajustes finos" card. */
function isFineTune(tweakId) {
    return getTweakImpact(tweakId) === 'bajo';
}
//# sourceMappingURL=impact.js.map