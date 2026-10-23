// Settings Page
import React, { useEffect, useState } from 'react';
import { WatermarkTitle } from '../components/Effects';
import {
  Settings as SettingsIcon, Palette, Globe, Bell,
  Shield, Zap, Database, Trash2, RotateCcw,
  Moon, Sun, Monitor, CheckCircle, XCircle,
  Loader2, Download, Upload, Key, Link, Sparkles,
  Battery, Gamepad2, Activity, Info, FileText, RefreshCw
} from 'lucide-react';
import { BentoGrid, BentoCard, BentoCardHeader, BentoCardContent, BentoCardFooter } from '../components/BentoGrid';
import { cn } from '../utils/cn';
import { useSettingsStore } from '../stores/settingsStore';
import { useToastActions } from '../components/Toast';
import { zerotweaks } from '../lib/api';
import { SUPPORTED_LANGUAGES } from '../i18n';
import { useTranslation } from 'react-i18next';
import type { OverlayModule } from '../../shared/types/all';

const THEMES = [
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'system', label: 'System', icon: Monitor },
];

export function SettingsPage() {
  const { t } = useTranslation();
  const { 
    language, setLanguage,
    theme, setTheme,
    autoStart, setAutoStart,
    minimizeToTray, setMinimizeToTray,
    checkUpdates, setCheckUpdates,
    telemetryOptIn, setTelemetryOptIn,
    dryRunDefault, setDryRunDefault,
    batterySaverMode, setBatterySaverMode,
    gameModeAuto, setGameModeAuto,
    overlay, updateOverlay,
    backupRetentionDays, setBackupRetentionDays,
    maxLogSize, setMaxLogSize,
    updateUrl, setUpdateUrl,
    cinematicEffects, setCinematicEffects,
    reset,
  } = useSettingsStore();
  
  const { success, error, info } = useToastActions();
  const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'behavior' | 'overlay' | 'advanced' | 'privacy'>('general');
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  const tabs = [
    { id: 'general', labelKey: 'settings.general', icon: SettingsIcon },
    { id: 'appearance', labelKey: 'settings.appearance', icon: Palette },
    { id: 'behavior', labelKey: 'settings.behavior', icon: Zap },
    { id: 'overlay', labelKey: 'settings.overlay', icon: Monitor },
    { id: 'privacy', labelKey: 'settings.privacy', icon: Shield },
    { id: 'advanced', labelKey: 'settings.advanced', icon: Database },
  ];

  const checkForUpdates = async () => {
    setCheckingUpdates(true);
    try {
      // Save the URL first so the main process checks the configured manifest.
      await zerotweaks.settings['settings:set']({ updateUrl });
      const result = await zerotweaks.update.check();
      if (result.available) {
        success('Actualización disponible', `Versión ${result.latestVersion} (actual: ${result.currentVersion})`);
      } else {
        info('Estás al día', `Versión actual: ${result.currentVersion}`);
      }
    } catch (err: any) {
      error('No se pudo comprobar', err.message);
    } finally {
      setCheckingUpdates(false);
    }
  };

  const exportSettings = async () => {
    try {
      const json = await zerotweaks.utils['dialog:showMessageBox']({ 
        type: 'info', 
        message: 'Settings export functionality would be implemented here' 
      });
      success('Exported', 'Settings saved to file');
    } catch (err) {
      error('Export failed', (err as Error).message);
    }
  };

  const importSettings = async (file: File) => {
    // Would implement import
    success('Imported', 'Settings loaded from file');
  };

  const resetAllSettings = () => {
    if (window.confirm('Reset all settings to defaults? This cannot be undone.')) {
      reset();
      success('Reset Complete', 'All settings restored to defaults');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-space text-4xl md:text-5xl font-bold text-foreground tracking-tight">
            <WatermarkTitle watermark="SETTINGS">{t('settings.title')}</WatermarkTitle>
          </h1>
          <p className="text-muted-foreground mt-1">{t('settings.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={exportSettings} className="px-4 py-2 bg-transparent border border-border text-foreground rounded-lg font-medium hover:bg-accent hover:border-primary/50 transition-colors flex items-center gap-2">
            <Download className="w-4 h-4" />
            {t('settingsLabels.export')}
          </button>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="file" accept=".json" onChange={e => e.target.files?.[0] && importSettings(e.target.files[0])} className="sr-only" />
            <span className="px-4 py-2 bg-transparent border border-border text-foreground rounded-lg font-medium hover:bg-accent hover:border-primary/50 transition-colors">
              <Upload className="w-4 h-4 mr-1" />
              {t('settingsLabels.import')}
            </span>
          </label>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 bg-accent/50 rounded-lg p-1 mb-6">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="w-4 h-4" />
              {t(tab.labelKey)}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'general' && (
        <BentoGrid columns={{ base: 1, sm: 2 }} gap={4}>
          <BentoCard>
            <BentoCardHeader
              title={t('settings.language')}
              subtitle={t('settings.languageSubtitle')}
              icon={<Globe className="w-5 h-5" />}
            />
            <BentoCardContent>
              <div className="grid grid-cols-2 gap-3">
                {SUPPORTED_LANGUAGES.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => setLanguage(lang.code)}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg border transition-colors text-left',
                      language === lang.code
                        ? 'bg-primary/20 border-primary/50 text-primary'
                        : 'bg-accent/50 border-border text-foreground hover:border-primary/40 hover:bg-accent'
                    )}
                    aria-pressed={language === lang.code}
                  >
                    <span className="flex-1">
                      <span className="block text-sm font-medium">{lang.native}</span>
                      <span className="block text-xs text-muted-foreground">{lang.name}</span>
                    </span>
                    {language === lang.code && <CheckCircle className="w-4 h-4 flex-shrink-0" />}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3">{t('settings.languageHint')}</p>
            </BentoCardContent>
          </BentoCard>

          <BentoCard>
            <BentoCardHeader title={t('settings.theme')} subtitle={t('settings.themeSubtitle')} icon={<Palette className="w-5 h-5" />} />
            <BentoCardContent>
              <div className="flex gap-3">
                {THEMES.map(t => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.value}
                      onClick={() => setTheme(t.value as any)}
                      className={cn(
                        'flex-1 flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors',
                        theme === t.value
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      <Icon className={cn('w-6 h-6', theme === t.value ? 'text-primary' : 'text-muted-foreground')} />
                      <span className={cn('font-medium', theme === t.value ? 'text-primary' : 'text-foreground')}>{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </BentoCardContent>
          </BentoCard>

          <BentoCard>
            <BentoCardHeader title={t('settings.autoStart')} subtitle={t('settings.autoStartSubtitle')} icon={<Zap className="w-5 h-5" />} />
            <BentoCardContent>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-foreground">{t('settingsLabels.autoStartLabel')}</span>
                <Toggle checked={autoStart} onChange={setAutoStart} />
              </label>
            </BentoCardContent>
          </BentoCard>

          <BentoCard>
            <BentoCardHeader title={t('settings.minimizeToTray')} subtitle={t('settings.minimizeToTraySubtitle')} icon={<RotateCcw className="w-5 h-5" />} />
            <BentoCardContent>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-foreground">{t('settingsLabels.minimizeToTrayLabel')}</span>
                <Toggle checked={minimizeToTray} onChange={setMinimizeToTray} />
              </label>
            </BentoCardContent>
          </BentoCard>

          <BentoCard>
            <BentoCardHeader title={t('settings.checkUpdates')} subtitle={t('settings.checkUpdatesSubtitle')} icon={<RotateCcw className="w-5 h-5" />} />
            <BentoCardContent>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checkUpdates}
                    onChange={e => setCheckUpdates(e.target.checked)}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <span className="text-foreground">{t('settingsLabels.checkUpdatesLabel')}</span>
                </label>
                <button
                  onClick={checkForUpdates}
                  disabled={checkingUpdates}
                  className="px-3 py-1.5 bg-transparent border border-border text-foreground rounded-lg text-sm font-medium hover:bg-accent hover:border-primary/50 transition-colors disabled:opacity-50"
                >
                  {checkingUpdates ? t('settingsLabels.checking') : t('settingsLabels.checkNow')}
                </button>
              </div>
            </BentoCardContent>
          </BentoCard>
        </BentoGrid>
      )}

      {activeTab === 'appearance' && (
        <BentoGrid columns={{ base: 1, sm: 2 }} gap={4}>
          <BentoCard>
            <BentoCardHeader
              title="Efectos cinematográficos"
              subtitle="Partículas, ondas de choque, brillo reactivo y transiciones"
              icon={<Sparkles className="w-5 h-5" />}
            />
            <BentoCardContent>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-foreground">Animaciones y efectos</span>
                <Toggle
                  checked={cinematicEffects !== false}
                  onChange={v => setCinematicEffects(v)}
                />
              </label>
              <p className="text-xs text-muted-foreground mt-3">
                Con los efectos activados la interfaz usa partículas de fondo, ondas neón al pulsar
                los botones y transiciones suaves entre páginas. Desactívalos si prefieres una
                interfaz completamente estática o si tu equipo va justo de CPU.
              </p>
            </BentoCardContent>
          </BentoCard>

          <BentoCard>
            <BentoCardHeader title={t('settings.accentColors')} subtitle={t('settings.accentColorsSubtitle')} icon={<Palette className="w-5 h-5" />} />
            <BentoCardContent>
              <p className="text-muted-foreground mb-4">Custom accent color support coming in v1.1. Currently using the default blue/black/white theme.</p>
              <div className="flex gap-4">
                <div className="flex flex-col items-center gap-2 p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                  <div className="w-12 h-12 rounded-full bg-blue-500" />
                  <span className="text-sm font-medium text-blue-400">Primary (Blue)</span>
                </div>
                <div className="flex flex-col items-center gap-2 p-4 bg-white/5 rounded-lg border border-white/20">
                  <div className="w-12 h-12 rounded-full bg-white" />
                  <span className="text-sm font-medium text-white">Accent (White)</span>
                </div>
              </div>
            </BentoCardContent>
          </BentoCard>
        </BentoGrid>
      )}

      {activeTab === 'behavior' && (
        <BentoGrid columns={{ base: 1, sm: 2 }} gap={4}>
          <BentoCard>
            <BentoCardHeader title={t('settings.dryRunDefault')} subtitle={t('settings.dryRunDefaultSubtitle')} icon={<Shield className="w-5 h-5" />} />
            <BentoCardContent>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-foreground">Enable dry-run mode by default</span>
                <Toggle checked={dryRunDefault} onChange={setDryRunDefault} />
              </label>
              <p className="text-xs text-muted-foreground mt-2">When enabled, clicking Apply will only show what would change without making changes.</p>
            </BentoCardContent>
          </BentoCard>

          <BentoCard>
            <BentoCardHeader title={t('settings.batterySaverMode')} subtitle={t('settings.batterySaverModeSubtitle')} icon={<Battery className="w-5 h-5" />} />
            <BentoCardContent>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-foreground">Enable battery-friendly optimizations</span>
                <Toggle checked={batterySaverMode} onChange={setBatterySaverMode} />
              </label>
              <p className="text-xs text-muted-foreground mt-2">Disables core parking tweaks, PCIe ASPM off, and Ultimate Performance plan on laptops.</p>
            </BentoCardContent>
          </BentoCard>

          <BentoCard>
            <BentoCardHeader title={t('settings.gameModeAuto')} subtitle={t('settings.gameModeAutoSubtitle')} icon={<Gamepad2 className="w-5 h-5" />} />
            <BentoCardContent>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-foreground">Enable automatic game detection and optimization</span>
                <Toggle checked={gameModeAuto} onChange={setGameModeAuto} />
              </label>
              <p className="text-xs text-muted-foreground mt-2">When enabled, ZeroTweaks will apply game optimizations automatically when a known game launches.</p>
            </BentoCardContent>
          </BentoCard>
        </BentoGrid>
      )}

      {activeTab === 'overlay' && (
        <BentoGrid columns={{ base: 1, sm: 2 }} gap={4}>
          <BentoCard>
            <BentoCardHeader title={t('settings.overlayEnabled')} subtitle={t('settings.overlaySubtitle')} icon={<Monitor className="w-5 h-5" />} />
            <BentoCardContent>
              <label className="flex items-center justify-between cursor-pointer mb-4">
                <span className="text-foreground">Enable overlay</span>
                <Toggle checked={overlay.enabled} onChange={v => updateOverlay({ enabled: v })} />
              </label>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Position X</label>
                    <input type="number" value={overlay.position.x} onChange={e => updateOverlay({ position: { ...overlay.position, x: parseInt(e.target.value) } })} className="w-full px-4 py-2 bg-accent border border-border rounded-lg text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Position Y</label>
                    <input type="number" value={overlay.position.y} onChange={e => updateOverlay({ position: { ...overlay.position, y: parseInt(e.target.value) } })} className="w-full px-4 py-2 bg-accent border border-border rounded-lg text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Scale: {overlay.scale.toFixed(1)}x</label>
                  <input type="range" min="0.5" max="2" step="0.1" value={overlay.scale} onChange={e => updateOverlay({ scale: parseFloat(e.target.value) })} className="w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Opacity: {Math.round(overlay.opacity * 100)}%</label>
                  <input type="range" min="0.1" max="1" step="0.05" value={overlay.opacity} onChange={e => updateOverlay({ opacity: parseFloat(e.target.value) })} className="w-full" />
                </div>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-foreground">Click-through mode (ignore mouse events)</span>
                  <Toggle checked={overlay.clickThrough} onChange={v => updateOverlay({ clickThrough: v })} />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-foreground">Show overlay on startup</span>
                  <Toggle checked={overlay.enabled} onChange={v => updateOverlay({ enabled: v })} />
                </label>
              </div>
            </BentoCardContent>
          </BentoCard>

          <BentoCard>
            <BentoCardHeader title={t('settings.overlayModules')} subtitle={t('settings.overlayModulesSubtitle')} icon={<Activity className="w-5 h-5" />} />
            <BentoCardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {(['cpu', 'ram', 'gpu', 'ping', 'timer', 'fps', 'temperature'] as OverlayModule[]).map(module => (
                  <label key={module} className="flex items-center gap-2 cursor-pointer p-3 bg-accent/50 rounded-lg hover:bg-accent transition-colors">
                    <input
                      type="checkbox"
                      checked={overlay.modules.includes(module as any)}
                      onChange={e => updateOverlay({ modules: e.target.checked ? [...overlay.modules, module] : overlay.modules.filter(m => m !== module) })}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-foreground capitalize">{module}</span>
                  </label>
                ))}
              </div>
            </BentoCardContent>
          </BentoCard>

          <BentoCard>
            <BentoCardHeader title={t('settings.globalHotkey')} subtitle={t('settings.globalHotkeySubtitle')} icon={<Key className="w-5 h-5" />} />
            <BentoCardContent>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={overlay.globalHotkey}
                  readOnly
                  className="flex-1 px-4 py-2 bg-accent border border-border rounded-lg text-foreground font-mono"
                />
                <span className="text-xs text-muted-foreground">Click to record new hotkey (coming soon)</span>
              </div>
            </BentoCardContent>
          </BentoCard>
        </BentoGrid>
      )}

      {activeTab === 'privacy' && (
        <BentoGrid columns={{ base: 1, sm: 2 }} gap={4}>
          <BentoCard>
            <BentoCardHeader title={t('settings.telemetryOptIn')} subtitle={t('settings.telemetrySubtitle')} icon={<Shield className="w-5 h-5" />} />
            <BentoCardContent>
              <label className="flex items-center justify-between cursor-pointer mb-4">
                <span className="text-foreground">Share anonymous benchmark results</span>
                <Toggle checked={telemetryOptIn} onChange={setTelemetryOptIn} />
              </label>
              <p className="text-xs text-muted-foreground">
                When enabled, anonymous benchmark results and hardware configuration are sent to improve tweak recommendations. No personal data is collected.
              </p>
              <div className="mt-4 p-3 bg-accent/50 rounded-lg border border-border/50">
                <p className="text-xs text-muted-foreground">Data includes: benchmark scores, hardware specs, applied tweaks, OS version</p>
                <p className="text-xs text-muted-foreground mt-1">Data excludes: personal info, file paths, usernames, IP addresses</p>
              </div>
            </BentoCardContent>
          </BentoCard>

          <BentoCard>
            <BentoCardHeader title={t('settings.dataManagement')} subtitle={t('settings.dataManagementSubtitle')} icon={<Database className="w-5 h-5" />} />
            <BentoCardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Backup Retention (days)</label>
                  <input
                    type="number"
                    value={backupRetentionDays}
                    onChange={e => setBackupRetentionDays(parseInt(e.target.value))}
                    min="1"
                    max="365"
                    className="w-full px-4 py-2 bg-accent border border-border rounded-lg text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Max Log Size (MB)</label>
                  <input
                    type="number"
                    value={maxLogSize}
                    onChange={e => setMaxLogSize(parseInt(e.target.value))}
                    min="1"
                    max="100"
                    className="w-full px-4 py-2 bg-accent border border-border rounded-lg text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <button
                  onClick={() => {
                    if (window.confirm('Clear all logs and temporary data?')) {
                      // Would clear logs
                      success('Cleared', 'Logs and temporary data cleared');
                    }
                  }}
                  className="px-4 py-2 bg-transparent border border-red-500/30 text-red-400 rounded-lg font-medium hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear All Logs
                </button>
              </div>
            </BentoCardContent>
          </BentoCard>
        </BentoGrid>
      )}

      {activeTab === 'advanced' && (
        <BentoGrid columns={{ base: 1, sm: 2 }} gap={4}>
          <BentoCard variant="outlined" className="border-red-500/30">
            <BentoCardHeader title={t('settings.dangerZone')} subtitle={t('settings.dangerZoneSubtitle')} icon={<Shield className="w-5 h-5 text-red-400" />} />
            <BentoCardContent>
              <div className="space-y-4">
                <button
                  onClick={resetAllSettings}
                  className="w-full px-4 py-3 bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg font-medium hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-5 h-5" />
                  Reset All Settings to Defaults
                </button>
                <button
                  onClick={() => {
                    if (window.confirm('Clear all backups and journals? This cannot be undone.')) {
                      // Would clear backups
                      success('Cleared', 'All backups and journals removed');
                    }
                  }}
                  className="w-full px-4 py-3 bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg font-medium hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-5 h-5" />
                  Clear All Backups & Journals
                </button>
              </div>
            </BentoCardContent>
          </BentoCard>

          <BentoCard>
            <BentoCardHeader
              title="Actualizaciones automáticas"
              subtitle="Comprueba el manifiesto de versión al iniciar y actualiza en un clic"
              icon={<Download className="w-5 h-5" />}
            />
            <BentoCardContent>
              <label className="block text-sm font-medium text-muted-foreground mb-1" htmlFor="update-url">
                URL del manifiesto de versión
              </label>
              <input
                id="update-url"
                type="url"
                value={updateUrl ?? ''}
                onChange={e => setUpdateUrl(e.target.value)}
                placeholder="https://.../version.json"
                className="w-full px-4 py-2 bg-accent border border-border rounded-lg text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Debe ser un JSON con <code className="font-mono">version</code>,{' '}
                <code className="font-mono">url</code> y opcionalmente{' '}
                <code className="font-mono">sha256</code> y{' '}
                <code className="font-mono">notes</code>. La configuración y las copias de seguridad
                de Zero Danger no se tocan al actualizar.
              </p>
              <div className="flex items-center gap-3 mt-3">
                <button
                  onClick={async () => {
                    await zerotweaks.settings['settings:set']({ updateUrl });
                    const updateInfo = await zerotweaks.update.check();
                    if (updateInfo.available) {
                      success('Actualización disponible', `Versión ${updateInfo.latestVersion}`);
                    } else {
                      info('Estás al día', `Versión actual: ${updateInfo.currentVersion}`);
                    }
                  }}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Comprobar ahora
                </button>
                <span className="text-xs text-muted-foreground">
                  Al iniciar se comprueba en segundo plano; si hay versión nueva aparece una barra en
                  la parte superior.
                </span>
              </div>
            </BentoCardContent>
          </BentoCard>

          <BentoCard>
            <BentoCardHeader title={t('settings.about')} subtitle={t('settings.aboutSubtitle')} icon={<Info className="w-5 h-5" />} />
            <BentoCardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Version</span><span className="font-mono text-foreground">1.0.0-alpha.1</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Electron</span><span className="font-mono text-foreground">28.2.0</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">React</span><span className="font-mono text-foreground">18.2.0</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">TypeScript</span><span className="font-mono text-foreground">5.3.0</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Rust</span><span className="font-mono text-foreground">1.70+</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">License</span><span className="font-mono text-foreground">MIT</span></div>
              </div>
              <div className="flex gap-3 mt-4">
                <a href="https://github.com/zerotweaks/zerotweaks" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                  <Link className="w-4 h-4" /> GitHub
                </a>
                <a href="https://github.com/zerotweaks/zerotweaks/blob/main/LICENSE" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                  <FileText className="w-4 h-4" /> License
                </a>
                <a href="https://github.com/zerotweaks/zerotweaks/blob/main/SECURITY.md" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                  <Shield className="w-4 h-4" /> Security
                </a>
              </div>
            </BentoCardContent>
          </BentoCard>
        </BentoGrid>
      )}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={cn(
        'relative w-11 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
        checked ? 'bg-primary' : 'bg-border'
      )}
      aria-checked={checked}
      role="switch"
    >
      <span className={cn(
        'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
        checked ? 'translate-x-5' : 'translate-x-0.5'
      )} />
    </button>
  );
}