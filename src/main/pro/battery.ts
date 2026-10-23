// Battery / silent mode for laptops.
//
// Detects whether the machine is running on the charger or on battery and
// switches between two power profiles: maximum performance while plugged in and
// a quiet profile when unplugged.
import { execPowerShell } from '../../shared/utils/process.js';
import { logger } from '../utils/logger.js';
import type { BatteryStatus, PowerProfileKind, PowerSwitchResult } from '../../shared/types/pro.js';

/** Well known Windows power plan GUIDs. */
export const POWER_PLANS = {
  /** High performance. */
  highPerformance: '8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c',
  /** Balanced. */
  balanced: '381b4222-f694-41f0-9685-ff5bb260df2e',
  /** Power saver. */
  powerSaver: 'a1841308-3541-4fab-bc81-7151e30bbc6a',
  /** Ultimate performance (only on some systems). */
  ultimatePerformance: 'e9a42b02-d5df-448d-aa00-03f14749eb61',
};

export async function getBatteryStatus(): Promise<BatteryStatus> {
  const notes: string[] = [];

  try {
    const { stdout } = await execPowerShell(`
      $battery = Get-CimInstance Win32_Battery -ErrorAction SilentlyContinue | Select-Object -First 1
      $hasBattery = $null -ne $battery
      $onBattery = $false
      $charging = $false
      $percent = $null
      $timeToFull = $null
      if ($battery) {
        $onBattery = ($battery.BatteryStatus -eq 1)
        $charging = ($battery.BatteryStatus -eq 2 -or $battery.BatteryStatus -eq 6 -or $battery.ChargeRemaining -lt 99)
        $percent = $battery.EstimatedChargeRemaining
        $timeToFull = $battery.TimeRemaining
      }
      $plan = (powercfg /getactivescheme | Select-String -Pattern '([a-f0-9-]{36})').Matches[0].Groups[1].Value
      $planName = (powercfg /getactivescheme)
      @{
        HasBattery = $hasBattery
        OnBattery = $onBattery
        Charging = $charging
        Percent = $percent
        TimeToFull = $timeToFull
        Plan = $plan
        PlanName = $planName
      } | ConvertTo-Json
    `, { timeout: 15000 });

    const raw = JSON.parse(stdout.trim());
    const planGuid = String(raw.Plan ?? '').toLowerCase();
    const planName = extractPlanName(String(raw.PlanName ?? ''));
    const onBattery = raw.OnBattery === true;

    // Find the performance plan available on this machine.
    const performancePlanGuid = await findPlan(POWER_PLANS.highPerformance, POWER_PLANS.ultimatePerformance);
    const silentPlanGuid = await findPlan(POWER_PLANS.balanced, POWER_PLANS.powerSaver);

    if (!raw.HasBattery) {
      notes.push('Este equipo no tiene batería: el conmutador de ahorro no aplica.');
    }
    if (!performancePlanGuid) {
      notes.push('El plan de alto rendimiento no está disponible en este sistema.');
    }

    const expected = onBattery ? silentPlanGuid : performancePlanGuid;
    const matchesChargerState = !!expected && planGuid === expected;

    return {
      hasBattery: raw.HasBattery === true,
      onBattery,
      charging: raw.Charging === true,
      percent: raw.Percent === null || raw.Percent === undefined ? null : Number(raw.Percent),
      timeToFull: raw.TimeToFull ?? null,
      activePlanGuid: planGuid,
      activePlanName: planName,
      performancePlanGuid,
      silentPlanGuid,
      matchesChargerState,
      notes,
    };
  } catch (err) {
    logger.warn('battery status failed', err);
    return {
      hasBattery: false,
      onBattery: false,
      charging: false,
      percent: null,
      timeToFull: null,
      activePlanGuid: '',
      activePlanName: '',
      performancePlanGuid: POWER_PLANS.highPerformance,
      silentPlanGuid: POWER_PLANS.balanced,
      matchesChargerState: false,
      notes: ['No se ha podido leer el estado de la batería.'],
    };
  }
}

function extractPlanName(output: string): string {
  const match = output.match(/Power Scheme GUID:\s*[a-f0-9-]+\s*\(([^)]+)\)/i);
  return match ? match[1].trim() : '';
}

/** Returns the first of the given plans that exists on this system. */
async function findPlan(...guids: string[]): Promise<string> {
  try {
    const { stdout } = await execPowerShell('powercfg /list');
    const lower = stdout.toLowerCase();
    for (const guid of guids) {
      if (lower.includes(guid.toLowerCase())) return guid.toLowerCase();
    }
  } catch {
    /* ignore */
  }
  return guids[0].toLowerCase();
}

/**
 * Applies a power profile.
 *  - performance: the high performance plan + max processor state + aggressive cooling.
 *  - saver: the balanced/saver plan + reduced max processor state + passive cooling.
 */
export async function applyPowerProfile(kind: PowerProfileKind): Promise<PowerSwitchResult> {
  const details: string[] = [];

  try {
    const status = await getBatteryStatus();
    const guid =
      kind === 'performance'
        ? status.performancePlanGuid
        : kind === 'saver'
          ? status.silentPlanGuid
          : POWER_PLANS.balanced;

    await execPowerShell(`powercfg /setactive ${guid}`);
    details.push(`Plan aplicado: ${guid}`);

    if (kind === 'performance') {
      // Keep the CPU at full frequency and use the active cooling policy.
      await execPowerShell(
        `powercfg /setacvalueindex scheme_current sub_processor PROCTHROTTLEMIN 100; powercfg /setdcvalueindex scheme_current sub_processor PROCTHROTTLEMIN 100; powercfg /setacvalueindex scheme_current sub_processor PROCTHROTTLEMAX 100; powercfg /setactive scheme_current`
      );
      details.push('Frecuencia mínima y máxima de la CPU al 100%.');
      await execPowerShell(
        `powercfg /setacvalueindex scheme_current sub_processor SYSCOOLPOL 1; powercfg /setactive scheme_current`
      );
      details.push('Política de refrigeración activa.');
    } else if (kind === 'saver') {
      // Cap the CPU and use the passive cooling policy to stay quiet.
      await execPowerShell(
        `powercfg /setacvalueindex scheme_current sub_processor PROCTHROTTLEMIN 5; powercfg /setdcvalueindex scheme_current sub_processor PROCTHROTTLEMIN 5; powercfg /setacvalueindex scheme_current sub_processor PROCTHROTTLEMAX 99; powercfg /setdcvalueindex scheme_current sub_processor PROCTHROTTLEMAX 99; powercfg /setactive scheme_current`
      );
      details.push('CPU limitada entre el 5% y el 99% para bajar el ruido de los ventiladores.');
      await execPowerShell(
        `powercfg /setacvalueindex scheme_current sub_processor SYSCOOLPOL 0; powercfg /setactive scheme_current`
      );
      details.push('Política de refrigeración pasiva (más silenciosa).');
    }

    const after = await getBatteryStatus();
    return { ok: true, kind, planName: after.activePlanName || guid, details };
  } catch (err) {
    const message = (err as Error).message;
    logger.error(`Could not apply the ${kind} power profile: ${message}`);
    return { ok: false, kind, planName: '', error: message, details };
  }
}
