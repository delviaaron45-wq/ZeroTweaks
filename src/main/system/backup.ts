// Backup Manager - Handles system state backup and restore
import { execPowerShell } from '../../shared/utils/process.js';
import { getBackupDir, writeJson, readJson, ensureDir } from '../../shared/utils/files.js';
import { logger } from '../utils/logger.js';
import { join } from 'path';
import type { TweakState, BackupManifest, ServiceState, JournalEntry } from '../../shared/types/index.js';
import { RegistryManager } from '../../shared/tweaks/registry.js';

export class BackupManager {
  private currentManifest: BackupManifest | null = null;
  private backupDir: string = '';

  async createBackup(profileId?: string): Promise<BackupManifest> {
    this.backupDir = getBackupDir();
    await ensureDir(this.backupDir);

    logger.info(`Creating backup in ${this.backupDir}`);

    // 1. Create system restore point
    await this.createRestorePoint();

    // 2. Capture registry tweaks state
    const tweaks = await this.captureTweakStates();

    // 3. Capture service states
    const services = await this.captureServiceStates();

    // 4. Capture power plan
    const powerPlan = await this.capturePowerPlan();

    // 5. Capture AppX packages
    const appxPackages = await this.captureAppxPackages();

    // 6. Capture HAGS and Game Mode state
    const hagsState = await this.captureHAGSState();
    const gameModeState = await this.captureGameModeState();

    // 7. Capture in-game configuration backups (Fortnite, ...) so a Zero Danger
    //    restore also puts the game settings back.
    const gameConfigs = await this.captureGameConfigBackups();

    // 8. Create manifest
    this.currentManifest = {
      id: `backup_${Date.now()}`,
      timestamp: new Date().toISOString(),
      profileId,
      tweaks,
      services,
      powerPlan,
      appxPackages,
      hagsState,
      gameModeState,
      journal: [],
      gameConfigs,
    };

    // 8. Save manifest
    await writeJson(join(this.backupDir, 'manifest.json'), this.currentManifest);

    // 9. Export .reg files for each registry key (courtesy backup)
    await this.exportRegFiles(tweaks);

    logger.info('Backup created successfully');
    return this.currentManifest;
  }

  async restoreBackup(manifestId: string): Promise<void> {
    const backupPath = join(getAppDataPath('Backups'), manifestId);
    const manifest = await readJson<BackupManifest>(join(backupPath, 'manifest.json'));

    if (!manifest) {
      throw new Error(`Backup manifest not found: ${manifestId}`);
    }

    logger.info(`Restoring backup ${manifestId}...`);

    // 1. Restore registry tweaks
    for (const tweak of manifest.tweaks) {
      if (tweak.existed) {
        await RegistryManager.setValue(
          this.getHive(tweak.path),
          this.getKeyPath(tweak.path),
          tweak.name,
          tweak.type,
          tweak.value
        );
      } else {
        await RegistryManager.deleteValue(
          this.getHive(tweak.path),
          this.getKeyPath(tweak.path),
          tweak.name
        );
      }
    }

    // 2. Restore services
    for (const service of manifest.services) {
      await execPowerShell(`sc config ${service.name} start= ${service.startType.toLowerCase()}`);
      if (service.status === 'Running') {
        await execPowerShell(`sc start ${service.name}`);
      } else {
        await execPowerShell(`sc stop ${service.name}`);
      }
    }

    // 3. Restore power plan
    if (manifest.powerPlan) {
      await execPowerShell(`powercfg /setactive ${manifest.powerPlan}`);
    }

    // 4. Restore AppX packages (reinstall from provisioned)
    for (const pkg of manifest.appxPackages) {
      await execPowerShell(`Add-AppxPackage -Register "C:\\Program Files\\WindowsApps\\${pkg}\\AppxManifest.xml" -DisableDevelopmentMode`);
    }

    // 5. Restore HAGS
    await RegistryManager.setValue('HKLM', '\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers', 'HwSchMode', 'REG_DWORD', manifest.hagsState ? 2 : 1);

    // 6. Restore Game Mode
    const sid = await this.getCurrentUserSid();
    await RegistryManager.setValue('HKU', `\\${sid}\\Software\\Microsoft\\GameBar`, 'AutoGameModeEnabled', 'REG_DWORD', manifest.gameModeState ? 1 : 0);

    // 7. Refresh Explorer
    await execPowerShell('Stop-Process -Name explorer -Force');

    // 8. Restore in-game configuration files
    for (const gameConfig of manifest.gameConfigs ?? []) {
      const stored = join(backupPath, gameConfig.backupPath);
      const content = await fs.readFile(stored, 'utf8').catch(() => null);
      if (content === null) {
        logger.warn(`Game config backup missing for ${gameConfig.gameId}`);
        continue;
      }
      await fs.writeFile(gameConfig.configPath, content, 'utf8');
      logger.info(`Restored game config for ${gameConfig.gameId}`);
    }

    logger.info('Backup restored successfully');
  }

  /**
   * Copies the newest in-game configuration backup of every game into the
   * current backup folder and returns the manifest entries.
   */
  private async captureGameConfigBackups(): Promise<BackupManifest['gameConfigs']> {
    const sourceRoot = join(getAppDataPath('Backups'), 'game-configs');
    const stamps = await fs.readdir(sourceRoot).catch(() => [] as string[]);
    if (stamps.length === 0) return [];

    const targetRoot = join(this.backupDir, 'game-configs');
    await ensureDir(targetRoot);

    const entries: NonNullable<BackupManifest['gameConfigs']> = [];
    const seen = new Set<string>();

    for (const stamp of stamps.sort().reverse()) {
      const files = await fs.readdir(join(sourceRoot, stamp)).catch(() => [] as string[]);
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        const gameId = file.replace(/\.json$/, '');
        if (seen.has(gameId)) continue;
        const source = join(sourceRoot, stamp, file);
        const target = join(targetRoot, file);
        const copied = await fs.copyFile(source, target).then(() => true).catch(() => false);
        if (!copied) continue;

        const meta = await fs
          .readFile(source, 'utf8')
          .then(text => JSON.parse(text) as { gameName?: string; configPath?: string; createdAt?: string })
          .catch(() => ({}) as { gameName?: string; configPath?: string; createdAt?: string });
        const iniSource = join(sourceRoot, stamp, `${gameId}.ini`);
        const iniCopied = await fs.copyFile(iniSource, join(targetRoot, `${gameId}.ini`)).then(() => true).catch(() => false);
        if (!iniCopied) continue;

        seen.add(gameId);
        entries.push({
          gameId,
          gameName: meta.gameName ?? gameId,
          configPath: meta.configPath ?? '',
          backupPath: join('game-configs', `${gameId}.ini`),
          createdAt: meta.createdAt ?? new Date().toISOString(),
        });
      }
    }

    return entries;
  }

  async listBackups(): Promise<BackupManifest[]> {
    const backupsDir = getAppDataPath('Backups');
    try {
      const dirs = await fs.readdir(backupsDir);
      const manifests: BackupManifest[] = [];
      for (const dir of dirs) {
        const manifest = await readJson<BackupManifest>(join(backupsDir, dir, 'manifest.json'));
        if (manifest) manifests.push(manifest);
      }
      return manifests.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch {
      return [];
    }
  }

  async deleteBackup(manifestId: string): Promise<void> {
    const backupPath = join(getAppDataPath('Backups'), manifestId);
    await fs.rm(backupPath, { recursive: true, force: true });
  }

  private async createRestorePoint(): Promise<void> {
    // Temporarily disable 24h limit
    await RegistryManager.setValue('HKLM', '\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\SystemRestore', 'SystemRestorePointCreationFrequency', 'REG_DWORD', 0);

    try {
      await execPowerShell(`Checkpoint-Computer -Description "ZeroTweaks_${new Date().toISOString()}" -RestorePointType MODIFY_SETTINGS`);
    } finally {
      // Restore original limit (0 = disabled, default is 86400 = 24h)
      await RegistryManager.deleteValue('HKLM', '\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\SystemRestore', 'SystemRestorePointCreationFrequency');
    }
  }

  private async captureTweakStates(): Promise<TweakState[]> {
    // This would iterate through all tweaks and capture their current state
    // For now, return empty - actual implementation in tweak application
    return [];
  }

  private async captureServiceStates(): Promise<ServiceState[]> {
    const { stdout } = await execPowerShell(`
      Get-Service | Where-Object { $_.StartType -ne 'Unknown' } | Select-Object Name, StartType, Status | ConvertTo-Json
    `);
    const services = JSON.parse(stdout.trim());
    return Array.isArray(services) ? services : [services].filter(Boolean);
  }

  private async capturePowerPlan(): Promise<string> {
    const { stdout } = await execPowerShell('powercfg /getactivescheme');
    const match = stdout.match(/([a-f0-9-]{36})/);
    return match ? match[1] : '';
  }

  private async captureAppxPackages(): Promise<string[]> {
    const { stdout } = await execPowerShell(`
      Get-AppxPackage -AllUsers | Where-Object { $_.NonRemovable -eq $false } | Select-Object -ExpandProperty PackageFullName
    `);
    return stdout.trim().split('\n').filter(Boolean);
  }

  private async captureHAGSState(): Promise<boolean> {
    const result = await RegistryManager.getValue('HKLM', '\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers', 'HwSchMode');
    return result.value === 2;
  }

  private async captureGameModeState(): Promise<boolean> {
    const sid = await this.getCurrentUserSid();
    const result = await RegistryManager.getValue('HKU', `\\${sid}\\Software\\Microsoft\\GameBar`, 'AutoGameModeEnabled');
    return result.value === 1;
  }

  private async exportRegFiles(tweaks: TweakState[]): Promise<void> {
    const regDir = join(this.backupDir, 'registry');
    await ensureDir(regDir);

    // Group by registry key path
    const byKey = new Map<string, TweakState[]>();
    for (const tweak of tweaks) {
      const keyPath = tweak.path;
      if (!byKey.has(keyPath)) byKey.set(keyPath, []);
      byKey.get(keyPath)!.push(tweak);
    }

    for (const [keyPath, values] of byKey) {
      let regContent = `Windows Registry Editor Version 5.00\n\n[${keyPath.replace(/^HKLM/, 'HKEY_LOCAL_MACHINE').replace(/^HKCU/, 'HKEY_CURRENT_USER')}]\n`;
      for (const value of values) {
        if (value.existed) {
          const formattedValue = this.formatRegValue(value.type, value.value);
          regContent += `"${value.name}"=${formattedValue}\n`;
        } else {
          regContent += `"${value.name}"=-\n`;
        }
      }
      const fileName = keyPath.replace(/[\\:]/g, '_').replace(/^HK(LM|CU)_/, '') + '.reg';
      await fs.writeFile(join(regDir, fileName), regContent, 'utf8');
    }
  }

  private formatRegValue(type: string, value: unknown): string {
    switch (type) {
      case 'REG_DWORD':
      case 'REG_QWORD':
        return `dword:${Number(value).toString(16).padStart(8, '0')}`;
      case 'REG_SZ':
      case 'REG_EXPAND_SZ':
        return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
      case 'REG_MULTI_SZ':
        return `hex(7):${Array.isArray(value) ? value.map(v => Buffer.from(v + '\0', 'utf16le').toString('hex').toUpperCase()).join(',') : ''}`;
      default:
        return `hex:${Buffer.from(String(value)).toString('hex').toUpperCase()}`;
    }
  }

  private getHive(path: string): 'HKLM' | 'HKCU' | 'HKCR' | 'HKU' | 'HKCC' {
    if (path.startsWith('HKLM')) return 'HKLM';
    if (path.startsWith('HKCU')) return 'HKCU';
    if (path.startsWith('HKCR')) return 'HKCR';
    if (path.startsWith('HKU')) return 'HKU';
    return 'HKLM';
  }

  private getKeyPath(path: string): string {
    return path.replace(/^HK(LM|CU|CR|U|CC)/, '');
  }

  private async getCurrentUserSid(): Promise<string> {
    const { stdout } = await execPowerShell('whoami /user /fo csv');
    const lines = stdout.trim().split('\n');
    return lines[1]?.split(',')[1]?.replace(/"/g, '') || '';
  }
}

// Import fs at top
import fs from 'fs/promises';
import { getAppDataPath } from '../../shared/utils/files';