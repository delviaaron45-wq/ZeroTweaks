// Native module bridge - TypeScript bindings for Rust/C++ native module
import os from 'os';
import { logger } from '../utils/logger';

interface NativeModule {
  // Timer resolution
  queryTimerResolution(): { min: number; max: number; current: number };
  setTimerResolution(desired: number): { actual: number; success: boolean };
  resetTimerResolution(): void;

  // DPC Latency
  measureDPCLatency(durationMs: number): { avg: number; max: number; count: number };

  // GPU Metrics (NVML/ADLX)
  getGPUMetrics(): {
    temperature: number;
    utilization: number;
    memoryUsed: number;
    memoryTotal: number;
    clockSpeed: number;
    powerDraw: number;
    powerLimit: number;
  } | null;

  // CPU Metrics
  getCPUMetrics(): {
    usage: number;
    clockSpeed: number;
    temperature: number;
    powerDraw: number;
  } | null;

  // System info
  getSystemInfo(): {
    timerResolution: { min: number; max: number; current: number };
    cpuCount: number;
    memoryTotal: number;
    pageSize: number;
  };

  // Process priority
  setProcessPriority(pid: number, priority: 'idle' | 'belowNormal' | 'normal' | 'aboveNormal' | 'high' | 'realtime'): boolean;

  // Affinity
  setProcessAffinity(pid: number, affinityMask: number): boolean;

  // Cleanup
  shutdown(): void;
}

let nativeModule: NativeModule | null = null;
let isInitialized = false;

export async function initializeNative(): Promise<void> {
  if (isInitialized) return;

  try {
    // Try to load native module
    // In development, we'll use a mock; in production, load the .node file
    if (process.env.NODE_ENV === 'development') {
      nativeModule = createMockNativeModule();
      logger.info('Native module: Using mock implementation (development)');
    } else {
      const nativePath = require.resolve('../../../native/target/release/zerotweaks_native.node');
      nativeModule = require(nativePath);
      logger.info('Native module loaded successfully');
    }
    isInitialized = true;
  } catch (error) {
    logger.warn('Native module not available, using fallback:', error);
    nativeModule = createMockNativeModule();
    isInitialized = true;
  }
}

function createMockNativeModule(): NativeModule {
  return {
    queryTimerResolution: () => ({ min: 156250, max: 5000, current: 156250 }),
    setTimerResolution: (desired: number) => ({ actual: desired, success: true }),
    resetTimerResolution: () => {},
    measureDPCLatency: (durationMs: number) => ({ avg: 50, max: 200, count: durationMs }),
    getGPUMetrics: () => null,
    getCPUMetrics: () => null,
    getSystemInfo: () => ({
      timerResolution: { min: 156250, max: 5000, current: 156250 },
      cpuCount: os.cpus().length || 8,
      memoryTotal: 16 * 1024 * 1024 * 1024,
      pageSize: 4096,
    }),
    setProcessPriority: () => true,
    setProcessAffinity: () => true,
    shutdown: () => {},
  };
}

export function getNativeModule(): NativeModule | null {
  return nativeModule;
}

export function isNativeAvailable(): boolean {
  return isInitialized && nativeModule !== null;
}

// Cleanup on exit
process.on('exit', () => {
  if (nativeModule) {
    nativeModule.shutdown();
  }
});