"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.systemTweaks = exports.mouseAccelerationOff = exports.disableGameDVR = exports.rssEnabled = exports.ecnCapability = exports.tcpAutotuning = exports.disableNagleAlgorithm = exports.networkThrottlingIndex = exports.mmcssGamesTask = exports.systemResponsiveness = exports.win32PrioritySeparation = void 0;
const registry_1 = require("./registry");
const process_1 = require("../utils/process");
// System Performance Tweaks (60 target)
// 1. Win32PrioritySeparation - Foreground boost
exports.win32PrioritySeparation = {
    id: 'system.win32priorityseparation',
    name: 'Foreground Application Boost',
    category: 'system_performance',
    description: 'Increases CPU time slices for foreground applications (Win32PrioritySeparation = 0x26). Default is 2 (short quanta), 0x26 = 38 gives longer quanta to foreground apps.',
    whenHelps: 'Improves responsiveness of the active window, especially on older CPUs or heavy background loads.',
    risk: 'safe',
    evidence: 'measured',
    requiresReboot: true,
    compatibility: {
        windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
        formFactors: ['desktop', 'laptop'],
    },
    detect: async () => {
        const result = await registry_1.RegistryManager.getValue('HKLM', '\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl', 'Win32PrioritySeparation');
        return { path: 'HKLM\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl', name: 'Win32PrioritySeparation', type: 'REG_DWORD', value: result.value, existed: result.existed };
    },
    apply: async (options) => {
        if (options?.dryRun)
            return { ok: true, data: 'Would set Win32PrioritySeparation to 38 (0x26)' };
        try {
            const current = await exports.win32PrioritySeparation.detect();
            await registry_1.RegistryManager.setValue('HKLM', '\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl', 'Win32PrioritySeparation', 'REG_DWORD', 38);
            return { ok: true, previousState: current, newState: { ...current, value: 38 } };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    },
    revert: async (originalState) => {
        try {
            if (originalState.existed) {
                await registry_1.RegistryManager.setValue('HKLM', '\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl', 'Win32PrioritySeparation', 'REG_DWORD', originalState.value);
            }
            else {
                await registry_1.RegistryManager.deleteValue('HKLM', '\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl', 'Win32PrioritySeparation');
            }
            return { ok: true };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    },
    verify: async (expectedState) => {
        const current = await exports.win32PrioritySeparation.detect();
        return current.value === expectedState.value;
    },
};
// 2. SystemResponsiveness - MMCSS
exports.systemResponsiveness = {
    id: 'system.systemresponsiveness',
    name: 'MMCSS System Responsiveness',
    category: 'system_performance',
    description: 'Sets SystemResponsiveness to 10 (default 20) in Multimedia SystemProfile. Lower values give more CPU to multimedia tasks.',
    whenHelps: 'Reduces audio/video glitches under load. May slightly reduce background task throughput.',
    risk: 'safe',
    evidence: 'measured',
    requiresReboot: true,
    compatibility: {
        windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
        formFactors: ['desktop', 'laptop'],
    },
    detect: async () => {
        const result = await registry_1.RegistryManager.getValue('HKLM', '\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile', 'SystemResponsiveness');
        return { path: 'HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile', name: 'SystemResponsiveness', type: 'REG_DWORD', value: result.value, existed: result.existed };
    },
    apply: async (options) => {
        if (options?.dryRun)
            return { ok: true, data: 'Would set SystemResponsiveness to 10' };
        try {
            const current = await exports.systemResponsiveness.detect();
            await registry_1.RegistryManager.setValue('HKLM', '\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile', 'SystemResponsiveness', 'REG_DWORD', 10);
            return { ok: true, previousState: current, newState: { ...current, value: 10 } };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    },
    revert: async (originalState) => {
        try {
            if (originalState.existed) {
                await registry_1.RegistryManager.setValue('HKLM', '\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile', 'SystemResponsiveness', 'REG_DWORD', originalState.value);
            }
            else {
                await registry_1.RegistryManager.deleteValue('HKLM', '\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile', 'SystemResponsiveness');
            }
            return { ok: true };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    },
    verify: async (expectedState) => {
        const current = await exports.systemResponsiveness.detect();
        return current.value === expectedState.value;
    },
};
// 3. MMCSS Games Task - GPU Priority & Scheduling
exports.mmcssGamesTask = {
    id: 'system.mmcss_games',
    name: 'MMCSS Games Task Optimization',
    category: 'system_performance',
    description: 'Optimizes MMCSS Games task: GPU Priority=8, Priority=6, Scheduling Category=High, SFIO Priority=High.',
    whenHelps: 'Gives games higher CPU/GPU scheduling priority and better I/O priority.',
    risk: 'moderate',
    evidence: 'measured',
    requiresReboot: true,
    compatibility: {
        windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
        formFactors: ['desktop', 'laptop'],
    },
    detect: async () => {
        const results = await Promise.all([
            registry_1.RegistryManager.getValue('HKLM', '\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games', 'GPU Priority'),
            registry_1.RegistryManager.getValue('HKLM', '\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games', 'Priority'),
            registry_1.RegistryManager.getValue('HKLM', '\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games', 'Scheduling Category'),
            registry_1.RegistryManager.getValue('HKLM', '\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games', 'SFIO Priority'),
        ]);
        return {
            path: 'HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games',
            name: 'MMCSS_GAMES_COMPOSITE',
            type: 'REG_DWORD',
            value: { gpuPriority: results[0].value, priority: results[1].value, schedulingCategory: results[2].value, sfioPriority: results[3].value },
            existed: results.every(r => r.existed),
        };
    },
    apply: async (options) => {
        if (options?.dryRun)
            return { ok: true, data: 'Would optimize MMCSS Games task settings' };
        try {
            const current = await exports.mmcssGamesTask.detect();
            await Promise.all([
                registry_1.RegistryManager.setValue('HKLM', '\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games', 'GPU Priority', 'REG_DWORD', 8),
                registry_1.RegistryManager.setValue('HKLM', '\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games', 'Priority', 'REG_DWORD', 6),
                registry_1.RegistryManager.setValue('HKLM', '\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games', 'Scheduling Category', 'REG_SZ', 'High'),
                registry_1.RegistryManager.setValue('HKLM', '\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games', 'SFIO Priority', 'REG_SZ', 'High'),
            ]);
            return { ok: true, previousState: current, newState: { ...current, value: { gpuPriority: 8, priority: 6, schedulingCategory: 'High', sfioPriority: 'High' } } };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    },
    revert: async (originalState) => {
        try {
            const val = originalState.value;
            if (originalState.existed) {
                await Promise.all([
                    registry_1.RegistryManager.setValue('HKLM', '\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games', 'GPU Priority', 'REG_DWORD', val.gpuPriority),
                    registry_1.RegistryManager.setValue('HKLM', '\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games', 'Priority', 'REG_DWORD', val.priority),
                    registry_1.RegistryManager.setValue('HKLM', '\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games', 'Scheduling Category', 'REG_SZ', val.schedulingCategory),
                    registry_1.RegistryManager.setValue('HKLM', '\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games', 'SFIO Priority', 'REG_SZ', val.sfioPriority),
                ]);
            }
            return { ok: true };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    },
    verify: async (expectedState) => {
        const current = await exports.mmcssGamesTask.detect();
        const exp = expectedState.value;
        const cur = current.value;
        return cur.gpuPriority === exp.gpuPriority && cur.priority === exp.priority && cur.schedulingCategory === exp.schedulingCategory && cur.sfioPriority === exp.sfioPriority;
    },
};
// 4. NetworkThrottlingIndex - Disable network throttling for multimedia
exports.networkThrottlingIndex = {
    id: 'system.networkthrottling',
    name: 'Disable Network Throttling for Multimedia',
    category: 'system_performance',
    description: 'Sets NetworkThrottlingIndex to 0xFFFFFFFF (disabled). Prevents Windows from throttling network traffic during multimedia playback.',
    whenHelps: 'Reduces packet loss and jitter during gaming/streaming on high-bandwidth connections.',
    risk: 'safe',
    evidence: 'measured',
    requiresReboot: true,
    compatibility: {
        windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
        formFactors: ['desktop', 'laptop'],
    },
    detect: async () => {
        const result = await registry_1.RegistryManager.getValue('HKLM', '\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile', 'NetworkThrottlingIndex');
        return { path: 'HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile', name: 'NetworkThrottlingIndex', type: 'REG_DWORD', value: result.value, existed: result.existed };
    },
    apply: async (options) => {
        if (options?.dryRun)
            return { ok: true, data: 'Would set NetworkThrottlingIndex to 0xFFFFFFFF (disabled)' };
        try {
            const current = await exports.networkThrottlingIndex.detect();
            await registry_1.RegistryManager.setValue('HKLM', '\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile', 'NetworkThrottlingIndex', 'REG_DWORD', 0xFFFFFFFF);
            return { ok: true, previousState: current, newState: { ...current, value: 0xFFFFFFFF } };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    },
    revert: async (originalState) => {
        try {
            if (originalState.existed) {
                await registry_1.RegistryManager.setValue('HKLM', '\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile', 'NetworkThrottlingIndex', 'REG_DWORD', originalState.value);
            }
            else {
                await registry_1.RegistryManager.deleteValue('HKLM', '\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile', 'NetworkThrottlingIndex');
            }
            return { ok: true };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    },
    verify: async (expectedState) => {
        const current = await exports.networkThrottlingIndex.detect();
        return current.value === expectedState.value;
    },
};
// 5. Disable Nagle Algorithm (per interface)
exports.disableNagleAlgorithm = {
    id: 'network.disable_nagle',
    name: 'Disable Nagle Algorithm (TCPNoDelay)',
    category: 'network_tcp',
    description: 'Sets TcpAckFrequency=1, TCPNoDelay=1, TcpDelAckTicks=0 on active network interfaces. Forces immediate ACK and disables delayed ACK.',
    whenHelps: 'May reduce latency in games/ssh. Can increase CPU usage and packet count. Evidence: debated.',
    risk: 'moderate',
    evidence: 'debated',
    requiresReboot: true,
    compatibility: {
        windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
        formFactors: ['desktop', 'laptop'],
    },
    detect: async () => {
        // Detect active interfaces
        const { stdout } = await (0, process_1.execAsync)('powershell -NoProfile -Command "Get-NetIPConfiguration | Where-Object {$_.IPv4Address.IPAddress} | Select-Object -ExpandProperty InterfaceAlias"');
        const interfaces = stdout.trim().split('\n').filter(Boolean);
        const results = {};
        for (const iface of interfaces) {
            const guid = await getInterfaceGuid(iface);
            if (guid) {
                const keyPath = `\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters\\Interfaces\\${guid}`;
                const [ack, noDelay, delAck] = await Promise.all([
                    registry_1.RegistryManager.getValue('HKLM', keyPath, 'TcpAckFrequency'),
                    registry_1.RegistryManager.getValue('HKLM', keyPath, 'TCPNoDelay'),
                    registry_1.RegistryManager.getValue('HKLM', keyPath, 'TcpDelAckTicks'),
                ]);
                results[guid] = { TcpAckFrequency: ack.value, TCPNoDelay: noDelay.value, TcpDelAckTicks: delAck.value };
            }
        }
        return { path: 'HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters\\Interfaces\\*', name: 'NAGLE_SETTINGS', type: 'REG_DWORD', value: results, existed: Object.keys(results).length > 0 };
    },
    apply: async (options) => {
        if (options?.dryRun)
            return { ok: true, data: 'Would disable Nagle algorithm on active interfaces' };
        try {
            const current = await exports.disableNagleAlgorithm.detect();
            const { stdout } = await (0, process_1.execAsync)('powershell -NoProfile -Command "Get-NetIPConfiguration | Where-Object {$_.IPv4Address.IPAddress} | Select-Object -ExpandProperty InterfaceAlias"');
            const interfaces = stdout.trim().split('\n').filter(Boolean);
            for (const iface of interfaces) {
                const guid = await getInterfaceGuid(iface);
                if (guid) {
                    const keyPath = `\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters\\Interfaces\\${guid}`;
                    await Promise.all([
                        registry_1.RegistryManager.setValue('HKLM', keyPath, 'TcpAckFrequency', 'REG_DWORD', 1),
                        registry_1.RegistryManager.setValue('HKLM', keyPath, 'TCPNoDelay', 'REG_DWORD', 1),
                        registry_1.RegistryManager.setValue('HKLM', keyPath, 'TcpDelAckTicks', 'REG_DWORD', 0),
                    ]);
                }
            }
            return { ok: true, previousState: current, newState: { ...current, value: { ...current.value, applied: true } } };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    },
    revert: async (originalState) => {
        try {
            const val = originalState.value;
            for (const [guid, settings] of Object.entries(val)) {
                if (guid === 'applied')
                    continue;
                const keyPath = `\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters\\Interfaces\\${guid}`;
                if (settings.TcpAckFrequency !== undefined)
                    await registry_1.RegistryManager.setValue('HKLM', keyPath, 'TcpAckFrequency', 'REG_DWORD', settings.TcpAckFrequency);
                if (settings.TCPNoDelay !== undefined)
                    await registry_1.RegistryManager.setValue('HKLM', keyPath, 'TCPNoDelay', 'REG_DWORD', settings.TCPNoDelay);
                if (settings.TcpDelAckTicks !== undefined)
                    await registry_1.RegistryManager.setValue('HKLM', keyPath, 'TcpDelAckTicks', 'REG_DWORD', settings.TcpDelAckTicks);
            }
            return { ok: true };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    },
    verify: async (expectedState) => {
        const current = await exports.disableNagleAlgorithm.detect();
        return JSON.stringify(current.value) === JSON.stringify(expectedState.value);
    },
};
async function getInterfaceGuid(alias) {
    const { execAsync } = await import('../utils/process');
    try {
        const { stdout } = await execAsync(`powershell -NoProfile -Command "(Get-NetAdapter -Name '${alias}').InterfaceGuid"`);
        return stdout.trim().replace(/[{}]/g, '');
    }
    catch {
        return null;
    }
}
// 6. TCP Autotuning - Normal
exports.tcpAutotuning = {
    id: 'network.tcp_autotuning',
    name: 'TCP Autotuning Level Normal',
    category: 'network_tcp',
    description: 'Sets netsh int tcp set global autotuninglevel=normal. Allows dynamic receive window scaling.',
    whenHelps: 'Improves throughput on high-latency/high-bandwidth links. Default is normal; "disabled" hurts performance.',
    risk: 'safe',
    evidence: 'measured',
    requiresReboot: false,
    compatibility: {
        windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
        formFactors: ['desktop', 'laptop'],
    },
    detect: async () => {
        const { stdout } = await (0, process_1.execAsync)('netsh int tcp show global');
        const match = stdout.match(/Receive Window Auto-Tuning Level\s+:\s+(\w+)/);
        return { path: 'NETSH', name: 'AutotuningLevel', type: 'REG_SZ', value: match ? match[1] : 'unknown', existed: !!match };
    },
    apply: async (options) => {
        if (options?.dryRun)
            return { ok: true, data: 'Would set TCP autotuning to normal' };
        try {
            const current = await exports.tcpAutotuning.detect();
            await (0, process_1.execAsync)('netsh int tcp set global autotuninglevel=normal');
            return { ok: true, previousState: current, newState: { ...current, value: 'normal' } };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    },
    revert: async (originalState) => {
        try {
            await (0, process_1.execAsync)(`netsh int tcp set global autotuninglevel=${originalState.value}`);
            return { ok: true };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    },
    verify: async (expectedState) => {
        const current = await exports.tcpAutotuning.detect();
        return current.value.toLowerCase() === 'normal';
    },
};
// 7. ECN Capability - Disabled
exports.ecnCapability = {
    id: 'network.ecn',
    name: 'Disable ECN (Explicit Congestion Notification)',
    category: 'network_tcp',
    description: 'Sets netsh int tcp set global ecncapability=disabled. Some routers/ISPs mishandle ECN.',
    whenHelps: 'Can reduce packet loss on paths with broken ECN support. Evidence: debated.',
    risk: 'moderate',
    evidence: 'debated',
    requiresReboot: false,
    compatibility: {
        windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
        formFactors: ['desktop', 'laptop'],
    },
    detect: async () => {
        const { stdout } = await (0, process_1.execAsync)('netsh int tcp show global');
        const match = stdout.match(/ECN Capability\s+:\s+(\w+)/);
        return { path: 'NETSH', name: 'ECNCapability', type: 'REG_SZ', value: match ? match[1] : 'unknown', existed: !!match };
    },
    apply: async (options) => {
        if (options?.dryRun)
            return { ok: true, data: 'Would disable ECN capability' };
        try {
            const current = await exports.ecnCapability.detect();
            await (0, process_1.execAsync)('netsh int tcp set global ecncapability=disabled');
            return { ok: true, previousState: current, newState: { ...current, value: 'disabled' } };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    },
    revert: async (originalState) => {
        try {
            await (0, process_1.execAsync)(`netsh int tcp set global ecncapability=${originalState.value}`);
            return { ok: true };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    },
    verify: async (expectedState) => {
        const current = await exports.ecnCapability.detect();
        return current.value.toLowerCase() === 'disabled';
    },
};
// 8. RSS - Enabled
exports.rssEnabled = {
    id: 'network.rss',
    name: 'Enable RSS (Receive Side Scaling)',
    category: 'network_tcp',
    description: 'Sets netsh int tcp set global rss=enabled. Distributes network receive processing across CPU cores.',
    whenHelps: 'Reduces CPU bottleneck on high-throughput NICs (1Gbps+). Default is enabled.',
    risk: 'safe',
    evidence: 'measured',
    requiresReboot: false,
    compatibility: {
        windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
        formFactors: ['desktop', 'laptop'],
    },
    detect: async () => {
        const { stdout } = await (0, process_1.execAsync)('netsh int tcp show global');
        const match = stdout.match(/Receive Side Scaling State\s+:\s+(\w+)/);
        return { path: 'NETSH', name: 'RSS', type: 'REG_SZ', value: match ? match[1] : 'unknown', existed: !!match };
    },
    apply: async (options) => {
        if (options?.dryRun)
            return { ok: true, data: 'Would enable RSS' };
        try {
            const current = await exports.rssEnabled.detect();
            await (0, process_1.execAsync)('netsh int tcp set global rss=enabled');
            return { ok: true, previousState: current, newState: { ...current, value: 'enabled' } };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    },
    revert: async (originalState) => {
        try {
            await (0, process_1.execAsync)(`netsh int tcp set global rss=${originalState.value}`);
            return { ok: true };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    },
    verify: async (expectedState) => {
        const current = await exports.rssEnabled.detect();
        return current.value.toLowerCase() === 'enabled';
    },
};
// 9. Disable GameDVR
exports.disableGameDVR = {
    id: 'gaming.disable_gamedvr',
    name: 'Disable Game DVR (Background Recording)',
    category: 'gaming_fps',
    description: 'Disables GameDVR background recording (GameDVR_Enabled=0, AppCaptureEnabled=0, AllowGameDVR=0 policy). Keeps Game Mode enabled.',
    whenHelps: 'Eliminates background recording overhead. Frees GPU/CPU for the game. Game Mode stays on.',
    risk: 'safe',
    evidence: 'measured',
    requiresReboot: false,
    compatibility: {
        windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
        formFactors: ['desktop', 'laptop'],
    },
    detect: async () => {
        const sid = await getCurrentUserSid();
        const results = await Promise.all([
            registry_1.RegistryManager.getValue('HKU', `\\${sid}\\System\\GameConfigStore`, 'GameDVR_Enabled'),
            registry_1.RegistryManager.getValue('HKU', `\\${sid}\\Software\\Microsoft\\Windows\\CurrentVersion\\GameDVR`, 'AppCaptureEnabled'),
            registry_1.RegistryManager.getValue('HKLM', '\\SOFTWARE\\Policies\\Microsoft\\Windows\\GameDVR', 'AllowGameDVR'),
        ]);
        return {
            path: 'COMPOSITE',
            name: 'GAMEDVR_COMPOSITE',
            type: 'REG_DWORD',
            value: { gameDvrEnabled: results[0].value, appCaptureEnabled: results[1].value, allowGameDVR: results[2].value },
            existed: results.every(r => r.existed),
        };
    },
    apply: async (options) => {
        if (options?.dryRun)
            return { ok: true, data: 'Would disable GameDVR, keep Game Mode' };
        try {
            const current = await exports.disableGameDVR.detect();
            const sid = await getCurrentUserSid();
            await Promise.all([
                registry_1.RegistryManager.setValue('HKU', `\\${sid}\\System\\GameConfigStore`, 'GameDVR_Enabled', 'REG_DWORD', 0),
                registry_1.RegistryManager.setValue('HKU', `\\${sid}\\Software\\Microsoft\\Windows\\CurrentVersion\\GameDVR`, 'AppCaptureEnabled', 'REG_DWORD', 0),
                registry_1.RegistryManager.createKey('HKLM', '\\SOFTWARE\\Policies\\Microsoft\\Windows\\GameDVR'),
                registry_1.RegistryManager.setValue('HKLM', '\\SOFTWARE\\Policies\\Microsoft\\Windows\\GameDVR', 'AllowGameDVR', 'REG_DWORD', 0),
                // Keep Game Mode ON
                registry_1.RegistryManager.setValue('HKU', `\\${sid}\\Software\\Microsoft\\GameBar`, 'AutoGameModeEnabled', 'REG_DWORD', 1),
            ]);
            return { ok: true, previousState: current, newState: { ...current, value: { gameDvrEnabled: 0, appCaptureEnabled: 0, allowGameDVR: 0 } } };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    },
    revert: async (originalState) => {
        try {
            const val = originalState.value;
            const sid = await getCurrentUserSid();
            if (originalState.existed) {
                await Promise.all([
                    registry_1.RegistryManager.setValue('HKU', `\\${sid}\\System\\GameConfigStore`, 'GameDVR_Enabled', 'REG_DWORD', val.gameDvrEnabled),
                    registry_1.RegistryManager.setValue('HKU', `\\${sid}\\Software\\Microsoft\\Windows\\CurrentVersion\\GameDVR`, 'AppCaptureEnabled', 'REG_DWORD', val.appCaptureEnabled),
                    registry_1.RegistryManager.setValue('HKLM', '\\SOFTWARE\\Policies\\Microsoft\\Windows\\GameDVR', 'AllowGameDVR', 'REG_DWORD', val.allowGameDVR),
                ]);
            }
            return { ok: true };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    },
    verify: async (expectedState) => {
        const current = await exports.disableGameDVR.detect();
        const exp = expectedState.value;
        const cur = current.value;
        return cur.gameDvrEnabled === exp.gameDvrEnabled && cur.appCaptureEnabled === exp.appCaptureEnabled && cur.allowGameDVR === exp.allowGameDVR;
    },
};
async function getCurrentUserSid() {
    const { execSync } = await import('child_process');
    const output = execSync('whoami /user /fo csv', { encoding: 'utf8' });
    const lines = output.trim().split('\n');
    if (lines.length > 1) {
        return lines[1].split(',')[1].replace(/"/g, '');
    }
    throw new Error('Could not get current user SID');
}
// 10. Mouse Acceleration Off
exports.mouseAccelerationOff = {
    id: 'peripherals.mouse_accel_off',
    name: 'Disable Mouse Acceleration (Enhance Pointer Precision)',
    category: 'peripherals_input',
    description: 'Sets MouseSpeed=0, MouseThreshold1=0, MouseThreshold2=0. Disables "Enhance pointer precision".',
    whenHelps: 'Raw 1:1 mouse movement. Essential for competitive FPS. Does not affect sensitivity.',
    risk: 'safe',
    evidence: 'measured',
    requiresReboot: false,
    compatibility: {
        windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
        formFactors: ['desktop', 'laptop'],
    },
    detect: async () => {
        const results = await Promise.all([
            registry_1.RegistryManager.getValue('HKCU', '\\Control Panel\\Mouse', 'MouseSpeed'),
            registry_1.RegistryManager.getValue('HKCU', '\\Control Panel\\Mouse', 'MouseThreshold1'),
            registry_1.RegistryManager.getValue('HKCU', '\\Control Panel\\Mouse', 'MouseThreshold2'),
        ]);
        return {
            path: 'HKCU\\Control Panel\\Mouse',
            name: 'MOUSE_ACCEL_COMPOSITE',
            type: 'REG_SZ',
            value: { MouseSpeed: results[0].value, MouseThreshold1: results[1].value, MouseThreshold2: results[2].value },
            existed: results.every(r => r.existed),
        };
    },
    apply: async (options) => {
        if (options?.dryRun)
            return { ok: true, data: 'Would disable mouse acceleration' };
        try {
            const current = await exports.mouseAccelerationOff.detect();
            await Promise.all([
                registry_1.RegistryManager.setValue('HKCU', '\\Control Panel\\Mouse', 'MouseSpeed', 'REG_SZ', '0'),
                registry_1.RegistryManager.setValue('HKCU', '\\Control Panel\\Mouse', 'MouseThreshold1', 'REG_SZ', '0'),
                registry_1.RegistryManager.setValue('HKCU', '\\Control Panel\\Mouse', 'MouseThreshold2', 'REG_SZ', '0'),
            ]);
            // Broadcast change
            await (0, process_1.execAsync)('powershell -NoProfile -Command "Add-Type -TypeDefinition @\"using System; using System.Runtime.InteropServices; public class SPI { [DllImport(\\\"user32.dll\\\")] public static extern bool SystemParametersInfo(uint uiAction, uint uiParam, IntPtr pvParam, uint fWinIni); }\"@; [SPI]::SystemParametersInfo(0x0071, 0, [IntPtr]::Zero, 0x01 | 0x02)"');
            return { ok: true, previousState: current, newState: { ...current, value: { MouseSpeed: '0', MouseThreshold1: '0', MouseThreshold2: '0' } } };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    },
    revert: async (originalState) => {
        try {
            const val = originalState.value;
            if (originalState.existed) {
                await Promise.all([
                    registry_1.RegistryManager.setValue('HKCU', '\\Control Panel\\Mouse', 'MouseSpeed', 'REG_SZ', val.MouseSpeed),
                    registry_1.RegistryManager.setValue('HKCU', '\\Control Panel\\Mouse', 'MouseThreshold1', 'REG_SZ', val.MouseThreshold1),
                    registry_1.RegistryManager.setValue('HKCU', '\\Control Panel\\Mouse', 'MouseThreshold2', 'REG_SZ', val.MouseThreshold2),
                ]);
                await (0, process_1.execAsync)('powershell -NoProfile -Command "Add-Type -TypeDefinition @\"using System; using System.Runtime.InteropServices; public class SPI { [DllImport(\\\"user32.dll\\\")] public static extern bool SystemParametersInfo(uint uiAction, uint uiParam, IntPtr pvParam, uint fWinIni); }\"@; [SPI]::SystemParametersInfo(0x0071, 0, [IntPtr]::Zero, 0x01 | 0x02)"');
            }
            return { ok: true };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    },
    verify: async (expectedState) => {
        const current = await exports.mouseAccelerationOff.detect();
        const exp = expectedState.value;
        const cur = current.value;
        return cur.MouseSpeed === exp.MouseSpeed && cur.MouseThreshold1 === exp.MouseThreshold1 && cur.MouseThreshold2 === exp.MouseThreshold2;
    },
};
// Export all system tweaks
exports.systemTweaks = [
    exports.win32PrioritySeparation,
    exports.systemResponsiveness,
    exports.mmcssGamesTask,
    exports.networkThrottlingIndex,
    exports.disableNagleAlgorithm,
    exports.tcpAutotuning,
    exports.ecnCapability,
    exports.rssEnabled,
    exports.disableGameDVR,
    exports.mouseAccelerationOff,
];
//# sourceMappingURL=system.js.map