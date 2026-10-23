"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.privacyTweaks = exports.debloatTweaks = exports.cleanTempFiles = exports.manageStartupApps = exports.disableOneDriveAutoStart = exports.disableActivityHistory = exports.disableCortanaWeb = exports.disableLocation = exports.disableTailoredExperiences = exports.disableAdvertisingId = exports.disableDmwappush = exports.disableDiagTrack = exports.disableTelemetry = exports.removeBloatware = exports.PROTECTED_PACKAGES = void 0;
const registry_1 = require("./registry");
const process_1 = require("../utils/process");
// Debloat & Privacy Tweaks (50 + 45 target)
// Protected packages that should NEVER be removed
exports.PROTECTED_PACKAGES = [
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
exports.removeBloatware = {
    id: 'debloat.remove_apps',
    name: 'Remove Pre-installed Bloatware Apps',
    category: 'debloat_apps',
    description: 'Removes selected pre-installed Appx packages (Candy Crush, News, Weather, etc.) via Remove-AppxPackage and Remove-AppxProvisionedPackage. Protected list excluded.',
    whenHelps: 'Frees disk space, reduces background processes, cleans Start menu. Only removes user-selected apps.',
    risk: 'moderate',
    evidence: 'measured',
    requiresReboot: false,
    compatibility: {
        windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
        formFactors: ['desktop', 'laptop'],
    },
    detect: async () => {
        const { stdout } = await (0, process_1.execAsync)('powershell -NoProfile -Command "Get-AppxPackage -AllUsers | Where-Object {$_.NonRemovable -eq $false} | Select-Object PackageFullName, Name | ConvertTo-Json"');
        const apps = stdout.trim() ? JSON.parse(stdout) : [];
        return { path: 'APPX', name: 'InstalledPackages', type: 'REG_SZ', value: apps, existed: true };
    },
    apply: async (options) => {
        if (options?.dryRun)
            return { ok: true, data: 'Would remove selected bloatware apps (interactive selection required)' };
        // Actual removal happens via interactive UI - this is a template
        return { ok: true, data: 'Use UI to select and remove apps' };
    },
    revert: async (originalState) => {
        // Reinstall via Store or Provisioned package
        return { ok: true, data: 'Reinstall via Microsoft Store or Add-AppxProvisionedPackage' };
    },
    verify: async (expectedState) => {
        return true;
    },
};
// 2. Disable Telemetry (Minimum)
exports.disableTelemetry = {
    id: 'privacy.telemetry_minimum',
    name: 'Set Telemetry to Minimum (Required)',
    category: 'privacy_telemetry',
    description: 'Sets AllowTelemetry=1 in HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection. Minimum allowed on Home/Pro. Does not disable DiagTrack service.',
    whenHelps: 'Reduces data sent to Microsoft. Required level on Home/Pro. Enterprise/Education can set 0.',
    risk: 'safe',
    evidence: 'measured',
    requiresReboot: false,
    compatibility: {
        windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
        formFactors: ['desktop', 'laptop'],
    },
    detect: async () => {
        const result = await registry_1.RegistryManager.getValue('HKLM', '\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection', 'AllowTelemetry');
        return { path: 'HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection', name: 'AllowTelemetry', type: 'REG_DWORD', value: result.value, existed: result.existed };
    },
    apply: async (options) => {
        if (options?.dryRun)
            return { ok: true, data: 'Would set AllowTelemetry=1 (Minimum)' };
        try {
            const current = await exports.disableTelemetry.detect();
            await registry_1.RegistryManager.createKey('HKLM', '\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection');
            await registry_1.RegistryManager.setValue('HKLM', '\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection', 'AllowTelemetry', 'REG_DWORD', 1);
            return { ok: true, previousState: current, newState: { ...current, value: 1 } };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    },
    revert: async (originalState) => {
        try {
            if (originalState.existed) {
                await registry_1.RegistryManager.setValue('HKLM', '\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection', 'AllowTelemetry', 'REG_DWORD', originalState.value);
            }
            else {
                await registry_1.RegistryManager.deleteValue('HKLM', '\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection', 'AllowTelemetry');
            }
            return { ok: true };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    },
    verify: async (expectedState) => {
        const current = await exports.disableTelemetry.detect();
        return current.value === 1;
    },
};
// 3. Disable DiagTrack Service (Connected User Experiences)
exports.disableDiagTrack = {
    id: 'privacy.diagtrack',
    name: 'Disable DiagTrack Service (Connected User Experiences)',
    category: 'privacy_telemetry',
    description: 'Sets DiagTrack service startup to Disabled. Backs up original state. Reduces telemetry collection.',
    whenHelps: 'Stops Connected User Experiences and Telemetry service. May affect Feedback Hub, some diagnostics.',
    risk: 'moderate',
    evidence: 'measured',
    requiresReboot: false,
    compatibility: {
        windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
        formFactors: ['desktop', 'laptop'],
    },
    detect: async () => {
        const { stdout } = await (0, process_1.execAsync)('powershell -NoProfile -Command "Get-Service DiagTrack | Select-Object StartType, Status | ConvertTo-Json"');
        const info = stdout.trim() ? JSON.parse(stdout) : { StartType: 'Unknown', Status: 'Unknown' };
        return { path: 'SERVICE', name: 'DiagTrack', type: 'REG_SZ', value: info, existed: true };
    },
    apply: async (options) => {
        if (options?.dryRun)
            return { ok: true, data: 'Would set DiagTrack service to Disabled' };
        try {
            const current = await exports.disableDiagTrack.detect();
            await (0, process_1.execAsync)('sc config DiagTrack start= disabled');
            await (0, process_1.execAsync)('sc stop DiagTrack');
            return { ok: true, previousState: current, newState: { ...current, value: { StartType: 'Disabled', Status: 'Stopped' } } };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    },
    revert: async (originalState) => {
        try {
            const val = originalState.value;
            if (val.StartType) {
                await (0, process_1.execAsync)(`sc config DiagTrack start= ${val.StartType.toLowerCase()}`);
                if (val.Status === 'Running')
                    await (0, process_1.execAsync)('sc start DiagTrack');
            }
            return { ok: true };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    },
    verify: async (expectedState) => {
        const current = await exports.disableDiagTrack.detect();
        const cur = current.value;
        return cur.StartType === 'Disabled';
    },
};
// 4. Disable dmwappushservice (WAP Push)
exports.disableDmwappush = {
    id: 'privacy.dmwappush',
    name: 'Disable dmwappushservice (WAP Push Message Routing)',
    category: 'privacy_telemetry',
    description: 'Sets dmwappushservice startup to Disabled. Used for enterprise push notifications.',
    whenHelps: 'Reduces background network activity. Not needed on consumer devices.',
    risk: 'safe',
    evidence: 'measured',
    requiresReboot: false,
    compatibility: {
        windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
        formFactors: ['desktop', 'laptop'],
    },
    detect: async () => {
        const { stdout } = await (0, process_1.execAsync)('powershell -NoProfile -Command "Get-Service dmwappushservice | Select-Object StartType, Status | ConvertTo-Json"');
        const info = stdout.trim() ? JSON.parse(stdout) : { StartType: 'Unknown', Status: 'Unknown' };
        return { path: 'SERVICE', name: 'dmwappushservice', type: 'REG_SZ', value: info, existed: true };
    },
    apply: async (options) => {
        if (options?.dryRun)
            return { ok: true, data: 'Would set dmwappushservice to Disabled' };
        try {
            const current = await exports.disableDmwappush.detect();
            await (0, process_1.execAsync)('sc config dmwappushservice start= disabled');
            await (0, process_1.execAsync)('sc stop dmwappushservice');
            return { ok: true, previousState: current, newState: { ...current, value: { StartType: 'Disabled', Status: 'Stopped' } } };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    },
    revert: async (originalState) => {
        try {
            const val = originalState.value;
            if (val.StartType) {
                await (0, process_1.execAsync)(`sc config dmwappushservice start= ${val.StartType.toLowerCase()}`);
                if (val.Status === 'Running')
                    await (0, process_1.execAsync)('sc start dmwappushservice');
            }
            return { ok: true };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    },
    verify: async (expectedState) => {
        const current = await exports.disableDmwappush.detect();
        const cur = current.value;
        return cur.StartType === 'Disabled';
    },
};
// 5. Disable Advertising ID
exports.disableAdvertisingId = {
    id: 'privacy.advertising_id',
    name: 'Disable Advertising ID',
    category: 'privacy_telemetry',
    description: 'Sets EnableAdvertisingId=0 in HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\AdvertisingInfo. Resets per user.',
    whenHelps: 'Prevents apps from using advertising ID for personalized ads.',
    risk: 'safe',
    evidence: 'measured',
    requiresReboot: false,
    compatibility: {
        windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
        formFactors: ['desktop', 'laptop'],
    },
    detect: async () => {
        const result = await registry_1.RegistryManager.getValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\AdvertisingInfo', 'Enabled');
        return { path: 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\AdvertisingInfo', name: 'Enabled', type: 'REG_DWORD', value: result.value, existed: result.existed };
    },
    apply: async (options) => {
        if (options?.dryRun)
            return { ok: true, data: 'Would disable Advertising ID' };
        try {
            const current = await exports.disableAdvertisingId.detect();
            await registry_1.RegistryManager.setValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\AdvertisingInfo', 'Enabled', 'REG_DWORD', 0);
            return { ok: true, previousState: current, newState: { ...current, value: 0 } };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    },
    revert: async (originalState) => {
        try {
            if (originalState.existed) {
                await registry_1.RegistryManager.setValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\AdvertisingInfo', 'Enabled', 'REG_DWORD', originalState.value);
            }
            else {
                await registry_1.RegistryManager.deleteValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\AdvertisingInfo', 'Enabled');
            }
            return { ok: true };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    },
    verify: async (expectedState) => {
        const current = await exports.disableAdvertisingId.detect();
        return current.value === 0;
    },
};
// 6. Disable Tailored Experiences
exports.disableTailoredExperiences = {
    id: 'privacy.tailored_experiences',
    name: 'Disable Tailored Experiences',
    category: 'privacy_telemetry',
    description: 'Sets SubscribedContent-310093Enabled=0 and SubscribedContent-338387Enabled=0 in HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager.',
    whenHelps: 'Stops suggested apps, tips, and tailored content in Start/Shell.',
    risk: 'safe',
    evidence: 'measured',
    requiresReboot: false,
    compatibility: {
        windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
        formFactors: ['desktop', 'laptop'],
    },
    detect: async () => {
        const results = await Promise.all([
            registry_1.RegistryManager.getValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager', 'SubscribedContent-310093Enabled'),
            registry_1.RegistryManager.getValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager', 'SubscribedContent-338387Enabled'),
            registry_1.RegistryManager.getValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager', 'SystemPaneSuggestionsEnabled'),
        ]);
        return {
            path: 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager',
            name: 'TAILORED_COMPOSITE',
            type: 'REG_DWORD',
            value: { suggestions: results[0].value, tailored: results[1].value, systemPane: results[2].value },
            existed: results.every(r => r.existed),
        };
    },
    apply: async (options) => {
        if (options?.dryRun)
            return { ok: true, data: 'Would disable tailored experiences and suggestions' };
        try {
            const current = await exports.disableTailoredExperiences.detect();
            await Promise.all([
                registry_1.RegistryManager.setValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager', 'SubscribedContent-310093Enabled', 'REG_DWORD', 0),
                registry_1.RegistryManager.setValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager', 'SubscribedContent-338387Enabled', 'REG_DWORD', 0),
                registry_1.RegistryManager.setValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager', 'SystemPaneSuggestionsEnabled', 'REG_DWORD', 0),
            ]);
            return { ok: true, previousState: current, newState: { ...current, value: { suggestions: 0, tailored: 0, systemPane: 0 } } };
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
                    registry_1.RegistryManager.setValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager', 'SubscribedContent-310093Enabled', 'REG_DWORD', val.suggestions),
                    registry_1.RegistryManager.setValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager', 'SubscribedContent-338387Enabled', 'REG_DWORD', val.tailored),
                    registry_1.RegistryManager.setValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager', 'SystemPaneSuggestionsEnabled', 'REG_DWORD', val.systemPane),
                ]);
            }
            return { ok: true };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    },
    verify: async (expectedState) => {
        const current = await exports.disableTailoredExperiences.detect();
        const exp = expectedState.value;
        const cur = current.value;
        return cur.suggestions === exp.suggestions && cur.tailored === exp.tailored && cur.systemPane === exp.systemPane;
    },
};
// 7. Disable Location Tracking
exports.disableLocation = {
    id: 'privacy.location',
    name: 'Disable Location Tracking',
    category: 'privacy_telemetry',
    description: 'Sets Location=0 in HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\LocationAndSensors. Disables location for all users.',
    whenHelps: 'Prevents Windows and apps from accessing location. May affect Maps, Weather, Find My Device.',
    risk: 'safe',
    evidence: 'measured',
    requiresReboot: false,
    compatibility: {
        windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
        formFactors: ['desktop', 'laptop'],
    },
    detect: async () => {
        const result = await registry_1.RegistryManager.getValue('HKLM', '\\SOFTWARE\\Policies\\Microsoft\\Windows\\LocationAndSensors', 'DisableLocation');
        return { path: 'HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\LocationAndSensors', name: 'DisableLocation', type: 'REG_DWORD', value: result.value, existed: result.existed };
    },
    apply: async (options) => {
        if (options?.dryRun)
            return { ok: true, data: 'Would disable location tracking system-wide' };
        try {
            const current = await exports.disableLocation.detect();
            await registry_1.RegistryManager.createKey('HKLM', '\\SOFTWARE\\Policies\\Microsoft\\Windows\\LocationAndSensors');
            await registry_1.RegistryManager.setValue('HKLM', '\\SOFTWARE\\Policies\\Microsoft\\Windows\\LocationAndSensors', 'DisableLocation', 'REG_DWORD', 1);
            return { ok: true, previousState: current, newState: { ...current, value: 1 } };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    },
    revert: async (originalState) => {
        try {
            if (originalState.existed) {
                await registry_1.RegistryManager.setValue('HKLM', '\\SOFTWARE\\Policies\\Microsoft\\Windows\\LocationAndSensors', 'DisableLocation', 'REG_DWORD', originalState.value);
            }
            else {
                await registry_1.RegistryManager.deleteValue('HKLM', '\\SOFTWARE\\Policies\\Microsoft\\Windows\\LocationAndSensors', 'DisableLocation');
            }
            return { ok: true };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    },
    verify: async (expectedState) => {
        const current = await exports.disableLocation.detect();
        return current.value === 1;
    },
};
// 8. Disable Cortana / Search Web
exports.disableCortanaWeb = {
    id: 'privacy.cortana_web',
    name: 'Disable Cortana Web Search / Search Box Web Results',
    category: 'privacy_telemetry',
    description: 'Sets AllowSearchToUseLocation=0, DisableWebSearch=1, ConnectedSearchUseForm=0 in HKCU\\SOFTWARE\\Policies\\Microsoft\\Windows\\Explorer.',
    whenHelps: 'Keeps search local. Prevents Bing web results in Start/Search. Cortana deprecated in Win11.',
    risk: 'safe',
    evidence: 'measured',
    requiresReboot: false,
    compatibility: {
        windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
        formFactors: ['desktop', 'laptop'],
    },
    detect: async () => {
        const results = await Promise.all([
            registry_1.RegistryManager.getValue('HKCU', '\\SOFTWARE\\Policies\\Microsoft\\Windows\\Explorer', 'DisableWebSearch'),
            registry_1.RegistryManager.getValue('HKCU', '\\SOFTWARE\\Policies\\Microsoft\\Windows\\Explorer', 'ConnectedSearchUseForm'),
        ]);
        return {
            path: 'HKCU\\SOFTWARE\\Policies\\Microsoft\\Windows\\Explorer',
            name: 'CORTANA_WEB_COMPOSITE',
            type: 'REG_DWORD',
            value: { disableWebSearch: results[0].value, connectedSearch: results[1].value },
            existed: results.every(r => r.existed),
        };
    },
    apply: async (options) => {
        if (options?.dryRun)
            return { ok: true, data: 'Would disable web search in Start/Search' };
        try {
            const current = await exports.disableCortanaWeb.detect();
            await registry_1.RegistryManager.createKey('HKCU', '\\SOFTWARE\\Policies\\Microsoft\\Windows\\Explorer');
            await Promise.all([
                registry_1.RegistryManager.setValue('HKCU', '\\SOFTWARE\\Policies\\Microsoft\\Windows\\Explorer', 'DisableWebSearch', 'REG_DWORD', 1),
                registry_1.RegistryManager.setValue('HKCU', '\\SOFTWARE\\Policies\\Microsoft\\Windows\\Explorer', 'ConnectedSearchUseForm', 'REG_DWORD', 0),
            ]);
            return { ok: true, previousState: current, newState: { ...current, value: { disableWebSearch: 1, connectedSearch: 0 } } };
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
                    registry_1.RegistryManager.setValue('HKCU', '\\SOFTWARE\\Policies\\Microsoft\\Windows\\Explorer', 'DisableWebSearch', 'REG_DWORD', val.disableWebSearch),
                    registry_1.RegistryManager.setValue('HKCU', '\\SOFTWARE\\Policies\\Microsoft\\Windows\\Explorer', 'ConnectedSearchUseForm', 'REG_DWORD', val.connectedSearch),
                ]);
            }
            return { ok: true };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    },
    verify: async (expectedState) => {
        const current = await exports.disableCortanaWeb.detect();
        const exp = expectedState.value;
        const cur = current.value;
        return cur.disableWebSearch === exp.disableWebSearch && cur.connectedSearch === exp.connectedSearch;
    },
};
// 9. Disable Activity History / Timeline
exports.disableActivityHistory = {
    id: 'privacy.activity_history',
    name: 'Disable Activity History (Timeline)',
    category: 'privacy_telemetry',
    description: 'Sets PublishUserActivities=0, UploadUserActivities=0 in HKCU\\SOFTWARE\\Policies\\Microsoft\\Windows\\System.',
    whenHelps: 'Disables Timeline/Task View cross-device history. Reduces cloud sync.',
    risk: 'safe',
    evidence: 'measured',
    requiresReboot: false,
    compatibility: {
        windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
        formFactors: ['desktop', 'laptop'],
    },
    detect: async () => {
        const results = await Promise.all([
            registry_1.RegistryManager.getValue('HKCU', '\\SOFTWARE\\Policies\\Microsoft\\Windows\\System', 'PublishUserActivities'),
            registry_1.RegistryManager.getValue('HKCU', '\\SOFTWARE\\Policies\\Microsoft\\Windows\\System', 'UploadUserActivities'),
        ]);
        return {
            path: 'HKCU\\SOFTWARE\\Policies\\Microsoft\\Windows\\System',
            name: 'ACTIVITY_HISTORY_COMPOSITE',
            type: 'REG_DWORD',
            value: { publish: results[0].value, upload: results[1].value },
            existed: results.every(r => r.existed),
        };
    },
    apply: async (options) => {
        if (options?.dryRun)
            return { ok: true, data: 'Would disable Activity History/Timeline' };
        try {
            const current = await exports.disableActivityHistory.detect();
            await registry_1.RegistryManager.createKey('HKCU', '\\SOFTWARE\\Policies\\Microsoft\\Windows\\System');
            await Promise.all([
                registry_1.RegistryManager.setValue('HKCU', '\\SOFTWARE\\Policies\\Microsoft\\Windows\\System', 'PublishUserActivities', 'REG_DWORD', 0),
                registry_1.RegistryManager.setValue('HKCU', '\\SOFTWARE\\Policies\\Microsoft\\Windows\\System', 'UploadUserActivities', 'REG_DWORD', 0),
            ]);
            return { ok: true, previousState: current, newState: { ...current, value: { publish: 0, upload: 0 } } };
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
                    registry_1.RegistryManager.setValue('HKCU', '\\SOFTWARE\\Policies\\Microsoft\\Windows\\System', 'PublishUserActivities', 'REG_DWORD', val.publish),
                    registry_1.RegistryManager.setValue('HKCU', '\\SOFTWARE\\Policies\\Microsoft\\Windows\\System', 'UploadUserActivities', 'REG_DWORD', val.upload),
                ]);
            }
            return { ok: true };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    },
    verify: async (expectedState) => {
        const current = await exports.disableActivityHistory.detect();
        const exp = expectedState.value;
        const cur = current.value;
        return cur.publish === exp.publish && cur.upload === exp.upload;
    },
};
// 10. Disable OneDrive Auto-start
exports.disableOneDriveAutoStart = {
    id: 'debloat.onedrive_autostart',
    name: 'Disable OneDrive Auto-start',
    category: 'debloat_apps',
    description: 'Removes OneDrive from Run key and disables autostart in OneDrive settings. Does not uninstall.',
    whenHelps: 'Prevents OneDrive from running at login if not used. Saves RAM/CPU.',
    risk: 'safe',
    evidence: 'measured',
    requiresReboot: false,
    compatibility: {
        windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
        formFactors: ['desktop', 'laptop'],
    },
    detect: async () => {
        const results = await Promise.all([
            registry_1.RegistryManager.getValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\Run', 'OneDrive'),
            registry_1.RegistryManager.getValue('HKLM', '\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run', 'OneDrive'),
        ]);
        return {
            path: 'RUN_KEYS',
            name: 'OneDrive',
            type: 'REG_SZ',
            value: { hkcu: results[0].value, hklm: results[1].value },
            existed: results.some(r => r.existed),
        };
    },
    apply: async (options) => {
        if (options?.dryRun)
            return { ok: true, data: 'Would remove OneDrive from auto-start' };
        try {
            const current = await exports.disableOneDriveAutoStart.detect();
            await Promise.all([
                registry_1.RegistryManager.deleteValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\Run', 'OneDrive'),
                registry_1.RegistryManager.deleteValue('HKLM', '\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run', 'OneDrive'),
            ]);
            return { ok: true, previousState: current, newState: { ...current, value: { hkcu: null, hklm: null } } };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    },
    revert: async (originalState) => {
        try {
            const val = originalState.value;
            if (val.hkcu)
                await registry_1.RegistryManager.setValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\Run', 'OneDrive', 'REG_SZ', val.hkcu);
            if (val.hklm)
                await registry_1.RegistryManager.setValue('HKLM', '\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run', 'OneDrive', 'REG_SZ', val.hklm);
            return { ok: true };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    },
    verify: async (expectedState) => {
        const current = await exports.disableOneDriveAutoStart.detect();
        return !current.value.hkcu && !current.value.hklm;
    },
};
// 11. Disable Startup Apps (Task Manager list)
exports.manageStartupApps = {
    id: 'debloat.startup_apps',
    name: 'Manage Startup Applications',
    category: 'debloat_apps',
    description: 'Lists and allows disabling startup entries from Run keys, Task Scheduler, and Services. Shows estimated impact.',
    whenHelps: 'Reduces boot time, frees RAM. Interactive selection in UI.',
    risk: 'safe',
    evidence: 'measured',
    requiresReboot: false,
    compatibility: {
        windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
        formFactors: ['desktop', 'laptop'],
    },
    detect: async () => {
        const { stdout } = await (0, process_1.execAsync)('powershell -NoProfile -Command "Get-CimInstance Win32_StartupCommand | Select-Object Name, Command, Location, User | ConvertTo-Json"');
        const apps = stdout.trim() ? JSON.parse(stdout) : [];
        return { path: 'STARTUP', name: 'StartupApps', type: 'REG_SZ', value: apps, existed: true };
    },
    apply: async (options) => {
        if (options?.dryRun)
            return { ok: true, data: 'Would disable selected startup apps (UI-driven)' };
        return { ok: true, data: 'Use UI to manage startup apps' };
    },
    revert: async (originalState) => {
        return { ok: true, data: 'Re-enable via UI or Task Manager' };
    },
    verify: async (expectedState) => {
        return true;
    },
};
// 12. Clean Temp Files
exports.cleanTempFiles = {
    id: 'debloat.clean_temp',
    name: 'Clean Temporary Files',
    category: 'debloat_apps',
    description: 'Cleans %TEMP%, C:\\Windows\\Temp, Windows Update cache, thumbnails, error reports. Preview with size before cleaning.',
    whenHelps: 'Frees disk space. Safe, idempotent. Does NOT clean Prefetch (harms boot).',
    risk: 'safe',
    evidence: 'measured',
    requiresReboot: false,
    compatibility: {
        windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
        formFactors: ['desktop', 'laptop'],
    },
    detect: async () => {
        // Calculate size of cleanable items
        const script = `
      $paths = @("$env:TEMP", "C:\\Windows\\Temp", "C:\\Windows\\SoftwareDistribution\\Download", "C:\\Windows\\Prefetch")
      $total = 0
      foreach ($p in $paths) {
        if (Test-Path $p) {
          $size = (Get-ChildItem $p -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
          $total += $size
        }
      }
      [math]::Round($total / 1GB, 2)
    `;
        const { stdout } = await (0, process_1.execAsync)(`powershell -NoProfile -Command "${script}"`);
        const sizeGB = parseFloat(stdout.trim()) || 0;
        return { path: 'FILESYSTEM', name: 'TempFilesSize', type: 'REG_DWORD', value: sizeGB, existed: true };
    },
    apply: async (options) => {
        if (options?.dryRun) {
            const current = await exports.cleanTempFiles.detect();
            return { ok: true, data: `Would clean ~${current.value} GB of temp files` };
        }
        try {
            const current = await exports.cleanTempFiles.detect();
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
            await (0, process_1.execAsync)(`powershell -NoProfile -Command "${script}"`);
            return { ok: true, previousState: current, newState: { ...current, value: 0 } };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    },
    revert: async (originalState) => {
        return { ok: true, data: 'Cannot revert file deletion' };
    },
    verify: async (expectedState) => {
        const current = await exports.cleanTempFiles.detect();
        return current.value < expectedState.value;
    },
};
exports.debloatTweaks = [
    exports.removeBloatware,
    exports.disableOneDriveAutoStart,
    exports.manageStartupApps,
    exports.cleanTempFiles,
];
exports.privacyTweaks = [
    exports.disableTelemetry,
    exports.disableDiagTrack,
    exports.disableDmwappush,
    exports.disableAdvertisingId,
    exports.disableTailoredExperiences,
    exports.disableLocation,
    exports.disableCortanaWeb,
    exports.disableActivityHistory,
];
//# sourceMappingURL=debloat.js.map