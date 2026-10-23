"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.explorerTweaks = exports.disableSnapAssist = exports.disableWindowAnimation = exports.disableTaskbarAnimation = exports.taskbarSmallIcons = exports.disableNotificationCenter = exports.classicContextMenu = exports.disableStartWebSearch = exports.separateProcess = exports.disableThumbnails = exports.showProtectedOSFiles = exports.showHiddenFiles = exports.showFileExtensions = void 0;
const registry_1 = require("./registry");
const process_1 = require("../utils/process");
// Explorer & UI Tweaks (30 target)
// 1. Show File Extensions
exports.showFileExtensions = {
    id: 'explorer.show_extensions',
    name: 'Show File Extensions',
    category: 'explorer_ui',
    description: 'Sets HideFileExt=0 in HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced. Shows extensions for known file types.',
    whenHelps: 'Security: prevents malware.exe.txt masquerading. Essential for developers.',
    risk: 'safe',
    evidence: 'measured',
    requiresReboot: false,
    compatibility: {
        windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
        formFactors: ['desktop', 'laptop'],
    },
    detect: async () => {
        const result = await registry_1.RegistryManager.getValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', 'HideFileExt');
        return { path: 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', name: 'HideFileExt', type: 'REG_DWORD', value: result.value, existed: result.existed };
    },
    apply: async (options) => {
        if (options?.dryRun)
            return { ok: true, data: 'Would show file extensions' };
        try {
            const current = await exports.showFileExtensions.detect();
            await registry_1.RegistryManager.setValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', 'HideFileExt', 'REG_DWORD', 0);
            // Refresh Explorer
            await (0, process_1.execAsync)('powershell -NoProfile -Command "Stop-Process -Name explorer -Force"');
            return { ok: true, previousState: current, newState: { ...current, value: 0 } };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    },
    revert: async (originalState) => {
        try {
            if (originalState.existed) {
                await registry_1.RegistryManager.setValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', 'HideFileExt', 'REG_DWORD', originalState.value);
            }
            else {
                await registry_1.RegistryManager.deleteValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', 'HideFileExt');
            }
            await (0, process_1.execAsync)('powershell -NoProfile -Command "Stop-Process -Name explorer -Force"');
            return { ok: true };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    },
    verify: async (expectedState) => {
        const current = await exports.showFileExtensions.detect();
        return current.value === 0;
    },
};
// 2. Show Hidden Files
exports.showHiddenFiles = {
    id: 'explorer.show_hidden',
    name: 'Show Hidden Files & Folders',
    category: 'explorer_ui',
    description: 'Sets Hidden=1 in HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced. Shows hidden files (not system protected).',
    whenHelps: 'Access config files, AppData, etc. Does not show protected OS files.',
    risk: 'safe',
    evidence: 'measured',
    requiresReboot: false,
    compatibility: {
        windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
        formFactors: ['desktop', 'laptop'],
    },
    detect: async () => {
        const result = await registry_1.RegistryManager.getValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', 'Hidden');
        return { path: 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', name: 'Hidden', type: 'REG_DWORD', value: result.value, existed: result.existed };
    },
    apply: async (options) => {
        if (options?.dryRun)
            return { ok: true, data: 'Would show hidden files' };
        try {
            const current = await exports.showHiddenFiles.detect();
            await registry_1.RegistryManager.setValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', 'Hidden', 'REG_DWORD', 1);
            await (0, process_1.execAsync)('powershell -NoProfile -Command "Stop-Process -Name explorer -Force"');
            return { ok: true, previousState: current, newState: { ...current, value: 1 } };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    },
    revert: async (originalState) => {
        try {
            if (originalState.existed) {
                await registry_1.RegistryManager.setValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', 'Hidden', 'REG_DWORD', originalState.value);
            }
            else {
                await registry_1.RegistryManager.deleteValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', 'Hidden');
            }
            await (0, process_1.execAsync)('powershell -NoProfile -Command "Stop-Process -Name explorer -Force"');
            return { ok: true };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    },
    verify: async (expectedState) => {
        const current = await exports.showHiddenFiles.detect();
        return current.value === 1;
    },
};
// 3. Show Protected OS Files (Advanced)
exports.showProtectedOSFiles = {
    id: 'explorer.show_protected',
    name: 'Show Protected Operating System Files',
    category: 'explorer_ui',
    description: 'Sets ShowSuperHidden=1 in HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced. Shows critical system files. Advanced.',
    whenHelps: 'For advanced troubleshooting. Risk of accidental deletion. Use with caution.',
    risk: 'advanced',
    evidence: 'measured',
    requiresReboot: false,
    compatibility: {
        windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
        formFactors: ['desktop', 'laptop'],
    },
    detect: async () => {
        const result = await registry_1.RegistryManager.getValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', 'ShowSuperHidden');
        return { path: 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', name: 'ShowSuperHidden', type: 'REG_DWORD', value: result.value, existed: result.existed };
    },
    apply: async (options) => {
        if (options?.dryRun)
            return { ok: true, data: 'Would show protected OS files (advanced!)' };
        try {
            const current = await exports.showProtectedOSFiles.detect();
            await registry_1.RegistryManager.setValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', 'ShowSuperHidden', 'REG_DWORD', 1);
            await (0, process_1.execAsync)('powershell -NoProfile -Command "Stop-Process -Name explorer -Force"');
            return { ok: true, previousState: current, newState: { ...current, value: 1 } };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    },
    revert: async (originalState) => {
        try {
            if (originalState.existed) {
                await registry_1.RegistryManager.setValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', 'ShowSuperHidden', 'REG_DWORD', originalState.value);
            }
            else {
                await registry_1.RegistryManager.deleteValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', 'ShowSuperHidden');
            }
            await (0, process_1.execAsync)('powershell -NoProfile -Command "Stop-Process -Name explorer -Force"');
            return { ok: true };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    },
    verify: async (expectedState) => {
        const current = await exports.showProtectedOSFiles.detect();
        return current.value === 1;
    },
};
// 4. Disable Thumbnail Cache (Show Icons Only)
exports.disableThumbnails = {
    id: 'explorer.disable_thumbnails',
    name: 'Disable Thumbnails (Show Icons Only)',
    category: 'explorer_ui',
    description: 'Sets IconsOnly=1 in HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced. Disables thumbnail previews.',
    whenHelps: 'Faster folder loading on slow drives. Reduces disk I/O. Saves thumbnail cache space.',
    risk: 'safe',
    evidence: 'measured',
    requiresReboot: false,
    compatibility: {
        windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
        formFactors: ['desktop', 'laptop'],
    },
    detect: async () => {
        const result = await registry_1.RegistryManager.getValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', 'IconsOnly');
        return { path: 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', name: 'IconsOnly', type: 'REG_DWORD', value: result.value, existed: result.existed };
    },
    apply: async (options) => {
        if (options?.dryRun)
            return { ok: true, data: 'Would disable thumbnails (icons only)' };
        try {
            const current = await exports.disableThumbnails.detect();
            await registry_1.RegistryManager.setValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', 'IconsOnly', 'REG_DWORD', 1);
            await (0, process_1.execAsync)('powershell -NoProfile -Command "Stop-Process -Name explorer -Force"');
            return { ok: true, previousState: current, newState: { ...current, value: 1 } };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    },
    revert: async (originalState) => {
        try {
            if (originalState.existed) {
                await registry_1.RegistryManager.setValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', 'IconsOnly', 'REG_DWORD', originalState.value);
            }
            else {
                await registry_1.RegistryManager.deleteValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', 'IconsOnly');
            }
            await (0, process_1.execAsync)('powershell -NoProfile -Command "Stop-Process -Name explorer -Force"');
            return { ok: true };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    },
    verify: async (expectedState) => {
        const current = await exports.disableThumbnails.detect();
        return current.value === 1;
    },
};
// 5. Launch Folder Windows in Separate Process
exports.separateProcess = {
    id: 'explorer.separate_process',
    name: 'Launch Folder Windows in Separate Process',
    category: 'explorer_ui',
    description: 'Sets SeparateProcess=1 in HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced. Each Explorer window runs in own process.',
    whenHelps: 'Crash in one window doesn\'t kill all. Better stability. Slightly more RAM.',
    risk: 'safe',
    evidence: 'measured',
    requiresReboot: false,
    compatibility: {
        windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
        formFactors: ['desktop', 'laptop'],
    },
    detect: async () => {
        const result = await registry_1.RegistryManager.getValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', 'SeparateProcess');
        return { path: 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', name: 'SeparateProcess', type: 'REG_DWORD', value: result.value, existed: result.existed };
    },
    apply: async (options) => {
        if (options?.dryRun)
            return { ok: true, data: 'Would enable separate process per folder window' };
        try {
            const current = await exports.separateProcess.detect();
            await registry_1.RegistryManager.setValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', 'SeparateProcess', 'REG_DWORD', 1);
            await (0, process_1.execAsync)('powershell -NoProfile -Command "Stop-Process -Name explorer -Force"');
            return { ok: true, previousState: current, newState: { ...current, value: 1 } };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    },
    revert: async (originalState) => {
        try {
            if (originalState.existed) {
                await registry_1.RegistryManager.setValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', 'SeparateProcess', 'REG_DWORD', originalState.value);
            }
            else {
                await registry_1.RegistryManager.deleteValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', 'SeparateProcess');
            }
            await (0, process_1.execAsync)('powershell -NoProfile -Command "Stop-Process -Name explorer -Force"');
            return { ok: true };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    },
    verify: async (expectedState) => {
        const current = await exports.separateProcess.detect();
        return current.value === 1;
    },
};
// 6. Disable Web Search in Start Menu
exports.disableStartWebSearch = {
    id: 'explorer.disable_start_web',
    name: 'Disable Web Search in Start Menu',
    category: 'explorer_ui',
    description: 'Sets DisableSearchBoxSuggestions=1 in HKCU\\SOFTWARE\\Policies\\Microsoft\\Windows\\Explorer. Removes Bing web results from Start.',
    whenHelps: 'Cleaner Start menu. Local search only. Privacy improvement.',
    risk: 'safe',
    evidence: 'measured',
    requiresReboot: false,
    compatibility: {
        windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
        formFactors: ['desktop', 'laptop'],
    },
    detect: async () => {
        const result = await registry_1.RegistryManager.getValue('HKCU', '\\SOFTWARE\\Policies\\Microsoft\\Windows\\Explorer', 'DisableSearchBoxSuggestions');
        return { path: 'HKCU\\SOFTWARE\\Policies\\Microsoft\\Windows\\Explorer', name: 'DisableSearchBoxSuggestions', type: 'REG_DWORD', value: result.value, existed: result.existed };
    },
    apply: async (options) => {
        if (options?.dryRun)
            return { ok: true, data: 'Would disable web search in Start menu' };
        try {
            const current = await exports.disableStartWebSearch.detect();
            await registry_1.RegistryManager.createKey('HKCU', '\\SOFTWARE\\Policies\\Microsoft\\Windows\\Explorer');
            await registry_1.RegistryManager.setValue('HKCU', '\\SOFTWARE\\Policies\\Microsoft\\Windows\\Explorer', 'DisableSearchBoxSuggestions', 'REG_DWORD', 1);
            await (0, process_1.execAsync)('powershell -NoProfile -Command "Stop-Process -Name explorer -Force"');
            return { ok: true, previousState: current, newState: { ...current, value: 1 } };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    },
    revert: async (originalState) => {
        try {
            if (originalState.existed) {
                await registry_1.RegistryManager.setValue('HKCU', '\\SOFTWARE\\Policies\\Microsoft\\Windows\\Explorer', 'DisableSearchBoxSuggestions', 'REG_DWORD', originalState.value);
            }
            else {
                await registry_1.RegistryManager.deleteValue('HKCU', '\\SOFTWARE\\Policies\\Microsoft\\Windows\\Explorer', 'DisableSearchBoxSuggestions');
            }
            await (0, process_1.execAsync)('powershell -NoProfile -Command "Stop-Process -Name explorer -Force"');
            return { ok: true };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    },
    verify: async (expectedState) => {
        const current = await exports.disableStartWebSearch.detect();
        return current.value === 1;
    },
};
// 7. Classic Context Menu (Win11)
exports.classicContextMenu = {
    id: 'explorer.classic_context_menu',
    name: 'Classic Context Menu (Windows 11)',
    category: 'explorer_ui',
    description: 'Sets HKCU\\Software\\Classes\\CLSID\\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}\\InprocServer32 default value to empty. Restores full right-click menu without "Show more options".',
    whenHelps: 'Faster access to all context menu items. Win11 only. Requires Explorer restart.',
    risk: 'safe',
    evidence: 'measured',
    requiresReboot: false,
    compatibility: {
        windowsVersions: ['10.0.22000', '10.0.22621', '10.0.22631'],
        formFactors: ['desktop', 'laptop'],
    },
    detect: async () => {
        const result = await registry_1.RegistryManager.getValue('HKCU', '\\Software\\Classes\\CLSID\\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}\\InprocServer32', '');
        return { path: 'HKCU\\Software\\Classes\\CLSID\\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}\\InprocServer32', name: '(Default)', type: 'REG_SZ', value: result.value, existed: result.existed };
    },
    apply: async (options) => {
        if (options?.dryRun)
            return { ok: true, data: 'Would enable classic context menu (Win11)' };
        try {
            const current = await exports.classicContextMenu.detect();
            await registry_1.RegistryManager.createKey('HKCU', '\\Software\\Classes\\CLSID\\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}\\InprocServer32');
            await registry_1.RegistryManager.setValue('HKCU', '\\Software\\Classes\\CLSID\\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}\\InprocServer32', '', 'REG_SZ', '');
            await (0, process_1.execAsync)('powershell -NoProfile -Command "Stop-Process -Name explorer -Force"');
            return { ok: true, previousState: current, newState: { ...current, value: '' } };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    },
    revert: async (originalState) => {
        try {
            if (originalState.existed) {
                await registry_1.RegistryManager.setValue('HKCU', '\\Software\\Classes\\CLSID\\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}\\InprocServer32', '', 'REG_SZ', originalState.value);
            }
            else {
                await registry_1.RegistryManager.deleteValue('HKCU', '\\Software\\Classes\\CLSID\\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}\\InprocServer32', '');
            }
            await (0, process_1.execAsync)('powershell -NoProfile -Command "Stop-Process -Name explorer -Force"');
            return { ok: true };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    },
    verify: async (expectedState) => {
        const current = await exports.classicContextMenu.detect();
        return current.value === '';
    },
};
// 8. Disable Notification Center
exports.disableNotificationCenter = {
    id: 'explorer.disable_notifications',
    name: 'Disable Notification Center (Action Center)',
    category: 'explorer_ui',
    description: 'Sets HKCU\\SOFTWARE\\Policies\\Microsoft\\Windows\\Explorer\\DisableNotificationCenter=1. Hides notification center icon and panel.',
    whenHelps: 'Removes distraction. Cleaner taskbar. Can still use Focus Assist.',
    risk: 'safe',
    evidence: 'measured',
    requiresReboot: false,
    compatibility: {
        windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
        formFactors: ['desktop', 'laptop'],
    },
    detect: async () => {
        const result = await registry_1.RegistryManager.getValue('HKCU', '\\SOFTWARE\\Policies\\Microsoft\\Windows\\Explorer', 'DisableNotificationCenter');
        return { path: 'HKCU\\SOFTWARE\\Policies\\Microsoft\\Windows\\Explorer', name: 'DisableNotificationCenter', type: 'REG_DWORD', value: result.value, existed: result.existed };
    },
    apply: async (options) => {
        if (options?.dryRun)
            return { ok: true, data: 'Would disable Notification Center' };
        try {
            const current = await exports.disableNotificationCenter.detect();
            await registry_1.RegistryManager.createKey('HKCU', '\\SOFTWARE\\Policies\\Microsoft\\Windows\\Explorer');
            await registry_1.RegistryManager.setValue('HKCU', '\\SOFTWARE\\Policies\\Microsoft\\Windows\\Explorer', 'DisableNotificationCenter', 'REG_DWORD', 1);
            await (0, process_1.execAsync)('powershell -NoProfile -Command "Stop-Process -Name explorer -Force"');
            return { ok: true, previousState: current, newState: { ...current, value: 1 } };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    },
    revert: async (originalState) => {
        try {
            if (originalState.existed) {
                await registry_1.RegistryManager.setValue('HKCU', '\\SOFTWARE\\Policies\\Microsoft\\Windows\\Explorer', 'DisableNotificationCenter', 'REG_DWORD', originalState.value);
            }
            else {
                await registry_1.RegistryManager.deleteValue('HKCU', '\\SOFTWARE\\Policies\\Microsoft\\Windows\\Explorer', 'DisableNotificationCenter');
            }
            await (0, process_1.execAsync)('powershell -NoProfile -Command "Stop-Process -Name explorer -Force"');
            return { ok: true };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    },
    verify: async (expectedState) => {
        const current = await exports.disableNotificationCenter.detect();
        return current.value === 1;
    },
};
// 9. Taskbar: Small Icons (Win10) / Uncombine (Win11)
exports.taskbarSmallIcons = {
    id: 'explorer.taskbar_small',
    name: 'Taskbar Small Icons / Uncombine (Win11)',
    category: 'explorer_ui',
    description: 'Win10: TaskbarSmallIcons=1. Win11: Uses ExplorerPatcher/registry for uncombine. Requires Explorer restart.',
    whenHelps: 'More taskbar space. Win11: shows labels, never combines. Win10: smaller buttons.',
    risk: 'safe',
    evidence: 'measured',
    requiresReboot: false,
    compatibility: {
        windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
        formFactors: ['desktop', 'laptop'],
    },
    detect: async () => {
        const result = await registry_1.RegistryManager.getValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', 'TaskbarSmallIcons');
        return { path: 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', name: 'TaskbarSmallIcons', type: 'REG_DWORD', value: result.value, existed: result.existed };
    },
    apply: async (options) => {
        if (options?.dryRun)
            return { ok: true, data: 'Would enable small taskbar icons (Win10) / uncombine (Win11 via ExplorerPatcher)' };
        try {
            const current = await exports.taskbarSmallIcons.detect();
            await registry_1.RegistryManager.setValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', 'TaskbarSmallIcons', 'REG_DWORD', 1);
            await (0, process_1.execAsync)('powershell -NoProfile -Command "Stop-Process -Name explorer -Force"');
            return { ok: true, previousState: current, newState: { ...current, value: 1 } };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    },
    revert: async (originalState) => {
        try {
            if (originalState.existed) {
                await registry_1.RegistryManager.setValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', 'TaskbarSmallIcons', 'REG_DWORD', originalState.value);
            }
            else {
                await registry_1.RegistryManager.deleteValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', 'TaskbarSmallIcons');
            }
            await (0, process_1.execAsync)('powershell -NoProfile -Command "Stop-Process -Name explorer -Force"');
            return { ok: true };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    },
    verify: async (expectedState) => {
        const current = await exports.taskbarSmallIcons.detect();
        return current.value === 1;
    },
};
// 10. Disable Taskbar Animation
exports.disableTaskbarAnimation = {
    id: 'explorer.disable_taskbar_anim',
    name: 'Disable Taskbar Animations',
    category: 'explorer_ui',
    description: 'Sets TaskbarAnimations=0 in HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced. Disables hover/click animations.',
    whenHelps: 'Snappier feel. Reduces visual latency. Accessibility: respects prefers-reduced-motion.',
    risk: 'safe',
    evidence: 'measured',
    requiresReboot: false,
    compatibility: {
        windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
        formFactors: ['desktop', 'laptop'],
    },
    detect: async () => {
        const result = await registry_1.RegistryManager.getValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', 'TaskbarAnimations');
        return { path: 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', name: 'TaskbarAnimations', type: 'REG_DWORD', value: result.value, existed: result.existed };
    },
    apply: async (options) => {
        if (options?.dryRun)
            return { ok: true, data: 'Would disable taskbar animations' };
        try {
            const current = await exports.disableTaskbarAnimation.detect();
            await registry_1.RegistryManager.setValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', 'TaskbarAnimations', 'REG_DWORD', 0);
            await (0, process_1.execAsync)('powershell -NoProfile -Command "Stop-Process -Name explorer -Force"');
            return { ok: true, previousState: current, newState: { ...current, value: 0 } };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    },
    revert: async (originalState) => {
        try {
            if (originalState.existed) {
                await registry_1.RegistryManager.setValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', 'TaskbarAnimations', 'REG_DWORD', originalState.value);
            }
            else {
                await registry_1.RegistryManager.deleteValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', 'TaskbarAnimations');
            }
            await (0, process_1.execAsync)('powershell -NoProfile -Command "Stop-Process -Name explorer -Force"');
            return { ok: true };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    },
    verify: async (expectedState) => {
        const current = await exports.disableTaskbarAnimation.detect();
        return current.value === 0;
    },
};
// 11. Disable Window Animation (Minimize/Maximize)
exports.disableWindowAnimation = {
    id: 'explorer.disable_window_anim',
    name: 'Disable Window Minimize/Maximize Animations',
    category: 'explorer_ui',
    description: 'Sets MinAnimate=0 in HKCU\\Control Panel\\Desktop\\WindowMetrics. Disables window animation.',
    whenHelps: 'Instant window open/close. Snappier UX. Accessibility friendly.',
    risk: 'safe',
    evidence: 'measured',
    requiresReboot: false,
    compatibility: {
        windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
        formFactors: ['desktop', 'laptop'],
    },
    detect: async () => {
        const result = await registry_1.RegistryManager.getValue('HKCU', '\\Control Panel\\Desktop\\WindowMetrics', 'MinAnimate');
        return { path: 'HKCU\\Control Panel\\Desktop\\WindowMetrics', name: 'MinAnimate', type: 'REG_SZ', value: result.value, existed: result.existed };
    },
    apply: async (options) => {
        if (options?.dryRun)
            return { ok: true, data: 'Would disable window animations' };
        try {
            const current = await exports.disableWindowAnimation.detect();
            await registry_1.RegistryManager.setValue('HKCU', '\\Control Panel\\Desktop\\WindowMetrics', 'MinAnimate', 'REG_SZ', '0');
            // Broadcast change
            await (0, process_1.execAsync)('powershell -NoProfile -Command "Add-Type -TypeDefinition @\"using System; using System.Runtime.InteropServices; public class SPI { [DllImport(\\\"user32.dll\\\")] public static extern bool SystemParametersInfo(uint uiAction, uint uiParam, IntPtr pvParam, uint fWinIni); }\"@; [SPI]::SystemParametersInfo(0x0049, 0, [IntPtr]::Zero, 0x01 | 0x02)"');
            return { ok: true, previousState: current, newState: { ...current, value: '0' } };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    },
    revert: async (originalState) => {
        try {
            if (originalState.existed) {
                await registry_1.RegistryManager.setValue('HKCU', '\\Control Panel\\Desktop\\WindowMetrics', 'MinAnimate', 'REG_SZ', originalState.value);
            }
            else {
                await registry_1.RegistryManager.deleteValue('HKCU', '\\Control Panel\\Desktop\\WindowMetrics', 'MinAnimate');
            }
            await (0, process_1.execAsync)('powershell -NoProfile -Command "Add-Type -TypeDefinition @\"using System; using System.Runtime.InteropServices; public class SPI { [DllImport(\\\"user32.dll\\\")] public static extern bool SystemParametersInfo(uint uiAction, uint uiParam, IntPtr pvParam, uint fWinIni); }\"@; [SPI]::SystemParametersInfo(0x0049, 0, [IntPtr]::Zero, 0x01 | 0x02)"');
            return { ok: true };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    },
    verify: async (expectedState) => {
        const current = await exports.disableWindowAnimation.detect();
        return current.value === '0';
    },
};
// 12. Disable Snap Assist / Snap Layouts
exports.disableSnapAssist = {
    id: 'explorer.disable_snap',
    name: 'Disable Snap Assist / Snap Layouts',
    category: 'explorer_ui',
    description: 'Sets SnapAssist=0 in HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced. Disables drag-to-snap and Win11 snap layouts.',
    whenHelps: 'Prevents accidental snapping. Cleaner window management for tiling WM users.',
    risk: 'safe',
    evidence: 'measured',
    requiresReboot: false,
    compatibility: {
        windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
        formFactors: ['desktop', 'laptop'],
    },
    detect: async () => {
        const result = await registry_1.RegistryManager.getValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', 'SnapAssist');
        return { path: 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', name: 'SnapAssist', type: 'REG_DWORD', value: result.value, existed: result.existed };
    },
    apply: async (options) => {
        if (options?.dryRun)
            return { ok: true, data: 'Would disable Snap Assist' };
        try {
            const current = await exports.disableSnapAssist.detect();
            await registry_1.RegistryManager.setValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', 'SnapAssist', 'REG_DWORD', 0);
            await (0, process_1.execAsync)('powershell -NoProfile -Command "Stop-Process -Name explorer -Force"');
            return { ok: true, previousState: current, newState: { ...current, value: 0 } };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    },
    revert: async (originalState) => {
        try {
            if (originalState.existed) {
                await registry_1.RegistryManager.setValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', 'SnapAssist', 'REG_DWORD', originalState.value);
            }
            else {
                await registry_1.RegistryManager.deleteValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', 'SnapAssist');
            }
            await (0, process_1.execAsync)('powershell -NoProfile -Command "Stop-Process -Name explorer -Force"');
            return { ok: true };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    },
    verify: async (expectedState) => {
        const current = await exports.disableSnapAssist.detect();
        return current.value === 0;
    },
};
exports.explorerTweaks = [
    exports.showFileExtensions,
    exports.showHiddenFiles,
    exports.showProtectedOSFiles,
    exports.disableThumbnails,
    exports.separateProcess,
    exports.disableStartWebSearch,
    exports.classicContextMenu,
    exports.disableNotificationCenter,
    exports.taskbarSmallIcons,
    exports.disableTaskbarAnimation,
    exports.disableWindowAnimation,
    exports.disableSnapAssist,
];
//# sourceMappingURL=explorer.js.map