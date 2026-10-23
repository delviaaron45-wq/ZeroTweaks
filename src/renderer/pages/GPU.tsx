// GPU Page
import React, { useEffect, useState } from 'react';
import { WatermarkTitle } from '../components/Effects';
import { useTranslation } from 'react-i18next';
import { useHardwareStore } from '../stores/hardwareStore';
import { useTweaksStore } from '../stores/tweaksStore';
import { BentoGrid, BentoCard, BentoCardHeader, BentoCardContent, BentoCardFooter } from '../components/BentoGrid';
import { TweakCard } from '../components/TweakCard';
import { 
  Cpu, Zap, Shield, AlertCircle, Info, ExternalLink, 
  Download, RotateCcw, CheckCircle, Loader2
} from 'lucide-react';
import { cn } from '../utils/cn';
import { zerotweaks } from '../lib/api';
import { useToastActions } from '../components/Toast';
import type { Tweak } from '../../shared/types/all';

const GPU_VENDORS = ['NVIDIA', 'AMD', 'Intel'] as const;

export function GPUPage() {
  const { t } = useTranslation();
  const { hardware, isLoading: hwLoading } = useHardwareStore();
  const { filteredTweaks, filterTweaks, detectTweak, applyTweak, revertTweak } = useTweaksStore();
  const { success, error, warning, info } = useToastActions();
  
  const [vendorFilter, setVendorFilter] = useState<'all' | 'NVIDIA' | 'AMD' | 'Intel'>('all');
  const [isDetecting, setIsDetecting] = useState<string | null>(null);
  const [driverInfo, setDriverInfo] = useState<string>('');

  useEffect(() => {
    filterTweaks({ category: 'gpu' });
  }, [filterTweaks]);

  useEffect(() => {
    if (hardware) {
      setDriverInfo(hardware.gpu.driverVersion);
    }
  }, [hardware]);

  const handleVendorFilter = (vendor: 'all' | 'NVIDIA' | 'AMD' | 'Intel') => {
    setVendorFilter(vendor);
    if (vendor === 'all') {
      filterTweaks({ category: 'gpu' });
    } else {
      filterTweaks({ category: 'gpu', search: vendor.toLowerCase() });
    }
  };

  const handleApplyTweak = async (tweak: Tweak) => {
    setIsDetecting(tweak.id);
    try {
      const result = await applyTweak(tweak.id);
      if (result.ok) {
        success('Applied', `${tweak.name} applied successfully`);
      } else {
        error('Failed', result.error || 'Unknown error');
      }
    } catch (err: any) {
      error('Error', err.message);
    } finally {
      setIsDetecting(null);
    }
  };

  const handleRevertTweak = async (tweak: Tweak, originalState: any) => {
    try {
      const result = await revertTweak(tweak.id, originalState);
      if (result.ok) {
        success('Reverted', `${tweak.name} reverted successfully`);
      } else {
        error('Failed', result.error || 'Unknown error');
      }
    } catch (err: any) {
      error('Error', err.message);
    }
  };

  const handleCheckDriverUpdate = async () => {
    info('Driver Check', 'Opening manufacturer website...');
    let url = '';
    if (hardware?.gpu.vendor === 'NVIDIA') url = 'https://www.nvidia.com/Download/index.aspx';
    else if (hardware?.gpu.vendor === 'AMD') url = 'https://www.amd.com/en/support';
    else if (hardware?.gpu.vendor === 'Intel') url = 'https://www.intel.com/content/www/us/en/download-center.html';
    if (url) await zerotweaks.utils.openExternal(url);
  };

  if (hwLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const gpuTweaks = filteredTweaks.filter(t => 
    vendorFilter === 'all' || t.compatibility.gpuVendors?.includes(vendorFilter)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-space text-4xl md:text-5xl font-bold text-foreground tracking-tight">
            <WatermarkTitle watermark="GPU">{t('gpu.title')}</WatermarkTitle>
          </h1>
          <p className="text-muted-foreground mt-1">{t('gpu.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleCheckDriverUpdate}
            className="px-4 py-2 bg-transparent border border-border text-foreground rounded-lg font-medium hover:bg-accent hover:border-primary/50 transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Check Driver Updates
          </button>
        </div>
      </div>

      {/* GPU Info Card */}
      {hardware && (
        <BentoCard className="bg-gradient-to-r from-primary/5 to-accent-pink/5 border-primary/10">
          <BentoCardHeader
            title="Detected GPU"
            subtitle={`${hardware.gpu.vendor} • ${hardware.gpu.model}`}
            icon={<Cpu className="w-5 h-5" />}
            action={
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Driver:</span>
                <span className="font-mono text-sm text-foreground">{hardware.gpu.driverVersion}</span>
                <span className="text-sm text-muted-foreground">|</span>
                <span className="text-sm text-muted-foreground">VRAM:</span>
                <span className="font-mono text-sm text-foreground">{(hardware.gpu.vram / 1024).toFixed(1)} GB</span>
              </div>
            }
          />
          <BentoCardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <FeatureBadge 
                label="HAGS Support" 
                enabled={hardware.gpu.supportsHAGS} 
                description="Hardware Accelerated GPU Scheduling"
              />
              <FeatureBadge 
                label="Resizable BAR" 
                enabled={hardware.gpu.supportsResizableBAR} 
                description="Smart Access Memory / Resizable BAR"
              />
              <FeatureBadge 
                label="NVIDIA Reflex" 
                enabled={hardware.gpu.vendor === 'NVIDIA'} 
                description="Low latency mode (RTX 20+ series)"
              />
              <FeatureBadge 
                label="AMD Anti-Lag" 
                enabled={hardware.gpu.vendor === 'AMD'} 
                description="Radeon Anti-Lag (RX 5000+ series)"
              />
            </div>
          </BentoCardContent>
        </BentoCard>
      )}

      {/* Vendor Filter */}
      <BentoCard variant="outlined">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">Filter by vendor:</span>
          {GPU_VENDORS.map(v => (
            <button
              key={v}
              onClick={() => handleVendorFilter(v)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                vendorFilter === v
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-transparent border border-border hover:bg-accent'
              )}
            >
              {v}
            </button>
          ))}
          <button
            onClick={() => handleVendorFilter('all')}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              vendorFilter === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'bg-transparent border border-border hover:bg-accent'
            )}
          >
            All
          </button>
        </div>
      </BentoCard>

      {/* GPU Tweaks */}
      <div className="space-y-6">
        {gpuTweaks.length === 0 ? (
          <BentoCard variant="outlined" className="text-center py-12">
            <Cpu className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No GPU tweaks found</h3>
            <p className="text-muted-foreground">Try adjusting your filters</p>
          </BentoCard>
        ) : (
          <>
            {groupByCategory(gpuTweaks).map(({ category, tweaks }) => (
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
                      isDetecting={isDetecting === tweak.id}
                      onApply={() => handleApplyTweak(tweak)}
                      onRevert={(state) => handleRevertTweak(tweak, state)}
                    />
                  ))}
                </BentoGrid>
              </section>
            ))}
          </>
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

function FeatureBadge({ label, enabled, description }: { label: string; enabled: boolean; description: string }) {
  return (
    <div className="p-4 bg-accent/50 rounded-lg border border-border/50">
      <div className="flex items-center gap-3">
        <div className={cn(
          'w-10 h-10 rounded-lg flex items-center justify-center',
          enabled ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
        )}>
          {enabled ? <CheckCircle className="w-5 h-5" /> : <Info className="w-5 h-5" />}
        </div>
        <div>
          <p className="font-medium text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  );
}