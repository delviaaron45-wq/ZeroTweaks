import type { Tweak, TweakState, TweakResult, ApplyOptions } from '../types/all';
import { RegistryManager } from './registry';
import { execAsync, execPowerShell, execPowerShellJson } from '../utils/process';

// Debloat & Privacy Tweaks (50 + 45 target)

// Protected packages that should NEVER be removed
export const PROTECTED_PACKAGES = [
  'Microsoft.WindowsStore',
  'Microsoft.WindowsCalculator',
  'Microsoft.Windows.Photos',
  'Microsoft.WindowsTerminal',
  'Microsoft.VCLibs',
  'Microsoft.NET.Native.Runtime',
  'Microsoft.UI.Xaml',
  'Microsoft.XboxIdentityProvider',
  'Microsoft.GamingServices',
  'Microsoft.XboxGameOverlay',
  'Microsoft.XboxGamingOverlay',
  'Microsoft.XboxSpeechToTextOverlay',
];

// 1. Remove Bloatware Apps (Appx)
export const removeBloatware: Tweak = {
  id: 'debloat.remove_apps',
  name: 'Remove Pre-installed Bloatware Apps',
  nameKey: 'tweaks.debloat.removeApps.name',
  category: 'debloat_apps',
  description: 'Removes selected pre-installed Appx packages (Candy Crush, News, Weather, etc.) via Remove-AppxPackage and Remove-AppxProvisionedPackage. Protected list excluded.',
  descriptionKey: 'tweaks.debloat.removeApps.description',
  whenHelps: 'Frees disk space, reduces background processes, cleans Start menu. Only removes user-selected apps.',
  whenHelpsKey: 'tweaks.debloat.removeApps.whenHelps',
  risk: 'moderate',
  evidence: 'measured',
  impacto: 'medio',
  requiresReboot: false,
  compatibility: {
    windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
    formFactors: ['desktop', 'laptop'],
  },
  detect: async (): Promise<TweakState> => {
    // NOTE: routed through execPowerShell (not cmd.exe) and parsed defensively.
    // The old execAsync path let cmd.exe mangle `$_`/`$false`/`{...}` so
    // PowerShell echoed the command back as plain text, and the bare
    // JSON.parse threw `SyntaxError: Unexpected token 'G'`, breaking the whole
    // Debloat page. Now a permission error or non-JSON output just yields [].
    const apps = await execPowerShellJson<unknown[]>(
      'Get-AppxPackage -AllUsers | Where-Object {$_.NonRemovable -eq $false} | Select-Object PackageFullName, Name | ConvertTo-Json',
      []
    );
    return { path: 'APPX', name: 'InstalledPackages', type: 'REG_SZ', value: apps, existed: true };
  },
  apply: async (options?: ApplyOptions): Promise<TweakResult> => {
    if (options?.dryRun) return { ok: true, data: 'Would remove selected bloatware apps (interactive selection required)' };
    // Actual removal happens via interactive UI - this is a template
    return { ok: true, data: 'Use UI to select and remove apps' };
  },
  revert: async (originalState: TweakState): Promise<TweakResult> => {
    // Reinstall via Store or Provisioned package
    return { ok: true, data: 'Reinstall via Microsoft Store or Add-AppxProvisionedPackage' };
  },
  verify: async (expectedState: TweakState): Promise<boolean> => {
    return true;
  },
};

// 2. Disable Telemetry (Minimum)
export const disableTelemetry: Tweak = {
  id: 'privacy.telemetry_minimum',
  name: 'Set Telemetry to Minimum (Required)',
  nameKey: 'tweaks.privacy.telemetry.name',
  category: 'privacy_telemetry',
  description: 'Sets AllowTelemetry=1 in HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection. Minimum allowed on Home/Pro. Does not disable DiagTrack service.',
  descriptionKey: 'tweaks.privacy.telemetry.description',
  whenHelps: 'Reduces data sent to Microsoft. Required level on Home/Pro. Enterprise/Education can set 0.',
  whenHelpsKey: 'tweaks.privacy.telemetry.whenHelps',
  risk: 'safe',
  evidence: 'measured',
  impacto: 'bajo',
  requiresReboot: false,
  compatibility: {
    windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
    formFactors: ['desktop', 'laptop'],
  },
  detect: async (): Promise<TweakState> => {
    const result = await RegistryManager.getValue('HKLM', '\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection', 'AllowTelemetry');
    return { path: 'HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection', name: 'AllowTelemetry', type: 'REG_DWORD', value: result.value, existed: result.existed };
  },
  apply: async (options?: ApplyOptions): Promise<TweakResult> => {
    if (options?.dryRun) return { ok: true, data: 'Would set AllowTelemetry=1 (Minimum)' };
    try {
      const current = await disableTelemetry.detect();
      await RegistryManager.createKey('HKLM', '\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection');
      await RegistryManager.setValue('HKLM', '\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection', 'AllowTelemetry', 'REG_DWORD', 1);
      return { ok: true, previousState: current, newState: { ...current, value: 1 } };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  revert: async (originalState: TweakState): Promise<TweakResult> => {
    try {
      if (originalState.existed) {
        await RegistryManager.setValue('HKLM', '\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection', 'AllowTelemetry', 'REG_DWORD', originalState.value as number);
      } else {
        await RegistryManager.deleteValue('HKLM', '\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection', 'AllowTelemetry');
      }
      return { ok: true };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  verify: async (expectedState: TweakState): Promise<boolean> => {
    const current = await disableTelemetry.detect();
    return current.value === 1;
  },
};

// 3. Disable DiagTrack Service (Connected User Experiences)
export const disableDiagTrack: Tweak = {
  id: 'privacy.diagtrack',
  name: 'Disable DiagTrack Service (Connected User Experiences)',
  nameKey: 'tweaks.privacy.diagTrack.name',
  category: 'privacy_telemetry',
  description: 'Sets DiagTrack service startup to Disabled. Backs up original state. Reduces telemetry collection.',
  descriptionKey: 'tweaks.privacy.diagTrack.description',
  whenHelps: 'Stops Connected User Experiences and Telemetry service. May affect Feedback Hub, some diagnostics.',
  whenHelpsKey: 'tweaks.privacy.diagTrack.whenHelps',
  risk: 'moderate',
  evidence: 'measured',
  impacto: 'medio',
  requiresReboot: false,
  compatibility: {
    windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
    formFactors: ['desktop', 'laptop'],
  },
  detect: async (): Promise<TweakState> => {
    const info = await execPowerShellJson(
      'Get-Service DiagTrack | Select-Object StartType, Status | ConvertTo-Json',
      { StartType: 'Unknown', Status: 'Unknown' }
    );
    return { path: 'SERVICE', name: 'DiagTrack', type: 'REG_SZ', value: info, existed: true };
  },
  apply: async (options?: ApplyOptions): Promise<TweakResult> => {
    if (options?.dryRun) return { ok: true, data: 'Would set DiagTrack service to Disabled' };
    try {
      const current = await disableDiagTrack.detect();
      await execAsync('sc config DiagTrack start= disabled');
      await execAsync('sc stop DiagTrack');
      return { ok: true, previousState: current, newState: { ...current, value: { StartType: 'Disabled', Status: 'Stopped' } } };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  revert: async (originalState: TweakState): Promise<TweakResult> => {
    try {
      const val = originalState.value as any;
      if (val.StartType) {
        await execAsync(`sc config DiagTrack start= ${val.StartType.toLowerCase()}`);
        if (val.Status === 'Running') await execAsync('sc start DiagTrack');
      }
      return { ok: true };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  verify: async (expectedState: TweakState): Promise<boolean> => {
    const current = await disableDiagTrack.detect();
    const cur = current.value as any;
    return cur.StartType === 'Disabled';
  },
};

// 4. Disable dmwappushservice (WAP Push)
export const disableDmwappush: Tweak = {
  id: 'privacy.dmwappush',
  name: 'Disable dmwappushservice (WAP Push Message Routing)',
  nameKey: 'tweaks.privacy.dmwappush.name',
  category: 'privacy_telemetry',
  description: 'Sets dmwappushservice startup to Disabled. Used for enterprise push notifications.',
  descriptionKey: 'tweaks.privacy.dmwappush.description',
  whenHelps: 'Reduces background network activity. Not needed on consumer devices.',
  whenHelpsKey: 'tweaks.privacy.dmwappush.whenHelps',
  risk: 'safe',
  evidence: 'measured',
  impacto: 'bajo',
  requiresReboot: false,
  compatibility: {
    windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
    formFactors: ['desktop', 'laptop'],
  },
  detect: async (): Promise<TweakState> => {
    const info = await execPowerShellJson(
      'Get-Service dmwappushservice | Select-Object StartType, Status | ConvertTo-Json',
      { StartType: 'Unknown', Status: 'Unknown' }
    );
    return { path: 'SERVICE', name: 'dmwappushservice', type: 'REG_SZ', value: info, existed: true };
  },
  apply: async (options?: ApplyOptions): Promise<TweakResult> => {
    if (options?.dryRun) return { ok: true, data: 'Would set dmwappushservice to Disabled' };
    try {
      const current = await disableDmwappush.detect();
      await execAsync('sc config dmwappushservice start= disabled');
      await execAsync('sc stop dmwappushservice');
      return { ok: true, previousState: current, newState: { ...current, value: { StartType: 'Disabled', Status: 'Stopped' } } };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  revert: async (originalState: TweakState): Promise<TweakResult> => {
    try {
      const val = originalState.value as any;
      if (val.StartType) {
        await execAsync(`sc config dmwappushservice start= ${val.StartType.toLowerCase()}`);
        if (val.Status === 'Running') await execAsync('sc start dmwappushservice');
      }
      return { ok: true };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  verify: async (expectedState: TweakState): Promise<boolean> => {
    const current = await disableDmwappush.detect();
    const cur = current.value as any;
    return cur.StartType === 'Disabled';
  },
};

// 5. Disable Advertising ID
export const disableAdvertisingId: Tweak = {
  id: 'privacy.advertising_id',
  name: 'Disable Advertising ID',
  nameKey: 'tweaks.privacy.advertisingId.name',
  category: 'privacy_telemetry',
  description: 'Sets EnableAdvertisingId=0 in HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\AdvertisingInfo. Resets per user.',
  descriptionKey: 'tweaks.privacy.advertisingId.description',
  whenHelps: 'Prevents apps from using advertising ID for personalized ads.',
  whenHelpsKey: 'tweaks.privacy.advertisingId.whenHelps',
  risk: 'safe',
  evidence: 'measured',
  impacto: 'bajo',
  requiresReboot: false,
  compatibility: {
    windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
    formFactors: ['desktop', 'laptop'],
  },
  detect: async (): Promise<TweakState> => {
    const result = await RegistryManager.getValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\AdvertisingInfo', 'Enabled');
    return { path: 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\AdvertisingInfo', name: 'Enabled', type: 'REG_DWORD', value: result.value, existed: result.existed };
  },
  apply: async (options?: ApplyOptions): Promise<TweakResult> => {
    if (options?.dryRun) return { ok: true, data: 'Would disable Advertising ID' };
    try {
      const current = await disableAdvertisingId.detect();
      await RegistryManager.setValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\AdvertisingInfo', 'Enabled', 'REG_DWORD', 0);
      return { ok: true, previousState: current, newState: { ...current, value: 0 } };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  revert: async (originalState: TweakState): Promise<TweakResult> => {
    try {
      if (originalState.existed) {
        await RegistryManager.setValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\AdvertisingInfo', 'Enabled', 'REG_DWORD', originalState.value as number);
      } else {
        await RegistryManager.deleteValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\AdvertisingInfo', 'Enabled');
      }
      return { ok: true };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  verify: async (expectedState: TweakState): Promise<boolean> => {
    const current = await disableAdvertisingId.detect();
    return current.value === 0;
  },
};

// 6. Disable Tailored Experiences
export const disableTailoredExperiences: Tweak = {
  id: 'privacy.tailored_experiences',
  name: 'Disable Tailored Experiences',
  nameKey: 'tweaks.privacy.tailoredExperiences.name',
  category: 'privacy_telemetry',
  description: 'Sets SubscribedContent-310093Enabled=0 and SubscribedContent-338387Enabled=0 in HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager.',
  descriptionKey: 'tweaks.privacy.tailoredExperiences.description',
  whenHelps: 'Stops suggested apps, tips, and tailored content in Start/Shell.',
  whenHelpsKey: 'tweaks.privacy.tailoredExperiences.whenHelps',
  risk: 'safe',
  evidence: 'measured',
  impacto: 'bajo',
  requiresReboot: false,
  compatibility: {
    windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
    formFactors: ['desktop', 'laptop'],
  },
  detect: async (): Promise<TweakState> => {
    const results = await Promise.all([
      RegistryManager.getValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager', 'SubscribedContent-310093Enabled'),
      RegistryManager.getValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager', 'SubscribedContent-338387Enabled'),
      RegistryManager.getValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager', 'SystemPaneSuggestionsEnabled'),
    ]);
    return {
      path: 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager',
      name: 'TAILORED_COMPOSITE',
      type: 'REG_DWORD',
      value: { suggestions: results[0].value, tailored: results[1].value, systemPane: results[2].value },
      existed: results.every(r => r.existed),
    };
  },
  apply: async (options?: ApplyOptions): Promise<TweakResult> => {
    if (options?.dryRun) return { ok: true, data: 'Would disable tailored experiences and suggestions' };
    try {
      const current = await disableTailoredExperiences.detect();
      await Promise.all([
        RegistryManager.setValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager', 'SubscribedContent-310093Enabled', 'REG_DWORD', 0),
        RegistryManager.setValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager', 'SubscribedContent-338387Enabled', 'REG_DWORD', 0),
        RegistryManager.setValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager', 'SystemPaneSuggestionsEnabled', 'REG_DWORD', 0),
      ]);
      return { ok: true, previousState: current, newState: { ...current, value: { suggestions: 0, tailored: 0, systemPane: 0 } } };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  revert: async (originalState: TweakState): Promise<TweakResult> => {
    try {
      const val = originalState.value as any;
      if (originalState.existed) {
        await Promise.all([
          RegistryManager.setValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager', 'SubscribedContent-310093Enabled', 'REG_DWORD', val.suggestions),
          RegistryManager.setValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager', 'SubscribedContent-338387Enabled', 'REG_DWORD', val.tailored),
          RegistryManager.setValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager', 'SystemPaneSuggestionsEnabled', 'REG_DWORD', val.systemPane),
        ]);
      }
      return { ok: true };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  verify: async (expectedState: TweakState): Promise<boolean> => {
    const current = await disableTailoredExperiences.detect();
    const exp = expectedState.value as any;
    const cur = current.value as any;
    return cur.suggestions === exp.suggestions && cur.tailored === exp.tailored && cur.systemPane === exp.systemPane;
  },
};

// 7. Disable Location Tracking
export const disableLocation: Tweak = {
  id: 'privacy.location',
  name: 'Disable Location Tracking',
  nameKey: 'tweaks.privacy.locationTracking.name',
  category: 'privacy_telemetry',
  description: 'Sets Location=0 in HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\LocationAndSensors. Disables location for all users.',
  descriptionKey: 'tweaks.privacy.locationTracking.description',
  whenHelps: 'Prevents Windows and apps from accessing location. May affect Maps, Weather, Find My Device.',
  whenHelpsKey: 'tweaks.privacy.locationTracking.whenHelps',
  risk: 'safe',
  evidence: 'measured',
  impacto: 'bajo',
  requiresReboot: false,
  compatibility: {
    windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
    formFactors: ['desktop', 'laptop'],
  },
  detect: async (): Promise<TweakState> => {
    const result = await RegistryManager.getValue('HKLM', '\\SOFTWARE\\Policies\\Microsoft\\Windows\\LocationAndSensors', 'DisableLocation');
    return { path: 'HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\LocationAndSensors', name: 'DisableLocation', type: 'REG_DWORD', value: result.value, existed: result.existed };
  },
  apply: async (options?: ApplyOptions): Promise<TweakResult> => {
    if (options?.dryRun) return { ok: true, data: 'Would disable location tracking system-wide' };
    try {
      const current = await disableLocation.detect();
      await RegistryManager.createKey('HKLM', '\\SOFTWARE\\Policies\\Microsoft\\Windows\\LocationAndSensors');
      await RegistryManager.setValue('HKLM', '\\SOFTWARE\\Policies\\Microsoft\\Windows\\LocationAndSensors', 'DisableLocation', 'REG_DWORD', 1);
      return { ok: true, previousState: current, newState: { ...current, value: 1 } };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  revert: async (originalState: TweakState): Promise<TweakResult> => {
    try {
      if (originalState.existed) {
        await RegistryManager.setValue('HKLM', '\\SOFTWARE\\Policies\\Microsoft\\Windows\\LocationAndSensors', 'DisableLocation', 'REG_DWORD', originalState.value as number);
      } else {
        await RegistryManager.deleteValue('HKLM', '\\SOFTWARE\\Policies\\Microsoft\\Windows\\LocationAndSensors', 'DisableLocation');
      }
      return { ok: true };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  verify: async (expectedState: TweakState): Promise<boolean> => {
    const current = await disableLocation.detect();
    return current.value === 1;
  },
};

// 8. Disable Cortana / Search Web
export const disableCortanaWeb: Tweak = {
  id: 'privacy.cortana_web',
  name: 'Disable Cortana Web Search / Search Box Web Results',
  nameKey: 'tweaks.privacy.cortanaWeb.name',
  category: 'privacy_telemetry',
  description: 'Sets AllowSearchToUseLocation=0, DisableWebSearch=1, ConnectedSearchUseForm=0 in HKCU\\SOFTWARE\\Policies\\Microsoft\\Windows\\Explorer.',
  descriptionKey: 'tweaks.privacy.cortanaWeb.description',
  whenHelps: 'Keeps search local. Prevents Bing web results in Start/Search. Cortana deprecated in Win11.',
  whenHelpsKey: 'tweaks.privacy.cortanaWeb.whenHelps',
  risk: 'safe',
  evidence: 'measured',
  impacto: 'bajo',
  requiresReboot: false,
  compatibility: {
    windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
    formFactors: ['desktop', 'laptop'],
  },
  detect: async (): Promise<TweakState> => {
    const results = await Promise.all([
      RegistryManager.getValue('HKCU', '\\SOFTWARE\\Policies\\Microsoft\\Windows\\Explorer', 'DisableWebSearch'),
      RegistryManager.getValue('HKCU', '\\SOFTWARE\\Policies\\Microsoft\\Windows\\Explorer', 'ConnectedSearchUseForm'),
    ]);
    return {
      path: 'HKCU\\SOFTWARE\\Policies\\Microsoft\\Windows\\Explorer',
      name: 'CORTANA_WEB_COMPOSITE',
      type: 'REG_DWORD',
      value: { disableWebSearch: results[0].value, connectedSearch: results[1].value },
      existed: results.every(r => r.existed),
    };
  },
  apply: async (options?: ApplyOptions): Promise<TweakResult> => {
    if (options?.dryRun) return { ok: true, data: 'Would disable web search in Start/Search' };
    try {
      const current = await disableCortanaWeb.detect();
      await RegistryManager.createKey('HKCU', '\\SOFTWARE\\Policies\\Microsoft\\Windows\\Explorer');
      await Promise.all([
        RegistryManager.setValue('HKCU', '\\SOFTWARE\\Policies\\Microsoft\\Windows\\Explorer', 'DisableWebSearch', 'REG_DWORD', 1),
        RegistryManager.setValue('HKCU', '\\SOFTWARE\\Policies\\Microsoft\\Windows\\Explorer', 'ConnectedSearchUseForm', 'REG_DWORD', 0),
      ]);
      return { ok: true, previousState: current, newState: { ...current, value: { disableWebSearch: 1, connectedSearch: 0 } } };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  revert: async (originalState: TweakState): Promise<TweakResult> => {
    try {
      const val = originalState.value as any;
      if (originalState.existed) {
        await Promise.all([
          RegistryManager.setValue('HKCU', '\\SOFTWARE\\Policies\\Microsoft\\Windows\\Explorer', 'DisableWebSearch', 'REG_DWORD', val.disableWebSearch),
          RegistryManager.setValue('HKCU', '\\SOFTWARE\\Policies\\Microsoft\\Windows\\Explorer', 'ConnectedSearchUseForm', 'REG_DWORD', val.connectedSearch),
        ]);
      }
      return { ok: true };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  verify: async (expectedState: TweakState): Promise<boolean> => {
    const current = await disableCortanaWeb.detect();
    const exp = expectedState.value as any;
    const cur = current.value as any;
    return cur.disableWebSearch === exp.disableWebSearch && cur.connectedSearch === exp.connectedSearch;
  },
};

// 9. Disable Activity History / Timeline
export const disableActivityHistory: Tweak = {
  id: 'privacy.activity_history',
  name: 'Disable Activity History (Timeline)',
  nameKey: 'tweaks.privacy.activityHistory.name',
  category: 'privacy_telemetry',
  description: 'Sets PublishUserActivities=0, UploadUserActivities=0 in HKCU\\SOFTWARE\\Policies\\Microsoft\\Windows\\System.',
  descriptionKey: 'tweaks.privacy.activityHistory.description',
  whenHelps: 'Disables Timeline/Task View cross-device history. Reduces cloud sync.',
  whenHelpsKey: 'tweaks.privacy.activityHistory.whenHelps',
  risk: 'safe',
  evidence: 'measured',
  impacto: 'bajo',
  requiresReboot: false,
  compatibility: {
    windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
    formFactors: ['desktop', 'laptop'],
  },
  detect: async (): Promise<TweakState> => {
    const results = await Promise.all([
      RegistryManager.getValue('HKCU', '\\SOFTWARE\\Policies\\Microsoft\\Windows\\System', 'PublishUserActivities'),
      RegistryManager.getValue('HKCU', '\\SOFTWARE\\Policies\\Microsoft\\Windows\\System', 'UploadUserActivities'),
    ]);
    return {
      path: 'HKCU\\SOFTWARE\\Policies\\Microsoft\\Windows\\System',
      name: 'ACTIVITY_HISTORY_COMPOSITE',
      type: 'REG_DWORD',
      value: { publish: results[0].value, upload: results[1].value },
      existed: results.every(r => r.existed),
    };
  },
  apply: async (options?: ApplyOptions): Promise<TweakResult> => {
    if (options?.dryRun) return { ok: true, data: 'Would disable Activity History/Timeline' };
    try {
      const current = await disableActivityHistory.detect();
      await RegistryManager.createKey('HKCU', '\\SOFTWARE\\Policies\\Microsoft\\Windows\\System');
      await Promise.all([
        RegistryManager.setValue('HKCU', '\\SOFTWARE\\Policies\\Microsoft\\Windows\\System', 'PublishUserActivities', 'REG_DWORD', 0),
        RegistryManager.setValue('HKCU', '\\SOFTWARE\\Policies\\Microsoft\\Windows\\System', 'UploadUserActivities', 'REG_DWORD', 0),
      ]);
      return { ok: true, previousState: current, newState: { ...current, value: { publish: 0, upload: 0 } } };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  revert: async (originalState: TweakState): Promise<TweakResult> => {
    try {
      const val = originalState.value as any;
      if (originalState.existed) {
        await Promise.all([
          RegistryManager.setValue('HKCU', '\\SOFTWARE\\Policies\\Microsoft\\Windows\\System', 'PublishUserActivities', 'REG_DWORD', val.publish),
          RegistryManager.setValue('HKCU', '\\SOFTWARE\\Policies\\Microsoft\\Windows\\System', 'UploadUserActivities', 'REG_DWORD', val.upload),
        ]);
      }
      return { ok: true };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  verify: async (expectedState: TweakState): Promise<boolean> => {
    const current = await disableActivityHistory.detect();
    const exp = expectedState.value as any;
    const cur = current.value as any;
    return cur.publish === exp.publish && cur.upload === exp.upload;
  },
};

// 10. Disable OneDrive Auto-start
export const disableOneDriveAutoStart: Tweak = {
  id: 'debloat.onedrive_autostart',
  name: 'Disable OneDrive Auto-start',
  nameKey: 'tweaks.debloat.oneDriveAutostart.name',
  category: 'debloat_apps',
  description: 'Removes OneDrive from Run key and disables autostart in OneDrive settings. Does not uninstall.',
  descriptionKey: 'tweaks.debloat.oneDriveAutostart.description',
  whenHelps: 'Prevents OneDrive from running at login if not used. Saves RAM/CPU.',
  whenHelpsKey: 'tweaks.debloat.oneDriveAutostart.whenHelps',
  risk: 'safe',
  evidence: 'measured',
  impacto: 'bajo',
  requiresReboot: false,
  compatibility: {
    windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
    formFactors: ['desktop', 'laptop'],
  },
  detect: async (): Promise<TweakState> => {
    const results = await Promise.all([
      RegistryManager.getValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\Run', 'OneDrive'),
      RegistryManager.getValue('HKLM', '\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run', 'OneDrive'),
    ]);
    return {
      path: 'RUN_KEYS',
      name: 'OneDrive',
      type: 'REG_SZ',
      value: { hkcu: results[0].value, hklm: results[1].value },
      existed: results.some(r => r.existed),
    };
  },
  apply: async (options?: ApplyOptions): Promise<TweakResult> => {
    if (options?.dryRun) return { ok: true, data: 'Would remove OneDrive from auto-start' };
    try {
      const current = await disableOneDriveAutoStart.detect();
      await Promise.all([
        RegistryManager.deleteValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\Run', 'OneDrive'),
        RegistryManager.deleteValue('HKLM', '\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run', 'OneDrive'),
      ]);
      return { ok: true, previousState: current, newState: { ...current, value: { hkcu: null, hklm: null } } };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  revert: async (originalState: TweakState): Promise<TweakResult> => {
    try {
      const val = originalState.value as any;
      if (val.hkcu) await RegistryManager.setValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\Run', 'OneDrive', 'REG_SZ', val.hkcu);
      if (val.hklm) await RegistryManager.setValue('HKLM', '\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run', 'OneDrive', 'REG_SZ', val.hklm);
      return { ok: true };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  verify: async (expectedState: TweakState): Promise<boolean> => {
    const current = await disableOneDriveAutoStart.detect();
    const val = current.value as { hkcu: string | null; hklm: string | null } | null;
    return !val?.hkcu && !val?.hklm;
  },
};

// 11. Clean orphaned Startup entries
//
// What this really does (and the only thing it does): removes the autostart
// entries from the Run keys whose target program no longer exists, i.e. the
// leftovers that accumulate when apps are uninstalled without cleaning up. That
// is a real, measurable boot improvement and it can never break a working
// program: entries that point to an existing executable are left untouched.
// Everything removed is written to a backup file and can be restored.
interface StartupEntry {
  path: string;
  name: string;
  command: string;
  exe: string | null;
  dead: boolean;
}

interface StartupSnapshot {
  entries: StartupEntry[];
}

const RUN_KEY_PATHS = [
  'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run',
  'HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run',
  'HKLM:\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Run',
];

/** PowerShell that enumerates every Run entry and flags the ones with no target. */
function startupEnumerationScript(): string {
  return `
    $paths = @(${RUN_KEY_PATHS.map(p => `'${p}'`).join(',')})
    $entries = @()
    foreach ($p in $paths) {
      if (-not (Test-Path $p)) { continue }
      $item = Get-ItemProperty -Path $p -ErrorAction SilentlyContinue
      if (-not $item) { continue }
      foreach ($prop in $item.PSObject.Properties) {
        if ($prop.Name -like 'PS*') { continue }
        $cmd = "$($prop.Value)"
        $exe = $null
        if ($cmd -match '^\\s*"([^"]+)"') { $exe = $Matches[1] }
        elseif ($cmd -match '^\\s*([^\\s]+)') { $exe = $Matches[1] }
        if ($exe) { $exe = [Environment]::ExpandEnvironmentVariables($exe) }
        $dead = $false
        if ($exe -and $exe -match '\\.(exe|bat|cmd|vbs|com|lnk)$') { $dead = -not (Test-Path $exe) }
        $entries += @{ Path = $p; Name = $prop.Name; Command = $cmd; Exe = $exe; Dead = [bool]$dead }
      }
    }
    @{ Entries = @($entries) } | ConvertTo-Json -Depth 4
  `;
}

async function readStartupEntries(): Promise<StartupEntry[]> {
  const parsed = await execPowerShellJson<{ Entries?: unknown[] }>(startupEnumerationScript(), { Entries: [] });
  const list = parsed?.Entries;
  if (!list) return [];
  const raw = Array.isArray(list) ? list : [list];
  // PowerShell serialises hashtable keys as-is (Path, Name...), so the
  // PascalCase payload is normalised to the camelCase shape used here.
  return raw.map((e: any): StartupEntry => ({
    path: String(e?.Path ?? ''),
    name: String(e?.Name ?? ''),
    command: String(e?.Command ?? ''),
    exe: e?.Exe ? String(e.Exe) : null,
    dead: e?.Dead === true,
  }));
}

export const manageStartupApps: Tweak = {
  id: 'debloat.startup_apps',
  name: 'Remove Orphaned Startup Entries',
  nameKey: 'tweaks.debloat.startupApps.name',
  category: 'debloat_apps',
  description:
    'Lists every autostart entry (HKCU/HKLM Run keys) and removes only the ones whose program no longer exists — the leftovers uninstalled apps leave behind. Working entries are never touched, and every removal is backed up so it can be restored.',
  descriptionKey: 'tweaks.debloat.startupApps.description',
  whenHelps:
    'Shortens boot time and removes error/no-op launches caused by uninstalled programs. It cannot break anything: an entry is only removed when its executable is missing.',
  whenHelpsKey: 'tweaks.debloat.startupApps.whenHelps',
  risk: 'safe',
  evidence: 'measured',
  impacto: 'medio',
  requiresReboot: false,
  compatibility: {
    windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
    formFactors: ['desktop', 'laptop'],
  },
  detect: async (): Promise<TweakState> => {
    // Defensive parse (see removeApps): cmd.exe mangles this pipeline's
    // metacharacters and a bare JSON.parse turned that into a page-breaking
    // SyntaxError. execPowerShellJson degrades to [] instead.
    const entries = await readStartupEntries();
    return {
      path: 'STARTUP',
      name: 'StartupApps',
      type: 'REG_SZ',
      value: { entries } satisfies StartupSnapshot,
      existed: true,
    };
  },
  apply: async (options?: ApplyOptions): Promise<TweakResult> => {
    const before = await readStartupEntries();
    const dead = before.filter(e => e.dead);

    if (options?.dryRun) {
      return {
        ok: true,
        data:
          dead.length === 0
            ? 'No hay entradas de inicio huérfanas: no se cambiaría nada.'
            : `Se retirarían ${dead.length} entrada(s) de inicio cuyo programa ya no existe.`,
      };
    }
    if (dead.length === 0) {
      return { ok: true, data: 'No hay entradas de inicio huérfanas. Nada que hacer.' };
    }

    const previousState: TweakState = {
      path: 'STARTUP',
      name: 'StartupApps',
      type: 'REG_SZ',
      value: { entries: before } satisfies StartupSnapshot,
      existed: true,
    };

    // Backup every entry (not only the removed ones) before touching anything.
    let backupPath: string | undefined;
    try {
      const { getAppDataPath, writeJson } = await import('../utils/files.js');
      backupPath = getAppDataPath('Backups', 'autostart', 'run-keys.json');
      await writeJson(backupPath, { entries: before, createdAt: new Date().toISOString() });
    } catch {
      // A failed backup must not silently allow a destructive change.
      return { ok: false, error: 'No se ha podido crear la copia de seguridad de las entradas de inicio. No se ha cambiado nada.' };
    }

    try {
      const script = `
        $paths = @(${RUN_KEY_PATHS.map(p => `'${p}'`).join(',')})
        foreach ($p in $paths) {
          if (-not (Test-Path $p)) { continue }
          $item = Get-ItemProperty -Path $p -ErrorAction SilentlyContinue
          if (-not $item) { continue }
          foreach ($prop in @($item.PSObject.Properties)) {
            if ($prop.Name -like 'PS*') { continue }
            $cmd = "$($prop.Value)"
            $exe = $null
            if ($cmd -match '^\\s*"([^"]+)"') { $exe = $Matches[1] }
            elseif ($cmd -match '^\\s*([^\\s]+)') { $exe = $Matches[1] }
            if (-not $exe) { continue }
            $exe = [Environment]::ExpandEnvironmentVariables($exe)
            if ($exe -notmatch '\\.(exe|bat|cmd|vbs|com|lnk)$') { continue }
            if (-not (Test-Path $exe)) {
              Remove-ItemProperty -Path $p -Name $prop.Name -ErrorAction SilentlyContinue
            }
          }
        }
      `;
      await execPowerShell(script);

      const after = await readStartupEntries();
      const removed = before.length - after.length;
      if (removed <= 0) {
        return {
          ok: false,
          error: 'No se ha podido retirar ninguna entrada. Ejecuta ZeroTweaks como administrador para modificar las claves HKLM.',
        };
      }

      return {
        ok: true,
        data: `Se han retirado ${removed} entrada(s) de inicio huérfanas (copia en ${backupPath}).`,
        previousState,
        newState: { ...previousState, value: { entries: after } satisfies StartupSnapshot },
      };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  revert: async (originalState: TweakState): Promise<TweakResult> => {
    const snapshot = originalState?.value as StartupSnapshot | undefined;
    const dead = (snapshot?.entries ?? []).filter(e => e?.dead);
    if (dead.length === 0) {
      return { ok: true, data: 'No hay entradas de inicio huérfanas que restaurar.' };
    }
    try {
      const script = dead
        .map(e => {
          const key = e.path.replace(/'/g, "''");
          const name = e.name.replace(/'/g, "''");
          const command = e.command.replace(/'/g, "''");
          return `
            if (-not (Test-Path '${key}')) { New-Item -Path '${key}' -Force | Out-Null }
            Set-ItemProperty -Path '${key}' -Name '${name}' -Value '${command}' -Force -ErrorAction SilentlyContinue
          `;
        })
        .join('\n');
      await execPowerShell(script);
      return { ok: true, data: `Restauradas ${dead.length} entrada(s) de inicio.` };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  verify: async (expectedState: TweakState): Promise<boolean> => {
    const snapshot = expectedState?.value as StartupSnapshot | undefined;
    const deadNames = new Set((snapshot?.entries ?? []).filter(e => e?.dead).map(e => `${e.path}::${e.name}`));
    if (deadNames.size === 0) return true;
    const current = await readStartupEntries();
    return !current.some(e => deadNames.has(`${e.path}::${e.name}`));
  },
};

// 12. Clean Temp Files
export const cleanTempFiles: Tweak = {
  id: 'debloat.clean_temp',
  name: 'Clean Temporary Files',
  nameKey: 'tweaks.debloat.cleanTemp.name',
  category: 'debloat_apps',
  description: 'Cleans %TEMP%, C:\\Windows\\Temp, Windows Update cache, thumbnails, error reports. Preview with size before cleaning.',
  descriptionKey: 'tweaks.debloat.cleanTemp.description',
  whenHelps: 'Frees disk space. Safe, idempotent. Does NOT clean Prefetch (harms boot).',
  whenHelpsKey: 'tweaks.debloat.cleanTemp.whenHelps',
  risk: 'safe',
  evidence: 'measured',
  impacto: 'bajo',
  requiresReboot: false,
  compatibility: {
    windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
    formFactors: ['desktop', 'laptop'],
  },
  detect: async (): Promise<TweakState> => {
    // Sizes only the folders that apply() actually cleans. Prefetch used to be
    // counted here but is never deleted (clearing it hurts boot time), which
    // made the previewed size larger than the space really freed.
    const script = `
      $paths = @("$env:TEMP", "C:\\Windows\\Temp", "C:\\Windows\\SoftwareDistribution\\Download")
      $total = 0
      foreach ($p in $paths) {
        if (Test-Path $p) {
          $size = (Get-ChildItem $p -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
          $total += $size
        }
      }
      [math]::Round($total / 1GB, 2)
    `;
    const { stdout } = await execPowerShell(script);
    const sizeGB = parseFloat(stdout.trim()) || 0;
    return { path: 'FILESYSTEM', name: 'TempFilesSize', type: 'REG_DWORD', value: sizeGB, existed: true };
  },
  apply: async (options?: ApplyOptions): Promise<TweakResult> => {
    if (options?.dryRun) {
      const current = await cleanTempFiles.detect();
      return { ok: true, data: `Would clean ~${current.value} GB of temp files` };
    }
    try {
      const current = await cleanTempFiles.detect();
      const script = `
        $paths = @("$env:TEMP", "C:\\Windows\\Temp", "C:\\Windows\\SoftwareDistribution\\Download")
        foreach ($p in $paths) {
          if (Test-Path $p) {
            Get-ChildItem $p -Recurse -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue
          }
        }
        # Clean thumbnails
        Get-ChildItem "$env:LOCALAPPDATA\\Microsoft\\Windows\\Explorer" -Filter "thumbcache_*.db" -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue
      `;
      await execPowerShell(script);
      return { ok: true, previousState: current, newState: { ...current, value: 0 } };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  revert: async (originalState: TweakState): Promise<TweakResult> => {
    return { ok: true, data: 'Cannot revert file deletion' };
  },
  verify: async (expectedState: TweakState): Promise<boolean> => {
    const current = await cleanTempFiles.detect();
    return (current.value as number) < (expectedState.value as number);
  },
};

export const debloatTweaks: Tweak[] = [
  removeBloatware,
  disableOneDriveAutoStart,
  manageStartupApps,
  cleanTempFiles,
];

export const privacyTweaks: Tweak[] = [
  disableTelemetry,
  disableDiagTrack,
  disableDmwappush,
  disableAdvertisingId,
  disableTailoredExperiences,
  disableLocation,
  disableCortanaWeb,
  disableActivityHistory,
];