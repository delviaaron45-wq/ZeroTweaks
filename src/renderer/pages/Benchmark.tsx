// Benchmark Page
import React, { useEffect, useState } from 'react';
import { WatermarkTitle } from '../components/Effects';
import { useTranslation } from 'react-i18next';
import { useHardwareStore } from '../stores/hardwareStore';
import { 
  Activity, Play, RotateCcw, BarChart2, 
  TrendingUp, TrendingDown, Minus, Download, 
  ExternalLink, Loader2, Zap, Gauge, Wifi, 
  Database, Cpu, Monitor, Trash2
} from 'lucide-react';
import { BentoGrid, BentoCard, BentoCardHeader, BentoCardContent, BentoCardFooter } from '../components/BentoGrid';
import { cn } from '../utils/cn';
import { zerotweaks } from '../lib/api';
import { useToastActions } from '../components/Toast';
import { DriverLatencyCard, StutterCard } from './DiagnosisInsights';

interface BenchmarkResult {
  id: string;
  timestamp: string;
  tweakId?: string;
  profileId?: string;
  metrics: any;
  systemState: any;
}

export function BenchmarkPage() {
  const { t } = useTranslation();
  const { success, error, info } = useToastActions();
  
  const [results, setResults] = useState<BenchmarkResult[]>([]);
  const [running, setRunning] = useState(false);
  const [currentStage, setCurrentStage] = useState('');
  const [stageProgress, setStageProgress] = useState(0);
  const [selectedTweakId, setSelectedTweakId] = useState('');
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [comparison, setComparison] = useState<any>(null);
  const [compareFrom, setCompareFrom] = useState('');
  const [compareTo, setCompareTo] = useState('');

  useEffect(() => {
    loadResults();
  }, []);

  const loadResults = async () => {
    try {
      const res = await zerotweaks.benchmark['benchmark:results']();
      setResults(res);
    } catch (err) {
      console.error('Failed to load results:', err);
    }
  };

  const runBenchmark = async () => {
    setRunning(true);
    setCurrentStage('Initializing...');
    setStageProgress(0);
    
    try {
      const result = await zerotweaks.benchmark['benchmark:run'](selectedTweakId || undefined, selectedProfileId || undefined);
      setResults(prev => [result, ...prev]);
      success('Benchmark Complete', 'Results saved and ready for comparison');
    } catch (err: any) {
      error('Benchmark Failed', err.message);
    } finally {
      setRunning(false);
      setCurrentStage('');
      setStageProgress(0);
      loadResults();
    }
  };

  const runComparison = async () => {
    if (!compareFrom || !compareTo) return;
    try {
      const comp = await zerotweaks.benchmark['benchmark:compare'](compareFrom, compareTo);
      setComparison(comp);
      info('Comparison Complete', `${comp.improvements.length} improvements, ${comp.regressions.length} regressions`);
    } catch (err: any) {
      error('Comparison Failed', err.message);
    }
  };

  const exportResult = (result: BenchmarkResult) => {
    const json = JSON.stringify(result, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zerotweaks-benchmark-${result.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const deleteResult = async (id: string) => {
    // Would implement delete
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-space text-4xl md:text-5xl font-bold text-foreground tracking-tight">
            <WatermarkTitle watermark="BENCH">{t('benchmark.title')}</WatermarkTitle>
          </h1>
          <p className="text-muted-foreground mt-1">{t('benchmark.subtitle')}</p>
        </div>
        <button
          onClick={runBenchmark}
          disabled={running}
          className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-3 text-lg"
        >
          {running ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <Play className="w-6 h-6" />
              Run Benchmark
            </>
          )}
        </button>
      </div>

      {/* Progress */}
      {running && (
        <BentoCard variant="elevated" className="bg-primary/5 border-primary/10">
          <BentoCardHeader
            title="Running Benchmark"
            subtitle={currentStage}
            icon={<Activity className="w-5 h-5 animate-spin" />}
          />
          <BentoCardContent>
            <div className="h-2 bg-accent rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-sky-400 transition-all duration-300" 
                style={{ width: `${stageProgress}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground mt-2 text-center">{currentStage} ({stageProgress}%)</p>
          </BentoCardContent>
        </BentoCard>
      )}

      {/* Quick Benchmark Options */}
      <BentoCard>
        <BentoCardHeader
          title="Benchmark Options"
          subtitle="Configure what to measure"
          icon={<Gauge className="w-5 h-5" />}
        />
        <BentoCardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Test Specific Tweak (Optional)</label>
              <select
                value={selectedTweakId}
                onChange={e => setSelectedTweakId(e.target.value)}
                className="w-full px-4 py-2 bg-accent border border-border rounded-lg text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Full System Benchmark</option>
                <option value="system.win32priorityseparation">Win32PrioritySeparation</option>
                <option value="system.mmcss_games">MMCSS Games</option>
                <option value="gpu.hags">HAGS</option>
                <option value="power.ultimate_performance">Ultimate Performance</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Test with Profile (Optional)</label>
              <select
                value={selectedProfileId}
                onChange={e => setSelectedProfileId(e.target.value)}
                className="w-full px-4 py-2 bg-accent border border-border rounded-lg text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">No Profile</option>
                <option value="profile_safe">Safe Profile</option>
                <option value="profile_competitive">Competitive</option>
                <option value="profile_laptop">Laptop</option>
              </select>
            </div>
          </div>
        </BentoCardContent>
      </BentoCard>

      {/* Metrics Explanation */}
      <BentoGrid columns={{ base: 1, sm: 2, md: 4 }} gap={4}>
        <MetricExplanation icon={<Zap />} title="Timer Resolution" desc="System timer precision and jitter" color="cyan" />
        <MetricExplanation icon={<Activity />} title="DPC Latency" desc="Deferred Procedure Call latency" color="orange" />
        <MetricExplanation icon={<Wifi />} title="Network" desc="Ping, jitter, packet loss" color="blue" />
        <MetricExplanation icon={<Database />} title="Memory" desc="Idle RAM, startup processes" color="purple" />
        <MetricExplanation icon={<Cpu />} title="Boot Time" desc="Time to desktop ready" color="green" />
        <MetricExplanation icon={<Monitor />} title="Frame Times" desc="Solo con captura dentro del juego" color="pink" />
      </BentoGrid>

      {/* Stutter + driver latency capture (high impact insights) */}
      <StutterCard />
      <DriverLatencyCard />

      {/* Results History */}
      <div className="space-y-4">
        <h2 className="font-space text-xl font-semibold text-foreground">Benchmark History</h2>
        {results.length === 0 ? (
          <BentoCard variant="outlined" className="text-center py-12">
            <Activity className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No benchmarks yet</h3>
            <p className="text-muted-foreground mb-4">Run your first benchmark to establish a baseline</p>
            <button
              onClick={runBenchmark}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              Run First Benchmark
            </button>
          </BentoCard>
        ) : (
          <BentoGrid columns={{ base: 1, sm: 2 }} gap={4}>
            {results.slice(0, 10).map(result => (
              <BentoCard key={result.id} hover>
                <BentoCardHeader
                  title={`Benchmark ${result.id.split('_')[1]}`}
                  subtitle={new Date(result.timestamp).toLocaleString()}
                  icon={<Activity className="w-5 h-5" />}
                />
                <BentoCardContent>
                  <div className="grid grid-cols-3 gap-4 text-center mb-4">
                    <MetricValue 
                      label="Timer" 
                      value={`${(result.metrics.timerResolution?.current / 10000).toFixed(2)} ms`} 
                      icon={<Zap className="w-4 h-4" />}
                    />
                    <MetricValue 
                      label="DPC Latency" 
                      value={`${result.metrics.dpcLatency?.avg?.toFixed(1) || 0} μs`} 
                      icon={<Activity className="w-4 h-4" />}
                    />
                    <MetricValue 
                      label="Ping" 
                      value={`${result.metrics.network?.ping || 0} ms`} 
                      icon={<Wifi className="w-4 h-4" />}
                    />
                    <MetricValue 
                      label="Boot" 
                      value={`${(result.metrics.bootTime / 1000).toFixed(1)} s`} 
                      icon={<Cpu className="w-4 h-4" />}
                    />
                    <MetricValue 
                      label="RAM" 
                      value={`${result.metrics.idleRam?.toFixed(1) || 0} GB`} 
                      icon={<Database className="w-4 h-4" />}
                    />
                    <MetricValue 
                      label="FPS" 
                      value={result.metrics.frameTimes ? `${result.metrics.frameTimes.fps}` : '—'} 
                      icon={<Monitor className="w-4 h-4" />}
                    />
                  </div>
                  <BentoCardFooter>
                    <button onClick={() => exportResult(result)} className="flex-1 px-3 py-1.5 bg-transparent border border-border text-foreground rounded-lg text-sm font-medium hover:bg-accent hover:border-primary/50 transition-colors flex items-center justify-center gap-1">
                      <Download className="w-3 h-3" />
                      Export
                    </button>
                    <button onClick={() => { setCompareFrom(result.id); setComparison(null); }} className="flex-1 px-3 py-1.5 bg-transparent border border-border text-foreground rounded-lg text-sm font-medium hover:bg-accent hover:border-primary/50 transition-colors flex items-center justify-center gap-1">
                      Compare
                    </button>
                    <button onClick={() => deleteResult(result.id)} className="px-3 py-1.5 bg-transparent border border-red-500/30 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/10 transition-colors">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </BentoCardFooter>
                </BentoCardContent>
              </BentoCard>
            ))}
          </BentoGrid>
        )}
      </div>

      {/* Comparison */}
      {comparison && (
        <BentoCard variant="elevated" className="bg-green-500/5 border-green-500/10">
          <BentoCardHeader
            title="Comparison Results"
            subtitle={`${comparison.improvements.length} improvements • ${comparison.regressions.length} regressions • ${comparison.unchanged.length} unchanged`}
            icon={<BarChart2 className="w-5 h-5" />}
          />
          <BentoCardContent>
            <div className="space-y-4">
              {comparison.improvements.length > 0 && (
                <div>
                  <h4 className="font-medium text-green-400 mb-2 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" /> Improvements
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-green-400">
                    {comparison.improvements.map((imp: string, i: number) => (
                      <li key={i}>{imp}</li>
                    ))}
                  </ul>
                </div>
              )}
              {comparison.regressions.length > 0 && (
                <div>
                  <h4 className="font-medium text-red-400 mb-2 flex items-center gap-2">
                    <TrendingDown className="w-4 h-4" /> Regressions
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-red-400">
                    {comparison.regressions.map((reg: string, i: number) => (
                      <li key={i}>{reg}</li>
                    ))}
                  </ul>
                </div>
              )}
              {comparison.unchanged.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-400 mb-2 flex items-center gap-2">
                    <Minus className="w-4 h-4" /> Unchanged
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-gray-400">
                    {comparison.unchanged.map((unc: string, i: number) => (
                      <li key={i}>{unc}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </BentoCardContent>
        </BentoCard>
      )}

      {/* Compare Tool */}
      {results.length > 0 && (
        <BentoCard>
          <BentoCardHeader
            title="Compare Results"
            subtitle="Select two benchmarks to compare"
            icon={<BarChart2 className="w-5 h-5" />}
          />
          <BentoCardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Before</label>
                <select
                  value={compareFrom}
                  onChange={e => setCompareFrom(e.target.value)}
                  className="w-full px-4 py-2 bg-accent border border-border rounded-lg text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Select baseline...</option>
                  {results.map(r => <option key={r.id} value={r.id}>{new Date(r.timestamp).toLocaleString()} - {r.tweakId || r.profileId || 'Full'}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">After</label>
                <select
                  value={compareTo}
                  onChange={e => setCompareTo(e.target.value)}
                  className="w-full px-4 py-2 bg-accent border border-border rounded-lg text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Select comparison...</option>
                  {results.map(r => <option key={r.id} value={r.id}>{new Date(r.timestamp).toLocaleString()} - {r.tweakId || r.profileId || 'Full'}</option>)}
                </select>
              </div>
            </div>
            <button
              onClick={runComparison}
              disabled={!compareFrom || !compareTo || compareFrom === compareTo}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              Compare
            </button>
          </BentoCardContent>
        </BentoCard>
      )}
    </div>
  );
}

function MetricExplanation({ icon, title, desc, color }: { icon: React.ReactNode; title: string; desc: string; color: string }) {
  return (
    <BentoCard className="text-center">
      <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3', `bg-${color}-500/20 text-${color}-400`)}>
        {icon}
      </div>
      <h3 className="font-medium text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{desc}</p>
    </BentoCard>
  );
}

function MetricValue({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="p-3 bg-accent/50 rounded-lg">
      <div className="text-muted-foreground mb-1">{label}</div>
      <div className="flex items-center justify-center gap-1">
        {icon}
        <span className="font-space text-lg font-bold text-foreground">{value}</span>
      </div>
    </div>
  );
}