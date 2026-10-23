import { z } from 'zod';

// Zod schemas for IPC validation
export const TweakStateSchema = z.object({
  path: z.string(),
  name: z.string(),
  type: z.enum(['REG_SZ', 'REG_DWORD', 'REG_QWORD', 'REG_BINARY', 'REG_MULTI_SZ', 'REG_EXPAND_SZ']),
  value: z.unknown(),
  existed: z.boolean(),
});

export const ApplyOptionsSchema = z.object({
  dryRun: z.boolean().optional(),
  force: z.boolean().optional(),
});

export const TweakResultSchema = z.object({
  ok: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional(),
  previousState: TweakStateSchema.optional(),
  newState: TweakStateSchema.optional(),
});

export const CompatibilitySchema = z.object({
  windowsVersions: z.array(z.string()),
  formFactors: z.array(z.enum(['desktop', 'laptop'])),
  cpuVendors: z.array(z.enum(['Intel', 'AMD'])).optional(),
  gpuVendors: z.array(z.enum(['NVIDIA', 'AMD', 'Intel'])).optional(),
});

export const TweakSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.enum([
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
  description: z.string(),
  whenHelps: z.string(),
  risk: z.enum(['safe', 'moderate', 'advanced']),
  evidence: z.enum(['measured', 'debated', 'placebo']),
  requiresReboot: z.boolean(),
  compatibility: CompatibilitySchema,
  // Functions are not serialized, validated at runtime
});

export const CpuInfoSchema = z.object({
  vendor: z.enum(['Intel', 'AMD', 'Unknown']),
  model: z.string(),
  cores: z.number(),
  threads: z.number(),
  baseClock: z.number(),
  maxClock: z.number(),
  architecture: z.string(),
});

export const GpuInfoSchema = z.object({
  vendor: z.enum(['NVIDIA', 'AMD', 'Intel', 'Unknown']),
  model: z.string(),
  driverVersion: z.string(),
  vram: z.number(),
  supportsHAGS: z.boolean(),
  supportsResizableBAR: z.boolean(),
});

export const MemoryInfoSchema = z.object({
  total: z.number(),
  speed: z.number(),
  type: z.string(),
  channels: z.number(),
});

export const StorageInfoSchema = z.object({
  deviceId: z.string(),
  model: z.string(),
  type: z.enum(['SSD', 'HDD', 'NVMe']),
  size: z.number(),
  smartStatus: z.string(),
});

export const NetworkInfoSchema = z.object({
  adapterName: z.string(),
  macAddress: z.string(),
  speed: z.number(),
  driverVersion: z.string(),
});

export const WindowsVersionSchema = z.object({
  version: z.string(),
  build: z.number(),
  edition: z.enum(['Home', 'Pro', 'Enterprise', 'Education', 'Unknown']),
  isInsider: z.boolean(),
});

export const HardwareProfileSchema = z.object({
  cpu: CpuInfoSchema,
  gpu: GpuInfoSchema,
  memory: MemoryInfoSchema,
  storage: z.array(StorageInfoSchema),
  network: NetworkInfoSchema,
  windowsVersion: WindowsVersionSchema,
  isLaptop: z.boolean(),
  hasBitLocker: z.boolean(),
});

export const ProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  tweaks: z.array(z.string()),
  hardwareProfile: HardwareProfileSchema.optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  signature: z.string().optional(),
});

export const OverlayConfigSchema = z.object({
  enabled: z.boolean(),
  position: z.object({ x: z.number(), y: z.number() }),
  scale: z.number(),
  opacity: z.number(),
  clickThrough: z.boolean(),
  modules: z.array(z.enum(['cpu', 'ram', 'gpu', 'ping', 'timer', 'fps', 'temperature'])),
  globalHotkey: z.string(),
});

export const SettingsSchema = z.object({
  language: z.enum(['es', 'en', 'pt', 'fr', 'de']),
  theme: z.enum(['dark', 'light', 'system']),
  autoStart: z.boolean(),
  minimizeToTray: z.boolean(),
  checkUpdates: z.boolean(),
  telemetryOptIn: z.boolean(),
  dryRunDefault: z.boolean(),
  batterySaverMode: z.boolean(),
  gameModeAuto: z.boolean(),
  overlay: OverlayConfigSchema,
  backupRetentionDays: z.number(),
  maxLogSize: z.number(),
});

export const NvidiaSettingsSchema = z.object({
  lowLatencyMode: z.enum(['off', 'on', 'ultra']),
  powerManagement: z.enum(['max_performance', 'optimal', 'adaptive']),
  shaderCache: z.enum(['on', 'off', 'driver_default']),
  textureFiltering: z.enum(['high_performance', 'quality', 'driver_default']),
  reflex: z.enum(['on', 'off', 'on_plus_boost']),
});

export const AmdSettingsSchema = z.object({
  antiLag: z.boolean(),
  chill: z.object({ minFps: z.number(), maxFps: z.number() }).nullable(),
  shaderCache: z.boolean(),
});

export const IntelSettingsSchema = z.object({
  powerMode: z.enum(['max_performance', 'balanced', 'power_saver']),
});

export const CommonGpuSettingsSchema = z.object({
  hags: z.boolean(),
  gpuPreference: z.enum(['high_performance', 'power_saving', 'auto']),
  fullscreenOptimizations: z.boolean(),
  mpo: z.boolean(),
  vrr: z.boolean(),
});

export const GpuProfileConfigSchema = z.object({
  nvidia: NvidiaSettingsSchema.optional(),
  amd: AmdSettingsSchema.optional(),
  intel: IntelSettingsSchema.optional(),
  common: CommonGpuSettingsSchema.optional(),
});

export const GameTweakConfigSchema = z.object({
  powerPlan: z.enum(['ultimate', 'high', 'balanced', 'custom']),
  timerResolution: z.number(),
  cpuPriority: z.enum(['high', 'realtime', 'normal']),
  gameMode: z.boolean(),
  gameDVR: z.boolean(),
  notifications: z.boolean(),
  suspendedProcesses: z.array(z.string()),
  gpuProfile: GpuProfileConfigSchema,
});

export const GameProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  executable: z.string(),
  steamId: z.string().optional(),
  epicId: z.string().optional(),
  customArgs: z.string().optional(),
  tweaks: GameTweakConfigSchema,
  autoApply: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Type inference helpers
export type TweakState = z.infer<typeof TweakStateSchema>;
export type ApplyOptions = z.infer<typeof ApplyOptionsSchema>;
export type TweakResult = z.infer<typeof TweakResultSchema>;
export type Compatibility = z.infer<typeof CompatibilitySchema>;
export type HardwareProfile = z.infer<typeof HardwareProfileSchema>;
export type Profile = z.infer<typeof ProfileSchema>;
export type Settings = z.infer<typeof SettingsSchema>;
export type GameProfile = z.infer<typeof GameProfileSchema>;
export type OverlayConfig = z.infer<typeof OverlayConfigSchema>;

// IPC Channel validation
export const IpcChannels = {
  // Tweak operations
  'tweak:detect': z.object({ tweakId: z.string() }),
  'tweak:apply': z.object({ tweakId: z.string(), options: ApplyOptionsSchema.optional() }),
  'tweak:revert': z.object({ tweakId: z.string(), originalState: TweakStateSchema }),
  'tweak:verify': z.object({ tweakId: z.string(), expectedState: TweakStateSchema }),
  'tweak:list': z.void(),
  'tweak:get': z.object({ tweakId: z.string() }),

  // Profile operations
  'profile:list': z.void(),
  'profile:get': z.object({ id: z.string() }),
  'profile:create': z.object({ profile: ProfileSchema.omit({ id: true, createdAt: true, updatedAt: true }) }),
  'profile:update': z.object({ id: z.string(), profile: ProfileSchema.partial() }),
  'profile:delete': z.object({ id: z.string() }),
  'profile:apply': z.object({ id: z.string(), options: ApplyOptionsSchema.optional() }),
  'profile:import': z.object({ json: z.string() }),
  'profile:export': z.object({ id: z.string() }),

  // Benchmark
  'benchmark:run': z.object({ tweakId: z.string().optional(), profileId: z.string().optional() }),
  'benchmark:results': z.void(),
  'benchmark:compare': z.object({ beforeId: z.string(), afterId: z.string() }),

  // Game Mode
  'game:list': z.void(),
  'game:detect': z.void(),
  'game:create': z.object({ profile: GameProfileSchema.omit({ id: true, createdAt: true, updatedAt: true }) }),
  'game:update': z.object({ id: z.string(), profile: GameProfileSchema.partial() }),
  'game:delete': z.object({ id: z.string() }),
  'game:start': z.object({ gameId: z.string() }),
  'game:stop': z.object({ gameId: z.string() }),

  // System
  'system:hardware': z.void(),
  'system:preflight': z.void(),
  'system:restorePoint': z.object({ description: z.string() }),
  'system:backup': z.void(),
  'system:restore': z.object({ manifestId: z.string() }),
  'system:journal': z.void(),

  // Settings
  'settings:get': z.void(),
  'settings:set': z.object({ settings: SettingsSchema.partial() }),

  // Native
  'native:timerResolution': z.object({ action: z.enum(['get', 'set', 'reset']), value: z.number().optional() }),
  'native:dpcLatency': z.void(),
  'native:gpuMetrics': z.void(),

  // Overlay
  'overlay:show': z.void(),
  'overlay:hide': z.void(),
  'overlay:config': z.object({ config: OverlayConfigSchema.partial() }),

  // Spider
  'spider:scan': z.void(),
  'spider:idle': z.void(),
} as const;

export type IpcChannel = keyof typeof IpcChannels;
export type IpcRequest<C extends IpcChannel> = z.infer<typeof IpcChannels[C]>;