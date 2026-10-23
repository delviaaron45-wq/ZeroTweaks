import type { TweakState, ServiceState, JournalEntry, BackupManifest } from './index';

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