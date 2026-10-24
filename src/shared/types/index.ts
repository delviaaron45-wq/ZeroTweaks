// Core shared types for ZeroTweaks
export interface Tweak {
  id: string;
  /** Display name (fallback if i18n key not provided/translated). */
  name: string;
  /** i18n key for the tweak name (e.g. 'tweaks.debloat.removeApps.name'). */
  nameKey?: string;
  category: TweakCategory;
  /** Description (fallback). */
  description: string;
  /** i18n key for description. */
  descriptionKey?: string;
  /** When this tweak helps (fallback). */
  whenHelps: string;
  /** i18n key for whenHelps. */
  whenHelpsKey?: string;
  risk: RiskLevel;
  evidence: EvidenceLevel;
  /** Expected impact on this machine. ALTO/MEDIO/BAJO. */
  impacto: ImpactLevel;
  /**
   * When set, the tweak cannot be applied with the current build/environment
   * (missing native vendor API, external tool, etc.). The UI shows it as
   * unavailable and disables Apply instead of offering an action that would
   * only fail. The text explains why.
   */
  unavailableReason?: string;
  requiresReboot: boolean;
  compatibility: Compatibility;
  detect: () => Promise<TweakState>;
  apply: (options?: ApplyOptions) => Promise<TweakResult>;
  revert: (originalState: TweakState) => Promise<TweakResult>;
  verify: (expectedState: TweakState) => Promise<boolean>;
}

export type TweakCategory =
  | 'system_performance'
  | 'gaming_fps'
  | 'gpu'
  | 'network_tcp'
  | 'peripherals_input'
  | 'power_cpu'
  | 'ram_storage'
  | 'debloat_apps'
  | 'privacy_telemetry'
  | 'services'
  | 'explorer_ui';

export type RiskLevel = 'safe' | 'moderate' | 'advanced';
export type EvidenceLevel = 'measured' | 'debated' | 'placebo';
export type ImpactLevel = 'alto' | 'medio' | 'bajo';

export interface Compatibility {
  windowsVersions: string[];
  formFactors: ('desktop' | 'laptop')[];
  cpuVendors?: ('Intel' | 'AMD')[];
  gpuVendors?: ('NVIDIA' | 'AMD' | 'Intel')[];
}

export interface TweakState {
  path: string;
  name: string;
  type: RegistryType;
  value: unknown;
  existed: boolean;
}

export type RegistryType = 'REG_SZ' | 'REG_DWORD' | 'REG_QWORD' | 'REG_BINARY' | 'REG_MULTI_SZ' | 'REG_EXPAND_SZ';

export interface ApplyOptions {
  dryRun?: boolean;
  force?: boolean;
}

export interface TweakResult {
  ok: boolean;
  data?: unknown;
  error?: string;
  previousState?: TweakState;
  newState?: TweakState;
}

export interface Profile {
  id: string;
  name: string;
  description: string;
  tweaks: string[];
  hardwareProfile?: HardwareProfile;
  createdAt: string;
  updatedAt: string;
  signature?: string;
}

export interface HardwareProfile {
  cpu: CpuInfo;
  gpu: GpuInfo;
  memory: MemoryInfo;
  storage: StorageInfo[];
  network: NetworkInfo;
  windowsVersion: WindowsVersion;
  isLaptop: boolean;
  hasBitLocker: boolean;
}

export interface CpuInfo {
  vendor: 'Intel' | 'AMD' | 'Unknown';
  model: string;
  cores: number;
  threads: number;
  baseClock: number;
  maxClock: number;
  architecture: string;
}

export interface GpuInfo {
  vendor: 'NVIDIA' | 'AMD' | 'Intel' | 'Unknown';
  model: string;
  driverVersion: string;
  vram: number;
  supportsHAGS: boolean;
  supportsResizableBAR: boolean;
}

export interface MemoryInfo {
  total: number;
  speed: number;
  type: string;
  channels: number;
}

export interface StorageInfo {
  deviceId: string;
  model: string;
  type: 'SSD' | 'HDD' | 'NVMe';
  size: number;
  smartStatus: string;
}

export interface NetworkInfo {
  adapterName: string;
  macAddress: string;
  speed: number;
  driverVersion: string;
}

export interface WindowsVersion {
  version: string;
  build: number;
  edition: 'Home' | 'Pro' | 'Enterprise' | 'Education' | 'Unknown';
  isInsider: boolean;
}

// Diagnosis types
export interface DiagnosisProblem {
  id: string;
  checkId: string;
  title: string;
  description: string;
  impact: ImpactLevel;
  expected: string;
  category:
    | 'display'
    | 'memory'
    | 'gpu'
    | 'power'
    | 'thermal'
    | 'network'
    | 'driver'
    | 'software'
    | 'storage'
    | 'features'
    | 'bottleneck';
  fixable: boolean;
  guide?: { step: number; text: string }[];
  fixAction?: 'set_refresh_rate' | 'set_power_plan' | 'force_dedicated_gpu' | 'disable_adapter_power_save' | 'enable_hags' | 'enable_game_mode' | 'close_process' | 'disable_overlay' | 'reapply_profile';
  fixParams?: Record<string, unknown>;
  relatedTweaks?: string[];
  evidence?: Record<string, unknown>;
}

export interface BottleneckResult {
  limiter: 'CPU' | 'GPU' | 'VRAM' | 'RAM' | 'DISK' | 'NONE';
  explanation: string;
  cpuPerCore: number[];
  cpuAvg: number;
  gpu: number;
  vram: number;
  ram: number;
  disk: number;
  measuredUnderLoad: boolean;
  durationMs: number;
  timestamp: string;
}

export interface SpiderLeg {
  segments: { x: number; y: number }[];
  target: { x: number; y: number };
  phase: number;
}

export interface SpiderState {
  mode: 'idle' | 'scan' | 'done' | 'error';
  currentTarget?: { getBoundingClientRect: () => Rect } | null;
  position: { x: number; y: number };
  legs: SpiderLeg[];
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface FineTuneItem {
  tweakId: string;
  name: string;
  description: string;
  impacto: ImpactLevel;
  evidence: EvidenceLevel;
  enabled: boolean;
}

export interface InGameGameConfig {
  gameId: string;
  name: string;
  executable: string;
  configPath: string;
  backupPath?: string;
  supported: boolean;
  writableKeys?: Record<string, string[]>;
}

export interface DiagnosisProgress {
  check: string;
  index: number;
  total: number;
  percent: number;
  state: 'running' | 'done' | 'error';
  message?: string;
}

export interface BottleneckResult {
  limiter: 'CPU' | 'GPU' | 'VRAM' | 'RAM' | 'DISK' | 'NONE';
  explanation: string;
  cpuPerCore: number[];
  cpuAvg: number;
  gpu: number;
  vram: number;
  ram: number;
  disk: number;
  measuredUnderLoad: boolean;
  durationMs: number;
  timestamp: string;
}

export interface DiagnosisReport {
  id: string;
  timestamp: string;
  score: number;
  problems: DiagnosisProblem[];
  summary: { alto: number; medio: number; bajo: number; total: number };
  bottleneck: BottleneckResult;
  fineTune: FineTuneItem[];
  games: InGameGameConfig[];
  scoreBreakdown: { label: string; points: number; max: number }[];
  healthyMessage?: string;
  durationMs: number;
}

export interface FineTuneItem {
  tweakId: string;
  name: string;
  description: string;
  impacto: ImpactLevel;
  evidence: EvidenceLevel;
  enabled: boolean;
}

export interface InGameGameConfig {
  gameId: string;
  name: string;
  executable: string;
  configPath: string;
  backupPath?: string;
  supported: boolean;
  writableKeys?: Record<string, string[]>;
}

export interface DiagnosisProgress {
  check: string;
  index: number;
  total: number;
  percent: number;
  state: 'running' | 'done' | 'error';
  message?: string;
}

export type InGameProfile = 'max_performance' | 'balanced' | 'quality';

export interface BeforeAfterMetrics {
  /** Average frame time in ms. `null` when it cannot be measured outside a game. */
  avgFrametimeMs: number | null;
  /** 1% low FPS. `null` when it cannot be measured outside a game. */
  p1LowFps: number | null;
  /** 0.1% low FPS. `null` when it cannot be measured outside a game. */
  p01LowFps: number | null;
  /** Average ping under load in ms. */
  pingLoadedMs: number | null;
  /** CPU temperature in °C. `null` when the sensor is not exposed. */
  cpuTempC: number | null;
  /** GPU temperature in °C. `null` when the sensor is not exposed. */
  gpuTempC: number | null;
  /** Main path boot time in ms. */
  bootTimeMs: number | null;
  /** Number of repetitions used for the measurement. */
  repetitions: number;
  /** What could not be measured and why. */
  unavailable: string[];
  timestamp: string;
}

export interface BeforeAfterComparison {
  before: BeforeAfterMetrics;
  after: BeforeAfterMetrics;
  deltas: {
    frametimeMs: number | null;
    p1Low: number | null;
    pingLoadedMs: number | null;
    cpuTempC: number | null;
    bootTimeMs: number | null;
  };
  verdict: 'mejora' | 'sin_efecto' | 'empeora' | 'sin_datos';
  /** Human readable summary of the comparison. */
  summary: string;
}

export interface BackupManifest {
  id: string;
  timestamp: string;
  profileId?: string;
  tweaks: TweakState[];
  services: ServiceState[];
  powerPlan: string;
  appxPackages: string[];
  hagsState: boolean;
  gameModeState: boolean;
  journal: JournalEntry[];
  /** In-game configuration files backed up by the diagnosis module. */
  gameConfigs?: {
    gameId: string;
    gameName: string;
    configPath: string;
    backupPath: string;
    createdAt: string;
  }[];
}

export interface ServiceState {
  name: string;
  startType: 'Auto' | 'Manual' | 'Disabled';
  status: 'Running' | 'Stopped' | 'Paused';
}

export interface JournalEntry {
  id: string;
  timestamp: string;
  tweakId: string;
  action: 'apply' | 'revert' | 'verify';
  previousState: TweakState;
  newState: TweakState;
  success: boolean;
  error?: string;
}

// UI types (also exported from ui.ts for backward compatibility)
export interface OverlayConfig {
  enabled: boolean;
  position: { x: number; y: number };
  scale: number;
  opacity: number;
  clickThrough: boolean;
  modules: OverlayModule[];
  globalHotkey: string;
}

export type OverlayModule =
  | 'cpu'
  | 'ram'
  | 'gpu'
  | 'ping'
  | 'timer'
  | 'fps'
  | 'temperature';

export type Language = 'es' | 'en' | 'pt' | 'fr' | 'de';

export interface Settings {
  language: Language;
  theme: 'dark' | 'light' | 'system';
  autoStart: boolean;
  minimizeToTray: boolean;
  checkUpdates: boolean;
  telemetryOptIn: boolean;
  dryRunDefault: boolean;
  batterySaverMode: boolean;
  gameModeAuto: boolean;
  overlay: OverlayConfig;
  backupRetentionDays: number;
  maxLogSize: number;
  /** URL of the remote `version.json` manifest used by the auto-updater. */
  updateUrl?: string;
  /** Cinematic effects (particles, ripples, glow). Off = fully static interface. */
  cinematicEffects?: boolean;
}

/** Manifest published by the release server (`version.json`). */
export interface UpdateManifest {
  version: string;
  /** Direct download of the new build (installer .exe or portable .zip). */
  url: string;
  /** Optional SHA-256 of the downloaded file, verified before installing. */
  sha256?: string;
  /** Release notes shown in the banner. */
  notes?: string;
  publishedAt?: string;
  /** When true the banner cannot be dismissed. */
  mandatory?: boolean;
}

export interface UpdateInfo {
  currentVersion: string;
  latestVersion: string;
  available: boolean;
  url?: string;
  sha256?: string;
  notes?: string;
  publishedAt?: string;
  mandatory?: boolean;
}

export type UpdatePhase =
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'verifying'
  | 'ready'
  | 'installing'
  | 'up-to-date'
  | 'error';

export interface UpdateStatus {
  phase: UpdatePhase;
  /** 0-100 during the download. */
  percent: number;
  /** Bytes downloaded / total, when known. */
  downloadedBytes: number;
  totalBytes: number;
  message?: string;
  error?: string;
  info?: UpdateInfo;
}