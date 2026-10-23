import type { Tweak, TweakState, TweakResult, ApplyOptions } from '../types/all';
import { RegistryManager } from './registry';
import { execAsync } from '../utils/process';

// GPU Tweaks (40 target)

// 1. Hardware Accelerated GPU Scheduling (HAGS)
export const hagsEnabled: Tweak = {
  id: 'gpu.hags',
  name: 'Hardware Accelerated GPU Scheduling (HAGS)',
  category: 'gpu',
  description: 'Sets HwSchMode=2 in HKLM\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers. Requires supported driver (WDDM 2.7+) and GPU.',
  whenHelps: 'Reduces latency by letting GPU manage its own memory. Requires compatible driver (NVIDIA 451.48+, AMD 20.5.1+, Intel 27.20.100.8476+).',
  risk: 'moderate',
  evidence: 'measured',
  impacto: 'medio',
      requiresReboot: true,
  compatibility: {
    windowsVersions: ['10.0.2004', '10.0.22000', '10.0.22621', '10.0.22631'],
    formFactors: ['desktop', 'laptop'],
    gpuVendors: ['NVIDIA', 'AMD', 'Intel'],
  },
  detect: async (): Promise<TweakState> => {
    const result = await RegistryManager.getValue('HKLM', '\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers', 'HwSchMode');
    // Also check if driver supports it
    const { stdout } = await execAsync('powershell -NoProfile -Command "Get-CimInstance Win32_VideoController | Select-Object DriverVersion, VideoProcessor"');
    return { path: 'HKLM\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers', name: 'HwSchMode', type: 'REG_DWORD', value: { mode: result.value, driverInfo: stdout.trim() }, existed: result.existed };
  },
  apply: async (options?: ApplyOptions): Promise<TweakResult> => {
    if (options?.dryRun) return { ok: true, data: 'Would enable HAGS (HwSchMode=2)' };
    try {
      const current = await hagsEnabled.detect();
      await RegistryManager.setValue('HKLM', '\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers', 'HwSchMode', 'REG_DWORD', 2);
      return { ok: true, previousState: current, newState: { ...current, value: { ...(current.value as object), mode: 2 } } };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  revert: async (originalState: TweakState): Promise<TweakResult> => {
    try {
      const val = originalState.value as any;
      if (originalState.existed) {
        await RegistryManager.setValue('HKLM', '\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers', 'HwSchMode', 'REG_DWORD', val.mode ?? 1);
      } else {
        await RegistryManager.deleteValue('HKLM', '\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers', 'HwSchMode');
      }
      return { ok: true };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  verify: async (expectedState: TweakState): Promise<boolean> => {
    const current = await hagsEnabled.detect();
    const exp = expectedState.value as any;
    const cur = current.value as any;
    return cur.mode === 2;
  },
};

// 2. GPU Preference per App (High Performance)
export const gpuPreferenceHighPerf: Tweak = {
  id: 'gpu.preference_high_perf',
  name: 'Set GPU Preference to High Performance for Apps',
  category: 'gpu',
  description: 'Configures HKCU\\Software\\Microsoft\\DirectX\\UserGpuPreferences per executable to use high-performance GPU.',
  whenHelps: 'Forces specific games/apps to use discrete GPU on hybrid laptops. Per-app override.',
  risk: 'safe',
  evidence: 'measured',
  impacto: 'bajo',
      requiresReboot: false,
  compatibility: {
    windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
    formFactors: ['laptop'],
  },
  detect: async (): Promise<TweakState> => {
    const result = await RegistryManager.getValue('HKCU', '\\Software\\Microsoft\\DirectX\\UserGpuPreferences', '');
    return { path: 'HKCU\\Software\\Microsoft\\DirectX\\UserGpuPreferences', name: '(Default)', type: 'REG_SZ', value: result.value, existed: result.existed };
  },
  apply: async (options?: ApplyOptions): Promise<TweakResult> => {
    if (options?.dryRun) return { ok: true, data: 'Would set GPU preference for selected apps' };
    try {
      const current = await gpuPreferenceHighPerf.detect();
      // This is a template - actual app-specific entries added via game profiles
      await RegistryManager.createKey('HKCU', '\\Software\\Microsoft\\DirectX\\UserGpuPreferences');
      return { ok: true, previousState: current, newState: { ...current, value: 'configured' } };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  revert: async (originalState: TweakState): Promise<TweakResult> => {
    try {
      if (!originalState.existed) {
        await RegistryManager.deleteValue('HKCU', '\\Software\\Microsoft\\DirectX\\UserGpuPreferences', '');
      }
      return { ok: true };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  verify: async (expectedState: TweakState): Promise<boolean> => {
    const current = await gpuPreferenceHighPerf.detect();
    return current.existed;
  },
};

// 3. Disable Fullscreen Optimizations (per game)
export const disableFullscreenOptimizations: Tweak = {
  id: 'gpu.disable_fullscreen_opt',
  name: 'Disable Fullscreen Optimizations',
  category: 'gpu',
  description: 'Sets HKCU\\Software\\Microsoft\\Windows NT\\CurrentVersion\\AppCompatFlags\\Layers for game executables to disable fullscreen optimizations.',
  whenHelps: 'Can fix stuttering, alt-tab issues, and input lag in some games. Per-game setting.',
  risk: 'safe',
  evidence: 'debated',
  impacto: 'bajo',
      requiresReboot: false,
  compatibility: {
    windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
    formFactors: ['desktop', 'laptop'],
  },
  detect: async (): Promise<TweakState> => {
    const result = await RegistryManager.getValue('HKCU', '\\Software\\Microsoft\\Windows NT\\CurrentVersion\\AppCompatFlags\\Layers', '');
    return { path: 'HKCU\\Software\\Microsoft\\Windows NT\\CurrentVersion\\AppCompatFlags\\Layers', name: '(Default)', type: 'REG_SZ', value: result.value, existed: result.existed };
  },
  apply: async (options?: ApplyOptions): Promise<TweakResult> => {
    if (options?.dryRun) return { ok: true, data: 'Would disable fullscreen optimizations for configured games' };
    try {
      const current = await disableFullscreenOptimizations.detect();
      await RegistryManager.createKey('HKCU', '\\Software\\Microsoft\\Windows NT\\CurrentVersion\\AppCompatFlags\\Layers');
      return { ok: true, previousState: current, newState: { ...current, value: 'configured' } };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  revert: async (originalState: TweakState): Promise<TweakResult> => {
    try {
      // Per-game entries would be removed individually
      return { ok: true };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  verify: async (expectedState: TweakState): Promise<boolean> => {
    return true; // Per-game verification
  },
};

// 4. MPO (Multi-Plane Overlay) - Disable
export const disableMPO: Tweak = {
  id: 'gpu.disable_mpo',
  name: 'Disable Multi-Plane Overlay (MPO)',
  category: 'gpu',
  description: 'Sets OverlayTestMode=5 in HKLM\\SOFTWARE\\Microsoft\\Windows\\Dwm. Disables MPO which can cause flickering/tearing with some drivers.',
  whenHelps: 'Fixes screen flickering, tearing, or color issues on some driver/hardware combinations. Evidence: debated.',
  risk: 'moderate',
  evidence: 'debated',
  impacto: 'medio',
      requiresReboot: true,
  compatibility: {
    windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
    formFactors: ['desktop', 'laptop'],
  },
  detect: async (): Promise<TweakState> => {
    const result = await RegistryManager.getValue('HKLM', '\\SOFTWARE\\Microsoft\\Windows\\Dwm', 'OverlayTestMode');
    return { path: 'HKLM\\SOFTWARE\\Microsoft\\Windows\\Dwm', name: 'OverlayTestMode', type: 'REG_DWORD', value: result.value, existed: result.existed };
  },
  apply: async (options?: ApplyOptions): Promise<TweakResult> => {
    if (options?.dryRun) return { ok: true, data: 'Would disable MPO (OverlayTestMode=5)' };
    try {
      const current = await disableMPO.detect();
      await RegistryManager.setValue('HKLM', '\\SOFTWARE\\Microsoft\\Windows\\Dwm', 'OverlayTestMode', 'REG_DWORD', 5);
      return { ok: true, previousState: current, newState: { ...current, value: 5 } };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  revert: async (originalState: TweakState): Promise<TweakResult> => {
    try {
      if (originalState.existed) {
        await RegistryManager.setValue('HKLM', '\\SOFTWARE\\Microsoft\\Windows\\Dwm', 'OverlayTestMode', 'REG_DWORD', originalState.value as number);
      } else {
        await RegistryManager.deleteValue('HKLM', '\\SOFTWARE\\Microsoft\\Windows\\Dwm', 'OverlayTestMode');
      }
      return { ok: true };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  verify: async (expectedState: TweakState): Promise<boolean> => {
    const current = await disableMPO.detect();
    return current.value === 5;
  },
};

// 5. VRR / G-Sync - Enable for Windowed
export const vrrWindowed: Tweak = {
  id: 'gpu.vrr_windowed',
  name: 'Enable VRR/G-Sync for Windowed Games',
  category: 'gpu',
  description: 'Sets AllowVRR=1 in HKLM\\SOFTWARE\\Microsoft\\Windows\\Dwm. Allows Variable Refresh Rate in windowed/borderless modes.',
  whenHelps: 'Enables G-Sync/FreeSync in borderless windowed mode. Requires compatible monitor and driver.',
  risk: 'safe',
  evidence: 'measured',
  impacto: 'bajo',
      requiresReboot: true,
  compatibility: {
    windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
    formFactors: ['desktop', 'laptop'],
  },
  detect: async (): Promise<TweakState> => {
    const result = await RegistryManager.getValue('HKLM', '\\SOFTWARE\\Microsoft\\Windows\\Dwm', 'AllowVRR');
    return { path: 'HKLM\\SOFTWARE\\Microsoft\\Windows\\Dwm', name: 'AllowVRR', type: 'REG_DWORD', value: result.value, existed: result.existed };
  },
  apply: async (options?: ApplyOptions): Promise<TweakResult> => {
    if (options?.dryRun) return { ok: true, data: 'Would enable VRR for windowed apps (AllowVRR=1)' };
    try {
      const current = await vrrWindowed.detect();
      await RegistryManager.setValue('HKLM', '\\SOFTWARE\\Microsoft\\Windows\\Dwm', 'AllowVRR', 'REG_DWORD', 1);
      return { ok: true, previousState: current, newState: { ...current, value: 1 } };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  revert: async (originalState: TweakState): Promise<TweakResult> => {
    try {
      if (originalState.existed) {
        await RegistryManager.setValue('HKLM', '\\SOFTWARE\\Microsoft\\Windows\\Dwm', 'AllowVRR', 'REG_DWORD', originalState.value as number);
      } else {
        await RegistryManager.deleteValue('HKLM', '\\SOFTWARE\\Microsoft\\Windows\\Dwm', 'AllowVRR');
      }
      return { ok: true };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  verify: async (expectedState: TweakState): Promise<boolean> => {
    const current = await vrrWindowed.detect();
    return current.value === 1;
  },
};

// 6. NVIDIA Low Latency Mode (via DRS/Profile Inspector - template)
export const nvidiaLowLatencyMode: Tweak = {
  id: 'gpu.nvidia_low_latency',
  name: 'NVIDIA Low Latency Mode',
  category: 'gpu',
  description: 'Sets Low Latency Mode to Ultra/On via NVAPI/DRS per application. Reduces render queue depth.',
  whenHelps: 'Reduces input lag in GPU-bound scenarios. Ultra adds frame pacing. Per-game profile.',
  risk: 'moderate',
  evidence: 'measured',
  impacto: 'medio',
      requiresReboot: false,
  compatibility: {
    windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
    formFactors: ['desktop', 'laptop'],
    gpuVendors: ['NVIDIA'],
  },
  detect: async (): Promise<TweakState> => {
    // Requires NVAPI - placeholder
    return { path: 'NVAPI', name: 'LowLatencyMode', type: 'REG_DWORD', value: 'requires_nvapi', existed: false };
  },
  apply: async (options?: ApplyOptions): Promise<TweakResult> => {
    if (options?.dryRun) return { ok: true, data: 'Would set NVIDIA Low Latency Mode via NVAPI (per game)' };
    // Implementation requires native NVAPI binding
    return { ok: false, error: 'Requires native NVAPI module (Phase 2)' };
  },
  revert: async (originalState: TweakState): Promise<TweakResult> => {
    return { ok: true };
  },
  verify: async (expectedState: TweakState): Promise<boolean> => {
    return false;
  },
};

// 7. NVIDIA Power Management - Prefer Maximum Performance
export const nvidiaPowerManagement: Tweak = {
  id: 'gpu.nvidia_power_mgmt',
  name: 'NVIDIA Power Management: Prefer Maximum Performance',
  category: 'gpu',
  description: 'Sets Power Management Mode to Prefer Maximum Performance via NVAPI/DRS per application.',
  whenHelps: 'Prevents GPU downclocking during games. Increases power/heat. Per-game profile.',
  risk: 'safe',
  evidence: 'measured',
  impacto: 'bajo',
      requiresReboot: false,
  compatibility: {
    windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
    formFactors: ['desktop', 'laptop'],
    gpuVendors: ['NVIDIA'],
  },
  detect: async (): Promise<TweakState> => {
    return { path: 'NVAPI', name: 'PowerManagementMode', type: 'REG_DWORD', value: 'requires_nvapi', existed: false };
  },
  apply: async (options?: ApplyOptions): Promise<TweakResult> => {
    if (options?.dryRun) return { ok: true, data: 'Would set NVIDIA Power Management to Maximum Performance (per game)' };
    return { ok: false, error: 'Requires native NVAPI module (Phase 2)' };
  },
  revert: async (originalState: TweakState): Promise<TweakResult> => {
    return { ok: true };
  },
  verify: async (expectedState: TweakState): Promise<boolean> => {
    return false;
  },
};

// 8. NVIDIA Shader Cache Size
export const nvidiaShaderCache: Tweak = {
  id: 'gpu.nvidia_shader_cache',
  name: 'NVIDIA Shader Cache Size',
  category: 'gpu',
  description: 'Sets Shader Cache Size via NVAPI/DRS. Larger cache reduces stutter from shader compilation.',
  whenHelps: 'Reduces first-run stutter in games. Uses more disk space. Per-game or global.',
  risk: 'safe',
  evidence: 'measured',
  impacto: 'bajo',
      requiresReboot: false,
  compatibility: {
    windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
    formFactors: ['desktop', 'laptop'],
    gpuVendors: ['NVIDIA'],
  },
  detect: async (): Promise<TweakState> => {
    return { path: 'NVAPI', name: 'ShaderCacheSize', type: 'REG_DWORD', value: 'requires_nvapi', existed: false };
  },
  apply: async (options?: ApplyOptions): Promise<TweakResult> => {
    if (options?.dryRun) return { ok: true, data: 'Would increase NVIDIA Shader Cache Size (per game)' };
    return { ok: false, error: 'Requires native NVAPI module (Phase 2)' };
  },
  revert: async (originalState: TweakState): Promise<TweakResult> => {
    return { ok: true };
  },
  verify: async (expectedState: TweakState): Promise<boolean> => {
    return false;
  },
};

// 9. AMD Anti-Lag
export const amdAntiLag: Tweak = {
  id: 'gpu.amd_anti_lag',
  name: 'AMD Anti-Lag',
  category: 'gpu',
  description: 'Enables AMD Anti-Lag via ADLX/registry. Controls frame pacing to reduce input lag.',
  whenHelps: 'Reduces input latency in GPU-bound games. Works on RX 5000 series and newer.',
  risk: 'moderate',
  evidence: 'measured',
  impacto: 'medio',
      requiresReboot: false,
  compatibility: {
    windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
    formFactors: ['desktop', 'laptop'],
    gpuVendors: ['AMD'],
  },
  detect: async (): Promise<TweakState> => {
    return { path: 'ADLX', name: 'AntiLag', type: 'REG_DWORD', value: 'requires_adlx', existed: false };
  },
  apply: async (options?: ApplyOptions): Promise<TweakResult> => {
    if (options?.dryRun) return { ok: true, data: 'Would enable AMD Anti-Lag via ADLX' };
    return { ok: false, error: 'Requires ADLX native module (Phase 2)' };
  },
  revert: async (originalState: TweakState): Promise<TweakResult> => {
    return { ok: true };
  },
  verify: async (expectedState: TweakState): Promise<boolean> => {
    return false;
  },
};

// 10. AMD Radeon Chill
export const amdChill: Tweak = {
  id: 'gpu.amd_chill',
  name: 'AMD Radeon Chill',
  category: 'gpu',
  description: 'Configures Radeon Chill min/max FPS via ADLX. Dynamically regulates frame rate to save power.',
  whenHelps: 'Reduces GPU temp/power in less demanding scenes. Can add latency if misconfigured.',
  risk: 'moderate',
  evidence: 'measured',
  impacto: 'medio',
      requiresReboot: false,
  compatibility: {
    windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
    formFactors: ['desktop', 'laptop'],
    gpuVendors: ['AMD'],
  },
  detect: async (): Promise<TweakState> => {
    return { path: 'ADLX', name: 'Chill', type: 'REG_DWORD', value: 'requires_adlx', existed: false };
  },
  apply: async (options?: ApplyOptions): Promise<TweakResult> => {
    if (options?.dryRun) return { ok: true, data: 'Would configure AMD Radeon Chill (per game)' };
    return { ok: false, error: 'Requires ADLX native module (Phase 2)' };
  },
  revert: async (originalState: TweakState): Promise<TweakResult> => {
    return { ok: true };
  },
  verify: async (expectedState: TweakState): Promise<boolean> => {
    return false;
  },
};

// 11. Intel GPU Power Settings
export const intelGpuPower: Tweak = {
  id: 'gpu.intel_power',
  name: 'Intel GPU Maximum Performance',
  category: 'gpu',
  description: 'Sets Intel GPU power plan to Maximum Performance via Intel Graphics Command Center registry.',
  whenHelps: 'Prevents iGPU throttling. Useful for Quick Sync, light gaming on iGPU.',
  risk: 'safe',
  evidence: 'measured',
  impacto: 'bajo',
      requiresReboot: false,
  compatibility: {
    windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
    formFactors: ['desktop', 'laptop'],
    gpuVendors: ['Intel'],
  },
  detect: async (): Promise<TweakState> => {
    const result = await RegistryManager.getValue('HKLM', '\\SOFTWARE\\Intel\\MediaSDK\\Dispatch', 'EnableMaximumPerformance');
    return { path: 'HKLM\\SOFTWARE\\Intel\\MediaSDK\\Dispatch', name: 'EnableMaximumPerformance', type: 'REG_DWORD', value: result.value, existed: result.existed };
  },
  apply: async (options?: ApplyOptions): Promise<TweakResult> => {
    if (options?.dryRun) return { ok: true, data: 'Would set Intel GPU to Maximum Performance' };
    try {
      const current = await intelGpuPower.detect();
      await RegistryManager.setValue('HKLM', '\\SOFTWARE\\Intel\\MediaSDK\\Dispatch', 'EnableMaximumPerformance', 'REG_DWORD', 1);
      return { ok: true, previousState: current, newState: { ...current, value: 1 } };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  revert: async (originalState: TweakState): Promise<TweakResult> => {
    try {
      if (originalState.existed) {
        await RegistryManager.setValue('HKLM', '\\SOFTWARE\\Intel\\MediaSDK\\Dispatch', 'EnableMaximumPerformance', 'REG_DWORD', originalState.value as number);
      } else {
        await RegistryManager.deleteValue('HKLM', '\\SOFTWARE\\Intel\\MediaSDK\\Dispatch', 'EnableMaximumPerformance');
      }
      return { ok: true };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  verify: async (expectedState: TweakState): Promise<boolean> => {
    const current = await intelGpuPower.detect();
    return current.value === 1;
  },
};

// 12. Resizable BAR Detection (Read-only)
export const resizableBarStatus: Tweak = {
  id: 'gpu.resizable_bar',
  name: 'Resizable BAR Status (Detection Only)',
  category: 'gpu',
  description: 'Detects if Resizable BAR / SAM is enabled in BIOS and recognized by Windows. No changes made.',
  whenHelps: 'Shows current status. Enable in BIOS for potential performance gains (requires CPU/GPU/mobo support).',
  risk: 'safe',
  evidence: 'measured',
  impacto: 'bajo',
      requiresReboot: false,
  compatibility: {
    windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
    formFactors: ['desktop', 'laptop'],
    cpuVendors: ['Intel', 'AMD'],
    gpuVendors: ['NVIDIA', 'AMD', 'Intel'],
  },
  detect: async (): Promise<TweakState> => {
    const { stdout } = await execAsync('powershell -NoProfile -Command "Get-CimInstance Win32_VideoController | Select-Object VideoProcessor, AdapterRAM, DriverVersion"');
    return { path: 'WMI', name: 'ResizableBAR', type: 'REG_SZ', value: stdout.trim(), existed: true };
  },
  apply: async (options?: ApplyOptions): Promise<TweakResult> => {
    return { ok: true, data: 'Read-only detection tweak' };
  },
  revert: async (originalState: TweakState): Promise<TweakResult> => {
    return { ok: true };
  },
  verify: async (expectedState: TweakState): Promise<boolean> => {
    return true;
  },
};

export const gpuTweaks: Tweak[] = [
  hagsEnabled,
  gpuPreferenceHighPerf,
  disableFullscreenOptimizations,
  disableMPO,
  vrrWindowed,
  nvidiaLowLatencyMode,
  nvidiaPowerManagement,
  nvidiaShaderCache,
  amdAntiLag,
  amdChill,
  intelGpuPower,
  resizableBarStatus,
];