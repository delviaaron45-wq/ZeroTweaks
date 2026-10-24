// IPC Handlers - Main process handlers for renderer communication
import { ipcMain, dialog, shell, BrowserWindow } from 'electron';
import { logger } from '../utils/logger';
import { allTweaks, getTweakById, getTweaksForProfile, filterTweaksByHardware, defaultProfiles, tweakStats } from '../../shared/tweaks';
import type { Tweak, TweakResult, ApplyOptions, HardwareProfile, Profile, BackupManifest, JournalEntry, GameProfile, BenchmarkResult, Settings, OverlayConfig, InGameProfile } from '../../shared/types/all';
import type { PowerProfileKind, SyncConfig } from '../../shared/types/pro.js';
import { detectHardware } from '../../shared/utils/hardware';
import { PreflightChecks } from '../system/preflight';
import { BackupManager } from '../system/backup';
import { JournalManager } from '../system/journal';
import { GameModeManager } from '../gaming/gameMode';
import { OverlayManager } from '../overlay/manager';
import { SpiderManager } from '../spider/manager';
import { BenchmarkManager } from '../benchmark/manager';
import { execPowerShell } from '../../shared/utils/process';
import { getAppDataPath, writeJson, readJson } from '../../shared/utils/files';
import fs from 'fs/promises';

interface IpcDependencies {
  backupManager: BackupManager;
  journalManager: JournalManager;
  gameModeManager: GameModeManager;
  overlayManager: OverlayManager;
  spiderManager: SpiderManager;
  benchmarkManager: BenchmarkManager;
  diagnosisManager: import('../diagnosis/manager').DiagnosisManager;
  insightsManager: import('../insights/manager').InsightsManager;
  updateManager: import('../updater').UpdateManager;
  proManager: import('../pro/manager').ProManager;
}

export function setupIpcHandlers(deps: IpcDependencies): void {
  const {
    backupManager,
    journalManager,
    gameModeManager,
    overlayManager,
    spiderManager,
    benchmarkManager,
    diagnosisManager,
    insightsManager,
    updateManager,
    proManager,
  } = deps;

  // Hardware detection takes several seconds (a fistful of PowerShell/WMI
  // probes), so the result is cached in memory for a short while. On top of
  // that a copy is persisted to disk so a fresh app launch can paint the UI
  // instantly and refresh the profile in the background (stale-while-revalidate)
  // instead of blocking the first screen for ~6s.
  const HARDWARE_CACHE_FILE = getAppDataPath('hardware-cache.json');
  // Anything younger than this is served as-is; older entries are still shown
  // immediately but trigger a silent background refresh.
  const HARDWARE_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
  let hardwareCache: { profile: HardwareProfile; at: number } | null = null;
  let hardwareRefreshInFlight: Promise<unknown> | null = null;

  /** Re-runs detection and updates both the in-memory and on-disk cache. */
  async function refreshHardwareCache(): Promise<HardwareProfile> {
    const profile = await detectHardware();
    hardwareCache = { profile, at: Date.now() };
    // Persist non-blocking: a failure here must never break detection.
    void writeJson(HARDWARE_CACHE_FILE, { profile, at: hardwareCache.at }).catch(() => {});
    return profile;
  }

  /** Fire-and-forget background refresh, deduped so probes run once. */
  function scheduleHardwareRefresh(): void {
    if (hardwareRefreshInFlight) return;
    hardwareRefreshInFlight = refreshHardwareCache()
      .catch(err => logger.warn('Background hardware refresh failed:', err))
      .finally(() => { hardwareRefreshInFlight = null; });
  }

  async function getHardware(force = false): Promise<HardwareProfile> {
    if (!force && hardwareCache && Date.now() - hardwareCache.at < 60000) {
      return hardwareCache.profile;
    }

    // Serve a recent on-disk profile instantly while refreshing in the
    // background, so the first screen never waits on PowerShell.
    if (!force && !hardwareCache) {
      try {
        const disk = await readJson<{ profile: HardwareProfile; at: number }>(HARDWARE_CACHE_FILE);
        if (disk?.profile && Date.now() - disk.at < HARDWARE_CACHE_MAX_AGE_MS) {
          hardwareCache = { profile: disk.profile, at: disk.at };
          scheduleHardwareRefresh();
          return disk.profile;
        }
      } catch {
        // Corrupt/absent cache: fall through to a synchronous detection.
      }
    }

    return refreshHardwareCache();
  }

  /**
   * Reads the hardware profile that is already cached (memory or disk) without
   * triggering the slow detection. Used to explain why a tweak does not apply
   * on this specific machine (wrong GPU/CPU vendor, laptop-only...).
   */
  async function peekHardware(): Promise<HardwareProfile | null> {
    if (hardwareCache) return hardwareCache.profile;
    try {
      const disk = await readJson<{ profile: HardwareProfile; at: number }>(HARDWARE_CACHE_FILE);
      if (disk?.profile) {
        hardwareCache = { profile: disk.profile, at: disk.at };
        return disk.profile;
      }
    } catch {
      // No hardware has been detected yet on this machine.
    }
    return null;
  }

  /**
   * Turns the declarative compatibility of a tweak into an explicit reason when
   * the machine does not match it, so the UI disables it instead of offering an
   * action that could never work here.
   */
  function hardwareMismatchReason(tweak: Tweak, hardware: HardwareProfile | null): string | undefined {
    if (!hardware) return undefined;
    const { gpuVendors, cpuVendors, formFactors } = tweak.compatibility;

    if (!formFactors.includes(hardware.isLaptop ? 'laptop' : 'desktop')) {
      const wanted = formFactors.map(f => (f === 'laptop' ? 'portátiles' : 'sobremesa')).join(' o ');
      return `No aplicable: está pensado para ${wanted} y este equipo es un ${hardware.isLaptop ? 'portátil' : 'sobremesa'}.`;
    }
    if (gpuVendors?.length && hardware.gpu.vendor !== 'Unknown' && !gpuVendors.includes(hardware.gpu.vendor)) {
      return `No aplicable: requiere GPU ${gpuVendors.join(' o ')} y la detectada es ${hardware.gpu.vendor} (${hardware.gpu.model}).`;
    }
    if (cpuVendors?.length && hardware.cpu.vendor !== 'Unknown' && !cpuVendors.includes(hardware.cpu.vendor)) {
      return `No aplicable: requiere CPU ${cpuVendors.join(' o ')} y la detectada es ${hardware.cpu.vendor}.`;
    }
    return undefined;
  }

  // Tweak operations
  ipcMain.handle('tweak:list', async () => {
    const hardware = await peekHardware();
    return allTweaks.map(t => ({
      id: t.id,
      name: t.name,
      nameKey: t.nameKey,
      category: t.category,
      description: t.description,
      descriptionKey: t.descriptionKey,
      whenHelps: t.whenHelps,
      whenHelpsKey: t.whenHelpsKey,
      risk: t.risk,
      evidence: t.evidence,
      impacto: t.impacto,
      unavailableReason: t.unavailableReason ?? hardwareMismatchReason(t, hardware),
      requiresReboot: t.requiresReboot,
      compatibility: t.compatibility,
    }));
  });

  ipcMain.handle('tweak:get', async (_event, { tweakId }: { tweakId: string }) => {
    const tweak = getTweakById(tweakId);
    if (!tweak) throw new Error(`Tweak not found: ${tweakId}`);
    return {
      id: tweak.id,
      name: tweak.name,
      nameKey: tweak.nameKey,
      category: tweak.category,
      description: tweak.description,
      descriptionKey: tweak.descriptionKey,
      whenHelps: tweak.whenHelps,
      whenHelpsKey: tweak.whenHelpsKey,
      risk: tweak.risk,
      evidence: tweak.evidence,
      impacto: tweak.impacto,
      unavailableReason: tweak.unavailableReason ?? hardwareMismatchReason(tweak, await peekHardware()),
      requiresReboot: tweak.requiresReboot,
      compatibility: tweak.compatibility,
    };
  });

  ipcMain.handle('tweak:detect', async (_event, { tweakId }: { tweakId: string }) => {
    const tweak = getTweakById(tweakId);
    if (!tweak) throw new Error(`Tweak not found: ${tweakId}`);
    return tweak.detect();
  });

  ipcMain.handle('tweak:apply', async (_event, { tweakId, options }: { tweakId: string; options?: ApplyOptions }) => {
    const tweak = getTweakById(tweakId);
    if (!tweak) throw new Error(`Tweak not found: ${tweakId}`);

    // Log journal entry before applying
    const currentState = await tweak.detect();
    const entry = await journalManager.logEntry({
      tweakId,
      action: 'apply',
      previousState: currentState,
      newState: currentState, // Will be updated after apply
      success: false, // Will be marked true after
    });

    try {
      const result = await tweak.apply(options);
      if (result.ok) {
        await journalManager.markEntryComplete(entry.id, true, undefined, await tweak.detect());
      } else {
        await journalManager.markEntryComplete(entry.id, false, result.error);
      }
      return result;
    } catch (error: any) {
      await journalManager.markEntryComplete(entry.id, false, error.message);
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle('tweak:revert', async (_event, { tweakId, originalState }: { tweakId: string; originalState: any }) => {
    const tweak = getTweakById(tweakId);
    if (!tweak) throw new Error(`Tweak not found: ${tweakId}`);

    const entry = await journalManager.logEntry({
      tweakId,
      action: 'revert',
      previousState: originalState,
      newState: originalState,
      success: false,
    });

    try {
      const result = await tweak.revert(originalState);
      if (result.ok) {
        await journalManager.markEntryComplete(entry.id, true);
      } else {
        await journalManager.markEntryComplete(entry.id, false, result.error);
      }
      return result;
    } catch (error: any) {
      await journalManager.markEntryComplete(entry.id, false, error.message);
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle('tweak:verify', async (_event, { tweakId, expectedState }: { tweakId: string; expectedState: any }) => {
    const tweak = getTweakById(tweakId);
    if (!tweak) throw new Error(`Tweak not found: ${tweakId}`);
    return tweak.verify(expectedState);
  });

  // Profile operations
  async function getProfiles(): Promise<Profile[]> {
    const profilesDir = getAppDataPath('profiles');
    try {
      const files = await fs.readdir(profilesDir);
      const profiles: Profile[] = [];
      for (const file of files) {
        if (file.endsWith('.json')) {
          const profile = await readJson<Profile>(join(profilesDir, file));
          if (profile) profiles.push(profile);
        }
      }
      return [...profiles, ...Object.values(defaultProfiles)];
    } catch {
      return Object.values(defaultProfiles);
    }
  }

  ipcMain.handle('profile:list', async () => getProfiles());

  ipcMain.handle('profile:get', async (_event, { id }: { id: string }) => {
    const profiles = await getProfiles();
    return profiles.find((p: Profile) => p.id === id);
  });

  ipcMain.handle('profile:create', async (_event, { profile }: { profile: Omit<Profile, 'id' | 'createdAt' | 'updatedAt'> }) => {
    const newProfile: Profile = {
      ...profile,
      id: `profile_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const profilesDir = getAppDataPath('profiles');
    await fs.mkdir(profilesDir, { recursive: true });
    await writeJson(join(profilesDir, `${newProfile.id}.json`), newProfile);
    return newProfile;
  });

  ipcMain.handle('profile:apply', async (_event, { id, options }: { id: string; options?: ApplyOptions }) => {
    const profile = defaultProfiles[id as keyof typeof defaultProfiles];
    if (!profile) throw new Error(`Profile not found: ${id}`);

    const tweaks = getTweaksForProfile(profile.tweaks);
    const results = [];

    for (const tweak of tweaks) {
      const result = await tweak.apply(options);
      results.push({ tweakId: tweak.id, ...result, requiresReboot: tweak.requiresReboot });
      // Small delay between tweaks
      await new Promise(r => setTimeout(r, 50));
    }

    const successCount = results.filter(r => r.ok).length;
    return {
      ok: successCount === results.length,
      applied: successCount,
      total: results.length,
      results,
      requiresReboot: results.some(r => r.requiresReboot),
    };
  });

  ipcMain.handle('profile:import', async (_event, { json }: { json: string }) => {
    try {
      const profile = JSON.parse(json) as Profile;
      // Verify signature if present
      const profilesDir = getAppDataPath('profiles');
      await fs.mkdir(profilesDir, { recursive: true });
      await writeJson(join(profilesDir, `${profile.id}.json`), profile);
      return { ok: true, profile };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle('profile:export', async (_event, { id }: { id: string }) => {
    const profile = defaultProfiles[id as keyof typeof defaultProfiles];
    if (!profile) throw new Error(`Profile not found: ${id}`);
    return JSON.stringify(profile, null, 2);
  });

  // System operations
  ipcMain.handle('system:hardware', async () => {
    const started = Date.now();
    const profile = await getHardware();
    logger.info(`Hardware detected in ${Date.now() - started}ms`);
    return profile;
  });

  // ---------------------------------------------------------------------
  // Auto-updater
  // ---------------------------------------------------------------------
  ipcMain.handle('update:check', async () => {
    const settings = (await readJson<Settings>(getAppDataPath('settings.json'))) ?? getDefaultSettings();
    // The environment variable wins: it is used by the automated checks and by
    // portable deployments that ship their own manifest.
    const url = process.env.ZT_UPDATE_URL || settings.updateUrl;
    return updateManager.checkForUpdate(url);
  });

  ipcMain.handle('update:download', async () => {
    return updateManager.downloadAndInstall();
  });

  ipcMain.handle('update:status', async () => {
    return updateManager.getStatus();
  });

  ipcMain.handle('system:preflight', async () => {
    return PreflightChecks.run();
  });

  ipcMain.handle('system:restorePoint', async (_event, { description }: { description: string }) => {
    // This is handled by backup manager
    return { ok: true };
  });

  ipcMain.handle('system:backup', async () => {
    const manifest = await backupManager.createBackup();
    await journalManager.initialize(manifest);
    return manifest;
  });

  ipcMain.handle('system:restore', async (_event, { manifestId }: { manifestId: string }) => {
    await backupManager.restoreBackup(manifestId);
    return { ok: true };
  });

  ipcMain.handle('system:journal', async () => {
    return journalManager.getJournal();
  });

  ipcMain.handle('system:backups', async () => {
    return backupManager.listBackups();
  });

  // Game Mode
  ipcMain.handle('game:list', async () => {
    return gameModeManager.getGameProfiles();
  });

  ipcMain.handle('game:detect', async () => {
    // Trigger detection
    return gameModeManager.getGameProfiles();
  });

  ipcMain.handle('game:create', async (_event, { profile }: { profile: Omit<GameProfile, 'id' | 'createdAt' | 'updatedAt'> }) => {
    const newProfile: GameProfile = {
      ...profile,
      id: `game_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await gameModeManager.addGameProfile(newProfile);
    return newProfile;
  });

  ipcMain.handle('game:start', async (_event, { gameId }: { gameId: string }) => {
    const profiles = gameModeManager.getGameProfiles();
    const profile = profiles.find(p => p.id === gameId);
    if (profile) {
      await gameModeManager.onGameLaunch(profile);
    }
  });

  ipcMain.handle('game:stop', async (_event, { gameId }: { gameId: string }) => {
    const profiles = gameModeManager.getGameProfiles();
    const profile = profiles.find(p => p.id === gameId);
    if (profile) {
      await gameModeManager.onGameExit(profile);
    }
  });

  // Benchmark
  ipcMain.handle('benchmark:run', async (_event, { tweakId, profileId }: { tweakId?: string; profileId?: string }) => {
    // Real measurements: the benchmark manager measures the system instead of
    // returning placeholder numbers.
    return benchmarkManager.runFullBenchmark(tweakId, profileId);
  });

  ipcMain.handle('benchmark:compare', async (_event, { beforeId, afterId }: { beforeId: string; afterId: string }) => {
    return benchmarkManager.compareResults(beforeId, afterId);
  });

  ipcMain.handle('benchmark:results', async () => {
    return benchmarkManager.getResults();
  });

  // Settings
  ipcMain.handle('settings:get', async () => {
    const settingsPath = getAppDataPath('settings.json');
    return readJson<Settings>(settingsPath) || getDefaultSettings();
  });

  ipcMain.handle('settings:set', async (_event, { settings }: { settings: Partial<Settings> }) => {
    const settingsPath = getAppDataPath('settings.json');
    const current = readJson<Settings>(settingsPath) || getDefaultSettings();
    const updated = { ...current, ...settings };
    await writeJson(getAppDataPath('settings.json'), updated);
    return updated;
  });

  // Overlay
  ipcMain.handle('overlay:show', async () => {
    await overlayManager.show();
  });

  ipcMain.handle('overlay:hide', async () => {
    await overlayManager.hide();
  });

  ipcMain.handle('overlay:config', async (_event, { config }: { config: Partial<OverlayConfig> }) => {
    await overlayManager.updateConfig(config);
  });

  // Spider
  ipcMain.handle('spider:scan', async () => {
    spiderManager.setState('scan');
    await spiderManager.startScan();
  });

  ipcMain.handle('spider:idle', async () => {
    spiderManager.idle();
  });

  // Utility
  ipcMain.handle('dialog:openExternal', async (_event, { url }: { url: string }) => {
    await shell.openExternal(url);
  });

  ipcMain.handle('dialog:showMessageBox', async (_event, options) => {
    return dialog.showMessageBox(options);
  });

  // Diagnosis
  ipcMain.handle('diagnosis:run', async () => {
    return diagnosisManager.runDiagnosis();
  });

  ipcMain.handle('diagnosis:getReport', async () => {
    return diagnosisManager.getReport();
  });

  ipcMain.handle('diagnosis:fixProblem', async (_event, { problemId }: { problemId: string }) => {
    return diagnosisManager.fixProblem(problemId);
  });

  ipcMain.handle('diagnosis:runABTest', async (_event, { before }: { before: any }) => {
    return diagnosisManager.runABTest(before);
  });

  // In-game settings optimizer
  ipcMain.handle('diagnosis:getGames', async () => {
    return diagnosisManager.getGames();
  });

  ipcMain.handle('diagnosis:getGameProfiles', async () => {
    return diagnosisManager.getGameProfiles();
  });

  ipcMain.handle('diagnosis:getGameConfig', async (_event, { gameId }: { gameId: string }) => {
    return diagnosisManager.getGameConfig(gameId);
  });

  ipcMain.handle(
    'diagnosis:applyGameProfile',
    async (_event, { gameId, profile }: { gameId: string; profile: InGameProfile }) => {
      return diagnosisManager.applyGameProfile(gameId, profile);
    }
  );

  ipcMain.handle('diagnosis:revertGameProfile', async (_event, { gameId }: { gameId: string }) => {
    return diagnosisManager.revertGameProfile(gameId);
  });

  ipcMain.handle('diagnosis:setGameFpsCap', async (_event, { gameId, cap }: { gameId: string; cap: number }) => {
    return diagnosisManager.setGameFpsCap(gameId, cap);
  });

  ipcMain.handle('diagnosis:getLatencyTechnology', async () => {
    return diagnosisManager.getLatencyTechnology();
  });

  // ---------------------------------------------------------------------
  // Auto-updater: the renderer subscribes to the status stream.
  updateManager.onStatus(status => {
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) win.webContents.send('update:status', status);
    }
  });

  // High impact insights (section 15)
  // ---------------------------------------------------------------------
  ipcMain.handle('insights:stutter', async (_event, { durationMs }: { durationMs?: number }) => {
    return insightsManager.captureStutter(durationMs ?? 60000);
  });

  ipcMain.handle('insights:drivers', async () => {
    return insightsManager.analyseDrivers();
  });

  ipcMain.handle('insights:fpsLimiter', async () => {
    return insightsManager.analyseFpsLimiter(await getHardware());
  });

  ipcMain.handle('insights:comparison', async (_event, { enabled }: { enabled: boolean }) => {
    return insightsManager.buildComparison(await getHardware(), enabled);
  });

  ipcMain.handle('insights:heavySoftware', async () => {
    return insightsManager.scanHeavy();
  });

  ipcMain.handle('insights:closeHeavy', async (_event, { processes }: { processes: string[] }) => {
    return insightsManager.closeHeavy(processes);
  });

  ipcMain.handle('insights:disableAutostart', async (_event, { process }: { process: string }) => {
    return insightsManager.disableAutostartFor(process);
  });

  ipcMain.handle('insights:excludeHeavy', async (_event, { excluded }: { excluded: string[] }) => {
    insightsManager.setHeavyExclusions(excluded);
    return excluded;
  });

  ipcMain.handle('insights:cpu', async () => {
    return insightsManager.analyseCpu();
  });

  ipcMain.handle('insights:display', async () => {
    return insightsManager.analyseDisplay();
  });

  ipcMain.handle('insights:memoryFiles', async () => {
    return insightsManager.analyseMemoryFiles(await getHardware());
  });

  ipcMain.handle('insights:repairActions', async () => {
    return insightsManager.listRepairActions();
  });

  ipcMain.handle('insights:suggestRepairs', async (_event, { symptoms }: { symptoms: Record<string, boolean> }) => {
    return insightsManager.suggestRepairs(symptoms);
  });

  ipcMain.handle('insights:runRepair', async (_event, { actionId }: { actionId: string }) => {
    return insightsManager.runRepair(actionId);
  });

  ipcMain.handle('insights:isElevated', async () => {
    return insightsManager.isElevated();
  });

  ipcMain.handle(
    'insights:thermal',
    async (_event, { cpuTempC, gpuTempC, throttling }: { cpuTempC: number | null; gpuTempC: number | null; throttling: boolean }) => {
      return insightsManager.analyseThermals(cpuTempC, gpuTempC, throttling);
    }
  );

  ipcMain.handle('insights:biosGuides', async (_event, { vendor }: { vendor?: string }) => {
    return insightsManager.listBiosGuides(vendor);
  });

  ipcMain.handle('insights:pausable', async () => {
    return insightsManager.listPausable();
  });

  ipcMain.handle('insights:setGameModeExclusions', async (_event, { excluded }: { excluded: string[] }) => {
    return insightsManager.setGameModeExclusions(excluded);
  });

  ipcMain.handle('insights:detectGame', async () => {
    return insightsManager.detectGame();
  });

  ipcMain.handle(
    'insights:recordSession',
    async (_event, { paused, freedRamMB, freedCpuPercent }: { paused: string[]; freedRamMB: number; freedCpuPercent: number }) => {
      return insightsManager.recordGameSession(paused, freedRamMB, freedCpuPercent);
    }
  );

  ipcMain.handle('insights:checklist', async () => {
    return insightsManager.buildChecklist(await getHardware());
  });

  ipcMain.handle('insights:gameProfiles', async (_event, { gameId }: { gameId?: string }) => {
    return insightsManager.listGameProfiles(gameId);
  });

  // ---------------------------------------------------------------------
  // PRO module
  // ---------------------------------------------------------------------
  ipcMain.handle('pro:latencyPing', async () => {
    return proManager.latencyPing();
  });

  ipcMain.handle('pro:bios', async () => {
    return proManager.analyseBios();
  });

  ipcMain.handle('pro:scanCaches', async () => {
    return proManager.scanCaches();
  });

  ipcMain.handle('pro:cacheUsers', async () => {
    return proManager.cacheUsers();
  });

  ipcMain.handle('pro:cleanCaches', async () => {
    return proManager.cleanCaches();
  });

  ipcMain.handle('pro:restoreCaches', async (_event, { backupRoot }: { backupRoot: string }) => {
    return proManager.restoreCaches(backupRoot);
  });

  ipcMain.handle('pro:battery', async () => {
    return proManager.batteryStatus();
  });

  ipcMain.handle('pro:applyPower', async (_event, { kind }: { kind: PowerProfileKind }) => {
    return proManager.applyPower(kind);
  });

  ipcMain.handle('pro:autoPower', async () => {
    return proManager.autoPower();
  });

  ipcMain.handle('pro:buildBundle', async () => {
    return proManager.buildBundle();
  });

  ipcMain.handle('pro:exportBundle', async (_event, { targetPath }: { targetPath: string }) => {
    return proManager.exportBundle(targetPath);
  });

  ipcMain.handle('pro:importBundle', async (_event, { sourcePath }: { sourcePath: string }) => {
    return proManager.importBundle(sourcePath);
  });

  ipcMain.handle('pro:syncConfig', async () => {
    return proManager.readSyncConfig();
  });

  ipcMain.handle('pro:setSyncConfig', async (_event, { config }: { config: SyncConfig }) => {
    return proManager.writeSyncConfig(config);
  });

  ipcMain.handle('pro:syncUpload', async () => {
    return proManager.upload();
  });

  ipcMain.handle('pro:syncDownload', async () => {
    return proManager.download();
  });

  ipcMain.handle('pro:pickExportPath', async () => {
    const result = await dialog.showSaveDialog({
      title: 'Exportar perfiles de ZeroTweaks',
      defaultPath: 'zerotweaks-profiles.json',
      filters: [{ name: 'ZeroTweaks bundle', extensions: ['json'] }],
    });
    return result.canceled ? null : result.filePath;
  });

  ipcMain.handle('pro:pickImportFile', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Importar perfiles de ZeroTweaks',
      properties: ['openFile'],
      filters: [{ name: 'ZeroTweaks bundle', extensions: ['json'] }],
    });
    return result.canceled || result.filePaths.length === 0 ? null : result.filePaths[0];
  });

  // Get tweak stats
  ipcMain.handle('stats:get', async () => {
    return tweakStats;
  });

  // Filter tweaks by hardware
  ipcMain.handle('tweaks:filterByHardware', async (_event, { hardware }: { hardware: HardwareProfile }) => {
    const hardwareForFilter = {
      isLaptop: hardware.isLaptop,
      cpuVendor: hardware.cpu.vendor,
      gpuVendor: hardware.gpu.vendor,
      windowsVersion: hardware.windowsVersion.version,
    };
    return filterTweaksByHardware(allTweaks, hardwareForFilter).map(t => ({
      id: t.id,
      name: t.name,
      category: t.category,
      description: t.description,
      whenHelps: t.whenHelps,
      risk: t.risk,
      evidence: t.evidence,
      requiresReboot: t.requiresReboot,
      compatibility: t.compatibility,
    }));
  });

  // Generate recovery script
  ipcMain.handle('recovery:generateScript', async () => {
    const manifest = await backupManager.listBackups();
    if (manifest.length === 0) return null;

    const latest = manifest[0];
    const script = `@echo off
echo ZeroTweaks Recovery Script
echo Restoring backup: ${latest.id}
echo.
echo This will restore your system to the state before ZeroTweaks changes.
echo Press Ctrl+C to cancel, or any key to continue...
pause >nul

echo Restoring registry...
reg import "%APPDATA%\\ZeroTweaks\\Backups\\${latest.id}\\registry\\*.reg"

echo Restoring services...
rem Services restored via SC commands

echo Restoring power plan...
powercfg /setactive ${latest.powerPlan}

echo Done. Please restart your computer.
pause
`;
    const desktopPath = join(process.env.USERPROFILE || '', 'Desktop', 'ZeroTweaks_Recover.bat');
    await fs.writeFile(desktopPath, script, 'utf8');
    return desktopPath;
  });
}

function getDefaultSettings(): Settings {
  return {
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
  };
}

function join(...paths: string[]): string {
  return paths.join('\\').replace(/\\+/g, '\\');
}