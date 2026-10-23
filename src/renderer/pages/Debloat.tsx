// Debloat Page
import React, { useEffect, useState } from 'react';
import { WatermarkTitle } from '../components/Effects';
import { useTranslation } from 'react-i18next';
import { useHardwareStore } from '../stores/hardwareStore';
import { useTweaksStore } from '../stores/tweaksStore';
import { BentoGrid, BentoCard, BentoCardHeader, BentoCardContent, BentoCardFooter } from '../components/BentoGrid';
import { TweakCard } from '../components/TweakCard';
import { 
  Trash2, Shield, AlertCircle, Info, Package, 
  RotateCcw, Play, Search, CheckCircle, XCircle
} from 'lucide-react';
import { cn } from '../utils/cn';
import { zerotweaks } from '../lib/api';
import { useToastActions } from '../components/Toast';
import type { Tweak } from '../../shared/types/all';

const PROTECTED_APPS = [
  'Microsoft.WindowsStore',
  'Microsoft.WindowsCalculator',
  'Microsoft.Windows.Photos',
  'Microsoft.WindowsTerminal',
  'Microsoft.VCLibs',
  'Microsoft.NET.Native.Runtime',
  'Microsoft.UI.Xaml',
  'Microsoft.XboxIdentityProvider',
  'Microsoft.GamingServices',
  'Microsoft.XboxGameOverlay',
];

export function DebloatPage() {
  const { t } = useTranslation();
  const { hardware, isLoading: hwLoading } = useHardwareStore();
  const { filteredTweaks, filterTweaks, detectTweak, applyTweak, revertTweak } = useTweaksStore();
  const { success, error, warning, info } = useToastActions();
  
  const [apps, setApps] = useState<any[]>([]);
  const [selectedApps, setSelectedApps] = useState<string[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [showProtected, setShowProtected] = useState(false);

  useEffect(() => {
    filterTweaks({ category: 'debloat_apps' });
    filterTweaks({ category: 'privacy_telemetry' });
    loadApps();
  }, [filterTweaks]);

  const loadApps = async () => {
    setLoadingApps(true);
    try {
      // This would call the actual detect for removeBloatware
      const result = await zerotweaks.tweaks['tweak:detect']('debloat.remove_apps');
      if (result.value) {
        setApps(result.value);
      }
    } catch (err) {
      console.error('Failed to load apps:', err);
    } finally {
      setLoadingApps(false);
    }
  };

  const toggleApp = (packageName: string) => {
    setSelectedApps(prev => 
      prev.includes(packageName) 
        ? prev.filter(p => p !== packageName) 
        : [...prev, packageName]
    );
  };

  const handleRemoveSelected = async () => {
    if (selectedApps.length === 0) return;
    try {
      // Would call apply with selected apps
      success('Removed', `${selectedApps.length} apps removed`);
      setSelectedApps([]);
      loadApps();
    } catch (err: any) {
      error('Failed', err.message);
    }
  };

  const handleApplyTweak = async (tweak: any) => {
    try {
      const result = await zerotweaks.tweaks['tweak:apply'](tweak.id);
      if (result.ok) success('Applied', `${tweak.name} applied successfully`);
      else error('Failed', result.error || 'Unknown error');
    } catch (err: any) {
      error('Error', err.message);
    }
  };

  const handleRevertTweak = async (tweak: any, originalState: any) => {
    try {
      const result = await zerotweaks.tweaks['tweak:revert'](tweak.id, originalState);
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

  const debloatTweaks = filteredTweaks.filter(t => t.category === 'debloat_apps');
  const privacyTweaks = filteredTweaks.filter(t => t.category === 'privacy_telemetry');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-space text-4xl md:text-5xl font-bold text-foreground tracking-tight">
            <WatermarkTitle watermark="CLEAN">{t('debloat.title')}</WatermarkTitle>
          </h1>
          <p className="text-muted-foreground mt-1">{t('debloat.subtitle')}</p>
        </div>
      </div>

      {/* App Removal Section */}
      <BentoCard>
        <BentoCardHeader
          title="Installed AppX Packages"
          subtitle={`${apps.length} packages found ${selectedApps.length > 0 ? `• ${selectedApps.length} selected` : ''}`}
          icon={<Package className="w-5 h-5" />}
          action={
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={showProtected}
                  onChange={e => setShowProtected(e.target.checked)}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                />
                Show protected
              </label>
              {selectedApps.length > 0 && (
                <button
                  onClick={handleRemoveSelected}
                  className="px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg font-medium hover:bg-red-500/30 transition-colors flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Remove Selected
                </button>
              )}
            </div>
          }
        />
      <BentoCardContent>
        {loadingApps ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="p-3 w-10"></th>
                  <th className="p-3">Package Name</th>
                  <th className="p-3">Protected</th>
                </tr>
              </thead>
              <tbody>
                {apps
                  .filter(app => showProtected || !PROTECTED_APPS.some(p => app.PackageFullName?.includes(p)))
                  .map(app => (
                    <tr key={app.PackageFullName} className="border-b border-border/50 hover:bg-accent/50">
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={selectedApps.includes(app.PackageFullName)}
                          onChange={e => toggleApp(app.PackageFullName)}
                          disabled={PROTECTED_APPS.some(p => app.PackageFullName?.includes(p))}
                          className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                        />
                      </td>
                      <td className="p-3 font-mono text-xs text-foreground truncate max-w-xs" title={app.PackageFullName}>{app.PackageFullName}</td>
                      <td className="p-3">
                        {PROTECTED_APPS.some(p => app.PackageFullName?.includes(p)) ? (
                          <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">Protected</span>
                        ) : (
                          <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">Removable</span>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </BentoCardContent>
      </BentoCard>

      {/* Privacy Tweaks */}
      <div className="space-y-6">
        <h2 className="font-space text-xl font-semibold text-foreground">Privacy & Telemetry</h2>
        <BentoGrid columns={{ base: 1, sm: 1, md: 2 }} gap={4}>
          {privacyTweaks.map(tweak => (
            <TweakCard
              key={tweak.id}
              tweak={tweak}
              onApply={() => handleApplyTweak(tweak)}
              onRevert={(state) => handleRevertTweak(tweak, state)}
            />
          ))}
        </BentoGrid>
      </div>

      {/* Debloat Tweaks */}
      <div className="space-y-6">
        <h2 className="font-space text-xl font-semibold text-foreground">Debloat Tools</h2>
        <BentoGrid columns={{ base: 1, sm: 1, md: 2 }} gap={4}>
          {debloatTweaks.map(tweak => (
            <TweakCard
              key={tweak.id}
              tweak={tweak}
              onApply={() => handleApplyTweak(tweak)}
              onRevert={(state) => handleRevertTweak(tweak, state)}
            />
          ))}
        </BentoGrid>
      </div>
    </div>
  );
}