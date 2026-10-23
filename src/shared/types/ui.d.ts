export interface OverlayConfig {
    enabled: boolean;
    position: {
        x: number;
        y: number;
    };
    scale: number;
    opacity: number;
    clickThrough: boolean;
    modules: OverlayModule[];
    globalHotkey: string;
}
export type OverlayModule = 'cpu' | 'ram' | 'gpu' | 'ping' | 'timer' | 'fps' | 'temperature';
export interface SpiderState {
    mode: 'idle' | 'scan' | 'done' | 'error';
    currentTarget?: HTMLElement;
    position: {
        x: number;
        y: number;
    };
    legs: SpiderLeg[];
}
export interface SpiderLeg {
    segments: {
        x: number;
        y: number;
    }[];
    target: {
        x: number;
        y: number;
    };
    phase: number;
}
export type Language = 'es' | 'en' | 'pt' | 'fr' | 'de';
export interface Settings {
    language: Language;
    theme: 'dark' | 'light' | 'system';
    autoStart: boolean;
    minimizeToTray: boolean;
    checkUpdates: boolean;
    telemetryOptIn: boolean;
    dryRunDefault: boolean;
    batterySaverMode: boolean;
    gameModeAuto: boolean;
    overlay: OverlayConfig;
    backupRetentionDays: number;
    maxLogSize: number;
}
//# sourceMappingURL=ui.d.ts.map