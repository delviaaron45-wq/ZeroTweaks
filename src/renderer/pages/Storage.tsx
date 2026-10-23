// Storage Page
import React, { useEffect, useState } from 'react';
import { WatermarkTitle } from '../components/Effects';
import { useTranslation } from 'react-i18next';
import { useHardwareStore } from '../stores/hardwareStore';
import { useTweaksStore } from '../stores/tweaksStore';
import { BentoGrid, BentoCard, BentoCardHeader, BentoCardContent, BentoCardFooter } from '../components/BentoGrid';
import { TweakCard } from '../components/TweakCard';
import { 
  HardDrive, Database, Shield, AlertCircle, Info, 
  RotateCcw, Play, TrendingUp, Download
} from 'lucide-react';
import { cn } from '../utils/cn';
import { zerotweaks } from '../lib/api';
import { useToastActions } from '../components/Toast';
import type { Tweak } from '../../shared/types/all';

export function StoragePage() {
  const { t } = useTranslation();
  const { hardware, isLoading: hwLoading } = useHardwareStore();
  const { filteredTweaks, filterTweaks, detectTweak, applyTweak, revertTweak } = useTweaksStore();
  const { success, error, warning, info } = useToastActions();
  
  const [smartData, setSmartData] = useState<any[]>([]);

  useEffect(() => {
    filterTweaks({ category: 'ram_storage' });
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

  const handleRefreshSMART = async () => {
    try {
      const result = await zerotweaks.tweaks['tweak:detect']({ tweakId: 'storage.smart_status' });
      if (result.value) setSmartData(result.value);
      success('Refreshed', 'SMART data updated');
    } catch (err: any) {
      error('Failed', err.message);
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
            <WatermarkTitle watermark="DISK">{t('storage.title')}</WatermarkTitle>
          </h1>
          <p className="text-muted-foreground mt-1">{t('storage.subtitle')}</p>
        </div>
        <button
          onClick={handleRefreshSMART}
          className="px-4 py-2 bg-transparent border border-border text-foreground rounded-lg font-medium hover:bg-accent hover:border-primary/50 transition-colors flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Refresh SMART
        </button>
      </div>

      {/* Storage Info */}
      {hardware && (
        <BentoGrid columns={{ base: 1, sm: 2, md: 4 }} gap={4}>
          <BentoCard className="bg-gradient-to-r from-indigo-500/5 to-blue-500/5 border-indigo-500/10">
            <BentoCardHeader
              title="Total RAM"
              subtitle={`${hardware.memory.total} GB ${hardware.memory.type}-${hardware.memory.speed}`}
              icon={<Database className="w-5 h-5" />}
            />
            <BentoCardContent>
              <p className="text-muted-foreground">{hardware.memory.channels} channel{hardware.memory.channels !== 1 ? 's' : ''}</p>
            </BentoCardContent>
          </BentoCard>
          
          {hardware.storage.map((disk, i) => (
            <BentoCard key={i} className="bg-gradient-to-r from-green-500/5 to-teal-500/5 border-green-500/10">
              <BentoCardHeader
                title={disk.type}
                subtitle={disk.model}
                icon={<HardDrive className="w-5 h-5" />}
              />
              <BentoCardContent>
                <p className="text-muted-foreground">{disk.size} GB • {disk.smartStatus}</p>
              </BentoCardContent>
            </BentoCard>
          ))}
        </BentoGrid>
      )}

      {/* SMART Data */}
      {smartData.length > 0 && (
        <BentoCard>
          <BentoCardHeader
            title="SMART Health Status"
            subtitle="Self-Monitoring, Analysis and Reporting Technology"
            icon={<TrendingUp className="w-5 h-5" />}
            action={
              <button
                onClick={handleRefreshSMART}
                className="px-3 py-1.5 bg-transparent border border-border text-foreground rounded-lg text-sm font-medium hover:bg-accent hover:border-primary/50 transition-colors"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Refresh
              </button>
            }
          />
          <BentoCardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="p-3">Drive</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Predicted Failure</th>
                  </tr>
                </thead>
                <tbody>
                  {smartData.map((drive: any, i: number) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="p-3 font-mono text-xs">{drive.InstanceName}</td>
                      <td className="p-3">
                        <span className={cn(
                          'px-2 py-0.5 rounded-full text-xs',
                          drive.PredictFailure ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
                        )}>
                          {drive.PredictFailure ? '⚠️ Warning' : '✅ Healthy'}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-xs">{drive.Reason || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </BentoCardContent>
        </BentoCard>
      )}

      {/* Tweaks */}
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
      </div>
    </div>
  );
}

function groupByCategory(tweaks: any[]) {
  const grouped: Record<string, any[]> = {};
  tweaks.forEach(t => {
    if (!grouped[t.category]) grouped[t.category] = [];
    grouped[t.category].push(t);
  });
  return Object.entries(grouped).map(([category, tweaks]) => ({ category, tweaks }));
}

function formatCategory(category: string): string {
  return category.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
}