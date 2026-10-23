"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Preload script - Secure IPC bridge
const electron_1 = require("electron");
// Type-safe IPC channel definitions
const ipcChannels = {
    // Tweaks
    'tweak:list': () => electron_1.ipcRenderer.invoke('tweak:list'),
    'tweak:get': (tweakId) => electron_1.ipcRenderer.invoke('tweak:get', { tweakId }),
    'tweak:detect': (tweakId) => electron_1.ipcRenderer.invoke('tweak:detect', { tweakId }),
    'tweak:apply': (tweakId, options) => electron_1.ipcRenderer.invoke('tweak:apply', { tweakId, options }),
    'tweak:revert': (tweakId, originalState) => electron_1.ipcRenderer.invoke('tweak:revert', { tweakId, originalState }),
    'tweak:verify': (tweakId, expectedState) => electron_1.ipcRenderer.invoke('tweak:verify', { tweakId, expectedState }),
    // Profiles
    'profile:list': () => electron_1.ipcRenderer.invoke('profile:list'),
    'profile:get': (id) => electron_1.ipcRenderer.invoke('profile:get', { id }),
    'profile:create': (profile) => electron_1.ipcRenderer.invoke('profile:create', { profile }),
    'profile:apply': (id, options) => electron_1.ipcRenderer.invoke('profile:apply', { id, options }),
    'profile:import': (json) => electron_1.ipcRenderer.invoke('profile:import', { json }),
    'profile:export': (id) => electron_1.ipcRenderer.invoke('profile:export', { id }),
    // System
    'system:hardware': () => electron_1.ipcRenderer.invoke('system:hardware'),
    'system:preflight': () => electron_1.ipcRenderer.invoke('system:preflight'),
    'system:backup': () => electron_1.ipcRenderer.invoke('system:backup'),
    'system:restore': (manifestId) => electron_1.ipcRenderer.invoke('system:restore', { manifestId }),
    'system:journal': () => electron_1.ipcRenderer.invoke('system:journal'),
    'system:backups': () => electron_1.ipcRenderer.invoke('system:backups'),
    // Game Mode
    'game:list': () => electron_1.ipcRenderer.invoke('game:list'),
    'game:detect': () => electron_1.ipcRenderer.invoke('game:detect'),
    'game:create': (profile) => electron_1.ipcRenderer.invoke('game:create', { profile }),
    'game:start': (gameId) => electron_1.ipcRenderer.invoke('game:start', { gameId }),
    'game:stop': (gameId) => electron_1.ipcRenderer.invoke('game:stop', { gameId }),
    // Benchmark
    'benchmark:run': (tweakId, profileId) => electron_1.ipcRenderer.invoke('benchmark:run', { tweakId, profileId }),
    'benchmark:results': () => electron_1.ipcRenderer.invoke('benchmark:results'),
    // Settings
    'settings:get': () => electron_1.ipcRenderer.invoke('settings:get'),
    'settings:set': (settings) => electron_1.ipcRenderer.invoke('settings:set', { settings }),
    // Overlay
    'overlay:show': () => electron_1.ipcRenderer.invoke('overlay:show'),
    'overlay:hide': () => electron_1.ipcRenderer.invoke('overlay:hide'),
    'overlay:config': (config) => electron_1.ipcRenderer.invoke('overlay:config', { config }),
    // Spider
    'spider:scan': () => electron_1.ipcRenderer.invoke('spider:scan'),
    'spider:idle': () => electron_1.ipcRenderer.invoke('spider:idle'),
    // Utils
    'dialog:openExternal': (url) => electron_1.ipcRenderer.invoke('dialog:openExternal', { url }),
    'dialog:showMessageBox': (options) => electron_1.ipcRenderer.invoke('dialog:showMessageBox', options),
    'stats:get': () => electron_1.ipcRenderer.invoke('stats:get'),
    'tweaks:filterByHardware': (hardware) => electron_1.ipcRenderer.invoke('tweaks:filterByHardware', { hardware }),
    'recovery:generateScript': () => electron_1.ipcRenderer.invoke('recovery:generateScript'),
    // Diagnosis
    'diagnosis:run': () => electron_1.ipcRenderer.invoke('diagnosis:run'),
    'diagnosis:getReport': () => electron_1.ipcRenderer.invoke('diagnosis:getReport'),
    'diagnosis:fixProblem': (problemId) => electron_1.ipcRenderer.invoke('diagnosis:fixProblem', { problemId }),
    'diagnosis:runABTest': (before) => electron_1.ipcRenderer.invoke('diagnosis:runABTest', { before }),
    'on:diagnosisProgress': (callback) => {
        electron_1.ipcRenderer.on('diagnosis:progress', (_event, progress) => callback(progress));
        return () => electron_1.ipcRenderer.removeAllListeners('diagnosis:progress');
    },
    // Events
    'on:themeChanged': (callback) => {
        electron_1.ipcRenderer.on('theme:changed', (_event, theme) => callback(theme));
        return () => electron_1.ipcRenderer.removeAllListeners('theme:changed');
    },
    'on:gameStateChanged': (callback) => {
        electron_1.ipcRenderer.on('game:state-changed', (_event, game) => callback(game));
        return () => electron_1.ipcRenderer.removeAllListeners('game:state-changed');
    },
    'on:overlayUpdate': (callback) => {
        electron_1.ipcRenderer.on('overlay:update', (_event, data) => callback(data));
        return () => electron_1.ipcRenderer.removeAllListeners('overlay:update');
    },
    'on:spiderUpdate': (callback) => {
        electron_1.ipcRenderer.on('spider:update', (_event, state) => callback(state));
        return () => electron_1.ipcRenderer.removeAllListeners('spider:update');
    },
    'on:benchmarkProgress': (callback) => {
        electron_1.ipcRenderer.on('benchmark:progress', (_event, progress) => callback(progress));
        return () => electron_1.ipcRenderer.removeAllListeners('benchmark:progress');
    },
};
// Expose API to renderer
electron_1.contextBridge.exposeInMainWorld('zerotweaks', {
    tweaks: ipcChannels,
    profiles: ipcChannels,
    system: ipcChannels,
    game: ipcChannels,
    benchmark: ipcChannels,
    settings: ipcChannels,
    overlay: ipcChannels,
    spider: ipcChannels,
    utils: ipcChannels,
    diagnosis: {
        run: ipcChannels['diagnosis:run'],
        getReport: ipcChannels['diagnosis:getReport'],
        fixProblem: ipcChannels['diagnosis:fixProblem'],
        runABTest: ipcChannels['diagnosis:runABTest'],
        onProgress: ipcChannels['on:diagnosisProgress'],
    },
});
//# sourceMappingURL=index.js.map