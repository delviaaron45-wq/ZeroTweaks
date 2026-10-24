// Settings Store - Zustand
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Settings, Language, OverlayConfig } from '../../shared/types/all';
import { applyLanguage, isSupportedLanguage } from '../i18n';

const defaultSettings: Settings = {
  language: 'es',
  theme: 'dark',
  autoStart: false,
  minimizeToTray: true,
  checkUpdates: true,
  telemetryOptIn: false,
  dryRunDefault: false,
  batterySaverMode: false,
  gameModeAuto: true,
  overlay: {
    enabled: false,
    position: { x: 50, y: 50 },
    scale: 1.0,
    opacity: 0.9,
    clickThrough: true,
    modules: ['cpu', 'ram', 'gpu', 'ping', 'timer'],
    globalHotkey: 'Ctrl+Shift+O',
  },
  backupRetentionDays: 30,
  maxLogSize: 10,
  updateUrl: 'https://zerotweaks.github.io/updates/version.json',
  cinematicEffects: true,
};

interface SettingsState extends Settings {
  setLanguage: (lang: Language) => void;
  setTheme: (theme: Settings['theme']) => void;
  setAutoStart: (enabled: boolean) => void;
  setMinimizeToTray: (enabled: boolean) => void;
  setCheckUpdates: (enabled: boolean) => void;
  setTelemetryOptIn: (enabled: boolean) => void;
  setDryRunDefault: (enabled: boolean) => void;
  setBatterySaverMode: (enabled: boolean) => void;
  setGameModeAuto: (enabled: boolean) => void;
  updateOverlay: (config: Partial<OverlayConfig>) => void;
  setBackupRetentionDays: (days: number) => void;
  setMaxLogSize: (size: number) => void;
  setUpdateUrl: (url: string) => void;
  setCinematicEffects: (enabled: boolean) => void;
  reset: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaultSettings,
      setLanguage: (language) => {
        // Apply the language right away: the whole interface follows the
        // setting without needing a restart.
        if (isSupportedLanguage(language)) applyLanguage(language);
        set({ language });
      },
      setTheme: (theme) => set({ theme }),
      setAutoStart: (autoStart) => set({ autoStart }),
      setMinimizeToTray: (minimizeToTray) => set({ minimizeToTray }),
      setCheckUpdates: (checkUpdates) => set({ checkUpdates }),
      setTelemetryOptIn: (telemetryOptIn) => set({ telemetryOptIn }),
      setDryRunDefault: (dryRunDefault) => set({ dryRunDefault }),
      setBatterySaverMode: (batterySaverMode) => set({ batterySaverMode }),
      setGameModeAuto: (gameModeAuto) => set({ gameModeAuto }),
      updateOverlay: (config) => set((state) => ({ overlay: { ...state.overlay, ...config } })),
      setBackupRetentionDays: (backupRetentionDays) => set({ backupRetentionDays }),
      setMaxLogSize: (maxLogSize) => set({ maxLogSize }),
      setUpdateUrl: (updateUrl) => set({ updateUrl }),
      setCinematicEffects: (cinematicEffects) => set({ cinematicEffects }),
      reset: () => set(defaultSettings),
    }),
    {
      name: 'zerotweaks-settings',
      version: 1,
    }
  )
);