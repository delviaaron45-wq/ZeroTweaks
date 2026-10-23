export interface Tweak {
    id: string;
    name: string;
    category: TweakCategory;
    description: string;
    whenHelps: string;
    risk: RiskLevel;
    evidence: EvidenceLevel;
    /** Expected impact on this machine. ALTO/MEDIO/BAJO. */
    impacto: ImpactLevel;
    requiresReboot: boolean;
    compatibility: Compatibility;
    detect: () => Promise<TweakState>;
    apply: (options?: ApplyOptions) => Promise<TweakResult>;
    revert: (originalState: TweakState) => Promise<TweakResult>;
    verify: (expectedState: TweakState) => Promise<boolean>;
}
export type TweakCategory = 'system_performance' | 'gaming_fps' | 'gpu' | 'network_tcp' | 'peripherals_input' | 'power_cpu' | 'ram_storage' | 'debloat_apps' | 'privacy_telemetry' | 'services' | 'explorer_ui';
export type RiskLevel = 'safe' | 'moderate' | 'advanced';
export type EvidenceLevel = 'measured' | 'debated' | 'placebo';
export type ImpactLevel = 'alto' | 'medio' | 'bajo';
export interface Compatibility {
    windowsVersions: string[];
    formFactors: ('desktop' | 'laptop')[];
    cpuVendors?: ('Intel' | 'AMD')[];
    gpuVendors?: ('NVIDIA' | 'AMD' | 'Intel')[];
}
export interface TweakState {
    path: string;
    name: string;
    type: RegistryType;
    value: unknown;
    existed: boolean;
}
export type RegistryType = 'REG_SZ' | 'REG_DWORD' | 'REG_QWORD' | 'REG_BINARY' | 'REG_MULTI_SZ' | 'REG_EXPAND_SZ';
export interface ApplyOptions {
    dryRun?: boolean;
    force?: boolean;
}
export interface TweakResult {
    ok: boolean;
    data?: unknown;
    error?: string;
    previousState?: TweakState;
    newState?: TweakState;
}
export interface Profile {
    id: string;
    name: string;
    description: string;
    tweaks: string[];
    hardwareProfile?: HardwareProfile;
    createdAt: string;
    updatedAt: string;
    signature?: string;
}
export interface HardwareProfile {
    cpu: CpuInfo;
    gpu: GpuInfo;
    memory: MemoryInfo;
    storage: StorageInfo[];
    network: NetworkInfo;
    windowsVersion: WindowsVersion;
    isLaptop: boolean;
    hasBitLocker: boolean;
}
export interface CpuInfo {
    vendor: 'Intel' | 'AMD' | 'Unknown';
    model: string;
    cores: number;
    threads: number;
    baseClock: number;
    maxClock: number;
    architecture: string;
}
export interface GpuInfo {
    vendor: 'NVIDIA' | 'AMD' | 'Intel' | 'Unknown';
    model: string;
    driverVersion: string;
    vram: number;
    supportsHAGS: boolean;
    supportsResizableBAR: boolean;
}
export interface MemoryInfo {
    total: number;
    speed: number;
    type: string;
    channels: number;
}
export interface StorageInfo {
    deviceId: string;
    model: string;
    type: 'SSD' | 'HDD' | 'NVMe';
    size: number;
    smartStatus: string;
}
export interface NetworkInfo {
    adapterName: string;
    macAddress: string;
    speed: number;
    driverVersion: string;
}
export interface WindowsVersion {
    version: string;
    build: number;
    edition: 'Home' | 'Pro' | 'Enterprise' | 'Education' | 'Unknown';
    isInsider: boolean;
}
//# sourceMappingURL=index.d.ts.map