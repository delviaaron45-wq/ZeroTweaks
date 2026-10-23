// PRO module manager - orchestrates the exclusive tools.
import { execPowerShell } from '../../shared/utils/process.js';
import { logger } from '../utils/logger.js';
import { analyseBios } from './bios.js';
import { applyPowerProfile, getBatteryStatus } from './battery.js';
import { cleanShaderCaches, listCacheUsers, scanShaderCaches, restoreShaderCaches } from './shaderCache.js';
import {
  buildBundle,
  downloadBundle,
  exportBundleToFile,
  importBundleFromFile,
  readSyncConfig,
  uploadBundle,
  writeSyncConfig,
} from './sync.js';
import type {
  BiosDiagnostics,
  BatteryStatus,
  PowerProfileKind,
  PowerSwitchResult,
  ProfileBundle,
  ShaderCacheCleanResult,
  ShaderCacheReport,
  SyncConfig,
  SyncResult,
} from '../../shared/types/pro.js';

export class ProManager {
  /** Round trip marker used by the click latency tester. */
  async latencyPing(): Promise<{ t: number }> {
    return { t: Date.now() };
  }

  /** BIOS / board diagnostics. */
  analyseBios(): Promise<BiosDiagnostics> {
    return analyseBios();
  }

  /** Shader cache inventory. */
  scanCaches(): Promise<ShaderCacheReport> {
    return scanShaderCaches();
  }

  /** Games that keep the cache busy (cleaning with them open is a bad idea). */
  cacheUsers(): Promise<string[]> {
    return listCacheUsers();
  }

  /** Moves the shader caches aside so the driver rebuilds them. */
  cleanCaches(): Promise<ShaderCacheCleanResult> {
    return cleanShaderCaches();
  }

  /** Restores a previous shader cache backup. */
  restoreCaches(backupRoot: string): Promise<{ ok: boolean; restored: number; error?: string }> {
    return restoreShaderCaches(backupRoot);
  }

  /** Battery / charger state. */
  batteryStatus(): Promise<BatteryStatus> {
    return getBatteryStatus();
  }

  /** Applies the performance or the silent power profile. */
  applyPower(kind: PowerProfileKind): Promise<PowerSwitchResult> {
    return applyPowerProfile(kind);
  }

  /** Bundle with the settings and the profiles. */
  buildBundle(): Promise<ProfileBundle> {
    return buildBundle();
  }

  exportBundle(targetPath: string): Promise<{ ok: boolean; path: string; error?: string }> {
    return exportBundleToFile(targetPath);
  }

  importBundle(sourcePath: string): Promise<{ ok: boolean; bundle?: ProfileBundle; profiles: number; error?: string }> {
    return importBundleFromFile(sourcePath);
  }

  readSyncConfig(): Promise<SyncConfig> {
    return readSyncConfig();
  }

  writeSyncConfig(config: SyncConfig): Promise<SyncConfig> {
    return writeSyncConfig(config);
  }

  upload(): Promise<SyncResult> {
    return uploadBundle();
  }

  download(): Promise<SyncResult> {
    return downloadBundle();
  }

  /**
   * Applies the power profile that matches the charger state. Used by the
   * "auto" mode of the battery saver.
   */
  async autoPower(): Promise<PowerSwitchResult> {
    try {
      const status = await getBatteryStatus();
      const kind: PowerProfileKind = status.onBattery ? 'saver' : 'performance';
      return await applyPowerProfile(kind);
    } catch (err) {
      logger.warn('auto power failed', err);
      return { ok: false, kind: 'balanced', planName: '', error: (err as Error).message, details: [] };
    }
  }

  /** Small helper: runs a PowerShell command (used by the diagnostics). */
  async runPowerShell(script: string): Promise<string> {
    const { stdout } = await execPowerShell(script, { timeout: 20000 });
    return stdout;
  }
}
