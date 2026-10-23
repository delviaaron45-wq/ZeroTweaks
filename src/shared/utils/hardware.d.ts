export interface HardwareInfo {
    cpu: CpuInfo;
    gpu: GpuInfo;
    memory: MemoryInfo;
    storage: StorageInfo[];
    network: NetworkInfo[];
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
export declare function detectHardware(): Promise<HardwareInfo>;
//# sourceMappingURL=hardware.d.ts.map