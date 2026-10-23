// Stutter (micro-freeze) analysis.
//
// The app cannot attach ETW/PresentMon like a native profiler, so instead of
// pretending to measure in-game frametimes we sample the system counters that
// actually cause stutter and classify every spike by its most probable cause.
// Every classification carries the evidence that produced it and the report
// states what could not be measured.
import { execPowerShell } from '../../shared/utils/process.js';
import { logger } from '../utils/logger.js';
import type {
  StutterCause,
  StutterPeak,
  StutterReport,
  StutterSample,
} from '../../shared/types/insights.js';

const SAMPLE_INTERVAL_MS = 1000;

/**
 * Samples the counters that produce stutter. Runs for `durationMs` and returns
 * one sample per second.
 */
export async function sampleStutterSession(durationMs = 60000): Promise<StutterSample[]> {
  const samples: StutterSample[] = [];
  const deadline = Date.now() + durationMs;
  let t = 0;

  while (Date.now() < deadline) {
    const sample = await sampleOnce(t);
    if (sample) samples.push(sample);
    t += SAMPLE_INTERVAL_MS / 1000;
    await new Promise(r => setTimeout(r, SAMPLE_INTERVAL_MS));
  }

  return samples;
}

async function sampleOnce(t: number): Promise<StutterSample | null> {
  try {
    // The CIM performance classes are used on purpose: the Get-Counter names
    // are localized, so they do not exist on every Windows installation.
    const { stdout } = await execPowerShell(`
      $cpu = 0; $dpc = 0; $irq = 0; $diskQueue = 0; $memAvail = 0; $pages = 0; $gpu = $null
      try {
        $p = Get-CimInstance Win32_PerfFormattedData_PerfOS_Processor -Filter "Name='_Total'" -ErrorAction Stop
        $cpu = [math]::Round($p.PercentProcessorTime, 1)
        $dpc = [math]::Round($p.PercentDPCTime, 2)
        $irq = [math]::Round($p.PercentInterruptTime, 2)
      } catch {}
      try {
        $m = Get-CimInstance Win32_PerfFormattedData_PerfOS_Memory -ErrorAction Stop
        $memAvail = [math]::Round($m.AvailableMBytes, 0)
        $pages = [math]::Round($m.PagesPersec, 0)
      } catch {}
      try {
        $d = Get-CimInstance Win32_PerfFormattedData_PerfDisk_PhysicalDisk -ErrorAction Stop |
          Sort-Object -Property AvgDiskQueueLength -Descending | Select-Object -First 1
        $diskQueue = [math]::Round($d.AvgDiskQueueLength, 2)
      } catch {}
      try {
        $g = Get-CimInstance Win32_PerfFormattedData_GPUPerformanceCounters_GPUEngine -ErrorAction Stop |
          Measure-Object -Property UtilizationPercentage -Maximum
        if ($null -ne $g.Maximum) { $gpu = [math]::Round($g.Maximum, 1) }
      } catch {}
      @{ T = $t; Cpu = $cpu; Dpc = $dpc; Irq = $irq; DiskQueue = $diskQueue; MemAvail = $memAvail; Pages = $pages; Gpu = $gpu } | ConvertTo-Json
    `, { timeout: 15000 });

    const raw = JSON.parse(stdout.trim());
    return {
      t: Number(raw.T ?? 0),
      cpuPercent: Number(raw.Cpu ?? 0),
      gpuPercent: raw.Gpu === null || raw.Gpu === undefined ? null : Number(raw.Gpu),
      diskQueueLength: Number(raw.DiskQueue ?? 0),
      memAvailableMB: Number(raw.MemAvail ?? 0),
      pagesPerSec: Number(raw.Pages ?? 0),
      dpcPercent: Number(raw.Dpc ?? 0),
      irqPercent: Number(raw.Irq ?? 0),
      cpuTempC: null,
      gpuTempC: null,
    };
  } catch (err) {
    logger.warn('stutter sample failed', err);
    return null;
  }
}

/**
 * Classifies a spike using the counters captured around it.
 * The order matters: the most specific cause wins.
 */
export function classifyPeak(samples: StutterSample[], index: number): { cause: StutterCause; evidence: string[] } {
  const evidence: string[] = [];
  const window = samples.slice(Math.max(0, index - 1), index + 2);

  // A spike is a peak, not an average: averaging with the calm neighbours
  // would dilute the very event we are trying to explain.
  const peak = (pick: (s: StutterSample) => number | null): number | null => {
    const values = window.map(pick).filter((v): v is number => v !== null && !Number.isNaN(v));
    if (values.length === 0) return null;
    return Math.max(...values);
  };
  const lowest = (pick: (s: StutterSample) => number | null): number | null => {
    const values = window.map(pick).filter((v): v is number => v !== null && !Number.isNaN(v));
    if (values.length === 0) return null;
    return Math.min(...values);
  };

  const cpu = peak(s => s.cpuPercent);
  const gpu = peak(s => s.gpuPercent);
  const disk = peak(s => s.diskQueueLength);
  const memAvail = lowest(s => s.memAvailableMB);
  const pages = peak(s => s.pagesPerSec);
  const dpc = peak(s => s.dpcPercent);
  const irq = peak(s => s.irqPercent);

  if (dpc !== null && dpc >= 3) {
    evidence.push(`Tiempo en DPC: ${dpc.toFixed(2)}%`);
    if (irq !== null) evidence.push(`Tiempo en interrupciones: ${irq.toFixed(2)}%`);
    return { cause: 'driver_interrupt', evidence };
  }

  if (disk !== null && disk >= 8) {
    evidence.push(`Cola de disco: ${disk.toFixed(1)} (peticiones esperando)`);
    if (pages !== null && pages >= 500) evidence.push(`Páginas por segundo: ${Math.round(pages)}`);
    return { cause: 'disk_access', evidence };
  }

  if (memAvail !== null && memAvail < 1500) {
    evidence.push(`Memoria disponible: ${Math.round(memAvail)} MB`);
    if (pages !== null && pages >= 500) evidence.push(`Páginas por segundo: ${Math.round(pages)} (paginado)`);
    return { cause: 'memory_paging', evidence };
  }

  if (cpu !== null && cpu >= 85) {
    evidence.push(`CPU al ${cpu.toFixed(0)}%`);
    if (gpu !== null && gpu >= 90) {
      evidence.push(`GPU al ${gpu.toFixed(0)}%`);
      return { cause: 'gpu_saturated', evidence };
    }
    return { cause: 'cpu_saturated', evidence };
  }

  if (gpu !== null && gpu >= 92) {
    evidence.push(`GPU al ${gpu.toFixed(0)}%`);
    return { cause: 'gpu_saturated', evidence };
  }

  if (cpu !== null && cpu >= 55) {
    evidence.push(`CPU al ${cpu.toFixed(0)}% sin saturar la GPU`);
    return { cause: 'shader_compilation', evidence };
  }

  return { cause: 'unknown', evidence: ['Ningún contador mostró un pico claro'] };
}

const CAUSE_LABELS: Record<StutterCause, string> = {
  shader_compilation: 'compilación de shaders',
  disk_access: 'acceso a disco',
  cpu_saturated: 'CPU saturada',
  gpu_saturated: 'GPU saturada',
  thermal: 'temperatura alta',
  memory_paging: 'memoria llena o paginando',
  driver_interrupt: 'interrupción de un driver',
  unknown: 'causa no determinada',
};

const CAUSE_RECOMMENDATIONS: Record<StutterCause, string> = {
  shader_compilation:
    'La causa más habitual es la primera compilación de shaders: abre el juego, espera a que termine de compilar y juega otra vez. Si persiste, baja la calidad de texturas.',
  disk_access:
    'El juego está esperando al disco. Mueve el juego a un SSD y deja al menos un 15% de espacio libre en la unidad del juego.',
  cpu_saturated:
    'La CPU está al límite. Cierra procesos en segundo plano y revisa que el juego se ejecute en los núcleos de rendimiento.',
  gpu_saturated:
    'La GPU está al límite. Bajar la calidad gráfica o activar un límite de FPS suele eliminar los tirones.',
  thermal:
    'El equipo se está calentando y está limitando la frecuencia. Limpia la ventilación o revisa la pasta térmica.',
  memory_paging:
    'Falta memoria y el sistema está paginando a disco. Cierra pestañas y programas, o amplía la RAM.',
  driver_interrupt:
    'Un driver está generando interrupciones. Actualiza el driver sospechoso o cambia el dispositivo de puerto.',
  unknown:
    'No se ha podido determinar la causa con los contadores del sistema. Repite la captura mientras juegas y revisa si coincide con algún evento concreto.',
};

/**
 * Builds the stutter report out of the captured samples.
 */
export function buildStutterReport(samples: StutterSample[]): StutterReport {
  const limitations = [
    'Los 1% lows y el frametime dentro del juego no se pueden medir desde fuera: harían falta PresentMon o ETW.',
    'La causa se deduce de contadores del sistema, no del propio motor del juego.',
  ];

  if (samples.length < 3) {
    return {
      durationMs: samples.length * SAMPLE_INTERVAL_MS,
      sampleCount: samples.length,
      samples,
      peaks: [],
      dominantCause: 'unknown',
      summary: 'No se han recogido muestras suficientes para analizar tirones.',
      recommendation: 'Graba al menos 10 segundos con el juego en marcha.',
      confidence: 'baja',
      limitations,
    };
  }

  const cpuValues = samples.map(s => s.cpuPercent);
  const diskValues = samples.map(s => s.diskQueueLength);
  const gpuValues = samples.map(s => s.gpuPercent).filter((v): v is number => v !== null);
  const memValues = samples.map(s => s.memAvailableMB);

  const cpuAvg = cpuValues.reduce((a, b) => a + b, 0) / cpuValues.length;
  const diskAvg = diskValues.reduce((a, b) => a + b, 0) / diskValues.length;
  const gpuAvg = gpuValues.length ? gpuValues.reduce((a, b) => a + b, 0) / gpuValues.length : null;
  const memAvg = memValues.reduce((a, b) => a + b, 0) / memValues.length;

  // A "spike" is a second where the CPU or the disk queue clearly exceeds the
  // average of the session, i.e. something happened that did not happen before.
  const spikes: number[] = [];
  samples.forEach((s, i) => {
    const cpuJump = s.cpuPercent - cpuAvg;
    const diskJump = s.diskQueueLength - diskAvg;
    const memDrop = memAvg - s.memAvailableMB;
    if (cpuJump >= 25 || diskJump >= 4 || memDrop >= 1200) spikes.push(i);
  });

  const peaks: StutterPeak[] = spikes.slice(0, 25).map(i => {
    const { cause, evidence } = classifyPeak(samples, i);
    const cpuJump = Math.max(0, samples[i].cpuPercent - cpuAvg);
    const diskJump = Math.max(0, samples[i].diskQueueLength - diskAvg);
    const severity = Math.min(100, Math.round((cpuJump * 2 + diskJump * 8) / 2));
    return {
      startIndex: i,
      durationMs: SAMPLE_INTERVAL_MS,
      severity,
      cause,
      evidence,
    };
  });

  const counts = new Map<StutterCause, number>();
  for (const peak of peaks) counts.set(peak.cause, (counts.get(peak.cause) ?? 0) + 1);
  let dominant: StutterCause = 'unknown';
  let best = 0;
  for (const [cause, count] of counts) {
    if (count > best) {
      best = count;
      dominant = cause;
    }
  }

  const summary =
    peaks.length === 0
      ? 'No se han detectado picos de carga relevantes durante la captura.'
      : `Tus tirones vienen sobre todo de ${CAUSE_LABELS[dominant]} (${best} de ${peaks.length} picos).`;

  const confidence: StutterReport['confidence'] =
    peaks.length === 0 ? 'baja' : best >= peaks.length * 0.6 ? 'alta' : best >= peaks.length * 0.35 ? 'media' : 'baja';

  return {
    durationMs: samples.length * SAMPLE_INTERVAL_MS,
    sampleCount: samples.length,
    samples,
    peaks,
    dominantCause: dominant,
    summary,
    recommendation: peaks.length === 0 ? 'No hay nada que arreglar en la captura.' : CAUSE_RECOMMENDATIONS[dominant],
    confidence,
    limitations,
  };
}

export { CAUSE_LABELS };
