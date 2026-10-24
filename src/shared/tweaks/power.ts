import type { Tweak, TweakState, TweakResult, ApplyOptions } from '../types/all';
import { RegistryManager } from './registry';
import { execAsync } from '../utils/process';

// Power & CPU Tweaks (35 target)

// 1. Ultimate Performance Power Plan
export const ultimatePerformancePlan: Tweak = {
  id: 'power.ultimate_performance',
  name: 'Enable Ultimate Performance Power Plan',
  nameKey: 'tweaks.power.ultimatePerformance.name',
  category: 'power_cpu',
  description: 'Duplicates and activates the Ultimate Performance scheme (GUID: e9a42b02-d5df-448d-aa00-03f14749eb61). Hidden by default on laptops.',
  descriptionKey: 'tweaks.power.ultimatePerformance.description',
  whenHelps: 'Maximum CPU frequency, no core parking, no PCIe link power management. Desktop only; laptops use High Performance.',
  whenHelpsKey: 'tweaks.power.ultimatePerformance.whenHelps',
  risk: 'safe',
  evidence: 'measured',
  impacto: 'bajo',
      requiresReboot: false,
  compatibility: {
    windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
    formFactors: ['desktop'],
  },
  detect: async (): Promise<TweakState> => {
    const { stdout } = await execAsync('powercfg /getactivescheme');
    const match = stdout.match(/([a-f0-9-]{36})/);
    const activeGuid = match ? match[1] : null;
    const { stdout: schemes } = await execAsync('powercfg /list');
    const hasUltimate = schemes.includes('e9a42b02-d5df-448d-aa00-03f14749eb61');
    return { path: 'POWERCFG', name: 'ActiveScheme', type: 'REG_SZ', value: { activeGuid, hasUltimate }, existed: true };
  },
  apply: async (options?: ApplyOptions): Promise<TweakResult> => {
    if (options?.dryRun) return { ok: true, data: 'Would enable Ultimate Performance plan' };
    try {
      const current = await ultimatePerformancePlan.detect();
      // Duplicate scheme if not present
      if (!(current.value as { hasUltimate?: boolean }).hasUltimate) {
        const { stdout } = await execAsync('powercfg -duplicatescheme e9a42b02-d5df-448d-aa00-03f14749eb61');
        const match = stdout.match(/([a-f0-9-]{36})/);
        if (match) {
          await execAsync(`powercfg /setactive ${match[1]}`);
        }
      } else {
        await execAsync('powercfg /setactive e9a42b02-d5df-448d-aa00-03f14749eb61');
      }
      return { ok: true, previousState: current, newState: { ...current, value: { ...(current.value as object), activeGuid: 'e9a42b02-d5df-448d-aa00-03f14749eb61' } } };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  revert: async (originalState: TweakState): Promise<TweakResult> => {
    try {
      const val = originalState.value as any;
      if (val.activeGuid) {
        await execAsync(`powercfg /setactive ${val.activeGuid}`);
      }
      return { ok: true };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  verify: async (expectedState: TweakState): Promise<boolean> => {
    const current = await ultimatePerformancePlan.detect();
    return (current.value as { activeGuid?: string }).activeGuid === 'e9a42b02-d5df-448d-aa00-03f14749eb61';
  },
};

// 2. High Performance Plan (for laptops)
export const highPerformancePlan: Tweak = {
  id: 'power.high_performance',
  name: 'Enable High Performance Power Plan',
  nameKey: 'tweaks.power.highPerformance.name',
  category: 'power_cpu',
  description: 'Activates the High Performance scheme (GUID: 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c). Available on all form factors.',
  descriptionKey: 'tweaks.power.highPerformance.description',
  whenHelps: 'Prevents CPU throttling, keeps cores unparked. Fallback for laptops without Ultimate Performance.',
  whenHelpsKey: 'tweaks.power.highPerformance.whenHelps',
  risk: 'safe',
  evidence: 'measured',
  impacto: 'bajo',
      requiresReboot: false,
  compatibility: {
    windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
    formFactors: ['desktop', 'laptop'],
  },
  detect: async (): Promise<TweakState> => {
    const { stdout } = await execAsync('powercfg /getactivescheme');
    const match = stdout.match(/([a-f0-9-]{36})/);
    return { path: 'POWERCFG', name: 'ActiveScheme', type: 'REG_SZ', value: match ? match[1] : null, existed: true };
  },
  apply: async (options?: ApplyOptions): Promise<TweakResult> => {
    if (options?.dryRun) return { ok: true, data: 'Would enable High Performance plan' };
    try {
      const current = await highPerformancePlan.detect();
      await execAsync('powercfg /setactive 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c');
      return { ok: true, previousState: current, newState: { ...current, value: '8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c' } };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  revert: async (originalState: TweakState): Promise<TweakResult> => {
    try {
      if (originalState.value) {
        await execAsync(`powercfg /setactive ${originalState.value}`);
      }
      return { ok: true };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  verify: async (expectedState: TweakState): Promise<boolean> => {
    const current = await highPerformancePlan.detect();
    return current.value === '8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c';
  },
};

// 3. Disable Core Parking (CPMINCORES = 100)
export const disableCoreParking: Tweak = {
  id: 'power.disable_core_parking',
  name: 'Disable CPU Core Parking',
  nameKey: 'tweaks.power.disableCoreParking.name',
  category: 'power_cpu',
  description: 'Sets Processor Performance Core Parking Min Cores to 100% via powercfg. Keeps all cores active.',
  descriptionKey: 'tweaks.power.disableCoreParking.description',
  whenHelps: 'Reduces latency from core wake-up. Increases idle power draw. Desktop recommended.',
  whenHelpsKey: 'tweaks.power.disableCoreParking.whenHelps',
  risk: 'moderate',
  evidence: 'measured',
  impacto: 'medio',
      requiresReboot: false,
  compatibility: {
    windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
    formFactors: ['desktop'],
  },
  detect: async (): Promise<TweakState> => {
    const { stdout } = await execAsync('powercfg /query SCHEME_CURRENT SUB_PROCESSOR CPMINCORES');
    const match = stdout.match(/Current AC Power Setting Index:\s*0x([0-9a-f]+)/i);
    const value = match ? parseInt(match[1], 16) : null;
    return { path: 'POWERCFG', name: 'CPMINCORES', type: 'REG_DWORD', value, existed: value !== null };
  },
  apply: async (options?: ApplyOptions): Promise<TweakResult> => {
    if (options?.dryRun) return { ok: true, data: 'Would set CPMINCORES to 100 (0x64)' };
    try {
      const current = await disableCoreParking.detect();
      await execAsync('powercfg /setacvalueindex scheme_current sub_processor cpmincores 100');
      await execAsync('powercfg /setdcvalueindex scheme_current sub_processor cpmincores 100');
      await execAsync('powercfg /setactive scheme_current');
      return { ok: true, previousState: current, newState: { ...current, value: 100 } };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  revert: async (originalState: TweakState): Promise<TweakResult> => {
    try {
      if (originalState.existed && originalState.value !== null) {
        const hex = (originalState.value as number).toString(16);
        await execAsync(`powercfg /setacvalueindex scheme_current sub_processor cpmincores ${hex}`);
        await execAsync(`powercfg /setdcvalueindex scheme_current sub_processor cpmincores ${hex}`);
        await execAsync('powercfg /setactive scheme_current');
      }
      return { ok: true };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  verify: async (expectedState: TweakState): Promise<boolean> => {
    const current = await disableCoreParking.detect();
    return current.value === 100;
  },
};

// 4. Processor Performance Boost Mode - Aggressive
export const processorBoostMode: Tweak = {
  id: 'power.boost_mode',
  name: 'Aggressive CPU Boost Mode',
  nameKey: 'tweaks.power.boostMode.name',
  category: 'power_cpu',
  description: 'Sets Processor Performance Boost Mode to Aggressive (1) via powercfg. Allows higher turbo frequencies longer.',
  descriptionKey: 'tweaks.power.boostMode.description',
  whenHelps: 'Better sustained clocks in games. Increases heat/power. Desktop recommended.',
  whenHelpsKey: 'tweaks.power.boostMode.whenHelps',
  risk: 'moderate',
  evidence: 'measured',
  impacto: 'medio',
      requiresReboot: false,
  compatibility: {
    windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
    formFactors: ['desktop'],
  },
  detect: async (): Promise<TweakState> => {
    const { stdout } = await execAsync('powercfg /query SCHEME_CURRENT SUB_PROCESSOR PERFBOOSTMODE');
    const match = stdout.match(/Current AC Power Setting Index:\s*0x([0-9a-f]+)/i);
    const value = match ? parseInt(match[1], 16) : null;
    return { path: 'POWERCFG', name: 'PERFBOOSTMODE', type: 'REG_DWORD', value, existed: value !== null };
  },
  apply: async (options?: ApplyOptions): Promise<TweakResult> => {
    if (options?.dryRun) return { ok: true, data: 'Would set PERFBOOSTMODE to 1 (Aggressive)' };
    try {
      const current = await processorBoostMode.detect();
      await execAsync('powercfg /setacvalueindex scheme_current sub_processor perfboostmode 1');
      await execAsync('powercfg /setdcvalueindex scheme_current sub_processor perfboostmode 1');
      await execAsync('powercfg /setactive scheme_current');
      return { ok: true, previousState: current, newState: { ...current, value: 1 } };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  revert: async (originalState: TweakState): Promise<TweakResult> => {
    try {
      if (originalState.existed && originalState.value !== null) {
        const hex = (originalState.value as number).toString(16);
        await execAsync(`powercfg /setacvalueindex scheme_current sub_processor perfboostmode ${hex}`);
        await execAsync(`powercfg /setdcvalueindex scheme_current sub_processor perfboostmode ${hex}`);
        await execAsync('powercfg /setactive scheme_current');
      }
      return { ok: true };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  verify: async (expectedState: TweakState): Promise<boolean> => {
    const current = await processorBoostMode.detect();
    return current.value === 1;
  },
};

// 5. PCIe Link State Power Management - Off (Desktop only)
export const pcieLinkPowerManagement: Tweak = {
  id: 'power.pcie_link_off',
  name: 'Disable PCIe Link State Power Management',
  nameKey: 'tweaks.power.pcieLinkOff.name',
  category: 'power_cpu',
  description: 'Sets PCI Express Link State Power Management to Off. Prevents GPU/SSD link downstates.',
  descriptionKey: 'tweaks.power.pcieLinkOff.description',
  whenHelps: 'Reduces latency spikes from link training. Increases idle power. Desktop only.',
  whenHelpsKey: 'tweaks.power.pcieLinkOff.whenHelps',
  risk: 'moderate',
  evidence: 'measured',
  impacto: 'medio',
      requiresReboot: false,
  compatibility: {
    windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
    formFactors: ['desktop'],
  },
  detect: async (): Promise<TweakState> => {
    const { stdout } = await execAsync('powercfg /query SCHEME_CURRENT SUB_PCIEXPRESS ASPM');
    const match = stdout.match(/Current AC Power Setting Index:\s*0x([0-9a-f]+)/i);
    const value = match ? parseInt(match[1], 16) : null;
    return { path: 'POWERCFG', name: 'ASPM', type: 'REG_DWORD', value, existed: value !== null };
  },
  apply: async (options?: ApplyOptions): Promise<TweakResult> => {
    if (options?.dryRun) return { ok: true, data: 'Would set PCIe ASPM to Off (0)' };
    try {
      const current = await pcieLinkPowerManagement.detect();
      await execAsync('powercfg /setacvalueindex scheme_current sub_pciexpress aspm 0');
      await execAsync('powercfg /setdcvalueindex scheme_current sub_pciexpress aspm 0');
      await execAsync('powercfg /setactive scheme_current');
      return { ok: true, previousState: current, newState: { ...current, value: 0 } };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  revert: async (originalState: TweakState): Promise<TweakResult> => {
    try {
      if (originalState.existed && originalState.value !== null) {
        const hex = (originalState.value as number).toString(16);
        await execAsync(`powercfg /setacvalueindex scheme_current sub_pciexpress aspm ${hex}`);
        await execAsync(`powercfg /setdcvalueindex scheme_current sub_pciexpress aspm ${hex}`);
        await execAsync('powercfg /setactive scheme_current');
      }
      return { ok: true };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  verify: async (expectedState: TweakState): Promise<boolean> => {
    const current = await pcieLinkPowerManagement.detect();
    return current.value === 0;
  },
};

// 6. Disable USB Selective Suspend
export const usbSelectiveSuspend: Tweak = {
  id: 'power.usb_selective_suspend',
  name: 'Disable USB Selective Suspend',
  nameKey: 'tweaks.power.usbSelectiveSuspend.name',
  category: 'power_cpu',
  description: 'Sets USB Selective Suspend Setting to Disabled. Prevents USB devices from being powered down.',
  descriptionKey: 'tweaks.power.usbSelectiveSuspend.description',
  whenHelps: 'Fixes mouse/keyboard wake latency, audio interface dropouts. Increases laptop battery drain slightly.',
  whenHelpsKey: 'tweaks.power.usbSelectiveSuspend.whenHelps',
  risk: 'safe',
  evidence: 'measured',
  impacto: 'bajo',
      requiresReboot: false,
  compatibility: {
    windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
    formFactors: ['desktop', 'laptop'],
  },
  detect: async (): Promise<TweakState> => {
    const { stdout } = await execAsync('powercfg /query SCHEME_CURRENT SUB_USB USBSELECTIVESUSPEND');
    const match = stdout.match(/Current AC Power Setting Index:\s*0x([0-9a-f]+)/i);
    const value = match ? parseInt(match[1], 16) : null;
    return { path: 'POWERCFG', name: 'USBSELECTIVESUSPEND', type: 'REG_DWORD', value, existed: value !== null };
  },
  apply: async (options?: ApplyOptions): Promise<TweakResult> => {
    if (options?.dryRun) return { ok: true, data: 'Would disable USB Selective Suspend' };
    try {
      const current = await usbSelectiveSuspend.detect();
      await execAsync('powercfg /setacvalueindex scheme_current sub_usb usbselectivesuspend 0');
      await execAsync('powercfg /setdcvalueindex scheme_current sub_usb usbselectivesuspend 0');
      await execAsync('powercfg /setactive scheme_current');
      return { ok: true, previousState: current, newState: { ...current, value: 0 } };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  revert: async (originalState: TweakState): Promise<TweakResult> => {
    try {
      if (originalState.existed && originalState.value !== null) {
        const hex = (originalState.value as number).toString(16);
        await execAsync(`powercfg /setacvalueindex scheme_current sub_usb usbselectivesuspend ${hex}`);
        await execAsync(`powercfg /setdcvalueindex scheme_current sub_usb usbselectivesuspend ${hex}`);
        await execAsync('powercfg /setactive scheme_current');
      }
      return { ok: true };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  verify: async (expectedState: TweakState): Promise<boolean> => {
    const current = await usbSelectiveSuspend.detect();
    return current.value === 0;
  },
};

// 7. Hibernation Off (optional)
export const hibernationOff: Tweak = {
  id: 'power.hibernate_off',
  name: 'Disable Hibernation (Delete hiberfil.sys)',
  nameKey: 'tweaks.power.hibernateOff.name',
  category: 'power_cpu',
  description: 'Runs powercfg /hibernate off. Deletes hiberfil.sys (saves RAM size on disk). Disables Fast Startup.',
  descriptionKey: 'tweaks.power.hibernateOff.description',
  whenHelps: 'Frees disk space (8-64GB). Required for some disk imaging tools. Disables Fast Startup.',
  whenHelpsKey: 'tweaks.power.hibernateOff.whenHelps',
  risk: 'safe',
  evidence: 'measured',
  impacto: 'bajo',
      requiresReboot: true,
  compatibility: {
    windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
    formFactors: ['desktop', 'laptop'],
  },
  detect: async (): Promise<TweakState> => {
    const { stdout } = await execAsync('powercfg /a');
    const enabled = !stdout.includes('Hibernate') || stdout.includes('The hibernation feature is disabled');
    return { path: 'POWERCFG', name: 'HibernateEnabled', type: 'REG_DWORD', value: enabled ? 0 : 1, existed: true };
  },
  apply: async (options?: ApplyOptions): Promise<TweakResult> => {
    if (options?.dryRun) return { ok: true, data: 'Would disable hibernation and delete hiberfil.sys' };
    try {
      const current = await hibernationOff.detect();
      await execAsync('powercfg /hibernate off');
      return { ok: true, previousState: current, newState: { ...current, value: 0 } };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  revert: async (originalState: TweakState): Promise<TweakResult> => {
    try {
      if (originalState.value === 1) {
        await execAsync('powercfg /hibernate on');
      }
      return { ok: true };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  verify: async (expectedState: TweakState): Promise<boolean> => {
    const current = await hibernationOff.detect();
    return current.value === 0;
  },
};

// 8. Disable Fast Startup
export const fastStartupOff: Tweak = {
  id: 'power.fast_startup_off',
  name: 'Disable Fast Startup (Hybrid Boot)',
  nameKey: 'tweaks.power.fastStartupOff.name',
  category: 'power_cpu',
  description: 'Sets HiberbootEnabled=0 in HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Power. Full cold boot each time.',
  descriptionKey: 'tweaks.power.fastStartupOff.description',
  whenHelps: 'Fixes dual-boot issues, driver loading problems, bitlocker prompts. Slightly slower boot.',
  whenHelpsKey: 'tweaks.power.fastStartupOff.whenHelps',
  risk: 'safe',
  evidence: 'measured',
  impacto: 'bajo',
      requiresReboot: true,
  compatibility: {
    windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
    formFactors: ['desktop', 'laptop'],
  },
  detect: async (): Promise<TweakState> => {
    const result = await RegistryManager.getValue('HKLM', '\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Power', 'HiberbootEnabled');
    return { path: 'HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Power', name: 'HiberbootEnabled', type: 'REG_DWORD', value: result.value, existed: result.existed };
  },
  apply: async (options?: ApplyOptions): Promise<TweakResult> => {
    if (options?.dryRun) return { ok: true, data: 'Would disable Fast Startup' };
    try {
      const current = await fastStartupOff.detect();
      await RegistryManager.setValue('HKLM', '\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Power', 'HiberbootEnabled', 'REG_DWORD', 0);
      return { ok: true, previousState: current, newState: { ...current, value: 0 } };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  revert: async (originalState: TweakState): Promise<TweakResult> => {
    try {
      if (originalState.existed) {
        await RegistryManager.setValue('HKLM', '\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Power', 'HiberbootEnabled', 'REG_DWORD', originalState.value as number);
      } else {
        await RegistryManager.deleteValue('HKLM', '\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Power', 'HiberbootEnabled');
      }
      return { ok: true };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  verify: async (expectedState: TweakState): Promise<boolean> => {
    const current = await fastStartupOff.detect();
    return current.value === 0;
  },
};

export const powerTweaks: Tweak[] = [
  ultimatePerformancePlan,
  highPerformancePlan,
  disableCoreParking,
  processorBoostMode,
  pcieLinkPowerManagement,
  usbSelectiveSuspend,
  hibernationOff,
  fastStartupOff,
];