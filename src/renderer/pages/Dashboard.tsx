// Dashboard Page
import React, { useEffect, useState } from 'react';
import { WatermarkTitle } from '../components/Effects';
import { useTranslation } from 'react-i18next';
import { useHardwareStore } from '../stores/hardwareStore';
import { useTweaksStore } from '../stores/tweaksStore';
import { useSettingsStore } from '../stores/settingsStore';
import { BentoGrid, BentoCard, BentoCardHeader, BentoCardContent, BentoCardFooter } from '../components/BentoGrid';
import { TweakCard } from '../components/TweakCard';
import { 
  Zap, Cpu, Cpu as GpuIcon, Wifi, Mouse, Battery, Trash2, HardDrive, Activity, 
  CheckCircle, AlertCircle, Info, BarChart2, RotateCcw, Play, Settings,
  LayoutDashboard, Gamepad2, Monitor, Gauge
} from 'lucide-react';
import { cn } from '../utils/cn';
import { zerotweaks } from '../lib/api';
import type { Tweak, HardwareProfile, ImpactLevel } from '../../shared/types/all';
import { useToastActions } from '../components/Toast';

type ImpactFilter = 'all' | ImpactLevel;

const IMPACT_FILTERS: { id: ImpactFilter; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'alto', label: 'Alto' },
  { id: 'medio', label: 'Medio' },
  { id: 'bajo', label: 'Bajo' },
];

// `color` drives the icon tile gradient, `iconColor` is the literal icon class
// (Tailwind can only emit classes it can see in the source, so it is never
// built by concatenation) and `css` holds real CSS colours for the progress
// bar, whose inline style cannot use Tailwind names.
const MODULE_CARDS = [
  { id: 'performance', labelKey: "dashboardExtra.systemPerformance", icon: Zap, category: 'system_performance', color: 'from-blue-500 to-sky-400', iconColor: 'text-sky-300', css: '#3b82f6, #38bdf8', tweaks: 10 },
  { id: 'gaming', labelKey: "dashboardExtra.gamingFps", icon: Gamepad2, category: 'gaming_fps', color: 'from-indigo-500 to-blue-500', iconColor: 'text-indigo-300', css: '#6366f1, #3b82f6', tweaks: 8 },
  { id: 'gpu', labelKey: "gpu.title", icon: GpuIcon, category: 'gpu', color: 'from-sky-500 to-blue-400', iconColor: 'text-blue-300', css: '#0ea5e9, #60a5fa', tweaks: 12 },
  { id: 'network', labelKey: "network.title", icon: Wifi, category: 'network_tcp', color: 'from-blue-600 to-indigo-500', iconColor: 'text-indigo-300', css: '#2563eb, #6366f1', tweaks: 8 },
  { id: 'peripherals', labelKey: "peripherals.title", icon: Mouse, category: 'peripherals_input', color: 'from-slate-400 to-blue-400', iconColor: 'text-blue-300', css: '#94a3b8, #60a5fa', tweaks: 8 },
  { id: 'power', labelKey: "power.title", icon: Battery, category: 'power_cpu', color: 'from-blue-700 to-blue-500', iconColor: 'text-blue-300', css: '#1d4ed8, #3b82f6', tweaks: 8 },
  { id: 'debloat', labelKey: "debloat.title", icon: Trash2, category: 'debloat_apps', color: 'from-gray-500 to-slate-500', iconColor: 'text-slate-300', css: '#6b7280, #64748b', tweaks: 15 },
  { id: 'storage', labelKey: "storage.title", icon: HardDrive, category: 'ram_storage', color: 'from-blue-500 to-indigo-500', iconColor: 'text-indigo-300', css: '#3b82f6, #6366f1', tweaks: 8 },
];

export function Dashboard() {
  const { t } = useTranslation();
  const { hardware, isLoading: hwLoading, fetchHardware } = useHardwareStore();
  const { filteredTweaks, fetchTweaks, filterTweaks, detectTweak, applyTweak, revertTweak, selectedTweakIds } = useTweaksStore();
  const { theme, dryRunDefault: dryRun, setDryRunDefault: setDryRun } = useSettingsStore();
  const { success, error, warning, info } = useToastActions();

  const [systemScore, setSystemScore] = useState(0);
  const [appliedCount, setAppliedCount] = useState(0);
  const [pendingReboot, setPendingReboot] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [moduleStates, setModuleStates] = useState<Record<string, { applied: number; total: number }>>({});
  const [impactFilter, setImpactFilter] = useState<ImpactFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  useEffect(() => {
    // Hardware + tweak catalogue are loaded once at app level (App.tsx).
    // Re-fetching here would flip the loading state and remount this page.
    calculateScores();
  }, [filteredTweaks, selectedTweakIds]);

  const calculateScores = () => {
    // Calculate based on applied tweaks
    const total = filteredTweaks.length;
    const applied = filteredTweaks.filter(t => selectedTweakIds.includes(t.id)).length;
    setAppliedCount(applied);
    setSystemScore(Math.round((applied / Math.max(total, 1)) * 100));
    
    // Module states
    const modules: Record<string, { applied: number; total: number }> = {};
    MODULE_CARDS.forEach(m => {
      const moduleTweaks = filteredTweaks.filter(t => t.category === m.category);
      const moduleApplied = moduleTweaks.filter(t => selectedTweakIds.includes(t.id)).length;
      modules[m.category] = { applied: moduleApplied, total: moduleTweaks.length };
    });
    setModuleStates(modules);
    
    setPendingReboot(filteredTweaks.some(t => selectedTweakIds.includes(t.id) && t.requiresReboot));
  };

  const handleOptimize = async () => {
    setIsOptimizing(true);
    const safeTweaks = filteredTweaks.filter(t => t.risk === 'safe' && !t.requiresReboot && !t.unavailableReason);
    
    for (const tweak of safeTweaks) {
      try {
        await applyTweak(tweak.id);
        success('Applied', `${tweak.name} applied successfully`);
      } catch (err: any) {
        error('Failed', `${tweak.name}: ${err.message}`);
      }
      await new Promise(r => setTimeout(r, 100));
    }
    
    setIsOptimizing(false);
    calculateScores();
    success('Optimization Complete', `Applied ${safeTweaks.length} safe tweaks`);
  };

  const handleRestore = async () => {
    // Would call restore API
    info('Restore', 'Restoring all tweaks to original state...');
  };

  const handleModuleClick = (category: string) => {
    setCategoryFilter(category);
    filterTweaks({ category, impacto: impactFilter });
  };

  const handleImpactFilter = (impact: ImpactFilter) => {
    setImpactFilter(impact);
    filterTweaks({ category: categoryFilter, impacto: impact });
  };

  if (hwLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading system information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-space text-4xl md:text-5xl font-bold text-foreground tracking-tight">
            <WatermarkTitle watermark="PANEL">{t('dashboard.title')}</WatermarkTitle>
          </h1>
          <p className="text-muted-foreground mt-1">{t('dashboard.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={dryRun}
              onChange={e => setDryRun(e.target.checked)}
              className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
            />
            {t('dashboard.dryRun')}
          </label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Score:</span>
            <div className="w-24 h-4 bg-accent rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-sky-400 transition-all duration-500"
                style={{ width: `${systemScore}%` }}
              />
            </div>
            <span className="font-mono text-lg font-bold text-primary">{systemScore}%</span>
          </div>
        </div>
      </div>

      {/* Impact filter */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground mr-1">Impacto:</span>
        {IMPACT_FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => handleImpactFilter(f.id)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border',
              impactFilter === f.id
                ? 'bg-primary/20 border-primary/50 text-primary'
                : 'bg-transparent border-border text-muted-foreground hover:bg-accent hover:border-primary/40'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* System Info Bar */}
      {hardware && (
        <BentoGrid columns={{ base: 2, sm: 4, md: 6 }} gap={3}>
          <BentoCard className="bg-gradient-to-br from-blue-500/10 to-blue-500/10 border-blue-500/20">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Cpu className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">CPU</p>
                <p className="font-space font-bold text-foreground">{hardware.cpu.model}</p>
                <p className="text-xs text-muted-foreground">{hardware.cpu.cores}C / {hardware.cpu.threads}T • {hardware.cpu.maxClock} MHz</p>
              </div>
            </div>
          </BentoCard>
          
          <BentoCard className="bg-gradient-to-br from-green-500/10 to-teal-500/10 border-green-500/20">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                <GpuIcon className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">GPU</p>
                <p className="font-space font-bold text-foreground">{hardware.gpu.model}</p>
                <p className="text-xs text-muted-foreground">{hardware.gpu.vram} MB • {hardware.gpu.driverVersion}</p>
              </div>
            </div>
          </BentoCard>
          
          <BentoCard className="bg-gradient-to-br from-purple-500/10 to-violet-500/10 border-purple-500/20">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Activity className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('dashboardLabels.memory')}</p>
                <p className="font-space font-bold text-foreground">{hardware.memory.total} GB</p>
                <p className="text-xs text-muted-foreground">{hardware.memory.type}-{hardware.memory.speed} • {hardware.memory.channels}ch</p>
              </div>
            </div>
          </BentoCard>
          
          <BentoCard className="bg-gradient-to-br from-orange-500/10 to-amber-500/10 border-orange-500/20">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
                <HardDrive className="w-6 h-6 text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('dashboardLabels.storage')}</p>
                <p className="font-space font-bold text-foreground">{hardware.storage.reduce((a, b) => a + b.size, 0)} GB</p>
                <p className="text-xs text-muted-foreground">{hardware.storage.length} drive(s)</p>
              </div>
            </div>
          </BentoCard>

          <BentoCard className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-blue-400/20">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-400/20 flex items-center justify-center">
                <LayoutDashboard className="w-6 h-6 text-blue-300" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('dashboardLabels.windows')}</p>
                <p className="font-space font-bold text-foreground">{hardware.windowsVersion.version}</p>
                <p className="text-xs text-muted-foreground">{hardware.windowsVersion.edition} • Build {hardware.windowsVersion.build}</p>
              </div>
            </div>
          </BentoCard>

          <BentoCard className="bg-gradient-to-br from-gray-500/10 to-slate-500/10 border-gray-500/20">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gray-500/20 flex items-center justify-center">
                <Gauge className="w-6 h-6 text-gray-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('dashboardLabels.formFactor')}</p>
                <p className="font-space font-bold text-foreground capitalize">
                  {hardware.isLaptop ? t('dashboard.laptop') : t('dashboard.desktop')}
                </p>
                <p className="text-xs text-muted-foreground">BitLocker: {hardware.hasBitLocker ? t('dashboardLabels.on') : t('dashboardLabels.off')}</p>
              </div>
            </div>
          </BentoCard>
        </BentoGrid>
      )}

      {/* Quick Actions */}
      <BentoGrid columns={{ base: 1, sm: 2 }} gap={4}>
        <BentoCard className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20" span={{ colStart: 1, colEnd: 3 }}>
          <BentoCardHeader
            title={t('dashboard.quickActions')}
            subtitle={t('dashboardExtra.quickActionsSubtitle')}
            icon={<Zap className="w-5 h-5" />}
            action={
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleOptimize}
                  disabled={isOptimizing}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isOptimizing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      Optimizing...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      {t('dashboard.optimizeSystem')}
                    </>
                  )}
                </button>
                <button 
                  onClick={handleRestore}
                  className="px-4 py-2 bg-transparent border border-border text-foreground rounded-lg font-medium hover:bg-accent hover:border-primary/50 transition-colors flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  {t('dashboard.restoreAll')}
                </button>
              </div>
            }
          />
          <BentoCardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-accent/50 rounded-lg">
                <p className="font-space text-3xl font-bold text-primary">{appliedCount}</p>
                <p className="text-xs text-muted-foreground">{t('dashboardExtra.tweaksAppliedLabel')}</p>
              </div>
              <div className="text-center p-3 bg-accent/50 rounded-lg">
                <p className="font-space text-3xl font-bold text-blue-400">{filteredTweaks.filter(t => t.risk === 'safe').length}</p>
                <p className="text-xs text-muted-foreground">{t('dashboardExtra.safeTweaksLabel')}</p>
              </div>
              <div className="text-center p-3 bg-accent/50 rounded-lg">
                <p className="font-space text-3xl font-bold text-yellow-400">{filteredTweaks.filter(t => t.risk === 'moderate').length}</p>
                <p className="text-xs text-muted-foreground">{t('dashboardExtra.moderateTweaksLabel')}</p>
              </div>
              <div className="text-center p-3 bg-accent/50 rounded-lg">
                <p className="font-space text-3xl font-bold text-red-400">{filteredTweaks.filter(t => t.risk === 'advanced').length}</p>
                <p className="text-xs text-muted-foreground">{t('dashboardExtra.advancedTweaksLabel')}</p>
              </div>
            </div>
            {pendingReboot && (
              <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-center gap-2 text-yellow-400">
                <RotateCcw className="w-5 h-5" />
                <span className="font-medium">Reboot required for some applied tweaks to take effect</span>
              </div>
            )}
          </BentoCardContent>
        </BentoCard>

        {/* Module Cards - premium widgets */}
        {MODULE_CARDS.map((module, index) => {
          const state = moduleStates[module.category] || { applied: 0, total: module.tweaks };
          const Icon = module.icon;
          const progress = state.total > 0 ? state.applied / state.total : 0;
          const applied = state.applied > 0;

          return (
            <BentoCard
              key={module.id}
              variant="glass"
              stagger={index}
              status={{
                label: applied ? `${state.applied} aplicados` : `${state.total} tweaks`,
                tone: applied ? 'green' : 'cyan',
              }}
              onClick={() => handleModuleClick(module.category)}
              className="group"
            >
              {/* `pr-24` leaves room for the floating status tag. */}
              <div className="flex items-start justify-between gap-3 pr-24">
                <div className={cn(
                  'w-14 h-14 rounded-2xl flex items-center justify-center shrink-0',
                  'ring-1 ring-inset ring-white/10 transition-transform duration-500 group-hover:scale-105',
                  `bg-gradient-to-br ${module.color}/25`
                )}>
                  <Icon className={cn('w-7 h-7', module.iconColor)} />
                </div>
                <div className="text-right leading-none">
                  <p className="font-space text-2xl font-bold text-foreground">{state.applied}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">{t('dashboardLabels.of')} {state.total}</p>
                </div>
              </div>

              <div className="mt-5">
                <h3 className="font-space text-base font-semibold text-foreground">{t(module.labelKey)}</h3>
                <p className="text-xs text-muted-foreground mt-1">{module.tweaks} tweaks disponibles</p>

                <div className="mt-4 h-1.5 bg-accent/70 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${progress * 100}%`,
                      background: `linear-gradient(to right, ${module.css})`,
                    }}
                  />
                </div>

                <div className="mt-4 flex items-center justify-between gap-2">
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    {module.category.replace('_', ' ')}
                  </span>
                  <span className="neon-button px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary border border-primary/30 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    Abrir
                  </span>
                </div>
              </div>
            </BentoCard>
          );
        })}
      </BentoGrid>

      {/* Recent Tweaks / Recommended */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BentoCard className="lg:col-span-1">
          <BentoCardHeader
            title={t('dashboard.recommendedForYou')}
            subtitle={t('dashboardExtra.recommendedSubtitle')}
            icon={<Gauge className="w-5 h-5" />}
          />
          <BentoCardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredTweaks
                .filter(t => t.risk === 'safe' && t.evidence === 'measured' && !selectedTweakIds.includes(t.id))
                .slice(0, 5)
                .map(tweak => (
                  <TweakCard
                    key={tweak.id}
                    tweak={tweak}
                    compact
                    showSelection
                    isSelected={selectedTweakIds.includes(tweak.id)}
                    onToggleSelect={() => {}} // Would call store toggle
                    onApply={() => applyTweak(tweak.id)}
                  />
                ))}
            </div>
          </BentoCardContent>
        </BentoCard>

        <BentoCard className="lg:col-span-1">
          <BentoCardHeader
            title={t('dashboard.systemHealth')}
            subtitle={t('dashboardExtra.systemHealthSubtitle')}
            icon={<Activity className="w-5 h-5" />}
          />
          <BentoCardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <MetricCard label={t('dashboard.cpuUsage')} value="12%" trend="down" trendValue="3%" icon={<Cpu className="w-5 h-5" />} />
                <MetricCard label={t('dashboard.ramUsage')} value="4.2 GB" trend="up" trendValue="0.5 GB" icon={<Activity className="w-5 h-5" />} />
                <MetricCard label={t('dashboard.gpuUsage')} value="5%" trend="down" trendValue="2%" icon={<GpuIcon className="w-5 h-5" />} />
                <MetricCard label={t('dashboard.diskIO')} value="0.3 MB/s" trend="stable" trendValue="0%" icon={<HardDrive className="w-5 h-5" />} />
              </div>
              <div className="pt-4 border-t border-border">
                <h4 className="font-medium text-foreground mb-3">Timer Resolution</h4>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-3 bg-accent/50 rounded-lg">
                    <p className="font-space text-xl font-bold text-blue-400">0.50 ms</p>
                    <p className="text-xs text-muted-foreground">Current</p>
                  </div>
                  <div className="p-3 bg-accent/50 rounded-lg">
                    <p className="font-space text-xl font-bold text-green-400">0.50 ms</p>
                    <p className="text-xs text-muted-foreground">Minimum</p>
                  </div>
                  <div className="p-3 bg-accent/50 rounded-lg">
                    <p className="font-space text-xl font-bold text-gray-400">15.6 ms</p>
                    <p className="text-xs text-muted-foreground">Maximum</p>
                  </div>
                </div>
              </div>
            </div>
          </BentoCardContent>
        </BentoCard>
      </div>
    </div>
  );
}

function MetricCard({ label, value, trend, trendValue, icon }: { 
  label: string; 
  value: string; 
  trend: 'up' | 'down' | 'stable'; 
  trendValue: string; 
  icon: React.ReactNode;
}) {
  const trendColors = {
    up: 'text-red-400',
    down: 'text-green-400',
    stable: 'text-gray-400',
  };
  
  const trendIcons = {
    up: '↑',
    down: '↓',
    stable: '→',
  };

  return (
    <div className="p-4 bg-accent/50 rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="font-space text-2xl font-bold text-foreground">{value}</span>
        <span className={cn('text-xs font-medium', trendColors[trend])}>
          {trendIcons[trend]} {trendValue}
        </span>
      </div>
    </div>
  );
}