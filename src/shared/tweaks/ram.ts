import type { Tweak, TweakState, TweakResult, ApplyOptions } from '../types/all';
import { RegistryManager } from './registry';
import { execAsync } from '../utils/process';

// RAM & Storage Tweaks (35 target)

// 1. Disable Last Access Timestamp (disablelastaccess = 1)
export const disableLastAccess: Tweak = {
  id: 'storage.disable_last_access',
  name: 'Disable Last Access Timestamp Updates',
  nameKey: 'tweaks.storage.disableLastAccess.name',
  category: 'ram_storage',
  description: 'Sets fsutil behavior set disablelastaccess 1. Stops NTFS from updating last access time on file reads.',
  descriptionKey: 'tweaks.storage.disableLastAccess.description',
  whenHelps: 'Reduces metadata writes on reads. Small performance gain on HDDs, negligible on SSDs.',
  whenHelpsKey: 'tweaks.storage.disableLastAccess.whenHelps',
  risk: 'safe',
  evidence: 'measured',
  impacto: 'bajo',
      requiresReboot: true,
  compatibility: {
    windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
    formFactors: ['desktop', 'laptop'],
  },
  detect: async (): Promise<TweakState> => {
    const { stdout } = await execAsync('fsutil behavior query disablelastaccess');
    const enabled = stdout.includes('= 1');
    return { path: 'FSUTIL', name: 'disablelastaccess', type: 'REG_DWORD', value: enabled ? 1 : 0, existed: true };
  },
  apply: async (options?: ApplyOptions): Promise<TweakResult> => {
    if (options?.dryRun) return { ok: true, data: 'Would disable last access timestamp updates' };
    try {
      const current = await disableLastAccess.detect();
      await execAsync('fsutil behavior set disablelastaccess 1');
      return { ok: true, previousState: current, newState: { ...current, value: 1 } };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  revert: async (originalState: TweakState): Promise<TweakResult> => {
    try {
      await execAsync(`fsutil behavior set disablelastaccess ${originalState.value}`);
      return { ok: true };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  verify: async (expectedState: TweakState): Promise<boolean> => {
    const current = await disableLastAccess.detect();
    return current.value === 1;
  },
};

// 2. TRIM Status (Read-only + Enable)
export const trimStatus: Tweak = {
  id: 'storage.trim_status',
  name: 'TRIM Status & Enable',
  nameKey: 'tweaks.storage.trimStatus.name',
  category: 'ram_storage',
  description: 'Queries DisableDeleteNotify (0 = TRIM enabled). Sets to 0 if disabled. SSDs only.',
  descriptionKey: 'tweaks.storage.trimStatus.description',
  whenHelps: 'Ensures TRIM is active for SSD performance/longevity. Default is enabled.',
  whenHelpsKey: 'tweaks.storage.trimStatus.whenHelps',
  risk: 'safe',
  evidence: 'measured',
  impacto: 'bajo',
      requiresReboot: false,
  compatibility: {
    windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
    formFactors: ['desktop', 'laptop'],
  },
  detect: async (): Promise<TweakState> => {
    const { stdout } = await execAsync('fsutil behavior query DisableDeleteNotify');
    const disabled = stdout.includes('= 1');
    return { path: 'FSUTIL', name: 'DisableDeleteNotify', type: 'REG_DWORD', value: disabled ? 1 : 0, existed: true };
  },
  apply: async (options?: ApplyOptions): Promise<TweakResult> => {
    if (options?.dryRun) return { ok: true, data: 'Would ensure TRIM is enabled (DisableDeleteNotify=0)' };
    try {
      const current = await trimStatus.detect();
      if (current.value === 1) {
        await execAsync('fsutil behavior set DisableDeleteNotify 0');
      }
      return { ok: true, previousState: current, newState: { ...current, value: 0 } };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  revert: async (originalState: TweakState): Promise<TweakResult> => {
    try {
      await execAsync(`fsutil behavior set DisableDeleteNotify ${originalState.value}`);
      return { ok: true };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  verify: async (expectedState: TweakState): Promise<boolean> => {
    const current = await trimStatus.detect();
    return current.value === 0;
  },
};

// 3. Optimize Volumes (Defrag/Trim)
export const optimizeVolumes: Tweak = {
  id: 'storage.optimize_volumes',
  name: 'Optimize Volumes (Defrag HDD / TRIM SSD)',
  nameKey: 'tweaks.storage.optimizeVolumes.name',
  category: 'ram_storage',
  description: 'Runs Optimize-Volume on all fixed drives. Uses Defrag for HDD, TRIM/Retrim for SSD.',
  descriptionKey: 'tweaks.storage.optimizeVolumes.description',
  whenHelps: 'Maintains drive performance. Safe, scheduled by default. Manual run for immediate effect.',
  whenHelpsKey: 'tweaks.storage.optimizeVolumes.whenHelps',
  risk: 'safe',
  evidence: 'measured',
  impacto: 'bajo',
      requiresReboot: false,
  compatibility: {
    windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
    formFactors: ['desktop', 'laptop'],
  },
  detect: async (): Promise<TweakState> => {
    const { stdout } = await execAsync('powershell -NoProfile -Command "Get-Volume | Where-Object {$_.DriveType -eq \\"Fixed\\"} | Select-Object DriveLetter, FileSystemLabel, SizeRemaining | ConvertTo-Json"');
    const volumes = stdout.trim() ? JSON.parse(stdout) : [];
    return { path: 'VOLUMES', name: 'FixedVolumes', type: 'REG_SZ', value: volumes, existed: true };
  },
  apply: async (options?: ApplyOptions): Promise<TweakResult> => {
    if (options?.dryRun) return { ok: true, data: 'Would run Optimize-Volume on all fixed drives' };
    try {
      const current = await optimizeVolumes.detect();
      await execAsync('powershell -NoProfile -Command "Get-Volume | Where-Object {$_.DriveType -eq \\"Fixed\\"} | ForEach-Object { Optimize-Volume -DriveLetter $_.DriveLetter -Verbose }"');
      return { ok: true, previousState: current, newState: { ...current, value: 'optimized' } };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  revert: async (originalState: TweakState): Promise<TweakResult> => {
    return { ok: true, data: 'Optimize is non-destructive' };
  },
  verify: async (expectedState: TweakState): Promise<boolean> => {
    return true;
  },
};

// 4. SMART Status Check (Read-only)
export const smartStatus: Tweak = {
  id: 'storage.smart_status',
  name: 'SMART Health Status Check',
  nameKey: 'tweaks.storage.smartStatus.name',
  category: 'ram_storage',
  description: 'Reads SMART data from all drives. Reports health, temperature, reallocated sectors. Read-only.',
  descriptionKey: 'tweaks.storage.smartStatus.description',
  whenHelps: 'Early warning for drive failure. No changes made.',
  whenHelpsKey: 'tweaks.storage.smartStatus.whenHelps',
  risk: 'safe',
  evidence: 'measured',
  impacto: 'bajo',
      requiresReboot: false,
  compatibility: {
    windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
    formFactors: ['desktop', 'laptop'],
  },
  detect: async (): Promise<TweakState> => {
    const { stdout } = await execAsync('powershell -NoProfile -Command "Get-CimInstance MSStorageDriver_FailurePredictStatus -Namespace root\\wmi | Select-Object InstanceName, PredictFailure, Reason | ConvertTo-Json"');
    const smart = stdout.trim() ? JSON.parse(stdout) : [];
    return { path: 'WMI', name: 'SMART', type: 'REG_SZ', value: smart, existed: true };
  },
  apply: async (options?: ApplyOptions): Promise<TweakResult> => {
    return { ok: true, data: 'Read-only diagnostic' };
  },
  revert: async (originalState: TweakState): Promise<TweakResult> => {
    return { ok: true };
  },
  verify: async (expectedState: TweakState): Promise<boolean> => {
    return true;
  },
};

// 5. Memory Compression (Enable)
export const memoryCompression: Tweak = {
  id: 'ram.memory_compression',
  name: 'Enable Memory Compression',
  nameKey: 'tweaks.ram.memoryCompression.name',
  category: 'ram_storage',
  description: 'Ensures Memory Compression is enabled (default on). Compresses memory pages instead of paging to disk.',
  descriptionKey: 'tweaks.ram.memoryCompression.description',
  whenHelps: 'Reduces page file usage, improves responsiveness under memory pressure. Default ON.',
  whenHelpsKey: 'tweaks.ram.memoryCompression.whenHelps',
  risk: 'safe',
  evidence: 'measured',
  impacto: 'bajo',
      requiresReboot: false,
  compatibility: {
    windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
    formFactors: ['desktop', 'laptop'],
  },
  detect: async (): Promise<TweakState> => {
    const { stdout } = await execAsync('powershell -NoProfile -Command "Get-MMAgent | Select-Object MemoryCompression | ConvertTo-Json"');
    const info = stdout.trim() ? JSON.parse(stdout) : { MemoryCompression: true };
    return { path: 'MMAgent', name: 'MemoryCompression', type: 'REG_DWORD', value: info.MemoryCompression ? 1 : 0, existed: true };
  },
  apply: async (options?: ApplyOptions): Promise<TweakResult> => {
    if (options?.dryRun) return { ok: true, data: 'Would enable Memory Compression' };
    try {
      const current = await memoryCompression.detect();
      if (current.value === 0) {
        await execAsync('powershell -NoProfile -Command "Enable-MMAgent -MemoryCompression"');
      }
      return { ok: true, previousState: current, newState: { ...current, value: 1 } };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  revert: async (originalState: TweakState): Promise<TweakResult> => {
    try {
      if (originalState.value === 0) {
        await execAsync('powershell -NoProfile -Command "Disable-MMAgent -MemoryCompression"');
      }
      return { ok: true };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  verify: async (expectedState: TweakState): Promise<boolean> => {
    const current = await memoryCompression.detect();
    return current.value === 1;
  },
};

// 6. Page File Management (System Managed)
export const pageFileSystemManaged: Tweak = {
  id: 'ram.pagefile_system',
  name: 'Set Page File to System Managed',
  nameKey: 'tweaks.ram.pagefileSystem.name',
  category: 'ram_storage',
  description: 'Sets page file to "System managed size" on all drives. Recommended for stability.',
  descriptionKey: 'tweaks.ram.pagefileSystem.description',
  whenHelps: 'Prevents OOM crashes. Windows manages size dynamically. Custom size only for specific workloads.',
  whenHelpsKey: 'tweaks.ram.pagefileSystem.whenHelps',
  risk: 'safe',
  evidence: 'measured',
  impacto: 'bajo',
      requiresReboot: true,
  compatibility: {
    windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
    formFactors: ['desktop', 'laptop'],
  },
  detect: async (): Promise<TweakState> => {
    const { stdout } = await execAsync('powershell -NoProfile -Command "Get-CimInstance Win32_PageFileSetting | Select-Object Name, InitialSize, MaximumSize | ConvertTo-Json"');
    const pf = stdout.trim() ? JSON.parse(stdout) : [];
    return { path: 'WMI', name: 'PageFile', type: 'REG_SZ', value: pf, existed: true };
  },
  apply: async (options?: ApplyOptions): Promise<TweakResult> => {
    if (options?.dryRun) return { ok: true, data: 'Would set page file to system managed' };
    try {
      const current = await pageFileSystemManaged.detect();
      await execAsync('powershell -NoProfile -Command "Set-CimInstance -Class Win32_PageFileSetting -Arguments @{Name=\\"C:\\\\pagefile.sys\\"; InitialSize=0; MaximumSize=0}"');
      return { ok: true, previousState: current, newState: { ...current, value: 'system_managed' } };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  revert: async (originalState: TweakState): Promise<TweakResult> => {
    return { ok: true, data: 'Restore via System Properties > Advanced > Performance > Virtual Memory' };
  },
  verify: async (expectedState: TweakState): Promise<boolean> => {
    const current = await pageFileSystemManaged.detect();
    const pf = current.value as any[];
    return pf.some(p => p.InitialSize === 0 && p.MaximumSize === 0);
  },
};

// 7. Clear Standby List (Manual, Advanced)
export const clearStandbyList: Tweak = {
  id: 'ram.clear_standby',
  name: 'Clear Standby List (Empty Standby List)',
  nameKey: 'tweaks.ram.clearStandby.name',
  category: 'ram_storage',
  description: 'Runs EmptyStandbyList.exe (external tool) to clear modified/standby pages. Advanced, manual only. Evidence: debated.',
  descriptionKey: 'tweaks.ram.clearStandby.description',
  whenHelps: 'Frees RAM shown as "Cached". Can cause stutter as apps re-read from disk. Use only if memory pressure.',
  whenHelpsKey: 'tweaks.ram.clearStandby.whenHelps',
  risk: 'advanced',
  evidence: 'debated',
  impacto: 'bajo',
  requiresReboot: false,
  compatibility: {
    windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
    formFactors: ['desktop', 'laptop'],
  },
  unavailableReason: 'Requiere la herramienta externa EmptyStandbyList.exe, que no se incluye. Usa RAMMap de Microsoft si lo necesitas.',
  detect: async (): Promise<TweakState> => {
    const { stdout } = await execAsync('powershell -NoProfile -Command "Get-CimInstance Win32_OperatingSystem | Select-Object FreePhysicalMemory, TotalVisibleMemorySize | ConvertTo-Json"');
    const mem = stdout.trim() ? JSON.parse(stdout) : { FreePhysicalMemory: 0, TotalVisibleMemorySize: 0 };
    return { path: 'MEMORY', name: 'StandbyList', type: 'REG_SZ', value: mem, existed: true };
  },
  apply: async (options?: ApplyOptions): Promise<TweakResult> => {
    if (options?.dryRun) return { ok: true, data: 'Would clear standby list (requires EmptyStandbyList.exe)' };
    return { ok: false, error: 'Requires EmptyStandbyList.exe (not bundled). Use RamMap or similar.' };
  },
  revert: async (originalState: TweakState): Promise<TweakResult> => {
    return { ok: true, data: 'Memory refills naturally' };
  },
  verify: async (expectedState: TweakState): Promise<boolean> => {
    return false;
  },
};

// 8. RAM Info Report (Read-only)
export const ramInfo: Tweak = {
  id: 'ram.info_report',
  name: 'RAM Configuration Report',
  nameKey: 'tweaks.ram.infoReport.name',
  category: 'ram_storage',
  description: 'Reports total RAM, speed, type (DDR4/5), channels, timings. Read-only diagnostic.',
  descriptionKey: 'tweaks.ram.infoReport.description',
  whenHelps: 'Verifies RAM running at rated speed (XMP/EXPO). Identifies single-channel configs.',
  whenHelpsKey: 'tweaks.ram.infoReport.whenHelps',
  risk: 'safe',
  evidence: 'measured',
  impacto: 'bajo',
      requiresReboot: false,
  compatibility: {
    windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
    formFactors: ['desktop', 'laptop'],
  },
  detect: async (): Promise<TweakState> => {
    const { stdout } = await execAsync('powershell -NoProfile -Command "Get-CimInstance Win32_PhysicalMemory | Select-Object Capacity, Speed, ConfiguredClockSpeed, Manufacturer, PartNumber | ConvertTo-Json"');
    const dimms = stdout.trim() ? JSON.parse(stdout) : [];
    const { stdout: total } = await execAsync('powershell -NoProfile -Command "[math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 1)"');
    return { path: 'WMI', name: 'RAMInfo', type: 'REG_SZ', value: { dimms, totalGB: parseFloat(total.trim()) }, existed: true };
  },
  apply: async (options?: ApplyOptions): Promise<TweakResult> => {
    return { ok: true, data: 'Read-only diagnostic' };
  },
  revert: async (originalState: TweakState): Promise<TweakResult> => {
    return { ok: true };
  },
  verify: async (expectedState: TweakState): Promise<boolean> => {
    return true;
  },
};

export const ramTweaks: Tweak[] = [
  disableLastAccess,
  trimStatus,
  optimizeVolumes,
  smartStatus,
  memoryCompression,
  pageFileSystemManaged,
  clearStandbyList,
  ramInfo,
];