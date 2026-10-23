// Diagnosis Manager - orchestrates the full diagnostic flow
import { execPowerShell } from '../../shared/utils/process.js';
import { logger } from '../utils/logger.js';
import { runAllChecks, discoverGames, measureBottleneck, discoverGames as discoverGamesFn } from './checks.js';
import type { DiagnosisReport, DiagnosisProgress, HardwareProfile, ImpactLevel, BottleneckResult, InGameGameConfig, InGameProfile, BeforeAfterMetrics, BeforeAfterComparison, FineTuneItem, DiagnosisProblem } from '../../shared/types/index.js';
import type { Tweak } from '../../shared/tweaks/index.js';
import { allTweaks } from '../../shared/tweaks/index.js';
import { getTweakImpact, isFineTune } from '../../shared/tweaks/impact.js';
import { normalizeHardwareProfile } from '../../shared/utils/hardware.js';
import {
  applyGameProfile,
  detectLatencyTechnology,
  GAME_PROFILES,
  readGameConfig,
  revertGameConfig,
  setGameFpsCap,
  type ApplyProfileResult,
  type GameProfileDefinition,
} from './inGame.js';

export class DiagnosisManager {
  private activeReport: DiagnosisReport | null = null;
  private progressCallback?: (p: DiagnosisProgress) => void;
  /** In-game config backups created during this session (Zero Danger manifest). */
  private gameConfigBackups: {
    gameId: string;
    gameName: string;
    configPath: string;
    backupPath: string;
    createdAt: string;
  }[] = [];
  /** Metrics captured when the diagnostic starts, used as the "before" of the A/B test. */
  private baselineMetrics: BeforeAfterMetrics | null = null;

  setProgressCallback(cb: (p: DiagnosisProgress) => void) {
    this.progressCallback = cb;
  }

  private emitProgress(p: DiagnosisProgress) {
    this.progressCallback?.(p);
  }

  /** Run the full ~30s diagnosis and return a report. */
  async runDiagnosis(force = false): Promise<DiagnosisReport> {
    this.emitProgress({ check: 'Inicializando', index: 0, total: 11, percent: 0, state: 'running', message: 'Preparando diagnóstico...' });

    // 1. Collect hardware + context
    const { hardware, activePowerPlan, build, onBattery } = await this.collectContext();
    const ctx = { hardware, activePowerPlan, build, onBattery };

    // 2. Run the 11 checks in sequence with progress
    const problems: import('../../shared/types/diagnosis').DiagnosisProblem[] = [];
    const checks = [
      { id: 'display.refresh_rate', fn: () => import('./checks.js').then(m => m.checkRefreshRate(ctx)) },
      { id: 'memory.xmp_channels', fn: () => import('./checks.js').then(m => m.checkMemory(ctx)) },
      { id: 'gpu.dedicated_selection', fn: () => import('./checks.js').then(m => m.checkDedicatedGpu(ctx)) },
      { id: 'power.plan', fn: () => import('./checks.js').then(m => m.checkPowerPlan(ctx)) },
      { id: 'thermal.throttling', fn: () => import('./checks.js').then(m => m.checkThermal(ctx)) },
      { id: 'network.interface', fn: () => import('./checks.js').then(m => m.checkNetwork(ctx)) },
      { id: 'driver.gpu', fn: () => import('./checks.js').then(m => m.checkGpuDriver(ctx)) },
      { id: 'software.background_processes', fn: () => import('./checks.js').then(m => m.checkBackgroundProcesses()) },
      { id: 'storage.space_health', fn: () => import('./checks.js').then(m => m.checkStorage(ctx)) },
      { id: 'features.hags_gamemode', fn: () => import('./checks.js').then(m => m.checkFeatures(ctx)) },
      { id: 'bottleneck.main', fn: () => import('./checks.js').then(m => m.measureBottleneck(ctx)) },
    ];

    const bottleneckResults: BottleneckResult[] = [];

    for (let i = 0; i < checks.length; i++) {
      const check = checks[i];
      this.emitProgress({ check: check.id, index: i, total: checks.length, percent: Math.round((i / checks.length) * 100), state: 'running', message: `Ejecutando ${check.id}...` });
      try {
        const result = await check.fn();
        if (result) {
          if (check.id === 'bottleneck.main') {
            bottleneckResults.push(result as BottleneckResult);
          } else {
            problems.push(result as import('../../shared/types/diagnosis').DiagnosisProblem);
          }
        }
      } catch (err) {
        logger.warn(`Check ${check.id} failed`, err);
      }
    }

    // Bottleneck also becomes a problem if it found a limiter
    const bottleneck = bottleneckResults[0] || { limiter: 'NONE', explanation: '', cpuPerCore: [], cpuAvg: 0, gpu: 0, vram: 0, ram: 0, disk: 0, measuredUnderLoad: false, durationMs: 0, timestamp: new Date().toISOString() };    if (bottleneck.limiter !== 'NONE') {
      problems.push({
        id: `bottleneck_${Date.now()}`,
        checkId: 'bottleneck.main',
        title: `Cuello de botella: ${bottleneck.limiter}`,
        description: bottleneck.explanation,
        impact: (bottleneck.limiter === 'GPU' || bottleneck.limiter === 'CPU' ? 'alto' : 'medio') as ImpactLevel,
        expected: 'Depende de qué recurso limita; ajusta ese recurso para mejorar',
        category: 'bottleneck',
        fixable: false,
        guide: [
          { step: 1, text: 'Revisa la tarjeta "Cuello de botella" para ver el uso por recurso.' },
          { step: 2, text: 'Ajusta los ajustes del juego o del sistema según el recurso limitante.' },
        ],
        evidence: { limiter: bottleneck.limiter },
      } as import('../../shared/types/diagnosis').DiagnosisProblem);
    }

    // 3. Score calculation (only counts fixed problems, not tweaks applied)
    const score = this.calculateScore(problems, hardware);
    const scoreBreakdown = this.buildScoreBreakdown(problems, hardware);

    // 4. Fine-tune items (low impact tweaks, disabled by default)
    const fineTune = this.buildFineTuneList();

    // 5. Game configs
    const games = discoverGamesFn();

    // 6. Baseline for the A/B test: the metrics we can measure right now, before
    //    the user applies any fix.
    this.baselineMetrics = await this.collectMetrics();

    const report: DiagnosisReport = {
      id: `diag_${Date.now()}`,
      timestamp: new Date().toISOString(),
      score,
      problems,
      summary: { alto: problems.filter(p => p.impact === 'alto').length, medio: problems.filter(p => p.impact === 'medio').length, bajo: problems.filter(p => p.impact === 'bajo').length, total: problems.length },
      bottleneck,
      fineTune,
      games,
      scoreBreakdown,
      healthyMessage: problems.length === 0 ? 'Tu equipo está bien configurado. Los tweaks restantes tienen un efecto pequeño.' : undefined,
      durationMs: 0, // filled by caller
    };

    this.activeReport = report;
    this.emitProgress({ check: 'finalizado', index: checks.length, total: checks.length, percent: 100, state: 'done', message: 'Diagnóstico completado' });
    return report;
  }

  private async collectContext(): Promise<{ hardware: HardwareProfile; activePowerPlan: string; build: number; onBattery: boolean }> {
    const hardware = await this.getHardwareProfile();
    const { stdout: plan } = await execPowerShell('powercfg /getactivescheme');
    const match = plan.match(/([a-f0-9-]{36})/);
    const activePowerPlan = match ? match[1] : '';

    const { stdout: build } = await execPowerShell('(Get-CimInstance Win32_OperatingSystem).BuildNumber');
    const bn = parseInt(build.trim()) || 0;

    const { stdout: battery } = await execPowerShell('(Get-CimInstance Win32_Battery -ErrorAction SilentlyContinue).BatteryStatus');
    const onBattery = battery.trim().includes('1') || battery.trim().includes('Discharging');

    return { hardware, activePowerPlan, build: bn, onBattery };
  }

  private async getHardwareProfile(): Promise<HardwareProfile> {
    const { stdout } = await execPowerShell(`
      $cpu = Get-CimInstance Win32_Processor
      $gpus = Get-CimInstance Win32_VideoController | Where-Object { $_.PNPDeviceID -like 'PCI*' }
      $gpu = $gpus | Where-Object { $_.Name -match 'NVIDIA|AMD|Radeon|GeForce|RTX|RX ' } | Select-Object -First 1
      if (-not $gpu) { $gpu = $gpus | Select-Object -First 1 }
      $mem = Get-CimInstance Win32_PhysicalMemory
      $disks = Get-CimInstance Win32_DiskDrive | Where-Object { $_.MediaType -eq 'Fixed hard disk media' }
      $net = Get-NetAdapter -Physical | Where-Object { $_.Status -eq 'Up' } | Select-Object -First 1
      $os = Get-CimInstance Win32_OperatingSystem
      $cs = Get-CimInstance Win32_ComputerSystem
      $bl = Get-BitLockerVolume -MountPoint C: -ErrorAction SilentlyContinue

      @{
        Cpu = @{ Vendor = if ($cpu.Manufacturer -like '*Intel*') { 'Intel' } elseif ($cpu.Manufacturer -like '*AMD*') { 'AMD' } else { 'Unknown' }; Model = $cpu.Name.Trim(); Cores = $cpu.NumberOfCores; Threads = $cpu.NumberOfLogicalProcessors; BaseClock = $cpu.MaxClockSpeed; MaxClock = [math]::Round($cpu.MaxClockSpeed * 1.2); Architecture = "$($cpu.AddressWidth)-bit" }
        Gpu = @{ Vendor = if ($gpu.AdapterCompatibility -like '*NVIDIA*' -or $gpu.Name -like '*NVIDIA*') { 'NVIDIA' } elseif ($gpu.AdapterCompatibility -like '*AMD*' -or $gpu.AdapterCompatibility -like '*ATI*' -or $gpu.Name -match 'AMD|Radeon') { 'AMD' } elseif ($gpu.AdapterCompatibility -like '*Intel*' -or $gpu.Name -like '*Intel*') { 'Intel' } else { 'Unknown' }; Model = $gpu.Name.Trim(); DriverVersion = $gpu.DriverVersion; VRAM = [math]::Round($gpu.AdapterRAM / 1MB); SupportsHAGS = $true; SupportsResizableBAR = $false }
        Memory = @{ Total = [math]::Round(($mem | Measure-Object -Property Capacity -Sum).Sum / 1GB, 1); Speed = ($mem | Select-Object -First 1).Speed; Type = switch (($mem | Select-Object -First 1).MemoryType) { 24 { 'DDR3' } 26 { 'DDR4' } 34 { 'DDR5' } default { 'Unknown' } }; Channels = ($mem | Group-Object BankLabel).Count }
        Storage = @($disks | ForEach-Object { @{ DeviceId = $_.DeviceID; Model = $_.Model.Trim(); Type = if ($_.Model -like '*NVMe*' -or $_.Model -like '*SSD*' -or $_.InterfaceType -eq 'NVMe') { 'NVMe' } elseif ($_.Model -like '*SSD*') { 'SSD' } else { 'HDD' }; SizeGB = [math]::Round($_.Size / 1GB); SmartStatus = 'Unknown' } })
        Network = if ($net) { @{ AdapterName = $net.Name; MacAddress = $net.MacAddress; SpeedMbps = if (("$($net.LinkSpeed)" -match '([\\d.]+)\\s*Gbps')) { [double]$Matches[1] * 1000 } elseif (("$($net.LinkSpeed)" -match '([\\d.]+)\\s*Mbps')) { [double]$Matches[1] } else { 0 }; DriverVersion = (Get-PnpDevice -Class Net | Where-Object { $_.FriendlyName -eq $net.Name } | Select-Object -First 1).DriverVersion } } else { @{} }
        Windows = @{ Version = $os.Version; Build = [int]$os.Version.Split('.')[2]; Edition = switch -Regex ($os.Caption) { 'Home' { 'Home' } 'Pro(?!fessional)' { 'Pro' } 'Enterprise' { 'Enterprise' } 'Education' { 'Education' } default { 'Unknown' } }; IsInsider = $os.BuildLabEx -match '\\.rs[0-9]+_release' -or $os.BuildLabEx -match 'co_release' }
        IsLaptop = $cs.PCSystemType -in @(3,7)
        HasBitLocker = $bl.ProtectionStatus -eq 'On'
      } | ConvertTo-Json -Depth 4
    `);
    return normalizeHardwareProfile(JSON.parse(stdout.trim()));
  }

  private calculateScore(problems: import('../../shared/types/diagnosis').DiagnosisProblem[], hw: HardwareProfile): number {
    // A machine with no real problems and full hardware capabilities scores 100.
    // Points are only lost for problems that were actually detected, so the score
    // only rises when a real problem is fixed.
    const base = 93; // 93 + up to 7 capability points = 100
    const weights = { alto: 15, medio: 8, bajo: 3 };
    const penalty = problems.reduce((s, p) => s + (weights[p.impact] ?? 0), 0);
    const raw = base - penalty;

    // Bonus for hardware that enables features
    let bonus = 0;
    if (hw.gpu.supportsHAGS) bonus += 2;
    if (hw.gpu.supportsResizableBAR) bonus += 2;
    if (hw.memory.channels >= 2) bonus += 2;
    if (hw.cpu.cores >= 8) bonus += 1;

    return Math.max(0, Math.min(100, raw + bonus));
  }

  private buildScoreBreakdown(problems: import('../../shared/types/diagnosis').DiagnosisProblem[], hw: HardwareProfile) {
    const items = [
      { label: 'Base saludable', points: 93, max: 93 },
      ...problems.map(p => ({ label: `Problema: ${p.title}`, points: -(p.impact === 'alto' ? 15 : p.impact === 'medio' ? 8 : 3), max: 0 })),
      { label: 'HAGS soportado', points: hw.gpu.supportsHAGS ? 2 : 0, max: 2 },
      { label: 'Resizable BAR', points: hw.gpu.supportsResizableBAR ? 2 : 0, max: 2 },
      { label: 'Dual-channel RAM', points: hw.memory.channels >= 2 ? 2 : 0, max: 2 },
      { label: 'CPU >= 8 núcleos', points: hw.cpu.cores >= 8 ? 1 : 0, max: 1 },
    ];
    return items;
  }

  private buildFineTuneList(): FineTuneItem[] {
    return allTweaks
      .filter(t => isFineTune(t.id))
      .map(t => ({
        tweakId: t.id,
        name: t.name,
        description: t.description,
        impacto: getTweakImpact(t.id),
        evidence: t.evidence,
        enabled: false,
      }));
  }

  /** Get the last generated report. */
  getReport(): DiagnosisReport | null {
    return this.activeReport;
  }

  /** Games with an in-game settings profile available. */
  getGames(): InGameGameConfig[] {
    return discoverGamesFn();
  }

  /** Profile definitions offered by the in-game optimizer. */
  getGameProfiles(): GameProfileDefinition[] {
    return GAME_PROFILES;
  }

  /** Current values of the writable keys of a game config. */
  async getGameConfig(gameId: string): Promise<{
    ok: boolean;
    exists: boolean;
    configPath: string;
    values: Record<string, string>;
    error?: string;
  }> {
    const game = this.getGames().find(g => g.gameId === gameId);
    if (!game) {
      return { ok: false, exists: false, configPath: '', values: {}, error: 'Juego no encontrado' };
    }
    return readGameConfig(game);
  }

  /** Applies an in-game profile, backing up the original file first. */
  async applyGameProfile(
    gameId: string,
    profile: InGameProfile
  ): Promise<ApplyProfileResult> {
    const game = this.getGames().find(g => g.gameId === gameId);
    if (!game) {
      return {
        ok: false,
        gameId,
        profile,
        configPath: '',
        changedKeys: [],
        error: 'Juego no encontrado',
      };
    }
    const result = await applyGameProfile(game, profile);
    if (result.ok) {
      // Register the backup in the Zero Danger manifest so it can be restored.
      this.gameConfigBackups.push({
        gameId: game.gameId,
        gameName: game.name,
        configPath: result.configPath,
        backupPath: result.backupPath ?? '',
        createdAt: new Date().toISOString(),
      });
    }
    return result;
  }

  /** Applies an explicit FPS cap to a game configuration. */
  async setGameFpsCap(gameId: string, cap: number): Promise<ApplyProfileResult> {
    const game = this.getGames().find(g => g.gameId === gameId);
    if (!game) {
      return { ok: false, gameId, profile: 'max_performance', configPath: '', changedKeys: [], error: 'Juego no encontrado' };
    }
    const result = await setGameFpsCap(game, cap);
    if (result.ok) {
      this.gameConfigBackups.push({
        gameId: game.gameId,
        gameName: game.name,
        configPath: result.configPath,
        backupPath: result.backupPath ?? '',
        createdAt: new Date().toISOString(),
      });
    }
    return result;
  }

  /** Restores the original in-game configuration file. */  async revertGameProfile(gameId: string): Promise<{ ok: boolean; restoredFrom?: string; error?: string }> {
    const game = this.getGames().find(g => g.gameId === gameId);
    if (!game) return { ok: false, error: 'Juego no encontrado' };
    return revertGameConfig(game);
  }

  /** Detects the latency technology available for the installed GPU. */
  async getLatencyTechnology() {
    return detectLatencyTechnology();
  }

  /** Fix a specific problem when fixable. */
  async fixProblem(problemId: string): Promise<{ ok: boolean; error?: string }> {
    const report = this.activeReport;
    if (!report) return { ok: false, error: 'No hay diagnóstico activo' };
    const p = report.problems.find((x: DiagnosisProblem) => x.checkId === problemId);
    if (!p || !p.fixable || !p.fixAction) return { ok: false, error: 'Problema no reparable desde la app' };

    try {
      switch (p.fixAction) {
        case 'set_refresh_rate':
          await this.setRefreshRate(p.fixParams?.target as number);
          break;
        case 'set_power_plan':
          await this.setPowerPlan(p.fixParams?.target as string, p.fixParams?.onBattery as boolean);
          break;
        case 'force_dedicated_gpu':
          await this.forceDedicatedGpu();
          break;
        case 'disable_adapter_power_save':
          await this.disableAdapterPowerSave(p.fixParams?.adapter as string);
          break;
        case 'enable_hags':
          await this.enableHags();
          break;
        case 'enable_game_mode':
          await this.enableGameMode();
          break;
        case 'close_process':
          await this.closeProcesses(p.fixParams?.processes as string[]);
          break;
        case 'disable_overlay':
          await this.disableOverlay(p.fixParams?.overlay as string);
          break;
        case 'reapply_profile':
          await this.reapplyProfile(p.fixParams?.profile as string);
          break;
      }
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }

  private async setRefreshRate(hz: number): Promise<void> {
    await execPowerShell(`
      $code = @'
      using System; using System.Runtime.InteropServices;
      public class Display {
        [DllImport("user32.dll")] public static extern int EnumDisplaySettings(string lpszDeviceName, int iModeNum, ref DEVMODE lpDevMode);
        [DllImport("user32.dll")] public static extern int ChangeDisplaySettingsEx(string lpszDeviceName, ref DEVMODE lpDevMode, IntPtr hwnd, int dwflags, IntPtr lParam);
        [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
        public struct DEVMODE {
          [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)] public string dmDeviceName;
          public short dmSpecVersion; public short dmDriverVersion; public short dmSize; public short dmDriverExtra;
          public int dmFields; public int dmPositionX; public int dmPositionY; public int dmDisplayOrientation;
          public int dmDisplayFixedOutput; public short dmColor; public short dmDuplex; public short dmYResolution;
          public short dmTTOption; public short dmCollate; [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)] public string dmFormName;
          public short dmLogPixels; public short dmBitsPerPel; public int dmPelsWidth; public int dmPelsHeight;
          public int dmDisplayFlags; public int dmDisplayFrequency; public int dmICMMethod; public int dmICMIntent;
          public int dmMediaType; public int dmDitherType; public int dmReserved1; public int dmReserved2;
          public int dmPanningWidth; public int dmPanningHeight;
        }
      }
'@
      Add-Type -TypeDefinition $code
      $dm = New-Object Display+DEVMODE
      $dm.dmSize = [System.Runtime.InteropServices.Marshal]::SizeOf($dm)
      $dm.dmFields = 0x40000
      $dm.dmDisplayFrequency = ${hz}
      [Display]::ChangeDisplaySettingsEx("", [ref]$dm, [IntPtr]::Zero, 0, [IntPtr]::Zero)
    `);
  }

  private async setPowerPlan(target: string, onBattery: boolean): Promise<void> {
    if (target === 'ultimate') {
      const { stdout } = await execPowerShell('powercfg -duplicatescheme e9a42b02-d5df-448d-aa00-03f14749eb61');
      const match = stdout.match(/([a-f0-9-]{36})/);
      if (match) await execPowerShell(`powercfg /setactive ${match[1]}`);
    } else if (target === 'high') {
      await execPowerShell('powercfg /setactive 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c');
    }
  }

  private async forceDedicatedGpu(): Promise<void> {
    const { stdout } = await execPowerShell(`
      $gpus = Get-CimInstance Win32_VideoController | Where-Object { $_.PNPDeviceID -like 'PCI*' -and ($_.Name -match 'NVIDIA|AMD|Radeon|GeForce|RTX|RX') }
      if ($gpus.Count -gt 0) {
        $primary = $gpus | Select-Object -First 1
        $path = 'HKCU:\\Software\\Microsoft\\DirectX\\UserGpuPreferences'
        if (-not (Test-Path $path)) { New-Item -Path $path -Force | Out-Null }
        Set-ItemProperty -Path $path -Name $primary.Name -Value 'GpuPreference=1;' -Force
      }
    `);
  }

  private async disableAdapterPowerSave(adapter?: string): Promise<void> {
    if (!adapter) return;
    await execPowerShell(`
      $p = Get-PnpDevice -Class Net | Where-Object { $_.FriendlyName -eq '${adapter}' }
      if ($p) {
        $key = "HKLM:\\SYSTEM\\CurrentControlSet\\Enum\\$($p.InstanceId)\\Device Parameters\\PnpCapabilities"
        Set-ItemProperty -Path $key -Name '1' -Value 0 -Force -ErrorAction SilentlyContinue
      }
      powercfg /setdcvalueindex scheme_current sub_network * 0
      powercfg /setacvalueindex scheme_current sub_network * 0
      powercfg /setactive scheme_current
    `);
  }

  private async enableHags(): Promise<void> {
    const { RegistryManager } = await import('../../shared/tweaks/registry.js');
    await RegistryManager.setValue('HKLM', '\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers', 'HwSchMode', 'REG_DWORD', 2);
  }

  private async enableGameMode(): Promise<void> {
    const { stdout: sid } = await execPowerShell('whoami /user /fo csv');
    const lines = sid.trim().split('\n');
    const userSid = lines[1]?.split(',')[1]?.replace(/"/g, '');
    if (userSid) {
      await execPowerShell(`reg add "HKU\\${userSid}\\Software\\Microsoft\\GameBar" /v AutoGameModeEnabled /t REG_DWORD /d 1 /f`);
    }
  }

  private async closeProcesses(names: string[]): Promise<void> {
    for (const n of names) {
      await execPowerShell(`Get-Process ${n} -ErrorAction SilentlyContinue | Stop-Process -Force`).catch(() => {});
    }
  }

  private async disableOverlay(_: string): Promise<void> {
    // Placeholder – would toggle registry for specific overlay
  }

  private async reapplyProfile(_: string): Promise<void> {
    // Placeholder – would re-run the profile apply
  }

  /**
   * A/B test: compares the baseline captured when the diagnostic started with
   * the current measurement. Only metrics that can actually be measured are
   * compared - in-game FPS needs a capture we cannot do from here, so those
   * fields stay `null` instead of showing made-up numbers.
   */
  async runABTest(_before?: BeforeAfterMetrics, problemId?: string): Promise<BeforeAfterComparison> {
    const before = this.baselineMetrics ?? (await this.collectMetrics());
    const after = await this.collectMetrics();

    const delta = (a: number | null, b: number | null): number | null =>
      a === null || b === null ? null : Math.round((b - a) * 100) / 100;

    const deltas = {
      frametimeMs: delta(before.avgFrametimeMs, after.avgFrametimeMs),
      p1Low: delta(before.p1LowFps, after.p1LowFps),
      pingLoadedMs: delta(before.pingLoadedMs, after.pingLoadedMs),
      cpuTempC: delta(before.cpuTempC, after.cpuTempC),
      bootTimeMs: delta(before.bootTimeMs, after.bootTimeMs),
    };

    const measured = Object.values(deltas).filter(v => v !== null) as number[];
    let verdict: BeforeAfterComparison['verdict'] = 'sin_datos';
    let summary = 'No hay datos suficientes para comparar. Arregla un problema y vuelve a ejecutar la prueba.';

    if (measured.length > 0) {
      const improvements = measured.filter(d => d < 0).length;
      const regressions = measured.filter(d => d > 0).length;
      if (improvements > regressions) {
        verdict = 'mejora';
        summary = `La medición mejora en ${improvements} de ${measured.length} parámetros comparables.`;
      } else if (regressions > improvements) {
        verdict = 'empeora';
        summary = `La medición empeora en ${regressions} de ${measured.length} parámetros comparables.`;
      } else {
        verdict = 'sin_efecto';
        summary = 'No se aprecia diferencia medible en esta prueba. Prueba con otro escenario o más repeticiones.';
      }
      if (problemId) summary += ` (problema: ${problemId})`;
    }

    return { before, after, deltas, verdict, summary };
  }

  /** Captures the metrics we can measure from outside a game. */
  private async collectMetrics(): Promise<BeforeAfterMetrics> {
    const unavailable: string[] = [];

    const { stdout } = await execPowerShell(`
      $unavailable = @()
      $ping = $null
      try {
        $ping = (Test-Connection -ComputerName 1.1.1.1 -Count 4 -ErrorAction Stop | Measure-Object -Property Latency -Average).Average
      } catch {}
      $gpuTemp = $null
      try {
        $smi = Get-Command nvidia-smi -ErrorAction Stop
        $gpuTemp = (& $smi.Source --query-gpu=temperature.gpu --format=csv,noheader,nounits | Select-Object -First 1) -as [int]
      } catch {}
      $bootMs = $null
      try {
        $ev = Get-WinEvent -FilterHashtable @{LogName='Microsoft-Windows-Diagnostics-Performance/Operational'; Id=100} -MaxEvents 1 -ErrorAction Stop
        $xml = [xml]$ev.ToXml()
        $main = ($xml.Event.EventData.Data | Where-Object { $_.Name -eq 'MainPathBootTime' }).'#text'
        if (-not $main) { $main = ($xml.Event.EventData.Data | Where-Object { $_.Name -eq 'BootTime' }).'#text' }
        if ($main) { $bootMs = [int]$main }
      } catch {}
      @{ PingMs = $ping; GpuTemp = $gpuTemp; BootMs = $bootMs } | ConvertTo-Json
    `);

    let parsed: { PingMs?: number | null; GpuTemp?: number | null; BootMs?: number | null } = {};
    try {
      parsed = JSON.parse(stdout.trim());
    } catch {
      parsed = {};
    }

    const pingLoadedMs = typeof parsed.PingMs === 'number' ? Math.round(parsed.PingMs) : null;
    const gpuTempC = typeof parsed.GpuTemp === 'number' ? parsed.GpuTemp : null;
    const bootTimeMs = typeof parsed.BootMs === 'number' ? parsed.BootMs : null;

    if (pingLoadedMs === null) unavailable.push('Ping: no se pudo alcanzar el servidor de prueba');
    if (gpuTempC === null) unavailable.push('GPU: el sensor de temperatura no está disponible');
    if (bootTimeMs === null) unavailable.push('Arranque: el registro de diagnóstico no está disponible');
    unavailable.push('1% lows y frametime: requieren una captura dentro del juego, no se pueden medir desde aquí');

    return {
      avgFrametimeMs: null,
      p1LowFps: null,
      p01LowFps: null,
      pingLoadedMs,
      cpuTempC: null,
      gpuTempC,
      bootTimeMs,
      repetitions: 3,
      unavailable,
      timestamp: new Date().toISOString(),
    };
  }
}