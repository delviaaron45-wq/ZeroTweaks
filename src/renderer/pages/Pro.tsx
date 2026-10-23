// PRO module - exclusive tools.
//
// 1. Click latency tester
// 2. BIOS / board diagnostics
// 3. DirectX & shader cache cleaner
// 4. Battery saver / silent mode
// 5. Profile export, import and cloud sync
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Activity,
  Battery,
  Cloud,
  DownloadCloud,
  UploadCloud,
  Cpu,
  Download,
  Gauge,
  HardDrive,
  RefreshCw,
  Save,
  Shield,
  Sparkles,
  Trash2,
  Upload,
  Zap,
} from 'lucide-react';
import { BentoCard, BentoCardContent, BentoCardHeader } from '../components/BentoGrid';
import { cn } from '../utils/cn';
import { zerotweaks } from '../lib/api';
import { useToastActions } from '../components/Toast';
import { WatermarkTitle } from '../components/Effects';
import type {
  BatteryStatus,
  BiosDiagnostics,
  ClickLatencyReport,
  PowerProfileKind,
  ProfileBundle,
  ShaderCacheReport,
  SyncConfig,
} from '../../shared/types/pro';
import type { BiosGuide } from '../../shared/types/insights';

type ProTab = 'latencia' | 'bios' | 'cache' | 'bateria' | 'sync';

const TABS: { id: ProTab; label: string; icon: React.ElementType }[] = [
  { id: 'latencia', label: 'Latencia de clic', icon: Gauge },
  { id: 'bios', label: 'BIOS y placa', icon: Cpu },
  { id: 'cache', label: 'Caché de shaders', icon: HardDrive },
  { id: 'bateria', label: 'Ahorro y silencio', icon: Battery },
  { id: 'sync', label: 'Perfiles y nube', icon: Cloud },
];

export function ProPage() {
  const [tab, setTab] = useState<ProTab>('latencia');

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="font-space text-4xl md:text-5xl font-bold text-foreground tracking-tight">
            <WatermarkTitle watermark="PRO">Funciones PRO</WatermarkTitle>
          </h1>
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-accent-pink/20 text-accent-pink">
            NIVEL PRO
          </span>
        </div>
        <p className="text-muted-foreground mt-1">
          Herramientas de medición y mantenimiento que miden el sistema real antes de tocar nada.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map(entry => {
          const Icon = entry.icon;
          return (
            <button
              key={entry.id}
              onClick={() => setTab(entry.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border',
                tab === entry.id
                  ? 'bg-primary/20 border-primary/50 text-primary'
                  : 'bg-transparent border-border text-muted-foreground hover:bg-accent hover:border-primary/40'
              )}
            >
              <Icon className="w-4 h-4" />
              {entry.label}
            </button>
          );
        })}
      </div>

      {tab === 'latencia' && <ClickLatencyCard />}
      {tab === 'bios' && <BiosCard />}
      {tab === 'cache' && <ShaderCacheCard />}
      {tab === 'bateria' && <BatteryCard />}
      {tab === 'sync' && <SyncCard />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 1. Click latency tester
// ---------------------------------------------------------------------------
function ClickLatencyCard() {
  const { success, info, error } = useToastActions();
  const [samples, setSamples] = useState<{ ui: number; rt: number }[]>([]);
  const [previous, setPrevious] = useState<ClickLatencyReport | null>(null);
  const [running, setRunning] = useState(false);
  const pending = useRef<{ sentAt: number; paintedAt: number } | null>(null);

  const measure = useCallback(async () => {
    const sentAt = performance.now();
    const started = Date.now();
    const { t } = await zerotweaks.pro.latencyPing();
    const roundTrip = Date.now() - started;

    // Wait for the next painted frame: that is the real UI latency.
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    const paintedAt = performance.now();
    pending.current = { sentAt, paintedAt };

    setSamples(prev => [...prev, { ui: paintedAt - sentAt, rt: roundTrip }]);
  }, []);

  const finish = () => {
    const report = summarise(samples);
    if (report) {
      setPrevious(report);
      success('Medición terminada', `${report.count} clics · ${report.uiAvgMs.toFixed(1)} ms de media`);
    }
    setRunning(false);
  };

  useEffect(() => {
    if (!running) return;
    const handler = () => measure();
    window.addEventListener('pointerdown', handler, { once: true });
    return () => window.removeEventListener('pointerdown', handler);
  }, [running, measure]);

  const report = summarise(samples);
  const diff = report && previous ? report.uiAvgMs - previous.uiAvgMs : null;

  return (
    <BentoCard>
      <BentoCardHeader
        title="Medidor de latencia de clic"
        subtitle="Mide el tiempo entre el clic y el siguiente fotograma dibujado, y el viaje completo hasta el proceso principal"
        icon={<Gauge className="w-5 h-5" />}
        action={
          <button
            onClick={() => {
              setSamples([]);
              setRunning(true);
              info('Haz clic', 'Haz clic en cualquier sitio para tomar la primera muestra.');
            }}
            className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-1"
          >
            {running ? 'Esperando clic...' : 'Empezar a medir'}
          </button>
        }
      />
      <BentoCardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Pulsa «Empezar a medir» y haz entre 10 y 30 clics en cualquier parte de la interfaz. Se
          registra el tiempo hasta que la pantalla responde y el viaje completo hasta el proceso
          principal.
        </p>

        {report && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <Stat label="Muestras" value={`${report.count}`} />
            <Stat label="UI media" value={`${report.uiAvgMs.toFixed(2)} ms`} />
            <Stat label="UI p95" value={`${report.uiP95Ms.toFixed(2)} ms`} />
            <Stat label="Round trip medio" value={`${report.roundTripAvgMs.toFixed(2)} ms`} />
          </div>
        )}

        {diff !== null && previous && (
          <div
            className={cn(
              'p-3 rounded-lg border text-sm mb-4',
              diff < -0.5
                ? 'bg-green-500/10 border-green-500/20 text-green-400'
                : diff > 0.5
                  ? 'bg-red-500/10 border-red-500/20 text-red-400'
                  : 'bg-accent/50 border-border text-muted-foreground'
            )}
          >
            {diff < -0.5
              ? `Mejora de ${Math.abs(diff).toFixed(2)} ms respecto a la medición anterior.`
              : diff > 0.5
                ? `Empeora de ${diff.toFixed(2)} ms respecto a la medición anterior.`
                : 'Sin diferencia medible respecto a la medición anterior.'}
            <span className="text-xs opacity-80"> (anterior: {previous.uiAvgMs.toFixed(2)} ms)</span>
          </div>
        )}

        {report && (
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer hover:text-foreground">
              Qué mide y qué no mide
            </summary>
            <ul className="list-disc list-inside mt-2 space-y-1">
              {report.notes.map((note, i) => (
                <li key={i}>{note}</li>
              ))}
            </ul>
          </details>
        )}
      </BentoCardContent>
    </BentoCard>
  );
}

function summarise(samples: { ui: number; rt: number }[]): ClickLatencyReport | null {
  if (samples.length === 0) return null;
  const ui = samples.map(s => s.ui).sort((a, b) => a - b);
  const rt = samples.map(s => s.rt).sort((a, b) => a - b);
  const avg = (list: number[]) => list.reduce((a, b) => a + b, 0) / list.length;
  const p95 = (list: number[]) => list[Math.min(list.length - 1, Math.floor(list.length * 0.95))];

  return {
    samples: samples.map((s, i) => ({ index: i + 1, uiLatencyMs: s.ui, roundTripMs: s.rt })),
    count: samples.length,
    uiMinMs: ui[0],
    uiAvgMs: avg(ui),
    uiP95Ms: p95(ui),
    uiMaxMs: ui[ui.length - 1],
    roundTripMinMs: rt[0],
    roundTripAvgMs: avg(rt),
    roundTripP95Ms: p95(rt),
    createdAt: new Date().toISOString(),
    notes: [
      'La latencia de UI es el tiempo entre el evento de entrada y el siguiente fotograma dibujado: es lo que notas como respuesta.',
      'El viaje completo incluye el IPC hasta el proceso principal: mide el coste de la comunicación, no el del sistema entero.',
      'No mide la latencia de la GPU ni la del juego: para eso está el análisis de tirones del módulo de diagnóstico.',
      'Haz la medición en reposo y con el equipo quieto: una descarga de fondo o un antivirus alteran los datos.',
    ],
  };
}

// ---------------------------------------------------------------------------
// 2. BIOS diagnostics
// ---------------------------------------------------------------------------
function BiosCard() {
  const { info } = useToastActions();
  const [data, setData] = useState<BiosDiagnostics | null>(null);
  const [guides, setGuides] = useState<BiosGuide[]>([]);
  const [openGuide, setOpenGuide] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const analyse = useCallback(async () => {
    setLoading(true);
    try {
      setData(await zerotweaks.pro.bios());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void analyse();
    void zerotweaks.insights.biosGuides().then(setGuides);
  }, [analyse]);

  return (
    <div className="space-y-4">
      <BentoCard>
        <BentoCardHeader
          title="Diagnóstico de BIOS y placa base"
          subtitle="Detecta si el perfil de memoria está activo, si Resizable BAR está habilitado y el estado de la virtualización"
          icon={<Cpu className="w-5 h-5" />}
          action={
            <button
              onClick={analyse}
              disabled={loading}
              className="px-3 py-1.5 bg-transparent border border-border text-foreground rounded-lg text-sm font-medium hover:bg-accent hover:border-primary/50 transition-colors flex items-center gap-1 disabled:opacity-50"
            >
              <RefreshCw className={cn('w-3 h-3', loading && 'animate-spin')} />
              Volver a analizar
            </button>
          }
        />
        <BentoCardContent>
          {!data && <p className="text-sm text-muted-foreground">Analizando el sistema...</p>}
          {data && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Stat label="Placa" value={data.boardVendor} hint={data.boardModel} />
                <Stat label="CPU" value={data.cpuModel.split('(')[0].trim()} hint={`${data.memory.dimms} módulos · ${data.memory.channels} canal(es)`} />
                <Stat label="Memoria" value={`${data.memory.configuredMHz} MHz`} hint={`SPD ${data.memory.spdMHz} MHz`} />
                <Stat
                  label="Resizable BAR"
                  value={
                    data.resizableBar.enabled === null
                      ? 'No verificable'
                      : data.resizableBar.enabled
                        ? 'Activo'
                        : 'Desactivado'
                  }
                  hint={data.resizableBar.confidence}
                />
              </div>

              {data.findings.length === 0 && (
                <p className="text-sm text-green-400">
                  No se ha encontrado nada que ajustar en la configuración de la placa.
                </p>
              )}

              <div className="space-y-2">
                {data.findings.map(finding => (
                  <div key={finding.id} className="p-3 bg-accent/50 rounded-lg border border-border/50">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">{finding.title}</p>
                      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        {finding.confidence}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{finding.detail}</p>
                    <ul className="list-disc list-inside mt-2">
                      {finding.evidence.map((item, i) => (
                        <li key={i} className="text-[11px] text-muted-foreground font-mono">
                          {item}
                        </li>
                      ))}
                    </ul>
                    {finding.guideId && (
                      <button
                        onClick={() => setOpenGuide(finding.guideId!)}
                        className="mt-2 text-[11px] text-primary hover:underline"
                      >
                        Ver la guía paso a paso →
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer hover:text-foreground">Limitaciones de la detección</summary>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  {data.notes.map((note, i) => (
                    <li key={i}>{note}</li>
                  ))}
                </ul>
              </details>
            </div>
          )}
        </BentoCardContent>
      </BentoCard>

      <BentoCard>
        <BentoCardHeader
          title="Guía interactiva de BIOS"
          subtitle="XMP/EXPO, Resizable BAR, SVM/VT-x y C-States por fabricante"
          icon={<Shield className="w-5 h-5" />}
        />
        <BentoCardContent>
          <div className="space-y-2">
            {guides.map(guide => (
              <div key={guide.id} className="bg-accent/50 rounded-lg border border-border/50">
                <button
                  onClick={() => setOpenGuide(openGuide === guide.id ? null : guide.id)}
                  className="w-full flex items-center justify-between p-3"
                  style={{ textAlign: 'left' }}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{guide.title}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {guide.vendor} · {TOPIC_LABELS[guide.topic] ?? guide.topic}
                    </p>
                  </div>
                  <span className="text-[11px] text-primary flex-shrink-0 ml-2">
                    {openGuide === guide.id ? 'Cerrar' : 'Abrir'}
                  </span>
                </button>
                {openGuide === guide.id && (
                  <div className="px-3 pb-3 space-y-2">
                    <ol className="list-decimal list-inside space-y-1">
                      {guide.steps.map((step, i) => (
                        <li key={i} className="text-xs text-muted-foreground">{step}</li>
                      ))}
                    </ol>
                    <div className="p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                      <p className="text-[11px] text-yellow-400">Riesgo: {guide.risk}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-muted-foreground mb-1">Cómo volver atrás:</p>
                      <ul className="list-disc list-inside">
                        {guide.revert.map((step, i) => (
                          <li key={i} className="text-[11px] text-muted-foreground">{step}</li>
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
    </div>
  );
}

const TOPIC_LABELS: Record<string, string> = {
  xmp_expo: 'Memoria XMP/EXPO',
  resizable_bar: 'Resizable BAR',
  memory: 'Configuración de memoria',
  virtualization: 'Virtualización SVM/VT-x',
  c_states: 'C-States',
  other: 'Otros ajustes',
};

// ---------------------------------------------------------------------------
// 3. Shader cache cleaner
// ---------------------------------------------------------------------------
function ShaderCacheCard() {
  const { success, error, warning } = useToastActions();
  const [report, setReport] = useState<ShaderCacheReport | null>(null);
  const [users, setUsers] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const scan = useCallback(async () => {
    const [cacheReport, cacheUsers] = await Promise.all([
      zerotweaks.pro.scanCaches(),
      zerotweaks.pro.cacheUsers(),
    ]);
    setReport(cacheReport);
    setUsers(cacheUsers);
  }, []);

  useEffect(() => {
    void scan();
  }, [scan]);

  const clean = async () => {
    if (users.length > 0) {
      warning('Hay juegos en marcha', `Cierra ${users.join(', ')} antes de limpiar la caché.`);
      return;
    }
    setBusy(true);
    try {
      const result = await zerotweaks.pro.cleanCaches();
      if (result.ok) {
        success(
          'Caché reconstruida',
          `${result.cleaned.length} carpetas movidas (${result.totalFreedMB} MB). Se regenerarán solas al abrir el juego.`
        );
      } else {
        error('Limpieza parcial', `${result.failed.length} carpetas no se pudieron mover.`);
      }
      await scan();
    } finally {
      setBusy(false);
    }
  };

  return (
    <BentoCard>
      <BentoCardHeader
        title="Limpieza profunda de caché de shaders"
        subtitle="DirectX, NVIDIA, AMD e Intel: las carpetas se apartan para que el driver las regenere desde cero"
        icon={<HardDrive className="w-5 h-5" />}
        action={
          <button
            onClick={clean}
            disabled={busy}
            className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-1 disabled:opacity-50"
          >
            <Trash2 className="w-3 h-3" />
            Limpiar y reconstruir
          </button>
        }
      />
      <BentoCardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Una caché de shaders corrupta o desactualizada es una causa clásica de micro-tirones en
          juegos competitivos. Las carpetas <strong>no se borran</strong>: se apartan a una copia de
          seguridad y el driver las reconstruye en el siguiente arranque del juego.
        </p>

        {users.length > 0 && (
          <div className="p-3 mb-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <p className="text-xs text-yellow-400">
              Detectados juegos o launchers en marcha: {users.join(', ')}. Ciérralos antes de limpiar.
            </p>
          </div>
        )}

        {report && (
          <>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <Stat label="Tamaño total" value={`${report.totalSizeMB} MB`} />
              <Stat label="Ficheros" value={`${report.totalFiles}`} />
              <Stat label="Carpetas" value={`${report.entries.filter(e => e.exists).length}`} />
            </div>

            <div className="space-y-1">
              {report.entries.map(entry => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-2 bg-accent/40 rounded-lg text-xs"
                >
                  <span className="text-foreground">
                    {entry.name}{' '}
                    <span className="text-muted-foreground">({entry.vendor})</span>
                  </span>
                  <span className="text-muted-foreground font-mono">
                    {entry.exists ? `${entry.sizeMB} MB · ${entry.fileCount} ficheros` : 'no existe'}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        <p className="text-xs text-muted-foreground mt-4">
          Tras la limpieza el primer arranque del juego.compile shaders y puede ir más lento: es
          normal y solo pasa una vez.
        </p>
      </BentoCardContent>
    </BentoCard>
  );
}

// ---------------------------------------------------------------------------
// 4. Battery / silent mode
// ---------------------------------------------------------------------------
function BatteryCard() {
  const { success, error } = useToastActions();
  const [status, setStatus] = useState<BatteryStatus | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setStatus(await zerotweaks.pro.battery());
  }, []);

  useEffect(() => {
    void refresh();
    const timer = setInterval(refresh, 15000);
    return () => clearInterval(timer);
  }, [refresh]);

  const apply = async (kind: PowerProfileKind) => {
    setBusy(true);
    try {
      const result = await zerotweaks.pro.applyPower(kind);
      if (result.ok) {
        success('Perfil aplicado', result.planName || kind);
      } else {
        error('No se pudo aplicar', result.error || 'Error desconocido');
      }
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <BentoCard>
      <BentoCardHeader
        title="Ahorro y silencio para portátiles"
        subtitle="Alterna entre rendimiento extremo con el cargador y un perfil silencioso en batería"
        icon={<Battery className="w-5 h-5" />}
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
        {!status && <p className="text-sm text-muted-foreground">Leyendo el estado de la batería...</p>}
        {status && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat
                label="Alimentación"
                value={!status.hasBattery ? 'Sin batería' : status.onBattery ? 'En batería' : 'Con cargador'}
                hint={status.percent !== null ? `${status.percent}%` : undefined}
              />
              <Stat label="Plan activo" value={status.activePlanName || 'Desconocido'} />
              <Stat
                label="Estado"
                value={status.matchesChargerState ? 'Correcto' : 'A ajustar'}
                hint={
                  status.matchesChargerState
                    ? 'El plan encaja con el cargador'
                    : 'El plan no coincide con el estado del cargador'
                }
              />
              <Stat
                label="Carga"
                value={status.charging ? 'Cargando' : status.onBattery ? 'Descargando' : 'Estable'}
              />
            </div>

            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => apply('performance')}
                disabled={busy || !status.hasBattery}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <Zap className="w-4 h-4" />
                Rendimiento extremo
              </button>
              <button
                onClick={() => apply('saver')}
                disabled={busy || !status.hasBattery}
                className="px-4 py-2 bg-transparent border border-border text-foreground rounded-lg font-medium hover:bg-accent hover:border-primary/50 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <Battery className="w-4 h-4" />
                Ahorro silencioso
              </button>
              <button
                onClick={async () => {
                  const result = await zerotweaks.pro.autoPower();
                  if (result.ok) success('Perfil automático aplicado', result.planName);
                  else error('No se pudo aplicar', result.error);
                  await refresh();
                }}
                disabled={busy || !status.hasBattery}
                className="px-4 py-2 bg-transparent border border-border text-muted-foreground rounded-lg font-medium hover:bg-accent transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                Automático según el cargador
              </button>
            </div>

            {status.notes.length > 0 && (
              <ul className="list-disc list-inside space-y-1">
                {status.notes.map((note, i) => (
                  <li key={i} className="text-xs text-muted-foreground">{note}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </BentoCardContent>
    </BentoCard>
  );
}

// ---------------------------------------------------------------------------
// 5. Profiles + cloud sync
// ---------------------------------------------------------------------------
function SyncCard() {
  const { success, error } = useToastActions();
  const [config, setConfig] = useState<SyncConfig | null>(null);
  const [bundle, setBundle] = useState<ProfileBundle | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const [syncConfig, built] = await Promise.all([
      zerotweaks.pro.syncConfig(),
      zerotweaks.pro.buildBundle(),
    ]);
    setConfig(syncConfig);
    setBundle(built);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const saveConfig = async (patch: Partial<SyncConfig>) => {
    if (!config) return;
    const next = await zerotweaks.pro.setSyncConfig({ ...config, ...patch });
    setConfig(next);
  };

  return (
    <div className="space-y-4">
      <BentoCard>
        <BentoCardHeader
          title="Copias de seguridad de perfiles"
          subtitle="Exporta e importa tu configuración y tus perfiles en un fichero .json"
          icon={<Save className="w-5 h-5" />}
        />
        <BentoCardContent>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={async () => {
                const target = await zerotweaks.pro.pickExportPath();
                if (!target) return;
                const result = await zerotweaks.pro.exportBundle(target);
                if (result.ok) success('Exportado', `Guardado en ${result.path}`);
                else error('No se pudo exportar', result.error);
              }}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Exportar a fichero
            </button>
            <button
              onClick={async () => {
                const source = await zerotweaks.pro.pickImportFile();
                if (!source) return;
                const result = await zerotweaks.pro.importBundle(source);
                if (result.ok) success('Importado', `${result.profiles} perfiles disponibles`);
                else error('No se pudo importar', result.error);
                await refresh();
              }}
              className="px-4 py-2 bg-transparent border border-border text-foreground rounded-lg font-medium hover:bg-accent hover:border-primary/50 transition-colors flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Importar desde fichero
            </button>
          </div>

          {bundle && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat label="Perfiles" value={`${bundle.profiles.length}`} />
              <Stat label="Ajustes" value={`${Object.keys(bundle.settings).length}`} />
              <Stat label="Versión de la app" value={bundle.appVersion} />
              <Stat label="Generado" value={new Date(bundle.createdAt).toLocaleTimeString()} />
            </div>
          )}
        </BentoCardContent>
      </BentoCard>

      <BentoCard>
        <BentoCardHeader
          title="Sincronización en la nube"
          subtitle="Opcional y desactivada por defecto: nada sale del equipo hasta que configures un destino"
          icon={<Cloud className="w-5 h-5" />}
        />
        <BentoCardContent>
          <label className="flex items-center gap-2 cursor-pointer mb-4">
            <input
              type="checkbox"
              checked={config?.enabled ?? false}
              onChange={e => saveConfig({ enabled: e.target.checked })}
              className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
            />
            <span className="text-sm text-foreground">Activar la sincronización</span>
          </label>

          <label className="block text-sm font-medium text-muted-foreground mb-1" htmlFor="sync-endpoint">
            Endpoint HTTP (GET / PUT)
          </label>
          <input
            id="sync-endpoint"
            type="url"
            value={config?.endpoint ?? ''}
            onChange={e => setConfig(config ? { ...config, endpoint: e.target.value } : config)}
            onBlur={() => saveConfig({})}
            placeholder="https://mi-servidor.example/zerotweaks.json"
            className="w-full px-4 py-2 bg-accent border border-border rounded-lg text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary font-mono text-xs"
          />

          <label className="block text-sm font-medium text-muted-foreground mt-3 mb-1" htmlFor="sync-token">
            Token (opcional)
          </label>
          <input
            id="sync-token"
            type="password"
            value={config?.token ?? ''}
            onChange={e => setConfig(config ? { ...config, token: e.target.value } : config)}
            onBlur={() => saveConfig({})}
            placeholder="Bearer token"
            className="w-full px-4 py-2 bg-accent border border-border rounded-lg text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary font-mono text-xs"
          />

          <div className="flex gap-3 mt-4 flex-wrap">
            <button
              onClick={async () => {
                setBusy(true);
                try {
                  const result = await zerotweaks.pro.syncUpload();
                  if (result.ok) success('Sincronizado', result.message);
                  else error('No se pudo subir', result.error || result.message);
                  await refresh();
                } finally {
                  setBusy(false);
                }
              }}
              disabled={busy || !config?.enabled}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <UploadCloud className="w-4 h-4" />
              Subir
            </button>
            <button
              onClick={async () => {
                setBusy(true);
                try {
                  const result = await zerotweaks.pro.syncDownload();
                  if (result.ok) success('Restaurado', result.message);
                  else error('No se pudo descargar', result.error || result.message);
                  await refresh();
                } finally {
                  setBusy(false);
                }
              }}
              disabled={busy || !config?.enabled}
              className="px-4 py-2 bg-transparent border border-border text-foreground rounded-lg font-medium hover:bg-accent hover:border-primary/50 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <DownloadCloud className="w-4 h-4" />
              Descargar
            </button>
          </div>

          {config?.lastSyncAt && (
            <p className="text-xs text-muted-foreground mt-3">
              Última sincronización: {new Date(config.lastSyncAt).toLocaleString()}
            </p>
          )}
          {config?.lastError && <p className="text-xs text-red-400 mt-1">{config.lastError}</p>}
          <p className="text-xs text-muted-foreground mt-3">
            El destino es un almacén HTTP simple (GET para descargar, PUT para subir). Puede ser un
            servicio de ficheros privado, un WebDAV o una función propia. El token se guarda solo en
            este equipo.
          </p>
        </BentoCardContent>
      </BentoCard>
    </div>
  );
}

// ---------------------------------------------------------------------------
function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="p-3 bg-accent/50 rounded-lg">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-space text-lg font-bold text-foreground" title={value}>
        {value}
      </p>
      {hint && <p className="text-[11px] text-muted-foreground" title={hint}>{hint}</p>}
    </div>
  );
}
