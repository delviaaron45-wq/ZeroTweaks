// Performance Page (FPS & Gaming specific)
import React, { useEffect, useState } from 'react';
import { WatermarkTitle } from '../components/Effects';
import { useTranslation } from 'react-i18next';
import { useHardwareStore } from '../stores/hardwareStore';
import { useTweaksStore } from '../stores/tweaksStore';
import { BentoGrid, BentoCard, BentoCardHeader, BentoCardContent } from '../components/BentoGrid';
import { TweakCard } from '../components/TweakCard';
import { 
  Zap, Target, Shield, AlertCircle, Info, 
  RotateCcw, Play, BarChart2, Loader2
} from 'lucide-react';
import { cn } from '../utils/cn';
import { zerotweaks } from '../lib/api';
import { useToastActions } from '../components/Toast';
import type { Tweak } from '../../shared/types/all';

export function PerformancePage() {
  const { t } = useTranslation();
  const { hardware, isLoading: hwLoading } = useHardwareStore();
  const { filteredTweaks, filterTweaks, detectTweak, applyTweak, revertTweak } = useTweaksStore();
  const { success, error, warning, info } = useToastActions();
  
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');
  const [evidenceFilter, setEvidenceFilter] = useState('all');

  useEffect(() => {
    filterTweaks({ 
      category: 'gaming_fps',
      search,
      risk: riskFilter,
      evidence: evidenceFilter,
    });
  }, [search, riskFilter, evidenceFilter, filterTweaks]);

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

  const handleTestTweak = async (tweak: Tweak) => {
    info('A/B Test', `Testing ${tweak.name}... This will measure before/after performance.`);
    // Would run benchmark before and after
  };

  if (hwLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const RISK_OPTIONS = [
    { value: 'all', label: 'All Risks' },
    { value: 'safe', label: 'Safe' },
    { value: 'moderate', label: 'Moderate' },
    { value: 'advanced', label: 'Advanced' },
  ];

  const EVIDENCE_OPTIONS = [
    { value: 'all', label: 'All Evidence' },
    { value: 'measured', label: 'Measured' },
    { value: 'debated', label: 'Debated' },
    { value: 'placebo', label: 'Placebo' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-space text-4xl md:text-5xl font-bold text-foreground tracking-tight">
            <WatermarkTitle watermark="PERF">{t('performance.title')}</WatermarkTitle>
          </h1>
          <p className="text-muted-foreground mt-1">{t('performance.subtitle')}</p>
        </div>
      </div>

      {/* Filters */}
      <BentoCard variant="outlined" className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <input
              type="text"
              placeholder="Search tweaks..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-accent border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <Select value={riskFilter} onChange={setRiskFilter} options={RISK_OPTIONS} placeholder="Risk" />
          <Select value={evidenceFilter} onChange={setEvidenceFilter} options={EVIDENCE_OPTIONS} placeholder="Evidence" />
        </div>
      </BentoCard>

      {/* Results */}
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
                  onTest={() => handleTestTweak(tweak)}
                />
              ))}
            </BentoGrid>
          </section>
        ))}
        
        {filteredTweaks.length === 0 && (
          <BentoCard variant="outlined" className="text-center py-12">
            <Target className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No gaming tweaks found</h3>
            <p className="text-muted-foreground">Try adjusting your filters or search term</p>
          </BentoCard>
        )}
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

function Select({ value, onChange, options, placeholder }: { 
  value: string; 
  onChange: (v: string) => void; 
  options: { value: string; label: string }[];
  placeholder: string;
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="px-3 py-2 bg-accent border border-border rounded-lg text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary min-w-[140px]"
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}