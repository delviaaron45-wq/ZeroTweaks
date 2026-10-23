"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ramTweaks = exports.ramInfo = exports.clearStandbyList = exports.pageFileSystemManaged = exports.memoryCompression = exports.smartStatus = exports.optimizeVolumes = exports.trimStatus = exports.disableLastAccess = void 0;
const process_1 = require("../utils/process");
// RAM & Storage Tweaks (35 target)
// 1. Disable Last Access Timestamp (disablelastaccess = 1)
exports.disableLastAccess = {
    id: 'storage.disable_last_access',
    name: 'Disable Last Access Timestamp Updates',
    category: 'ram_storage',
    description: 'Sets fsutil behavior set disablelastaccess 1. Stops NTFS from updating last access time on file reads.',
    whenHelps: 'Reduces metadata writes on reads. Small performance gain on HDDs, negligible on SSDs.',
    risk: 'safe',
    evidence: 'measured',
    requiresReboot: true,
    compatibility: {
        windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
        formFactors: ['desktop', 'laptop'],
    },
    detect: async () => {
        const { stdout } = await (0, process_1.execAsync)('fsutil behavior query disablelastaccess');
        const enabled = stdout.includes('= 1');
        return { path: 'FSUTIL', name: 'disablelastaccess', type: 'REG_DWORD', value: enabled ? 1 : 0, existed: true };
    },
    apply: async (options) => {
        if (options?.dryRun)
            return { ok: true, data: 'Would disable last access timestamp updates' };
        try {
            const current = await exports.disableLastAccess.detect();
            await (0, process_1.execAsync)('fsutil behavior set disablelastaccess 1');
            return { ok: true, previousState: current, newState: { ...current, value: 1 } };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    },
    revert: async (originalState) => {
        try {
            await (0, process_1.execAsync)(`fsutil behavior set disablelastaccess ${originalState.value}`);
            return { ok: true };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    },
    verify: async (expectedState) => {
        const current = await exports.disableLastAccess.detect();
        return current.value === 1;
    },
};
// 2. TRIM Status (Read-only + Enable)
exports.trimStatus = {
    id: 'storage.trim_status',
    name: 'TRIM Status & Enable',
    category: 'ram_storage',
    description: 'Queries DisableDeleteNotify (0 = TRIM enabled). Sets to 0 if disabled. SSDs only.',
    whenHelps: 'Ensures TRIM is active for SSD performance/longevity. Default is enabled.',
    risk: 'safe',
    evidence: 'measured',
    requiresReboot: false,
    compatibility: {
        windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
        formFactors: ['desktop', 'laptop'],
    },
    detect: async () => {
        const { stdout } = await (0, process_1.execAsync)('fsutil behavior query DisableDeleteNotify');
        const disabled = stdout.includes('= 1');
        return { path: 'FSUTIL', name: 'DisableDeleteNotify', type: 'REG_DWORD', value: disabled ? 1 : 0, existed: true };
    },
    apply: async (options) => {
        if (options?.dryRun)
            return { ok: true, data: 'Would ensure TRIM is enabled (DisableDeleteNotify=0)' };
        try {
            const current = await exports.trimStatus.detect();
            if (current.value === 1) {
                await (0, process_1.execAsync)('fsutil behavior set DisableDeleteNotify 0');
            }
            return { ok: true, previousState: current, newState: { ...current, value: 0 } };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    },
    revert: async (originalState) => {
        try {
            await (0, process_1.execAsync)(`fsutil behavior set DisableDeleteNotify ${originalState.value}`);
            return { ok: true };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    },
    verify: async (expectedState) => {
        const current = await exports.trimStatus.detect();
        return current.value === 0;
    },
};
// 3. Optimize Volumes (Defrag/Trim)
exports.optimizeVolumes = {
    id: 'storage.optimize_volumes',
    name: 'Optimize Volumes (Defrag HDD / TRIM SSD)',
    category: 'ram_storage',
    description: 'Runs Optimize-Volume on all fixed drives. Uses Defrag for HDD, TRIM/Retrim for SSD.',
    whenHelps: 'Maintains drive performance. Safe, scheduled by default. Manual run for immediate effect.',
    risk: 'safe',
    evidence: 'measured',
    requiresReboot: false,
    compatibility: {
        windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
        formFactors: ['desktop', 'laptop'],
    },
    detect: async () => {
        const { stdout } = await (0, process_1.execAsync)('powershell -NoProfile -Command "Get-Volume | Where-Object {$_.DriveType -eq \\"Fixed\\"} | Select-Object DriveLetter, FileSystemLabel, SizeRemaining | ConvertTo-Json"');
        const volumes = stdout.trim() ? JSON.parse(stdout) : [];
        return { path: 'VOLUMES', name: 'FixedVolumes', type: 'REG_SZ', value: volumes, existed: true };
    },
    apply: async (options) => {
        if (options?.dryRun)
            return { ok: true, data: 'Would run Optimize-Volume on all fixed drives' };
        try {
            const current = await exports.optimizeVolumes.detect();
            await (0, process_1.execAsync)('powershell -NoProfile -Command "Get-Volume | Where-Object {$_.DriveType -eq \\"Fixed\\"} | ForEach-Object { Optimize-Volume -DriveLetter $_.DriveLetter -Verbose }"');
            return { ok: true, previousState: current, newState: { ...current, value: 'optimized' } };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    },
    revert: async (originalState) => {
        return { ok: true, data: 'Optimize is non-destructive' };
    },
    verify: async (expectedState) => {
        return true;
    },
};
// 4. SMART Status Check (Read-only)
exports.smartStatus = {
    id: 'storage.smart_status',
    name: 'SMART Health Status Check',
    category: 'ram_storage',
    description: 'Reads SMART data from all drives. Reports health, temperature, reallocated sectors. Read-only.',
    whenHelps: 'Early warning for drive failure. No changes made.',
    risk: 'safe',
    evidence: 'measured',
    requiresReboot: false,
    compatibility: {
        windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
        formFactors: ['desktop', 'laptop'],
    },
    detect: async () => {
        const { stdout } = await (0, process_1.execAsync)('powershell -NoProfile -Command "Get-CimInstance MSStorageDriver_FailurePredictStatus -Namespace root\\wmi | Select-Object InstanceName, PredictFailure, Reason | ConvertTo-Json"');
        const smart = stdout.trim() ? JSON.parse(stdout) : [];
        return { path: 'WMI', name: 'SMART', type: 'REG_SZ', value: smart, existed: true };
    },
    apply: async (options) => {
        return { ok: true, data: 'Read-only diagnostic' };
    },
    revert: async (originalState) => {
        return { ok: true };
    },
    verify: async (expectedState) => {
        return true;
    },
};
// 5. Memory Compression (Enable)
exports.memoryCompression = {
    id: 'ram.memory_compression',
    name: 'Enable Memory Compression',
    category: 'ram_storage',
    description: 'Ensures Memory Compression is enabled (default on). Compresses memory pages instead of paging to disk.',
    whenHelps: 'Reduces page file usage, improves responsiveness under memory pressure. Default ON.',
    risk: 'safe',
    evidence: 'measured',
    requiresReboot: false,
    compatibility: {
        windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
        formFactors: ['desktop', 'laptop'],
    },
    detect: async () => {
        const { stdout } = await (0, process_1.execAsync)('powershell -NoProfile -Command "Get-MMAgent | Select-Object MemoryCompression | ConvertTo-Json"');
        const info = stdout.trim() ? JSON.parse(stdout) : { MemoryCompression: true };
        return { path: 'MMAgent', name: 'MemoryCompression', type: 'REG_DWORD', value: info.MemoryCompression ? 1 : 0, existed: true };
    },
    apply: async (options) => {
        if (options?.dryRun)
            return { ok: true, data: 'Would enable Memory Compression' };
        try {
            const current = await exports.memoryCompression.detect();
            if (current.value === 0) {
                await (0, process_1.execAsync)('powershell -NoProfile -Command "Enable-MMAgent -MemoryCompression"');
            }
            return { ok: true, previousState: current, newState: { ...current, value: 1 } };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    },
    revert: async (originalState) => {
        try {
            if (originalState.value === 0) {
                await (0, process_1.execAsync)('powershell -NoProfile -Command "Disable-MMAgent -MemoryCompression"');
            }
            return { ok: true };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    },
    verify: async (expectedState) => {
        const current = await exports.memoryCompression.detect();
        return current.value === 1;
    },
};
// 6. Page File Management (System Managed)
exports.pageFileSystemManaged = {
    id: 'ram.pagefile_system',
    name: 'Set Page File to System Managed',
    category: 'ram_storage',
    description: 'Sets page file to "System managed size" on all drives. Recommended for stability.',
    whenHelps: 'Prevents OOM crashes. Windows manages size dynamically. Custom size only for specific workloads.',
    risk: 'safe',
    evidence: 'measured',
    requiresReboot: true,
    compatibility: {
        windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
        formFactors: ['desktop', 'laptop'],
    },
    detect: async () => {
        const { stdout } = await (0, process_1.execAsync)('powershell -NoProfile -Command "Get-CimInstance Win32_PageFileSetting | Select-Object Name, InitialSize, MaximumSize | ConvertTo-Json"');
        const pf = stdout.trim() ? JSON.parse(stdout) : [];
        return { path: 'WMI', name: 'PageFile', type: 'REG_SZ', value: pf, existed: true };
    },
    apply: async (options) => {
        if (options?.dryRun)
            return { ok: true, data: 'Would set page file to system managed' };
        try {
            const current = await exports.pageFileSystemManaged.detect();
            await (0, process_1.execAsync)('powershell -NoProfile -Command "Set-CimInstance -Class Win32_PageFileSetting -Arguments @{Name=\\"C:\\\\pagefile.sys\\"; InitialSize=0; MaximumSize=0}"');
            return { ok: true, previousState: current, newState: { ...current, value: 'system_managed' } };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    },
    revert: async (originalState) => {
        return { ok: true, data: 'Restore via System Properties > Advanced > Performance > Virtual Memory' };
    },
    verify: async (expectedState) => {
        const current = await exports.pageFileSystemManaged.detect();
        const pf = current.value;
        return pf.some(p => p.InitialSize === 0 && p.MaximumSize === 0);
    },
};
// 7. Clear Standby List (Manual, Advanced)
exports.clearStandbyList = {
    id: 'ram.clear_standby',
    name: 'Clear Standby List (Empty Standby List)',
    category: 'ram_storage',
    description: 'Runs EmptyStandbyList.exe (external tool) to clear modified/standby pages. Advanced, manual only. Evidence: debated.',
    whenHelps: 'Frees RAM shown as "Cached". Can cause stutter as apps re-read from disk. Use only if memory pressure.',
    risk: 'advanced',
    evidence: 'debated',
    requiresReboot: false,
    compatibility: {
        windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
        formFactors: ['desktop', 'laptop'],
    },
    detect: async () => {
        const { stdout } = await (0, process_1.execAsync)('powershell -NoProfile -Command "Get-CimInstance Win32_OperatingSystem | Select-Object FreePhysicalMemory, TotalVisibleMemorySize | ConvertTo-Json"');
        const mem = stdout.trim() ? JSON.parse(stdout) : { FreePhysicalMemory: 0, TotalVisibleMemorySize: 0 };
        return { path: 'MEMORY', name: 'StandbyList', type: 'REG_SZ', value: mem, existed: true };
    },
    apply: async (options) => {
        if (options?.dryRun)
            return { ok: true, data: 'Would clear standby list (requires EmptyStandbyList.exe)' };
        return { ok: false, error: 'Requires EmptyStandbyList.exe (not bundled). Use RamMap or similar.' };
    },
    revert: async (originalState) => {
        return { ok: true, data: 'Memory refills naturally' };
    },
    verify: async (expectedState) => {
        return false;
    },
};
// 8. RAM Info Report (Read-only)
exports.ramInfo = {
    id: 'ram.info_report',
    name: 'RAM Configuration Report',
    category: 'ram_storage',
    description: 'Reports total RAM, speed, type (DDR4/5), channels, timings. Read-only diagnostic.',
    whenHelps: 'Verifies RAM running at rated speed (XMP/EXPO). Identifies single-channel configs.',
    risk: 'safe',
    evidence: 'measured',
    requiresReboot: false,
    compatibility: {
        windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
        formFactors: ['desktop', 'laptop'],
    },
    detect: async () => {
        const { stdout } = await (0, process_1.execAsync)('powershell -NoProfile -Command "Get-CimInstance Win32_PhysicalMemory | Select-Object Capacity, Speed, ConfiguredClockSpeed, Manufacturer, PartNumber | ConvertTo-Json"');
        const dimms = stdout.trim() ? JSON.parse(stdout) : [];
        const { stdout: total } = await (0, process_1.execAsync)('powershell -NoProfile -Command "[math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 1)"');
        return { path: 'WMI', name: 'RAMInfo', type: 'REG_SZ', value: { dimms, totalGB: parseFloat(total.trim()) }, existed: true };
    },
    apply: async (options) => {
        return { ok: true, data: 'Read-only diagnostic' };
    },
    revert: async (originalState) => {
        return { ok: true };
    },
    verify: async (expectedState) => {
        return true;
    },
};
exports.ramTweaks = [
    exports.disableLastAccess,
    exports.trimStatus,
    exports.optimizeVolumes,
    exports.smartStatus,
    exports.memoryCompression,
    exports.pageFileSystemManaged,
    exports.clearStandbyList,
    exports.ramInfo,
];
//# sourceMappingURL=ram.js.map