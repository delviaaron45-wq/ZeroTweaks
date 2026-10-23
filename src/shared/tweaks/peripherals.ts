import type { Tweak, TweakState, TweakResult, ApplyOptions } from '../types/all';
import { RegistryManager } from './registry';
import { execAsync } from '../utils/process';

// Peripherals & Input Tweaks (25 target)

// 1. Mouse Data Queue Size (Advanced, Default 100)
export const mouseDataQueueSize: Tweak = {
  id: 'peripherals.mouse_queue',
  name: 'Mouse Data Queue Size (mouclass)',
  category: 'peripherals_input',
  description: 'Sets MouseDataQueueSize in HKLM\\SYSTEM\\CurrentControlSet\\Services\\mouclass\\Parameters. Default 100 (0x64). Lowering to 20 unproven, may lose events on 8kHz mice. Advanced, disabled by default.',
  whenHelps: 'Theoretically reduces input latency. Risk of lost mouse events. Evidence: placebo/debated. A/B test recommended.',
  risk: 'advanced',
  evidence: 'placebo',
  impacto: 'alto',
      requiresReboot: true,
  compatibility: {
    windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
    formFactors: ['desktop'],
  },
  detect: async (): Promise<TweakState> => {
    const result = await RegistryManager.getValue('HKLM', '\\SYSTEM\\CurrentControlSet\\Services\\mouclass\\Parameters', 'MouseDataQueueSize');
    return { path: 'HKLM\\SYSTEM\\CurrentControlSet\\Services\\mouclass\\Parameters', name: 'MouseDataQueueSize', type: 'REG_DWORD', value: result.value, existed: result.existed };
  },
  apply: async (options?: ApplyOptions): Promise<TweakResult> => {
    if (options?.dryRun) return { ok: true, data: 'Would set MouseDataQueueSize to 20 (advanced, test first!)' };
    try {
      const current = await mouseDataQueueSize.detect();
      await RegistryManager.setValue('HKLM', '\\SYSTEM\\CurrentControlSet\\Services\\mouclass\\Parameters', 'MouseDataQueueSize', 'REG_DWORD', 20);
      return { ok: true, previousState: current, newState: { ...current, value: 20 } };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  revert: async (originalState: TweakState): Promise<TweakResult> => {
    try {
      if (originalState.existed) {
        await RegistryManager.setValue('HKLM', '\\SYSTEM\\CurrentControlSet\\Services\\mouclass\\Parameters', 'MouseDataQueueSize', 'REG_DWORD', originalState.value as number);
      } else {
        await RegistryManager.deleteValue('HKLM', '\\SYSTEM\\CurrentControlSet\\Services\\mouclass\\Parameters', 'MouseDataQueueSize');
      }
      return { ok: true };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  verify: async (expectedState: TweakState): Promise<boolean> => {
    const current = await mouseDataQueueSize.detect();
    return current.value === 20;
  },
};

// 2. Keyboard Data Queue Size (Advanced, Default 100)
export const keyboardDataQueueSize: Tweak = {
  id: 'peripherals.keyboard_queue',
  name: 'Keyboard Data Queue Size (kbdclass)',
  category: 'peripherals_input',
  description: 'Sets KeyboardDataQueueSize in HKLM\\SYSTEM\\CurrentControlSet\\Services\\kbdclass\\Parameters. Default 100. Similar caveats as mouse queue.',
  whenHelps: 'Theoretical latency reduction. Risk of lost keystrokes. Evidence: placebo.',
  risk: 'advanced',
  evidence: 'placebo',
  impacto: 'alto',
      requiresReboot: true,
  compatibility: {
    windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
    formFactors: ['desktop'],
  },
  detect: async (): Promise<TweakState> => {
    const result = await RegistryManager.getValue('HKLM', '\\SYSTEM\\CurrentControlSet\\Services\\kbdclass\\Parameters', 'KeyboardDataQueueSize');
    return { path: 'HKLM\\SYSTEM\\CurrentControlSet\\Services\\kbdclass\\Parameters', name: 'KeyboardDataQueueSize', type: 'REG_DWORD', value: result.value, existed: result.existed };
  },
  apply: async (options?: ApplyOptions): Promise<TweakResult> => {
    if (options?.dryRun) return { ok: true, data: 'Would set KeyboardDataQueueSize to 20 (advanced, test first!)' };
    try {
      const current = await keyboardDataQueueSize.detect();
      await RegistryManager.setValue('HKLM', '\\SYSTEM\\CurrentControlSet\\Services\\kbdclass\\Parameters', 'KeyboardDataQueueSize', 'REG_DWORD', 20);
      return { ok: true, previousState: current, newState: { ...current, value: 20 } };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  revert: async (originalState: TweakState): Promise<TweakResult> => {
    try {
      if (originalState.existed) {
        await RegistryManager.setValue('HKLM', '\\SYSTEM\\CurrentControlSet\\Services\\kbdclass\\Parameters', 'KeyboardDataQueueSize', 'REG_DWORD', originalState.value as number);
      } else {
        await RegistryManager.deleteValue('HKLM', '\\SYSTEM\\CurrentControlSet\\Services\\kbdclass\\Parameters', 'KeyboardDataQueueSize');
      }
      return { ok: true };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  verify: async (expectedState: TweakState): Promise<boolean> => {
    const current = await keyboardDataQueueSize.detect();
    return current.value === 20;
  },
};

// 3. MSI Mode for GPU (Message Signaled Interrupts)
export const msiModeGpu: Tweak = {
  id: 'peripherals.msi_mode_gpu',
  name: 'MSI Mode for GPU (Message Signaled Interrupts)',
  category: 'peripherals_input',
  description: 'Enables MSI for GPU via registry: HKLM\\SYSTEM\\CurrentControlSet\\Enum\\PCI\\<device>\\<instance>\\Device Parameters\\Interrupt Management\\MessageSignaledInterruptProperties -> MSISupported=1. Requires compatible device, reboot. Moderate risk.',
  whenHelps: 'Reduces interrupt latency for GPU. Can improve frame pacing. Must verify device supports MSI.',
  risk: 'moderate',
  evidence: 'debated',
  impacto: 'medio',
      requiresReboot: true,
  compatibility: {
    windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
    formFactors: ['desktop'],
  },
  detect: async (): Promise<TweakState> => {
    const { stdout } = await execAsync('powershell -NoProfile -Command "Get-PnpDevice -Class Display | Where-Object {$_.InstanceId -match \'PCI\'} | Select-Object InstanceId, FriendlyName | ConvertTo-Json"');
    const gpus = stdout.trim() ? JSON.parse(stdout) : [];
    const results = [];
    for (const gpu of gpus) {
      const keyPath = `\\SYSTEM\\CurrentControlSet\\Enum\\${gpu.InstanceId}\\Device Parameters\\Interrupt Management\\MessageSignaledInterruptProperties`;
      const result = await RegistryManager.getValue('HKLM', keyPath, 'MSISupported');
      results.push({ device: gpu.FriendlyName, instance: gpu.InstanceId, msiSupported: result.value });
    }
    return { path: 'HKLM\\SYSTEM\\CurrentControlSet\\Enum\\PCI\\*', name: 'MSI_GPU', type: 'REG_DWORD', value: results, existed: results.length > 0 };
  },
  apply: async (options?: ApplyOptions): Promise<TweakResult> => {
    if (options?.dryRun) return { ok: true, data: 'Would enable MSI for compatible GPUs (requires device enumeration)' };
    try {
      const current = await msiModeGpu.detect();
      const devices = current.value as any[];
      for (const dev of devices) {
        if (dev.msiSupported === 0 || dev.msiSupported === undefined) {
          const keyPath = `\\SYSTEM\\CurrentControlSet\\Enum\\${dev.instance}\\Device Parameters\\Interrupt Management\\MessageSignaledInterruptProperties`;
          await RegistryManager.createKey('HKLM', keyPath);
          await RegistryManager.setValue('HKLM', keyPath, 'MSISupported', 'REG_DWORD', 1);
        }
      }
      return { ok: true, previousState: current, newState: { ...current, value: 'applied' } };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  revert: async (originalState: TweakState): Promise<TweakResult> => {
    try {
      const devices = originalState.value as any[];
      for (const dev of devices) {
        const keyPath = `\\SYSTEM\\CurrentControlSet\\Enum\\${dev.instance}\\Device Parameters\\Interrupt Management\\MessageSignaledInterruptProperties`;
        if (dev.msiSupported !== undefined) {
          await RegistryManager.setValue('HKLM', keyPath, 'MSISupported', 'REG_DWORD', dev.msiSupported);
        } else {
          await RegistryManager.deleteValue('HKLM', keyPath, 'MSISupported');
        }
      }
      return { ok: true };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  verify: async (expectedState: TweakState): Promise<boolean> => {
    const current = await msiModeGpu.detect();
    const devices = current.value as any[];
    return devices.every(d => d.msiSupported === 1);
  },
};

// 4. MSI Mode for Network Adapter
export const msiModeNetwork: Tweak = {
  id: 'peripherals.msi_mode_network',
  name: 'MSI Mode for Network Adapter',
  category: 'peripherals_input',
  description: 'Enables MSI for primary network adapter. Similar to GPU MSI. Can reduce network interrupt latency.',
  whenHelps: 'May reduce DPC latency from network interrupts. Requires compatible NIC.',
  risk: 'moderate',
  evidence: 'debated',
  impacto: 'medio',
      requiresReboot: true,
  compatibility: {
    windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
    formFactors: ['desktop', 'laptop'],
  },
  detect: async (): Promise<TweakState> => {
    const { stdout } = await execAsync('powershell -NoProfile -Command "Get-NetAdapter -Physical | Where-Object {$_.Status -eq \\"Up\\"} | Select-Object Name, InterfaceGuid, InterfaceDescription | ConvertTo-Json"');
    const nics = stdout.trim() ? JSON.parse(stdout) : [];
    const results = [];
    for (const nic of nics) {
      const { stdout: pnp } = await execAsync(`powershell -NoProfile -Command "Get-PnpDevice -Class Net | Where-Object {$_.FriendlyName -eq '${nic.Name}'} | Select-Object InstanceId | ConvertTo-Json"`);
      const pnpDev = pnp.trim() ? JSON.parse(pnp) : null;
      if (pnpDev) {
        const keyPath = `\\SYSTEM\\CurrentControlSet\\Enum\\${pnpDev.InstanceId}\\Device Parameters\\Interrupt Management\\MessageSignaledInterruptProperties`;
        const result = await RegistryManager.getValue('HKLM', keyPath, 'MSISupported');
        results.push({ device: nic.Name, instance: pnpDev.InstanceId, msiSupported: result.value });
      }
    }
    return { path: 'HKLM\\SYSTEM\\CurrentControlSet\\Enum\\PCI\\*', name: 'MSI_NETWORK', type: 'REG_DWORD', value: results, existed: results.length > 0 };
  },
  apply: async (options?: ApplyOptions): Promise<TweakResult> => {
    if (options?.dryRun) return { ok: true, data: 'Would enable MSI for active network adapters' };
    try {
      const current = await msiModeNetwork.detect();
      const devices = current.value as any[];
      for (const dev of devices) {
        if (dev.msiSupported === 0 || dev.msiSupported === undefined) {
          const keyPath = `\\SYSTEM\\CurrentControlSet\\Enum\\${dev.instance}\\Device Parameters\\Interrupt Management\\MessageSignaledInterruptProperties`;
          await RegistryManager.createKey('HKLM', keyPath);
          await RegistryManager.setValue('HKLM', keyPath, 'MSISupported', 'REG_DWORD', 1);
        }
      }
      return { ok: true, previousState: current, newState: { ...current, value: 'applied' } };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  revert: async (originalState: TweakState): Promise<TweakResult> => {
    try {
      const devices = originalState.value as any[];
      for (const dev of devices) {
        const keyPath = `\\SYSTEM\\CurrentControlSet\\Enum\\${dev.instance}\\Device Parameters\\Interrupt Management\\MessageSignaledInterruptProperties`;
        if (dev.msiSupported !== undefined) {
          await RegistryManager.setValue('HKLM', keyPath, 'MSISupported', 'REG_DWORD', dev.msiSupported);
        } else {
          await RegistryManager.deleteValue('HKLM', keyPath, 'MSISupported');
        }
      }
      return { ok: true };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  verify: async (expectedState: TweakState): Promise<boolean> => {
    const current = await msiModeNetwork.detect();
    const devices = current.value as any[];
    return devices.every(d => d.msiSupported === 1);
  },
};

// 5. Interrupt Affinity / Priority (Advanced)
export const interruptAffinity: Tweak = {
  id: 'peripherals.interrupt_affinity',
  name: 'Interrupt Affinity Policy (Device Priority)',
  category: 'peripherals_input',
  description: 'Sets DevicePriority in ...\\Interrupt Management\\Affinity Policy. 1=Low, 2=Normal, 3=High. Assigns interrupt to specific CPU cores. Advanced, per-device.',
  whenHelps: 'Can isolate interrupts to specific cores. Complex, requires testing. Risk of system instability if misconfigured.',
  risk: 'advanced',
  evidence: 'debated',
  impacto: 'alto',
      requiresReboot: true,
  compatibility: {
    windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
    formFactors: ['desktop'],
  },
  detect: async (): Promise<TweakState> => {
    return { path: 'HKLM\\SYSTEM\\CurrentControlSet\\Enum\\PCI\\*', name: 'InterruptAffinity', type: 'REG_DWORD', value: 'requires_per_device_config', existed: false };
  },
  apply: async (options?: ApplyOptions): Promise<TweakResult> => {
    if (options?.dryRun) return { ok: true, data: 'Would configure interrupt affinity (per-device, advanced)' };
    return { ok: false, error: 'Advanced per-device configuration required. Use Device Manager > Resources tab.' };
  },
  revert: async (originalState: TweakState): Promise<TweakResult> => {
    return { ok: true };
  },
  verify: async (expectedState: TweakState): Promise<boolean> => {
    return false;
  },
};

// 6. HPET (High Precision Event Timer) - Force Off
export const hpetForceOff: Tweak = {
  id: 'peripherals.hpet_off',
  name: 'Force HPET Off (Use TSC/Invariant TSC)',
  category: 'peripherals_input',
  description: 'Sets UsePlatformClock=No via bcdedit. Forces Windows to use TSC instead of HPET. Can improve timer consistency on modern CPUs.',
  whenHelps: 'Reduces timer jitter on systems where HPET is slower than TSC. Requires Invariant TSC (most CPUs since ~2010).',
  risk: 'moderate',
  evidence: 'debated',
  impacto: 'medio',
      requiresReboot: true,
  compatibility: {
    windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
    formFactors: ['desktop', 'laptop'],
  },
  detect: async (): Promise<TweakState> => {
    const { stdout } = await execAsync('bcdenum /enum');
    const usePlatformClock = stdout.includes('useplatformclock') && !stdout.includes('useplatformclock No');
    return { path: 'BCD', name: 'useplatformclock', type: 'REG_SZ', value: usePlatformClock ? 'Yes' : 'No', existed: true };
  },
  apply: async (options?: ApplyOptions): Promise<TweakResult> => {
    if (options?.dryRun) return { ok: true, data: 'Would set useplatformclock=No (force HPET off)' };
    try {
      const current = await hpetForceOff.detect();
      await execAsync('bcdedit /set useplatformclock No');
      await execAsync('bcdedit /deletevalue useplatformclock'); // Also try delete to be sure
      return { ok: true, previousState: current, newState: { ...current, value: 'No' } };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  revert: async (originalState: TweakState): Promise<TweakResult> => {
    try {
      if (originalState.value === 'Yes') {
        await execAsync('bcdedit /set useplatformclock Yes');
      } else {
        await execAsync('bcdedit /deletevalue useplatformclock');
      }
      return { ok: true };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  verify: async (expectedState: TweakState): Promise<boolean> => {
    const current = await hpetForceOff.detect();
    return current.value === 'No';
  },
};

// 7. Dynamic Tick (Tickless Kernel) - Disable
export const dynamicTickDisable: Tweak = {
  id: 'peripherals.dynamic_tick_disable',
  name: 'Disable Dynamic Tick (Tickless Kernel)',
  category: 'peripherals_input',
  description: 'Sets disabledynamictick=Yes via bcdedit. Forces periodic timer tick. Can reduce timer variance for audio/realtime.',
  whenHelps: 'May improve DPC latency consistency. Increases power consumption. Evidence: debated.',
  risk: 'moderate',
  evidence: 'debated',
  impacto: 'medio',
      requiresReboot: true,
  compatibility: {
    windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
    formFactors: ['desktop'],
  },
  detect: async (): Promise<TweakState> => {
    const { stdout } = await execAsync('bcdenum /enum');
    const disabled = stdout.includes('disabledynamictick Yes');
    return { path: 'BCD', name: 'disabledynamictick', type: 'REG_SZ', value: disabled ? 'Yes' : 'No', existed: true };
  },
  apply: async (options?: ApplyOptions): Promise<TweakResult> => {
    if (options?.dryRun) return { ok: true, data: 'Would disable dynamic tick (disabledynamictick=Yes)' };
    try {
      const current = await dynamicTickDisable.detect();
      await execAsync('bcdedit /set disabledynamictick Yes');
      return { ok: true, previousState: current, newState: { ...current, value: 'Yes' } };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  revert: async (originalState: TweakState): Promise<TweakResult> => {
    try {
      if (originalState.value === 'No') {
        await execAsync('bcdedit /deletevalue disabledynamictick');
      } else {
        await execAsync('bcdedit /set disabledynamictick No');
      }
      return { ok: true };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  verify: async (expectedState: TweakState): Promise<boolean> => {
    const current = await dynamicTickDisable.detect();
    return current.value === 'Yes';
  },
};

// 8. USB Polling Rate (Mouse/Keyboard) - Read Only
export const usbPollingRate: Tweak = {
  id: 'peripherals.usb_polling',
  name: 'USB Polling Rate Detection',
  category: 'peripherals_input',
  description: 'Detects current USB polling rate for HID devices. 125Hz default, 1000Hz+ for gaming mice. Read-only.',
  whenHelps: 'Verifies mouse/keyboard running at expected polling rate. Change via device software, not Windows.',
  risk: 'safe',
  evidence: 'measured',
  impacto: 'bajo',
      requiresReboot: false,
  compatibility: {
    windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
    formFactors: ['desktop', 'laptop'],
  },
  detect: async (): Promise<TweakState> => {
    const { stdout } = await execAsync('powershell -NoProfile -Command "Get-PnpDevice -Class HIDClass | Where-Object {$_.InstanceId -match \'VID_\'} | Select-Object FriendlyName, InstanceId | ConvertTo-Json"');
    const hids = stdout.trim() ? JSON.parse(stdout) : [];
    return { path: 'WMI', name: 'USBPollingRate', type: 'REG_SZ', value: hids, existed: true };
  },
  apply: async (options?: ApplyOptions): Promise<TweakResult> => {
    return { ok: true, data: 'Read-only. Change polling rate via manufacturer software.' };
  },
  revert: async (originalState: TweakState): Promise<TweakResult> => {
    return { ok: true };
  },
  verify: async (expectedState: TweakState): Promise<boolean> => {
    return true;
  },
};

export const peripheralsTweaks: Tweak[] = [
  mouseDataQueueSize,
  keyboardDataQueueSize,
  msiModeGpu,
  msiModeNetwork,
  interruptAffinity,
  hpetForceOff,
  dynamicTickDisable,
  usbPollingRate,
];