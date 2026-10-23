// High impact insight cards (section 15).
//
// They are rendered inside the approved screens (Diagnosis, Benchmark, Game
// Mode) as extra cards. Every card states what it could not measure instead of
// showing made up numbers.
import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Cpu,
  Gamepad2,
  Gauge,
  HardDrive,
  Monitor,
  Play,
  RefreshCw,
  Shield,
  Thermometer,
  Wrench,
  Zap,
} from 'lucide-react';
import { BentoCard, BentoCardContent, BentoCardHeader } from '../components/BentoGrid';
import { cn } from '../utils/cn';
import { zerotweaks } from '../lib/api';
import { useToastActions } from '../components/Toast';
import { useTranslation } from 'react-i18next';
import type {
  BiosGuide,
  ChecklistItem,
  ComparisonResult,
  CpuCoreReport,
  DisplayInputReport,
  DriverLatencyReport,
  FpsLimiterAdvice,
  GameProfileRecommendation,
  HeavySoftwareReport,
  MemoryFilesReport,
  PausableCandidate,
  RepairAction,
  RepairResult,
  StutterReport,
} from '../../shared/types/insights';

function FindingRow({ title, detail, impact }: { title: string; detail: string; impact: string }) {
  const color = impact === 'alto' ? 'text-red-400' : impact === 'medio' ? 'text-yellow-400' : 'text-muted-foreground';
  return (
    <div className="p-3 bg-accent/50 rounded-lg border border-border/50">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <span className={cn('text-[11px] uppercase tracking-wide font-medium', color)}>{impact}</span>
      </div>
      <p className="text-xs text-muted-foreground mt-1">{detail}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 15.1 Stutter analysis
// ---------------------------------------------------------------------------
export function StutterCard() {
  const { t } = useTranslation();
  const { info, error, success } = useToastActions();
  const [report, setReport] = useState<StutterReport | null>(null);
  const [running, setRunning] = useState(false);

  const capture = useCallback(async () => {
    setRunning(true);
    info('Capturando tirones', 'Mantén el juego en marcha durante la captura (60 s).');
    try {
      const result = await zerotweaks.insights.stutter(60000);
      setReport(result);
      success('Captura terminada', result.summary);
    } catch (err: any) {
      error('Error en la captura', err.message);
    } finally {
      setRunning(false);
    }
  }, [info, success, error]);

  return (
    <BentoCard>
      <BentoCardHeader
        title={t('insights.stutterTitle')}
        subtitle={t('insights.stutterSubtitle')}
        icon={<Activity className="w-5 h-5" />}
        action={
          <button
            onClick={capture}
            disabled={running}
            className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-1 disabled:opacity-50"
          >
            <Play className="w-3 h-3" />
            {running ? '...' : t('insights.stutterCapture')}
          </button>
        }
      />
      <BentoCardContent>
        {!report && (
          <p className="text-sm text-muted-foreground">
            El análisis muestrea CPU, GPU, cola de disco, paginado, DPC e interrupciones una vez por
            segundo. Los tirones se clasifican como compilación de shaders, acceso a disco, CPU o GPU
            saturada, memoria llena, temperatura o interrupción de un driver.
          </p>
        )}

        {report && (
          <div className="space-y-4">
            <div
              className={cn(
                'p-3 rounded-lg border text-sm',
                report.peaks.length === 0
                  ? 'bg-green-500/10 border-green-500/20 text-green-400'
                  : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-300'
              )}
            >
              {report.summary}
              <p className="text-xs mt-1 opacity-90">Confianza: {report.confidence}</p>
            </div>

            {report.peaks.length > 0 && (
              <>
                <p className="text-sm text-foreground">{report.recommendation}</p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {report.peaks.slice(0, 12).map((peak, i) => (
                    <div key={i} className="p-3 bg-accent/50 rounded-lg border border-border/50">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">
                          Pico {i + 1} · segundo {peak.startIndex}
                        </span>
                        <span className="text-[11px] uppercase text-muted-foreground">
                          gravedad {peak.severity}
                        </span>
                      </div>
                      <p className="text-xs text-primary mt-1">{CAUSE_LABELS[peak.cause] ?? peak.cause}</p>
                      <ul className="list-disc list-inside mt-1">
                        {peak.evidence.map((e, j) => (
                          <li key={j} className="text-[11px] text-muted-foreground font-mono">
                            {e}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </>
            )}

            {report.limitations.length > 0 && (
              <div className="p-3 bg-accent/40 rounded-lg">
                <p className="text-xs text-muted-foreground font-medium mb-1">Límites de la medición:</p>
                <ul className="list-disc list-inside">
                  {report.limitations.map((l, i) => (
                    <li key={i} className="text-[11px] text-muted-foreground">{l}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </BentoCardContent>
    </BentoCard>
  );
}

const CAUSE_LABELS: Record<string, string> = {
  shader_compilation: 'Compilación de shaders',
  disk_access: 'Acceso a disco',
  cpu_saturated: 'CPU saturada',
  gpu_saturated: 'GPU saturada',
  thermal: 'Temperatura alta',
  memory_paging: 'Memoria llena o paginando',
  driver_interrupt: 'Interrupción de un driver',
  unknown: 'Causa no determinada',
};

// ---------------------------------------------------------------------------
// 15.2 Driver latency
// ---------------------------------------------------------------------------
export function DriverLatencyCard() {
  const { t } = useTranslation();
  const [report, setReport] = useState<DriverLatencyReport | null>(null);
  const [loading, setLoading] = useState(false);

  const analyse = useCallback(async () => {
    setLoading(true);
    try {
      setReport(await zerotweaks.insights.drivers());
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <BentoCard>
      <BentoCardHeader
        title={t('insights.driversTitle')}
        subtitle={t('insights.driversSubtitle')}
        icon={<Shield className="w-5 h-5" />}
        action={
          <button
            onClick={analyse}
            disabled={loading}
            className="px-3 py-1.5 bg-transparent border border-border text-foreground rounded-lg text-sm font-medium hover:bg-accent hover:border-primary/50 transition-colors flex items-center gap-1 disabled:opacity-50"
          >
            <RefreshCw className={cn('w-3 h-3', loading && 'animate-spin')} />
            Analizar
          </button>
        }
      />
      <BentoCardContent>
        {!report && (
          <p className="text-sm text-muted-foreground">
            Se mide el porcentaje de tiempo del sistema dedicado a DPC e interrupciones. Si supera el
            1-2% es habitual notar tirones aunque el juego esté bien configurado.
          </p>
        )}
        {report && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-accent/50 rounded-lg">
                <p className="font-space text-xl font-bold text-foreground">{report.dpcPercent}%</p>
                <p className="text-xs text-muted-foreground">DPC</p>
              </div>
              <div className="p-3 bg-accent/50 rounded-lg">
                <p className="font-space text-xl font-bold text-foreground">{report.irqPercent}%</p>
                <p className="text-xs text-muted-foreground">Interrupciones</p>
              </div>
              <div className="p-3 bg-accent/50 rounded-lg">
                <p
                  className={cn(
                    'font-space text-xl font-bold',
                    report.verdict === 'alto' ? 'text-red-400' : report.verdict === 'ok' ? 'text-green-400' : 'text-muted-foreground'
                  )}
                >
                  {report.verdict === 'alto' ? 'Alto' : report.verdict === 'ok' ? 'Normal' : '?'}
                </p>
                <p className="text-xs text-muted-foreground">Veredicto</p>
              </div>
            </div>
            <p className="text-sm text-foreground">{report.summary}</p>
            <p className="text-sm text-primary">{report.recommendation}</p>

            {report.suspects.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Sospechosos</p>
                {report.suspects.slice(0, 8).map((s, i) => (
                  <div key={i} className="p-3 bg-accent/50 rounded-lg border border-border/50">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">{s.deviceName}</p>
                      {s.outdated && (
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400">
                          DESACTUALIZADO
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{s.reason}</p>
                    <p className="text-[11px] text-muted-foreground font-mono mt-1">
                      {s.deviceClass} · {s.driverVersion}
                      {s.driverDate ? ` · ${s.driverDate.split(' ')[0]}` : ''}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {report.limitations.length > 0 && (
              <div className="p-3 bg-accent/40 rounded-lg">
                <p className="text-xs text-muted-foreground font-medium mb-1">Límites de la medición:</p>
                <ul className="list-disc list-inside">
                  {report.limitations.map((l, i) => (
                    <li key={i} className="text-[11px] text-muted-foreground">{l}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </BentoCardContent>
    </BentoCard>
  );
}

// ---------------------------------------------------------------------------
// 15.3 Smart FPS limiter
// ---------------------------------------------------------------------------
export function FpsLimiterCard({ onApplyCap }: { onApplyCap?: (cap: number) => void }) {
  const { t } = useTranslation();
  const [advice, setAdvice] = useState<FpsLimiterAdvice | null>(null);
  const [loading, setLoading] = useState(false);

  const analyse = useCallback(async () => {
    setLoading(true);
    try {
      setAdvice(await zerotweaks.insights.fpsLimiter());
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <BentoCard>
      <BentoCardHeader
        title={t('insights.fpsTitle')}
        subtitle={t('insights.fpsSubtitle')}
        icon={<Gauge className="w-5 h-5" />}
        action={
          <button
            onClick={analyse}
            disabled={loading}
            className="px-3 py-1.5 bg-transparent border border-border text-foreground rounded-lg text-sm font-medium hover:bg-accent hover:border-primary/50 transition-colors flex items-center gap-1 disabled:opacity-50"
          >
            <RefreshCw className={cn('w-3 h-3', loading && 'animate-spin')} />
            Analizar
          </button>
        }
      />
      <BentoCardContent>
        {!advice && (
          <p className="text-sm text-muted-foreground">
            Si la GPU está al 99-100% el tiempo de fotograma crece con cada frame y la latencia de
            entrada sube. Un límite de FPS coherente con el refresco del monitor lo evita.
          </p>
        )}
        {advice && (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-accent/50 rounded-lg">
              <div>
                <p className="text-xs text-muted-foreground">Límite sugerido</p>
                <p className="font-space text-2xl font-bold text-primary">{advice.suggestedCap} FPS</p>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <p>Monitor: {advice.refreshRate} Hz</p>
                <p>VRR: {advice.vrr}</p>
                <p>
                  GPU:{' '}
                  {advice.gpuUtilization === null ? 'sin datos' : `${Math.round(advice.gpuUtilization)}%`}
                </p>
              </div>
            </div>
            <p className="text-sm text-foreground">{advice.reason}</p>
            <p className="text-sm text-muted-foreground">{advice.latencyNote}</p>
            <p className="text-sm text-muted-foreground">{advice.vrrNote}</p>
            {onApplyCap && (
              <button
                onClick={() => onApplyCap(advice.suggestedCap)}
                className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Aplicar límite al juego (ajustes dentro del juego)
              </button>
            )}
            {!advice.measurable && (
              <p className="text-xs text-yellow-400">
                No se ha podido leer la utilización de la GPU: la recomendación se basa solo en la
                tasa de refresco.
              </p>
            )}
          </div>
        )}
      </BentoCardContent>
    </BentoCard>
  );
}

// ---------------------------------------------------------------------------
// 15.4 Comparison (opt-in)
// ---------------------------------------------------------------------------
export function ComparisonCard() {
  const { t } = useTranslation();
  const [enabled, setEnabled] = useState(false);
  const [result, setResult] = useState<ComparisonResult | null>(null);

  const toggle = async (value: boolean) => {
    setEnabled(value);
    try {
      setResult(await zerotweaks.insights.comparison(value));
    } catch {
      setResult(null);
    }
  };

  return (
    <BentoCard>
      <BentoCardHeader
        title={t('insights.comparisonTitle')}
        subtitle={t('insights.comparisonSubtitle')}
        icon={<Activity className="w-5 h-5" />}
      />
      <BentoCardContent>
        <label className="flex items-center justify-between cursor-pointer mb-3">
          <span className="text-sm text-foreground">Activar la comparación</span>
          <input
            type="checkbox"
            checked={enabled}
            onChange={e => toggle(e.target.checked)}
            className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
          />
        </label>
        <p className="text-sm text-muted-foreground">
          Nada sale de tu equipo: la estimación se calcula localmente a partir de tu CPU, GPU y RAM.
        </p>
        {result?.enabled && (
          <div className="mt-3 space-y-2">
            <div className="p-3 bg-accent/50 rounded-lg">
              <p className="font-space text-2xl font-bold text-primary">{result.percentile}%</p>
              <p className="text-xs text-muted-foreground">percentil estimado frente a un equipo con las mismas especificaciones</p>
            </div>
            <p className="text-xs text-muted-foreground">{result.note}</p>
            {result.deeperChecks.length > 0 && (
              <div className="p-3 bg-accent/40 rounded-lg">
                <p className="text-xs font-medium text-muted-foreground mb-1">Profundizar en:</p>
                <ul className="list-disc list-inside">
                  {result.deeperChecks.map((c, i) => (
                    <li key={i} className="text-[11px] text-muted-foreground">{c}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </BentoCardContent>
    </BentoCard>
  );
}

// ---------------------------------------------------------------------------
// 15.5 Heavy software
// ---------------------------------------------------------------------------
export function HeavySoftwareCard() {
  const { t } = useTranslation();
  const { success, error, info } = useToastActions();
  const [report, setReport] = useState<HeavySoftwareReport | null>(null);
  const [busy, setBusy] = useState(false);

  const scan = useCallback(async () => {
    setBusy(true);
    try {
      setReport(await zerotweaks.insights.heavySoftware());
    } finally {
      setBusy(false);
    }
  }, []);

  const closeAll = async () => {
    if (!report) return;
    const running = report.apps.filter(a => a.running && !a.excluded).map(a => a.process);
    if (running.length === 0) {
      info('Nada que cerrar', 'No hay programas de la lista en ejecución.');
      return;
    }
    setBusy(true);
    try {
      const result = await zerotweaks.insights.closeHeavy(running);
      success('Programas cerrados', `${result.closed.length} cerrados${result.failed.length ? `, ${result.failed.length} con error` : ''}.`);
      await scan();
    } catch (err: any) {
      error('Error', err.message);
    } finally {
      setBusy(false);
    }
  };

  const disableStartup = async (process: string) => {
    setBusy(true);
    try {
      const result = await zerotweaks.insights.disableAutostart(process);
      if (result.ok) {
        success('Arranque desactivado', result.removed.length ? `Entradas quitadas: ${result.removed.join(', ')}` : 'No había entrada de arranque.');
        await scan();
      }
    } catch (err: any) {
      error('Error', err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <BentoCard>
      <BentoCardHeader
        title={t('insights.heavyTitle')}
        subtitle={t('insights.heavySubtitle')}
        icon={<AlertTriangle className="w-5 h-5" />}
        action={
          <div className="flex gap-2">
            <button
              onClick={scan}
              disabled={busy}
              className="px-3 py-1.5 bg-transparent border border-border text-foreground rounded-lg text-sm font-medium hover:bg-accent hover:border-primary/50 transition-colors flex items-center gap-1 disabled:opacity-50"
            >
              <RefreshCw className={cn('w-3 h-3', busy && 'animate-spin')} />
              Escanear
            </button>
            <button
              onClick={closeAll}
              disabled={busy || !report}
              className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              Cerrar en marcha
            </button>
          </div>
        }
      />
      <BentoCardContent>
        {!report && (
          <p className="text-sm text-muted-foreground">
            Se mide el uso real (RAM y CPU) de una lista conservadora de programas conocidos por
            interferir con los juegos. Nada se cierra ni se desactiva sin que lo pidas.
          </p>
        )}
        {report && (
          <div className="space-y-3">
            <p className="text-sm text-foreground">{report.summary}</p>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {report.apps
                .filter(a => a.running || a.excluded)
                .map(app => (
                  <div key={app.id} className="p-3 bg-accent/50 rounded-lg border border-border/50">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">{app.name}</p>
                      <span className="text-[11px] font-mono text-muted-foreground">
                        {app.running ? `${Math.round(app.ramMB)} MB` : 'no está en marcha'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{app.reason}</p>
                    <p className="text-xs text-primary mt-1">Alternativa: {app.alternative}</p>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => disableStartup(app.process)}
                        disabled={busy}
                        className="px-2 py-1 text-[11px] bg-transparent border border-border text-foreground rounded hover:bg-accent transition-colors disabled:opacity-50"
                      >
                        Desactivar del arranque
                      </button>
                      <button
                        onClick={async () => {
                          const excluded = report.apps
                            .filter(a => !a.excluded && a.process !== app.process)
                            .map(a => a.process);
                          await zerotweaks.insights.excludeHeavy(excluded);
                          await scan();
                        }}
                        className="px-2 py-1 text-[11px] bg-transparent border border-border text-muted-foreground rounded hover:bg-accent transition-colors"
                      >
                        Ignorar siempre
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </BentoCardContent>
    </BentoCard>
  );
}

// ---------------------------------------------------------------------------
// 15.2b CPU and cores
// ---------------------------------------------------------------------------
export function CpuCoresCard() {
  const { t } = useTranslation();
  const [report, setReport] = useState<CpuCoreReport | null>(null);
  const [loading, setLoading] = useState(false);

  const analyse = useCallback(async () => {
    setLoading(true);
    try {
      setReport(await zerotweaks.insights.cpu());
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <BentoCard>
      <BentoCardHeader
        title={t('insights.cpuTitle')}
        subtitle={t('insights.cpuSubtitle')}
        icon={<Cpu className="w-5 h-5" />}
        action={
          <button
            onClick={analyse}
            disabled={loading}
            className="px-3 py-1.5 bg-transparent border border-border text-foreground rounded-lg text-sm font-medium hover:bg-accent hover:border-primary/50 transition-colors flex items-center gap-1 disabled:opacity-50"
          >
            <RefreshCw className={cn('w-3 h-3', loading && 'animate-spin')} />
            Analizar
          </button>
        }
      />
      <BentoCardContent>
        {!report && (
          <p className="text-sm text-muted-foreground">
            En las CPU híbridas de Intel y en las AMD con varios CCD, el juego debe ejecutarse en los
            núcleos de rendimiento. Windows lo hace solo con Efficiency Class, pero una afinidad mal
            puesta lo rompe.
          </p>
        )}
        {report && (
          <div className="space-y-3">
            <p className="text-sm text-foreground">{report.summary}</p>
            {report.chipsetDriver && (
              <div className="p-3 bg-accent/50 rounded-lg border border-border/50">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">Driver del chipset</p>
                  {report.chipsetDriver.outdated && (
                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400">
                      DESACTUALIZADO
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1 font-mono">
                  {report.chipsetDriver.version} · {report.chipsetDriver.date || 'fecha desconocida'}
                </p>
                <a
                  href={report.chipsetDriver.officialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline mt-1 inline-block"
                >
                  Descargar el driver oficial
                </a>
              </div>
            )}
            <ul className="space-y-1">
              {report.guidance.map((g, i) => (
                <li key={i} className="text-xs text-muted-foreground">• {g}</li>
              ))}
            </ul>
          </div>
        )}
      </BentoCardContent>
    </BentoCard>
  );
}

// ---------------------------------------------------------------------------
// 15.6 Display and input
// ---------------------------------------------------------------------------
export function DisplayInputCard() {
  const { t } = useTranslation();
  const [report, setReport] = useState<DisplayInputReport | null>(null);
  const [loading, setLoading] = useState(false);

  const analyse = useCallback(async () => {
    setLoading(true);
    try {
      setReport(await zerotweaks.insights.display());
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <BentoCard>
      <BentoCardHeader
        title={t('insights.displayTitle')}
        subtitle={t('insights.displaySubtitle')}
        icon={<Monitor className="w-5 h-5" />}
        action={
          <button
            onClick={analyse}
            disabled={loading}
            className="px-3 py-1.5 bg-transparent border border-border text-foreground rounded-lg text-sm font-medium hover:bg-accent hover:border-primary/50 transition-colors flex items-center gap-1 disabled:opacity-50"
          >
            <RefreshCw className={cn('w-3 h-3', loading && 'animate-spin')} />
            Analizar
          </button>
        }
      />
      <BentoCardContent>
        {!report && (
          <p className="text-sm text-muted-foreground">
            Comprueba la tasa de refresco, las optimizaciones para juegos en ventana, la tasa de sondeo
            del ratón, los periféricos Bluetooth y la configuración de audio.
          </p>
        )}
        {report && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
              <Metric label="Refresco" value={`${report.refreshRate} Hz`} />
              <Metric label="Ventana" value={report.windowedOptimizations} />
              <Metric label="VRR" value={report.vrr} />
              <Metric label="Sondeo" value={report.mousePollingRate ? `${report.mousePollingRate} Hz` : 'n/d'} />
            </div>
            {report.findings.length === 0 ? (
              <p className="text-sm text-green-400">No se han encontrado nada que corregir en la cadena de entrada y salida.</p>
            ) : (
              <div className="space-y-2">
                {report.findings.map(f => (
                  <FindingRow key={f.id} title={f.title} detail={f.detail} impact={f.impact} />
                ))}
              </div>
            )}
            {report.bluetoothDevices.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Dispositivos Bluetooth detectados: {report.bluetoothDevices.join(', ')}. Conéctalos a un
                puerto USB directo de la placa base para reducir la latencia.
              </p>
            )}
          </div>
        )}
      </BentoCardContent>
    </BentoCard>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 bg-accent/50 rounded-lg">
      <p className="font-space text-lg font-bold text-foreground" title={value}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 15.7 Memory and files
// ---------------------------------------------------------------------------
export function MemoryFilesCard() {
  const { t } = useTranslation();
  const { success, error } = useToastActions();
  const [report, setReport] = useState<MemoryFilesReport | null>(null);
  const [loading, setLoading] = useState(false);

  const analyse = useCallback(async () => {
    setLoading(true);
    try {
      setReport(await zerotweaks.insights.memoryFiles());
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <BentoCard>
      <BentoCardHeader
        title={t('insights.memoryTitle')}
        subtitle={t('insights.memorySubtitle')}
        icon={<HardDrive className="w-5 h-5" />}
        action={
          <button
            onClick={analyse}
            disabled={loading}
            className="px-3 py-1.5 bg-transparent border border-border text-foreground rounded-lg text-sm font-medium hover:bg-accent hover:border-primary/50 transition-colors flex items-center gap-1 disabled:opacity-50"
          >
            <RefreshCw className={cn('w-3 h-3', loading && 'animate-spin')} />
            Analizar
          </button>
        }
      />
      <BentoCardContent>
        {!report && (
          <p className="text-sm text-muted-foreground">
            Con poca RAM el archivo de paginación debe estar en un SSD. Una caché de shaders
            corrupta provoca stutter y se puede reconstruir.
          </p>
        )}
        {report && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
              <Metric label="RAM" value={`${report.ramGB} GB`} />
              <Metric
                label="Paginación"
                value={report.pageFile ? `${report.pageFile.totalMB} MB` : 'sin archivo'}
              />
              <Metric
                label="Paginación en"
                value={report.pageFile ? (report.pageFile.onSSD ? 'SSD' : 'disco lento') : 'n/d'}
              />
              <Metric label="Libre" value={`${report.systemDriveFreeGB} GB`} />
            </div>
            {report.findings.length === 0 ? (
              <p className="text-sm text-green-400">No hay nada que corregir en memoria y archivos.</p>
            ) : (
              <div className="space-y-2">
                {report.findings.map(f => (
                  <FindingRow key={f.id} title={f.title} detail={f.detail} impact={f.impact} />
                ))}
              </div>
            )}
            {report.shaderCaches.length > 0 && (
              <div className="p-3 bg-accent/40 rounded-lg">
                <p className="text-xs font-medium text-muted-foreground mb-1">Cachés de shaders</p>
                {report.shaderCaches.map(c => (
                  <p key={c.path} className="text-[11px] text-muted-foreground font-mono truncate" title={`${c.name}: ${Math.round(c.sizeMB)} MB · ${c.ageDays} días`}>
                    {c.name}: {Math.round(c.sizeMB)} MB · {c.ageDays} días
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </BentoCardContent>
    </BentoCard>
  );
}

// ---------------------------------------------------------------------------
// 15.8 Repair Windows
// ---------------------------------------------------------------------------
export function RepairCard() {
  const { t } = useTranslation();
  const { success, error, info } = useToastActions();
  const [actions, setActions] = useState<RepairAction[]>([]);
  const [results, setResults] = useState<RepairResult[]>([]);
  const [elevated, setElevated] = useState<boolean | null>(null);
  const [running, setRunning] = useState<string | null>(null);

  useEffect(() => {
    void zerotweaks.insights.repairActions().then(list => {
      setActions(list);
      return zerotweaks.insights.isElevated();
    }).then(setElevated);
  }, []);

  const run = async (action: RepairAction) => {
    setRunning(action.id);
    try {
      const result = await zerotweaks.insights.runRepair(action.id);
      setResults(prev => [result, ...prev.filter(r => r.id !== result.id)]);
      if (result.ok) success('Reparación terminada', action.name);
      else error('No se pudo completar', result.output.slice(0, 200));
    } catch (err: any) {
      error('Error', err.message);
    } finally {
      setRunning(null);
    }
  };

  return (
    <BentoCard>
      <BentoCardHeader
        title={t('insights.repairTitle')}
        subtitle={t('insights.repairSubtitle')}
        icon={<Wrench className="w-5 h-5" />}
      />
      <BentoCardContent>
        {elevated === false && (
          <div className="mb-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <p className="text-xs text-yellow-400">
              ZeroTweaks no se está ejecutando como administrador. Estas reparaciones necesitan
              privilegios elevados: reinicia la aplicación como administrador para poder usarlas.
            </p>
          </div>
        )}
        <p className="text-sm text-muted-foreground mb-3">
          Solo se ejecutan bajo demanda y cada una queda registrada en el manifiesto de Zero Danger.
        </p>
        <div className="space-y-2">
          {actions.map(action => (
            <div key={action.id} className="p-3 bg-accent/50 rounded-lg border border-border/50">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground">{action.name}</p>
                <span className="text-[11px] uppercase text-muted-foreground">riesgo {action.risk}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{action.description}</p>
              <p className="text-[11px] text-muted-foreground mt-1">Indicado si: {action.symptom}</p>
              <button
                onClick={() => run(action)}
                disabled={running !== null}
                className="mt-2 px-3 py-1 text-[11px] bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {running === action.id ? 'Ejecutando...' : 'Ejecutar'}
              </button>
            </div>
          ))}
        </div>

        {results.length > 0 && (
          <div className="mt-3 space-y-2">
            {results.map(r => (
              <div key={r.id} className="p-3 bg-accent/40 rounded-lg">
                <div className="flex items-center gap-2">
                  {r.ok ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                  )}
                  <p className="text-sm text-foreground">{r.id}</p>
                  <span className="text-[11px] text-muted-foreground">{Math.round(r.durationMs / 1000)} s</span>
                </div>
                <pre className="text-[11px] text-muted-foreground mt-1 whitespace-pre-wrap max-h-32 overflow-y-auto">
                  {r.output}
                </pre>
              </div>
            ))}
          </div>
        )}
      </BentoCardContent>
    </BentoCard>
  );
}

// ---------------------------------------------------------------------------
// 15.9 Temperature
// ---------------------------------------------------------------------------
export function ThermalCard() {
  const { t } = useTranslation();
  const [report, setReport] = useState<Awaited<ReturnType<typeof zerotweaks.insights.thermal>> | null>(null);
  const [loading, setLoading] = useState(false);

  const analyse = useCallback(async () => {
    setLoading(true);
    try {
      setReport(await zerotweaks.insights.thermal(null, null, false));
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <BentoCard>
      <BentoCardHeader
        title={t('insights.thermalTitle')}
        subtitle={t('insights.thermalSubtitle')}
        icon={<Thermometer className="w-5 h-5" />}
        action={
          <button
            onClick={analyse}
            disabled={loading}
            className="px-3 py-1.5 bg-transparent border border-border text-foreground rounded-lg text-sm font-medium hover:bg-accent hover:border-primary/50 transition-colors flex items-center gap-1 disabled:opacity-50"
          >
            <RefreshCw className={cn('w-3 h-3', loading && 'animate-spin')} />
            Analizar
          </button>
        }
      />
      <BentoCardContent>
        {!report && (
          <p className="text-sm text-muted-foreground">
            Con el equipo caliente, Windows reduce la frecuencia para protegerlo. En portátiles, jugar
            con batería fuerza además el plan de energía equilibrado.
          </p>
        )}
        {report && (
          <div className="space-y-3">
            <p className="text-sm text-foreground">{report.summary}</p>
            {report.onBattery && (
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-xs text-yellow-400">
                  El equipo está con batería{report.batteryChargePercent !== null ? ` (${report.batteryChargePercent}%)` : ''}. Conecta el cargador original antes de jugar.
                </p>
              </div>
            )}
            <ul className="space-y-1">
              {report.guidance.map((g, i) => (
                <li key={i} className="text-xs text-muted-foreground">• {g}</li>
              ))}
            </ul>
          </div>
        )}
      </BentoCardContent>
    </BentoCard>
  );
}

// ---------------------------------------------------------------------------
// 15.10 BIOS guides
// ---------------------------------------------------------------------------
export function BiosGuidesCard({ vendor }: { vendor?: string }) {
  const { t } = useTranslation();
  const [guides, setGuides] = useState<BiosGuide[]>([]);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    void zerotweaks.insights.biosGuides(vendor).then(setGuides);
  }, [vendor]);

  return (
    <BentoCard>
      <BentoCardHeader
        title={t('insights.biosTitle')}
        subtitle={t('insights.biosSubtitle')}
        icon={<Cpu className="w-5 h-5" />}
      />
      <BentoCardContent>
        <div className="space-y-2">
          {guides.map(guide => (
            <div key={guide.id} className="bg-accent/50 rounded-lg border border-border/50">
              <button
                onClick={() => setOpen(open === guide.id ? null : guide.id)}
                className="w-full flex items-center justify-between p-3"
                style={{ textAlign: 'left' }}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{guide.title}</p>
                  <p className="text-[11px] text-muted-foreground">{guide.vendor}</p>
                </div>
                {open === guide.id ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                )}
              </button>
              {open === guide.id && (
                <div className="px-3 pb-3 space-y-2">
                  <ol className="list-decimal list-inside space-y-1">
                    {guide.steps.map((s, i) => (
                      <li key={i} className="text-xs text-muted-foreground">{s}</li>
                    ))}
                  </ol>
                  <div className="p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <p className="text-[11px] text-yellow-400">Riesgo: {guide.risk}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-muted-foreground mb-1">Cómo volver atrás:</p>
                    <ul className="list-disc list-inside">
                      {guide.revert.map((s, i) => (
                        <li key={i} className="text-[11px] text-muted-foreground">{s}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </BentoCardContent>
    </BentoCard>
  );
}

// ---------------------------------------------------------------------------
// 15.11 Smart game mode
// ---------------------------------------------------------------------------
export function SmartGameModeCard() {
  const { t } = useTranslation();
  const { success, error } = useToastActions();
  const [candidates, setCandidates] = useState<PausableCandidate[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [game, setGame] = useState<{ name: string; process: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [list, items, runningGame] = await Promise.all([
        zerotweaks.insights.pausable(),
        zerotweaks.insights.checklist(),
        zerotweaks.insights.detectGame(),
      ]);
      setCandidates(list);
      setChecklist(items);
      setGame(runningGame);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const pause = async (candidate: PausableCandidate) => {
    setBusy(true);
    try {
      const result = await zerotweaks.insights.closeHeavy([candidate.process]);
      if (result.closed.length) {
        const session = await zerotweaks.insights.recordSession([candidate.process], candidate.ramMB, 0);
        success('Proceso pausado', `Se liberaron ${session.freedRamMB} MB.`);
      }
      await refresh();
    } catch (err: any) {
      error('Error', err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <BentoCard>
      <BentoCardHeader
        title={t('insights.gameModeTitle')}
        subtitle={t('insights.gameModeSubtitle')}
        icon={<Zap className="w-5 h-5" />}
        action={
          <button
            onClick={refresh}
            className="px-3 py-1.5 bg-transparent border border-border text-foreground rounded-lg text-sm font-medium hover:bg-accent hover:border-primary/50 transition-colors flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            Actualizar
          </button>
        }
      />
      <BentoCardContent>
        {game ? (
          <div className="mb-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <p className="text-sm text-green-400">Detectado: {game.name}</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground mb-3">
            No se ha detectado ningún juego en marcha. La lista se aprende de las sesiones en las que
            sí lo había.
          </p>
        )}

        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
          {t('insights.checklist')}
        </p>
        <div className="space-y-2 mb-4">
          {checklist.map(item => (
            <div key={item.id} className="flex items-start gap-2 p-3 bg-accent/50 rounded-lg border border-border/50">
              {item.status === 'ok' ? (
                <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
              ) : item.status === 'pendiente' ? (
                <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
              ) : (
                <Monitor className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
          {t('insights.candidates')}
        </p>
        <div className="space-y-2">
          {candidates.length === 0 && (
            <p className="text-sm text-muted-foreground">No hay programas conocidos en marcha.</p>
          )}
          {candidates.map(c => (
            <div key={c.process} className="p-3 bg-accent/50 rounded-lg border border-border/50">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">{c.name}</p>
                <span className="text-[11px] font-mono text-muted-foreground">{Math.round(c.ramMB)} MB</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{c.reason}</p>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => pause(c)}
                  disabled={busy || c.excluded}
                  className="px-2 py-1 text-[11px] bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  Pausar ahora
                </button>
                <button
                  onClick={async () => {
                    const excluded = candidates.filter(x => !x.excluded && x.process !== c.process).map(x => x.process);
                    await zerotweaks.insights.setGameModeExclusions(excluded);
                    await refresh();
                  }}
                  className="px-2 py-1 text-[11px] bg-transparent border border-border text-muted-foreground rounded hover:bg-accent transition-colors"
                >
                  No pausar nunca
                </button>
              </div>
            </div>
          ))}
        </div>
      </BentoCardContent>
    </BentoCard>
  );
}

// ---------------------------------------------------------------------------
// 15.12 Per game profiles
// ---------------------------------------------------------------------------
export function GameProfilesCard() {
  const { t } = useTranslation();
  const [profiles, setProfiles] = useState<GameProfileRecommendation[]>([]);

  useEffect(() => {
    void zerotweaks.insights.gameProfiles().then(setProfiles);
  }, []);

  return (
    <BentoCard>
      <BentoCardHeader
        title={t('insights.profilesTitle')}
        subtitle={t('insights.profilesSubtitle')}
        icon={<Gamepad2 className="w-5 h-5" />}
      />
      <BentoCardContent>
        <div className="space-y-3">
          {profiles.map(profile => (
            <div key={profile.gameId} className="p-3 bg-accent/50 rounded-lg border border-border/50">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">{profile.name}</p>
                {profile.supported ? (
                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">
                    APLICABLE
                  </span>
                ) : (
                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-gray-500/20 text-gray-400">
                    GUÍA
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1 font-mono truncate" title={profile.executable}>{profile.executable}</p>

              <p className="text-xs font-medium text-muted-foreground mt-2">Dentro del juego</p>
              <ul className="list-disc list-inside">
                {profile.inGameSettings.map((s, i) => (
                  <li key={i} className="text-[11px] text-muted-foreground">{s}</li>
                ))}
              </ul>

              <p className="text-xs font-medium text-muted-foreground mt-2">En el sistema</p>
              <ul className="list-disc list-inside">
                {profile.systemTweaks.map((t, i) => (
                  <li key={i} className="text-[11px] text-muted-foreground">
                    {t.name} — {t.why}
                  </li>
                ))}
              </ul>

              <p className="text-[11px] text-primary mt-2">{profile.evidence}</p>
            </div>
          ))}
        </div>
      </BentoCardContent>
    </BentoCard>
  );
}
