import type { Profile, HardwareProfile, Settings, GameProfile, OverlayConfig, SpiderState } from '../../shared/types/all';
import type { DiagnosisProgress, BeforeAfterMetrics } from '../../shared/types/diagnosis';
declare const ipcChannels: {
    readonly 'tweak:list': () => Promise<any>;
    readonly 'tweak:get': (tweakId: string) => Promise<any>;
    readonly 'tweak:detect': (tweakId: string) => Promise<any>;
    readonly 'tweak:apply': (tweakId: string, options?: {
        dryRun?: boolean;
        force?: boolean;
    }) => Promise<any>;
    readonly 'tweak:revert': (tweakId: string, originalState: any) => Promise<any>;
    readonly 'tweak:verify': (tweakId: string, expectedState: any) => Promise<any>;
    readonly 'profile:list': () => Promise<any>;
    readonly 'profile:get': (id: string) => Promise<any>;
    readonly 'profile:create': (profile: Omit<Profile, "id" | "createdAt" | "updatedAt">) => Promise<any>;
    readonly 'profile:apply': (id: string, options?: {
        dryRun?: boolean;
        force?: boolean;
    }) => Promise<any>;
    readonly 'profile:import': (json: string) => Promise<any>;
    readonly 'profile:export': (id: string) => Promise<any>;
    readonly 'system:hardware': () => Promise<any>;
    readonly 'system:preflight': () => Promise<any>;
    readonly 'system:backup': () => Promise<any>;
    readonly 'system:restore': (manifestId: string) => Promise<any>;
    readonly 'system:journal': () => Promise<any>;
    readonly 'system:backups': () => Promise<any>;
    readonly 'game:list': () => Promise<any>;
    readonly 'game:detect': () => Promise<any>;
    readonly 'game:create': (profile: Omit<GameProfile, "id" | "createdAt" | "updatedAt">) => Promise<any>;
    readonly 'game:start': (gameId: string) => Promise<any>;
    readonly 'game:stop': (gameId: string) => Promise<any>;
    readonly 'benchmark:run': (tweakId?: string, profileId?: string) => Promise<any>;
    readonly 'benchmark:results': () => Promise<any>;
    readonly 'settings:get': () => Promise<any>;
    readonly 'settings:set': (settings: Partial<Settings>) => Promise<any>;
    readonly 'overlay:show': () => Promise<any>;
    readonly 'overlay:hide': () => Promise<any>;
    readonly 'overlay:config': (config: Partial<OverlayConfig>) => Promise<any>;
    readonly 'spider:scan': () => Promise<any>;
    readonly 'spider:idle': () => Promise<any>;
    readonly 'dialog:openExternal': (url: string) => Promise<any>;
    readonly 'dialog:showMessageBox': (options: any) => Promise<any>;
    readonly 'stats:get': () => Promise<any>;
    readonly 'tweaks:filterByHardware': (hardware: HardwareProfile) => Promise<any>;
    readonly 'recovery:generateScript': () => Promise<any>;
    readonly 'diagnosis:run': () => Promise<any>;
    readonly 'diagnosis:getReport': () => Promise<any>;
    readonly 'diagnosis:fixProblem': (problemId: string) => Promise<any>;
    readonly 'diagnosis:runABTest': (before: BeforeAfterMetrics) => Promise<any>;
    readonly 'on:diagnosisProgress': (callback: (progress: DiagnosisProgress) => void) => () => Electron.IpcRenderer;
    readonly 'on:themeChanged': (callback: (theme: string) => void) => () => Electron.IpcRenderer;
    readonly 'on:gameStateChanged': (callback: (game: GameProfile | null) => void) => () => Electron.IpcRenderer;
    readonly 'on:overlayUpdate': (callback: (data: any) => void) => () => Electron.IpcRenderer;
    readonly 'on:spiderUpdate': (callback: (state: SpiderState) => void) => () => Electron.IpcRenderer;
    readonly 'on:benchmarkProgress': (callback: (progress: {
        stage: string;
        progress: number;
    }) => void) => () => Electron.IpcRenderer;
};
declare global {
    interface Window {
        zerotweaks: typeof ipcChannels;
    }
}
export {};
//# sourceMappingURL=index.d.ts.map