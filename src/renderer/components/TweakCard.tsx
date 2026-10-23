// TweakCard Component - Individual tweak display with A/B testing
// Premium media-hub card: glass surface, spotlight that follows the pointer,
// floating status label, high-definition icon and neon action buttons.
import React, { useCallback, useState } from 'react';
import {
  CheckCircle,
  AlertCircle,
  Info,
  Play,
  RotateCcw,
  BarChart2,
  Shield,
  Zap,
  FlaskConical,
  ExternalLink
} from 'lucide-react';
import { cn } from '../utils/cn';
import { useTweaksStore } from '../stores/tweaksStore';
import { useRipple } from './Effects';
import type { Tweak, TweakState, TweakResult } from '../../shared/types/all';

interface TweakCardProps {
  tweak: Tweak;
  state?: TweakState;
  onApply?: () => Promise<unknown>;
  onRevert?: (state: TweakState) => Promise<unknown>;
  onTest?: () => Promise<void>;
  onVerify?: () => Promise<void>;
  isDetecting?: boolean;
  showSelection?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  compact?: boolean;
}

// Complete class strings on purpose: Tailwind only emits the classes it can
// see literally in the source, so the old `bg-${color}` concatenation never
// produced a background.
const riskStyles = {
  safe: {
    icon: Shield,
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10',
    ring: 'ring-emerald-400/25',
    label: 'Safe',
  },
  moderate: {
    icon: Zap,
    color: 'text-amber-400',
    bg: 'bg-amber-400/10',
    ring: 'ring-amber-400/25',
    label: 'Moderate',
  },
  advanced: {
    icon: FlaskConical,
    color: 'text-rose-400',
    bg: 'bg-rose-400/10',
    ring: 'ring-rose-400/25',
    label: 'Advanced',
  },
};

const evidenceIcons = {
  measured: { icon: BarChart2, color: 'text-sky-400', label: 'Measured' },
  debated: { icon: AlertCircle, color: 'text-orange-400', label: 'Debated' },
  placebo: { icon: Info, color: 'text-gray-400', label: 'Placebo' },
};

// Floating status label: the applied state wins, otherwise the impact level the
// user was promised (kept honest: never a fixed number, only the range class).
const impactTags: Record<string, { label: string; className: string }> = {
  bajo: { label: 'Poco impacto', className: 'text-blue-300 border-blue-400/30 bg-blue-400/10' },
  medio: { label: 'Impacto medio', className: 'text-amber-400 border-amber-400/30 bg-amber-400/10' },
  alto: { label: 'Impacto alto', className: 'text-rose-400 border-rose-400/30 bg-rose-400/10' },
};

const appliedTag = { label: 'Aplicado', className: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10' };

export function TweakCard({
  tweak,
  state,
  onApply,
  onRevert,
  onTest,
  onVerify,
  showSelection = false,
  isSelected = false,
  onToggleSelect,
  compact = false,
}: TweakCardProps) {
  const { dryRun } = useTweaksStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const { containerRef, ripplesLayer } = useRipple<HTMLDivElement>();

  const applied = state?.existed ?
    (state.value !== undefined && state.value !== null) : false;

  const risk = riskStyles[tweak.risk] ?? riskStyles.safe;
  const RiskIcon = risk.icon;
  const EvidenceIcon = evidenceIcons[tweak.evidence]?.icon ?? Info;
  const impact = impactTags[tweak.impacto] ?? impactTags.medio;
  const status = applied ? appliedTag : impact;

  // Spotlight: the glow follows the pointer across the card.
  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const node = containerRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    node.style.setProperty('--mouse-x', `${event.clientX - rect.left}px`);
    node.style.setProperty('--mouse-y', `${event.clientY - rect.top}px`);
  }, []);

  const handleApply = async () => {
    if (!onApply) return;
    setIsApplying(true);
    try {
      await onApply();
    } finally {
      setIsApplying(false);
    }
  };

  const handleRevert = async () => {
    if (!onRevert || !state) return;
    setIsApplying(true);
    try {
      await onRevert(state);
    } finally {
      setIsApplying(false);
    }
  };

  const handleTest = async () => {
    if (!onTest) return;
    setIsTesting(true);
    setTestResult(null);
    try {
      await onTest();
      setTestResult({ success: true, message: 'Test completed. Check benchmark results.' });
    } catch (error: any) {
      setTestResult({ success: false, message: error.message || 'Test failed' });
    } finally {
      setIsTesting(false);
    }
  };

  if (compact) {
    return (
      <div className={cn(
        'glass-surface rounded-xl flex items-center gap-3 p-3 transition-all',
        isSelected && 'border-primary/50 ring-1 ring-primary/20'
      )}>
        {showSelection && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
            aria-label="Select tweak"
          />
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-foreground">{tweak.name}</p>
          <p className="text-xs text-muted-foreground truncate" title={tweak.description}>{tweak.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <RiskIcon className={cn('w-4 h-4', risk.color)} />
          <EvidenceIcon className={cn('w-4 h-4', evidenceIcons[tweak.evidence]?.color ?? 'text-gray-400')} />
          {tweak.requiresReboot && <span className="text-xs px-2 py-0.5 bg-amber-400/15 text-amber-300 rounded">Reboot</span>}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="group glass-surface spotlight relative"
    >
      {/* Floating status label */}
      <span className={cn(
        'status-tag absolute right-4 top-4 z-10',
        status.className
      )}>
        <span className="status-tag-dot" />
        {status.label}
      </span>

      <div className="p-5">
        {/* Header: selection, high-definition icon and title. The right padding
            keeps the title clear of the floating status label. */}
        <div className="flex items-start gap-3 mb-3 pr-32">
          {showSelection && (
            <label className="cursor-pointer mt-1.5 shrink-0">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={onToggleSelect}
                className="sr-only peer"
              />
              <div className={cn(
                'w-5 h-5 rounded border-2 transition-all',
                'peer-checked:bg-primary peer-checked:border-primary',
                'border-border bg-transparent flex items-center justify-center'
              )}>
                <CheckCircle className="w-4 h-4 text-primary-foreground opacity-0 peer-checked:opacity-100" />
              </div>
            </label>
          )}

          <div className={cn(
            'w-11 h-11 rounded-xl flex items-center justify-center shrink-0',
            'ring-1 ring-inset transition-transform duration-500 group-hover:scale-105',
            risk.bg,
            risk.ring
          )}>
            <RiskIcon className={cn('w-6 h-6', risk.color)} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-space font-semibold text-foreground">{tweak.name}</h3>
              {tweak.requiresReboot && (
                <span className="text-xs px-2 py-0.5 bg-amber-400/15 text-amber-300 rounded-full flex items-center gap-1 shrink-0">
                  <RotateCcw className="w-3 h-3" /> Reboot
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
              <span className={cn('flex items-center gap-1', risk.color)}>
                <RiskIcon className="w-3 h-3" />
                {risk.label}
              </span>
              <span className={cn('flex items-center gap-1', evidenceIcons[tweak.evidence]?.color ?? 'text-gray-400')}>
                <EvidenceIcon className="w-3 h-3" />
                {evidenceIcons[tweak.evidence]?.label ?? 'Unknown'}
              </span>
              <span className="text-muted-foreground/50">•</span>
              <span className="capitalize">{tweak.category.replace('_', ' ')}</span>
            </div>
          </div>
        </div>

        {/* Description: full text, never clipped mid-word. */}
        <div className="text-sm text-muted-foreground mb-4">
          <p><strong>What it does:</strong> {tweak.description}</p>
          <p className="mt-1"><strong>When it helps:</strong> {tweak.whenHelps}</p>
        </div>

        {/* Expandable details */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors mb-3"
          aria-expanded={isExpanded}
        >
          {isExpanded ? 'Show less' : 'Show more'}
          <span className={cn('transition-transform', isExpanded ? 'rotate-180' : '')}>▼</span>
        </button>

        {isExpanded && (
          <div className="space-y-3 mb-4 p-3 rounded-xl border border-white/10 bg-white/[0.03]">
            <div className="text-xs text-muted-foreground space-y-1">
              <p><strong>When it helps:</strong> {tweak.whenHelps}</p>
              <p><strong>Risk level:</strong> {tweak.risk}</p>
              <p><strong>Evidence:</strong> {tweak.evidence}</p>
              <p><strong>Requires reboot:</strong> {tweak.requiresReboot ? 'Yes' : 'No'}</p>
              <p><strong>Compatibility:</strong> {tweak.compatibility.formFactors.join(', ')} • Windows {tweak.compatibility.windowsVersions.join(', ')}</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="btn-action btn-action--ghost !py-1 !px-2 !text-xs">
                <ExternalLink className="w-3 h-3" /> Details
              </button>
            </div>
          </div>
        )}

        {/* Current State */}
        {state && (
          <div className="mb-4 p-3 rounded-xl border border-white/10 bg-white/[0.03]">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">Current State</span>
              <span className={cn(
                'px-2 py-0.5 rounded-full text-xs font-medium',
                applied ? 'bg-emerald-400/15 text-emerald-300' : 'bg-white/10 text-gray-400'
              )}>
                {applied ? 'Applied' : 'Default'}
              </span>
            </div>
            <div className="font-mono text-xs text-foreground/80 break-all">
              {JSON.stringify(state.value, null, 2)}
            </div>
          </div>
        )}

        {/* Actions: crimson for the main action, cyan for the secondary one */}
        <div className="flex flex-wrap gap-2">
          {!applied ? (
            <button
              onClick={handleApply}
              disabled={isApplying || isTesting}
              className="btn-action btn-action--crimson flex-1 sm:flex-none"
            >
              {isApplying ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Applying...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  {dryRun ? 'Dry Run' : 'Apply'}
                </>
              )}
            </button>
          ) : (
            <>
              <button
                onClick={handleRevert}
                disabled={isApplying || isTesting}
                className="btn-action btn-action--cyan flex-1 sm:flex-none"
              >
                {isApplying ? (
                  <>
                    <span className="w-4 h-4 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
                    Reverting...
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    Revert
                  </>
                )}
              </button>
              <button
                onClick={handleTest}
                disabled={isApplying || isTesting}
                className="btn-action btn-action--ghost flex-1 sm:flex-none"
              >
                {isTesting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <BarChart2 className="w-4 h-4" />
                    A/B Test
                  </>
                )}
              </button>
            </>
          )}
        </div>

        {/* Test Result */}
        {testResult && (
          <div className={cn(
            'mt-3 p-3 rounded-xl text-sm flex items-center gap-2 border',
            testResult.success
              ? 'bg-emerald-400/10 border-emerald-400/20 text-emerald-300'
              : 'bg-rose-400/10 border-rose-400/20 text-rose-300'
          )}>
            {testResult.success ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {testResult.message}
          </div>
        )}
      </div>

      {ripplesLayer}
    </div>
  );
}
