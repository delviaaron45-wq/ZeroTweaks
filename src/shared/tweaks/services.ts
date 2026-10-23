import type { Tweak, TweakState, TweakResult, ApplyOptions } from '../types/all';
import { RegistryManager } from './registry';
import { execAsync } from '../utils/process';

// Services Tweaks (30 target)

// 1. SysMain (Superfetch) - Set to Manual
export const sysMainManual: Tweak = {
  id: 'services.sysmain_manual',
  name: 'SysMain (Superfetch) to Manual',
  category: 'services',
  description: 'Sets SysMain service to Manual startup. Prefetches apps into RAM. Disable on SSD, Manual on HDD.',
  whenHelps: 'Reduces disk usage on SSD. On HDD, Manual allows on-demand prefetch. Default: Auto.',
  risk: 'safe',
  evidence: 'measured',
  impacto: 'bajo',
      requiresReboot: false,
  compatibility: {
    windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
    formFactors: ['desktop', 'laptop'],
  },
  detect: async (): Promise<TweakState> => {
    const { stdout } = await execAsync('powershell -NoProfile -Command "Get-Service SysMain | Select-Object StartType, Status | ConvertTo-Json"');
    const info = stdout.trim() ? JSON.parse(stdout) : { StartType: 'Unknown', Status: 'Unknown' };
    return { path: 'SERVICE', name: 'SysMain', type: 'REG_SZ', value: info, existed: true };
  },
  apply: async (options?: ApplyOptions): Promise<TweakResult> => {
    if (options?.dryRun) return { ok: true, data: 'Would set SysMain to Manual' };
    try {
      const current = await sysMainManual.detect();
      await execAsync('sc config SysMain start= demand');
      await execAsync('sc stop SysMain');
      return { ok: true, previousState: current, newState: { ...current, value: { StartType: 'Manual', Status: 'Stopped' } } };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  revert: async (originalState: TweakState): Promise<TweakResult> => {
    try {
      const val = originalState.value as any;
      if (val.StartType) {
        await execAsync(`sc config SysMain start= ${val.StartType.toLowerCase()}`);
        if (val.Status === 'Running') await execAsync('sc start SysMain');
      }
      return { ok: true };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  verify: async (expectedState: TweakState): Promise<boolean> => {
    const current = await sysMainManual.detect();
    const cur = current.value as any;
    return cur.StartType === 'Manual';
  },
};

// 2. Windows Search (WSearch) - Manual
export const windowsSearchManual: Tweak = {
  id: 'services.wsearch_manual',
  name: 'Windows Search to Manual',
  category: 'services',
  description: 'Sets WSearch service to Manual. Indexes files for fast search. Disable if using Everything/third-party search.',
  whenHelps: 'Reduces CPU/disk from indexing. Search still works but slower for non-indexed locations.',
  risk: 'safe',
  evidence: 'measured',
  impacto: 'bajo',
      requiresReboot: false,
  compatibility: {
    windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
    formFactors: ['desktop', 'laptop'],
  },
  detect: async (): Promise<TweakState> => {
    const { stdout } = await execAsync('powershell -NoProfile -Command "Get-Service WSearch | Select-Object StartType, Status | ConvertTo-Json"');
    const info = stdout.trim() ? JSON.parse(stdout) : { StartType: 'Unknown', Status: 'Unknown' };
    return { path: 'SERVICE', name: 'WSearch', type: 'REG_SZ', value: info, existed: true };
  },
  apply: async (options?: ApplyOptions): Promise<TweakResult> => {
    if (options?.dryRun) return { ok: true, data: 'Would set Windows Search to Manual' };
    try {
      const current = await windowsSearchManual.detect();
      await execAsync('sc config WSearch start= demand');
      await execAsync('sc stop WSearch');
      return { ok: true, previousState: current, newState: { ...current, value: { StartType: 'Manual', Status: 'Stopped' } } };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  revert: async (originalState: TweakState): Promise<TweakResult> => {
    try {
      const val = originalState.value as any;
      if (val.StartType) {
        await execAsync(`sc config WSearch start= ${val.StartType.toLowerCase()}`);
        if (val.Status === 'Running') await execAsync('sc start WSearch');
      }
      return { ok: true };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  verify: async (expectedState: TweakState): Promise<boolean> => {
    const current = await windowsSearchManual.detect();
    const cur = current.value as any;
    return cur.StartType === 'Manual';
  },
};

// 3. Print Spooler - Manual (if no printer)
export const printSpoolerManual: Tweak = {
  id: 'services.spooler_manual',
  name: 'Print Spooler to Manual',
  category: 'services',
  description: 'Sets Spooler service to Manual. Only needed when printing. Disable if no printer attached.',
  whenHelps: 'Reduces attack surface (PrintNightmare), saves RAM. Enable manually when printing.',
  risk: 'safe',
  evidence: 'measured',
  impacto: 'bajo',
      requiresReboot: false,
  compatibility: {
    windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
    formFactors: ['desktop', 'laptop'],
  },
  detect: async (): Promise<TweakState> => {
    const { stdout } = await execAsync('powershell -NoProfile -Command "Get-Service Spooler | Select-Object StartType, Status | ConvertTo-Json"');
    const info = stdout.trim() ? JSON.parse(stdout) : { StartType: 'Unknown', Status: 'Unknown' };
    return { path: 'SERVICE', name: 'Spooler', type: 'REG_SZ', value: info, existed: true };
  },
  apply: async (options?: ApplyOptions): Promise<TweakResult> => {
    if (options?.dryRun) return { ok: true, data: 'Would set Print Spooler to Manual' };
    try {
      const current = await printSpoolerManual.detect();
      await execAsync('sc config Spooler start= demand');
      await execAsync('sc stop Spooler');
      return { ok: true, previousState: current, newState: { ...current, value: { StartType: 'Manual', Status: 'Stopped' } } };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  revert: async (originalState: TweakState): Promise<TweakResult> => {
    try {
      const val = originalState.value as any;
      if (val.StartType) {
        await execAsync(`sc config Spooler start= ${val.StartType.toLowerCase()}`);
        if (val.Status === 'Running') await execAsync('sc start Spooler');
      }
      return { ok: true };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  verify: async (expectedState: TweakState): Promise<boolean> => {
    const current = await printSpoolerManual.detect();
    const cur = current.value as any;
    return cur.StartType === 'Manual';
  },
};

// 4. Fax Service - Disabled
export const faxServiceDisabled: Tweak = {
  id: 'services.fax_disabled',
  name: 'Fax Service Disabled',
  category: 'services',
  description: 'Sets Fax service to Disabled. Legacy fax support. Not needed on modern systems.',
  whenHelps: 'Reduces attack surface, saves tiny RAM. No downside if not using fax modem.',
  risk: 'safe',
  evidence: 'measured',
  impacto: 'bajo',
      requiresReboot: false,
  compatibility: {
    windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
    formFactors: ['desktop', 'laptop'],
  },
  detect: async (): Promise<TweakState> => {
    const { stdout } = await execAsync('powershell -NoProfile -Command "Get-Service Fax | Select-Object StartType, Status | ConvertTo-Json"');
    const info = stdout.trim() ? JSON.parse(stdout) : { StartType: 'Unknown', Status: 'Unknown' };
    return { path: 'SERVICE', name: 'Fax', type: 'REG_SZ', value: info, existed: true };
  },
  apply: async (options?: ApplyOptions): Promise<TweakResult> => {
    if (options?.dryRun) return { ok: true, data: 'Would set Fax service to Disabled' };
    try {
      const current = await faxServiceDisabled.detect();
      await execAsync('sc config Fax start= disabled');
      await execAsync('sc stop Fax');
      return { ok: true, previousState: current, newState: { ...current, value: { StartType: 'Disabled', Status: 'Stopped' } } };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  revert: async (originalState: TweakState): Promise<TweakResult> => {
    try {
      const val = originalState.value as any;
      if (val.StartType) {
        await execAsync(`sc config Fax start= ${val.StartType.toLowerCase()}`);
        if (val.Status === 'Running') await execAsync('sc start Fax');
      }
      return { ok: true };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  verify: async (expectedState: TweakState): Promise<boolean> => {
    const current = await faxServiceDisabled.detect();
    const cur = current.value as any;
    return cur.StartType === 'Disabled';
  },
};

// 5. Remote Registry - Disabled
export const remoteRegistryDisabled: Tweak = {
  id: 'services.remote_registry_disabled',
  name: 'Remote Registry Disabled',
  category: 'services',
  description: 'Sets RemoteRegistry service to Disabled. Allows remote registry access. Security hardening.',
  whenHelps: 'Prevents remote registry manipulation. No downside for single-user systems.',
  risk: 'safe',
  evidence: 'measured',
  impacto: 'bajo',
      requiresReboot: false,
  compatibility: {
    windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
    formFactors: ['desktop', 'laptop'],
  },
  detect: async (): Promise<TweakState> => {
    const { stdout } = await execAsync('powershell -NoProfile -Command "Get-Service RemoteRegistry | Select-Object StartType, Status | ConvertTo-Json"');
    const info = stdout.trim() ? JSON.parse(stdout) : { StartType: 'Unknown', Status: 'Unknown' };
    return { path: 'SERVICE', name: 'RemoteRegistry', type: 'REG_SZ', value: info, existed: true };
  },
  apply: async (options?: ApplyOptions): Promise<TweakResult> => {
    if (options?.dryRun) return { ok: true, data: 'Would set Remote Registry to Disabled' };
    try {
      const current = await remoteRegistryDisabled.detect();
      await execAsync('sc config RemoteRegistry start= disabled');
      await execAsync('sc stop RemoteRegistry');
      return { ok: true, previousState: current, newState: { ...current, value: { StartType: 'Disabled', Status: 'Stopped' } } };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  revert: async (originalState: TweakState): Promise<TweakResult> => {
    try {
      const val = originalState.value as any;
      if (val.StartType) {
        await execAsync(`sc config RemoteRegistry start= ${val.StartType.toLowerCase()}`);
        if (val.Status === 'Running') await execAsync('sc start RemoteRegistry');
      }
      return { ok: true };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  verify: async (expectedState: TweakState): Promise<boolean> => {
    const current = await remoteRegistryDisabled.detect();
    const cur = current.value as any;
    return cur.StartType === 'Disabled';
  },
};

// 6. Downloaded Maps Manager - Disabled
export const mapsManagerDisabled: Tweak = {
  id: 'services.maps_disabled',
  name: 'Downloaded Maps Manager Disabled',
  category: 'services',
  description: 'Sets MapsBroker service to Disabled. Manages offline maps. Not needed if not using Windows Maps offline.',
  whenHelps: 'Saves RAM/CPU. No downside if not using offline maps.',
  risk: 'safe',
  evidence: 'measured',
  impacto: 'bajo',
      requiresReboot: false,
  compatibility: {
    windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
    formFactors: ['desktop', 'laptop'],
  },
  detect: async (): Promise<TweakState> => {
    const { stdout } = await execAsync('powershell -NoProfile -Command "Get-Service MapsBroker | Select-Object StartType, Status | ConvertTo-Json"');
    const info = stdout.trim() ? JSON.parse(stdout) : { StartType: 'Unknown', Status: 'Unknown' };
    return { path: 'SERVICE', name: 'MapsBroker', type: 'REG_SZ', value: info, existed: true };
  },
  apply: async (options?: ApplyOptions): Promise<TweakResult> => {
    if (options?.dryRun) return { ok: true, data: 'Would set Maps Broker to Disabled' };
    try {
      const current = await mapsManagerDisabled.detect();
      await execAsync('sc config MapsBroker start= disabled');
      await execAsync('sc stop MapsBroker');
      return { ok: true, previousState: current, newState: { ...current, value: { StartType: 'Disabled', Status: 'Stopped' } } };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  revert: async (originalState: TweakState): Promise<TweakResult> => {
    try {
      const val = originalState.value as any;
      if (val.StartType) {
        await execAsync(`sc config MapsBroker start= ${val.StartType.toLowerCase()}`);
        if (val.Status === 'Running') await execAsync('sc start MapsBroker');
      }
      return { ok: true };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  verify: async (expectedState: TweakState): Promise<boolean> => {
    const current = await mapsManagerDisabled.detect();
    const cur = current.value as any;
    return cur.StartType === 'Disabled';
  },
};

// 7. Xbox Services - Manual (if not gaming)
export const xboxServicesManual: Tweak = {
  id: 'services.xbox_manual',
  name: 'Xbox Services to Manual',
  category: 'services',
  description: 'Sets XboxLiveAuthManager, XboxLiveGameSave, XboxNetApiSvc to Manual. Only needed for Xbox Game Bar / Game Pass.',
  whenHelps: 'Reduces background processes if not using Xbox features. Game Bar may not work.',
  risk: 'safe',
  evidence: 'measured',
  impacto: 'bajo',
      requiresReboot: false,
  compatibility: {
    windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
    formFactors: ['desktop', 'laptop'],
  },
  detect: async (): Promise<TweakState> => {
    const services = ['XboxLiveAuthManager', 'XboxLiveGameSave', 'XboxNetApiSvc'];
    const results = [];
    for (const svc of services) {
      const { stdout } = await execAsync(`powershell -NoProfile -Command "Get-Service ${svc} | Select-Object Name, StartType, Status | ConvertTo-Json"`);
      const info = stdout.trim() ? JSON.parse(stdout) : { Name: svc, StartType: 'Unknown', Status: 'Unknown' };
      results.push(info);
    }
    return { path: 'SERVICE', name: 'XboxServices', type: 'REG_SZ', value: results, existed: true };
  },
  apply: async (options?: ApplyOptions): Promise<TweakResult> => {
    if (options?.dryRun) return { ok: true, data: 'Would set Xbox services to Manual' };
    try {
      const current = await xboxServicesManual.detect();
      const services = ['XboxLiveAuthManager', 'XboxLiveGameSave', 'XboxNetApiSvc'];
      for (const svc of services) {
        await execAsync(`sc config ${svc} start= demand`);
        await execAsync(`sc stop ${svc}`);
      }
      return { ok: true, previousState: current, newState: { ...current, value: 'manual' } };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  revert: async (originalState: TweakState): Promise<TweakResult> => {
    try {
      const services = ['XboxLiveAuthManager', 'XboxLiveGameSave', 'XboxNetApiSvc'];
      for (const svc of services) {
        await execAsync(`sc config ${svc} start= auto`);
        await execAsync(`sc start ${svc}`);
      }
      return { ok: true };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  verify: async (expectedState: TweakState): Promise<boolean> => {
    const current = await xboxServicesManual.detect();
    const svcs = current.value as any[];
    return svcs.every(s => s.StartType === 'Manual');
  },
};

// 8. Bluetooth Support - Manual (if no BT)
export const bluetoothManual: Tweak = {
  id: 'services.bluetooth_manual',
  name: 'Bluetooth Support to Manual',
  category: 'services',
  description: 'Sets bthserv to Manual. Only needed for Bluetooth devices. Disable if no BT hardware.',
  whenHelps: 'Saves RAM/CPU. No downside without BT hardware.',
  risk: 'safe',
  evidence: 'measured',
  impacto: 'bajo',
      requiresReboot: false,
  compatibility: {
    windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
    formFactors: ['desktop', 'laptop'],
  },
  detect: async (): Promise<TweakState> => {
    const { stdout } = await execAsync('powershell -NoProfile -Command "Get-Service bthserv | Select-Object StartType, Status | ConvertTo-Json"');
    const info = stdout.trim() ? JSON.parse(stdout) : { StartType: 'Unknown', Status: 'Unknown' };
    return { path: 'SERVICE', name: 'bthserv', type: 'REG_SZ', value: info, existed: true };
  },
  apply: async (options?: ApplyOptions): Promise<TweakResult> => {
    if (options?.dryRun) return { ok: true, data: 'Would set Bluetooth Support to Manual' };
    try {
      const current = await bluetoothManual.detect();
      await execAsync('sc config bthserv start= demand');
      await execAsync('sc stop bthserv');
      return { ok: true, previousState: current, newState: { ...current, value: { StartType: 'Manual', Status: 'Stopped' } } };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  revert: async (originalState: TweakState): Promise<TweakResult> => {
    try {
      const val = originalState.value as any;
      if (val.StartType) {
        await execAsync(`sc config bthserv start= ${val.StartType.toLowerCase()}`);
        if (val.Status === 'Running') await execAsync('sc start bthserv');
      }
      return { ok: true };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  verify: async (expectedState: TweakState): Promise<boolean> => {
    const current = await bluetoothManual.detect();
    const cur = current.value as any;
    return cur.StartType === 'Manual';
  },
};

// 9. Windows Update - Manual (NOT Disabled - Safety)
export const windowsUpdateManual: Tweak = {
  id: 'services.wu_manual',
  name: 'Windows Update to Manual (NOT Disabled)',
  category: 'services',
  description: 'Sets wuauserv to Manual. Allows manual update checks. NEVER disable - security critical. Manual lets you control timing.',
  whenHelps: 'Prevents forced restarts during gaming. You control when to check/install. Security updates still possible.',
  risk: 'moderate',
  evidence: 'measured',
  impacto: 'medio',
      requiresReboot: false,
  compatibility: {
    windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
    formFactors: ['desktop', 'laptop'],
  },
  detect: async (): Promise<TweakState> => {
    const { stdout } = await execAsync('powershell -NoProfile -Command "Get-Service wuauserv | Select-Object StartType, Status | ConvertTo-Json"');
    const info = stdout.trim() ? JSON.parse(stdout) : { StartType: 'Unknown', Status: 'Unknown' };
    return { path: 'SERVICE', name: 'wuauserv', type: 'REG_SZ', value: info, existed: true };
  },
  apply: async (options?: ApplyOptions): Promise<TweakResult> => {
    if (options?.dryRun) return { ok: true, data: 'Would set Windows Update to Manual (NOT Disabled)' };
    try {
      const current = await windowsUpdateManual.detect();
      await execAsync('sc config wuauserv start= demand');
      await execAsync('sc stop wuauserv');
      return { ok: true, previousState: current, newState: { ...current, value: { StartType: 'Manual', Status: 'Stopped' } } };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  revert: async (originalState: TweakState): Promise<TweakResult> => {
    try {
      const val = originalState.value as any;
      if (val.StartType) {
        await execAsync(`sc config wuauserv start= ${val.StartType.toLowerCase()}`);
        if (val.Status === 'Running') await execAsync('sc start wuauserv');
      }
      return { ok: true };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  verify: async (expectedState: TweakState): Promise<boolean> => {
    const current = await windowsUpdateManual.detect();
    const cur = current.value as any;
    return cur.StartType === 'Manual';
  },
};

// 10. Service List Report (Read-only)
export const serviceListReport: Tweak = {
  id: 'services.list_report',
  name: 'Service Configuration Report',
  category: 'services',
  description: 'Lists all services with startup type, status, and description. Read-only diagnostic.',
  whenHelps: 'Audit current service state. Identify unnecessary running services.',
  risk: 'safe',
  evidence: 'measured',
  impacto: 'bajo',
      requiresReboot: false,
  compatibility: {
    windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
    formFactors: ['desktop', 'laptop'],
  },
  detect: async (): Promise<TweakState> => {
    const { stdout } = await execAsync('powershell -NoProfile -Command "Get-Service | Select-Object Name, DisplayName, StartType, Status | ConvertTo-Json"');
    const services = stdout.trim() ? JSON.parse(stdout) : [];
    return { path: 'SERVICE', name: 'AllServices', type: 'REG_SZ', value: services, existed: true };
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

export const servicesTweaks: Tweak[] = [
  sysMainManual,
  windowsSearchManual,
  printSpoolerManual,
  faxServiceDisabled,
  remoteRegistryDisabled,
  mapsManagerDisabled,
  xboxServicesManual,
  bluetoothManual,
  windowsUpdateManual,
  serviceListReport,
];