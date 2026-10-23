// Insights Manager - orchestrates the high impact insight features (section 15).
import { execPowerShell } from '../../shared/utils/process.js';
import { logger } from '../utils/logger.js';
import { analyseDriverLatency } from './drivers.js';
import { analyseFpsLimiter } from './fpsLimiter.js';
import { analyseCpuCores, analyseDisplayAndInput, analyseMemoryAndFiles, analyseThermal } from './hardware.js';
import { closeHeavyProcesses, disableAutostart, scanHeavySoftware } from './heavySoftware.js';
import { detectRunningGame, listPausableCandidates, recordSession, setExclusions } from './gameMode.js';
import { buildStutterReport, sampleStutterSession } from './stutter.js';
import { getBiosGuides, getGameRecommendations } from './guides.js';
import { isElevated, REPAIR_ACTIONS, runRepairAction, suggestRepairs } from './repair.js';
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
} from '../../shared/types/insights.js';
import type { HardwareProfile } from '../../shared/types/index.js';

export class InsightsManager {
  private heavyExclusions: string[] = [];

  // -------------------------------------------------------------------------
  // 15.1 Stutter
  // -------------------------------------------------------------------------
  async captureStutter(durationMs = 60000): Promise<StutterReport> {
    logger.info(`Capturing stutter samples for ${durationMs}ms`);
    const samples = await sampleStutterSession(durationMs);
    return buildStutterReport(samples);
  }

  // -------------------------------------------------------------------------
  // 15.2 Drivers
  // -------------------------------------------------------------------------
  analyseDrivers(): Promise<DriverLatencyReport> {
    return analyseDriverLatency();
  }

  // -------------------------------------------------------------------------
  // 15.3 FPS limiter
  // -------------------------------------------------------------------------
  async analyseFpsLimiter(hardware: HardwareProfile): Promise<FpsLimiterAdvice> {
    const refreshRate = await this.detectRefreshRate();
    return analyseFpsLimiter({
      refreshRate,
      maxRefreshRate: refreshRate,
      gpuVendor: hardware.gpu.vendor,
      gpuName: hardware.gpu.model,
    });
  }

  private async detectRefreshRate(): Promise<number> {
    try {
      const { stdout } = await execPowerShell(
        `(Get-CimInstance Win32_VideoController | Select-Object -First 1).CurrentRefreshRate`
      );
      return Number(stdout.trim()) || 60;
    } catch {
      return 60;
    }
  }

  // -------------------------------------------------------------------------
  // 15.4 Comparison
  // -------------------------------------------------------------------------
  /**
   * Local reference estimate. This is NOT a community database: it is a
   * deterministic model computed from the hardware of this machine, and the UI
   * says so. Nothing leaves the computer.
   */
  buildComparison(hardware: HardwareProfile, enabled: boolean): ComparisonResult {
    if (!enabled) {
      return {
        enabled: false,
        percentile: null,
        deltaPercent: null,
        note: 'La comparación está desactivada. No se recoge ni se envía ningún dato.',
        deeperChecks: [],
      };
    }

    // Weighted hardware model: CPU cores and clock, GPU tier, RAM and channels.
    const cpuScore = Math.min(1, (hardware.cpu.cores / 16) * (hardware.cpu.maxClock / 5000));
    const gpuTier = gpuTierScore(hardware.gpu.model, hardware.gpu.vram);
    const ramScore = Math.min(1, (hardware.memory.total / 32) * (hardware.memory.channels >= 2 ? 1 : 0.7));

    const score = cpuScore * 0.35 + gpuTier * 0.45 + ramScore * 0.2;
    const percentile = Math.round(Math.min(99, Math.max(1, score * 100)));

    const deeper: string[] = [];
    if (ramScore < 0.7) deeper.push('memoria: revisa el número de módulos y los canales');
    if (cpuScore < 0.6) deeper.push('cpu: revisa si el plan de energía limita la frecuencia');
    if (gpuTier < 0.6) deeper.push('gpu: comprueba que el juego usa la tarjeta dedicada');

    return {
      enabled: true,
      percentile,
      deltaPercent: percentile - 50,
      note:
        'Estimación local basada en las especificaciones de tu equipo (CPU, GPU y RAM). No es una base de datos de la comunidad y no se envía nada fuera del equipo.',
      deeperChecks: deeper,
    };
  }

  // -------------------------------------------------------------------------
  // 15.5 Heavy software
  // -------------------------------------------------------------------------
  scanHeavy(): Promise<HeavySoftwareReport> {
    return scanHeavySoftware({ excluded: this.heavyExclusions });
  }

  async closeHeavy(processes: string[]): Promise<{ closed: string[]; failed: string[] }> {
    return closeHeavyProcesses(processes);
  }

  async disableAutostartFor(process: string): Promise<{ ok: boolean; removed: string[]; backupPath?: string; error?: string }> {
    return disableAutostart(process);
  }

  setHeavyExclusions(excluded: string[]): void {
    this.heavyExclusions = excluded;
  }

  // -------------------------------------------------------------------------
  // 15.2b CPU and cores
  // -------------------------------------------------------------------------
  analyseCpu(): Promise<CpuCoreReport> {
    return analyseCpuCores();
  }

  // -------------------------------------------------------------------------
  // 15.6 Display and input
  // -------------------------------------------------------------------------
  analyseDisplay(): Promise<DisplayInputReport> {
    return analyseDisplayAndInput();
  }

  // -------------------------------------------------------------------------
  // 15.7 Memory and files
  // -------------------------------------------------------------------------
  analyseMemoryFiles(hardware: HardwareProfile): Promise<MemoryFilesReport> {
    return analyseMemoryAndFiles(hardware.memory.total);
  }

  // -------------------------------------------------------------------------
  // 15.8 Repair
  // -------------------------------------------------------------------------
  listRepairActions(): RepairAction[] {
    return REPAIR_ACTIONS;
  }

  runRepair(actionId: string): Promise<RepairResult> {
    const action = REPAIR_ACTIONS.find(a => a.id === actionId);
    if (!action) {
      return Promise.resolve({
        id: actionId,
        ok: false,
        output: 'Acción de reparación desconocida.',
        durationMs: 0,
        requiresAdmin: false,
      });
    }
    return runRepairAction(action);
  }

  suggestRepairs(symptoms: Parameters<typeof suggestRepairs>[0]): RepairAction[] {
    return suggestRepairs(symptoms);
  }

  isElevated(): Promise<boolean> {
    return isElevated();
  }

  // -------------------------------------------------------------------------
  // 15.9 Thermal
  // -------------------------------------------------------------------------
  analyseThermals(
    cpuTempC: number | null,
    gpuTempC: number | null,
    throttling: boolean
  ): Promise<ThermalReport> {
    return analyseThermal(cpuTempC, gpuTempC, throttling);
  }

  // -------------------------------------------------------------------------
  // 15.10 BIOS guides
  // -------------------------------------------------------------------------
  listBiosGuides(vendor?: string): BiosGuide[] {
    return getBiosGuides(vendor);
  }

  // -------------------------------------------------------------------------
  // 15.11 Smart game mode
  // -------------------------------------------------------------------------
  listPausable(): Promise<PausableCandidate[]> {
    return listPausableCandidates();
  }

  setGameModeExclusions(excluded: string[]): Promise<string[]> {
    return setExclusions(excluded);
  }

  detectGame(): Promise<{ name: string; process: string } | null> {
    return detectRunningGame();
  }

  recordGameSession(
    paused: string[],
    freedRamMB: number,
    freedCpuPercent: number
  ): Promise<GameSessionRecord> {
    return recordSession(paused, freedRamMB, freedCpuPercent);
  }

  /**
   * Pre-game checklist: verifies the things that usually have to be right
   * before a session and offers a one-click action for each pending item.
   */
  async buildChecklist(hardware: HardwareProfile): Promise<ChecklistItem[]> {
    const items: ChecklistItem[] = [];

    try {
      const { stdout } = await execPowerShell(`
        $plan = (powercfg /getactivescheme | Select-String -Pattern '([a-f0-9-]{36})').Matches[0].Groups[1].Value
        $hags = (Get-ItemProperty 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers' -Name HwSchMode -ErrorAction SilentlyContinue).HwSchMode
        $gameMode = (Get-ItemProperty 'HKCU:\\Software\\Microsoft\\GameBar' -Name AutoGameModeEnabled -ErrorAction SilentlyContinue).AutoGameModeEnabled
        @{ Plan = $plan; Hags = $hags; GameMode = $gameMode } | ConvertTo-Json
      `, { timeout: 12000 });

      const state = JSON.parse(stdout.trim());
      const plan = String(state.Plan ?? '').toLowerCase();
      const isPerformancePlan = plan === '8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c' || plan === 'e9a42b02-d5df-448d-aa00-03f14749eb61';

      items.push({
        id: 'check.power_plan',
        label: 'Plan de energía de alto rendimiento',
        status: isPerformancePlan ? 'ok' : 'pendiente',
        detail: isPerformancePlan
          ? 'El plan activo es de alto rendimiento.'
          : `El plan activo no es de alto rendimiento (${plan || 'desconocido'}).`,
        action: isPerformancePlan ? undefined : { label: 'Cambiar plan', kind: 'set_power_plan' },
      });

      items.push({
        id: 'check.hags',
        label: 'Programación de GPU acelerada por hardware',
        status: state.Hags === 2 ? 'ok' : 'pendiente',
        detail:
          state.Hags === 2
            ? 'HAGS está activado.'
            : 'HAGS está desactivado. Solo helps si tu GPU y driver lo soportan.',
        action: state.Hags === 2 ? undefined : { label: 'Activar HAGS', kind: 'enable_hags' },
      });

      items.push({
        id: 'check.game_mode',
        label: 'Modo de juego de Windows',
        status: state.GameMode === 1 ? 'ok' : 'pendiente',
        detail: state.GameMode === 1 ? 'El modo de juego está activado.' : 'El modo de juego de Windows está desactivado.',
        action: state.GameMode === 1 ? undefined : { label: 'Activar modo juego', kind: 'enable_game_mode' },
      });

      const refresh = await this.detectRefreshRate();
      items.push({
        id: 'check.refresh_rate',
        label: 'Tasa de refresco del monitor',
        status: refresh >= 120 ? 'ok' : 'pendiente',
        detail: `Windows está usando ${refresh} Hz.`,
        action: refresh >= 120 ? undefined : { label: 'Ir al diagnóstico', kind: 'open_diagnosis' },
      });

      const heavy = await this.scanHeavy();
      const runningHeavy = heavy.apps.filter(a => a.running && !a.excluded);
      items.push({
        id: 'check.heavy_software',
        label: 'Software pesado en segundo plano',
        status: runningHeavy.length === 0 ? 'ok' : 'pendiente',
        detail:
          runningHeavy.length === 0
            ? 'No hay software pesado conocido en ejecución.'
            : `${runningHeavy.length} programa(s) en marcha: ${runningHeavy.map(a => a.name).join(', ')}.`,
        action: runningHeavy.length === 0 ? undefined : { label: 'Cerrarlos', kind: 'close_heavy' },
      });

      const thermal = await analyseThermal(null, null, false);
      items.push({
        id: 'check.thermal',
        label: 'Temperaturas',
        status: thermal.onBattery ? 'pendiente' : 'no_verificable',
        detail: thermal.onBattery
          ? 'El equipo está con batería: conéctalo antes de jugar.'
          : 'La temperatura se mide durante el diagnóstico.',
        action: thermal.onBattery ? { label: 'Revisar energía', kind: 'open_diagnosis' } : undefined,
      });

      return items;
    } catch (err) {
      logger.warn('checklist failed', err);
      return items;
    }
  }

  // -------------------------------------------------------------------------
  // 15.12 Game profiles
  // -------------------------------------------------------------------------
  listGameProfiles(gameId?: string): GameProfileRecommendation[] {
    return getGameRecommendations(gameId);
  }
}

/** Rough GPU tier from the model name and VRAM. */
function gpuTierScore(model: string, vramMB: number): number {
  const name = (model || '').toLowerCase();
  let tier = 0.35;

  if (/rtx\s*50|5090|5080/.test(name)) tier = 0.95;
  else if (/rtx\s*40|4090|4080|4070/.test(name)) tier = 0.82;
  else if (/rtx\s*30|3070|3080/.test(name)) tier = 0.66;
  else if (/rtx\s*20|2070/.test(name)) tier = 0.48;
  else if (/rx\s*7|7900|7800/.test(name)) tier = 0.85;
  else if (/rx\s*6|6700|6600|6800/.test(name)) tier = 0.72;
  else if (/rx\s*5|5600|5700/.test(name)) tier = 0.58;
  else if (/gtx\s*16|1660/.test(name)) tier = 0.38;
  else if (/arc\s*a/.test(name)) tier = 0.5;

  if (vramMB >= 24000) tier = Math.min(1, tier + 0.08);
  else if (vramMB >= 12000) tier = Math.min(1, tier + 0.05);

  return Math.min(1, tier);
}
