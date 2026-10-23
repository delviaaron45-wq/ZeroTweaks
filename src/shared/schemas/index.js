"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IpcChannels = exports.GameProfileSchema = exports.GameTweakConfigSchema = exports.GpuProfileConfigSchema = exports.CommonGpuSettingsSchema = exports.IntelSettingsSchema = exports.AmdSettingsSchema = exports.NvidiaSettingsSchema = exports.SettingsSchema = exports.OverlayConfigSchema = exports.ProfileSchema = exports.HardwareProfileSchema = exports.WindowsVersionSchema = exports.NetworkInfoSchema = exports.StorageInfoSchema = exports.MemoryInfoSchema = exports.GpuInfoSchema = exports.CpuInfoSchema = exports.TweakSchema = exports.CompatibilitySchema = exports.TweakResultSchema = exports.ApplyOptionsSchema = exports.TweakStateSchema = void 0;
const zod_1 = require("zod");
// Zod schemas for IPC validation
exports.TweakStateSchema = zod_1.z.object({
    path: zod_1.z.string(),
    name: zod_1.z.string(),
    type: zod_1.z.enum(['REG_SZ', 'REG_DWORD', 'REG_QWORD', 'REG_BINARY', 'REG_MULTI_SZ', 'REG_EXPAND_SZ']),
    value: zod_1.z.unknown(),
    existed: zod_1.z.boolean(),
});
exports.ApplyOptionsSchema = zod_1.z.object({
    dryRun: zod_1.z.boolean().optional(),
    force: zod_1.z.boolean().optional(),
});
exports.TweakResultSchema = zod_1.z.object({
    ok: zod_1.z.boolean(),
    data: zod_1.z.unknown().optional(),
    error: zod_1.z.string().optional(),
    previousState: exports.TweakStateSchema.optional(),
    newState: exports.TweakStateSchema.optional(),
});
exports.CompatibilitySchema = zod_1.z.object({
    windowsVersions: zod_1.z.array(zod_1.z.string()),
    formFactors: zod_1.z.array(zod_1.z.enum(['desktop', 'laptop'])),
    cpuVendors: zod_1.z.array(zod_1.z.enum(['Intel', 'AMD'])).optional(),
    gpuVendors: zod_1.z.array(zod_1.z.enum(['NVIDIA', 'AMD', 'Intel'])).optional(),
});
exports.TweakSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    category: zod_1.z.enum([
        'system_performance',
        'gaming_fps',
        'gpu',
        'network_tcp',
        'peripherals_input',
        'power_cpu',
        'ram_storage',
        'debloat_apps',
        'privacy_telemetry',
        'services',
        'explorer_ui',
    ]),
    description: zod_1.z.string(),
    whenHelps: zod_1.z.string(),
    risk: zod_1.z.enum(['safe', 'moderate', 'advanced']),
    evidence: zod_1.z.enum(['measured', 'debated', 'placebo']),
    requiresReboot: zod_1.z.boolean(),
    compatibility: exports.CompatibilitySchema,
    // Functions are not serialized, validated at runtime
});
exports.CpuInfoSchema = zod_1.z.object({
    vendor: zod_1.z.enum(['Intel', 'AMD', 'Unknown']),
    model: zod_1.z.string(),
    cores: zod_1.z.number(),
    threads: zod_1.z.number(),
    baseClock: zod_1.z.number(),
    maxClock: zod_1.z.number(),
    architecture: zod_1.z.string(),
});
exports.GpuInfoSchema = zod_1.z.object({
    vendor: zod_1.z.enum(['NVIDIA', 'AMD', 'Intel', 'Unknown']),
    model: zod_1.z.string(),
    driverVersion: zod_1.z.string(),
    vram: zod_1.z.number(),
    supportsHAGS: zod_1.z.boolean(),
    supportsResizableBAR: zod_1.z.boolean(),
});
exports.MemoryInfoSchema = zod_1.z.object({
    total: zod_1.z.number(),
    speed: zod_1.z.number(),
    type: zod_1.z.string(),
    channels: zod_1.z.number(),
});
exports.StorageInfoSchema = zod_1.z.object({
    deviceId: zod_1.z.string(),
    model: zod_1.z.string(),
    type: zod_1.z.enum(['SSD', 'HDD', 'NVMe']),
    size: zod_1.z.number(),
    smartStatus: zod_1.z.string(),
});
exports.NetworkInfoSchema = zod_1.z.object({
    adapterName: zod_1.z.string(),
    macAddress: zod_1.z.string(),
    speed: zod_1.z.number(),
    driverVersion: zod_1.z.string(),
});
exports.WindowsVersionSchema = zod_1.z.object({
    version: zod_1.z.string(),
    build: zod_1.z.number(),
    edition: zod_1.z.enum(['Home', 'Pro', 'Enterprise', 'Education', 'Unknown']),
    isInsider: zod_1.z.boolean(),
});
exports.HardwareProfileSchema = zod_1.z.object({
    cpu: exports.CpuInfoSchema,
    gpu: exports.GpuInfoSchema,
    memory: exports.MemoryInfoSchema,
    storage: zod_1.z.array(exports.StorageInfoSchema),
    network: exports.NetworkInfoSchema,
    windowsVersion: exports.WindowsVersionSchema,
    isLaptop: zod_1.z.boolean(),
    hasBitLocker: zod_1.z.boolean(),
});
exports.ProfileSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    description: zod_1.z.string(),
    tweaks: zod_1.z.array(zod_1.z.string()),
    hardwareProfile: exports.HardwareProfileSchema.optional(),
    createdAt: zod_1.z.string(),
    updatedAt: zod_1.z.string(),
    signature: zod_1.z.string().optional(),
});
exports.OverlayConfigSchema = zod_1.z.object({
    enabled: zod_1.z.boolean(),
    position: zod_1.z.object({ x: zod_1.z.number(), y: zod_1.z.number() }),
    scale: zod_1.z.number(),
    opacity: zod_1.z.number(),
    clickThrough: zod_1.z.boolean(),
    modules: zod_1.z.array(zod_1.z.enum(['cpu', 'ram', 'gpu', 'ping', 'timer', 'fps', 'temperature'])),
    globalHotkey: zod_1.z.string(),
});
exports.SettingsSchema = zod_1.z.object({
    language: zod_1.z.enum(['es', 'en', 'pt', 'fr', 'de']),
    theme: zod_1.z.enum(['dark', 'light', 'system']),
    autoStart: zod_1.z.boolean(),
    minimizeToTray: zod_1.z.boolean(),
    checkUpdates: zod_1.z.boolean(),
    telemetryOptIn: zod_1.z.boolean(),
    dryRunDefault: zod_1.z.boolean(),
    batterySaverMode: zod_1.z.boolean(),
    gameModeAuto: zod_1.z.boolean(),
    overlay: exports.OverlayConfigSchema,
    backupRetentionDays: zod_1.z.number(),
    maxLogSize: zod_1.z.number(),
});
exports.NvidiaSettingsSchema = zod_1.z.object({
    lowLatencyMode: zod_1.z.enum(['off', 'on', 'ultra']),
    powerManagement: zod_1.z.enum(['max_performance', 'optimal', 'adaptive']),
    shaderCache: zod_1.z.enum(['on', 'off', 'driver_default']),
    textureFiltering: zod_1.z.enum(['high_performance', 'quality', 'driver_default']),
    reflex: zod_1.z.enum(['on', 'off', 'on_plus_boost']),
});
exports.AmdSettingsSchema = zod_1.z.object({
    antiLag: zod_1.z.boolean(),
    chill: zod_1.z.object({ minFps: zod_1.z.number(), maxFps: zod_1.z.number() }).nullable(),
    shaderCache: zod_1.z.boolean(),
});
exports.IntelSettingsSchema = zod_1.z.object({
    powerMode: zod_1.z.enum(['max_performance', 'balanced', 'power_saver']),
});
exports.CommonGpuSettingsSchema = zod_1.z.object({
    hags: zod_1.z.boolean(),
    gpuPreference: zod_1.z.enum(['high_performance', 'power_saving', 'auto']),
    fullscreenOptimizations: zod_1.z.boolean(),
    mpo: zod_1.z.boolean(),
    vrr: zod_1.z.boolean(),
});
exports.GpuProfileConfigSchema = zod_1.z.object({
    nvidia: exports.NvidiaSettingsSchema.optional(),
    amd: exports.AmdSettingsSchema.optional(),
    intel: exports.IntelSettingsSchema.optional(),
    common: exports.CommonGpuSettingsSchema.optional(),
});
exports.GameTweakConfigSchema = zod_1.z.object({
    powerPlan: zod_1.z.enum(['ultimate', 'high', 'balanced', 'custom']),
    timerResolution: zod_1.z.number(),
    cpuPriority: zod_1.z.enum(['high', 'realtime', 'normal']),
    gameMode: zod_1.z.boolean(),
    gameDVR: zod_1.z.boolean(),
    notifications: zod_1.z.boolean(),
    suspendedProcesses: zod_1.z.array(zod_1.z.string()),
    gpuProfile: exports.GpuProfileConfigSchema,
});
exports.GameProfileSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    executable: zod_1.z.string(),
    steamId: zod_1.z.string().optional(),
    epicId: zod_1.z.string().optional(),
    customArgs: zod_1.z.string().optional(),
    tweaks: exports.GameTweakConfigSchema,
    autoApply: zod_1.z.boolean(),
    createdAt: zod_1.z.string(),
    updatedAt: zod_1.z.string(),
});
// IPC Channel validation
exports.IpcChannels = {
    // Tweak operations
    'tweak:detect': zod_1.z.object({ tweakId: zod_1.z.string() }),
    'tweak:apply': zod_1.z.object({ tweakId: zod_1.z.string(), options: exports.ApplyOptionsSchema.optional() }),
    'tweak:revert': zod_1.z.object({ tweakId: zod_1.z.string(), originalState: exports.TweakStateSchema }),
    'tweak:verify': zod_1.z.object({ tweakId: zod_1.z.string(), expectedState: exports.TweakStateSchema }),
    'tweak:list': zod_1.z.void(),
    'tweak:get': zod_1.z.object({ tweakId: zod_1.z.string() }),
    // Profile operations
    'profile:list': zod_1.z.void(),
    'profile:get': zod_1.z.object({ id: zod_1.z.string() }),
    'profile:create': zod_1.z.object({ profile: exports.ProfileSchema.omit({ id: true, createdAt: true, updatedAt: true }) }),
    'profile:update': zod_1.z.object({ id: zod_1.z.string(), profile: exports.ProfileSchema.partial() }),
    'profile:delete': zod_1.z.object({ id: zod_1.z.string() }),
    'profile:apply': zod_1.z.object({ id: zod_1.z.string(), options: exports.ApplyOptionsSchema.optional() }),
    'profile:import': zod_1.z.object({ json: zod_1.z.string() }),
    'profile:export': zod_1.z.object({ id: zod_1.z.string() }),
    // Benchmark
    'benchmark:run': zod_1.z.object({ tweakId: zod_1.z.string().optional(), profileId: zod_1.z.string().optional() }),
    'benchmark:results': zod_1.z.void(),
    'benchmark:compare': zod_1.z.object({ beforeId: zod_1.z.string(), afterId: zod_1.z.string() }),
    // Game Mode
    'game:list': zod_1.z.void(),
    'game:detect': zod_1.z.void(),
    'game:create': zod_1.z.object({ profile: exports.GameProfileSchema.omit({ id: true, createdAt: true, updatedAt: true }) }),
    'game:update': zod_1.z.object({ id: zod_1.z.string(), profile: exports.GameProfileSchema.partial() }),
    'game:delete': zod_1.z.object({ id: zod_1.z.string() }),
    'game:start': zod_1.z.object({ gameId: zod_1.z.string() }),
    'game:stop': zod_1.z.object({ gameId: zod_1.z.string() }),
    // System
    'system:hardware': zod_1.z.void(),
    'system:preflight': zod_1.z.void(),
    'system:restorePoint': zod_1.z.object({ description: zod_1.z.string() }),
    'system:backup': zod_1.z.void(),
    'system:restore': zod_1.z.object({ manifestId: zod_1.z.string() }),
    'system:journal': zod_1.z.void(),
    // Settings
    'settings:get': zod_1.z.void(),
    'settings:set': zod_1.z.object({ settings: exports.SettingsSchema.partial() }),
    // Native
    'native:timerResolution': zod_1.z.object({ action: zod_1.z.enum(['get', 'set', 'reset']), value: zod_1.z.number().optional() }),
    'native:dpcLatency': zod_1.z.void(),
    'native:gpuMetrics': zod_1.z.void(),
    // Overlay
    'overlay:show': zod_1.z.void(),
    'overlay:hide': zod_1.z.void(),
    'overlay:config': zod_1.z.object({ config: exports.OverlayConfigSchema.partial() }),
    // Spider
    'spider:scan': zod_1.z.void(),
    'spider:idle': zod_1.z.void(),
};
//# sourceMappingURL=index.js.map