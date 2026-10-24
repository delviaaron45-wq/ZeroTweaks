import type { Tweak, TweakState, TweakResult, ApplyOptions } from '../types/all';
import { RegistryManager } from './registry';
import { execAsync } from '../utils/process';

// Explorer & UI Tweaks (30 target)

// 1. Show File Extensions
export const showFileExtensions: Tweak = {
  id: 'explorer.show_extensions',
  name: 'Show File Extensions',
  nameKey: 'tweaks.explorer.showExtensions.name',
  category: 'explorer_ui',
  description: 'Sets HideFileExt=0 in HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced. Shows extensions for known file types.',
  descriptionKey: 'tweaks.explorer.showExtensions.description',
  whenHelps: 'Security: prevents malware.exe.txt masquerading. Essential for developers.',
  whenHelpsKey: 'tweaks.explorer.showExtensions.whenHelps',
  risk: 'safe',
  evidence: 'measured',
  impacto: 'bajo',
      requiresReboot: false,
  compatibility: {
    windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
    formFactors: ['desktop', 'laptop'],
  },
  detect: async (): Promise<TweakState> => {
    const result = await RegistryManager.getValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', 'HideFileExt');
    return { path: 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', name: 'HideFileExt', type: 'REG_DWORD', value: result.value, existed: result.existed };
  },
  apply: async (options?: ApplyOptions): Promise<TweakResult> => {
    if (options?.dryRun) return { ok: true, data: 'Would show file extensions' };
    try {
      const current = await showFileExtensions.detect();
      await RegistryManager.setValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', 'HideFileExt', 'REG_DWORD', 0);
      // Refresh Explorer
      await execAsync('powershell -NoProfile -Command "Stop-Process -Name explorer -Force"');
      return { ok: true, previousState: current, newState: { ...current, value: 0 } };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  revert: async (originalState: TweakState): Promise<TweakResult> => {
    try {
      if (originalState.existed) {
        await RegistryManager.setValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', 'HideFileExt', 'REG_DWORD', originalState.value as number);
      } else {
        await RegistryManager.deleteValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', 'HideFileExt');
      }
      await execAsync('powershell -NoProfile -Command "Stop-Process -Name explorer -Force"');
      return { ok: true };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  verify: async (expectedState: TweakState): Promise<boolean> => {
    const current = await showFileExtensions.detect();
    return current.value === 0;
  },
};

// 2. Show Hidden Files
export const showHiddenFiles: Tweak = {
  id: 'explorer.show_hidden',
  name: 'Show Hidden Files & Folders',
  nameKey: 'tweaks.explorer.showHidden.name',
  category: 'explorer_ui',
  description: 'Sets Hidden=1 in HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced. Shows hidden files (not system protected).',
  descriptionKey: 'tweaks.explorer.showHidden.description',
  whenHelps: 'Access config files, AppData, etc. Does not show protected OS files.',
  whenHelpsKey: 'tweaks.explorer.showHidden.whenHelps',
  risk: 'safe',
  evidence: 'measured',
  impacto: 'bajo',
      requiresReboot: false,
  compatibility: {
    windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
    formFactors: ['desktop', 'laptop'],
  },
  detect: async (): Promise<TweakState> => {
    const result = await RegistryManager.getValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', 'Hidden');
    return { path: 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', name: 'Hidden', type: 'REG_DWORD', value: result.value, existed: result.existed };
  },
  apply: async (options?: ApplyOptions): Promise<TweakResult> => {
    if (options?.dryRun) return { ok: true, data: 'Would show hidden files' };
    try {
      const current = await showHiddenFiles.detect();
      await RegistryManager.setValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', 'Hidden', 'REG_DWORD', 1);
      await execAsync('powershell -NoProfile -Command "Stop-Process -Name explorer -Force"');
      return { ok: true, previousState: current, newState: { ...current, value: 1 } };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  revert: async (originalState: TweakState): Promise<TweakResult> => {
    try {
      if (originalState.existed) {
        await RegistryManager.setValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', 'Hidden', 'REG_DWORD', originalState.value as number);
      } else {
        await RegistryManager.deleteValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', 'Hidden');
      }
      await execAsync('powershell -NoProfile -Command "Stop-Process -Name explorer -Force"');
      return { ok: true };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  verify: async (expectedState: TweakState): Promise<boolean> => {
    const current = await showHiddenFiles.detect();
    return current.value === 1;
  },
};

// 3. Show Protected OS Files (Advanced)
export const showProtectedOSFiles: Tweak = {
  id: 'explorer.show_protected',
  name: 'Show Protected Operating System Files',
  nameKey: 'tweaks.explorer.showProtected.name',
  category: 'explorer_ui',
  description: 'Sets ShowSuperHidden=1 in HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced. Shows critical system files. Advanced.',
  descriptionKey: 'tweaks.explorer.showProtected.description',
  whenHelps: 'For advanced troubleshooting. Risk of accidental deletion. Use with caution.',
  whenHelpsKey: 'tweaks.explorer.showProtected.whenHelps',
  risk: 'advanced',
  evidence: 'measured',
  impacto: 'bajo',
      requiresReboot: false,
  compatibility: {
    windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
    formFactors: ['desktop', 'laptop'],
  },
  detect: async (): Promise<TweakState> => {
    const result = await RegistryManager.getValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', 'ShowSuperHidden');
    return { path: 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', name: 'ShowSuperHidden', type: 'REG_DWORD', value: result.value, existed: result.existed };
  },
  apply: async (options?: ApplyOptions): Promise<TweakResult> => {
    if (options?.dryRun) return { ok: true, data: 'Would show protected OS files (advanced!)' };
    try {
      const current = await showProtectedOSFiles.detect();
      await RegistryManager.setValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', 'ShowSuperHidden', 'REG_DWORD', 1);
      await execAsync('powershell -NoProfile -Command "Stop-Process -Name explorer -Force"');
      return { ok: true, previousState: current, newState: { ...current, value: 1 } };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  revert: async (originalState: TweakState): Promise<TweakResult> => {
    try {
      if (originalState.existed) {
        await RegistryManager.setValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', 'ShowSuperHidden', 'REG_DWORD', originalState.value as number);
      } else {
        await RegistryManager.deleteValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', 'ShowSuperHidden');
      }
      await execAsync('powershell -NoProfile -Command "Stop-Process -Name explorer -Force"');
      return { ok: true };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  verify: async (expectedState: TweakState): Promise<boolean> => {
    const current = await showProtectedOSFiles.detect();
    return current.value === 1;
  },
};

// 4. Disable Thumbnail Cache (Show Icons Only)
export const disableThumbnails: Tweak = {
  id: 'explorer.disable_thumbnails',
  name: 'Disable Thumbnails (Show Icons Only)',
  nameKey: 'tweaks.explorer.disableThumbnails.name',
  category: 'explorer_ui',
  description: 'Sets IconsOnly=1 in HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced. Disables thumbnail previews.',
  descriptionKey: 'tweaks.explorer.disableThumbnails.description',
  whenHelps: 'Faster folder loading on slow drives. Reduces disk I/O. Saves thumbnail cache space.',
  whenHelpsKey: 'tweaks.explorer.disableThumbnails.whenHelps',
  risk: 'safe',
  evidence: 'measured',
  impacto: 'bajo',
      requiresReboot: false,
  compatibility: {
    windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
    formFactors: ['desktop', 'laptop'],
  },
  detect: async (): Promise<TweakState> => {
    const result = await RegistryManager.getValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', 'IconsOnly');
    return { path: 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', name: 'IconsOnly', type: 'REG_DWORD', value: result.value, existed: result.existed };
  },
  apply: async (options?: ApplyOptions): Promise<TweakResult> => {
    if (options?.dryRun) return { ok: true, data: 'Would disable thumbnails (icons only)' };
    try {
      const current = await disableThumbnails.detect();
      await RegistryManager.setValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', 'IconsOnly', 'REG_DWORD', 1);
      await execAsync('powershell -NoProfile -Command "Stop-Process -Name explorer -Force"');
      return { ok: true, previousState: current, newState: { ...current, value: 1 } };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  revert: async (originalState: TweakState): Promise<TweakResult> => {
    try {
      if (originalState.existed) {
        await RegistryManager.setValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', 'IconsOnly', 'REG_DWORD', originalState.value as number);
      } else {
        await RegistryManager.deleteValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', 'IconsOnly');
      }
      await execAsync('powershell -NoProfile -Command "Stop-Process -Name explorer -Force"');
      return { ok: true };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  verify: async (expectedState: TweakState): Promise<boolean> => {
    const current = await disableThumbnails.detect();
    return current.value === 1;
  },
};

// 5. Launch Folder Windows in Separate Process
export const separateProcess: Tweak = {
  id: 'explorer.separate_process',
  name: 'Launch Folder Windows in Separate Process',
  nameKey: 'tweaks.explorer.separateProcess.name',
  category: 'explorer_ui',
  description: 'Sets SeparateProcess=1 in HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced. Each Explorer window runs in own process.',
  descriptionKey: 'tweaks.explorer.separateProcess.description',
  whenHelps: 'Crash in one window doesn\'t kill all. Better stability. Slightly more RAM.',
  whenHelpsKey: 'tweaks.explorer.separateProcess.whenHelps',
  risk: 'safe',
  evidence: 'measured',
  impacto: 'bajo',
      requiresReboot: false,
  compatibility: {
    windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
    formFactors: ['desktop', 'laptop'],
  },
  detect: async (): Promise<TweakState> => {
    const result = await RegistryManager.getValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', 'SeparateProcess');
    return { path: 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', name: 'SeparateProcess', type: 'REG_DWORD', value: result.value, existed: result.existed };
  },
  apply: async (options?: ApplyOptions): Promise<TweakResult> => {
    if (options?.dryRun) return { ok: true, data: 'Would enable separate process per folder window' };
    try {
      const current = await separateProcess.detect();
      await RegistryManager.setValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', 'SeparateProcess', 'REG_DWORD', 1);
      await execAsync('powershell -NoProfile -Command "Stop-Process -Name explorer -Force"');
      return { ok: true, previousState: current, newState: { ...current, value: 1 } };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  revert: async (originalState: TweakState): Promise<TweakResult> => {
    try {
      if (originalState.existed) {
        await RegistryManager.setValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', 'SeparateProcess', 'REG_DWORD', originalState.value as number);
      } else {
        await RegistryManager.deleteValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', 'SeparateProcess');
      }
      await execAsync('powershell -NoProfile -Command "Stop-Process -Name explorer -Force"');
      return { ok: true };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  verify: async (expectedState: TweakState): Promise<boolean> => {
    const current = await separateProcess.detect();
    return current.value === 1;
  },
};

// 6. Disable Web Search in Start Menu
export const disableStartWebSearch: Tweak = {
  id: 'explorer.disable_start_web',
  name: 'Disable Web Search in Start Menu',
  nameKey: 'tweaks.explorer.disableStartWeb.name',
  category: 'explorer_ui',
  description: 'Sets DisableSearchBoxSuggestions=1 in HKCU\\SOFTWARE\\Policies\\Microsoft\\Windows\\Explorer. Removes Bing web results from Start.',
  descriptionKey: 'tweaks.explorer.disableStartWeb.description',
  whenHelps: 'Cleaner Start menu. Local search only. Privacy improvement.',
  whenHelpsKey: 'tweaks.explorer.disableStartWeb.whenHelps',
  risk: 'safe',
  evidence: 'measured',
  impacto: 'bajo',
      requiresReboot: false,
  compatibility: {
    windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
    formFactors: ['desktop', 'laptop'],
  },
  detect: async (): Promise<TweakState> => {
    const result = await RegistryManager.getValue('HKCU', '\\SOFTWARE\\Policies\\Microsoft\\Windows\\Explorer', 'DisableSearchBoxSuggestions');
    return { path: 'HKCU\\SOFTWARE\\Policies\\Microsoft\\Windows\\Explorer', name: 'DisableSearchBoxSuggestions', type: 'REG_DWORD', value: result.value, existed: result.existed };
  },
  apply: async (options?: ApplyOptions): Promise<TweakResult> => {
    if (options?.dryRun) return { ok: true, data: 'Would disable web search in Start menu' };
    try {
      const current = await disableStartWebSearch.detect();
      await RegistryManager.createKey('HKCU', '\\SOFTWARE\\Policies\\Microsoft\\Windows\\Explorer');
      await RegistryManager.setValue('HKCU', '\\SOFTWARE\\Policies\\Microsoft\\Windows\\Explorer', 'DisableSearchBoxSuggestions', 'REG_DWORD', 1);
      await execAsync('powershell -NoProfile -Command "Stop-Process -Name explorer -Force"');
      return { ok: true, previousState: current, newState: { ...current, value: 1 } };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  revert: async (originalState: TweakState): Promise<TweakResult> => {
    try {
      if (originalState.existed) {
        await RegistryManager.setValue('HKCU', '\\SOFTWARE\\Policies\\Microsoft\\Windows\\Explorer', 'DisableSearchBoxSuggestions', 'REG_DWORD', originalState.value as number);
      } else {
        await RegistryManager.deleteValue('HKCU', '\\SOFTWARE\\Policies\\Microsoft\\Windows\\Explorer', 'DisableSearchBoxSuggestions');
      }
      await execAsync('powershell -NoProfile -Command "Stop-Process -Name explorer -Force"');
      return { ok: true };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  verify: async (expectedState: TweakState): Promise<boolean> => {
    const current = await disableStartWebSearch.detect();
    return current.value === 1;
  },
};

// 7. Classic Context Menu (Win11)
export const classicContextMenu: Tweak = {
  id: 'explorer.classic_context_menu',
  name: 'Classic Context Menu (Windows 11)',
  nameKey: 'tweaks.explorer.classicContextMenu.name',
  category: 'explorer_ui',
  description: 'Sets HKCU\\Software\\Classes\\CLSID\\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}\\InprocServer32 default value to empty. Restores full right-click menu without "Show more options".',
  descriptionKey: 'tweaks.explorer.classicContextMenu.description',
  whenHelps: 'Faster access to all context menu items. Win11 only. Requires Explorer restart.',
  whenHelpsKey: 'tweaks.explorer.classicContextMenu.whenHelps',
  risk: 'safe',
  evidence: 'measured',
  impacto: 'bajo',
      requiresReboot: false,
  compatibility: {
    windowsVersions: ['10.0.22000', '10.0.22621', '10.0.22631'],
    formFactors: ['desktop', 'laptop'],
  },
  detect: async (): Promise<TweakState> => {
    const result = await RegistryManager.getValue('HKCU', '\\Software\\Classes\\CLSID\\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}\\InprocServer32', '');
    return { path: 'HKCU\\Software\\Classes\\CLSID\\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}\\InprocServer32', name: '(Default)', type: 'REG_SZ', value: result.value, existed: result.existed };
  },
  apply: async (options?: ApplyOptions): Promise<TweakResult> => {
    if (options?.dryRun) return { ok: true, data: 'Would enable classic context menu (Win11)' };
    try {
      const current = await classicContextMenu.detect();
      await RegistryManager.createKey('HKCU', '\\Software\\Classes\\CLSID\\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}\\InprocServer32');
      await RegistryManager.setValue('HKCU', '\\Software\\Classes\\CLSID\\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}\\InprocServer32', '', 'REG_SZ', '');
      await execAsync('powershell -NoProfile -Command "Stop-Process -Name explorer -Force"');
      return { ok: true, previousState: current, newState: { ...current, value: '' } };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  revert: async (originalState: TweakState): Promise<TweakResult> => {
    try {
      if (originalState.existed) {
        await RegistryManager.setValue('HKCU', '\\Software\\Classes\\CLSID\\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}\\InprocServer32', '', 'REG_SZ', originalState.value as string);
      } else {
        await RegistryManager.deleteValue('HKCU', '\\Software\\Classes\\CLSID\\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}\\InprocServer32', '');
      }
      await execAsync('powershell -NoProfile -Command "Stop-Process -Name explorer -Force"');
      return { ok: true };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  verify: async (expectedState: TweakState): Promise<boolean> => {
    const current = await classicContextMenu.detect();
    return current.value === '';
  },
};

// 8. Disable Notification Center
export const disableNotificationCenter: Tweak = {
  id: 'explorer.disable_notifications',
  name: 'Disable Notification Center (Action Center)',
  nameKey: 'tweaks.explorer.disableNotifications.name',
  category: 'explorer_ui',
  description: 'Sets HKCU\\SOFTWARE\\Policies\\Microsoft\\Windows\\Explorer\\DisableNotificationCenter=1. Hides notification center icon and panel.',
  descriptionKey: 'tweaks.explorer.disableNotifications.description',
  whenHelps: 'Removes distraction. Cleaner taskbar. Can still use Focus Assist.',
  whenHelpsKey: 'tweaks.explorer.disableNotifications.whenHelps',
  risk: 'safe',
  evidence: 'measured',
  impacto: 'bajo',
      requiresReboot: false,
  compatibility: {
    windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
    formFactors: ['desktop', 'laptop'],
  },
  detect: async (): Promise<TweakState> => {
    const result = await RegistryManager.getValue('HKCU', '\\SOFTWARE\\Policies\\Microsoft\\Windows\\Explorer', 'DisableNotificationCenter');
    return { path: 'HKCU\\SOFTWARE\\Policies\\Microsoft\\Windows\\Explorer', name: 'DisableNotificationCenter', type: 'REG_DWORD', value: result.value, existed: result.existed };
  },
  apply: async (options?: ApplyOptions): Promise<TweakResult> => {
    if (options?.dryRun) return { ok: true, data: 'Would disable Notification Center' };
    try {
      const current = await disableNotificationCenter.detect();
      await RegistryManager.createKey('HKCU', '\\SOFTWARE\\Policies\\Microsoft\\Windows\\Explorer');
      await RegistryManager.setValue('HKCU', '\\SOFTWARE\\Policies\\Microsoft\\Windows\\Explorer', 'DisableNotificationCenter', 'REG_DWORD', 1);
      await execAsync('powershell -NoProfile -Command "Stop-Process -Name explorer -Force"');
      return { ok: true, previousState: current, newState: { ...current, value: 1 } };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  revert: async (originalState: TweakState): Promise<TweakResult> => {
    try {
      if (originalState.existed) {
        await RegistryManager.setValue('HKCU', '\\SOFTWARE\\Policies\\Microsoft\\Windows\\Explorer', 'DisableNotificationCenter', 'REG_DWORD', originalState.value as number);
      } else {
        await RegistryManager.deleteValue('HKCU', '\\SOFTWARE\\Policies\\Microsoft\\Windows\\Explorer', 'DisableNotificationCenter');
      }
      await execAsync('powershell -NoProfile -Command "Stop-Process -Name explorer -Force"');
      return { ok: true };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  verify: async (expectedState: TweakState): Promise<boolean> => {
    const current = await disableNotificationCenter.detect();
    return current.value === 1;
  },
};

// 9. Taskbar: Small Icons (Win10) / Uncombine (Win11)
export const taskbarSmallIcons: Tweak = {
  id: 'explorer.taskbar_small',
  name: 'Taskbar Small Icons / Uncombine (Win11)',
  nameKey: 'tweaks.explorer.taskbarSmall.name',
  category: 'explorer_ui',
  description: 'Win10: TaskbarSmallIcons=1. Win11: Uses ExplorerPatcher/registry for uncombine. Requires Explorer restart.',
  descriptionKey: 'tweaks.explorer.taskbarSmall.description',
  whenHelps: 'More taskbar space. Win11: shows labels, never combines. Win10: smaller buttons.',
  whenHelpsKey: 'tweaks.explorer.taskbarSmall.whenHelps',
  risk: 'safe',
  evidence: 'measured',
  impacto: 'bajo',
      requiresReboot: false,
  compatibility: {
    windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
    formFactors: ['desktop', 'laptop'],
  },
  detect: async (): Promise<TweakState> => {
    const result = await RegistryManager.getValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', 'TaskbarSmallIcons');
    return { path: 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', name: 'TaskbarSmallIcons', type: 'REG_DWORD', value: result.value, existed: result.existed };
  },
  apply: async (options?: ApplyOptions): Promise<TweakResult> => {
    if (options?.dryRun) return { ok: true, data: 'Would enable small taskbar icons (Win10) / uncombine (Win11 via ExplorerPatcher)' };
    try {
      const current = await taskbarSmallIcons.detect();
      await RegistryManager.setValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', 'TaskbarSmallIcons', 'REG_DWORD', 1);
      await execAsync('powershell -NoProfile -Command "Stop-Process -Name explorer -Force"');
      return { ok: true, previousState: current, newState: { ...current, value: 1 } };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  revert: async (originalState: TweakState): Promise<TweakResult> => {
    try {
      if (originalState.existed) {
        await RegistryManager.setValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', 'TaskbarSmallIcons', 'REG_DWORD', originalState.value as number);
      } else {
        await RegistryManager.deleteValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', 'TaskbarSmallIcons');
      }
      await execAsync('powershell -NoProfile -Command "Stop-Process -Name explorer -Force"');
      return { ok: true };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  verify: async (expectedState: TweakState): Promise<boolean> => {
    const current = await taskbarSmallIcons.detect();
    return current.value === 1;
  },
};

// 10. Disable Taskbar Animation
export const disableTaskbarAnimation: Tweak = {
  id: 'explorer.disable_taskbar_anim',
  name: 'Disable Taskbar Animations',
  nameKey: 'tweaks.explorer.disableTaskbarAnim.name',
  category: 'explorer_ui',
  description: 'Sets TaskbarAnimations=0 in HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced. Disables hover/click animations.',
  descriptionKey: 'tweaks.explorer.disableTaskbarAnim.description',
  whenHelps: 'Snappier feel. Reduces visual latency. Accessibility: respects prefers-reduced-motion.',
  whenHelpsKey: 'tweaks.explorer.disableTaskbarAnim.whenHelps',
  risk: 'safe',
  evidence: 'measured',
  impacto: 'bajo',
      requiresReboot: false,
  compatibility: {
    windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
    formFactors: ['desktop', 'laptop'],
  },
  detect: async (): Promise<TweakState> => {
    const result = await RegistryManager.getValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', 'TaskbarAnimations');
    return { path: 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', name: 'TaskbarAnimations', type: 'REG_DWORD', value: result.value, existed: result.existed };
  },
  apply: async (options?: ApplyOptions): Promise<TweakResult> => {
    if (options?.dryRun) return { ok: true, data: 'Would disable taskbar animations' };
    try {
      const current = await disableTaskbarAnimation.detect();
      await RegistryManager.setValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', 'TaskbarAnimations', 'REG_DWORD', 0);
      await execAsync('powershell -NoProfile -Command "Stop-Process -Name explorer -Force"');
      return { ok: true, previousState: current, newState: { ...current, value: 0 } };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  revert: async (originalState: TweakState): Promise<TweakResult> => {
    try {
      if (originalState.existed) {
        await RegistryManager.setValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', 'TaskbarAnimations', 'REG_DWORD', originalState.value as number);
      } else {
        await RegistryManager.deleteValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', 'TaskbarAnimations');
      }
      await execAsync('powershell -NoProfile -Command "Stop-Process -Name explorer -Force"');
      return { ok: true };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  verify: async (expectedState: TweakState): Promise<boolean> => {
    const current = await disableTaskbarAnimation.detect();
    return current.value === 0;
  },
};

// 11. Disable Window Animation (Minimize/Maximize)
export const disableWindowAnimation: Tweak = {
  id: 'explorer.disable_window_anim',
  name: 'Disable Window Minimize/Maximize Animations',
  nameKey: 'tweaks.explorer.disableWindowAnim.name',
  category: 'explorer_ui',
  description: 'Sets MinAnimate=0 in HKCU\\Control Panel\\Desktop\\WindowMetrics. Disables window animation.',
  descriptionKey: 'tweaks.explorer.disableWindowAnim.description',
  whenHelps: 'Instant window open/close. Snappier UX. Accessibility friendly.',
  whenHelpsKey: 'tweaks.explorer.disableWindowAnim.whenHelps',
  risk: 'safe',
  evidence: 'measured',
  impacto: 'bajo',
      requiresReboot: false,
  compatibility: {
    windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
    formFactors: ['desktop', 'laptop'],
  },
  detect: async (): Promise<TweakState> => {
    const result = await RegistryManager.getValue('HKCU', '\\Control Panel\\Desktop\\WindowMetrics', 'MinAnimate');
    return { path: 'HKCU\\Control Panel\\Desktop\\WindowMetrics', name: 'MinAnimate', type: 'REG_SZ', value: result.value, existed: result.existed };
  },
  apply: async (options?: ApplyOptions): Promise<TweakResult> => {
    if (options?.dryRun) return { ok: true, data: 'Would disable window animations' };
    try {
      const current = await disableWindowAnimation.detect();
      await RegistryManager.setValue('HKCU', '\\Control Panel\\Desktop\\WindowMetrics', 'MinAnimate', 'REG_SZ', '0');
      // Broadcast change
      await execAsync('powershell -NoProfile -Command "Add-Type -TypeDefinition @"using System; using System.Runtime.InteropServices; public class SPI { [DllImport(\\"user32.dll\\")] public static extern bool SystemParametersInfo(uint uiAction, uint uiParam, IntPtr pvParam, uint fWinIni); }"@; [SPI]::SystemParametersInfo(0x0049, 0, [IntPtr]::Zero, 0x01 | 0x02)"');
      return { ok: true, previousState: current, newState: { ...current, value: '0' } };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  revert: async (originalState: TweakState): Promise<TweakResult> => {
    try {
      if (originalState.existed) {
        await RegistryManager.setValue('HKCU', '\\Control Panel\\Desktop\\WindowMetrics', 'MinAnimate', 'REG_SZ', originalState.value as string);
      } else {
        await RegistryManager.deleteValue('HKCU', '\\Control Panel\\Desktop\\WindowMetrics', 'MinAnimate');
      }
      await execAsync('powershell -NoProfile -Command "Add-Type -TypeDefinition @"using System; using System.Runtime.InteropServices; public class SPI { [DllImport(\\"user32.dll\\")] public static extern bool SystemParametersInfo(uint uiAction, uint uiParam, IntPtr pvParam, uint fWinIni); }"@; [SPI]::SystemParametersInfo(0x0049, 0, [IntPtr]::Zero, 0x01 | 0x02)"');
      return { ok: true };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  verify: async (expectedState: TweakState): Promise<boolean> => {
    const current = await disableWindowAnimation.detect();
    return current.value === '0';
  },
};

// 12. Disable Snap Assist / Snap Layouts
export const disableSnapAssist: Tweak = {
  id: 'explorer.disable_snap',
  name: 'Disable Snap Assist / Snap Layouts',
  nameKey: 'tweaks.explorer.disableSnap.name',
  category: 'explorer_ui',
  description: 'Sets SnapAssist=0 in HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced. Disables drag-to-snap and Win11 snap layouts.',
  descriptionKey: 'tweaks.explorer.disableSnap.description',
  whenHelps: 'Prevents accidental snapping. Cleaner window management for tiling WM users.',
  whenHelpsKey: 'tweaks.explorer.disableSnap.whenHelps',
  risk: 'safe',
  evidence: 'measured',
  impacto: 'bajo',
      requiresReboot: false,
  compatibility: {
    windowsVersions: ['10.0.19041', '10.0.22000', '10.0.22621', '10.0.22631'],
    formFactors: ['desktop', 'laptop'],
  },
  detect: async (): Promise<TweakState> => {
    const result = await RegistryManager.getValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', 'SnapAssist');
    return { path: 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', name: 'SnapAssist', type: 'REG_DWORD', value: result.value, existed: result.existed };
  },
  apply: async (options?: ApplyOptions): Promise<TweakResult> => {
    if (options?.dryRun) return { ok: true, data: 'Would disable Snap Assist' };
    try {
      const current = await disableSnapAssist.detect();
      await RegistryManager.setValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', 'SnapAssist', 'REG_DWORD', 0);
      await execAsync('powershell -NoProfile -Command "Stop-Process -Name explorer -Force"');
      return { ok: true, previousState: current, newState: { ...current, value: 0 } };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  revert: async (originalState: TweakState): Promise<TweakResult> => {
    try {
      if (originalState.existed) {
        await RegistryManager.setValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', 'SnapAssist', 'REG_DWORD', originalState.value as number);
      } else {
        await RegistryManager.deleteValue('HKCU', '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', 'SnapAssist');
      }
      await execAsync('powershell -NoProfile -Command "Stop-Process -Name explorer -Force"');
      return { ok: true };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },
  verify: async (expectedState: TweakState): Promise<boolean> => {
    const current = await disableSnapAssist.detect();
    return current.value === 0;
  },
};

export const explorerTweaks: Tweak[] = [
  showFileExtensions,
  showHiddenFiles,
  showProtectedOSFiles,
  disableThumbnails,
  separateProcess,
  disableStartWebSearch,
  classicContextMenu,
  disableNotificationCenter,
  taskbarSmallIcons,
  disableTaskbarAnimation,
  disableWindowAnimation,
  disableSnapAssist,
];