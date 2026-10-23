// Game Mode Page
import React, { useEffect, useState } from 'react';
import { WatermarkTitle } from '../components/Effects';
import { useTranslation } from 'react-i18next';
import { useHardwareStore } from '../stores/hardwareStore';
import { BentoGrid, BentoCard, BentoCardHeader, BentoCardContent, BentoCardFooter } from '../components/BentoGrid';
import { TweakCard } from '../components/TweakCard';
import { 
  Play, RotateCcw, Gamepad2, Monitor, Cpu, Zap, Shield, 
  Plus, Edit, Trash2, Eye, EyeOff, ToggleLeft, ToggleRight,
  Loader2, CheckCircle, AlertCircle
} from 'lucide-react';
import { cn } from '../utils/cn';
import { zerotweaks } from '../lib/api';
import { useToastActions } from '../components/Toast';
import { GameProfilesCard, SmartGameModeCard } from './DiagnosisInsights';
import type { GameProfile, GameTweakConfig } from '../../shared/types/all';

const DEFAULT_GAME_CONFIG: GameTweakConfig = {
  powerPlan: 'ultimate',
  timerResolution: 5000,
  cpuPriority: 'high',
  gameMode: true,
  gameDVR: false,
  notifications: false,
  suspendedProcesses: ['OneDrive.exe', 'SearchIndexer.exe', 'wuauserv', 'SysMain'],
  gpuProfile: {
    common: {
      hags: true,
      gpuPreference: 'high_performance',
      fullscreenOptimizations: false,
      mpo: false,
      vrr: true,
    },
  },
};

export function GameModePage() {
  const { t } = useTranslation();
  const { hardware, isLoading } = useHardwareStore();
  const { success, error, warning, info } = useToastActions();
  
  const [gameProfiles, setGameProfiles] = useState<GameProfile[]>([]);
  const [activeGame, setActiveGame] = useState<GameProfile | null>(null);
  const [monitoring, setMonitoring] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState<GameProfile | null>(null);
  const [formData, setFormData] = useState<Partial<GameProfile> & { tweaks: GameTweakConfig }>({
    name: '',
    executable: '',
    steamId: '',
    epicId: '',
    autoApply: true,
    tweaks: DEFAULT_GAME_CONFIG,
  });

  useEffect(() => {
    loadGameProfiles();
    loadActiveGame();
  }, []);

  const loadGameProfiles = async () => {
    try {
      const profiles = await zerotweaks.game['game:list']();
      setGameProfiles(profiles);
    } catch (err: any) {
      error('Failed to load game profiles', err.message);
    }
  };

  const loadActiveGame = async () => {
    // Would listen for game state changes
  };

  const handleCreateProfile = async () => {
    try {
      await zerotweaks.game['game:create']({
        ...formData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as any);
      success('Profile Created', `${formData.name} added successfully`);
      setShowCreateModal(false);
      setFormData({ name: '', executable: '', steamId: '', epicId: '', autoApply: true, tweaks: DEFAULT_GAME_CONFIG });
      loadGameProfiles();
    } catch (err: any) {
      error('Failed to create profile', err.message);
    }
  };

  const handleUpdateProfile = async () => {
    if (!editingProfile) return;
    try {
      await zerotweaks.game['game:update'](editingProfile.id, {
        ...formData,
        updatedAt: new Date().toISOString(),
      });
      success('Profile Updated', `${formData.name} updated successfully`);
      setEditingProfile(null);
      setShowCreateModal(false);
      loadGameProfiles();
    } catch (err: any) {
      error('Failed to update profile', err.message);
    }
  };

  const handleDeleteProfile = async (id: string) => {
    if (!window.confirm('Delete this game profile?')) return;
    try {
      await zerotweaks.game['game:delete'](id);
      success('Profile Deleted', 'Game profile removed');
      loadGameProfiles();
    } catch (err: any) {
      error('Failed to delete profile', err.message);
    }
  };

  const handleStartMonitoring = async () => {
    setMonitoring(true);
    info('Monitoring Started', 'Game Mode will auto-apply for detected games');
  };

  const handleStopMonitoring = async () => {
    setMonitoring(false);
    info('Monitoring Stopped', 'Auto-apply disabled');
  };

  const handleManualLaunch = async (profile: GameProfile) => {
    try {
      await zerotweaks.game['game:start'](profile.id);
      success('Optimizations Applied', `Game Mode active for ${profile.name}`);
      setActiveGame(profile);
    } catch (err: any) {
      error('Failed to apply', err.message);
    }
  };

  const handleManualStop = async (profile: GameProfile) => {
    try {
      await zerotweaks.game['game:stop'](profile.id);
      success('Optimizations Reverted', `Game Mode disabled for ${profile.name}`);
      setActiveGame(null);
    } catch (err: any) {
      error('Failed to revert', err.message);
    }
  };

  const openCreateModal = (profile?: GameProfile) => {
    if (profile) {
      setEditingProfile(profile);
      setFormData({
        name: profile.name,
        executable: profile.executable,
        steamId: profile.steamId || '',
        epicId: profile.epicId || '',
        autoApply: profile.autoApply,
        tweaks: profile.tweaks,
      });
    } else {
      setEditingProfile(null);
      setFormData({ name: '', executable: '', steamId: '', epicId: '', autoApply: true, tweaks: DEFAULT_GAME_CONFIG });
    }
    setShowCreateModal(true);
  };

  if (isLoading) {
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
            <WatermarkTitle watermark="GAME">{t('gameMode.title')}</WatermarkTitle>
          </h1>
          <p className="text-muted-foreground mt-1">{t('gameMode.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={monitoring ? handleStopMonitoring : handleStartMonitoring}
            className={cn(
              'px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2',
              monitoring
                ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
                : 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30'
            )}
          >
            {monitoring ? <RotateCcw className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {monitoring ? 'Stop Monitoring' : 'Start Monitoring'}
          </button>
          <button
            onClick={() => openCreateModal()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Game
          </button>
        </div>
      </div>

      {/* Active Game */}
      <BentoGrid columns={{ base: 1, sm: 2 }} gap={4}>
        <BentoCard variant={activeGame ? 'elevated' : 'outlined'} className="relative overflow-hidden">
          <div className="absolute top-4 right-4">
            <span className={cn(
              'px-3 py-1 rounded-full text-xs font-medium',
              activeGame ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
            )}>
              {activeGame ? 'ACTIVE' : 'IDLE'}
            </span>
          </div>
          <BentoCardHeader
            title="Current Game Session"
            subtitle={activeGame ? `Optimizations active for ${activeGame.name}` : 'No game currently optimized'}
            icon={<Gamepad2 className="w-5 h-5" />}
          />
          <BentoCardContent>
            {activeGame ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-3 bg-accent/50 rounded-lg">
                    <p className="font-space text-2xl font-bold text-blue-400">{activeGame.tweaks.powerPlan}</p>
                    <p className="text-xs text-muted-foreground">Power Plan</p>
                  </div>
                  <div className="p-3 bg-accent/50 rounded-lg">
                    <p className="font-space text-2xl font-bold text-blue-400">{(activeGame.tweaks.timerResolution / 10000).toFixed(1)} ms</p>
                    <p className="text-xs text-muted-foreground">Timer Resolution</p>
                  </div>
                  <div className="p-3 bg-accent/50 rounded-lg">
                    <p className="font-space text-2xl font-bold text-blue-400">{activeGame.tweaks.cpuPriority}</p>
                    <p className="text-xs text-muted-foreground">CPU Priority</p>
                  </div>
                  <div className="p-3 bg-accent/50 rounded-lg">
                    <p className="font-space text-2xl font-bold text-blue-400">{activeGame.tweaks.suspendedProcesses.length}</p>
                    <p className="text-xs text-muted-foreground">Suspended Processes</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleManualStop(activeGame)}
                    className="flex-1 px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg font-medium hover:bg-red-500/30 transition-colors flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Stop Optimizations
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Gamepad2 className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">Launch a game or click "Start Monitoring" to auto-detect</p>
              </div>
            )}
          </BentoCardContent>
        </BentoCard>

        {/* Quick Stats */}
        <BentoCard>
          <BentoCardHeader
            title="Quick Stats"
            subtitle="Game Mode performance impact"
            icon={<Zap className="w-5 h-5" />}
          />
          <BentoCardContent>
            <div className="grid grid-cols-3 gap-4">
              <StatCard label="Games Configured" value={gameProfiles.length} icon={<Gamepad2 className="w-5 h-5" />} />
              <StatCard label="Auto-Apply Enabled" value={gameProfiles.filter(g => g.autoApply).length} icon={<Shield className="w-5 h-5" />} />
              <StatCard label="Monitoring" value={monitoring ? 'ON' : 'OFF'} icon={<Monitor className="w-5 h-5" />} color={monitoring ? 'text-green-400' : 'text-gray-400'} />
            </div>
          </BentoCardContent>
        </BentoCard>
      </BentoGrid>

      {/* Smart game mode + pre-game checklist (high impact insights) */}
      <SmartGameModeCard />

      {/* Tested per game profiles */}
      <GameProfilesCard />

      {/* Game Profiles */}
      <div className="space-y-4">
        <h2 className="font-space text-xl font-semibold text-foreground">Game Profiles</h2>
        <BentoGrid columns={{ base: 1, sm: 2, lg: 3 }} gap={4}>
          {gameProfiles.map(profile => (
            <BentoCard key={profile.id} hover>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 flex items-center justify-center">
                    <Gamepad2 className="w-6 h-6 text-blue-300" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">{profile.name}</h3>
                    <p className="text-xs text-muted-foreground font-mono">{profile.executable}</p>
                  </div>
                </div>
                {activeGame?.id === profile.id && (
                  <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">ACTIVE</span>
                )}
              </div>
              
              <div className="space-y-2 text-xs text-muted-foreground mb-4">
                <div className="flex justify-between"><span>Power Plan</span><span className="text-foreground">{profile.tweaks.powerPlan}</span></div>
                <div className="flex justify-between"><span>Timer Resolution</span><span className="text-foreground">{(profile.tweaks.timerResolution / 10000).toFixed(1)} ms</span></div>
                <div className="flex justify-between"><span>CPU Priority</span><span className="text-foreground">{profile.tweaks.cpuPriority}</span></div>
                <div className="flex justify-between"><span>Game DVR</span><span className="text-foreground">{profile.tweaks.gameDVR ? 'On' : 'Off'}</span></div>
                <div className="flex justify-between"><span>Auto-Apply</span><span className="text-foreground">{profile.autoApply ? 'Yes' : 'No'}</span></div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleManualLaunch(profile)}
                  disabled={activeGame?.id === profile.id}
                  className="flex-1 sm:flex-none px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  <Play className="w-3 h-3" />
                  Apply
                </button>
                <button
                  onClick={() => handleManualStop(profile)}
                  disabled={activeGame?.id !== profile.id}
                  className="flex-1 sm:flex-none px-3 py-1.5 bg-transparent border border-border text-foreground rounded-lg text-sm font-medium hover:bg-accent hover:border-primary/50 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  Revert
                </button>
                <button
                  onClick={() => openCreateModal(profile)}
                  className="px-3 py-1.5 bg-transparent border border-border text-foreground rounded-lg text-sm font-medium hover:bg-accent hover:border-primary/50 transition-colors flex items-center justify-center gap-1"
                >
                  <Edit className="w-3 h-3" />
                </button>
                <button
                  onClick={() => handleDeleteProfile(profile.id)}
                  className="px-3 py-1.5 bg-transparent border border-red-500/30 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/10 transition-colors flex items-center justify-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </BentoCard>
          ))}
          
          {gameProfiles.length === 0 && (
            <BentoCard variant="outlined" className="text-center py-12 col-span-full">
              <Gamepad2 className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No Game Profiles</h3>
              <p className="text-muted-foreground mb-4">Add your games to enable automatic optimizations</p>
              <button
                onClick={() => openCreateModal()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                Add Your First Game
              </button>
            </BentoCard>
          )}
        </BentoGrid>
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h2 className="font-space text-xl font-bold">{editingProfile ? 'Edit Game Profile' : 'Add Game Profile'}</h2>
              <button onClick={() => { setShowCreateModal(false); setEditingProfile(null); }} className="p-2 hover:bg-accent rounded-lg">
                <RotateCcw className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Game Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-2 bg-accent border border-border rounded-lg text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="e.g., Counter-Strike 2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Executable</label>
                  <input
                    type="text"
                    value={formData.executable}
                    onChange={e => setFormData({...formData, executable: e.target.value})}
                    className="w-full px-4 py-2 bg-accent border border-border rounded-lg text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="e.g., cs2.exe"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Steam App ID (optional)</label>
                  <input
                    type="text"
                    value={formData.steamId}
                    onChange={e => setFormData({...formData, steamId: e.target.value})}
                    className="w-full px-4 py-2 bg-accent border border-border rounded-lg text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="e.g., 730"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Epic Games ID (optional)</label>
                  <input
                    type="text"
                    value={formData.epicId}
                    onChange={e => setFormData({...formData, epicId: e.target.value})}
                    className="w-full px-4 py-2 bg-accent border border-border rounded-lg text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="e.g., Fortnite"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.autoApply}
                    onChange={e => setFormData({...formData, autoApply: e.target.checked})}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-foreground">Auto-apply when game launches</span>
                </label>
              </div>

              <div className="border-t border-border pt-6">
                <h3 className="font-medium text-foreground mb-4">Optimization Settings</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <SelectField
                    label="Power Plan"
                    value={formData.tweaks.powerPlan}
                    options={['ultimate', 'high', 'balanced'].map(v => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }))}
                    onChange={v => setFormData({...formData, tweaks: {...formData.tweaks, powerPlan: v as any}})}
                  />
                  <NumberField
                    label="Timer Resolution (100ns units)"
                    value={formData.tweaks.timerResolution}
                    onChange={v => setFormData({...formData, tweaks: {...formData.tweaks, timerResolution: v}})}
                    min={5000}
                    max={156250}
                    step={1000}
                  />
                  <SelectField
                    label="CPU Priority"
                    value={formData.tweaks.cpuPriority}
                    options={['normal', 'high', 'realtime'].map(v => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }))}
                    onChange={v => setFormData({...formData, tweaks: {...formData.tweaks, cpuPriority: v as any}})}
                  />
                  <CheckboxField
                    label="Enable Game Mode"
                    checked={formData.tweaks.gameMode}
                    onChange={v => setFormData({...formData, tweaks: {...formData.tweaks, gameMode: v}})}
                  />
                  <CheckboxField
                    label="Disable Game DVR"
                    checked={!formData.tweaks.gameDVR}
                    onChange={v => setFormData({...formData, tweaks: {...formData.tweaks, gameDVR: !v}})}
                  />
                  <CheckboxField
                    label="Silence Notifications"
                    checked={!formData.tweaks.notifications}
                    onChange={v => setFormData({...formData, tweaks: {...formData.tweaks, notifications: !v}})}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-border pt-6">
                <button
                  onClick={() => { setShowCreateModal(false); setEditingProfile(null); }}
                  className="px-4 py-2 bg-transparent border border-border text-foreground rounded-lg font-medium hover:bg-accent hover:border-primary/50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={editingProfile ? handleUpdateProfile : handleCreateProfile}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                >
                  {editingProfile ? 'Update Profile' : 'Create Profile'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: number | string; icon: React.ReactNode; color?: string }) {
  return (
    <div className="p-3 bg-accent/50 rounded-lg text-center">
      <div className={cn('text-2xl mb-1', color)}>{icon}</div>
      <p className="font-space text-xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium text-muted-foreground mb-1">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-4 py-2 bg-accent border border-border rounded-lg text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      >
        {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    </div>
  );
}

function NumberField({ label, value, onChange, min, max, step }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; step: number }) {
  return (
    <div>
      <label className="block text-sm font-medium text-muted-foreground mb-1">{label}</label>
      <input
        type="number"
        value={value}
        onChange={e => onChange(parseInt(e.target.value))}
        min={min}
        max={max}
        step={step}
        className="w-full px-4 py-2 bg-accent border border-border rounded-lg text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      />
    </div>
  );
}

function CheckboxField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
      />
      <span className="text-sm text-foreground">{label}</span>
    </label>
  );
}