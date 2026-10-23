export interface GameProfile {
    id: string;
    name: string;
    executable: string;
    steamId?: string;
    epicId?: string;
    customArgs?: string;
    tweaks: GameTweakConfig;
    autoApply: boolean;
    createdAt: string;
    updatedAt: string;
}
export interface GameTweakConfig {
    powerPlan: 'ultimate' | 'high' | 'balanced' | 'custom';
    timerResolution: number;
    cpuPriority: 'high' | 'realtime' | 'normal';
    gameMode: boolean;
    gameDVR: boolean;
    notifications: boolean;
    suspendedProcesses: string[];
    gpuProfile: GpuProfileConfig;
}
export interface GpuProfileConfig {
    nvidia?: NvidiaSettings;
    amd?: AmdSettings;
    intel?: IntelSettings;
    common?: CommonGpuSettings;
}
export interface NvidiaSettings {
    lowLatencyMode: 'off' | 'on' | 'ultra';
    powerManagement: 'max_performance' | 'optimal' | 'adaptive';
    shaderCache: 'on' | 'off' | 'driver_default';
    textureFiltering: 'high_performance' | 'quality' | 'driver_default';
    reflex: 'on' | 'off' | 'on_plus_boost';
}
export interface AmdSettings {
    antiLag: boolean;
    chill: {
        minFps: number;
        maxFps: number;
    } | null;
    shaderCache: boolean;
}
export interface IntelSettings {
    powerMode: 'max_performance' | 'balanced' | 'power_saver';
}
export interface CommonGpuSettings {
    hags: boolean;
    gpuPreference: 'high_performance' | 'power_saving' | 'auto';
    fullscreenOptimizations: boolean;
    mpo: boolean;
    vrr: boolean;
}
//# sourceMappingURL=game.d.ts.map