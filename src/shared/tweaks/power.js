"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.powerTweaks = exports.fastStartupOff = exports.hibernationOff = exports.usbSelectiveSuspend = exports.pcieLinkPowerManagement = exports.processorBoostMode = exports.disableCoreParking = exports.highPerformancePlan = exports.ultimatePerformancePlan = void 0;
const registry_1 = require("./registry");
const process_1 = require("../utils/process");
// Power & CPU Tweaks (35 target)
// 1. Ultimate Performance Power Plan
exports.ultimatePerformancePlan = {
    id: 'power.ultimate_performance',
    name: 'Enable Ultimate Performance Power Plan',
    category: 'power_cpu',
    description: 'Duplicates and activates the Ultimate Performance scheme (GUID: e9a42b02-d5df-448d-aa00-03f14749eb61). Hidden by default on laptops.',
    whenHelps: 'Maximum CPU frequency, no core parking, no PCIe link power management. Desktop only; laptops use High Performance.',
    risk: 'safe',
    evidence: 'measured',
    requiresReboot: false,
    compatibility: {
        windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
        formFactors: ['desktop'],
    },
    detect: async () => {
        const { stdout } = await (0, process_1.execAsync)('powercfg /getactivescheme');
        const match = stdout.match(/([a-f0-9-]{36})/);
        const activeGuid = match ? match[1] : null;
        const { stdout: schemes } = await (0, process_1.execAsync)('powercfg /list');
        const hasUltimate = schemes.includes('e9a42b02-d5df-448d-aa00-03f14749eb61');
        return { path: 'POWERCFG', name: 'ActiveScheme', type: 'REG_SZ', value: { activeGuid, hasUltimate }, existed: true };
    },
    apply: async (options) => {
        if (options?.dryRun)
            return { ok: true, data: 'Would enable Ultimate Performance plan' };
        try {
            const current = await exports.ultimatePerformancePlan.detect();
            // Duplicate scheme if not present
            if (!current.value.hasUltimate) {
                const { stdout } = await (0, process_1.execAsync)('powercfg -duplicatescheme e9a42b02-d5df-448d-aa00-03f14749eb61');
                const match = stdout.match(/([a-f0-9-]{36})/);
                if (match) {
                    await (0, process_1.execAsync)(`powercfg /setactive ${match[1]}`);
                }
            }
            else {
                await (0, process_1.execAsync)('powercfg /setactive e9a42b02-d5df-448d-aa00-03f14749eb61');
            }
            return { ok: true, previousState: current, newState: { ...current, value: { ...current.value, activeGuid: 'e9a42b02-d5df-448d-aa00-03f14749eb61' } } };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    },
    revert: async (originalState) => {
        try {
            const val = originalState.value;
            if (val.activeGuid) {
                await (0, process_1.execAsync)(`powercfg /setactive ${val.activeGuid}`);
            }
            return { ok: true };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    },
    verify: async (expectedState) => {
        const current = await exports.ultimatePerformancePlan.detect();
        return current.value.activeGuid === 'e9a42b02-d5df-448d-aa00-03f14749eb61';
    },
};
// 2. High Performance Plan (for laptops)
exports.highPerformancePlan = {
    id: 'power.high_performance',
    name: 'Enable High Performance Power Plan',
    category: 'power_cpu',
    description: 'Activates the High Performance scheme (GUID: 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c). Available on all form factors.',
    whenHelps: 'Prevents CPU throttling, keeps cores unparked. Fallback for laptops without Ultimate Performance.',
    risk: 'safe',
    evidence: 'measured',
    requiresReboot: false,
    compatibility: {
        windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
        formFactors: ['desktop', 'laptop'],
    },
    detect: async () => {
        const { stdout } = await (0, process_1.execAsync)('powercfg /getactivescheme');
        const match = stdout.match(/([a-f0-9-]{36})/);
        return { path: 'POWERCFG', name: 'ActiveScheme', type: 'REG_SZ', value: match ? match[1] : null, existed: true };
    },
    apply: async (options) => {
        if (options?.dryRun)
            return { ok: true, data: 'Would enable High Performance plan' };
        try {
            const current = await exports.highPerformancePlan.detect();
            await (0, process_1.execAsync)('powercfg /setactive 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c');
            return { ok: true, previousState: current, newState: { ...current, value: '8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c' } };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    },
    revert: async (originalState) => {
        try {
            if (originalState.value) {
                await (0, process_1.execAsync)(`powercfg /setactive ${originalState.value}`);
            }
            return { ok: true };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    },
    verify: async (expectedState) => {
        const current = await exports.highPerformancePlan.detect();
        return current.value === '8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c';
    },
};
// 3. Disable Core Parking (CPMINCORES = 100)
exports.disableCoreParking = {
    id: 'power.disable_core_parking',
    name: 'Disable CPU Core Parking',
    category: 'power_cpu',
    description: 'Sets Processor Performance Core Parking Min Cores to 100% via powercfg. Keeps all cores active.',
    whenHelps: 'Reduces latency from core wake-up. Increases idle power draw. Desktop recommended.',
    risk: 'moderate',
    evidence: 'measured',
    requiresReboot: false,
    compatibility: {
        windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
        formFactors: ['desktop'],
    },
    detect: async () => {
        const { stdout } = await (0, process_1.execAsync)('powercfg /query SCHEME_CURRENT SUB_PROCESSOR CPMINCORES');
        const match = stdout.match(/Current AC Power Setting Index:\s*0x([0-9a-f]+)/i);
        const value = match ? parseInt(match[1], 16) : null;
        return { path: 'POWERCFG', name: 'CPMINCORES', type: 'REG_DWORD', value, existed: value !== null };
    },
    apply: async (options) => {
        if (options?.dryRun)
            return { ok: true, data: 'Would set CPMINCORES to 100 (0x64)' };
        try {
            const current = await exports.disableCoreParking.detect();
            await (0, process_1.execAsync)('powercfg /setacvalueindex scheme_current sub_processor cpmincores 100');
            await (0, process_1.execAsync)('powercfg /setdcvalueindex scheme_current sub_processor cpmincores 100');
            await (0, process_1.execAsync)('powercfg /setactive scheme_current');
            return { ok: true, previousState: current, newState: { ...current, value: 100 } };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    },
    revert: async (originalState) => {
        try {
            if (originalState.existed && originalState.value !== null) {
                const hex = originalState.value.toString(16);
                await (0, process_1.execAsync)(`powercfg /setacvalueindex scheme_current sub_processor cpmincores ${hex}`);
                await (0, process_1.execAsync)(`powercfg /setdcvalueindex scheme_current sub_processor cpmincores ${hex}`);
                await (0, process_1.execAsync)('powercfg /setactive scheme_current');
            }
            return { ok: true };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    },
    verify: async (expectedState) => {
        const current = await exports.disableCoreParking.detect();
        return current.value === 100;
    },
};
// 4. Processor Performance Boost Mode - Aggressive
exports.processorBoostMode = {
    id: 'power.boost_mode',
    name: 'Aggressive CPU Boost Mode',
    category: 'power_cpu',
    description: 'Sets Processor Performance Boost Mode to Aggressive (1) via powercfg. Allows higher turbo frequencies longer.',
    whenHelps: 'Better sustained clocks in games. Increases heat/power. Desktop recommended.',
    risk: 'moderate',
    evidence: 'measured',
    requiresReboot: false,
    compatibility: {
        windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
        formFactors: ['desktop'],
    },
    detect: async () => {
        const { stdout } = await (0, process_1.execAsync)('powercfg /query SCHEME_CURRENT SUB_PROCESSOR PERFBOOSTMODE');
        const match = stdout.match(/Current AC Power Setting Index:\s*0x([0-9a-f]+)/i);
        const value = match ? parseInt(match[1], 16) : null;
        return { path: 'POWERCFG', name: 'PERFBOOSTMODE', type: 'REG_DWORD', value, existed: value !== null };
    },
    apply: async (options) => {
        if (options?.dryRun)
            return { ok: true, data: 'Would set PERFBOOSTMODE to 1 (Aggressive)' };
        try {
            const current = await exports.processorBoostMode.detect();
            await (0, process_1.execAsync)('powercfg /setacvalueindex scheme_current sub_processor perfboostmode 1');
            await (0, process_1.execAsync)('powercfg /setdcvalueindex scheme_current sub_processor perfboostmode 1');
            await (0, process_1.execAsync)('powercfg /setactive scheme_current');
            return { ok: true, previousState: current, newState: { ...current, value: 1 } };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    },
    revert: async (originalState) => {
        try {
            if (originalState.existed && originalState.value !== null) {
                const hex = originalState.value.toString(16);
                await (0, process_1.execAsync)(`powercfg /setacvalueindex scheme_current sub_processor perfboostmode ${hex}`);
                await (0, process_1.execAsync)(`powercfg /setdcvalueindex scheme_current sub_processor perfboostmode ${hex}`);
                await (0, process_1.execAsync)('powercfg /setactive scheme_current');
            }
            return { ok: true };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    },
    verify: async (expectedState) => {
        const current = await exports.processorBoostMode.detect();
        return current.value === 1;
    },
};
// 5. PCIe Link State Power Management - Off (Desktop only)
exports.pcieLinkPowerManagement = {
    id: 'power.pcie_link_off',
    name: 'Disable PCIe Link State Power Management',
    category: 'power_cpu',
    description: 'Sets PCI Express Link State Power Management to Off. Prevents GPU/SSD link downstates.',
    whenHelps: 'Reduces latency spikes from link training. Increases idle power. Desktop only.',
    risk: 'moderate',
    evidence: 'measured',
    requiresReboot: false,
    compatibility: {
        windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
        formFactors: ['desktop'],
    },
    detect: async () => {
        const { stdout } = await (0, process_1.execAsync)('powercfg /query SCHEME_CURRENT SUB_PCIEXPRESS ASPM');
        const match = stdout.match(/Current AC Power Setting Index:\s*0x([0-9a-f]+)/i);
        const value = match ? parseInt(match[1], 16) : null;
        return { path: 'POWERCFG', name: 'ASPM', type: 'REG_DWORD', value, existed: value !== null };
    },
    apply: async (options) => {
        if (options?.dryRun)
            return { ok: true, data: 'Would set PCIe ASPM to Off (0)' };
        try {
            const current = await exports.pcieLinkPowerManagement.detect();
            await (0, process_1.execAsync)('powercfg /setacvalueindex scheme_current sub_pciexpress aspm 0');
            await (0, process_1.execAsync)('powercfg /setdcvalueindex scheme_current sub_pciexpress aspm 0');
            await (0, process_1.execAsync)('powercfg /setactive scheme_current');
            return { ok: true, previousState: current, newState: { ...current, value: 0 } };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    },
    revert: async (originalState) => {
        try {
            if (originalState.existed && originalState.value !== null) {
                const hex = originalState.value.toString(16);
                await (0, process_1.execAsync)(`powercfg /setacvalueindex scheme_current sub_pciexpress aspm ${hex}`);
                await (0, process_1.execAsync)(`powercfg /setdcvalueindex scheme_current sub_pciexpress aspm ${hex}`);
                await (0, process_1.execAsync)('powercfg /setactive scheme_current');
            }
            return { ok: true };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    },
    verify: async (expectedState) => {
        const current = await exports.pcieLinkPowerManagement.detect();
        return current.value === 0;
    },
};
// 6. Disable USB Selective Suspend
exports.usbSelectiveSuspend = {
    id: 'power.usb_selective_suspend',
    name: 'Disable USB Selective Suspend',
    category: 'power_cpu',
    description: 'Sets USB Selective Suspend Setting to Disabled. Prevents USB devices from being powered down.',
    whenHelps: 'Fixes mouse/keyboard wake latency, audio interface dropouts. Increases laptop battery drain slightly.',
    risk: 'safe',
    evidence: 'measured',
    requiresReboot: false,
    compatibility: {
        windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
        formFactors: ['desktop', 'laptop'],
    },
    detect: async () => {
        const { stdout } = await (0, process_1.execAsync)('powercfg /query SCHEME_CURRENT SUB_USB USBSELECTIVESUSPEND');
        const match = stdout.match(/Current AC Power Setting Index:\s*0x([0-9a-f]+)/i);
        const value = match ? parseInt(match[1], 16) : null;
        return { path: 'POWERCFG', name: 'USBSELECTIVESUSPEND', type: 'REG_DWORD', value, existed: value !== null };
    },
    apply: async (options) => {
        if (options?.dryRun)
            return { ok: true, data: 'Would disable USB Selective Suspend' };
        try {
            const current = await exports.usbSelectiveSuspend.detect();
            await (0, process_1.execAsync)('powercfg /setacvalueindex scheme_current sub_usb usbselectivesuspend 0');
            await (0, process_1.execAsync)('powercfg /setdcvalueindex scheme_current sub_usb usbselectivesuspend 0');
            await (0, process_1.execAsync)('powercfg /setactive scheme_current');
            return { ok: true, previousState: current, newState: { ...current, value: 0 } };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    },
    revert: async (originalState) => {
        try {
            if (originalState.existed && originalState.value !== null) {
                const hex = originalState.value.toString(16);
                await (0, process_1.execAsync)(`powercfg /setacvalueindex scheme_current sub_usb usbselectivesuspend ${hex}`);
                await (0, process_1.execAsync)(`powercfg /setdcvalueindex scheme_current sub_usb usbselectivesuspend ${hex}`);
                await (0, process_1.execAsync)('powercfg /setactive scheme_current');
            }
            return { ok: true };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    },
    verify: async (expectedState) => {
        const current = await exports.usbSelectiveSuspend.detect();
        return current.value === 0;
    },
};
// 7. Hibernation Off (optional)
exports.hibernationOff = {
    id: 'power.hibernate_off',
    name: 'Disable Hibernation (Delete hiberfil.sys)',
    category: 'power_cpu',
    description: 'Runs powercfg /hibernate off. Deletes hiberfil.sys (saves RAM size on disk). Disables Fast Startup.',
    whenHelps: 'Frees disk space (8-64GB). Required for some disk imaging tools. Disables Fast Startup.',
    risk: 'safe',
    evidence: 'measured',
    requiresReboot: true,
    compatibility: {
        windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
        formFactors: ['desktop', 'laptop'],
    },
    detect: async () => {
        const { stdout } = await (0, process_1.execAsync)('powercfg /a');
        const enabled = !stdout.includes('Hibernate') || stdout.includes('The hibernation feature is disabled');
        return { path: 'POWERCFG', name: 'HibernateEnabled', type: 'REG_DWORD', value: enabled ? 0 : 1, existed: true };
    },
    apply: async (options) => {
        if (options?.dryRun)
            return { ok: true, data: 'Would disable hibernation and delete hiberfil.sys' };
        try {
            const current = await exports.hibernationOff.detect();
            await (0, process_1.execAsync)('powercfg /hibernate off');
            return { ok: true, previousState: current, newState: { ...current, value: 0 } };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    },
    revert: async (originalState) => {
        try {
            if (originalState.value === 1) {
                await (0, process_1.execAsync)('powercfg /hibernate on');
            }
            return { ok: true };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    },
    verify: async (expectedState) => {
        const current = await exports.hibernationOff.detect();
        return current.value === 0;
    },
};
// 8. Disable Fast Startup
exports.fastStartupOff = {
    id: 'power.fast_startup_off',
    name: 'Disable Fast Startup (Hybrid Boot)',
    category: 'power_cpu',
    description: 'Sets HiberbootEnabled=0 in HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Power. Full cold boot each time.',
    whenHelps: 'Fixes dual-boot issues, driver loading problems, bitlocker prompts. Slightly slower boot.',
    risk: 'safe',
    evidence: 'measured',
    requiresReboot: true,
    compatibility: {
        windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
        formFactors: ['desktop', 'laptop'],
    },
    detect: async () => {
        const result = await registry_1.RegistryManager.getValue('HKLM', '\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Power', 'HiberbootEnabled');
        return { path: 'HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Power', name: 'HiberbootEnabled', type: 'REG_DWORD', value: result.value, existed: result.existed };
    },
    apply: async (options) => {
        if (options?.dryRun)
            return { ok: true, data: 'Would disable Fast Startup' };
        try {
            const current = await exports.fastStartupOff.detect();
            await registry_1.RegistryManager.setValue('HKLM', '\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Power', 'HiberbootEnabled', 'REG_DWORD', 0);
            return { ok: true, previousState: current, newState: { ...current, value: 0 } };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    },
    revert: async (originalState) => {
        try {
            if (originalState.existed) {
                await registry_1.RegistryManager.setValue('HKLM', '\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Power', 'HiberbootEnabled', 'REG_DWORD', originalState.value);
            }
            else {
                await registry_1.RegistryManager.deleteValue('HKLM', '\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Power', 'HiberbootEnabled');
            }
            return { ok: true };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    },
    verify: async (expectedState) => {
        const current = await exports.fastStartupOff.detect();
        return current.value === 0;
    },
};
exports.powerTweaks = [
    exports.ultimatePerformancePlan,
    exports.highPerformancePlan,
    exports.disableCoreParking,
    exports.processorBoostMode,
    exports.pcieLinkPowerManagement,
    exports.usbSelectiveSuspend,
    exports.hibernationOff,
    exports.fastStartupOff,
];
//# sourceMappingURL=power.js.map