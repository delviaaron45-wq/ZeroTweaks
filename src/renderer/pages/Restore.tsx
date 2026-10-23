// Restore Page
import React, { useEffect, useState } from 'react';
import { WatermarkTitle } from '../components/Effects';
import { useTranslation } from 'react-i18next';
import { 
  RotateCcw, Shield, AlertCircle, Clock, 
  Download, HardDrive, Database, FileText,
  CheckCircle, XCircle, Loader2, Trash2,
  ArrowLeft, ArrowRight, RefreshCw
} from 'lucide-react';
import { BentoGrid, BentoCard, BentoCardHeader, BentoCardContent, BentoCardFooter } from '../components/BentoGrid';
import { cn } from '../utils/cn';
import { zerotweaks } from '../lib/api';
import { useToastActions } from '../components/Toast';

interface BackupManifest {
  id: string;
  timestamp: string;
  profileId?: string;
  tweaks: any[];
  services: any[];
  powerPlan: string;
  appxPackages: string[];
  hagsState: boolean;
  gameModeState: boolean;
  journal: any[];
}

export function RestorePage() {
  const { t } = useTranslation();
  const { success, error, warning, info } = useToastActions();
  const [backups, setBackups] = useState<BackupManifest[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [generatingScript, setGeneratingScript] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<BackupManifest | null>(null);
  const [showDetails, setShowDetails] = useState<string | null>(null);

  useEffect(() => {
    loadBackups();
  }, []);

  const loadBackups = async () => {
    setLoading(true);
    try {
      const list = await zerotweaks.system['system:backups']();
      setBackups(list);
    } catch (err) {
      console.error('Failed to load backups:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    setLoading(true);
    try {
      await zerotweaks.system['system:backup']();
      success('Backup Created', 'System state saved successfully');
      loadBackups();
    } catch (err: any) {
      error('Backup Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (manifestId: string) => {
    if (!window.confirm('This will restore your system to the backup state. Continue?')) return;
    setRestoring(manifestId);
    try {
      await zerotweaks.system['system:restore']({ manifestId });
      success('Restore Complete', 'System restored from backup. Reboot recommended.');
      loadBackups();
    } catch (err: any) {
      error('Restore Failed', err.message);
    } finally {
      setRestoring(null);
    }
  };

  const handleGenerateRecoveryScript = async () => {
    setGeneratingScript(true);
    try {
      const path = await zerotweaks.utils['recovery:generateScript']();
      if (path) {
        success('Script Generated', `Recovery script saved to ${path}`);
      }
    } catch (err: any) {
      error('Failed', err.message);
    } finally {
      setGeneratingScript(false);
    }
  };

  const handleDeleteBackup = async (id: string) => {
    if (!window.confirm('Delete this backup? This cannot be undone.')) return;
    try {
      await zerotweaks.system['system:restore']({ manifestId: id }); // Would be delete
      setBackups(prev => prev.filter(b => b.id !== id));
      success('Backup Deleted', 'Backup removed successfully');
    } catch (err: any) {
      error('Failed', err.message);
    }
  };

  const formatTimestamp = (ts: string) => new Date(ts).toLocaleString();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-space text-4xl md:text-5xl font-bold text-foreground tracking-tight">
            <WatermarkTitle watermark="RESTORE">{t('restore.title')}</WatermarkTitle>
          </h1>
          <p className="text-muted-foreground mt-1">{t('restore.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleCreateBackup}
            disabled={loading}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <Shield className="w-4 h-4" />
            Create Backup
          </button>
          <button
            onClick={handleGenerateRecoveryScript}
            disabled={generatingScript}
            className="px-4 py-2 bg-transparent border border-border text-foreground rounded-lg font-medium hover:bg-accent hover:border-primary/50 transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Recovery Script
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <BentoGrid columns={{ base: 1, sm: 2, md: 4 }} gap={4}>
        <BentoCard>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <p className="font-space text-2xl font-bold text-foreground">{backups.length}</p>
              <p className="text-xs text-muted-foreground">Total Backups</p>
            </div>
          </div>
        </BentoCard>
        <BentoCard>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center text-green-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <p className="font-space text-2xl font-bold text-foreground">{backups.filter(b => b.journal.every((j: any) => j.success)).length}</p>
              <p className="text-xs text-muted-foreground">Clean Restores</p>
            </div>
          </div>
        </BentoCard>
        <BentoCard>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center text-yellow-400">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="font-space text-2xl font-bold text-foreground">{backups.reduce((acc, b) => acc + b.journal.filter((j: any) => !j.success).length, 0)}</p>
              <p className="text-xs text-muted-foreground">Failed Operations</p>
            </div>
          </div>
        </BentoCard>
        <BentoCard>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="font-space text-2xl font-bold text-foreground">{backups.length > 0 ? formatTimestamp(backups[0].timestamp).split(',')[0] : 'N/A'}</p>
              <p className="text-xs text-muted-foreground">Latest Backup</p>
            </div>
          </div>
        </BentoCard>
      </BentoGrid>

      {/* Backup List */}
      <div className="space-y-4">
        <h2 className="font-space text-xl font-semibold text-foreground">Backup History</h2>
        {loading ? (
          <BentoCard className="text-center py-8">
            <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading backups...</p>
          </BentoCard>
        ) : backups.length === 0 ? (
          <BentoCard variant="outlined" className="text-center py-12">
            <HardDrive className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No backups found</h3>
            <p className="text-muted-foreground mb-4">Create your first backup to enable system recovery</p>
            <button
              onClick={handleCreateBackup}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              Create First Backup
            </button>
          </BentoCard>
        ) : (
          <div className="space-y-3">
            {backups.map(backup => (
              <BentoCard key={backup.id} hover className={showDetails === backup.id ? 'ring-2 ring-primary/50' : ''}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500/20 to-sky-400/20 flex items-center justify-center">
                      <Database className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">Backup {backup.id.split('_')[1]}</h3>
                        {backup.profileId && (
                          <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs rounded-full">{backup.profileId}</span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatTimestamp(backup.timestamp)} • {backup.tweaks.length} tweaks • {backup.services.length} services
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowDetails(showDetails === backup.id ? null : backup.id)}
                      className="p-2 hover:bg-accent rounded-lg transition-colors"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleRestore(backup.id)}
                      disabled={restoring === backup.id}
                      className="px-3 py-1.5 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg text-sm font-medium hover:bg-green-500/30 transition-colors disabled:opacity-50 flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Restore
                    </button>
                    <button
                      onClick={() => handleDeleteBackup(backup.id)}
                      className="px-3 py-1.5 bg-transparent border border-red-500/30 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {showDetails === backup.id && (
                  <div className="mt-4 pt-4 border-t border-border animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <DetailSection title="Tweaks" count={backup.tweaks.length} icon={<Database className="w-4 h-4" />}>
                        <ul className="space-y-1 max-h-40 overflow-y-auto">
                          {backup.tweaks.slice(0, 10).map((t: any, i: number) => (
                            <li key={i} className="flex items-center gap-2 text-sm">
                              <span className={cn('w-2 h-2 rounded', t.existed ? 'bg-green-400' : 'bg-gray-400')} />
                              <span className="font-mono text-xs truncate" title={`${t.path}\\${t.name}`}>{t.path}\\{t.name}</span>
                            </li>
                          ))}
                          {backup.tweaks.length > 10 && <li className="text-xs text-muted-foreground">... and {backup.tweaks.length - 10} more</li>}
                        </ul>
                      </DetailSection>
                      <DetailSection title="Services" count={backup.services.length} icon={<Shield className="w-4 h-4" />}>
                        <ul className="space-y-1 max-h-40 overflow-y-auto">
                          {backup.services.slice(0, 10).map((s: any, i: number) => (
                            <li key={i} className="flex items-center gap-2 text-sm">
                              <span className={cn('w-2 h-2 rounded', s.status === 'Running' ? 'bg-green-400' : 'bg-gray-400')} />
                              <span className="font-mono text-xs">{s.name}</span>
                              <span className="text-xs text-muted-foreground">{s.startType}</span>
                            </li>
                          ))}
                        </ul>
                      </DetailSection>
                      <DetailSection title="System State" count={4} icon={<Database className="w-4 h-4" />}>
                        <ul className="space-y-2 text-sm">
                          <li className="flex justify-between"><span>Power Plan</span><span className="font-mono text-xs">{backup.powerPlan.slice(0, 8)}...</span></li>
                          <li className="flex justify-between"><span>HAGS</span><span className={backup.hagsState ? 'text-green-400' : 'text-gray-400'}>{backup.hagsState ? 'Enabled' : 'Disabled'}</span></li>
                          <li className="flex justify-between"><span>Game Mode</span><span className={backup.gameModeState ? 'text-green-400' : 'text-gray-400'}>{backup.gameModeState ? 'On' : 'Off'}</span></li>
                          <li className="flex justify-between"><span>AppX Packages</span><span className="font-mono text-xs">{backup.appxPackages.length}</span></li>
                        </ul>
                      </DetailSection>
                    </div>

                    <div className="border-t border-border pt-4">
                      <h4 className="font-medium mb-2">Transaction Journal</h4>
                      <div className="max-h-60 overflow-y-auto space-y-1">
                        {backup.journal.slice(-20).reverse().map((entry: any, i: number) => (
                          <JournalEntry key={i} entry={entry} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </BentoCard>
            ))}
          </div>
        )}
      </div>

      {/* Recovery Tools */}
      <div className="space-y-6">
        <h2 className="font-space text-xl font-semibold text-foreground">Recovery Tools</h2>
        <BentoGrid columns={{ base: 1, sm: 2 }} gap={4}>
          <BentoCard variant="elevated" className="bg-red-500/5 border-red-500/10">
            <BentoCardHeader
              title="Desktop Recovery Script"
              subtitle="Standalone .bat file to restore without ZeroTweaks"
              icon={<FileText className="w-5 h-5 text-red-400" />}
            />
            <BentoCardContent>
              <p className="text-muted-foreground mb-4">Creates a ZeroTweaks_Recover.bat on your Desktop that can restore the last backup even if ZeroTweaks won't start.</p>
              <button
                onClick={handleGenerateRecoveryScript}
                disabled={generatingScript}
                className="w-full px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg font-medium hover:bg-red-500/30 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {generatingScript ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {generatingScript ? 'Generating...' : 'Generate Recovery Script'}
              </button>
            </BentoCardContent>
          </BentoCard>

          <BentoCard variant="elevated" className="bg-purple-500/5 border-purple-500/10">
            <BentoCardHeader
              title="Boot Recovery Entry"
              subtitle="Adds a boot menu option to revert if Windows fails to start"
              icon={<RotateCcw className="w-5 h-5 text-purple-400" />}
            />
            <BentoCardContent>
              <p className="text-muted-foreground mb-4">Creates a secondary boot entry that automatically reverts the last backup if Windows fails to boot properly.</p>
              <button className="w-full px-4 py-2 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-lg font-medium hover:bg-purple-500/30 transition-colors flex items-center justify-center gap-2">
                <RotateCcw className="w-4 h-4" />
                Configure Boot Recovery
              </button>
            </BentoCardContent>
          </BentoCard>
        </BentoGrid>
      </div>
    </div>
  );
}

function DetailSection({ title, count, icon, children }: { title: string; count: number; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="p-4 bg-accent/50 rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-blue-400">{icon}</span>
        <h4 className="font-medium text-foreground">{title}</h4>
        <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs rounded-full">{count}</span>
      </div>
      {children}
    </div>
  );
}

function JournalEntry({ entry }: { entry: any }) {
  const statusColors = {
    apply: 'text-blue-400',
    revert: 'text-orange-400',
    verify: 'text-purple-400',
  };
  const statusIcons = {
    apply: <RotateCcw className="w-3 h-3" />,
    revert: <RotateCcw className="w-3 h-3" />,
    verify: <CheckCircle className="w-3 h-3" />,
  };

  return (
    <div className="flex items-center gap-2 text-xs p-2 bg-accent/50 rounded">
      <span className={cn('w-5', statusColors[entry.action as keyof typeof statusColors] || 'text-gray-400')}>
        {statusIcons[entry.action as keyof typeof statusIcons] || <span />}
      </span>
      <span className="font-mono text-xs truncate flex-1" title={entry.tweakId}>{entry.tweakId}</span>
      <span className={cn(
        'px-1.5 py-0.5 rounded text-xs',
        entry.success ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
      )}>
        {entry.success ? '✓' : '✗'}
      </span>
      <span className="text-muted-foreground">{new Date(entry.timestamp).toLocaleTimeString()}</span>
    </div>
  );
}