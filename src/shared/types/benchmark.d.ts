export interface BenchmarkResult {
    id: string;
    timestamp: string;
    tweakId?: string;
    profileId?: string;
    metrics: BenchmarkMetrics;
    systemState: SystemSnapshot;
}
export interface BenchmarkMetrics {
    timerResolution: TimerMetrics;
    dpcLatency: DpcMetrics;
    network: NetworkMetrics;
    bootTime: number;
    idleRam: number;
    startupProcesses: number;
    frameTimes: FrameTimeMetrics;
}
export interface TimerMetrics {
    min: number;
    max: number;
    current: number;
    jitter: number;
    samples: number[];
}
export interface DpcMetrics {
    avg: number;
    max: number;
    count: number;
}
export interface NetworkMetrics {
    ping: number;
    jitter: number;
    packetLoss: number;
}
export interface FrameTimeMetrics {
    avg: number;
    p1Low: number;
    p01Low: number;
    fps: number;
}
export interface SystemSnapshot {
    appliedTweaks: string[];
    activeProfile: string;
    windowsVersion: string;
    driverVersions: Record<string, string>;
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
export interface RestorePoint {
    sequenceNumber: number;
    creationTime: string;
    description: string;
    type: string;
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
}
export interface ServiceState {
    name: string;
    startType: 'Auto' | 'Manual' | 'Disabled';
    status: 'Running' | 'Stopped' | 'Paused';
}
//# sourceMappingURL=benchmark.d.ts.map