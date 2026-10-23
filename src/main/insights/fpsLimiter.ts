// Smart FPS limiter advice.
//
// The app cannot set a global FPS cap (that lives in the driver), but it can
// detect when the GPU is saturated - where the frame time grows with the
// refresh rate - and it can apply the recommended cap to the game's own
// configuration file, which is where the limit actually matters.
import { execPowerShell } from '../../shared/utils/process.js';
import { logger } from '../utils/logger.js';
import type { FpsLimiterAdvice } from '../../shared/types/insights.js';

export interface FpsLimiterContext {
  refreshRate: number;
  maxRefreshRate: number;
  gpuVendor: 'NVIDIA' | 'AMD' | 'Intel' | 'Unknown';
  gpuName: string;
}

export async function analyseFpsLimiter(ctx: FpsLimiterContext): Promise<FpsLimiterAdvice> {
  const limitations: string[] = [];

  try {
    // GPU utilisation sampled over a short window.
    const { stdout } = await execPowerShell(`
      $gpu = $null
      try {
        $g = Get-CimInstance Win32_PerfFormattedData_GPUPerformanceCounters_GPUEngine -ErrorAction Stop |
          Measure-Object -Property UtilizationPercentage -Maximum
        if ($null -ne $g.Maximum) { $gpu = [math]::Round($g.Maximum, 1) }
      } catch {}
      @{ Gpu = $gpu } | ConvertTo-Json
    `, { timeout: 15000 });

    const gpuUtil = JSON.parse(stdout.trim()).Gpu;
    const gpuUtilization = gpuUtil === null || gpuUtil === undefined ? null : Number(gpuUtil);
    const gpuSaturated = gpuUtilization !== null && gpuUtilization >= 99;

    const refresh = ctx.refreshRate > 0 ? ctx.refreshRate : ctx.maxRefreshRate;
    const max = ctx.maxRefreshRate > 0 ? ctx.maxRefreshRate : refresh;

    // With VRR a cap a few frames below the refresh rate keeps the pipeline full
    // without adding input latency. Without VRR, the classic stable choice is
    // the refresh rate itself.
    const vrr = await detectVrr(ctx);
    const suggestedCap = vrr === 'activo' ? Math.max(30, refresh - 3) : Math.max(30, refresh);

    let reason: string;
    if (gpuSaturated) {
      reason = `La GPU está al ${gpuUtilization}% de uso: con la tasa del monitor el tiempo de fotograma crece con cada frame y la latencia sube. Un límite de ${suggestedCap} FPS (${vrr === 'activo' ? '3 frames por debajo del refresco' : 'a la tasa del monitor'}) estabiliza los frametimes.`;
    } else if (refresh > 0 && max > refresh) {
      reason = `Windows está usando ${refresh} Hz y el monitor admite ${max} Hz. Con ${suggestedCap} FPS el juego entrega todos los fotogramas que la pantalla puede mostrar.`;
    } else {
      reason = `La GPU no está saturada (${gpuUtilization ?? 'sin datos'}% de uso). Un límite de ${suggestedCap} FPS mantiene los frametimes estables.`;
    }

    const latencyNote =
      ctx.gpuVendor === 'NVIDIA'
        ? 'Activa NVIDIA Reflex (On o On+Boost) para reducir la latencia de entrada; con un límite de FPS es imprescindible.'
        : ctx.gpuVendor === 'AMD'
          ? 'Activa AMD Anti-Lag en el software de Adrenalin para reducir la latencia de entrada.'
          : 'Si tu GPU admite una tecnología de latencia (Reflex, Anti-Lag, XeSS), actívala junto al límite de FPS.';

    const vrrNote =
      vrr === 'activo'
        ? 'VRR está activo: mantén V-Sync desactivado en el juego y usa un límite ligeramente por debajo del refresco.'
        : vrr === 'inactivo'
          ? 'VRR no está activo: actívalo en el panel de control de tu GPU para poder usar un límite por debajo del refresco.'
          : 'No se ha podido detectar si VRR está activo: actívalo en el panel de control de tu GPU si tu monitor lo soporta.';

    if (gpuUtilization === null) {
      limitations.push('No se ha podido leer la utilisation de la GPU: la recomendación se basa solo en la tasa de refresco.');
    }

    return {
      refreshRate: refresh,
      maxRefreshRate: max,
      vrr,
      gpuUtilization,
      gpuSaturated,
      suggestedCap,
      reason,
      latencyNote,
      vrrNote,
      measurable: gpuUtilization !== null,
    };
  } catch (err) {
    logger.warn('fps limiter analysis failed', err);
    return {
      refreshRate: ctx.refreshRate,
      maxRefreshRate: ctx.maxRefreshRate,
      vrr: 'desconocido',
      gpuUtilization: null,
      gpuSaturated: false,
      suggestedCap: Math.max(30, ctx.refreshRate - 3),
      reason: 'No se ha podido analizar el límite de FPS.',
      latencyNote: '',
      vrrNote: '',
      measurable: false,
    };
  }
}

/**
 * VRR state is not exposed through a public API, so we look for the vendor
 * specific registry switches and the DirectX user settings.
 */
export async function detectVrr(ctx: FpsLimiterContext): Promise<'activo' | 'inactivo' | 'desconocido'> {
  try {
    const { stdout } = await execPowerShell(`
      $state = 'desconocido'
      if ('${ctx.gpuVendor}' -eq 'NVIDIA') {
        $p = Get-ItemProperty 'HKCU:\\Software\\Microsoft\\DirectX\\UserGpuPreferences' -ErrorAction SilentlyContinue
        if ($p) {
          $v = ($p | Out-String)
          if ($v -match 'VSync' ) { $state = 'inactivo' }
        }
        $n = Get-ItemProperty 'HKCU:\\Software\\NVIDIA Corporation\\Global\\NVTweak' -ErrorAction SilentlyContinue
        if ($n -and $n.NvPowerOverlayV2 -ne $null) { $state = 'desconocido' }
      } elseif ('${ctx.gpuVendor}' -eq 'AMD') {
        $a = Get-ItemProperty 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Video\\*\\0000' -ErrorAction SilentlyContinue
        if ($a) { $state = 'desconocido' }
      }
      $state
    `, { timeout: 10000 });

    const state = stdout.trim();
    if (state === 'activo' || state === 'inactivo') return state;
    return 'desconocido';
  } catch {
    return 'desconocido';
  }
}
