// Types for the high impact insights module (section 15).
import type { ImpactLevel } from './index';

// ---------------------------------------------------------------------------
// 15.1 Stutter analysis
// ---------------------------------------------------------------------------
export type StutterCause =
  | 'shader_compilation'
  | 'disk_access'
  | 'cpu_saturated'
  | 'gpu_saturated'
  | 'thermal'
  | 'memory_paging'
  | 'driver_interrupt'
  | 'unknown';

export interface StutterSample {
  /** Seconds since the session started. */
  t: number;
  cpuPercent: number;
  gpuPercent: number | null;
  diskQueueLength: number;
  memAvailableMB: number;
  pagesPerSec: number;
  dpcPercent: number;
  irqPercent: number;
  cpuTempC: number | null;
  gpuTempC: number | null;
}

export interface StutterPeak {
  startIndex: number;
  durationMs: number;
  /** 0-100, relative severity inside the recorded session. */
  severity: number;
  cause: StutterCause;
  /** Values that justify the classification. */
  evidence: string[];
}

export interface StutterReport {
  durationMs: number;
  sampleCount: number;
  samples: StutterSample[];
  peaks: StutterPeak[];
  dominantCause: StutterCause;
  summary: string;
  recommendation: string;
  confidence: 'alta' | 'media' | 'baja';
  /** Honest note about what could not be measured. */
  limitations: string[];
}

// ---------------------------------------------------------------------------
// 15.2 Driver latency (DPC / ISR)
// ---------------------------------------------------------------------------
export interface DriverSuspect {
  deviceName: string;
  deviceClass: string;
  driverVersion: string;
  driverDate: string;
  reason: string;
  outdated: boolean;
  /** Action that can be applied from the app. */
  action: 'update_driver' | 'change_usb_port' | 'disable_device' | 'msi_mode' | 'none';
}

export interface DriverLatencyReport {
  dpcPercent: number;
  irqPercent: number;
  verdict: 'ok' | 'alto' | 'indeterminado';
  suspects: DriverSuspect[];
  summary: string;
  recommendation: string;
  limitations: string[];
}

// ---------------------------------------------------------------------------
// 15.3 Smart FPS limiter
// ---------------------------------------------------------------------------
export interface FpsLimiterAdvice {
  refreshRate: number;
  maxRefreshRate: number;
  vrr: 'desconocido' | 'activo' | 'inactivo';
  gpuUtilization: number | null;
  gpuSaturated: boolean;
  /** Cap suggested for the detected game (frame rate limit). */
  suggestedCap: number;
  reason: string;
  latencyNote: string;
  vrrNote: string;
  measurable: boolean;
}

// ---------------------------------------------------------------------------
// 15.4 Anonymous comparison
// ---------------------------------------------------------------------------
export interface ComparisonResult {
  enabled: boolean;
  /** Percentile inside the reference group (0-100). */
  percentile: number | null;
  /** Negative means slower than the reference. */
  deltaPercent: number | null;
  note: string;
  deeperChecks: string[];
}

// ---------------------------------------------------------------------------
// 15.5 Known heavy software
// ---------------------------------------------------------------------------
export type HeavyAppKind = 'rgb' | 'antivirus' | 'optimizer' | 'overlay' | 'launcher' | 'other';

export interface HeavyApp {
  id: string;
  name: string;
  process: string;
  kind: HeavyAppKind;
  reason: string;
  alternative: string;
  running: boolean;
  ramMB: number;
  cpuPercent: number;
  startUpDisabled: boolean;
  /** True when the app is in the user's exclusion list. */
  excluded: boolean;
}

export interface HeavySoftwareReport {
  apps: HeavyApp[];
  totalRamMB: number;
  totalCpuPercent: number;
  summary: string;
}

// ---------------------------------------------------------------------------
// 15.2b CPU and cores
// ---------------------------------------------------------------------------
export interface ChipsetDriverInfo {
  version: string;
  date: string;
  outdated: boolean;
  officialUrl: string;
  present: boolean;
}

export interface CpuCoreReport {
  hybrid: boolean;
  performanceCores: number;
  efficiencyCores: number;
  chipsetDriver: ChipsetDriverInfo | null;
  /** Processes detected as running a game and their affinity. */
  gameProcesses: { process: string; affinity: string; restrictedToEfficiencyCores: boolean }[];
  summary: string;
  guidance: string[];
}

// ---------------------------------------------------------------------------
// 15.6 Display and input
// ---------------------------------------------------------------------------
export interface InsightFinding {
  id: string;
  title: string;
  detail: string;
  impact: ImpactLevel;
  fixable: boolean;
  fixAction?: string;
  fixParams?: Record<string, unknown>;
}

export interface DisplayInputReport {
  refreshRate: number;
  maxRefreshRate: number;
  vrr: string;
  fullscreenMode: string;
  windowedOptimizations: string;
  hdrActive: boolean | null;
  colorDepth: number;
  mouseName: string;
  mousePollingRate: number | null;
  bluetoothDevices: string[];
  audioDevice: string;
  audioLatencyMode: string;
  audioEnhancements: boolean | null;
  findings: InsightFinding[];
}

// ---------------------------------------------------------------------------
// 15.7 Memory and files
// ---------------------------------------------------------------------------
export interface PageFileInfo {
  totalMB: number;
  drive: string;
  onSSD: boolean;
  autoManaged: boolean;
}

export interface ShaderCacheInfo {
  name: string;
  path: string;
  sizeMB: number;
  ageDays: number;
}

export interface MemoryFilesReport {
  ramGB: number;
  pageFile: PageFileInfo | null;
  shaderCaches: ShaderCacheInfo[];
  systemDriveFreeGB: number;
  systemDriveTotalGB: number;
  findings: InsightFinding[];
}

// ---------------------------------------------------------------------------
// 15.8 Repair Windows
// ---------------------------------------------------------------------------
export interface RepairAction {
  id: string;
  name: string;
  description: string;
  command: string;
  requiresAdmin: boolean;
  risk: 'bajo' | 'medio' | 'alto';
  /** Symptoms that justify running it. */
  symptom: string;
}

export interface RepairResult {
  id: string;
  ok: boolean;
  output: string;
  durationMs: number;
  requiresAdmin: boolean;
}

// ---------------------------------------------------------------------------
// 15.9 Temperature and hardware
// ---------------------------------------------------------------------------
export interface ThermalReport {
  cpuTempC: number | null;
  gpuTempC: number | null;
  throttlingDetected: boolean;
  sustainedHigh: boolean;
  onBattery: boolean;
  charging: boolean;
  batteryChargePercent: number | null;
  guidance: string[];
  summary: string;
}

// ---------------------------------------------------------------------------
// 15.10 BIOS guides
// ---------------------------------------------------------------------------
export interface BiosGuide {
  id: string;
  vendor: string;
  topic: 'xmp_expo' | 'resizable_bar' | 'memory' | 'virtualization' | 'c_states' | 'other';
  title: string;
  steps: string[];
  risk: string;
  revert: string[];
}

// ---------------------------------------------------------------------------
// 15.11 Smart game mode
// ---------------------------------------------------------------------------
export interface PausableCandidate {
  process: string;
  name: string;
  ramMB: number;
  cpuPercent: number;
  autoPaused: boolean;
  excluded: boolean;
  reason: string;
}

export interface GameSessionRecord {
  startedAt: string;
  paused: string[];
  closedApps: number;
  freedRamMB: number;
  freedCpuPercent: number;
}

export interface ChecklistItem {
  id: string;
  label: string;
  status: 'ok' | 'pendiente' | 'no_verificable';
  detail: string;
  action?: { label: string; kind: string; params?: Record<string, unknown> };
}

// ---------------------------------------------------------------------------
// 15.12 Per game profiles
// ---------------------------------------------------------------------------
export interface GameProfileRecommendation {
  gameId: string;
  name: string;
  executable: string;
  configPath: string;
  supported: boolean;
  systemTweaks: { id: string; name: string; why: string }[];
  inGameSettings: string[];
  evidence: string;
}
