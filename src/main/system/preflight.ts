// Preflight checks before applying tweaks
import { execPowerShell } from '../../shared/utils/process.js';
import { logger } from '../utils/logger.js';

export interface PreflightResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  info: Record<string, unknown>;
}

export class PreflightChecks {
  static async run(): Promise<PreflightResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const info: Record<string, unknown> = {};

    // 1. Check Windows version
    const winVersion = await this.checkWindowsVersion();
    info.windowsVersion = winVersion;
    if (!winVersion.supported) {
      errors.push(`Unsupported Windows version: ${winVersion.version}. Minimum: Windows 10 2004 (19041)`);
    }

    // 2. Check admin rights
    const isAdmin = await this.checkAdminRights();
    info.isAdmin = isAdmin;
    if (!isAdmin) {
      errors.push('Administrator rights required. Please run as Administrator.');
    }

    // 3. Check disk space
    const diskSpace = await this.checkDiskSpace();
    info.diskSpace = diskSpace;
    if (diskSpace.freeGB < 1) {
      errors.push(`Insufficient disk space: ${diskSpace.freeGB} GB free. Need at least 1 GB.`);
    } else if (diskSpace.freeGB < 5) {
      warnings.push(`Low disk space: ${diskSpace.freeGB} GB free. Consider cleaning up.`);
    }

    // 4. Check pending reboot
    const pendingReboot = await this.checkPendingReboot();
    info.pendingReboot = pendingReboot;
    if (pendingReboot) {
      warnings.push('Pending reboot detected. Some tweaks may require reboot to take effect.');
    }

    // 5. Check BitLocker
    const bitlocker = await this.checkBitLocker();
    info.bitlocker = bitlocker;
    if (bitlocker) {
      warnings.push('BitLocker is enabled on system drive. Registry changes are safe, but be aware.');
    }

    // 6. Check form factor
    const formFactor = await this.checkFormFactor();
    info.formFactor = formFactor;

    // 7. Check system restore
    const systemRestore = await this.checkSystemRestore();
    info.systemRestore = systemRestore;
    if (!systemRestore.enabled) {
      warnings.push('System Restore is disabled. Zero Danger restore points cannot be created.');
    }

    return {
      ok: errors.length === 0,
      errors,
      warnings,
      info,
    };
  }

  private static async checkWindowsVersion(): Promise<{ version: string; build: number; supported: boolean }> {
    const { stdout } = await execPowerShell(`
      $os = Get-CimInstance Win32_OperatingSystem
      @{ Version = $os.Version; Build = [int]$os.Version.Split('.')[2] } | ConvertTo-Json
    `);
    const info = JSON.parse(stdout.trim());
    const build = info.Build;
    return {
      version: info.Version,
      build,
      supported: build >= 19041, // Windows 10 2004+
    };
  }

  private static async checkAdminRights(): Promise<boolean> {
    try {
      const { stdout } = await execPowerShell(`
        $principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
        $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
      `);
      return stdout.trim().toLowerCase() === 'true';
    } catch {
      return false;
    }
  }

  private static async checkDiskSpace(): Promise<{ freeGB: number; totalGB: number }> {
    const { stdout } = await execPowerShell(`
      $drive = Get-PSDrive C
      @{ FreeGB = [math]::Round($drive.Free / 1GB, 1); TotalGB = [math]::Round($drive.Used / 1GB + $drive.Free / 1GB, 1) } | ConvertTo-Json
    `);
    return JSON.parse(stdout.trim());
  }

  private static async checkPendingReboot(): Promise<boolean> {
    // NOTE: inside a JS template literal a lone `\S` is just `S` (JS drops the
    // backslash), which used to corrupt these registry paths into
    // `HKLM:SOFTWAREMicrosoft...` and made the check silently always false.
    // The backslashes must be doubled so PowerShell receives real paths.
    const { stdout } = await execPowerShell(`
      $pending = (Get-ItemProperty 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Component Based Servicing\\RebootPending' -ErrorAction SilentlyContinue) -ne $null
      $pending2 = (Get-ItemProperty 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\WindowsUpdate\\Auto Update\\RebootRequired' -ErrorAction SilentlyContinue) -ne $null
      $pending -or $pending2
    `);
    return stdout.trim().toLowerCase() === 'true';
  }

  private static async checkBitLocker(): Promise<boolean> {
    const { stdout } = await execPowerShell(`
      $vol = Get-BitLockerVolume -MountPoint C: -ErrorAction SilentlyContinue
      $vol.ProtectionStatus -eq 'On'
    `);
    return stdout.trim().toLowerCase() === 'true';
  }

  private static async checkFormFactor(): Promise<'desktop' | 'laptop' | 'unknown'> {
    const { stdout } = await execPowerShell(`
      $cs = Get-CimInstance Win32_ComputerSystem
      $pcType = $cs.PCSystemType
      if ($pcType -in @(3, 7)) { 'laptop' } elseif ($pcType -eq 2) { 'desktop' } else { 'unknown' }
    `);
    const result = stdout.trim().toLowerCase();
    return result === 'laptop' ? 'laptop' : result === 'desktop' ? 'desktop' : 'unknown';
  }

  private static async checkSystemRestore(): Promise<{ enabled: boolean; drive: string }> {
    const { stdout } = await execPowerShell(`
      $sr = Get-ComputerRestorePoint -ErrorAction SilentlyContinue
      $enabled = $sr -ne $null
      @{ Enabled = $enabled; Drive = 'C:' } | ConvertTo-Json
    `);
    return JSON.parse(stdout.trim());
  }
}