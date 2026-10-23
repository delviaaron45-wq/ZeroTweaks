// Diagnosis Page - High-impact first-boot diagnostic
import React, { useEffect, useState, useCallback } from 'react';
import { WatermarkTitle } from '../components/Effects';
import { 
  Activity, AlertTriangle, CheckCircle, XCircle, Wrench, 
  Monitor, MemoryStick, Cpu, Zap, Thermometer, Wifi, 
  HardDrive, Shield, Gamepad2, TrendingUp, Download, 
  RotateCcw, Play, BarChart2, Gauge, Zap as ZapIcon,
  Loader2, ChevronDown, ChevronUp, ExternalLink,
  Check, AlertCircle as AlertCircleIcon
} from 'lucide-react';
import { BentoGrid, BentoCard, BentoCardHeader, BentoCardContent, BentoCardFooter } from '../components/BentoGrid';
import { cn } from '../utils/cn';
import { zerotweaks, type ApplyProfileResult, type GameProfileDefinition } from '../lib/api';
import type { InGameGameConfig, InGameProfile, BeforeAfterComparison } from '../../shared/types/index';
import {
  BiosGuidesCard,
  ComparisonCard,
  CpuCoresCard,
  DisplayInputCard,
  DriverLatencyCard,
  FpsLimiterCard,
  GameProfilesCard,
  HeavySoftwareCard,
  MemoryFilesCard,
  RepairCard,
  SmartGameModeCard,
  StutterCard,
  ThermalCard,
} from './DiagnosisInsights';
import { useToastActions } from '../components/Toast';
import { useHardwareStore } from '../stores/hardwareStore';
import { useTranslation } from 'react-i18next';

type ImpactLevel = 'alto' | 'medio' | 'bajo';
type ProblemCategory = 'display' | 'memory' | 'gpu' | 'power' | 'thermal' | 'network' | 'driver' | 'software' | 'storage' | 'features' | 'bottleneck';

type InsightTabId = 'tirones' | 'hardware' | 'software' | 'reparar' | 'guias';

const INSIGHT_TABS: { id: InsightTabId; labelKey: string }[] = [
  { id: 'tirones', labelKey: 'diagnosis.tabStutter' },
  { id: 'hardware', labelKey: 'diagnosis.tabHardware' },
  { id: 'software', labelKey: 'diagnosis.tabSoftware' },
  { id: 'reparar', labelKey: 'diagnosis.tabRepair' },
  { id: 'guias', labelKey: 'diagnosis.tabGuides' },
];

interface DiagnosisProblem {
  checkId: string;
  title: string;
  description: string;
  impact: 'alto' | 'medio' | 'bajo';
  expected: string;
  category: ProblemCategory;
  fixable: boolean;
  guide?: { step: number; text: string }[];
  fixAction?: string;
  fixParams?: Record<string, unknown>;
  relatedTweaks?: string[];
  evidence?: Record<string, unknown>;
}

interface BottleneckResult {
  limiter: 'CPU' | 'GPU' | 'VRAM' | 'RAM' | 'DISK' | 'NONE';
  explanation: string;
  cpuPerCore: number[];
  cpuAvg: number;
  gpu: number;
  vram: number;
  ram: number;
  disk: number;
  measuredUnderLoad: boolean;
  durationMs: number;
  timestamp: string;
}

interface FineTuneItem {
  tweakId: string;
  name: string;
  description: string;
  impacto: 'alto' | 'medio' | 'bajo';
  evidence: 'measured' | 'debated' | 'placebo';
  enabled: boolean;
}

interface DiagnosisReport {
  id: string;
  timestamp: string;
  score: number;
  problems: DiagnosisProblem[];
  summary: { alto: number; medio: number; bajo: number; total: number };
  bottleneck: BottleneckResult;
  fineTune: FineTuneItem[];
  games: any[];
  scoreBreakdown: { label: string; points: number; max: number }[];
  healthyMessage?: string;
  durationMs: number;
}

interface DiagnosisProgress {
  check: string;
  index: number;
  total: number;
  percent: number;
  state: 'running' | 'done' | 'error';
  message?: string;
}

const CATEGORY_ICONS: Record<ProblemCategory, React.ReactNode> = {
  display: <Monitor className="w-5 h-5" />,
  memory: <MemoryStick className="w-5 h-5" />,
  gpu: <Cpu className="w-5 h-5" />,
  power: <Zap className="w-5 h-5" />,
  thermal: <Thermometer className="w-5 h-5" />,
  network: <Wifi className="w-5 h-5" />,
  driver: <Shield className="w-5 h-5" />,
  software: <Gamepad2 className="w-5 h-5" />,
  storage: <HardDrive className="w-5 h-5" />,
  features: <Shield className="w-5 h-5" />,
  bottleneck: <Gauge className="w-5 h-5" />,
};

const IMPACT_COLORS: Record<'alto' | 'medio' | 'bajo', string> = {
  alto: 'text-red-400 bg-red-500/10 border-red-500/20',
  medio: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  bajo: 'text-gray-400 bg-gray-500/10 border-gray-500/20',
};

const IMPACT_LABELS: Record<'alto' | 'medio' | 'bajo', string> = {
  alto: 'ALTO',
  medio: 'MEDIO',
  bajo: 'BAJO',
};

export function DiagnosisPage() {
  const { t } = useTranslation();
  const hardware = useHardwareStore(state => state.hardware);
  const { success, error, info, warning } = useToastActions();
  
  const [report, setReport] = useState<DiagnosisReport | null>(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{ check: string; index: number; total: number; percent: number; state: 'running' | 'done' | 'error'; message?: string } | null>(null);
  const [expandedProblems, setExpandedProblems] = useState<Set<string>>(new Set());
  const [expandedFineTune, setExpandedFineTune] = useState<Set<string>>(new Set());
  const [showFineTune, setShowFineTune] = useState(false);
  const [abTesting, setAbTesting] = useState(false);
  const [abResult, setAbResult] = useState<BeforeAfterComparison | null>(null);
  const [insightTab, setInsightTab] = useState<InsightTabId>('tirones');

  const applySuggestedFpsCap = async (cap: number) => {
    const game = report?.games.find(g => g.supported);
    if (!game) {
      warning('Sin juego compatible', 'No hay ningún juego con configuración disponible.');
      return;
    }
    try {
      const result = await zerotweaks.diagnosis.setGameFpsCap(game.gameId, cap);
      if (result.ok) {
        success('Límite aplicado', `${cap} FPS escritos en ${game.name}. Copia de seguridad guardada.`);
      } else {
        error('No se pudo aplicar', result.error || 'Error desconocido');
      }
    } catch (err: any) {
      error('Error', err.message);
    }
  };

  const runABTest = async () => {
    setAbTesting(true);
    try {
      const result = await zerotweaks.diagnosis.runABTest();
      setAbResult(result);
      info('Prueba A/B completada', result.summary);
    } catch (err: any) {
      error('Error en la prueba A/B', err.message);
    } finally {
      setAbTesting(false);
    }
  };

  const abRows = abResult
    ? [
        {
          label: '1% lows (FPS)',
          before: abResult.before.p1LowFps === null ? 'No medido' : `${abResult.before.p1LowFps}`,
          after: abResult.after.p1LowFps === null ? 'No medido' : `${abResult.after.p1LowFps}`,
          delta: abResult.deltas.p1Low,
        },
        {
          label: 'Frametime (ms)',
          before: abResult.before.avgFrametimeMs === null ? 'No medido' : `${abResult.before.avgFrametimeMs}`,
          after: abResult.after.avgFrametimeMs === null ? 'No medido' : `${abResult.after.avgFrametimeMs}`,
          delta: abResult.deltas.frametimeMs,
        },
        {
          label: 'Ping bajo carga (ms)',
          before: abResult.before.pingLoadedMs === null ? 'No medido' : `${abResult.before.pingLoadedMs}`,
          after: abResult.after.pingLoadedMs === null ? 'No medido' : `${abResult.after.pingLoadedMs}`,
          delta: abResult.deltas.pingLoadedMs,
        },
        {
          label: 'Temp. GPU (°C)',
          before: abResult.before.gpuTempC === null ? 'No medido' : `${abResult.before.gpuTempC}`,
          after: abResult.after.gpuTempC === null ? 'No medido' : `${abResult.after.gpuTempC}`,
          delta: abResult.deltas.cpuTempC,
        },
        {
          label: 'Arranque (ms)',
          before: abResult.before.bootTimeMs === null ? 'No medido' : `${abResult.before.bootTimeMs}`,
          after: abResult.after.bootTimeMs === null ? 'No medido' : `${abResult.after.bootTimeMs}`,
          delta: abResult.deltas.bootTimeMs,
        },
      ]
    : [];

  const runDiagnosis = useCallback(async () => {
    setRunning(true);
    setProgress({ check: 'Inicializando', index: 0, total: 11, percent: 0, state: 'running', message: 'Preparando diagnóstico...' });
    
    // Subscribe to progress
    const unsubscribe = zerotweaks.diagnosis.onProgress((p: any) => {
      setProgress(p);
    });

    try {
      const result = await zerotweaks.diagnosis.run();
      setReport(result);
      if (result.healthyMessage) {
        info('Diagnóstico completado', result.healthyMessage);
      } else {
        success('Diagnóstico completado', `Encontrados ${result.problems.length} problemas (${result.summary.alto} alto, ${result.summary.medio} medio, ${result.summary.bajo} bajo)`);
      }
    } catch (err: any) {
      error('Error en diagnóstico', err.message);
    } finally {
      setRunning(false);
      setProgress(null);
      unsubscribe();
    }
  }, [success, error, info]);

  const handleFixProblem = async (problemId: string) => {
    try {
      const result = await zerotweaks.diagnosis.fixProblem(problemId);
      if (result.ok) {
        success('Arreglado', 'El problema se ha corregido');
        // Re-run diagnosis to update
        runDiagnosis();
      } else {
        error('Error', result.error || 'No se pudo arreglar');
      }
    } catch (err: any) {
      error('Error', err.message);
    }
  };

  const toggleProblem = (checkId: string) => {
    setExpandedProblems(prev => {
      const next = new Set(prev);
      if (next.has(checkId)) next.delete(checkId);
      else next.add(checkId);
      return next;
    });
  };

  const toggleFineTune = (tweakId: string) => {
    setExpandedFineTune(prev => {
      const next = new Set(prev);
      if (next.has(tweakId)) next.delete(tweakId);
      else next.add(tweakId);
      return next;
    });
  };

  if (!report) {
    if (running || progress) {
      return (
        <div className="space-y-6">
          <BentoCard variant="elevated" className="bg-primary/5 border-primary/10">
            <BentoCardHeader
              title="Ejecutando diagnóstico..."
              subtitle={progress?.message || `Comprobando ${progress?.check || '...'}`}
              icon={<Activity className="w-5 h-5 animate-spin" />}
            />
            <BentoCardContent>
              <div className="h-2 bg-accent rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-sky-400 transition-all duration-300"
                  style={{ width: `${progress?.percent || 0}%` }}
                />
              </div>
              <div className="flex justify-between text-sm text-muted-foreground mt-2">
                <span>{progress?.check}</span>
                <span>{progress?.percent}%</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Comprobación {progress?.index || 0} de {progress?.total || 11} · ~{Math.round(30 * (1 - (progress?.percent || 0) / 100))}s restantes
              </p>
            </BentoCardContent>
          </BentoCard>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Welcome Card */}
        <BentoCard variant="elevated" className="bg-gradient-to-br from-blue-500/5 to-sky-400/5 border-blue-500/10">
          <BentoCardHeader
            title={t('diagnosis.welcomeTitle')}
            subtitle={t('diagnosis.welcomeSubtitle')}
            icon={<Activity className="w-5 h-5" />}
          />
          <BentoCardContent>
            <div className="space-y-4">
              <p className="text-muted-foreground">
                {t('diagnosis.welcomeBody')}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <CheckItem icon={<Monitor />} title="Tasa de refresco" desc="¿Está el monitor en su Hz máximo?" impact="alto" />
                <CheckItem icon={<MemoryStick />} title="RAM XMP/EXPO" desc="Velocidad real vs nominal + dual channel" impact="alto" />
                <CheckItem icon={<Cpu />} title="GPU dedicada en portátiles" desc="Forzar gráfica de alto rendimiento" impact="alto" />
                <CheckItem icon={<Zap />} title="Plan de energía" desc="Ultimate/Alto rendimiento vs ahorro" impact="medio" />
                <CheckItem icon={<Thermometer />} title="Throttling térmico" desc="Temperaturas >85°C = pérdida de FPS" impact="alto" />
                <CheckItem icon={<Wifi />} title="Red y adaptador" desc="Wi-Fi vs cable, banda, ahorro de energía" impact="medio" />
                <CheckItem icon={<Shield />} title="Drivers y overlays" desc="GPU driver, Discord, Game Bar, etc." impact="medio" />
                <CheckItem icon={<HardDrive />} title="Disco y espacio" desc="SSD vs HDD, espacio libre, salud" impact="medio" />
                <CheckItem icon={<Gauge />} title={t('diagnosis.bottleneck')} desc="CPU/GPU/VRAM/RAM/DISCO bajo carga" impact="alto" />
              </div>
              <div className="pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground mb-3">{t('diagnosis.fineTuneNote')}</p>
              </div>
            </div>
          </BentoCardContent>
          <BentoCardFooter>
            <button
              onClick={runDiagnosis}
              disabled={running}
              className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-lg"
            >
              <Activity className="w-6 h-6" />
              {running ? t('diagnosis.running') : t('diagnosis.run')}
            </button>
          </BentoCardFooter>
        </BentoCard>
      </div>
    );
  }

  // Report view
  return (
    <div className="space-y-6">
      {/* Header with score and re-run button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-space text-4xl md:text-5xl font-bold text-foreground tracking-tight">
            <WatermarkTitle watermark="DIAG">{t('diagnosis.title')}</WatermarkTitle>
          </h1>
          <p className="text-muted-foreground mt-1">
            {report?.healthyMessage 
              ? 'Tu equipo está bien configurado. Los tweaks restantes tienen un efecto pequeño.' 
              : `${report?.problems.length || 0} problemas encontrados · Puntuación: ${report?.score}/100`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <BentoCard className="p-3 bg-gradient-to-r from-blue-500/10 to-sky-400/10 border-blue-500/20">
            <div className="flex items-center gap-2">
              <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', report && report.score >= 80 ? 'bg-green-500/20 text-green-400' : report && report.score >= 50 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400')}>
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <p className="font-space text-2xl font-bold text-foreground">{report?.score || 0}</p>
                <p className="text-xs text-muted-foreground">{t('diagnosis.score')}</p>
              </div>
            </div>
          </BentoCard>
          <button
            onClick={runDiagnosis}
            disabled={running}
            className="px-4 py-2 bg-transparent border border-border text-foreground rounded-lg font-medium hover:bg-accent hover:border-primary/50 transition-colors flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Volver a diagnosticar
          </button>
        </div>
        </div>

        {/* Score Breakdown */}

        <BentoCard>
          <BentoCardHeader
            title={t('diagnosis.breakdown')}
            subtitle={t('diagnosis.breakdownSubtitle')}
            icon={<BarChart2 className="w-5 h-5" />}
          />
          <BentoCardContent>
            <div className="space-y-2">
              {report?.scoreBreakdown.map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2 px-3 bg-accent/50 rounded-lg">
                  <span className="text-sm text-foreground">{item.label}</span>
                  <span className={cn('font-mono font-medium', item.points >= 0 ? 'text-green-400' : 'text-red-400')}>
                    {item.points >= 0 ? '+' : ''}{item.points} / {item.max}
                  </span>
                </div>
              ))}
            </div>
          </BentoCardContent>
        </BentoCard>

        {/* Problems Found */}
        <div className="space-y-4">
          <h2 className="font-space text-xl font-semibold text-foreground flex items-center gap-2">
            <AlertTriangle className={cn('w-5 h-5', report && report.problems.length > 0 ? 'text-red-400' : 'text-green-400')} />
            {t('diagnosis.problems')} ({report?.problems.length || 0})
            <span className="text-sm text-muted-foreground font-normal">
              {report?.summary.alto} ALTO · {report?.summary.medio} MEDIO · {report?.summary.bajo} BAJO
            </span>
          </h2>

          {report?.problems.length === 0 ? (
            <BentoCard variant="outlined" className="text-center py-12 bg-green-500/5 border-green-500/10">
              <CheckCircle className="w-16 h-16 mx-auto text-green-400 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">¡Todo correcto!</h3>
              <p className="text-muted-foreground">
                Tu equipo está bien configurado. Los tweaks restantes tienen un efecto pequeño.
              </p>
            </BentoCard>
          ) : (
            <div className="space-y-3">
              {report?.problems.map(problem => (
                <ProblemCard
                  key={problem.checkId}
                  problem={problem}
                  expanded={expandedProblems.has(problem.checkId)}
                  onToggle={() => toggleProblem(problem.checkId)}
                  onFix={() => handleFixProblem(problem.checkId)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Bottleneck Card */}
        <BentoCard variant={report?.bottleneck.limiter !== 'NONE' ? 'elevated' : 'outlined'} className={cn(report?.bottleneck.limiter !== 'NONE' ? 'bg-red-500/5 border-red-500/10' : '')}>
          <BentoCardHeader
            title="Cuello de botella"
            subtitle={report?.bottleneck.limiter !== 'NONE' ? `Limitador: ${report.bottleneck.limiter}` : 'Sin cuello de botella claro en la medición'}
            icon={<Gauge className="w-5 h-5" />}
          />
          <BentoCardContent>
            {report?.bottleneck.limiter !== 'NONE' ? (
              <div className="space-y-4">
                <p className="text-foreground">{report.bottleneck.explanation}</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <MetricBox label="CPU (promedio)" value={`${report.bottleneck.cpuAvg.toFixed(1)}%`} icon={<Cpu />} color={report.bottleneck.cpuAvg > 85 ? 'red' : report.bottleneck.cpuAvg > 60 ? 'yellow' : 'green'} />
                  <MetricBox label="GPU" value={`${report.bottleneck.gpu.toFixed(1)}%`} icon={<Cpu />} color={report.bottleneck.gpu > 90 ? 'red' : report.bottleneck.gpu > 70 ? 'yellow' : 'green'} />
                  <MetricBox label="RAM" value={`${report.bottleneck.ram.toFixed(1)}%`} icon={<MemoryStick />} color={report.bottleneck.ram > 90 ? 'red' : report.bottleneck.ram > 75 ? 'yellow' : 'green'} />
                  <MetricBox label="Disco" value={`${report.bottleneck.disk.toFixed(1)}%`} icon={<HardDrive />} color="green" />
                </div>
                {report.bottleneck.cpuPerCore.length > 0 && (
                  <div>
                    <h4 className="font-medium text-foreground mb-2">Uso por núcleo</h4>
                    <div className="flex gap-1 overflow-x-auto pb-2">
                      {report.bottleneck.cpuPerCore.map((usage, i) => (
                        <div key={i} className="flex flex-col items-center min-w-[36px]">
                          <div className="w-8 h-8 rounded-lg bg-accent flex items-end" style={{ height: `${usage}%` }}>
                            <div className="w-full bg-gradient-to-t from-blue-500 to-sky-400 rounded-t" style={{ height: `${usage}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground mt-1">{i}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Gauge className="w-16 h-16 mx-auto text-green-400/50 mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">Sin cuello de botella claro</h3>
                <p className="text-muted-foreground">En la prueba de carga no se detectó un recurso que limite claramente el rendimiento.</p>
              </div>
            )}
          </BentoCardContent>
        </BentoCard>

        {/* Fine-tune Card */}
        <BentoCard>
          <BentoCardHeader
            title={t('diagnosis.fineTune')}
            subtitle={`${report?.fineTune.length || 0} tweaks desactivados por defecto — evidencia POCO IMPACTO`}
            icon={<Wrench className="w-5 h-5" />}
            action={
              <button
                onClick={() => setShowFineTune(!showFineTune)}
                className="px-3 py-1.5 bg-transparent border border-border text-foreground rounded-lg text-sm font-medium hover:bg-accent hover:border-primary/50 transition-colors flex items-center gap-1"
              >
                {showFineTune ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {showFineTune ? 'Ocultar' : 'Mostrar'}
              </button>
            }
          />
          {showFineTune && (
            <BentoCardContent>
              <div className="space-y-2">
                {report?.fineTune.map(item => (
                  <FineTuneItemCard
                    key={item.tweakId}
                    item={item}
                    expanded={expandedFineTune.has(item.tweakId)}
                    onToggle={() => toggleFineTune(item.tweakId)}
                  />
                ))}
              </div>
            </BentoCardContent>
          )}
        </BentoCard>

        {/* A/B Test Card */}
        <BentoCard>
          <BentoCardHeader
            title={t('diagnosis.abTitle')}
            subtitle={t('diagnosis.abSubtitle')}
            icon={<BarChart2 className="w-5 h-5" />}
          />
          <BentoCardContent>
            <p className="text-muted-foreground mb-4">
              La línea base se capturó al empezar el diagnóstico. Arregla un problema, vuelve a
              diagnosticar y ejecuta la prueba para comparar el antes y el después con el mismo
              escenario (3 repeticiones).
            </p>
            <div className="flex gap-3 mb-4">
              <button
                onClick={runABTest}
                disabled={abTesting}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <Play className="w-4 h-4" />
                {abTesting ? 'Midiendo...' : 'Ejecutar prueba A/B'}
              </button>
            </div>

            {abResult && (
              <div className="space-y-3">
                <div
                  className={cn(
                    'p-3 rounded-lg border text-sm',
                    abResult.verdict === 'mejora'
                      ? 'bg-green-500/10 border-green-500/20 text-green-400'
                      : abResult.verdict === 'empeora'
                        ? 'bg-red-500/10 border-red-500/20 text-red-400'
                        : 'bg-accent/50 border-border text-muted-foreground'
                  )}
                >
                  {abResult.summary}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-muted-foreground">
                        <th className="p-2">Métrica</th>
                        <th className="p-2">Antes</th>
                        <th className="p-2">Después</th>
                        <th className="p-2">Diferencia</th>
                      </tr>
                    </thead>
                    <tbody className="font-mono text-xs">
                      {abRows.map(row => (
                        <tr key={row.label} className="border-b border-border/40">
                          <td className="p-2 font-sans text-foreground">{row.label}</td>
                          <td className="p-2 text-muted-foreground">{row.before}</td>
                          <td className="p-2 text-muted-foreground">{row.after}</td>
                          <td
                            className={cn(
                              'p-2',
                              row.delta === null
                                ? 'text-muted-foreground'
                                : row.delta < 0
                                  ? 'text-green-400'
                                  : row.delta > 0
                                    ? 'text-red-400'
                                    : 'text-muted-foreground'
                            )}
                          >
                            {row.delta === null ? 'No medido' : `${row.delta > 0 ? '+' : ''}${row.delta}`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {abResult.after.unavailable.length > 0 && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                    <p className="text-xs text-amber-400 font-medium mb-1">No se pudo medir:</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      {abResult.after.unavailable.map((u, i) => (
                        <li key={i} className="text-[11px] text-amber-300">{u}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </BentoCardContent>
        </BentoCard>

        {/* In-Game Settings (if supported games) */}
        {report?.games.length > 0 && (
          <BentoCard>
            <BentoCardHeader
              title={t('diagnosis.inGame')}
              subtitle={t('diagnosis.inGameSubtitle')}
              icon={<Gamepad2 className="w-5 h-5" />}
            />
            <BentoCardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {report.games.filter(g => g.supported).map(game => (
                  <InGameProfileCard key={game.gameId} game={game} />
                ))}
              </div>
            </BentoCardContent>
          </BentoCard>
        )}

        {/* High impact insights (section 15) */}
        <div className="space-y-4">
          <div>
            <h2 className="font-space text-xl font-semibold text-foreground mb-1">
              {t('diagnosis.advancedTitle')}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t('diagnosis.advancedSubtitle')}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {INSIGHT_TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setInsightTab(tab.id)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border',
                  insightTab === tab.id
                    ? 'bg-primary/20 border-primary/50 text-primary'
                    : 'bg-transparent border-border text-muted-foreground hover:bg-accent hover:border-primary/40'
                )}
              >
                {t(tab.labelKey)}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {insightTab === 'tirones' && (
              <>
                <StutterCard />
                <DriverLatencyCard />
                <FpsLimiterCard onApplyCap={applySuggestedFpsCap} />
              </>
            )}
            {insightTab === 'hardware' && (
              <>
                <CpuCoresCard />
                <DisplayInputCard />
                <MemoryFilesCard />
                <ThermalCard />
              </>
            )}
            {insightTab === 'software' && (
              <>
                <HeavySoftwareCard />
                <SmartGameModeCard />
                <ComparisonCard />
              </>
            )}
            {insightTab === 'reparar' && <RepairCard />}
            {insightTab === 'guias' && (
              <>
                <BiosGuidesCard vendor={hardware?.cpu.vendor} />
                <GameProfilesCard />
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

// Helper Components
function CheckItem({ icon, title, desc, impact }: { icon: React.ReactNode; title: string; desc: string; impact: 'alto' | 'medio' | 'bajo' }) {
  return (
    <div className="p-3 bg-accent/50 rounded-lg border border-border/50">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">{icon}</div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-foreground">{title}</h4>
            <span className={cn('px-1.5 py-0.5 rounded text-xs font-medium', IMPACT_COLORS[impact])}>
              {IMPACT_LABELS[impact]}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{desc}</p>
        </div>
      </div>
    </div>
  );
}

function ProblemCard({ 
  problem, 
  expanded, 
  onToggle, 
  onFix 
}: { 
  problem: DiagnosisProblem; 
  expanded: boolean; 
  onToggle: () => void; 
  onFix: () => void; 
}) {
  const categoryLabel = problem.category.charAt(0).toUpperCase() + problem.category.slice(1).replace('_', ' ');
  
  return (
    <BentoCard variant={expanded ? 'elevated' : 'outlined'} className={cn('overflow-hidden', expanded && 'ring-2 ring-primary/50')}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4"
        style={{ textAlign: 'left' }}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', IMPACT_COLORS[problem.impact])}>
            {CATEGORY_ICONS[problem.category]}
          </div>
          <div className="min-w-0">
            <h3 className="font-medium text-foreground">{problem.title}</h3>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              <span className={cn('px-1.5 py-0.5 rounded', IMPACT_COLORS[problem.impact])}>
                {IMPACT_LABELS[problem.impact]}
              </span>
              <span>•</span>
              <span className="capitalize">{problem.category}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {problem.fixable && (
            <button
              onClick={onFix}
              className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-1"
            >
              <Wrench className="w-3 h-3" />
              Arreglar
            </button>
          )}
          <button
            onClick={onToggle}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
            aria-label={expanded ? 'Ocultar detalles' : 'Ver detalles'}
          >
            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-border animate-fade-in">
          <p className="text-sm text-muted-foreground mb-4">{problem.description}</p>
          
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded">Impacto esperado: {problem.expected}</span>
            {problem.evidence && Object.keys(problem.evidence).length > 0 && (
              <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-xs rounded">
                Evidencia: {JSON.stringify(problem.evidence)}
              </span>
            )}
          </div>

          {problem.guide && problem.guide.length > 0 && (
            <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <h4 className="font-medium text-amber-400 mb-2 flex items-center gap-1">
                <AlertCircleIcon className="w-4 h-4" /> Guía paso a paso (requiere acción manual)
              </h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-amber-300">
                {problem.guide.map(s => (
                  <li key={s.step}>{s.text}</li>
                ))}
              </ol>
            </div>
          )}

          {problem.fixable && problem.fixAction && (
            <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
              <p className="text-xs text-primary/80 mb-2">Acción automática disponible: <code className="font-mono">{problem.fixAction}</code></p>
              <button
                onClick={onFix}
                className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
              >
                <Wrench className="w-4 h-4" />
                Ejecutar arreglo automático
              </button>
            </div>
          )}

          {problem.relatedTweaks && problem.relatedTweaks.length > 0 && (
            <div className="mt-4">
              <h4 className="font-medium text-foreground mb-2">Tweaks relacionados</h4>
              <div className="flex flex-wrap gap-2">
                {problem.relatedTweaks.map(id => (
                  <span key={id} className="px-2 py-0.5 bg-accent/50 text-muted-foreground text-xs rounded font-mono">{id}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </BentoCard>
  );
}

function MetricBox({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: 'red' | 'yellow' | 'green' }) {
  const colorMap = {
    red: 'text-red-400 bg-red-500/10 border-red-500/20',
    yellow: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
    green: 'text-green-400 bg-green-500/10 border-green-500/20',
  };
  return (
    <div className={cn('p-3 rounded-lg text-center', colorMap[color])}>
      <div className="text-muted-foreground mb-1">{icon}</div>
      <div className="font-space text-xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function FineTuneItemCard({ 
  item, 
  expanded, 
  onToggle 
}: { 
  item: FineTuneItem; 
  expanded: boolean; 
  onToggle: () => void; 
}) {
  return (
    <div className="p-3 bg-accent/50 rounded-lg border border-border/50">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between"
        style={{ textAlign: 'left' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gray-500/20 flex items-center justify-center text-gray-400">
            <Wrench className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-medium text-foreground">{item.name}</h4>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="px-1.5 py-0.5 rounded bg-gray-500/20 text-gray-400">POCO IMPACTO</span>
              <span>•</span>
              <span className="capitalize">{item.evidence}</span>
            </div>
          </div>
        </div>
        <ChevronDown className={cn('w-4 h-4 transition-transform', expanded && 'rotate-180')} />
      </button>
      {expanded && (
        <div className="mt-3 pt-3 border-t border-border animate-fade-in">
          <p className="text-sm text-muted-foreground mb-3">{item.description}</p>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 rounded border-border text-primary focus:ring-primary" />
            <span className="text-sm text-foreground">Activar este tweak</span>
          </label>
        </div>
      )}
    </div>
  );
}

function InGameProfileCard({ game }: { game: InGameGameConfig }) {
  const { success, error, info } = useToastActions();
  const [profiles, setProfiles] = useState<GameProfileDefinition[]>([]);
  const [selected, setSelected] = useState<InGameProfile | null>(null);
  const [busy, setBusy] = useState(false);
  const [configExists, setConfigExists] = useState<boolean | null>(null);
  const [changedKeys, setChangedKeys] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    void zerotweaks.diagnosis.getGameProfiles().then(list => {
      if (!cancelled) setProfiles(list);
    });
    void zerotweaks.diagnosis.getGameConfig(game.gameId).then(cfg => {
      if (!cancelled) setConfigExists(cfg.exists);
    });
    return () => {
      cancelled = true;
    };
  }, [game.gameId]);

  const applyProfile = async () => {
    if (!selected) {
      error('Selecciona un perfil', 'Elige primero el perfil que quieres aplicar.');
      return;
    }
    setBusy(true);
    try {
      const result = await zerotweaks.diagnosis.applyGameProfile(game.gameId, selected);
      if (result.ok) {
        setChangedKeys(result.changedKeys);
        success(
          'Perfil aplicado',
          `${result.changedKeys.length} ajustes modificados en ${game.name}. Copia de seguridad guardada.`
        );
      } else {
        error('No se pudo aplicar', result.error || 'Error desconocido');
      }
    } catch (err: any) {
      error('Error', err.message);
    } finally {
      setBusy(false);
    }
  };

  const revertProfile = async () => {
    setBusy(true);
    try {
      const result = await zerotweaks.diagnosis.revertGameProfile(game.gameId);
      if (result.ok) {
        setChangedKeys([]);
        success('Ajustes revertidos', `Se restauró la configuración original de ${game.name}.`);
      } else {
        error('No se pudo revertir', result.error || 'No hay copia de seguridad');
      }
    } catch (err: any) {
      error('Error', err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <BentoCard hover>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500/20 to-red-500/20 flex items-center justify-center">
          <Gamepad2 className="w-5 h-5 text-orange-400" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">{game.name}</h3>
          <p className="text-xs text-muted-foreground font-mono">{game.executable}</p>
        </div>
      </div>

      <p className="text-sm text-muted-foreground mb-1">
        Archivo: <code className="font-mono text-xs bg-accent px-1 rounded break-all">{game.configPath}</code>
      </p>
      <p className="text-xs text-muted-foreground mb-4">
        {configExists === null
          ? 'Comprobando configuración...'
          : configExists
            ? 'Configuración encontrada. Se guardará una copia antes de modificarla.'
            : 'No se encontró el archivo de configuración: se creará al aplicar un perfil.'}
      </p>

      <div className="grid grid-cols-3 gap-2 mb-3">
        {profiles.map(p => (
          <button
            key={p.id}
            onClick={() => {
              setSelected(p.id);
              info(p.name, p.description);
            }}
            className={cn(
              'px-3 py-2 border rounded-lg text-sm font-medium transition-colors',
              selected === p.id
                ? 'bg-primary/20 border-primary/50 text-primary'
                : 'bg-accent/50 border-border text-foreground hover:border-primary/50 hover:bg-accent'
            )}
            title={p.description}
          >
            {p.name}
          </button>
        ))}
      </div>

      {selected && (
        <p className="text-xs text-muted-foreground mb-3">
          {profiles.find(p => p.id === selected)?.notes}
        </p>
      )}

      {changedKeys.length > 0 && (
        <div className="mb-3 p-2 bg-accent/40 rounded-lg max-h-24 overflow-y-auto">
          {changedKeys.map((k, i) => (
            <p key={i} className="text-[11px] text-muted-foreground font-mono truncate" title={k}>{k}</p>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={applyProfile}
          disabled={busy}
          className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-1 disabled:opacity-50"
        >
          <Download className="w-3 h-3" />
          Aplicar perfil
        </button>
        <button
          onClick={revertProfile}
          disabled={busy}
          className="px-3 py-1.5 bg-transparent border border-border text-foreground rounded-lg text-sm font-medium hover:bg-accent hover:border-primary/50 transition-colors flex items-center gap-1 disabled:opacity-50"
        >
          <RotateCcw className="w-3 h-3" />
          Revertir
        </button>
      </div>
    </BentoCard>
  );
}