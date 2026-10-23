// Renderer-side API bridge.
// The real implementation lives in the Electron preload (src/preload/index.ts) and is
// exposed on `window.zerotweaks` through contextBridge. This module is the single
// typed entry point used by every page/component.
import type {
  BeforeAfterComparison,
  BeforeAfterMetrics,
  DiagnosisProgress,
  DiagnosisReport,
  InGameGameConfig,
  InGameProfile,
  UpdateInfo,
  UpdateStatus,
} from '@shared/types/index';
import type {
  BiosGuide,
  ChecklistItem,
  ComparisonResult,
  CpuCoreReport,
  DisplayInputReport,
  DriverLatencyReport,
  FpsLimiterAdvice,
  GameProfileRecommendation,
  GameSessionRecord,
  HeavySoftwareReport,
  MemoryFilesReport,
  PausableCandidate,
  RepairAction,
  RepairResult,
  StutterReport,
  ThermalReport,
} from '@shared/types/insights';
import type {
  BatteryStatus,
  BiosDiagnostics,
  PowerProfileKind,
  PowerSwitchResult,
  ProfileBundle,
  ShaderCacheCleanResult,
  ShaderCacheReport,
  SyncConfig,
  SyncResult,
} from '@shared/types/pro';

export interface GameProfileDefinition {
  id: InGameProfile;
  name: string;
  description: string;
  notes: string;
  values: Record<string, Record<string, string>>;
}

export interface ApplyProfileResult {
  ok: boolean;
  gameId: string;
  profile: InGameProfile;
  configPath: string;
  backupPath?: string;
  changedKeys: string[];
  error?: string;
}

type IpcFn = (...args: any[]) => Promise<any>;

export interface ZeroTweaksApi {
  tweaks: Record<string, IpcFn>;
  profiles: Record<string, IpcFn>;
  system: Record<string, IpcFn>;
  game: Record<string, IpcFn>;
  benchmark: Record<string, IpcFn>;
  settings: Record<string, IpcFn>;
  overlay: Record<string, IpcFn> & {
    'on:overlayUpdate': (callback: (data: any) => void) => () => void;
  };
  spider: Record<string, IpcFn> & {
    'on:spiderUpdate': (callback: (state: any) => void) => () => void;
  };
  utils: Record<string, IpcFn>;
  update: {
    check: () => Promise<UpdateInfo>;
    download: () => Promise<{ ok: boolean; error?: string }>;
    status: () => Promise<UpdateStatus>;
    onStatus: (callback: (status: UpdateStatus) => void) => () => void;
  };
  pro: {
    latencyPing: () => Promise<{ t: number }>;
    bios: () => Promise<BiosDiagnostics>;
    scanCaches: () => Promise<ShaderCacheReport>;
    cacheUsers: () => Promise<string[]>;
    cleanCaches: () => Promise<ShaderCacheCleanResult>;
    restoreCaches: (backupRoot: string) => Promise<{ ok: boolean; restored: number; error?: string }>;
    battery: () => Promise<BatteryStatus>;
    applyPower: (kind: PowerProfileKind) => Promise<PowerSwitchResult>;
    autoPower: () => Promise<PowerSwitchResult>;
    buildBundle: () => Promise<ProfileBundle>;
    exportBundle: (targetPath: string) => Promise<{ ok: boolean; path: string; error?: string }>;
    importBundle: (sourcePath: string) => Promise<{ ok: boolean; bundle?: ProfileBundle; profiles: number; error?: string }>;
    syncConfig: () => Promise<SyncConfig>;
    setSyncConfig: (config: SyncConfig) => Promise<SyncConfig>;
    syncUpload: () => Promise<SyncResult>;
    syncDownload: () => Promise<SyncResult>;
    pickExportPath: () => Promise<string | null>;
    pickImportFile: () => Promise<string | null>;
  };
  diagnosis: {
    run: () => Promise<DiagnosisReport>;
    getReport: () => Promise<DiagnosisReport | null>;
    fixProblem: (problemId: string) => Promise<{ ok: boolean; error?: string }>;
    runABTest: (before?: BeforeAfterMetrics) => Promise<BeforeAfterComparison>;
    getGames: () => Promise<InGameGameConfig[]>;
    getGameProfiles: () => Promise<GameProfileDefinition[]>;
    getGameConfig: (gameId: string) => Promise<{
      ok: boolean;
      exists: boolean;
      configPath: string;
      values: Record<string, string>;
      error?: string;
    }>;
    applyGameProfile: (gameId: string, profile: InGameProfile) => Promise<ApplyProfileResult>;
    revertGameProfile: (gameId: string) => Promise<{ ok: boolean; restoredFrom?: string; error?: string }>;
    setGameFpsCap: (gameId: string, cap: number) => Promise<ApplyProfileResult>;
    getLatencyTechnology: () => Promise<{
      vendor: 'NVIDIA' | 'AMD' | 'Intel' | 'Unknown';
      technology: 'Reflex' | 'Anti-Lag' | 'XeSS' | null;
      available: boolean;
      note: string;
    }>;
    onProgress: (callback: (progress: DiagnosisProgress) => void) => () => void;
  };
  insights: {
    stutter: (durationMs?: number) => Promise<StutterReport>;
    drivers: () => Promise<DriverLatencyReport>;
    fpsLimiter: () => Promise<FpsLimiterAdvice>;
    comparison: (enabled: boolean) => Promise<ComparisonResult>;
    heavySoftware: () => Promise<HeavySoftwareReport>;
    closeHeavy: (processes: string[]) => Promise<{ closed: string[]; failed: string[] }>;
    disableAutostart: (process: string) => Promise<{ ok: boolean; removed: string[]; backupPath?: string; error?: string }>;
    excludeHeavy: (excluded: string[]) => Promise<string[]>;
    cpu: () => Promise<CpuCoreReport>;
    display: () => Promise<DisplayInputReport>;
    memoryFiles: () => Promise<MemoryFilesReport>;
    repairActions: () => Promise<RepairAction[]>;
    suggestRepairs: (symptoms: Record<string, boolean>) => Promise<RepairAction[]>;
    runRepair: (actionId: string) => Promise<RepairResult>;
    isElevated: () => Promise<boolean>;
    thermal: (cpuTempC: number | null, gpuTempC: number | null, throttling: boolean) => Promise<ThermalReport>;
    biosGuides: (vendor?: string) => Promise<BiosGuide[]>;
    pausable: () => Promise<PausableCandidate[]>;
    setGameModeExclusions: (excluded: string[]) => Promise<string[]>;
    detectGame: () => Promise<{ name: string; process: string } | null>;
    recordSession: (paused: string[], freedRamMB: number, freedCpuPercent: number) => Promise<GameSessionRecord>;
    checklist: () => Promise<ChecklistItem[]>;
    gameProfiles: (gameId?: string) => Promise<GameProfileRecommendation[]>;
  };
}

declare global {
  interface Window {
    zerotweaks: ZeroTweaksApi;
  }
}

function notAvailable(): never {
  throw new Error(
    'ZeroTweaks API no disponible. La aplicación debe ejecutarse dentro de Electron con el preload cargado.'
  );
}

/**
 * Returns the IPC bridge exposed by the preload script.
 * Throws a clear error when running outside Electron (e.g. plain browser).
 */
export const zerotweaks: ZeroTweaksApi = (() => {
  const api = typeof window !== 'undefined' ? window.zerotweaks : undefined;
  if (api) return api;
  return new Proxy({} as ZeroTweaksApi, {
    get() {
      return notAvailable;
    },
  });
})();

export default zerotweaks;
