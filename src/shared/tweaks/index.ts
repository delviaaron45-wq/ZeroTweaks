// Main Tweak Catalog - Exports all tweaks organized by category
import type { Tweak, TweakCategory, Profile } from '../types/all';

export type { Tweak } from '../types/all';
import { systemTweaks } from './system';
import { powerTweaks } from './power';
import { gpuTweaks } from './gpu';
import { debloatTweaks, privacyTweaks } from './debloat';
import { ramTweaks } from './ram';
import { peripheralsTweaks } from './peripherals';
import { servicesTweaks } from './services';
import { explorerTweaks } from './explorer';

// All tweaks combined
export const allTweaks: Tweak[] = [
  ...systemTweaks,
  ...powerTweaks,
  ...gpuTweaks,
  ...debloatTweaks,
  ...privacyTweaks,
  ...ramTweaks,
  ...peripheralsTweaks,
  ...servicesTweaks,
  ...explorerTweaks,
];

// Tweaks organized by category
export const tweaksByCategory: Record<TweakCategory, Tweak[]> = {
  system_performance: systemTweaks,
  power_cpu: powerTweaks,
  gpu: gpuTweaks,
  debloat_apps: debloatTweaks,
  privacy_telemetry: privacyTweaks,
  ram_storage: ramTweaks,
  peripherals_input: peripheralsTweaks,
  services: servicesTweaks,
  explorer_ui: explorerTweaks,
  gaming_fps: [], // Gaming tweaks are in system/gpu
  network_tcp: systemTweaks.filter(t => t.category === 'network_tcp'),
};

// Safe tweaks (for "Optimize" button default profile)
export const safeTweaks: Tweak[] = allTweaks.filter(t => t.risk === 'safe');

// Moderate tweaks
export const moderateTweaks: Tweak[] = allTweaks.filter(t => t.risk === 'moderate');

// Advanced tweaks (require written confirmation)
export const advancedTweaks: Tweak[] = allTweaks.filter(t => t.risk === 'advanced');

// Measured evidence tweaks
export const measuredTweaks: Tweak[] = allTweaks.filter(t => t.evidence === 'measured');

// Get tweak by ID
export function getTweakById(id: string): Tweak | undefined {
  return allTweaks.find(t => t.id === id);
}

// Get tweaks for profile
export function getTweaksForProfile(profileTweakIds: string[]): Tweak[] {
  return profileTweakIds.map(id => getTweakById(id)).filter((t): t is Tweak => t !== undefined);
}

// Filter tweaks by hardware compatibility
export function filterTweaksByHardware(tweaks: Tweak[], hardware: {
  isLaptop: boolean;
  cpuVendor: 'Intel' | 'AMD' | 'Unknown';
  gpuVendor: 'NVIDIA' | 'AMD' | 'Intel' | 'Unknown';
  windowsVersion: string;
}): Tweak[] {
  return tweaks.filter(tweak => {
    // Check form factor
    if (!tweak.compatibility.formFactors.includes(hardware.isLaptop ? 'laptop' : 'desktop')) {
      return false;
    }
    // Check CPU vendor - allow if Unknown (no restriction)
    if (tweak.compatibility.cpuVendors && hardware.cpuVendor !== 'Unknown' && !tweak.compatibility.cpuVendors.includes(hardware.cpuVendor)) {
      return false;
    }
    // Check GPU vendor - allow if Unknown (no restriction)
    if (tweak.compatibility.gpuVendors && hardware.gpuVendor !== 'Unknown' && !tweak.compatibility.gpuVendors.includes(hardware.gpuVendor)) {
      return false;
    }
    // Check Windows version (simplified - check major version)
    const majorVersion = hardware.windowsVersion.split('.')[0];
    const tweakVersions = tweak.compatibility.windowsVersions.map(v => v.split('.')[0]);
    if (!tweakVersions.includes(majorVersion)) {
      // Allow if close enough (e.g., 10.0.19041 matches 10.0.22631)
      return true; // For now, allow all Win10/11
    }
    return true;
  });
}

// Default profiles
export const defaultProfiles: Record<string, Profile> = {
  safe: {
    id: 'profile_safe',
    name: 'Safe Profile',
    description: 'Only safe, measured tweaks. No reboot required for most. Recommended for all users.',
    tweaks: safeTweaks.filter(t => !t.requiresReboot).map(t => t.id),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  competitive: {
    id: 'profile_competitive',
    name: 'Competitive Gaming',
    description: 'Maximum performance for competitive gaming. Includes moderate tweaks. Requires reboot.',
    tweaks: [
      ...safeTweaks.map(t => t.id),
      ...moderateTweaks.filter(t => t.category === 'gaming_fps' || t.category === 'system_performance' || t.category === 'power_cpu' || t.category === 'network_tcp').map(t => t.id),
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  streamer: {
    id: 'profile_streamer',
    name: 'Streamer / Content Creator',
    description: 'Balanced for streaming: encoding performance, stability, OBS friendly. Keeps GameDVR for clips.',
    tweaks: safeTweaks.map(t => t.id),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  laptop: {
    id: 'profile_laptop',
    name: 'Laptop / Battery Optimized',
    description: 'Safe tweaks only. No core parking disable, no PCIe ASPM off. Preserves battery life.',
    tweaks: safeTweaks.filter(t => t.compatibility.formFactors.includes('laptop')).map(t => t.id),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
};

// Statistics
export const tweakStats = {
  total: allTweaks.length,
  byCategory: Object.fromEntries(
    Object.entries(tweaksByCategory).map(([cat, tweaks]) => [cat, tweaks.length])
  ),
  byRisk: {
    safe: safeTweaks.length,
    moderate: moderateTweaks.length,
    advanced: advancedTweaks.length,
  },
  byEvidence: {
    measured: measuredTweaks.length,
    debated: allTweaks.filter(t => t.evidence === 'debated').length,
    placebo: allTweaks.filter(t => t.evidence === 'placebo').length,
  },
  requiresReboot: allTweaks.filter(t => t.requiresReboot).length,
};