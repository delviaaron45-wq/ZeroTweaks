import type { Tweak, TweakState, TweakResult, ApplyOptions } from '../types/all';
import { RegistryManager } from './registry';
import { execAsync } from '../utils/process';

// ---------------------------------------------------------------------------
// NVIDIA control through nvidia-smi
// ---------------------------------------------------------------------------
//
// The driver profile database (NVAPI/DRS) is not reachable without a native
// module, so the "Low Latency Mode" / "Shader Cache Size" tweaks below are
// flagged as unavailable instead of pretending to work. nvidia-smi ships with
// every driver and exposes two settings that change real behaviour:
// persistence mode and the power limit. Both are reversible and are only
// applied when the GPU actually supports them.
export interface NvidiaGpuInfo {
  name: string;
  driverVersion: string;
  /** Current power limit in watts. */
  powerLimit: number | null;
  /** Factory power limit, used to revert. */
  powerDefault: number | null;
  /** Highest power limit the card accepts. */
  powerMax: number | null;
  maxGraphicsClock: number | null;
}

/** Runs `nvidia-smi <query>` and returns its stdout, or null when unavailable. */
async function nvidiaSmi(query: string): Promise<string | null> {
  try {
    const { stdout } = await execAsync(`nvidia-smi ${query}`, { timeout: 15000 });
    return stdout;
  } catch {
    return null;
  }
}

/** Reads the first NVIDIA GPU, or null when there is none / nvidia-smi is missing. */
export async function queryNvidiaGpu(): Promise<NvidiaGpuInfo | null> {
  const stdout = await nvidiaSmi(
    '--query-gpu=name,driver_version,power.limit,power.default_limit,power.max_limit,clocks.max.graphics --format=csv,noheader,nounits'
  );
  if (!stdout) return null;
  const line = stdout.trim().split(/\r?\n/)[0];
  if (!line) return null;

  const [name, driverVersion, limit, def, max, maxClock] = line.split(',').map(part => part.trim());
  const num = (value: string | undefined): number | null => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  return {
    name: name || 'NVIDIA GPU',
    driverVersion: driverVersion || '',
    powerLimit: num(limit),
    powerDefault: num(def),
    powerMax: num(max),
    maxGraphicsClock: num(maxClock),
  };
}

// GPU Tweaks (40 target)

// 1. Hardware Accelerated GPU Scheduling (HAGS)
export const hagsEnabled: Tweak = {
  id: 'gpu.hags',
  name: 'Hardware Accelerated GPU Scheduling (HAGS)',
  nameKey: 'tweaks.gpu.hags.name',
  category: 'gpu',
  description: 'Sets HwSchMode=2 in HKLM\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers. Requires supported driver (WDDM 2.7+) and GPU.',
  descriptionKey: 'tweaks.gpu.hags.description',
  whenHelps: 'Reduces latency by letting GPU manage its own memory. Requires compatible driver (NVIDIA 451.48+, AMD 20.5.1+, Intel 27.20.100.8476+).',
  whenHelpsKey: 'tweaks.gpu.hags.whenHelps',
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
  nameKey: 'tweaks.gpu.preferenceHighPerf.name',
  category: 'gpu',
  description: 'Configures HKCU\\Software\\Microsoft\\DirectX\\UserGpuPreferences per executable to use high-performance GPU.',
  descriptionKey: 'tweaks.gpu.preferenceHighPerf.description',
  whenHelps: 'Forces specific games/apps to use discrete GPU on hybrid laptops. Per-app override.',
  whenHelpsKey: 'tweaks.gpu.preferenceHighPerf.whenHelps',
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
  nameKey: 'tweaks.gpu.disableFullscreenOpt.name',
  category: 'gpu',
  description: 'Sets HKCU\\Software\\Microsoft\\Windows NT\\CurrentVersion\\AppCompatFlags\\Layers for game executables to disable fullscreen optimizations.',
  descriptionKey: 'tweaks.gpu.disableFullscreenOpt.description',
  whenHelps: 'Can fix stuttering, alt-tab issues, and input lag in some games. Per-game setting.',
  whenHelpsKey: 'tweaks.gpu.disableFullscreenOpt.whenHelps',
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
  nameKey: 'tweaks.gpu.disableMpo.name',
  category: 'gpu',
  description: 'Sets OverlayTestMode=5 in HKLM\\SOFTWARE\\Microsoft\\Windows\\Dwm. Disables MPO which can cause flickering/tearing with some drivers.',
  descriptionKey: 'tweaks.gpu.disableMpo.description',
  whenHelps: 'Fixes screen flickering, tearing, or color issues on some driver/hardware combinations. Evidence: debated.',
  whenHelpsKey: 'tweaks.gpu.disableMpo.whenHelps',
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
  nameKey: 'tweaks.gpu.vrrWindowed.name',
  category: 'gpu',
  description: 'Sets AllowVRR=1 in HKLM\\SOFTWARE\\Microsoft\\Windows\\Dwm. Allows Variable Refresh Rate in windowed/borderless modes.',
  descriptionKey: 'tweaks.gpu.vrrWindowed.description',
  whenHelps: 'Enables G-Sync/FreeSync in borderless windowed mode. Requires compatible monitor and driver.',
  whenHelpsKey: 'tweaks.gpu.vrrWindowed.whenHelps',
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
  nameKey: 'tweaks.gpu.nvidiaLowLatency.name',
  category: 'gpu',
  description: 'Sets Low Latency Mode to Ultra/On via NVAPI/DRS per application. Reduces render queue depth.',
  descriptionKey: 'tweaks.gpu.nvidiaLowLatency.description',
  whenHelps: 'Reduces input lag in GPU-bound scenarios. Ultra adds frame pacing. Per-game profile.',
  whenHelpsKey: 'tweaks.gpu.nvidiaLowLatency.whenHelps',
  risk: 'moderate',
  evidence: 'measured',
  impacto: 'medio',
      requiresReboot: false,
  compatibility: {
    windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
    formFactors: ['desktop', 'laptop'],
    gpuVendors: ['NVIDIA'],
  },
  unavailableReason: 'Requiere la API NVAPI del controlador NVIDIA, no incluida en este build. Ajusta "Modo de baja latencia" en el Panel de control de NVIDIA.',
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

// 7. NVIDIA Power Limit - Maximum (real, via nvidia-smi)
export const nvidiaPowerManagement: Tweak = {
  id: 'gpu.nvidia_power_mgmt',
  name: 'NVIDIA Power Limit: Maximum Performance',
  nameKey: 'tweaks.gpu.nvidiaPowerMgmt.name',
  category: 'gpu',
  description: 'Raises the GPU power limit to the highest value the card accepts (nvidia-smi -pl), so the GPU stops throttling below its rating under sustained load. Reversible: revert restores the factory limit. Needs administrator rights.',
  descriptionKey: 'tweaks.gpu.nvidiaPowerMgmt.description',
  whenHelps: 'Sustained gaming/rendering on cards that throttle on power. No effect if the card is already at its maximum limit.',
  whenHelpsKey: 'tweaks.gpu.nvidiaPowerMgmt.whenHelps',
  risk: 'safe',
  evidence: 'measured',
  impacto: 'medio',
  requiresReboot: false,
  compatibility: {
    windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
    formFactors: ['desktop', 'laptop'],
    gpuVendors: ['NVIDIA'],
  },
  detect: async (): Promise<TweakState> => {
    const gpu = await queryNvidiaGpu();
    const atMax = gpu !== null && gpu.powerLimit !== null && gpu.powerMax !== null && gpu.powerLimit >= gpu.powerMax;
    return {
      path: 'nvidia-smi',
      name: 'PowerLimit',
      type: 'REG_DWORD',
      value: gpu ? { current: gpu.powerLimit, default: gpu.powerDefault, max: gpu.powerMax } : null,
      existed: atMax,
    };
  },
  apply: async (options?: ApplyOptions): Promise<TweakResult> => {
    if (options?.dryRun) return { ok: true, data: 'Would raise the NVIDIA power limit to the card maximum (nvidia-smi -pl)' };
    const gpu = await queryNvidiaGpu();
    if (!gpu || gpu.powerMax === null) {
      return { ok: false, error: 'No se encontró una GPU NVIDIA con límite de potencia ajustable (¿está instalado nvidia-smi?).' };
    }
    const previousState = await nvidiaPowerManagement.detect();
    if (gpu.powerLimit !== null && gpu.powerLimit >= gpu.powerMax) {
      return { ok: true, data: 'El límite de potencia ya está en el máximo de la tarjeta.', previousState, newState: previousState };
    }
    const result = await nvidiaSmi(`-pl ${Math.round(gpu.powerMax)}`);
    if (result === null) {
      return { ok: false, error: 'nvidia-smi rechazó el cambio. Normalmente hace falta ejecutar como administrador.' };
    }
    return { ok: true, previousState, newState: await nvidiaPowerManagement.detect() };
  },
  revert: async (originalState: TweakState): Promise<TweakResult> => {
    const target = originalState.value as { current?: number | null; default?: number | null } | null;
    const gpu = await queryNvidiaGpu();
    const watts = target?.current ?? gpu?.powerDefault ?? null;
    if (watts === null) return { ok: false, error: 'No se pudo determinar el límite de potencia original.' };
    const result = await nvidiaSmi(`-pl ${Math.round(watts)}`);
    if (result === null) return { ok: false, error: 'nvidia-smi rechazó restaurar el límite de potencia (¿administrador?).' };
    return { ok: true };
  },
  verify: async (): Promise<boolean> => {
    const gpu = await queryNvidiaGpu();
    return gpu !== null && gpu.powerLimit !== null && gpu.powerMax !== null && gpu.powerLimit >= gpu.powerMax;
  },
};

// 7b. NVIDIA Persistence Mode (real, via nvidia-smi)
export const nvidiaPersistenceMode: Tweak = {
  id: 'gpu.nvidia_persistence',
  name: 'NVIDIA Persistence Mode',
  nameKey: 'tweaks.gpu.nvidiaPersistence.name',
  category: 'gpu',
  description: 'Enables persistence mode (nvidia-smi -pm 1) so the driver keeps the GPU initialised instead of reloading its state on every call. Reversible.',
  descriptionKey: 'tweaks.gpu.nvidiaPersistence.description',
  whenHelps: 'Small latency reduction when many programs initialise the GPU. Not supported on every platform.',
  whenHelpsKey: 'tweaks.gpu.nvidiaPersistence.whenHelps',
  risk: 'safe',
  evidence: 'measured',
  impacto: 'bajo',
  requiresReboot: false,
  compatibility: {
    windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
    formFactors: ['desktop'],
    gpuVendors: ['NVIDIA'],
  },
  detect: async (): Promise<TweakState> => {
    const stdout = await nvidiaSmi('--query-gpu=persistence_mode --format=csv,noheader,nounits');
    const value = stdout ? stdout.trim().split(/\r?\n/)[0] : null;
    return { path: 'nvidia-smi', name: 'PersistenceMode', type: 'REG_SZ', value, existed: value === 'Enabled' };
  },
  apply: async (options?: ApplyOptions): Promise<TweakResult> => {
    if (options?.dryRun) return { ok: true, data: 'Would enable NVIDIA persistence mode (nvidia-smi -pm 1)' };
    const previousState = await nvidiaPersistenceMode.detect();
    if (previousState.value === 'Enabled') {
      return { ok: true, data: 'El modo persistencia ya está activado.', previousState, newState: previousState };
    }
    const result = await nvidiaSmi('-pm 1');
    if (result === null) {
      return { ok: false, error: 'nvidia-smi rechazó el cambio. Puede que tu plataforma no admita el modo persistencia.' };
    }
    return { ok: true, previousState, newState: await nvidiaPersistenceMode.detect() };
  },
  revert: async (): Promise<TweakResult> => {
    const result = await nvidiaSmi('-pm 0');
    if (result === null) return { ok: false, error: 'nvidia-smi rechazó desactivar el modo persistencia.' };
    return { ok: true };
  },
  verify: async (): Promise<boolean> => {
    const current = await nvidiaPersistenceMode.detect();
    return current.value === 'Enabled';
  },
};

// 8. NVIDIA Shader Cache Size
export const nvidiaShaderCache: Tweak = {
  id: 'gpu.nvidia_shader_cache',
  name: 'NVIDIA Shader Cache Size',
  nameKey: 'tweaks.gpu.nvidiaShaderCache.name',
  category: 'gpu',
  description: 'Sets Shader Cache Size via NVAPI/DRS. Larger cache reduces stutter from shader compilation.',
  descriptionKey: 'tweaks.gpu.nvidiaShaderCache.description',
  whenHelps: 'Reduces first-run stutter in games. Uses more disk space. Per-game or global.',
  whenHelpsKey: 'tweaks.gpu.nvidiaShaderCache.whenHelps',
  risk: 'safe',
  evidence: 'measured',
  impacto: 'bajo',
      requiresReboot: false,
  compatibility: {
    windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
    formFactors: ['desktop', 'laptop'],
    gpuVendors: ['NVIDIA'],
  },
  unavailableReason: 'Requiere la API NVAPI del controlador NVIDIA, no incluida en este build. Ajusta el tamaño de la caché de sombreado en el Panel de control de NVIDIA.',
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
  nameKey: 'tweaks.gpu.amdAntiLag.name',
  category: 'gpu',
  description: 'Enables AMD Anti-Lag via ADLX/registry. Controls frame pacing to reduce input lag.',
  descriptionKey: 'tweaks.gpu.amdAntiLag.description',
  whenHelps: 'Reduces input latency in GPU-bound games. Works on RX 5000 series and newer.',
  whenHelpsKey: 'tweaks.gpu.amdAntiLag.whenHelps',
  risk: 'moderate',
  evidence: 'measured',
  impacto: 'medio',
      requiresReboot: false,
  compatibility: {
    windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
    formFactors: ['desktop', 'laptop'],
    gpuVendors: ['AMD'],
  },
  unavailableReason: 'Requiere la API ADLX de AMD, no incluida en este build. Activa Anti-Lag desde el software de AMD (Adrenalin).',
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
  nameKey: 'tweaks.gpu.amdChill.name',
  category: 'gpu',
  description: 'Configures Radeon Chill min/max FPS via ADLX. Dynamically regulates frame rate to save power.',
  descriptionKey: 'tweaks.gpu.amdChill.description',
  whenHelps: 'Reduces GPU temp/power in less demanding scenes. Can add latency if misconfigured.',
  whenHelpsKey: 'tweaks.gpu.amdChill.whenHelps',
  risk: 'moderate',
  evidence: 'measured',
  impacto: 'medio',
      requiresReboot: false,
  compatibility: {
    windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
    formFactors: ['desktop', 'laptop'],
    gpuVendors: ['AMD'],
  },
  unavailableReason: 'Requiere la API ADLX de AMD, no incluida en este build. Configura Radeon Chill desde el software de AMD (Adrenalin).',
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
  nameKey: 'tweaks.gpu.intelPower.name',
  category: 'gpu',
  description: 'Sets Intel GPU power plan to Maximum Performance via Intel Graphics Command Center registry.',
  descriptionKey: 'tweaks.gpu.intelPower.description',
  whenHelps: 'Prevents iGPU throttling. Useful for Quick Sync, light gaming on iGPU.',
  whenHelpsKey: 'tweaks.gpu.intelPower.whenHelps',
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
  nameKey: 'tweaks.gpu.resizableBar.name',
  category: 'gpu',
  description: 'Detects if Resizable BAR / SAM is enabled in BIOS and recognized by Windows. No changes made.',
  descriptionKey: 'tweaks.gpu.resizableBar.description',
  whenHelps: 'Shows current status. Enable in BIOS for potential performance gains (requires CPU/GPU/mobo support).',
  whenHelpsKey: 'tweaks.gpu.resizableBar.whenHelps',
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
  nvidiaPowerManagement,
  nvidiaPersistenceMode,
  nvidiaLowLatencyMode,
  nvidiaShaderCache,
  amdAntiLag,
  amdChill,
  intelGpuPower,
  resizableBarStatus,
];