// Profiles Page
import React, { useEffect, useState } from 'react';
import { WatermarkTitle } from '../components/Effects';
import { useTranslation } from 'react-i18next';
import { 
  UserCog, Plus, Download, Upload, FileText, 
  Edit, Trash2, CheckCircle, Shield, Zap, 
  Monitor, Gamepad2, Battery, Loader2
} from 'lucide-react';
import { BentoGrid, BentoCard, BentoCardHeader, BentoCardContent, BentoCardFooter } from '../components/BentoGrid';
import { cn } from '../utils/cn';
import { zerotweaks } from '../lib/api';
import { useToastActions } from '../components/Toast';

interface Profile {
  id: string;
  name: string;
  description: string;
  tweaks: string[];
  hardwareProfile?: any;
  createdAt: string;
  updatedAt: string;
  signature?: string;
}

const DEFAULT_PROFILES: Profile[] = [
  {
    id: 'profile_safe',
    name: 'Safe Profile',
    description: 'Only safe, measured tweaks. No reboot required for most. Recommended for all users.',
    tweaks: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'profile_competitive',
    name: 'Competitive Gaming',
    description: 'Maximum performance for competitive gaming. Includes moderate tweaks. Requires reboot.',
    tweaks: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'profile_streamer',
    name: 'Streamer / Content Creator',
    description: 'Balanced for streaming: encoding performance, stability, OBS friendly. Keeps GameDVR for clips.',
    tweaks: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'profile_laptop',
    name: 'Laptop / Battery Optimized',
    description: 'Safe tweaks only. No core parking disable, no PCIe ASPM off. Preserves battery life.',
    tweaks: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export function ProfilesPage() {
  const { t } = useTranslation();
  const { success, error, info } = useToastActions();
  const [profiles, setProfiles] = useState<Profile[]>(DEFAULT_PROFILES);
  const [customProfiles, setCustomProfiles] = useState<Profile[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [formData, setFormData] = useState<Partial<Profile>>({
    name: '',
    description: '',
    tweaks: [],
  });
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    loadCustomProfiles();
  }, []);

  const loadCustomProfiles = async () => {
    try {
      const list = await zerotweaks.profiles['profile:list']();
      const custom = list.filter((p: Profile) => !DEFAULT_PROFILES.some(dp => dp.id === p.id));
      setCustomProfiles(custom);
    } catch (err) {
      console.error('Failed to load profiles:', err);
    }
  };

  const handleCreateProfile = async () => {
    if (!formData.name || !formData.description) {
      error('Validation Error', 'Name and description are required');
      return;
    }
    try {
      const profile = await zerotweaks.profiles['profile:create']({
        name: formData.name,
        description: formData.description,
        tweaks: formData.tweaks || [],
      });
      setCustomProfiles(prev => [...prev, profile]);
      success('Profile Created', `${formData.name} created successfully`);
      closeModal();
    } catch (err: any) {
      error('Failed to create profile', err.message);
    }
  };

  const handleUpdateProfile = async () => {
    if (!editingProfile) return;
    try {
      await zerotweaks.profiles['profile:update'](editingProfile.id, {
        ...formData,
        updatedAt: new Date().toISOString(),
      });
      setCustomProfiles(prev => prev.map(p => p.id === editingProfile.id ? { ...p, ...formData, updatedAt: new Date().toISOString() } : p));
      success('Profile Updated', `${formData.name} updated successfully`);
      closeModal();
    } catch (err: any) {
      error('Failed to update profile', err.message);
    }
  };

  const handleDeleteProfile = async (id: string) => {
    if (!window.confirm('Delete this profile? This cannot be undone.')) return;
    try {
      await zerotweaks.profiles['profile:delete'](id);
      setCustomProfiles(prev => prev.filter(p => p.id !== id));
      success('Profile Deleted', 'Custom profile removed');
    } catch (err: any) {
      error('Failed to delete profile', err.message);
    }
  };

  const handleApplyProfile = async (id: string) => {
    try {
      const result = await zerotweaks.profiles['profile:apply'](id);
      if (result.ok) {
        success('Profile Applied', `Applied ${result.applied}/${result.total} tweaks`);
        if (result.requiresReboot) {
          info('Reboot Required', 'Some tweaks require a system reboot to take effect');
        }
      } else {
        error('Failed', 'Some tweaks failed to apply');
      }
    } catch (err: any) {
      error('Failed to apply profile', err.message);
    }
  };

  const handleExportProfile = async (id: string) => {
    try {
      const json = await zerotweaks.profiles['profile:export'](id);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const profile = profiles.find(p => p.id === id);
      a.download = `zerotweaks-profile-${profile?.name?.toLowerCase().replace(/\s+/g, '-') || 'export'}.json`;
      a.click();
      URL.revokeObjectURL(url);
      success('Exported', 'Profile saved to file');
    } catch (err: any) {
      error('Export failed', err.message);
    }
  };

  const handleImportProfile = async (file: File) => {
    setImporting(true);
    try {
      const text = await file.text();
      const result = await zerotweaks.profiles['profile:import']({ json: text });
      if (result.ok && result.profile) {
        setCustomProfiles(prev => [...prev, result.profile!]);
        success('Imported', `${result.profile.name} imported successfully`);
      } else {
        error('Import failed', result.error || 'Invalid profile');
      }
    } catch (err: any) {
      error('Import failed', err.message);
    } finally {
      setImporting(false);
    }
  };

  const openCreateModal = (profile?: Profile) => {
    if (profile) {
      setEditingProfile(profile);
      setFormData({ name: profile.name, description: profile.description, tweaks: profile.tweaks });
    } else {
      setEditingProfile(null);
      setFormData({ name: '', description: '', tweaks: [] });
    }
    setShowCreateModal(true);
  };

  const closeModal = () => {
    setShowCreateModal(false);
    setEditingProfile(null);
    setFormData({ name: '', description: '', tweaks: [] });
  };

  const allProfiles = [...DEFAULT_PROFILES, ...customProfiles];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-space text-4xl md:text-5xl font-bold text-foreground tracking-tight">
            <WatermarkTitle watermark="PROFILE">{t('profiles.title')}</WatermarkTitle>
          </h1>
          <p className="text-muted-foreground mt-1">{t('profiles.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="file"
              accept=".json"
              onChange={e => e.target.files?.[0] && handleImportProfile(e.target.files[0])}
              disabled={importing}
              className="sr-only"
            />
            <span className="px-4 py-2 bg-transparent border border-border text-foreground rounded-lg font-medium hover:bg-accent hover:border-primary/50 transition-colors">
              <Upload className="w-4 h-4 mr-1" />
              Import
            </span>
          </label>
          <button
            onClick={() => openCreateModal()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Profile
          </button>
        </div>
      </div>

      {/* Built-in Profiles */}
      <div className="space-y-6">
        <h2 className="font-space text-xl font-semibold text-foreground">Built-in Profiles</h2>
        <BentoGrid columns={{ base: 1, sm: 2, lg: 4 }} gap={4}>
          {DEFAULT_PROFILES.map(profile => (
            <BentoCard key={profile.id} variant="elevated">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center',
                    profile.id.includes('competitive') && 'bg-red-500/20 text-red-400',
                    profile.id.includes('streamer') && 'bg-purple-500/20 text-purple-400',
                    profile.id.includes('laptop') && 'bg-green-500/20 text-green-400',
                    profile.id.includes('safe') && 'bg-blue-500/20 text-blue-400',
                  )}>
                    {profile.id.includes('competitive') && <Gamepad2 className="w-6 h-6" />}
                    {profile.id.includes('streamer') && <Monitor className="w-6 h-6" />}
                    {profile.id.includes('laptop') && <Battery className="w-6 h-6" />}
                    {profile.id.includes('safe') && <Shield className="w-6 h-6" />}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{profile.name}</h3>
                    <p className="text-xs text-muted-foreground">Built-in</p>
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-4">{profile.description}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleApplyProfile(profile.id)}
                  className="flex-1 px-3 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-1"
                >
                  <Zap className="w-3 h-3" />
                  Apply
                </button>
                <button
                  onClick={() => handleExportProfile(profile.id)}
                  className="px-3 py-2 bg-transparent border border-border text-foreground rounded-lg font-medium hover:bg-accent hover:border-primary/50 transition-colors"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </BentoCard>
          ))}
        </BentoGrid>
      </div>

      {/* Custom Profiles */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-space text-xl font-semibold text-foreground">Custom Profiles</h2>
          <button
            onClick={() => openCreateModal()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Custom Profile
          </button>
        </div>
        {customProfiles.length === 0 ? (
          <BentoCard variant="outlined" className="text-center py-12">
            <UserCog className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No custom profiles yet</h3>
            <p className="text-muted-foreground mb-4">Create a profile with your preferred tweaks</p>
            <button
              onClick={() => openCreateModal()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              Create Your First Profile
            </button>
          </BentoCard>
        ) : (
          <BentoGrid columns={{ base: 1, sm: 2, lg: 3 }} gap={4}>
            {customProfiles.map(profile => (
              <BentoCard key={profile.id} hover>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-sky-400/20 flex items-center justify-center">
                      <UserCog className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{profile.name}</h3>
                      <p className="text-xs text-muted-foreground">Custom • {new Date(profile.updatedAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-4">{profile.description}</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleApplyProfile(profile.id)}
                    className="flex-1 sm:flex-none px-3 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-1"
                  >
                    <Zap className="w-3 h-3" />
                    Apply
                  </button>
                  <button
                    onClick={() => handleExportProfile(profile.id)}
                    className="px-3 py-2 bg-transparent border border-border text-foreground rounded-lg font-medium hover:bg-accent hover:border-primary/50 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openCreateModal(profile)}
                    className="px-3 py-2 bg-transparent border border-border text-foreground rounded-lg font-medium hover:bg-accent hover:border-primary/50 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteProfile(profile.id)}
                    className="px-3 py-2 bg-transparent border border-red-500/30 text-red-400 rounded-lg font-medium hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </BentoCard>
            ))}
          </BentoGrid>
        )}
      </div>
    </div>
  );
}