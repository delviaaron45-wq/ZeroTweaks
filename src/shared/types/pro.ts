// Types for the PRO module (exclusive features).
import type { ImpactLevel } from './index';

// ---------------------------------------------------------------------------
// 1. Click latency tester
// ---------------------------------------------------------------------------
export interface ClickLatencySample {
  index: number;
  /** Input event -> next painted frame (UI response). */
  uiLatencyMs: number;
  /** Click -> answer of the main process (round trip). */
  roundTripMs: number;
}

export interface ClickLatencyReport {
  samples: ClickLatencySample[];
  count: number;
  uiMinMs: number;
  uiAvgMs: number;
  uiP95Ms: number;
  uiMaxMs: number;
  roundTripMinMs: number;
  roundTripAvgMs: number;
  roundTripP95Ms: number;
  createdAt: string;
  /** What the measurement does and does not cover. */
  notes: string[];
}

// ---------------------------------------------------------------------------
// 2. BIOS / board diagnostics
// ---------------------------------------------------------------------------
export type Confidence = 'confirmado' | 'probable' | 'no_verificable';

export interface ProFinding {
  id: string;
  title: string;
  detail: string;
  impact: ImpactLevel;
  confidence: Confidence;
  /** Evidence that supports the finding. */
  evidence: string[];
  guideId?: string;
}

export interface BiosDiagnostics {
  boardVendor: string;
  boardModel: string;
  biosVersion: string;
  cpuModel: string;
  memory: {
    type: string;
    dimms: number;
    channels: number;
    configuredMHz: number;
    spdMHz: number;
    /** True when the memory runs above the JEDEC base speed. */
    xmpLikelyEnabled: boolean;
    /** Highest speed the memory controller of this CPU supports (reference). */
    maxSupportedMHz: number;
  };
  resizableBar: {
    cpuSupported: boolean;
    gpuSupported: boolean;
    enabled: boolean | null;
    confidence: Confidence;
    evidence: string[];
  };
  virtualization: {
    svmOrVtxEnabled: boolean;
    hypervisorPresent: boolean;
  };
  cStates: {
    enabled: boolean | null;
    evidence: string[];
  };
  findings: ProFinding[];
  notes: string[];
}

// ---------------------------------------------------------------------------
// 3. Shader cache cleaner
// ---------------------------------------------------------------------------
export interface ShaderCacheEntry {
  id: string;
  name: string;
  vendor: 'NVIDIA' | 'AMD' | 'Intel' | 'DirectX';
  path: string;
  exists: boolean;
  sizeMB: number;
  fileCount: number;
}

export interface ShaderCacheReport {
  entries: ShaderCacheEntry[];
  totalSizeMB: number;
  totalFiles: number;
}

export interface ShaderCacheCleanResult {
  ok: boolean;
  /** Folders moved aside (they are restored from here if needed). */
  cleaned: { id: string; name: string; path: string; backupPath: string; freedMB: number }[];
  failed: { id: string; name: string; error: string }[];
  backupRoot: string;
  totalFreedMB: number;
}

// ---------------------------------------------------------------------------
// 4. Battery / silent mode
// ---------------------------------------------------------------------------
export type PowerProfileKind = 'performance' | 'balanced' | 'saver';

export interface BatteryStatus {
  hasBattery: boolean;
  onBattery: boolean;
  charging: boolean;
  percent: number | null;
  timeToFull: string | null;
  activePlanGuid: string;
  activePlanName: string;
  /** Plan applied when the charger is connected. */
  performancePlanGuid: string;
  /** Plan applied when running on battery. */
  silentPlanGuid: string;
  /** True when the current plan matches the state of the charger. */
  matchesChargerState: boolean;
  notes: string[];
}

export interface PowerSwitchResult {
  ok: boolean;
  kind: PowerProfileKind;
  planName: string;
  error?: string;
  /** Extra settings applied to the plan (min/max processor state, cooling policy). */
  details: string[];
}

// ---------------------------------------------------------------------------
// 5. Profile export / import / cloud sync
// ---------------------------------------------------------------------------
export interface ProfileBundle {
  format: 'zerotweaks-bundle';
  version: 1;
  createdAt: string;
  appVersion: string;
  settings: Record<string, unknown>;
  profiles: { id: string; name: string; description: string; tweaks: string[] }[];
  selectedTweakIds: string[];
  appliedTweakIds: string[];
}

export interface SyncConfig {
  enabled: boolean;
  /** HTTP endpoint that stores the bundle (GET/PUT). */
  endpoint: string;
  /** Optional bearer token. */
  token: string;
  /** Upload automatically after a change. */
  autoSync: boolean;
  lastSyncAt: string | null;
  lastError: string | null;
}

export interface SyncResult {
  ok: boolean;
  direction: 'upload' | 'download';
  bytes: number;
  message: string;
  error?: string;
}
