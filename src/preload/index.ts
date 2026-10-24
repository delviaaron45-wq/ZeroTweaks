// Preload script - Secure IPC bridge
import { contextBridge, ipcRenderer } from 'electron';
import type { Tweak, Profile, HardwareProfile, BenchmarkResult, Settings, GameProfile, OverlayConfig, JournalEntry, BackupManifest, SpiderState, DiagnosisReport, DiagnosisProblem, DiagnosisProgress, FineTuneItem, InGameGameConfig, BeforeAfterMetrics, BeforeAfterComparison, InGameProfile, UpdateInfo, UpdateStatus } from '../shared/types/all.js';

// Type-safe IPC channel definitions
const ipcChannels = {
  // Tweaks
  'tweak:list': () => ipcRenderer.invoke('tweak:list'),
  'tweak:get': (tweakId: string) => ipcRenderer.invoke('tweak:get', { tweakId }),
  'tweak:detect': (tweakId: string) => ipcRenderer.invoke('tweak:detect', { tweakId }),
  'tweak:apply': (tweakId: string, options?: { dryRun?: boolean; force?: boolean }) => ipcRenderer.invoke('tweak:apply', { tweakId, options }),
  'tweak:revert': (tweakId: string, originalState: any) => ipcRenderer.invoke('tweak:revert', { tweakId, originalState }),
  'tweak:verify': (tweakId: string, expectedState: any) => ipcRenderer.invoke('tweak:verify', { tweakId, expectedState }),

  // Profiles
  'profile:list': () => ipcRenderer.invoke('profile:list'),
  'profile:get': (id: string) => ipcRenderer.invoke('profile:get', { id }),
  'profile:create': (profile: Omit<Profile, 'id' | 'createdAt' | 'updatedAt'>) => ipcRenderer.invoke('profile:create', { profile }),
  'profile:apply': (id: string, options?: { dryRun?: boolean; force?: boolean }) => ipcRenderer.invoke('profile:apply', { id, options }),
  'profile:import': (json: string) => ipcRenderer.invoke('profile:import', { json }),
  'profile:export': (id: string) => ipcRenderer.invoke('profile:export', { id }),

  // System
  'system:hardware': () => ipcRenderer.invoke('system:hardware'),
  'system:preflight': () => ipcRenderer.invoke('system:preflight'),
  'system:backup': () => ipcRenderer.invoke('system:backup'),
  'system:restore': (manifestId: string) => ipcRenderer.invoke('system:restore', { manifestId }),
  'system:journal': () => ipcRenderer.invoke('system:journal'),
  'system:backups': () => ipcRenderer.invoke('system:backups'),

  // Game Mode
  'game:list': () => ipcRenderer.invoke('game:list'),
  'game:detect': () => ipcRenderer.invoke('game:detect'),
  'game:create': (profile: Omit<GameProfile, 'id' | 'createdAt' | 'updatedAt'>) => ipcRenderer.invoke('game:create', { profile }),
  'game:start': (gameId: string) => ipcRenderer.invoke('game:start', { gameId }),
  'game:stop': (gameId: string) => ipcRenderer.invoke('game:stop', { gameId }),

  // Benchmark
  'benchmark:run': (tweakId?: string, profileId?: string) => ipcRenderer.invoke('benchmark:run', { tweakId, profileId }),
  'benchmark:results': () => ipcRenderer.invoke('benchmark:results'),
  'benchmark:compare': (beforeId: string, afterId: string) => ipcRenderer.invoke('benchmark:compare', { beforeId, afterId }),

  // Settings
  'settings:get': () => ipcRenderer.invoke('settings:get'),
  'settings:set': (settings: Partial<Settings>) => ipcRenderer.invoke('settings:set', { settings }),

  // Overlay
  'overlay:show': () => ipcRenderer.invoke('overlay:show'),
  'overlay:hide': () => ipcRenderer.invoke('overlay:hide'),
  'overlay:config': (config: Partial<OverlayConfig>) => ipcRenderer.invoke('overlay:config', { config }),

  // Spider
  'spider:scan': () => ipcRenderer.invoke('spider:scan'),
  'spider:idle': () => ipcRenderer.invoke('spider:idle'),

  // Utils
  'dialog:openExternal': (url: string) => ipcRenderer.invoke('dialog:openExternal', { url }),
  'dialog:showMessageBox': (options: any) => ipcRenderer.invoke('dialog:showMessageBox', options),
  'stats:get': () => ipcRenderer.invoke('stats:get'),
  'recovery:generateScript': () => ipcRenderer.invoke('recovery:generateScript'),

  // Diagnosis
  'diagnosis:run': () => ipcRenderer.invoke('diagnosis:run'),
  'diagnosis:getReport': () => ipcRenderer.invoke('diagnosis:getReport'),
  'diagnosis:fixProblem': (problemId: string) => ipcRenderer.invoke('diagnosis:fixProblem', { problemId }),
  'diagnosis:runABTest': (before?: BeforeAfterMetrics) => ipcRenderer.invoke('diagnosis:runABTest', { before }),
  'diagnosis:getGames': () => ipcRenderer.invoke('diagnosis:getGames'),
  'diagnosis:getGameProfiles': () => ipcRenderer.invoke('diagnosis:getGameProfiles'),
  'diagnosis:getGameConfig': (gameId: string) => ipcRenderer.invoke('diagnosis:getGameConfig', { gameId }),
  'diagnosis:applyGameProfile': (gameId: string, profile: InGameProfile) =>
    ipcRenderer.invoke('diagnosis:applyGameProfile', { gameId, profile }),
  'diagnosis:revertGameProfile': (gameId: string) => ipcRenderer.invoke('diagnosis:revertGameProfile', { gameId }),
  'diagnosis:setGameFpsCap': (gameId: string, cap: number) => ipcRenderer.invoke('diagnosis:setGameFpsCap', { gameId, cap }),
  'diagnosis:getLatencyTechnology': () => ipcRenderer.invoke('diagnosis:getLatencyTechnology'),
  'on:diagnosisProgress': (callback: (progress: DiagnosisProgress) => void) => {
    ipcRenderer.on('diagnosis:progress', (_event, progress) => callback(progress));
    return () => ipcRenderer.removeAllListeners('diagnosis:progress');
  },

  // High impact insights (section 15)
  'insights:stutter': (durationMs: number) => ipcRenderer.invoke('insights:stutter', { durationMs }),
  'insights:drivers': () => ipcRenderer.invoke('insights:drivers'),
  'insights:fpsLimiter': () => ipcRenderer.invoke('insights:fpsLimiter'),
  'insights:comparison': (enabled: boolean) => ipcRenderer.invoke('insights:comparison', { enabled }),
  'insights:heavySoftware': () => ipcRenderer.invoke('insights:heavySoftware'),
  'insights:closeHeavy': (processes: string[]) => ipcRenderer.invoke('insights:closeHeavy', { processes }),
  'insights:disableAutostart': (process: string) => ipcRenderer.invoke('insights:disableAutostart', { process }),
  'insights:excludeHeavy': (excluded: string[]) => ipcRenderer.invoke('insights:excludeHeavy', { excluded }),
  'insights:cpu': () => ipcRenderer.invoke('insights:cpu'),
  'insights:display': () => ipcRenderer.invoke('insights:display'),
  'insights:memoryFiles': () => ipcRenderer.invoke('insights:memoryFiles'),
  'insights:repairActions': () => ipcRenderer.invoke('insights:repairActions'),
  'insights:suggestRepairs': (symptoms: Record<string, boolean>) => ipcRenderer.invoke('insights:suggestRepairs', { symptoms }),
  'insights:runRepair': (actionId: string) => ipcRenderer.invoke('insights:runRepair', { actionId }),
  'insights:isElevated': () => ipcRenderer.invoke('insights:isElevated'),
  'insights:thermal': (cpuTempC: number | null, gpuTempC: number | null, throttling: boolean) =>
    ipcRenderer.invoke('insights:thermal', { cpuTempC, gpuTempC, throttling }),
  'insights:biosGuides': (vendor?: string) => ipcRenderer.invoke('insights:biosGuides', { vendor }),
  'insights:pausable': () => ipcRenderer.invoke('insights:pausable'),
  'insights:setGameModeExclusions': (excluded: string[]) => ipcRenderer.invoke('insights:setGameModeExclusions', { excluded }),
  'insights:detectGame': () => ipcRenderer.invoke('insights:detectGame'),
  'insights:recordSession': (paused: string[], freedRamMB: number, freedCpuPercent: number) =>
    ipcRenderer.invoke('insights:recordSession', { paused, freedRamMB, freedCpuPercent }),
  'insights:checklist': () => ipcRenderer.invoke('insights:checklist'),
  'insights:gameProfiles': (gameId?: string) => ipcRenderer.invoke('insights:gameProfiles', { gameId }),

  // PRO module
  'pro:latencyPing': () => ipcRenderer.invoke('pro:latencyPing'),
  'pro:bios': () => ipcRenderer.invoke('pro:bios'),
  'pro:scanCaches': () => ipcRenderer.invoke('pro:scanCaches'),
  'pro:cacheUsers': () => ipcRenderer.invoke('pro:cacheUsers'),
  'pro:cleanCaches': () => ipcRenderer.invoke('pro:cleanCaches'),
  'pro:restoreCaches': (backupRoot: string) => ipcRenderer.invoke('pro:restoreCaches', { backupRoot }),
  'pro:battery': () => ipcRenderer.invoke('pro:battery'),
  'pro:applyPower': (kind: string) => ipcRenderer.invoke('pro:applyPower', { kind }),
  'pro:autoPower': () => ipcRenderer.invoke('pro:autoPower'),
  'pro:buildBundle': () => ipcRenderer.invoke('pro:buildBundle'),
  'pro:exportBundle': (targetPath: string) => ipcRenderer.invoke('pro:exportBundle', { targetPath }),
  'pro:importBundle': (sourcePath: string) => ipcRenderer.invoke('pro:importBundle', { sourcePath }),
  'pro:syncConfig': () => ipcRenderer.invoke('pro:syncConfig'),
  'pro:setSyncConfig': (config: unknown) => ipcRenderer.invoke('pro:setSyncConfig', { config }),
  'pro:syncUpload': () => ipcRenderer.invoke('pro:syncUpload'),
  'pro:syncDownload': () => ipcRenderer.invoke('pro:syncDownload'),
  'pro:pickExportPath': () => ipcRenderer.invoke('pro:pickExportPath'),
  'pro:pickImportFile': () => ipcRenderer.invoke('pro:pickImportFile'),

  // Auto-updater
  'update:check': () => ipcRenderer.invoke('update:check'),
  'update:download': () => ipcRenderer.invoke('update:download'),
  'update:status': () => ipcRenderer.invoke('update:status'),
  'on:updateStatus': (callback: (status: UpdateStatus) => void) => {
    ipcRenderer.on('update:status', (_event, status) => callback(status));
    return () => ipcRenderer.removeAllListeners('update:status');
  },

  // Events
  'on:themeChanged': (callback: (theme: string) => void) => {
    ipcRenderer.on('theme:changed', (_event, theme) => callback(theme));
    return () => ipcRenderer.removeAllListeners('theme:changed');
  },
  'on:gameStateChanged': (callback: (game: GameProfile | null) => void) => {
    ipcRenderer.on('game:state-changed', (_event, game) => callback(game));
    return () => ipcRenderer.removeAllListeners('game:state-changed');
  },
  'on:overlayUpdate': (callback: (data: any) => void) => {
    ipcRenderer.on('overlay:update', (_event, data) => callback(data));
    return () => ipcRenderer.removeAllListeners('overlay:update');
  },
  'on:spiderUpdate': (callback: (state: SpiderState) => void) => {
    ipcRenderer.on('spider:update', (_event, state) => callback(state));
    return () => ipcRenderer.removeAllListeners('spider:update');
  },
  'on:benchmarkProgress': (callback: (progress: { stage: string; progress: number }) => void) => {
    ipcRenderer.on('benchmark:progress', (_event, progress) => callback(progress));
    return () => ipcRenderer.removeAllListeners('benchmark:progress');
  },
} as const;

// Expose API to renderer
contextBridge.exposeInMainWorld('zerotweaks', {
  tweaks: ipcChannels,
  profiles: ipcChannels,
  system: ipcChannels,
  game: ipcChannels,
  benchmark: ipcChannels,
  settings: ipcChannels,
  overlay: ipcChannels,
  spider: ipcChannels,
  utils: ipcChannels,
  diagnosis: {
    run: ipcChannels['diagnosis:run'],
    getReport: ipcChannels['diagnosis:getReport'],
    fixProblem: ipcChannels['diagnosis:fixProblem'],
    runABTest: ipcChannels['diagnosis:runABTest'],
    getGames: ipcChannels['diagnosis:getGames'],
    getGameProfiles: ipcChannels['diagnosis:getGameProfiles'],
    getGameConfig: ipcChannels['diagnosis:getGameConfig'],
    applyGameProfile: ipcChannels['diagnosis:applyGameProfile'],
    revertGameProfile: ipcChannels['diagnosis:revertGameProfile'],
    setGameFpsCap: ipcChannels['diagnosis:setGameFpsCap'],
    getLatencyTechnology: ipcChannels['diagnosis:getLatencyTechnology'],
    onProgress: ipcChannels['on:diagnosisProgress'],
  },
  insights: {
    stutter: ipcChannels['insights:stutter'],
    drivers: ipcChannels['insights:drivers'],
    fpsLimiter: ipcChannels['insights:fpsLimiter'],
    comparison: ipcChannels['insights:comparison'],
    heavySoftware: ipcChannels['insights:heavySoftware'],
    closeHeavy: ipcChannels['insights:closeHeavy'],
    disableAutostart: ipcChannels['insights:disableAutostart'],
    excludeHeavy: ipcChannels['insights:excludeHeavy'],
    cpu: ipcChannels['insights:cpu'],
    display: ipcChannels['insights:display'],
    memoryFiles: ipcChannels['insights:memoryFiles'],
    repairActions: ipcChannels['insights:repairActions'],
    suggestRepairs: ipcChannels['insights:suggestRepairs'],
    runRepair: ipcChannels['insights:runRepair'],
    isElevated: ipcChannels['insights:isElevated'],
    thermal: ipcChannels['insights:thermal'],
    biosGuides: ipcChannels['insights:biosGuides'],
    pausable: ipcChannels['insights:pausable'],
    setGameModeExclusions: ipcChannels['insights:setGameModeExclusions'],
    detectGame: ipcChannels['insights:detectGame'],
    recordSession: ipcChannels['insights:recordSession'],
    checklist: ipcChannels['insights:checklist'],
    gameProfiles: ipcChannels['insights:gameProfiles'],
  },
  pro: {
    latencyPing: ipcChannels['pro:latencyPing'],
    bios: ipcChannels['pro:bios'],
    scanCaches: ipcChannels['pro:scanCaches'],
    cacheUsers: ipcChannels['pro:cacheUsers'],
    cleanCaches: ipcChannels['pro:cleanCaches'],
    restoreCaches: ipcChannels['pro:restoreCaches'],
    battery: ipcChannels['pro:battery'],
    applyPower: ipcChannels['pro:applyPower'],
    autoPower: ipcChannels['pro:autoPower'],
    buildBundle: ipcChannels['pro:buildBundle'],
    exportBundle: ipcChannels['pro:exportBundle'],
    importBundle: ipcChannels['pro:importBundle'],
    syncConfig: ipcChannels['pro:syncConfig'],
    setSyncConfig: ipcChannels['pro:setSyncConfig'],
    syncUpload: ipcChannels['pro:syncUpload'],
    syncDownload: ipcChannels['pro:syncDownload'],
    pickExportPath: ipcChannels['pro:pickExportPath'],
    pickImportFile: ipcChannels['pro:pickImportFile'],
  },
  update: {
    check: ipcChannels['update:check'],
    download: ipcChannels['update:download'],
    status: ipcChannels['update:status'],
    onStatus: ipcChannels['on:updateStatus'],
  },
});

// Type declarations for renderer
declare global {
  interface Window {
    zerotweaks: typeof ipcChannels;
  }
}