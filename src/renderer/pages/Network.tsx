// Network Page
import React, { useEffect, useState } from 'react';
import { WatermarkTitle } from '../components/Effects';
import { useTranslation } from 'react-i18next';
import { useHardwareStore } from '../stores/hardwareStore';
import { useTweaksStore } from '../stores/tweaksStore';
import { BentoGrid, BentoCard, BentoCardHeader, BentoCardContent, BentoCardFooter } from '../components/BentoGrid';
import { TweakCard } from '../components/TweakCard';
import { 
  Wifi, Shield, AlertCircle, Info, Activity, 
  RotateCcw, Play, ExternalLink, CheckCircle
} from 'lucide-react';
import { cn } from '../utils/cn';
import { zerotweaks } from '../lib/api';
import { useToastActions } from '../components/Toast';
import type { Tweak } from '../../shared/types/all';

export function NetworkPage() {
  const { t } = useTranslation();
  const { hardware, isLoading: hwLoading } = useHardwareStore();
  const { filteredTweaks, filterTweaks, detectTweak, applyTweak, revertTweak } = useTweaksStore();
  const { success, error, warning, info } = useToastActions();
  
  const [networkMetrics, setNetworkMetrics] = useState<{ ping: number; jitter: number; loss: number } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    filterTweaks({ category: 'network_tcp' });
  }, [filterTweaks]);

  const handleApplyTweak = async (tweak: Tweak) => {
    try {
      const result = await applyTweak(tweak.id);
      if (result.ok) success('Applied', `${tweak.name} applied successfully`);
      else error('Failed', result.error || 'Unknown error');
    } catch (err: any) {
      error('Error', err.message);
    }
  };

  const handleRevertTweak = async (tweak: Tweak, originalState: any) => {
    try {
      const result = await revertTweak(tweak.id, originalState);
      if (result.ok) success('Reverted', `${tweak.name} reverted successfully`);
      else error('Failed', result.error || 'Unknown error');
    } catch (err: any) {
      error('Error', err.message);
    }
  };

  const handleRunNetworkTest = async () => {
    setIsTesting(true);
    try {
      // Run quick benchmark for network
      const result = await zerotweaks.benchmark['benchmark:run']();
      if (result.metrics.network) {
        setNetworkMetrics(result.metrics.network);
      }
      success('Test Complete', `Ping: ${result.metrics.network?.ping}ms, Jitter: ${result.metrics.network?.jitter}ms`);
    } catch (err: any) {
      error('Test Failed', err.message);
    } finally {
      setIsTesting(false);
    }
  };

  if (hwLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-space text-4xl md:text-5xl font-bold text-foreground tracking-tight">
            <WatermarkTitle watermark="NET">{t('network.title')}</WatermarkTitle>
          </h1>
          <p className="text-muted-foreground mt-1">{t('network.subtitle')}</p>
        </div>
        <button
          onClick={handleRunNetworkTest}
          disabled={isTesting}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {isTesting ? (
            <>
              <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              Testing...
            </>
          ) : (
            <>
              <Activity className="w-4 h-4" />
              Run Network Test
            </>
          )}
        </button>
      </div>

      {/* Network Adapter Info */}
      {hardware && hardware.network && (
        <BentoGrid columns={{ base: 1, sm: 2, md: 4 }} gap={4}>
          {[hardware.network].map((adapter, i) => (
            <BentoCard key={i} className="bg-gradient-to-r from-blue-500/5 to-blue-500/5 border-blue-500/10">
              <BentoCardHeader
                title="Network Adapter"
                subtitle={adapter.adapterName}
                icon={<Wifi className="w-5 h-5" />}
              />
              <BentoCardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Speed</span><span className="font-mono text-foreground">{adapter.speed} Mbps</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">MAC</span><span className="font-mono text-foreground">{adapter.macAddress}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Driver</span><span className="font-mono text-foreground">{adapter.driverVersion}</span></div>
                </div>
              </BentoCardContent>
            </BentoCard>
          ))}
        </BentoGrid>
      )}

      {/* Network Metrics */}
      {networkMetrics && (
        <BentoCard variant="elevated" className="bg-green-500/5 border-green-500/10">
          <BentoCardHeader
            title="Last Network Test"
            subtitle={new Date().toLocaleString()}
            icon={<Activity className="w-5 h-5 text-green-400" />}
          />
          <BentoCardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-green-500/10 rounded-lg">
                <p className="font-space text-2xl font-bold text-green-400">{networkMetrics.ping} ms</p>
                <p className="text-xs text-muted-foreground">Ping</p>
              </div>
              <div className="p-3 bg-green-500/10 rounded-lg">
                <p className="font-space text-2xl font-bold text-green-400">{networkMetrics.jitter} ms</p>
                <p className="text-xs text-muted-foreground">Jitter</p>
              </div>
              <div className="p-3 bg-green-500/10 rounded-lg">
                <p className="font-space text-2xl font-bold text-green-400">{networkMetrics.loss.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">Packet Loss</p>
              </div>
            </div>
          </BentoCardContent>
        </BentoCard>
      )}

      {/* Network Tweaks */}
      <div className="space-y-6">
        {groupByCategory(filteredTweaks).map(({ category, tweaks }) => (
          <section key={category} className="space-y-4">
            <h2 className="font-space text-xl font-semibold text-foreground flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary" />
              {formatCategory(category)}
              <span className="text-sm text-muted-foreground font-normal">({tweaks.length})</span>
            </h2>
            <BentoGrid columns={{ base: 1, sm: 1, md: 2 }} gap={4}>
              {tweaks.map(tweak => (
                <TweakCard
                  key={tweak.id}
                  tweak={tweak}
                  onApply={() => handleApplyTweak(tweak)}
                  onRevert={(state) => handleRevertTweak(tweak, state)}
                />
              ))}
            </BentoGrid>
          </section>
        ))}
        
        {filteredTweaks.length === 0 && (
          <BentoCard variant="outlined" className="text-center py-12">
            <Wifi className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No network tweaks found</h3>
            <p className="text-muted-foreground">Check your filter settings</p>
          </BentoCard>
        )}
      </div>
    </div>
  );
}

function groupByCategory(tweaks: Tweak[]) {
  const grouped: Record<string, Tweak[]> = {};
  tweaks.forEach(t => {
    if (!grouped[t.category]) grouped[t.category] = [];
    grouped[t.category].push(t);
  });
  return Object.entries(grouped).map(([category, tweaks]) => ({ category, tweaks }));
}

function formatCategory(category: string): string {
  return category.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
}