// Peripherals Page
import React, { useEffect } from 'react';
import { WatermarkTitle } from '../components/Effects';
import { useTranslation } from 'react-i18next';
import { useHardwareStore } from '../stores/hardwareStore';
import { useTweaksStore } from '../stores/tweaksStore';
import { BentoGrid, BentoCard, BentoCardHeader, BentoCardContent } from '../components/BentoGrid';
import { TweakCard } from '../components/TweakCard';
import { 
  Mouse, Keyboard, Cpu, Shield, AlertCircle, Info,
  Wifi, Zap, RotateCcw, Play
} from 'lucide-react';
import { cn } from '../utils/cn';
import { zerotweaks } from '../lib/api';
import { useToastActions } from '../components/Toast';
import type { Tweak } from '../../shared/types/all';

export function PeripheralsInputPage() {
  const { t } = useTranslation();
  const { hardware, isLoading: hwLoading } = useHardwareStore();
  const { filteredTweaks, filterTweaks, detectTweak, applyTweak, revertTweak } = useTweaksStore();
  const { success, error, warning, info } = useToastActions();

  useEffect(() => {
    filterTweaks({ category: 'peripherals_input' });
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
            <WatermarkTitle watermark="INPUT">{t('peripherals.title')}</WatermarkTitle>
          </h1>
          <p className="text-muted-foreground mt-1">{t('peripherals.subtitle')}</p>
        </div>
      </div>

      {/* Peripheral Info */}
      {hardware && (
        <BentoGrid columns={{ base: 1, sm: 2 }} gap={4}>
          <BentoCard className="bg-gradient-to-r from-purple-500/5 to-violet-500/5 border-purple-500/10">
            <BentoCardHeader
              title="Mouse Settings"
              subtitle="Raw input and acceleration settings"
              icon={<Mouse className="w-5 h-5" />}
            />
            <BentoCardContent>
              <p className="text-muted-foreground">Disable mouse acceleration for 1:1 raw input. Essential for competitive FPS.</p>
            </BentoCardContent>
          </BentoCard>
          
          <BentoCard className="bg-gradient-to-r from-orange-500/5 to-amber-500/5 border-orange-500/10">
            <BentoCardHeader
              title="Interrupt Optimizations"
              subtitle="MSI mode and timer resolution"
              icon={<Zap className="w-5 h-5" />}
            />
            <BentoCardContent>
              <p className="text-muted-foreground">Enable Message Signaled Interrupts for GPU and network adapter. Reduce DPC latency.</p>
            </BentoCardContent>
          </BentoCard>
        </BentoGrid>
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