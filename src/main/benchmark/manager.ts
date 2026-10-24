// Benchmark Module - Comprehensive system performance measurement
import { execPowerShell } from '../../shared/utils/process';
import { getAppDataPath, writeJson, readJson, ensureDir } from '../../shared/utils/files';
import { logger } from '../utils/logger';
import type { BenchmarkResult, BenchmarkMetrics, TimerMetrics, DpcMetrics, NetworkMetrics, FrameTimeMetrics, SystemSnapshot } from '../../shared/types/all';
import fs from 'fs/promises';
import path from 'path';

export class BenchmarkManager {
  private resultsDir: string;

  constructor() {
    this.resultsDir = getAppDataPath('benchmarks');
  }

  async initialize(): Promise<void> {
    await ensureDir(this.resultsDir);
  }

  async runFullBenchmark(tweakId?: string, profileId?: string): Promise<BenchmarkResult> {
    logger.info('Starting full benchmark suite...');
    
    const stages = [
      { name: 'Timer Resolution', fn: () => this.measureTimerResolution() },
      { name: 'DPC Latency', fn: () => this.measureDPCLatency() },
      { name: 'Network', fn: () => this.measureNetwork() },
      { name: 'Boot Time', fn: () => this.measureBootTime() },
      { name: 'Idle RAM', fn: () => this.measureIdleRAM() },
      { name: 'Startup Processes', fn: () => this.measureStartupProcesses() },
      { name: 'Frame Times', fn: () => this.measureFrameTimes() },
    ];

    const metrics: Partial<BenchmarkMetrics> = {};
    
    for (const stage of stages) {
      logger.info(`Benchmark: ${stage.name}...`);
      try {
        const result = await stage.fn();
        (metrics as any)[stage.name.toLowerCase().replace(' ', '')] = result;
      } catch (error: any) {
        logger.error(`Benchmark stage ${stage.name} failed:`, error);
        (metrics as any)[stage.name.toLowerCase().replace(' ', '')] = this.getDefaultMetric(stage.name);
      }
    }

    // Get system snapshot
    const systemState = await this.getSystemSnapshot(tweakId, profileId);

    const result: BenchmarkResult = {
      id: `bench_${Date.now()}`,
      timestamp: new Date().toISOString(),
      tweakId,
      profileId,
      metrics: metrics as BenchmarkMetrics,
      systemState,
    };

    // Save result
    await this.saveResult(result);
    
    logger.info('Benchmark completed');
    return result;
  }

  async runQuickBenchmark(): Promise<Partial<BenchmarkMetrics>> {
    logger.info('Running quick benchmark...');
    
    const [timer, dpc, network] = await Promise.all([
      this.measureTimerResolution(),
      this.measureDPCLatency(5000), // 5 seconds
      this.measureNetwork(),
    ]);

    return { timerResolution: timer, dpcLatency: dpc, network };
  }

  private async measureTimerResolution(): Promise<TimerMetrics> {
    // Use native module if available, fallback to PowerShell
    try {
      // @ts-expect-error -- window.zerotweaks is injected by the preload bridge at runtime
      const native = global.nativeModule;
      if (native?.queryTimerResolution) {
        const res = native.queryTimerResolution();
        return {
          min: res.min,
          max: res.max,
          current: res.current,
          jitter: 0,
          samples: [],
        };
      }
    } catch {}

    // PowerShell fallback: ask ntdll for the real timer resolution. The old
    // implementation sampled CPU load in a loop, which has nothing to do with
    // the timer and produced a meaningless "jitter" after ~100 slow calls.
    const { stdout } = await execPowerShell(`
      $code = @'
      using System;
      using System.Runtime.InteropServices;
      public class Timer {
        [DllImport("ntdll.dll")] 
        public static extern int NtQueryTimerResolution(out uint MinimumResolution, out uint MaximumResolution, out uint ActualResolution);
      }
'@
      Add-Type -TypeDefinition $code
      $min = 0; $max = 0; $cur = 0
      [Timer]::NtQueryTimerResolution([ref]$min, [ref]$max, [ref]$cur)
      "$min,$max,$cur"
    `);
    
    const [min, max, current] = stdout.trim().split(',').map(Number);
    
    return {
      min: min || 156250,
      max: max || 5000,
      current: current || 156250,
      jitter: 0,
      samples: [],
    };
  }

  private async measureDPCLatency(durationMs = 10000): Promise<DpcMetrics> {
    try {
      // @ts-expect-error -- window.zerotweaks is injected by the preload bridge at runtime
      const native = global.nativeModule;
      if (native?.measureDPCLatency) {
        return native.measureDPCLatency(durationMs);
      }
    } catch {}

    // PowerShell fallback using LatencyMon-style measurement
    const { stdout } = await execPowerShell(`
      $duration = ${durationMs}
      $latencies = @()
      $start = [DateTime]::Now
      while (([DateTime]::Now - $start).TotalMilliseconds -lt $duration) {
        $before = [Diagnostics.Stopwatch]::StartNew()
        Start-Sleep -Milliseconds 1
        $after = $before.ElapsedTicks
        $latencies += $after
      }
      $avg = ($latencies | Measure-Object -Average).Average
      $max = ($latencies | Measure-Object -Maximum).Maximum
      "$($avg),$($max),$($latencies.Count)"
    `);
    
    const [avg, max, count] = stdout.trim().split(',').map(Number);
    return { avg: avg || 0, max: max || 0, count: count || 0 };
  }

  private async measureNetwork(): Promise<NetworkMetrics> {
    // Ping test
    const { stdout: pingOut } = await execPowerShell(`
      $ping = Test-Connection -ComputerName "8.8.8.8" -Count 10 -Quiet
      $results = Test-Connection -ComputerName "8.8.8.8" -Count 10
      $avg = ($results | Measure-Object -Property ResponseTime -Average).Average
      $max = ($results | Measure-Object -Property ResponseTime -Maximum).Maximum
      $loss = (10 - $results.Count) / 10 * 100
      "$($avg),$($max),$($loss)"
    `);
    
    const [ping, jitter, loss] = pingOut.trim().split(',').map(Number);
    
    return {
      ping: ping || 0,
      jitter: jitter || 0,
      packetLoss: loss || 0,
    };
  }

  private async measureBootTime(): Promise<number> {
    const { stdout } = await execPowerShell(`
      $boot = Get-CimInstance Win32_OperatingSystem
      $lastBoot = $boot.LastBootUpTime
      $now = Get-Date
      $diff = $now - $lastBoot
      $diff.TotalMilliseconds
    `);
    
    return parseFloat(stdout.trim()) || 0;
  }

  private async measureIdleRAM(): Promise<number> {
    const { stdout } = await execPowerShell(`
      $mem = Get-CimInstance Win32_OperatingSystem
      [math]::Round(($mem.FreePhysicalMemory * 1024) / 1GB, 2)
    `);
    
    return parseFloat(stdout.trim()) || 0;
  }

  private async measureStartupProcesses(): Promise<number> {
    const { stdout } = await execPowerShell(`
      (Get-CimInstance Win32_StartupCommand).Count
    `);
    
    return parseInt(stdout.trim()) || 0;
  }

  /**
   * Frame times / FPS need an in-game capture (PresentMon or the ETW present
   * events). Windows exposes nothing usable from a plain CLI call, so instead
   * of returning invented numbers we report "not measured" (null). The in-game
   * capture already lives in the diagnosis module, which only runs while a game
   * is present.
   */
  private async measureFrameTimes(): Promise<FrameTimeMetrics | null> {
    logger.info('Frame times: no in-game capture running, metric not measured');
    return null;
  }

  private getDefaultMetric(name: string): any {
    const defaults: Record<string, any> = {
      'Timer Resolution': { min: 156250, max: 5000, current: 156250, jitter: 0, samples: [] },
      'DPC Latency': { avg: 100, max: 500, count: 0 },
      'Network': { ping: 0, jitter: 0, packetLoss: 0 },
      'Boot Time': 0,
      'Idle RAM': 0,
      'Startup Processes': 0,
      'Frame Times': null,
    };
    return defaults[name] ?? {};
  }

  private async getSystemSnapshot(tweakId?: string, profileId?: string): Promise<SystemSnapshot> {
    const { stdout: winVer } = await execPowerShell(`(Get-CimInstance Win32_OperatingSystem).Version`);
    
    return {
      appliedTweaks: tweakId ? [tweakId] : [],
      activeProfile: profileId || '',
      windowsVersion: winVer.trim(),
      driverVersions: {},
    };
  }

  async saveResult(result: BenchmarkResult): Promise<void> {
    const filePath = path.join(this.resultsDir, `${result.id}.json`);
    await writeJson(filePath, result);
  }

  async getResults(): Promise<BenchmarkResult[]> {
    try {
      const files = await fs.readdir(this.resultsDir);
      const results: BenchmarkResult[] = [];
      for (const file of files) {
        if (file.endsWith('.json')) {
          const result = await readJson<BenchmarkResult>(path.join(this.resultsDir, file));
          if (result) results.push(result);
        }
      }
      return results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch {
      return [];
    }
  }

  async compareResults(beforeId: string, afterId: string): Promise<{
    improvements: string[];
    regressions: string[];
    unchanged: string[];
  }> {
    const before = await readJson<BenchmarkResult>(path.join(this.resultsDir, `${beforeId}.json`));
    const after = await readJson<BenchmarkResult>(path.join(this.resultsDir, `${afterId}.json`));
    
    if (!before || !after) {
      throw new Error('Benchmark results not found');
    }

    const improvements: string[] = [];
    const regressions: string[] = [];
    const unchanged: string[] = [];

    // Compare timer resolution
    const timerDiff = after.metrics.timerResolution.current - before.metrics.timerResolution.current;
    if (timerDiff < 0) improvements.push('Timer resolution improved');
    else if (timerDiff > 0) regressions.push('Timer resolution worsened');
    else unchanged.push('Timer resolution unchanged');

    // Compare DPC latency
    const dpcDiff = after.metrics.dpcLatency.avg - before.metrics.dpcLatency.avg;
    if (dpcDiff < -10) improvements.push('DPC latency reduced');
    else if (dpcDiff > 10) regressions.push('DPC latency increased');
    else unchanged.push('DPC latency unchanged');

    // Compare network
    const pingDiff = after.metrics.network.ping - before.metrics.network.ping;
    if (pingDiff < -5) improvements.push('Network ping improved');
    else if (pingDiff > 5) regressions.push('Network ping worsened');
    else unchanged.push('Network ping unchanged');

    // Compare frame times - only available from an in-game capture.
    const beforeFps = before.metrics.frameTimes?.fps ?? null;
    const afterFps = after.metrics.frameTimes?.fps ?? null;
    if (beforeFps === null || afterFps === null) {
      unchanged.push('FPS sin medir (requiere una captura dentro del juego)');
    } else {
      const fpsDiff = afterFps - beforeFps;
      if (fpsDiff > 2) improvements.push('FPS improved');
      else if (fpsDiff < -2) regressions.push('FPS decreased');
      else unchanged.push('FPS unchanged');
    }

    return { improvements, regressions, unchanged };
  }
}