// Tweaks Store - Zustand
import { create } from 'zustand';
import type { Tweak, TweakState, TweakResult, Profile, BackupManifest, JournalEntry } from '../../shared/types/all';
import { useSettingsStore } from './settingsStore';

interface TweaksState {
  tweaks: Tweak[];
  filteredTweaks: Tweak[];
  tweakStates: Map<string, TweakState>;
  isLoading: boolean;
  error: string | null;
  selectedTweakIds: string[];

  fetchTweaks: () => Promise<void>;
  filterTweaks: (filter: { category?: string; risk?: string; evidence?: string; impacto?: string; search?: string }) => void;
  detectTweak: (tweakId: string) => Promise<TweakState>;
  applyTweak: (tweakId: string) => Promise<TweakResult>;
  revertTweak: (tweakId: string, originalState: TweakState) => Promise<TweakResult>;
  verifyTweak: (tweakId: string, expectedState: TweakState) => Promise<boolean>;
  toggleTweakSelection: (tweakId: string) => void;
  selectAllVisible: () => void;
  clearSelection: () => void;
}

export const useTweaksStore = create<TweaksState>((set, get) => ({
  tweaks: [],
  filteredTweaks: [],
  tweakStates: new Map(),
  isLoading: true,
  error: null,
  selectedTweakIds: [],

  fetchTweaks: async () => {
    set({ isLoading: true, error: null });
    try {
      const tweaks = await window.zerotweaks.tweaks['tweak:list']();
      set({ tweaks, filteredTweaks: tweaks, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  filterTweaks: (filter) => {
    const { tweaks } = get();
    let filtered = [...tweaks];
    
    if (filter.category && filter.category !== 'all') {
      filtered = filtered.filter(t => t.category === filter.category);
    }
    if (filter.risk && filter.risk !== 'all') {
      filtered = filtered.filter(t => t.risk === filter.risk);
    }
    if (filter.evidence && filter.evidence !== 'all') {
      filtered = filtered.filter(t => t.evidence === filter.evidence);
    }
    if (filter.impacto && filter.impacto !== 'all') {
      filtered = filtered.filter(t => t.impacto === filter.impacto);
    }
    if (filter.search) {
      const search = filter.search.toLowerCase();
      filtered = filtered.filter(t => 
        t.name.toLowerCase().includes(search) || 
        t.description.toLowerCase().includes(search)
      );
    }
    
    set({ filteredTweaks: filtered });
  },

  detectTweak: async (tweakId) => {
    // The preload exposes positional arguments: (tweakId, ...).
    const detected = await window.zerotweaks.tweaks['tweak:detect'](tweakId);
    set(current => ({
      tweakStates: new Map(current.tweakStates).set(tweakId, detected)
    }));
    return detected;
  },

  applyTweak: async (tweakId) => {
    // Single source of truth: the "dry-run" setting in Settings. When it is on,
    // every apply() only reports what it would change.
    const dryRun = useSettingsStore.getState().dryRunDefault;
    const result = await window.zerotweaks.tweaks['tweak:apply'](tweakId, { dryRun });
    if (result.ok && result.newState) {
      set(state => ({
        tweakStates: new Map(state.tweakStates).set(tweakId, result.newState!)
      }));
    }
    return result;
  },

  revertTweak: async (tweakId, originalState) => {
    const result = await window.zerotweaks.tweaks['tweak:revert'](tweakId, originalState);
    if (result.ok) {
      set(state => {
        const newMap = new Map(state.tweakStates);
        if (originalState.existed) {
          newMap.set(tweakId, originalState);
        } else {
          newMap.delete(tweakId);
        }
        return { tweakStates: newMap };
      });
    }
    return result;
  },

  verifyTweak: async (tweakId, expectedState) => {
    return window.zerotweaks.tweaks['tweak:verify'](tweakId, expectedState);
  },

  toggleTweakSelection: (tweakId) => set(state => ({
    selectedTweakIds: state.selectedTweakIds.includes(tweakId)
      ? state.selectedTweakIds.filter(id => id !== tweakId)
      : [...state.selectedTweakIds, tweakId]
  })),

  selectAllVisible: () => set(state => ({
    selectedTweakIds: state.filteredTweaks.map(t => t.id)
  })),

  clearSelection: () => set({ selectedTweakIds: [] }),
}));