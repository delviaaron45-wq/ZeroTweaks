import type { ImpactLevel } from './index';
/** One problem found by the diagnostic. */
export interface DiagnosisProblem {
    id: string;
    /** Machine id used by the catalog/impacto field. */
    checkId: string;
    title: string;
    description: string;
    /** Impact shown as a range (never a fixed promise). */
    impact: ImpactLevel;
    /** Expected improvement, expressed as a range, e.g. "+5-15% 1% lows". */
    expected: string;
    /** Category of the check for grouping / filtering. */
    category: 'display' | 'memory' | 'gpu' | 'power' | 'thermal' | 'network' | 'driver' | 'software' | 'storage' | 'features' | 'bottleneck';
    /** True when ZeroTweaks can fix it from the app. */
    fixable: boolean;
    /** Detailed guide when fixable === false. */
    guide?: {
        step: number;
        text: string;
    }[];
    /** The action to run when fixable === true. */
    fixAction?: 'set_refresh_rate' | 'set_power_plan' | 'force_dedicated_gpu' | 'disable_adapter_power_save' | 'enable_hags' | 'enable_game_mode' | 'close_process' | 'disable_overlay' | 'reapply_profile';
    /** Parameters for fixAction. */
    fixParams?: Record<string, unknown>;
    /** Fixable tweaks this problem maps to (catalog ids). */
    relatedTweaks?: string[];
    /** Measured values supporting the finding. */
    evidence?: Record<string, unknown>;
}
/** Screen state for the "Ajustes finos" card. */
export interface FineTuneItem {
    tweakId: string;
    name: string;
    description: string;
    impacto: ImpactLevel;
    evidence: EvidenceLevel;
    /** Always low impact -> disabled by default. */
    enabled: boolean;
}
/** In-game settings profiles. */
export type InGameProfile = 'max_performance' | 'balanced' | 'quality';
export interface InGameGameConfig {
    gameId: string;
    name: string;
    executable: string;
    configPath: string;
    /** Path of the file backed up before modification. */
    backupPath?: string;
    /** Whether ZeroTweaks can read/write this game. */
    supported: boolean;
    /** Sections we can write, keyed by config section. */
    writableKeys?: Record<string, string[]>;
}
/** Result of applying an in-game profile. */
export interface InGameApplyResult {
    ok: boolean;
    gameId: string;
    profile: InGameProfile;
    backupPath?: string;
    changedKeys: {
        section: string;
        key: string;
        before: string;
        after: string;
    }[];
    error?: string;
}
/** Bottleneck measurement result. */
export interface BottleneckResult {
    /** The limiting resource. */
    limiter: 'CPU' | 'GPU' | 'VRAM' | 'RAM' | 'DISK' | 'NONE';
    /** Human readable explanation. */
    explanation: string;
    /** Per-metric utilisation percentages (0-100). */
    cpuPerCore: number[];
    cpuAvg: number;
    gpu: number;
    vram: number;
    ram: number;
    disk: number;
    /** True when the measurement was taken under load. */
    measuredUnderLoad: boolean;
    durationMs: number;
    timestamp: string;
}
/** Result of a single before/after A/B test. */
export interface BeforeAfterMetrics {
    avgFrametimeMs: number;
    p1LowFps: number;
    p01LowFps: number;
    pingLoadedMs: number;
    cpuTempC: number;
    gpuTempC: number;
    bootTimeMs: number;
    repetitions: number;
    timestamp: string;
}
export interface BeforeAfterComparison {
    before: BeforeAfterMetrics;
    after: BeforeAfterMetrics;
    deltas: {
        frametimeMs: number;
        p1Low: number;
        pingLoadedMs: number;
        cpuTempC: number;
        bootTimeMs: number;
    };
    verdict: 'mejora' | 'sin_efecto' | 'empeora';
}
/** Full diagnosis report. */
export interface DiagnosisReport {
    id: string;
    timestamp: string;
    /** Overall system score 0-100 (rises when real problems are fixed). */
    score: number;
    problems: DiagnosisProblem[];
    /** Count by impact. */
    summary: {
        alto: number;
        medio: number;
        bajo: number;
        total: number;
    };
    bottleneck: BottleneckResult;
    fineTune: FineTuneItem[];
    games: InGameGameConfig[];
    /** Score breakdown for transparency. */
    scoreBreakdown: {
        label: string;
        points: number;
        max: number;
    }[];
    /** Set when no big problem is found. */
    healthyMessage?: string;
    durationMs: number;
}
/** Progress event emitted while running the diagnostic. */
export interface DiagnosisProgress {
    check: string;
    index: number;
    total: number;
    percent: number;
    /** 'running' | 'done' | 'error' */
    state: 'running' | 'done' | 'error';
    message?: string;
}
//# sourceMappingURL=diagnosis.d.ts.map