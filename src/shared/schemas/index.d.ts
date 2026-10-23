import { z } from 'zod';
export declare const TweakStateSchema: z.ZodObject<{
    path: z.ZodString;
    name: z.ZodString;
    type: z.ZodEnum<["REG_SZ", "REG_DWORD", "REG_QWORD", "REG_BINARY", "REG_MULTI_SZ", "REG_EXPAND_SZ"]>;
    value: z.ZodUnknown;
    existed: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    type: "REG_SZ" | "REG_DWORD" | "REG_QWORD" | "REG_BINARY" | "REG_MULTI_SZ" | "REG_EXPAND_SZ";
    existed: boolean;
    name: string;
    path: string;
    value?: unknown;
}, {
    type: "REG_SZ" | "REG_DWORD" | "REG_QWORD" | "REG_BINARY" | "REG_MULTI_SZ" | "REG_EXPAND_SZ";
    existed: boolean;
    name: string;
    path: string;
    value?: unknown;
}>;
export declare const ApplyOptionsSchema: z.ZodObject<{
    dryRun: z.ZodOptional<z.ZodBoolean>;
    force: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    force?: boolean | undefined;
    dryRun?: boolean | undefined;
}, {
    force?: boolean | undefined;
    dryRun?: boolean | undefined;
}>;
export declare const TweakResultSchema: z.ZodObject<{
    ok: z.ZodBoolean;
    data: z.ZodOptional<z.ZodUnknown>;
    error: z.ZodOptional<z.ZodString>;
    previousState: z.ZodOptional<z.ZodObject<{
        path: z.ZodString;
        name: z.ZodString;
        type: z.ZodEnum<["REG_SZ", "REG_DWORD", "REG_QWORD", "REG_BINARY", "REG_MULTI_SZ", "REG_EXPAND_SZ"]>;
        value: z.ZodUnknown;
        existed: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        type: "REG_SZ" | "REG_DWORD" | "REG_QWORD" | "REG_BINARY" | "REG_MULTI_SZ" | "REG_EXPAND_SZ";
        existed: boolean;
        name: string;
        path: string;
        value?: unknown;
    }, {
        type: "REG_SZ" | "REG_DWORD" | "REG_QWORD" | "REG_BINARY" | "REG_MULTI_SZ" | "REG_EXPAND_SZ";
        existed: boolean;
        name: string;
        path: string;
        value?: unknown;
    }>>;
    newState: z.ZodOptional<z.ZodObject<{
        path: z.ZodString;
        name: z.ZodString;
        type: z.ZodEnum<["REG_SZ", "REG_DWORD", "REG_QWORD", "REG_BINARY", "REG_MULTI_SZ", "REG_EXPAND_SZ"]>;
        value: z.ZodUnknown;
        existed: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        type: "REG_SZ" | "REG_DWORD" | "REG_QWORD" | "REG_BINARY" | "REG_MULTI_SZ" | "REG_EXPAND_SZ";
        existed: boolean;
        name: string;
        path: string;
        value?: unknown;
    }, {
        type: "REG_SZ" | "REG_DWORD" | "REG_QWORD" | "REG_BINARY" | "REG_MULTI_SZ" | "REG_EXPAND_SZ";
        existed: boolean;
        name: string;
        path: string;
        value?: unknown;
    }>>;
}, "strip", z.ZodTypeAny, {
    ok: boolean;
    error?: string | undefined;
    data?: unknown;
    previousState?: {
        type: "REG_SZ" | "REG_DWORD" | "REG_QWORD" | "REG_BINARY" | "REG_MULTI_SZ" | "REG_EXPAND_SZ";
        existed: boolean;
        name: string;
        path: string;
        value?: unknown;
    } | undefined;
    newState?: {
        type: "REG_SZ" | "REG_DWORD" | "REG_QWORD" | "REG_BINARY" | "REG_MULTI_SZ" | "REG_EXPAND_SZ";
        existed: boolean;
        name: string;
        path: string;
        value?: unknown;
    } | undefined;
}, {
    ok: boolean;
    error?: string | undefined;
    data?: unknown;
    previousState?: {
        type: "REG_SZ" | "REG_DWORD" | "REG_QWORD" | "REG_BINARY" | "REG_MULTI_SZ" | "REG_EXPAND_SZ";
        existed: boolean;
        name: string;
        path: string;
        value?: unknown;
    } | undefined;
    newState?: {
        type: "REG_SZ" | "REG_DWORD" | "REG_QWORD" | "REG_BINARY" | "REG_MULTI_SZ" | "REG_EXPAND_SZ";
        existed: boolean;
        name: string;
        path: string;
        value?: unknown;
    } | undefined;
}>;
export declare const CompatibilitySchema: z.ZodObject<{
    windowsVersions: z.ZodArray<z.ZodString, "many">;
    formFactors: z.ZodArray<z.ZodEnum<["desktop", "laptop"]>, "many">;
    cpuVendors: z.ZodOptional<z.ZodArray<z.ZodEnum<["Intel", "AMD"]>, "many">>;
    gpuVendors: z.ZodOptional<z.ZodArray<z.ZodEnum<["NVIDIA", "AMD", "Intel"]>, "many">>;
}, "strip", z.ZodTypeAny, {
    windowsVersions: string[];
    formFactors: ("desktop" | "laptop")[];
    cpuVendors?: ("Intel" | "AMD")[] | undefined;
    gpuVendors?: ("Intel" | "AMD" | "NVIDIA")[] | undefined;
}, {
    windowsVersions: string[];
    formFactors: ("desktop" | "laptop")[];
    cpuVendors?: ("Intel" | "AMD")[] | undefined;
    gpuVendors?: ("Intel" | "AMD" | "NVIDIA")[] | undefined;
}>;
export declare const TweakSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    category: z.ZodEnum<["system_performance", "gaming_fps", "gpu", "network_tcp", "peripherals_input", "power_cpu", "ram_storage", "debloat_apps", "privacy_telemetry", "services", "explorer_ui"]>;
    description: z.ZodString;
    whenHelps: z.ZodString;
    risk: z.ZodEnum<["safe", "moderate", "advanced"]>;
    evidence: z.ZodEnum<["measured", "debated", "placebo"]>;
    requiresReboot: z.ZodBoolean;
    compatibility: z.ZodObject<{
        windowsVersions: z.ZodArray<z.ZodString, "many">;
        formFactors: z.ZodArray<z.ZodEnum<["desktop", "laptop"]>, "many">;
        cpuVendors: z.ZodOptional<z.ZodArray<z.ZodEnum<["Intel", "AMD"]>, "many">>;
        gpuVendors: z.ZodOptional<z.ZodArray<z.ZodEnum<["NVIDIA", "AMD", "Intel"]>, "many">>;
    }, "strip", z.ZodTypeAny, {
        windowsVersions: string[];
        formFactors: ("desktop" | "laptop")[];
        cpuVendors?: ("Intel" | "AMD")[] | undefined;
        gpuVendors?: ("Intel" | "AMD" | "NVIDIA")[] | undefined;
    }, {
        windowsVersions: string[];
        formFactors: ("desktop" | "laptop")[];
        cpuVendors?: ("Intel" | "AMD")[] | undefined;
        gpuVendors?: ("Intel" | "AMD" | "NVIDIA")[] | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    category: "system_performance" | "gaming_fps" | "gpu" | "network_tcp" | "peripherals_input" | "power_cpu" | "ram_storage" | "debloat_apps" | "privacy_telemetry" | "services" | "explorer_ui";
    description: string;
    whenHelps: string;
    risk: "safe" | "moderate" | "advanced";
    evidence: "measured" | "debated" | "placebo";
    requiresReboot: boolean;
    compatibility: {
        windowsVersions: string[];
        formFactors: ("desktop" | "laptop")[];
        cpuVendors?: ("Intel" | "AMD")[] | undefined;
        gpuVendors?: ("Intel" | "AMD" | "NVIDIA")[] | undefined;
    };
}, {
    id: string;
    name: string;
    category: "system_performance" | "gaming_fps" | "gpu" | "network_tcp" | "peripherals_input" | "power_cpu" | "ram_storage" | "debloat_apps" | "privacy_telemetry" | "services" | "explorer_ui";
    description: string;
    whenHelps: string;
    risk: "safe" | "moderate" | "advanced";
    evidence: "measured" | "debated" | "placebo";
    requiresReboot: boolean;
    compatibility: {
        windowsVersions: string[];
        formFactors: ("desktop" | "laptop")[];
        cpuVendors?: ("Intel" | "AMD")[] | undefined;
        gpuVendors?: ("Intel" | "AMD" | "NVIDIA")[] | undefined;
    };
}>;
export declare const CpuInfoSchema: z.ZodObject<{
    vendor: z.ZodEnum<["Intel", "AMD", "Unknown"]>;
    model: z.ZodString;
    cores: z.ZodNumber;
    threads: z.ZodNumber;
    baseClock: z.ZodNumber;
    maxClock: z.ZodNumber;
    architecture: z.ZodString;
}, "strip", z.ZodTypeAny, {
    vendor: "Intel" | "AMD" | "Unknown";
    model: string;
    cores: number;
    threads: number;
    baseClock: number;
    maxClock: number;
    architecture: string;
}, {
    vendor: "Intel" | "AMD" | "Unknown";
    model: string;
    cores: number;
    threads: number;
    baseClock: number;
    maxClock: number;
    architecture: string;
}>;
export declare const GpuInfoSchema: z.ZodObject<{
    vendor: z.ZodEnum<["NVIDIA", "AMD", "Intel", "Unknown"]>;
    model: z.ZodString;
    driverVersion: z.ZodString;
    vram: z.ZodNumber;
    supportsHAGS: z.ZodBoolean;
    supportsResizableBAR: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    vendor: "Intel" | "AMD" | "NVIDIA" | "Unknown";
    model: string;
    driverVersion: string;
    vram: number;
    supportsResizableBAR: boolean;
    supportsHAGS: boolean;
}, {
    vendor: "Intel" | "AMD" | "NVIDIA" | "Unknown";
    model: string;
    driverVersion: string;
    vram: number;
    supportsResizableBAR: boolean;
    supportsHAGS: boolean;
}>;
export declare const MemoryInfoSchema: z.ZodObject<{
    total: z.ZodNumber;
    speed: z.ZodNumber;
    type: z.ZodString;
    channels: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    type: string;
    total: number;
    speed: number;
    channels: number;
}, {
    type: string;
    total: number;
    speed: number;
    channels: number;
}>;
export declare const StorageInfoSchema: z.ZodObject<{
    deviceId: z.ZodString;
    model: z.ZodString;
    type: z.ZodEnum<["SSD", "HDD", "NVMe"]>;
    size: z.ZodNumber;
    smartStatus: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "SSD" | "HDD" | "NVMe";
    model: string;
    deviceId: string;
    size: number;
    smartStatus: string;
}, {
    type: "SSD" | "HDD" | "NVMe";
    model: string;
    deviceId: string;
    size: number;
    smartStatus: string;
}>;
export declare const NetworkInfoSchema: z.ZodObject<{
    adapterName: z.ZodString;
    macAddress: z.ZodString;
    speed: z.ZodNumber;
    driverVersion: z.ZodString;
}, "strip", z.ZodTypeAny, {
    driverVersion: string;
    speed: number;
    adapterName: string;
    macAddress: string;
}, {
    driverVersion: string;
    speed: number;
    adapterName: string;
    macAddress: string;
}>;
export declare const WindowsVersionSchema: z.ZodObject<{
    version: z.ZodString;
    build: z.ZodNumber;
    edition: z.ZodEnum<["Home", "Pro", "Enterprise", "Education", "Unknown"]>;
    isInsider: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    version: string;
    build: number;
    edition: "Unknown" | "Home" | "Pro" | "Enterprise" | "Education";
    isInsider: boolean;
}, {
    version: string;
    build: number;
    edition: "Unknown" | "Home" | "Pro" | "Enterprise" | "Education";
    isInsider: boolean;
}>;
export declare const HardwareProfileSchema: z.ZodObject<{
    cpu: z.ZodObject<{
        vendor: z.ZodEnum<["Intel", "AMD", "Unknown"]>;
        model: z.ZodString;
        cores: z.ZodNumber;
        threads: z.ZodNumber;
        baseClock: z.ZodNumber;
        maxClock: z.ZodNumber;
        architecture: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        vendor: "Intel" | "AMD" | "Unknown";
        model: string;
        cores: number;
        threads: number;
        baseClock: number;
        maxClock: number;
        architecture: string;
    }, {
        vendor: "Intel" | "AMD" | "Unknown";
        model: string;
        cores: number;
        threads: number;
        baseClock: number;
        maxClock: number;
        architecture: string;
    }>;
    gpu: z.ZodObject<{
        vendor: z.ZodEnum<["NVIDIA", "AMD", "Intel", "Unknown"]>;
        model: z.ZodString;
        driverVersion: z.ZodString;
        vram: z.ZodNumber;
        supportsHAGS: z.ZodBoolean;
        supportsResizableBAR: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        vendor: "Intel" | "AMD" | "NVIDIA" | "Unknown";
        model: string;
        driverVersion: string;
        vram: number;
        supportsResizableBAR: boolean;
        supportsHAGS: boolean;
    }, {
        vendor: "Intel" | "AMD" | "NVIDIA" | "Unknown";
        model: string;
        driverVersion: string;
        vram: number;
        supportsResizableBAR: boolean;
        supportsHAGS: boolean;
    }>;
    memory: z.ZodObject<{
        total: z.ZodNumber;
        speed: z.ZodNumber;
        type: z.ZodString;
        channels: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        type: string;
        total: number;
        speed: number;
        channels: number;
    }, {
        type: string;
        total: number;
        speed: number;
        channels: number;
    }>;
    storage: z.ZodArray<z.ZodObject<{
        deviceId: z.ZodString;
        model: z.ZodString;
        type: z.ZodEnum<["SSD", "HDD", "NVMe"]>;
        size: z.ZodNumber;
        smartStatus: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: "SSD" | "HDD" | "NVMe";
        model: string;
        deviceId: string;
        size: number;
        smartStatus: string;
    }, {
        type: "SSD" | "HDD" | "NVMe";
        model: string;
        deviceId: string;
        size: number;
        smartStatus: string;
    }>, "many">;
    network: z.ZodObject<{
        adapterName: z.ZodString;
        macAddress: z.ZodString;
        speed: z.ZodNumber;
        driverVersion: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        driverVersion: string;
        speed: number;
        adapterName: string;
        macAddress: string;
    }, {
        driverVersion: string;
        speed: number;
        adapterName: string;
        macAddress: string;
    }>;
    windowsVersion: z.ZodObject<{
        version: z.ZodString;
        build: z.ZodNumber;
        edition: z.ZodEnum<["Home", "Pro", "Enterprise", "Education", "Unknown"]>;
        isInsider: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        version: string;
        build: number;
        edition: "Unknown" | "Home" | "Pro" | "Enterprise" | "Education";
        isInsider: boolean;
    }, {
        version: string;
        build: number;
        edition: "Unknown" | "Home" | "Pro" | "Enterprise" | "Education";
        isInsider: boolean;
    }>;
    isLaptop: z.ZodBoolean;
    hasBitLocker: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    gpu: {
        vendor: "Intel" | "AMD" | "NVIDIA" | "Unknown";
        model: string;
        driverVersion: string;
        vram: number;
        supportsResizableBAR: boolean;
        supportsHAGS: boolean;
    };
    cpu: {
        vendor: "Intel" | "AMD" | "Unknown";
        model: string;
        cores: number;
        threads: number;
        baseClock: number;
        maxClock: number;
        architecture: string;
    };
    memory: {
        type: string;
        total: number;
        speed: number;
        channels: number;
    };
    storage: {
        type: "SSD" | "HDD" | "NVMe";
        model: string;
        deviceId: string;
        size: number;
        smartStatus: string;
    }[];
    network: {
        driverVersion: string;
        speed: number;
        adapterName: string;
        macAddress: string;
    };
    windowsVersion: {
        version: string;
        build: number;
        edition: "Unknown" | "Home" | "Pro" | "Enterprise" | "Education";
        isInsider: boolean;
    };
    isLaptop: boolean;
    hasBitLocker: boolean;
}, {
    gpu: {
        vendor: "Intel" | "AMD" | "NVIDIA" | "Unknown";
        model: string;
        driverVersion: string;
        vram: number;
        supportsResizableBAR: boolean;
        supportsHAGS: boolean;
    };
    cpu: {
        vendor: "Intel" | "AMD" | "Unknown";
        model: string;
        cores: number;
        threads: number;
        baseClock: number;
        maxClock: number;
        architecture: string;
    };
    memory: {
        type: string;
        total: number;
        speed: number;
        channels: number;
    };
    storage: {
        type: "SSD" | "HDD" | "NVMe";
        model: string;
        deviceId: string;
        size: number;
        smartStatus: string;
    }[];
    network: {
        driverVersion: string;
        speed: number;
        adapterName: string;
        macAddress: string;
    };
    windowsVersion: {
        version: string;
        build: number;
        edition: "Unknown" | "Home" | "Pro" | "Enterprise" | "Education";
        isInsider: boolean;
    };
    isLaptop: boolean;
    hasBitLocker: boolean;
}>;
export declare const ProfileSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodString;
    tweaks: z.ZodArray<z.ZodString, "many">;
    hardwareProfile: z.ZodOptional<z.ZodObject<{
        cpu: z.ZodObject<{
            vendor: z.ZodEnum<["Intel", "AMD", "Unknown"]>;
            model: z.ZodString;
            cores: z.ZodNumber;
            threads: z.ZodNumber;
            baseClock: z.ZodNumber;
            maxClock: z.ZodNumber;
            architecture: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            vendor: "Intel" | "AMD" | "Unknown";
            model: string;
            cores: number;
            threads: number;
            baseClock: number;
            maxClock: number;
            architecture: string;
        }, {
            vendor: "Intel" | "AMD" | "Unknown";
            model: string;
            cores: number;
            threads: number;
            baseClock: number;
            maxClock: number;
            architecture: string;
        }>;
        gpu: z.ZodObject<{
            vendor: z.ZodEnum<["NVIDIA", "AMD", "Intel", "Unknown"]>;
            model: z.ZodString;
            driverVersion: z.ZodString;
            vram: z.ZodNumber;
            supportsHAGS: z.ZodBoolean;
            supportsResizableBAR: z.ZodBoolean;
        }, "strip", z.ZodTypeAny, {
            vendor: "Intel" | "AMD" | "NVIDIA" | "Unknown";
            model: string;
            driverVersion: string;
            vram: number;
            supportsResizableBAR: boolean;
            supportsHAGS: boolean;
        }, {
            vendor: "Intel" | "AMD" | "NVIDIA" | "Unknown";
            model: string;
            driverVersion: string;
            vram: number;
            supportsResizableBAR: boolean;
            supportsHAGS: boolean;
        }>;
        memory: z.ZodObject<{
            total: z.ZodNumber;
            speed: z.ZodNumber;
            type: z.ZodString;
            channels: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            type: string;
            total: number;
            speed: number;
            channels: number;
        }, {
            type: string;
            total: number;
            speed: number;
            channels: number;
        }>;
        storage: z.ZodArray<z.ZodObject<{
            deviceId: z.ZodString;
            model: z.ZodString;
            type: z.ZodEnum<["SSD", "HDD", "NVMe"]>;
            size: z.ZodNumber;
            smartStatus: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            type: "SSD" | "HDD" | "NVMe";
            model: string;
            deviceId: string;
            size: number;
            smartStatus: string;
        }, {
            type: "SSD" | "HDD" | "NVMe";
            model: string;
            deviceId: string;
            size: number;
            smartStatus: string;
        }>, "many">;
        network: z.ZodObject<{
            adapterName: z.ZodString;
            macAddress: z.ZodString;
            speed: z.ZodNumber;
            driverVersion: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            driverVersion: string;
            speed: number;
            adapterName: string;
            macAddress: string;
        }, {
            driverVersion: string;
            speed: number;
            adapterName: string;
            macAddress: string;
        }>;
        windowsVersion: z.ZodObject<{
            version: z.ZodString;
            build: z.ZodNumber;
            edition: z.ZodEnum<["Home", "Pro", "Enterprise", "Education", "Unknown"]>;
            isInsider: z.ZodBoolean;
        }, "strip", z.ZodTypeAny, {
            version: string;
            build: number;
            edition: "Unknown" | "Home" | "Pro" | "Enterprise" | "Education";
            isInsider: boolean;
        }, {
            version: string;
            build: number;
            edition: "Unknown" | "Home" | "Pro" | "Enterprise" | "Education";
            isInsider: boolean;
        }>;
        isLaptop: z.ZodBoolean;
        hasBitLocker: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        gpu: {
            vendor: "Intel" | "AMD" | "NVIDIA" | "Unknown";
            model: string;
            driverVersion: string;
            vram: number;
            supportsResizableBAR: boolean;
            supportsHAGS: boolean;
        };
        cpu: {
            vendor: "Intel" | "AMD" | "Unknown";
            model: string;
            cores: number;
            threads: number;
            baseClock: number;
            maxClock: number;
            architecture: string;
        };
        memory: {
            type: string;
            total: number;
            speed: number;
            channels: number;
        };
        storage: {
            type: "SSD" | "HDD" | "NVMe";
            model: string;
            deviceId: string;
            size: number;
            smartStatus: string;
        }[];
        network: {
            driverVersion: string;
            speed: number;
            adapterName: string;
            macAddress: string;
        };
        windowsVersion: {
            version: string;
            build: number;
            edition: "Unknown" | "Home" | "Pro" | "Enterprise" | "Education";
            isInsider: boolean;
        };
        isLaptop: boolean;
        hasBitLocker: boolean;
    }, {
        gpu: {
            vendor: "Intel" | "AMD" | "NVIDIA" | "Unknown";
            model: string;
            driverVersion: string;
            vram: number;
            supportsResizableBAR: boolean;
            supportsHAGS: boolean;
        };
        cpu: {
            vendor: "Intel" | "AMD" | "Unknown";
            model: string;
            cores: number;
            threads: number;
            baseClock: number;
            maxClock: number;
            architecture: string;
        };
        memory: {
            type: string;
            total: number;
            speed: number;
            channels: number;
        };
        storage: {
            type: "SSD" | "HDD" | "NVMe";
            model: string;
            deviceId: string;
            size: number;
            smartStatus: string;
        }[];
        network: {
            driverVersion: string;
            speed: number;
            adapterName: string;
            macAddress: string;
        };
        windowsVersion: {
            version: string;
            build: number;
            edition: "Unknown" | "Home" | "Pro" | "Enterprise" | "Education";
            isInsider: boolean;
        };
        isLaptop: boolean;
        hasBitLocker: boolean;
    }>>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    signature: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    description: string;
    tweaks: string[];
    createdAt: string;
    updatedAt: string;
    hardwareProfile?: {
        gpu: {
            vendor: "Intel" | "AMD" | "NVIDIA" | "Unknown";
            model: string;
            driverVersion: string;
            vram: number;
            supportsResizableBAR: boolean;
            supportsHAGS: boolean;
        };
        cpu: {
            vendor: "Intel" | "AMD" | "Unknown";
            model: string;
            cores: number;
            threads: number;
            baseClock: number;
            maxClock: number;
            architecture: string;
        };
        memory: {
            type: string;
            total: number;
            speed: number;
            channels: number;
        };
        storage: {
            type: "SSD" | "HDD" | "NVMe";
            model: string;
            deviceId: string;
            size: number;
            smartStatus: string;
        }[];
        network: {
            driverVersion: string;
            speed: number;
            adapterName: string;
            macAddress: string;
        };
        windowsVersion: {
            version: string;
            build: number;
            edition: "Unknown" | "Home" | "Pro" | "Enterprise" | "Education";
            isInsider: boolean;
        };
        isLaptop: boolean;
        hasBitLocker: boolean;
    } | undefined;
    signature?: string | undefined;
}, {
    id: string;
    name: string;
    description: string;
    tweaks: string[];
    createdAt: string;
    updatedAt: string;
    hardwareProfile?: {
        gpu: {
            vendor: "Intel" | "AMD" | "NVIDIA" | "Unknown";
            model: string;
            driverVersion: string;
            vram: number;
            supportsResizableBAR: boolean;
            supportsHAGS: boolean;
        };
        cpu: {
            vendor: "Intel" | "AMD" | "Unknown";
            model: string;
            cores: number;
            threads: number;
            baseClock: number;
            maxClock: number;
            architecture: string;
        };
        memory: {
            type: string;
            total: number;
            speed: number;
            channels: number;
        };
        storage: {
            type: "SSD" | "HDD" | "NVMe";
            model: string;
            deviceId: string;
            size: number;
            smartStatus: string;
        }[];
        network: {
            driverVersion: string;
            speed: number;
            adapterName: string;
            macAddress: string;
        };
        windowsVersion: {
            version: string;
            build: number;
            edition: "Unknown" | "Home" | "Pro" | "Enterprise" | "Education";
            isInsider: boolean;
        };
        isLaptop: boolean;
        hasBitLocker: boolean;
    } | undefined;
    signature?: string | undefined;
}>;
export declare const OverlayConfigSchema: z.ZodObject<{
    enabled: z.ZodBoolean;
    position: z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        x: number;
        y: number;
    }, {
        x: number;
        y: number;
    }>;
    scale: z.ZodNumber;
    opacity: z.ZodNumber;
    clickThrough: z.ZodBoolean;
    modules: z.ZodArray<z.ZodEnum<["cpu", "ram", "gpu", "ping", "timer", "fps", "temperature"]>, "many">;
    globalHotkey: z.ZodString;
}, "strip", z.ZodTypeAny, {
    enabled: boolean;
    position: {
        x: number;
        y: number;
    };
    scale: number;
    opacity: number;
    clickThrough: boolean;
    modules: ("gpu" | "cpu" | "ram" | "ping" | "timer" | "fps" | "temperature")[];
    globalHotkey: string;
}, {
    enabled: boolean;
    position: {
        x: number;
        y: number;
    };
    scale: number;
    opacity: number;
    clickThrough: boolean;
    modules: ("gpu" | "cpu" | "ram" | "ping" | "timer" | "fps" | "temperature")[];
    globalHotkey: string;
}>;
export declare const SettingsSchema: z.ZodObject<{
    language: z.ZodEnum<["es", "en", "pt", "fr", "de"]>;
    theme: z.ZodEnum<["dark", "light", "system"]>;
    autoStart: z.ZodBoolean;
    minimizeToTray: z.ZodBoolean;
    checkUpdates: z.ZodBoolean;
    telemetryOptIn: z.ZodBoolean;
    dryRunDefault: z.ZodBoolean;
    batterySaverMode: z.ZodBoolean;
    gameModeAuto: z.ZodBoolean;
    overlay: z.ZodObject<{
        enabled: z.ZodBoolean;
        position: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            x: number;
            y: number;
        }, {
            x: number;
            y: number;
        }>;
        scale: z.ZodNumber;
        opacity: z.ZodNumber;
        clickThrough: z.ZodBoolean;
        modules: z.ZodArray<z.ZodEnum<["cpu", "ram", "gpu", "ping", "timer", "fps", "temperature"]>, "many">;
        globalHotkey: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        position: {
            x: number;
            y: number;
        };
        scale: number;
        opacity: number;
        clickThrough: boolean;
        modules: ("gpu" | "cpu" | "ram" | "ping" | "timer" | "fps" | "temperature")[];
        globalHotkey: string;
    }, {
        enabled: boolean;
        position: {
            x: number;
            y: number;
        };
        scale: number;
        opacity: number;
        clickThrough: boolean;
        modules: ("gpu" | "cpu" | "ram" | "ping" | "timer" | "fps" | "temperature")[];
        globalHotkey: string;
    }>;
    backupRetentionDays: z.ZodNumber;
    maxLogSize: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    language: "es" | "en" | "pt" | "fr" | "de";
    theme: "dark" | "light" | "system";
    autoStart: boolean;
    minimizeToTray: boolean;
    checkUpdates: boolean;
    telemetryOptIn: boolean;
    dryRunDefault: boolean;
    batterySaverMode: boolean;
    gameModeAuto: boolean;
    overlay: {
        enabled: boolean;
        position: {
            x: number;
            y: number;
        };
        scale: number;
        opacity: number;
        clickThrough: boolean;
        modules: ("gpu" | "cpu" | "ram" | "ping" | "timer" | "fps" | "temperature")[];
        globalHotkey: string;
    };
    backupRetentionDays: number;
    maxLogSize: number;
}, {
    language: "es" | "en" | "pt" | "fr" | "de";
    theme: "dark" | "light" | "system";
    autoStart: boolean;
    minimizeToTray: boolean;
    checkUpdates: boolean;
    telemetryOptIn: boolean;
    dryRunDefault: boolean;
    batterySaverMode: boolean;
    gameModeAuto: boolean;
    overlay: {
        enabled: boolean;
        position: {
            x: number;
            y: number;
        };
        scale: number;
        opacity: number;
        clickThrough: boolean;
        modules: ("gpu" | "cpu" | "ram" | "ping" | "timer" | "fps" | "temperature")[];
        globalHotkey: string;
    };
    backupRetentionDays: number;
    maxLogSize: number;
}>;
export declare const NvidiaSettingsSchema: z.ZodObject<{
    lowLatencyMode: z.ZodEnum<["off", "on", "ultra"]>;
    powerManagement: z.ZodEnum<["max_performance", "optimal", "adaptive"]>;
    shaderCache: z.ZodEnum<["on", "off", "driver_default"]>;
    textureFiltering: z.ZodEnum<["high_performance", "quality", "driver_default"]>;
    reflex: z.ZodEnum<["on", "off", "on_plus_boost"]>;
}, "strip", z.ZodTypeAny, {
    lowLatencyMode: "off" | "on" | "ultra";
    powerManagement: "max_performance" | "optimal" | "adaptive";
    shaderCache: "off" | "on" | "driver_default";
    textureFiltering: "driver_default" | "high_performance" | "quality";
    reflex: "off" | "on" | "on_plus_boost";
}, {
    lowLatencyMode: "off" | "on" | "ultra";
    powerManagement: "max_performance" | "optimal" | "adaptive";
    shaderCache: "off" | "on" | "driver_default";
    textureFiltering: "driver_default" | "high_performance" | "quality";
    reflex: "off" | "on" | "on_plus_boost";
}>;
export declare const AmdSettingsSchema: z.ZodObject<{
    antiLag: z.ZodBoolean;
    chill: z.ZodNullable<z.ZodObject<{
        minFps: z.ZodNumber;
        maxFps: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        minFps: number;
        maxFps: number;
    }, {
        minFps: number;
        maxFps: number;
    }>>;
    shaderCache: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    shaderCache: boolean;
    antiLag: boolean;
    chill: {
        minFps: number;
        maxFps: number;
    } | null;
}, {
    shaderCache: boolean;
    antiLag: boolean;
    chill: {
        minFps: number;
        maxFps: number;
    } | null;
}>;
export declare const IntelSettingsSchema: z.ZodObject<{
    powerMode: z.ZodEnum<["max_performance", "balanced", "power_saver"]>;
}, "strip", z.ZodTypeAny, {
    powerMode: "balanced" | "max_performance" | "power_saver";
}, {
    powerMode: "balanced" | "max_performance" | "power_saver";
}>;
export declare const CommonGpuSettingsSchema: z.ZodObject<{
    hags: z.ZodBoolean;
    gpuPreference: z.ZodEnum<["high_performance", "power_saving", "auto"]>;
    fullscreenOptimizations: z.ZodBoolean;
    mpo: z.ZodBoolean;
    vrr: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    hags: boolean;
    gpuPreference: "high_performance" | "power_saving" | "auto";
    fullscreenOptimizations: boolean;
    mpo: boolean;
    vrr: boolean;
}, {
    hags: boolean;
    gpuPreference: "high_performance" | "power_saving" | "auto";
    fullscreenOptimizations: boolean;
    mpo: boolean;
    vrr: boolean;
}>;
export declare const GpuProfileConfigSchema: z.ZodObject<{
    nvidia: z.ZodOptional<z.ZodObject<{
        lowLatencyMode: z.ZodEnum<["off", "on", "ultra"]>;
        powerManagement: z.ZodEnum<["max_performance", "optimal", "adaptive"]>;
        shaderCache: z.ZodEnum<["on", "off", "driver_default"]>;
        textureFiltering: z.ZodEnum<["high_performance", "quality", "driver_default"]>;
        reflex: z.ZodEnum<["on", "off", "on_plus_boost"]>;
    }, "strip", z.ZodTypeAny, {
        lowLatencyMode: "off" | "on" | "ultra";
        powerManagement: "max_performance" | "optimal" | "adaptive";
        shaderCache: "off" | "on" | "driver_default";
        textureFiltering: "driver_default" | "high_performance" | "quality";
        reflex: "off" | "on" | "on_plus_boost";
    }, {
        lowLatencyMode: "off" | "on" | "ultra";
        powerManagement: "max_performance" | "optimal" | "adaptive";
        shaderCache: "off" | "on" | "driver_default";
        textureFiltering: "driver_default" | "high_performance" | "quality";
        reflex: "off" | "on" | "on_plus_boost";
    }>>;
    amd: z.ZodOptional<z.ZodObject<{
        antiLag: z.ZodBoolean;
        chill: z.ZodNullable<z.ZodObject<{
            minFps: z.ZodNumber;
            maxFps: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            minFps: number;
            maxFps: number;
        }, {
            minFps: number;
            maxFps: number;
        }>>;
        shaderCache: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        shaderCache: boolean;
        antiLag: boolean;
        chill: {
            minFps: number;
            maxFps: number;
        } | null;
    }, {
        shaderCache: boolean;
        antiLag: boolean;
        chill: {
            minFps: number;
            maxFps: number;
        } | null;
    }>>;
    intel: z.ZodOptional<z.ZodObject<{
        powerMode: z.ZodEnum<["max_performance", "balanced", "power_saver"]>;
    }, "strip", z.ZodTypeAny, {
        powerMode: "balanced" | "max_performance" | "power_saver";
    }, {
        powerMode: "balanced" | "max_performance" | "power_saver";
    }>>;
    common: z.ZodOptional<z.ZodObject<{
        hags: z.ZodBoolean;
        gpuPreference: z.ZodEnum<["high_performance", "power_saving", "auto"]>;
        fullscreenOptimizations: z.ZodBoolean;
        mpo: z.ZodBoolean;
        vrr: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        hags: boolean;
        gpuPreference: "high_performance" | "power_saving" | "auto";
        fullscreenOptimizations: boolean;
        mpo: boolean;
        vrr: boolean;
    }, {
        hags: boolean;
        gpuPreference: "high_performance" | "power_saving" | "auto";
        fullscreenOptimizations: boolean;
        mpo: boolean;
        vrr: boolean;
    }>>;
}, "strip", z.ZodTypeAny, {
    nvidia?: {
        lowLatencyMode: "off" | "on" | "ultra";
        powerManagement: "max_performance" | "optimal" | "adaptive";
        shaderCache: "off" | "on" | "driver_default";
        textureFiltering: "driver_default" | "high_performance" | "quality";
        reflex: "off" | "on" | "on_plus_boost";
    } | undefined;
    amd?: {
        shaderCache: boolean;
        antiLag: boolean;
        chill: {
            minFps: number;
            maxFps: number;
        } | null;
    } | undefined;
    intel?: {
        powerMode: "balanced" | "max_performance" | "power_saver";
    } | undefined;
    common?: {
        hags: boolean;
        gpuPreference: "high_performance" | "power_saving" | "auto";
        fullscreenOptimizations: boolean;
        mpo: boolean;
        vrr: boolean;
    } | undefined;
}, {
    nvidia?: {
        lowLatencyMode: "off" | "on" | "ultra";
        powerManagement: "max_performance" | "optimal" | "adaptive";
        shaderCache: "off" | "on" | "driver_default";
        textureFiltering: "driver_default" | "high_performance" | "quality";
        reflex: "off" | "on" | "on_plus_boost";
    } | undefined;
    amd?: {
        shaderCache: boolean;
        antiLag: boolean;
        chill: {
            minFps: number;
            maxFps: number;
        } | null;
    } | undefined;
    intel?: {
        powerMode: "balanced" | "max_performance" | "power_saver";
    } | undefined;
    common?: {
        hags: boolean;
        gpuPreference: "high_performance" | "power_saving" | "auto";
        fullscreenOptimizations: boolean;
        mpo: boolean;
        vrr: boolean;
    } | undefined;
}>;
export declare const GameTweakConfigSchema: z.ZodObject<{
    powerPlan: z.ZodEnum<["ultimate", "high", "balanced", "custom"]>;
    timerResolution: z.ZodNumber;
    cpuPriority: z.ZodEnum<["high", "realtime", "normal"]>;
    gameMode: z.ZodBoolean;
    gameDVR: z.ZodBoolean;
    notifications: z.ZodBoolean;
    suspendedProcesses: z.ZodArray<z.ZodString, "many">;
    gpuProfile: z.ZodObject<{
        nvidia: z.ZodOptional<z.ZodObject<{
            lowLatencyMode: z.ZodEnum<["off", "on", "ultra"]>;
            powerManagement: z.ZodEnum<["max_performance", "optimal", "adaptive"]>;
            shaderCache: z.ZodEnum<["on", "off", "driver_default"]>;
            textureFiltering: z.ZodEnum<["high_performance", "quality", "driver_default"]>;
            reflex: z.ZodEnum<["on", "off", "on_plus_boost"]>;
        }, "strip", z.ZodTypeAny, {
            lowLatencyMode: "off" | "on" | "ultra";
            powerManagement: "max_performance" | "optimal" | "adaptive";
            shaderCache: "off" | "on" | "driver_default";
            textureFiltering: "driver_default" | "high_performance" | "quality";
            reflex: "off" | "on" | "on_plus_boost";
        }, {
            lowLatencyMode: "off" | "on" | "ultra";
            powerManagement: "max_performance" | "optimal" | "adaptive";
            shaderCache: "off" | "on" | "driver_default";
            textureFiltering: "driver_default" | "high_performance" | "quality";
            reflex: "off" | "on" | "on_plus_boost";
        }>>;
        amd: z.ZodOptional<z.ZodObject<{
            antiLag: z.ZodBoolean;
            chill: z.ZodNullable<z.ZodObject<{
                minFps: z.ZodNumber;
                maxFps: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                minFps: number;
                maxFps: number;
            }, {
                minFps: number;
                maxFps: number;
            }>>;
            shaderCache: z.ZodBoolean;
        }, "strip", z.ZodTypeAny, {
            shaderCache: boolean;
            antiLag: boolean;
            chill: {
                minFps: number;
                maxFps: number;
            } | null;
        }, {
            shaderCache: boolean;
            antiLag: boolean;
            chill: {
                minFps: number;
                maxFps: number;
            } | null;
        }>>;
        intel: z.ZodOptional<z.ZodObject<{
            powerMode: z.ZodEnum<["max_performance", "balanced", "power_saver"]>;
        }, "strip", z.ZodTypeAny, {
            powerMode: "balanced" | "max_performance" | "power_saver";
        }, {
            powerMode: "balanced" | "max_performance" | "power_saver";
        }>>;
        common: z.ZodOptional<z.ZodObject<{
            hags: z.ZodBoolean;
            gpuPreference: z.ZodEnum<["high_performance", "power_saving", "auto"]>;
            fullscreenOptimizations: z.ZodBoolean;
            mpo: z.ZodBoolean;
            vrr: z.ZodBoolean;
        }, "strip", z.ZodTypeAny, {
            hags: boolean;
            gpuPreference: "high_performance" | "power_saving" | "auto";
            fullscreenOptimizations: boolean;
            mpo: boolean;
            vrr: boolean;
        }, {
            hags: boolean;
            gpuPreference: "high_performance" | "power_saving" | "auto";
            fullscreenOptimizations: boolean;
            mpo: boolean;
            vrr: boolean;
        }>>;
    }, "strip", z.ZodTypeAny, {
        nvidia?: {
            lowLatencyMode: "off" | "on" | "ultra";
            powerManagement: "max_performance" | "optimal" | "adaptive";
            shaderCache: "off" | "on" | "driver_default";
            textureFiltering: "driver_default" | "high_performance" | "quality";
            reflex: "off" | "on" | "on_plus_boost";
        } | undefined;
        amd?: {
            shaderCache: boolean;
            antiLag: boolean;
            chill: {
                minFps: number;
                maxFps: number;
            } | null;
        } | undefined;
        intel?: {
            powerMode: "balanced" | "max_performance" | "power_saver";
        } | undefined;
        common?: {
            hags: boolean;
            gpuPreference: "high_performance" | "power_saving" | "auto";
            fullscreenOptimizations: boolean;
            mpo: boolean;
            vrr: boolean;
        } | undefined;
    }, {
        nvidia?: {
            lowLatencyMode: "off" | "on" | "ultra";
            powerManagement: "max_performance" | "optimal" | "adaptive";
            shaderCache: "off" | "on" | "driver_default";
            textureFiltering: "driver_default" | "high_performance" | "quality";
            reflex: "off" | "on" | "on_plus_boost";
        } | undefined;
        amd?: {
            shaderCache: boolean;
            antiLag: boolean;
            chill: {
                minFps: number;
                maxFps: number;
            } | null;
        } | undefined;
        intel?: {
            powerMode: "balanced" | "max_performance" | "power_saver";
        } | undefined;
        common?: {
            hags: boolean;
            gpuPreference: "high_performance" | "power_saving" | "auto";
            fullscreenOptimizations: boolean;
            mpo: boolean;
            vrr: boolean;
        } | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    powerPlan: "ultimate" | "high" | "balanced" | "custom";
    gameMode: boolean;
    gameDVR: boolean;
    notifications: boolean;
    timerResolution: number;
    suspendedProcesses: string[];
    cpuPriority: "high" | "realtime" | "normal";
    gpuProfile: {
        nvidia?: {
            lowLatencyMode: "off" | "on" | "ultra";
            powerManagement: "max_performance" | "optimal" | "adaptive";
            shaderCache: "off" | "on" | "driver_default";
            textureFiltering: "driver_default" | "high_performance" | "quality";
            reflex: "off" | "on" | "on_plus_boost";
        } | undefined;
        amd?: {
            shaderCache: boolean;
            antiLag: boolean;
            chill: {
                minFps: number;
                maxFps: number;
            } | null;
        } | undefined;
        intel?: {
            powerMode: "balanced" | "max_performance" | "power_saver";
        } | undefined;
        common?: {
            hags: boolean;
            gpuPreference: "high_performance" | "power_saving" | "auto";
            fullscreenOptimizations: boolean;
            mpo: boolean;
            vrr: boolean;
        } | undefined;
    };
}, {
    powerPlan: "ultimate" | "high" | "balanced" | "custom";
    gameMode: boolean;
    gameDVR: boolean;
    notifications: boolean;
    timerResolution: number;
    suspendedProcesses: string[];
    cpuPriority: "high" | "realtime" | "normal";
    gpuProfile: {
        nvidia?: {
            lowLatencyMode: "off" | "on" | "ultra";
            powerManagement: "max_performance" | "optimal" | "adaptive";
            shaderCache: "off" | "on" | "driver_default";
            textureFiltering: "driver_default" | "high_performance" | "quality";
            reflex: "off" | "on" | "on_plus_boost";
        } | undefined;
        amd?: {
            shaderCache: boolean;
            antiLag: boolean;
            chill: {
                minFps: number;
                maxFps: number;
            } | null;
        } | undefined;
        intel?: {
            powerMode: "balanced" | "max_performance" | "power_saver";
        } | undefined;
        common?: {
            hags: boolean;
            gpuPreference: "high_performance" | "power_saving" | "auto";
            fullscreenOptimizations: boolean;
            mpo: boolean;
            vrr: boolean;
        } | undefined;
    };
}>;
export declare const GameProfileSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    executable: z.ZodString;
    steamId: z.ZodOptional<z.ZodString>;
    epicId: z.ZodOptional<z.ZodString>;
    customArgs: z.ZodOptional<z.ZodString>;
    tweaks: z.ZodObject<{
        powerPlan: z.ZodEnum<["ultimate", "high", "balanced", "custom"]>;
        timerResolution: z.ZodNumber;
        cpuPriority: z.ZodEnum<["high", "realtime", "normal"]>;
        gameMode: z.ZodBoolean;
        gameDVR: z.ZodBoolean;
        notifications: z.ZodBoolean;
        suspendedProcesses: z.ZodArray<z.ZodString, "many">;
        gpuProfile: z.ZodObject<{
            nvidia: z.ZodOptional<z.ZodObject<{
                lowLatencyMode: z.ZodEnum<["off", "on", "ultra"]>;
                powerManagement: z.ZodEnum<["max_performance", "optimal", "adaptive"]>;
                shaderCache: z.ZodEnum<["on", "off", "driver_default"]>;
                textureFiltering: z.ZodEnum<["high_performance", "quality", "driver_default"]>;
                reflex: z.ZodEnum<["on", "off", "on_plus_boost"]>;
            }, "strip", z.ZodTypeAny, {
                lowLatencyMode: "off" | "on" | "ultra";
                powerManagement: "max_performance" | "optimal" | "adaptive";
                shaderCache: "off" | "on" | "driver_default";
                textureFiltering: "driver_default" | "high_performance" | "quality";
                reflex: "off" | "on" | "on_plus_boost";
            }, {
                lowLatencyMode: "off" | "on" | "ultra";
                powerManagement: "max_performance" | "optimal" | "adaptive";
                shaderCache: "off" | "on" | "driver_default";
                textureFiltering: "driver_default" | "high_performance" | "quality";
                reflex: "off" | "on" | "on_plus_boost";
            }>>;
            amd: z.ZodOptional<z.ZodObject<{
                antiLag: z.ZodBoolean;
                chill: z.ZodNullable<z.ZodObject<{
                    minFps: z.ZodNumber;
                    maxFps: z.ZodNumber;
                }, "strip", z.ZodTypeAny, {
                    minFps: number;
                    maxFps: number;
                }, {
                    minFps: number;
                    maxFps: number;
                }>>;
                shaderCache: z.ZodBoolean;
            }, "strip", z.ZodTypeAny, {
                shaderCache: boolean;
                antiLag: boolean;
                chill: {
                    minFps: number;
                    maxFps: number;
                } | null;
            }, {
                shaderCache: boolean;
                antiLag: boolean;
                chill: {
                    minFps: number;
                    maxFps: number;
                } | null;
            }>>;
            intel: z.ZodOptional<z.ZodObject<{
                powerMode: z.ZodEnum<["max_performance", "balanced", "power_saver"]>;
            }, "strip", z.ZodTypeAny, {
                powerMode: "balanced" | "max_performance" | "power_saver";
            }, {
                powerMode: "balanced" | "max_performance" | "power_saver";
            }>>;
            common: z.ZodOptional<z.ZodObject<{
                hags: z.ZodBoolean;
                gpuPreference: z.ZodEnum<["high_performance", "power_saving", "auto"]>;
                fullscreenOptimizations: z.ZodBoolean;
                mpo: z.ZodBoolean;
                vrr: z.ZodBoolean;
            }, "strip", z.ZodTypeAny, {
                hags: boolean;
                gpuPreference: "high_performance" | "power_saving" | "auto";
                fullscreenOptimizations: boolean;
                mpo: boolean;
                vrr: boolean;
            }, {
                hags: boolean;
                gpuPreference: "high_performance" | "power_saving" | "auto";
                fullscreenOptimizations: boolean;
                mpo: boolean;
                vrr: boolean;
            }>>;
        }, "strip", z.ZodTypeAny, {
            nvidia?: {
                lowLatencyMode: "off" | "on" | "ultra";
                powerManagement: "max_performance" | "optimal" | "adaptive";
                shaderCache: "off" | "on" | "driver_default";
                textureFiltering: "driver_default" | "high_performance" | "quality";
                reflex: "off" | "on" | "on_plus_boost";
            } | undefined;
            amd?: {
                shaderCache: boolean;
                antiLag: boolean;
                chill: {
                    minFps: number;
                    maxFps: number;
                } | null;
            } | undefined;
            intel?: {
                powerMode: "balanced" | "max_performance" | "power_saver";
            } | undefined;
            common?: {
                hags: boolean;
                gpuPreference: "high_performance" | "power_saving" | "auto";
                fullscreenOptimizations: boolean;
                mpo: boolean;
                vrr: boolean;
            } | undefined;
        }, {
            nvidia?: {
                lowLatencyMode: "off" | "on" | "ultra";
                powerManagement: "max_performance" | "optimal" | "adaptive";
                shaderCache: "off" | "on" | "driver_default";
                textureFiltering: "driver_default" | "high_performance" | "quality";
                reflex: "off" | "on" | "on_plus_boost";
            } | undefined;
            amd?: {
                shaderCache: boolean;
                antiLag: boolean;
                chill: {
                    minFps: number;
                    maxFps: number;
                } | null;
            } | undefined;
            intel?: {
                powerMode: "balanced" | "max_performance" | "power_saver";
            } | undefined;
            common?: {
                hags: boolean;
                gpuPreference: "high_performance" | "power_saving" | "auto";
                fullscreenOptimizations: boolean;
                mpo: boolean;
                vrr: boolean;
            } | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        powerPlan: "ultimate" | "high" | "balanced" | "custom";
        gameMode: boolean;
        gameDVR: boolean;
        notifications: boolean;
        timerResolution: number;
        suspendedProcesses: string[];
        cpuPriority: "high" | "realtime" | "normal";
        gpuProfile: {
            nvidia?: {
                lowLatencyMode: "off" | "on" | "ultra";
                powerManagement: "max_performance" | "optimal" | "adaptive";
                shaderCache: "off" | "on" | "driver_default";
                textureFiltering: "driver_default" | "high_performance" | "quality";
                reflex: "off" | "on" | "on_plus_boost";
            } | undefined;
            amd?: {
                shaderCache: boolean;
                antiLag: boolean;
                chill: {
                    minFps: number;
                    maxFps: number;
                } | null;
            } | undefined;
            intel?: {
                powerMode: "balanced" | "max_performance" | "power_saver";
            } | undefined;
            common?: {
                hags: boolean;
                gpuPreference: "high_performance" | "power_saving" | "auto";
                fullscreenOptimizations: boolean;
                mpo: boolean;
                vrr: boolean;
            } | undefined;
        };
    }, {
        powerPlan: "ultimate" | "high" | "balanced" | "custom";
        gameMode: boolean;
        gameDVR: boolean;
        notifications: boolean;
        timerResolution: number;
        suspendedProcesses: string[];
        cpuPriority: "high" | "realtime" | "normal";
        gpuProfile: {
            nvidia?: {
                lowLatencyMode: "off" | "on" | "ultra";
                powerManagement: "max_performance" | "optimal" | "adaptive";
                shaderCache: "off" | "on" | "driver_default";
                textureFiltering: "driver_default" | "high_performance" | "quality";
                reflex: "off" | "on" | "on_plus_boost";
            } | undefined;
            amd?: {
                shaderCache: boolean;
                antiLag: boolean;
                chill: {
                    minFps: number;
                    maxFps: number;
                } | null;
            } | undefined;
            intel?: {
                powerMode: "balanced" | "max_performance" | "power_saver";
            } | undefined;
            common?: {
                hags: boolean;
                gpuPreference: "high_performance" | "power_saving" | "auto";
                fullscreenOptimizations: boolean;
                mpo: boolean;
                vrr: boolean;
            } | undefined;
        };
    }>;
    autoApply: z.ZodBoolean;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    tweaks: {
        powerPlan: "ultimate" | "high" | "balanced" | "custom";
        gameMode: boolean;
        gameDVR: boolean;
        notifications: boolean;
        timerResolution: number;
        suspendedProcesses: string[];
        cpuPriority: "high" | "realtime" | "normal";
        gpuProfile: {
            nvidia?: {
                lowLatencyMode: "off" | "on" | "ultra";
                powerManagement: "max_performance" | "optimal" | "adaptive";
                shaderCache: "off" | "on" | "driver_default";
                textureFiltering: "driver_default" | "high_performance" | "quality";
                reflex: "off" | "on" | "on_plus_boost";
            } | undefined;
            amd?: {
                shaderCache: boolean;
                antiLag: boolean;
                chill: {
                    minFps: number;
                    maxFps: number;
                } | null;
            } | undefined;
            intel?: {
                powerMode: "balanced" | "max_performance" | "power_saver";
            } | undefined;
            common?: {
                hags: boolean;
                gpuPreference: "high_performance" | "power_saving" | "auto";
                fullscreenOptimizations: boolean;
                mpo: boolean;
                vrr: boolean;
            } | undefined;
        };
    };
    autoApply: boolean;
    createdAt: string;
    updatedAt: string;
    executable: string;
    epicId?: string | undefined;
    steamId?: string | undefined;
    customArgs?: string | undefined;
}, {
    id: string;
    name: string;
    tweaks: {
        powerPlan: "ultimate" | "high" | "balanced" | "custom";
        gameMode: boolean;
        gameDVR: boolean;
        notifications: boolean;
        timerResolution: number;
        suspendedProcesses: string[];
        cpuPriority: "high" | "realtime" | "normal";
        gpuProfile: {
            nvidia?: {
                lowLatencyMode: "off" | "on" | "ultra";
                powerManagement: "max_performance" | "optimal" | "adaptive";
                shaderCache: "off" | "on" | "driver_default";
                textureFiltering: "driver_default" | "high_performance" | "quality";
                reflex: "off" | "on" | "on_plus_boost";
            } | undefined;
            amd?: {
                shaderCache: boolean;
                antiLag: boolean;
                chill: {
                    minFps: number;
                    maxFps: number;
                } | null;
            } | undefined;
            intel?: {
                powerMode: "balanced" | "max_performance" | "power_saver";
            } | undefined;
            common?: {
                hags: boolean;
                gpuPreference: "high_performance" | "power_saving" | "auto";
                fullscreenOptimizations: boolean;
                mpo: boolean;
                vrr: boolean;
            } | undefined;
        };
    };
    autoApply: boolean;
    createdAt: string;
    updatedAt: string;
    executable: string;
    epicId?: string | undefined;
    steamId?: string | undefined;
    customArgs?: string | undefined;
}>;
export type TweakState = z.infer<typeof TweakStateSchema>;
export type ApplyOptions = z.infer<typeof ApplyOptionsSchema>;
export type TweakResult = z.infer<typeof TweakResultSchema>;
export type Compatibility = z.infer<typeof CompatibilitySchema>;
export type HardwareProfile = z.infer<typeof HardwareProfileSchema>;
export type Profile = z.infer<typeof ProfileSchema>;
export type Settings = z.infer<typeof SettingsSchema>;
export type GameProfile = z.infer<typeof GameProfileSchema>;
export type OverlayConfig = z.infer<typeof OverlayConfigSchema>;
export declare const IpcChannels: {
    readonly 'tweak:detect': z.ZodObject<{
        tweakId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        tweakId: string;
    }, {
        tweakId: string;
    }>;
    readonly 'tweak:apply': z.ZodObject<{
        tweakId: z.ZodString;
        options: z.ZodOptional<z.ZodObject<{
            dryRun: z.ZodOptional<z.ZodBoolean>;
            force: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            force?: boolean | undefined;
            dryRun?: boolean | undefined;
        }, {
            force?: boolean | undefined;
            dryRun?: boolean | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        tweakId: string;
        options?: {
            force?: boolean | undefined;
            dryRun?: boolean | undefined;
        } | undefined;
    }, {
        tweakId: string;
        options?: {
            force?: boolean | undefined;
            dryRun?: boolean | undefined;
        } | undefined;
    }>;
    readonly 'tweak:revert': z.ZodObject<{
        tweakId: z.ZodString;
        originalState: z.ZodObject<{
            path: z.ZodString;
            name: z.ZodString;
            type: z.ZodEnum<["REG_SZ", "REG_DWORD", "REG_QWORD", "REG_BINARY", "REG_MULTI_SZ", "REG_EXPAND_SZ"]>;
            value: z.ZodUnknown;
            existed: z.ZodBoolean;
        }, "strip", z.ZodTypeAny, {
            type: "REG_SZ" | "REG_DWORD" | "REG_QWORD" | "REG_BINARY" | "REG_MULTI_SZ" | "REG_EXPAND_SZ";
            existed: boolean;
            name: string;
            path: string;
            value?: unknown;
        }, {
            type: "REG_SZ" | "REG_DWORD" | "REG_QWORD" | "REG_BINARY" | "REG_MULTI_SZ" | "REG_EXPAND_SZ";
            existed: boolean;
            name: string;
            path: string;
            value?: unknown;
        }>;
    }, "strip", z.ZodTypeAny, {
        tweakId: string;
        originalState: {
            type: "REG_SZ" | "REG_DWORD" | "REG_QWORD" | "REG_BINARY" | "REG_MULTI_SZ" | "REG_EXPAND_SZ";
            existed: boolean;
            name: string;
            path: string;
            value?: unknown;
        };
    }, {
        tweakId: string;
        originalState: {
            type: "REG_SZ" | "REG_DWORD" | "REG_QWORD" | "REG_BINARY" | "REG_MULTI_SZ" | "REG_EXPAND_SZ";
            existed: boolean;
            name: string;
            path: string;
            value?: unknown;
        };
    }>;
    readonly 'tweak:verify': z.ZodObject<{
        tweakId: z.ZodString;
        expectedState: z.ZodObject<{
            path: z.ZodString;
            name: z.ZodString;
            type: z.ZodEnum<["REG_SZ", "REG_DWORD", "REG_QWORD", "REG_BINARY", "REG_MULTI_SZ", "REG_EXPAND_SZ"]>;
            value: z.ZodUnknown;
            existed: z.ZodBoolean;
        }, "strip", z.ZodTypeAny, {
            type: "REG_SZ" | "REG_DWORD" | "REG_QWORD" | "REG_BINARY" | "REG_MULTI_SZ" | "REG_EXPAND_SZ";
            existed: boolean;
            name: string;
            path: string;
            value?: unknown;
        }, {
            type: "REG_SZ" | "REG_DWORD" | "REG_QWORD" | "REG_BINARY" | "REG_MULTI_SZ" | "REG_EXPAND_SZ";
            existed: boolean;
            name: string;
            path: string;
            value?: unknown;
        }>;
    }, "strip", z.ZodTypeAny, {
        tweakId: string;
        expectedState: {
            type: "REG_SZ" | "REG_DWORD" | "REG_QWORD" | "REG_BINARY" | "REG_MULTI_SZ" | "REG_EXPAND_SZ";
            existed: boolean;
            name: string;
            path: string;
            value?: unknown;
        };
    }, {
        tweakId: string;
        expectedState: {
            type: "REG_SZ" | "REG_DWORD" | "REG_QWORD" | "REG_BINARY" | "REG_MULTI_SZ" | "REG_EXPAND_SZ";
            existed: boolean;
            name: string;
            path: string;
            value?: unknown;
        };
    }>;
    readonly 'tweak:list': z.ZodVoid;
    readonly 'tweak:get': z.ZodObject<{
        tweakId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        tweakId: string;
    }, {
        tweakId: string;
    }>;
    readonly 'profile:list': z.ZodVoid;
    readonly 'profile:get': z.ZodObject<{
        id: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
    }, {
        id: string;
    }>;
    readonly 'profile:create': z.ZodObject<{
        profile: z.ZodObject<Omit<{
            id: z.ZodString;
            name: z.ZodString;
            description: z.ZodString;
            tweaks: z.ZodArray<z.ZodString, "many">;
            hardwareProfile: z.ZodOptional<z.ZodObject<{
                cpu: z.ZodObject<{
                    vendor: z.ZodEnum<["Intel", "AMD", "Unknown"]>;
                    model: z.ZodString;
                    cores: z.ZodNumber;
                    threads: z.ZodNumber;
                    baseClock: z.ZodNumber;
                    maxClock: z.ZodNumber;
                    architecture: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    vendor: "Intel" | "AMD" | "Unknown";
                    model: string;
                    cores: number;
                    threads: number;
                    baseClock: number;
                    maxClock: number;
                    architecture: string;
                }, {
                    vendor: "Intel" | "AMD" | "Unknown";
                    model: string;
                    cores: number;
                    threads: number;
                    baseClock: number;
                    maxClock: number;
                    architecture: string;
                }>;
                gpu: z.ZodObject<{
                    vendor: z.ZodEnum<["NVIDIA", "AMD", "Intel", "Unknown"]>;
                    model: z.ZodString;
                    driverVersion: z.ZodString;
                    vram: z.ZodNumber;
                    supportsHAGS: z.ZodBoolean;
                    supportsResizableBAR: z.ZodBoolean;
                }, "strip", z.ZodTypeAny, {
                    vendor: "Intel" | "AMD" | "NVIDIA" | "Unknown";
                    model: string;
                    driverVersion: string;
                    vram: number;
                    supportsResizableBAR: boolean;
                    supportsHAGS: boolean;
                }, {
                    vendor: "Intel" | "AMD" | "NVIDIA" | "Unknown";
                    model: string;
                    driverVersion: string;
                    vram: number;
                    supportsResizableBAR: boolean;
                    supportsHAGS: boolean;
                }>;
                memory: z.ZodObject<{
                    total: z.ZodNumber;
                    speed: z.ZodNumber;
                    type: z.ZodString;
                    channels: z.ZodNumber;
                }, "strip", z.ZodTypeAny, {
                    type: string;
                    total: number;
                    speed: number;
                    channels: number;
                }, {
                    type: string;
                    total: number;
                    speed: number;
                    channels: number;
                }>;
                storage: z.ZodArray<z.ZodObject<{
                    deviceId: z.ZodString;
                    model: z.ZodString;
                    type: z.ZodEnum<["SSD", "HDD", "NVMe"]>;
                    size: z.ZodNumber;
                    smartStatus: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    type: "SSD" | "HDD" | "NVMe";
                    model: string;
                    deviceId: string;
                    size: number;
                    smartStatus: string;
                }, {
                    type: "SSD" | "HDD" | "NVMe";
                    model: string;
                    deviceId: string;
                    size: number;
                    smartStatus: string;
                }>, "many">;
                network: z.ZodObject<{
                    adapterName: z.ZodString;
                    macAddress: z.ZodString;
                    speed: z.ZodNumber;
                    driverVersion: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    driverVersion: string;
                    speed: number;
                    adapterName: string;
                    macAddress: string;
                }, {
                    driverVersion: string;
                    speed: number;
                    adapterName: string;
                    macAddress: string;
                }>;
                windowsVersion: z.ZodObject<{
                    version: z.ZodString;
                    build: z.ZodNumber;
                    edition: z.ZodEnum<["Home", "Pro", "Enterprise", "Education", "Unknown"]>;
                    isInsider: z.ZodBoolean;
                }, "strip", z.ZodTypeAny, {
                    version: string;
                    build: number;
                    edition: "Unknown" | "Home" | "Pro" | "Enterprise" | "Education";
                    isInsider: boolean;
                }, {
                    version: string;
                    build: number;
                    edition: "Unknown" | "Home" | "Pro" | "Enterprise" | "Education";
                    isInsider: boolean;
                }>;
                isLaptop: z.ZodBoolean;
                hasBitLocker: z.ZodBoolean;
            }, "strip", z.ZodTypeAny, {
                gpu: {
                    vendor: "Intel" | "AMD" | "NVIDIA" | "Unknown";
                    model: string;
                    driverVersion: string;
                    vram: number;
                    supportsResizableBAR: boolean;
                    supportsHAGS: boolean;
                };
                cpu: {
                    vendor: "Intel" | "AMD" | "Unknown";
                    model: string;
                    cores: number;
                    threads: number;
                    baseClock: number;
                    maxClock: number;
                    architecture: string;
                };
                memory: {
                    type: string;
                    total: number;
                    speed: number;
                    channels: number;
                };
                storage: {
                    type: "SSD" | "HDD" | "NVMe";
                    model: string;
                    deviceId: string;
                    size: number;
                    smartStatus: string;
                }[];
                network: {
                    driverVersion: string;
                    speed: number;
                    adapterName: string;
                    macAddress: string;
                };
                windowsVersion: {
                    version: string;
                    build: number;
                    edition: "Unknown" | "Home" | "Pro" | "Enterprise" | "Education";
                    isInsider: boolean;
                };
                isLaptop: boolean;
                hasBitLocker: boolean;
            }, {
                gpu: {
                    vendor: "Intel" | "AMD" | "NVIDIA" | "Unknown";
                    model: string;
                    driverVersion: string;
                    vram: number;
                    supportsResizableBAR: boolean;
                    supportsHAGS: boolean;
                };
                cpu: {
                    vendor: "Intel" | "AMD" | "Unknown";
                    model: string;
                    cores: number;
                    threads: number;
                    baseClock: number;
                    maxClock: number;
                    architecture: string;
                };
                memory: {
                    type: string;
                    total: number;
                    speed: number;
                    channels: number;
                };
                storage: {
                    type: "SSD" | "HDD" | "NVMe";
                    model: string;
                    deviceId: string;
                    size: number;
                    smartStatus: string;
                }[];
                network: {
                    driverVersion: string;
                    speed: number;
                    adapterName: string;
                    macAddress: string;
                };
                windowsVersion: {
                    version: string;
                    build: number;
                    edition: "Unknown" | "Home" | "Pro" | "Enterprise" | "Education";
                    isInsider: boolean;
                };
                isLaptop: boolean;
                hasBitLocker: boolean;
            }>>;
            createdAt: z.ZodString;
            updatedAt: z.ZodString;
            signature: z.ZodOptional<z.ZodString>;
        }, "id" | "createdAt" | "updatedAt">, "strip", z.ZodTypeAny, {
            name: string;
            description: string;
            tweaks: string[];
            hardwareProfile?: {
                gpu: {
                    vendor: "Intel" | "AMD" | "NVIDIA" | "Unknown";
                    model: string;
                    driverVersion: string;
                    vram: number;
                    supportsResizableBAR: boolean;
                    supportsHAGS: boolean;
                };
                cpu: {
                    vendor: "Intel" | "AMD" | "Unknown";
                    model: string;
                    cores: number;
                    threads: number;
                    baseClock: number;
                    maxClock: number;
                    architecture: string;
                };
                memory: {
                    type: string;
                    total: number;
                    speed: number;
                    channels: number;
                };
                storage: {
                    type: "SSD" | "HDD" | "NVMe";
                    model: string;
                    deviceId: string;
                    size: number;
                    smartStatus: string;
                }[];
                network: {
                    driverVersion: string;
                    speed: number;
                    adapterName: string;
                    macAddress: string;
                };
                windowsVersion: {
                    version: string;
                    build: number;
                    edition: "Unknown" | "Home" | "Pro" | "Enterprise" | "Education";
                    isInsider: boolean;
                };
                isLaptop: boolean;
                hasBitLocker: boolean;
            } | undefined;
            signature?: string | undefined;
        }, {
            name: string;
            description: string;
            tweaks: string[];
            hardwareProfile?: {
                gpu: {
                    vendor: "Intel" | "AMD" | "NVIDIA" | "Unknown";
                    model: string;
                    driverVersion: string;
                    vram: number;
                    supportsResizableBAR: boolean;
                    supportsHAGS: boolean;
                };
                cpu: {
                    vendor: "Intel" | "AMD" | "Unknown";
                    model: string;
                    cores: number;
                    threads: number;
                    baseClock: number;
                    maxClock: number;
                    architecture: string;
                };
                memory: {
                    type: string;
                    total: number;
                    speed: number;
                    channels: number;
                };
                storage: {
                    type: "SSD" | "HDD" | "NVMe";
                    model: string;
                    deviceId: string;
                    size: number;
                    smartStatus: string;
                }[];
                network: {
                    driverVersion: string;
                    speed: number;
                    adapterName: string;
                    macAddress: string;
                };
                windowsVersion: {
                    version: string;
                    build: number;
                    edition: "Unknown" | "Home" | "Pro" | "Enterprise" | "Education";
                    isInsider: boolean;
                };
                isLaptop: boolean;
                hasBitLocker: boolean;
            } | undefined;
            signature?: string | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        profile: {
            name: string;
            description: string;
            tweaks: string[];
            hardwareProfile?: {
                gpu: {
                    vendor: "Intel" | "AMD" | "NVIDIA" | "Unknown";
                    model: string;
                    driverVersion: string;
                    vram: number;
                    supportsResizableBAR: boolean;
                    supportsHAGS: boolean;
                };
                cpu: {
                    vendor: "Intel" | "AMD" | "Unknown";
                    model: string;
                    cores: number;
                    threads: number;
                    baseClock: number;
                    maxClock: number;
                    architecture: string;
                };
                memory: {
                    type: string;
                    total: number;
                    speed: number;
                    channels: number;
                };
                storage: {
                    type: "SSD" | "HDD" | "NVMe";
                    model: string;
                    deviceId: string;
                    size: number;
                    smartStatus: string;
                }[];
                network: {
                    driverVersion: string;
                    speed: number;
                    adapterName: string;
                    macAddress: string;
                };
                windowsVersion: {
                    version: string;
                    build: number;
                    edition: "Unknown" | "Home" | "Pro" | "Enterprise" | "Education";
                    isInsider: boolean;
                };
                isLaptop: boolean;
                hasBitLocker: boolean;
            } | undefined;
            signature?: string | undefined;
        };
    }, {
        profile: {
            name: string;
            description: string;
            tweaks: string[];
            hardwareProfile?: {
                gpu: {
                    vendor: "Intel" | "AMD" | "NVIDIA" | "Unknown";
                    model: string;
                    driverVersion: string;
                    vram: number;
                    supportsResizableBAR: boolean;
                    supportsHAGS: boolean;
                };
                cpu: {
                    vendor: "Intel" | "AMD" | "Unknown";
                    model: string;
                    cores: number;
                    threads: number;
                    baseClock: number;
                    maxClock: number;
                    architecture: string;
                };
                memory: {
                    type: string;
                    total: number;
                    speed: number;
                    channels: number;
                };
                storage: {
                    type: "SSD" | "HDD" | "NVMe";
                    model: string;
                    deviceId: string;
                    size: number;
                    smartStatus: string;
                }[];
                network: {
                    driverVersion: string;
                    speed: number;
                    adapterName: string;
                    macAddress: string;
                };
                windowsVersion: {
                    version: string;
                    build: number;
                    edition: "Unknown" | "Home" | "Pro" | "Enterprise" | "Education";
                    isInsider: boolean;
                };
                isLaptop: boolean;
                hasBitLocker: boolean;
            } | undefined;
            signature?: string | undefined;
        };
    }>;
    readonly 'profile:update': z.ZodObject<{
        id: z.ZodString;
        profile: z.ZodObject<{
            id: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            description: z.ZodOptional<z.ZodString>;
            tweaks: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            hardwareProfile: z.ZodOptional<z.ZodOptional<z.ZodObject<{
                cpu: z.ZodObject<{
                    vendor: z.ZodEnum<["Intel", "AMD", "Unknown"]>;
                    model: z.ZodString;
                    cores: z.ZodNumber;
                    threads: z.ZodNumber;
                    baseClock: z.ZodNumber;
                    maxClock: z.ZodNumber;
                    architecture: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    vendor: "Intel" | "AMD" | "Unknown";
                    model: string;
                    cores: number;
                    threads: number;
                    baseClock: number;
                    maxClock: number;
                    architecture: string;
                }, {
                    vendor: "Intel" | "AMD" | "Unknown";
                    model: string;
                    cores: number;
                    threads: number;
                    baseClock: number;
                    maxClock: number;
                    architecture: string;
                }>;
                gpu: z.ZodObject<{
                    vendor: z.ZodEnum<["NVIDIA", "AMD", "Intel", "Unknown"]>;
                    model: z.ZodString;
                    driverVersion: z.ZodString;
                    vram: z.ZodNumber;
                    supportsHAGS: z.ZodBoolean;
                    supportsResizableBAR: z.ZodBoolean;
                }, "strip", z.ZodTypeAny, {
                    vendor: "Intel" | "AMD" | "NVIDIA" | "Unknown";
                    model: string;
                    driverVersion: string;
                    vram: number;
                    supportsResizableBAR: boolean;
                    supportsHAGS: boolean;
                }, {
                    vendor: "Intel" | "AMD" | "NVIDIA" | "Unknown";
                    model: string;
                    driverVersion: string;
                    vram: number;
                    supportsResizableBAR: boolean;
                    supportsHAGS: boolean;
                }>;
                memory: z.ZodObject<{
                    total: z.ZodNumber;
                    speed: z.ZodNumber;
                    type: z.ZodString;
                    channels: z.ZodNumber;
                }, "strip", z.ZodTypeAny, {
                    type: string;
                    total: number;
                    speed: number;
                    channels: number;
                }, {
                    type: string;
                    total: number;
                    speed: number;
                    channels: number;
                }>;
                storage: z.ZodArray<z.ZodObject<{
                    deviceId: z.ZodString;
                    model: z.ZodString;
                    type: z.ZodEnum<["SSD", "HDD", "NVMe"]>;
                    size: z.ZodNumber;
                    smartStatus: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    type: "SSD" | "HDD" | "NVMe";
                    model: string;
                    deviceId: string;
                    size: number;
                    smartStatus: string;
                }, {
                    type: "SSD" | "HDD" | "NVMe";
                    model: string;
                    deviceId: string;
                    size: number;
                    smartStatus: string;
                }>, "many">;
                network: z.ZodObject<{
                    adapterName: z.ZodString;
                    macAddress: z.ZodString;
                    speed: z.ZodNumber;
                    driverVersion: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    driverVersion: string;
                    speed: number;
                    adapterName: string;
                    macAddress: string;
                }, {
                    driverVersion: string;
                    speed: number;
                    adapterName: string;
                    macAddress: string;
                }>;
                windowsVersion: z.ZodObject<{
                    version: z.ZodString;
                    build: z.ZodNumber;
                    edition: z.ZodEnum<["Home", "Pro", "Enterprise", "Education", "Unknown"]>;
                    isInsider: z.ZodBoolean;
                }, "strip", z.ZodTypeAny, {
                    version: string;
                    build: number;
                    edition: "Unknown" | "Home" | "Pro" | "Enterprise" | "Education";
                    isInsider: boolean;
                }, {
                    version: string;
                    build: number;
                    edition: "Unknown" | "Home" | "Pro" | "Enterprise" | "Education";
                    isInsider: boolean;
                }>;
                isLaptop: z.ZodBoolean;
                hasBitLocker: z.ZodBoolean;
            }, "strip", z.ZodTypeAny, {
                gpu: {
                    vendor: "Intel" | "AMD" | "NVIDIA" | "Unknown";
                    model: string;
                    driverVersion: string;
                    vram: number;
                    supportsResizableBAR: boolean;
                    supportsHAGS: boolean;
                };
                cpu: {
                    vendor: "Intel" | "AMD" | "Unknown";
                    model: string;
                    cores: number;
                    threads: number;
                    baseClock: number;
                    maxClock: number;
                    architecture: string;
                };
                memory: {
                    type: string;
                    total: number;
                    speed: number;
                    channels: number;
                };
                storage: {
                    type: "SSD" | "HDD" | "NVMe";
                    model: string;
                    deviceId: string;
                    size: number;
                    smartStatus: string;
                }[];
                network: {
                    driverVersion: string;
                    speed: number;
                    adapterName: string;
                    macAddress: string;
                };
                windowsVersion: {
                    version: string;
                    build: number;
                    edition: "Unknown" | "Home" | "Pro" | "Enterprise" | "Education";
                    isInsider: boolean;
                };
                isLaptop: boolean;
                hasBitLocker: boolean;
            }, {
                gpu: {
                    vendor: "Intel" | "AMD" | "NVIDIA" | "Unknown";
                    model: string;
                    driverVersion: string;
                    vram: number;
                    supportsResizableBAR: boolean;
                    supportsHAGS: boolean;
                };
                cpu: {
                    vendor: "Intel" | "AMD" | "Unknown";
                    model: string;
                    cores: number;
                    threads: number;
                    baseClock: number;
                    maxClock: number;
                    architecture: string;
                };
                memory: {
                    type: string;
                    total: number;
                    speed: number;
                    channels: number;
                };
                storage: {
                    type: "SSD" | "HDD" | "NVMe";
                    model: string;
                    deviceId: string;
                    size: number;
                    smartStatus: string;
                }[];
                network: {
                    driverVersion: string;
                    speed: number;
                    adapterName: string;
                    macAddress: string;
                };
                windowsVersion: {
                    version: string;
                    build: number;
                    edition: "Unknown" | "Home" | "Pro" | "Enterprise" | "Education";
                    isInsider: boolean;
                };
                isLaptop: boolean;
                hasBitLocker: boolean;
            }>>>;
            createdAt: z.ZodOptional<z.ZodString>;
            updatedAt: z.ZodOptional<z.ZodString>;
            signature: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        }, "strip", z.ZodTypeAny, {
            id?: string | undefined;
            name?: string | undefined;
            description?: string | undefined;
            tweaks?: string[] | undefined;
            createdAt?: string | undefined;
            updatedAt?: string | undefined;
            hardwareProfile?: {
                gpu: {
                    vendor: "Intel" | "AMD" | "NVIDIA" | "Unknown";
                    model: string;
                    driverVersion: string;
                    vram: number;
                    supportsResizableBAR: boolean;
                    supportsHAGS: boolean;
                };
                cpu: {
                    vendor: "Intel" | "AMD" | "Unknown";
                    model: string;
                    cores: number;
                    threads: number;
                    baseClock: number;
                    maxClock: number;
                    architecture: string;
                };
                memory: {
                    type: string;
                    total: number;
                    speed: number;
                    channels: number;
                };
                storage: {
                    type: "SSD" | "HDD" | "NVMe";
                    model: string;
                    deviceId: string;
                    size: number;
                    smartStatus: string;
                }[];
                network: {
                    driverVersion: string;
                    speed: number;
                    adapterName: string;
                    macAddress: string;
                };
                windowsVersion: {
                    version: string;
                    build: number;
                    edition: "Unknown" | "Home" | "Pro" | "Enterprise" | "Education";
                    isInsider: boolean;
                };
                isLaptop: boolean;
                hasBitLocker: boolean;
            } | undefined;
            signature?: string | undefined;
        }, {
            id?: string | undefined;
            name?: string | undefined;
            description?: string | undefined;
            tweaks?: string[] | undefined;
            createdAt?: string | undefined;
            updatedAt?: string | undefined;
            hardwareProfile?: {
                gpu: {
                    vendor: "Intel" | "AMD" | "NVIDIA" | "Unknown";
                    model: string;
                    driverVersion: string;
                    vram: number;
                    supportsResizableBAR: boolean;
                    supportsHAGS: boolean;
                };
                cpu: {
                    vendor: "Intel" | "AMD" | "Unknown";
                    model: string;
                    cores: number;
                    threads: number;
                    baseClock: number;
                    maxClock: number;
                    architecture: string;
                };
                memory: {
                    type: string;
                    total: number;
                    speed: number;
                    channels: number;
                };
                storage: {
                    type: "SSD" | "HDD" | "NVMe";
                    model: string;
                    deviceId: string;
                    size: number;
                    smartStatus: string;
                }[];
                network: {
                    driverVersion: string;
                    speed: number;
                    adapterName: string;
                    macAddress: string;
                };
                windowsVersion: {
                    version: string;
                    build: number;
                    edition: "Unknown" | "Home" | "Pro" | "Enterprise" | "Education";
                    isInsider: boolean;
                };
                isLaptop: boolean;
                hasBitLocker: boolean;
            } | undefined;
            signature?: string | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        profile: {
            id?: string | undefined;
            name?: string | undefined;
            description?: string | undefined;
            tweaks?: string[] | undefined;
            createdAt?: string | undefined;
            updatedAt?: string | undefined;
            hardwareProfile?: {
                gpu: {
                    vendor: "Intel" | "AMD" | "NVIDIA" | "Unknown";
                    model: string;
                    driverVersion: string;
                    vram: number;
                    supportsResizableBAR: boolean;
                    supportsHAGS: boolean;
                };
                cpu: {
                    vendor: "Intel" | "AMD" | "Unknown";
                    model: string;
                    cores: number;
                    threads: number;
                    baseClock: number;
                    maxClock: number;
                    architecture: string;
                };
                memory: {
                    type: string;
                    total: number;
                    speed: number;
                    channels: number;
                };
                storage: {
                    type: "SSD" | "HDD" | "NVMe";
                    model: string;
                    deviceId: string;
                    size: number;
                    smartStatus: string;
                }[];
                network: {
                    driverVersion: string;
                    speed: number;
                    adapterName: string;
                    macAddress: string;
                };
                windowsVersion: {
                    version: string;
                    build: number;
                    edition: "Unknown" | "Home" | "Pro" | "Enterprise" | "Education";
                    isInsider: boolean;
                };
                isLaptop: boolean;
                hasBitLocker: boolean;
            } | undefined;
            signature?: string | undefined;
        };
    }, {
        id: string;
        profile: {
            id?: string | undefined;
            name?: string | undefined;
            description?: string | undefined;
            tweaks?: string[] | undefined;
            createdAt?: string | undefined;
            updatedAt?: string | undefined;
            hardwareProfile?: {
                gpu: {
                    vendor: "Intel" | "AMD" | "NVIDIA" | "Unknown";
                    model: string;
                    driverVersion: string;
                    vram: number;
                    supportsResizableBAR: boolean;
                    supportsHAGS: boolean;
                };
                cpu: {
                    vendor: "Intel" | "AMD" | "Unknown";
                    model: string;
                    cores: number;
                    threads: number;
                    baseClock: number;
                    maxClock: number;
                    architecture: string;
                };
                memory: {
                    type: string;
                    total: number;
                    speed: number;
                    channels: number;
                };
                storage: {
                    type: "SSD" | "HDD" | "NVMe";
                    model: string;
                    deviceId: string;
                    size: number;
                    smartStatus: string;
                }[];
                network: {
                    driverVersion: string;
                    speed: number;
                    adapterName: string;
                    macAddress: string;
                };
                windowsVersion: {
                    version: string;
                    build: number;
                    edition: "Unknown" | "Home" | "Pro" | "Enterprise" | "Education";
                    isInsider: boolean;
                };
                isLaptop: boolean;
                hasBitLocker: boolean;
            } | undefined;
            signature?: string | undefined;
        };
    }>;
    readonly 'profile:delete': z.ZodObject<{
        id: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
    }, {
        id: string;
    }>;
    readonly 'profile:apply': z.ZodObject<{
        id: z.ZodString;
        options: z.ZodOptional<z.ZodObject<{
            dryRun: z.ZodOptional<z.ZodBoolean>;
            force: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            force?: boolean | undefined;
            dryRun?: boolean | undefined;
        }, {
            force?: boolean | undefined;
            dryRun?: boolean | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        options?: {
            force?: boolean | undefined;
            dryRun?: boolean | undefined;
        } | undefined;
    }, {
        id: string;
        options?: {
            force?: boolean | undefined;
            dryRun?: boolean | undefined;
        } | undefined;
    }>;
    readonly 'profile:import': z.ZodObject<{
        json: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        json: string;
    }, {
        json: string;
    }>;
    readonly 'profile:export': z.ZodObject<{
        id: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
    }, {
        id: string;
    }>;
    readonly 'benchmark:run': z.ZodObject<{
        tweakId: z.ZodOptional<z.ZodString>;
        profileId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        profileId?: string | undefined;
        tweakId?: string | undefined;
    }, {
        profileId?: string | undefined;
        tweakId?: string | undefined;
    }>;
    readonly 'benchmark:results': z.ZodVoid;
    readonly 'benchmark:compare': z.ZodObject<{
        beforeId: z.ZodString;
        afterId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        beforeId: string;
        afterId: string;
    }, {
        beforeId: string;
        afterId: string;
    }>;
    readonly 'game:list': z.ZodVoid;
    readonly 'game:detect': z.ZodVoid;
    readonly 'game:create': z.ZodObject<{
        profile: z.ZodObject<Omit<{
            id: z.ZodString;
            name: z.ZodString;
            executable: z.ZodString;
            steamId: z.ZodOptional<z.ZodString>;
            epicId: z.ZodOptional<z.ZodString>;
            customArgs: z.ZodOptional<z.ZodString>;
            tweaks: z.ZodObject<{
                powerPlan: z.ZodEnum<["ultimate", "high", "balanced", "custom"]>;
                timerResolution: z.ZodNumber;
                cpuPriority: z.ZodEnum<["high", "realtime", "normal"]>;
                gameMode: z.ZodBoolean;
                gameDVR: z.ZodBoolean;
                notifications: z.ZodBoolean;
                suspendedProcesses: z.ZodArray<z.ZodString, "many">;
                gpuProfile: z.ZodObject<{
                    nvidia: z.ZodOptional<z.ZodObject<{
                        lowLatencyMode: z.ZodEnum<["off", "on", "ultra"]>;
                        powerManagement: z.ZodEnum<["max_performance", "optimal", "adaptive"]>;
                        shaderCache: z.ZodEnum<["on", "off", "driver_default"]>;
                        textureFiltering: z.ZodEnum<["high_performance", "quality", "driver_default"]>;
                        reflex: z.ZodEnum<["on", "off", "on_plus_boost"]>;
                    }, "strip", z.ZodTypeAny, {
                        lowLatencyMode: "off" | "on" | "ultra";
                        powerManagement: "max_performance" | "optimal" | "adaptive";
                        shaderCache: "off" | "on" | "driver_default";
                        textureFiltering: "driver_default" | "high_performance" | "quality";
                        reflex: "off" | "on" | "on_plus_boost";
                    }, {
                        lowLatencyMode: "off" | "on" | "ultra";
                        powerManagement: "max_performance" | "optimal" | "adaptive";
                        shaderCache: "off" | "on" | "driver_default";
                        textureFiltering: "driver_default" | "high_performance" | "quality";
                        reflex: "off" | "on" | "on_plus_boost";
                    }>>;
                    amd: z.ZodOptional<z.ZodObject<{
                        antiLag: z.ZodBoolean;
                        chill: z.ZodNullable<z.ZodObject<{
                            minFps: z.ZodNumber;
                            maxFps: z.ZodNumber;
                        }, "strip", z.ZodTypeAny, {
                            minFps: number;
                            maxFps: number;
                        }, {
                            minFps: number;
                            maxFps: number;
                        }>>;
                        shaderCache: z.ZodBoolean;
                    }, "strip", z.ZodTypeAny, {
                        shaderCache: boolean;
                        antiLag: boolean;
                        chill: {
                            minFps: number;
                            maxFps: number;
                        } | null;
                    }, {
                        shaderCache: boolean;
                        antiLag: boolean;
                        chill: {
                            minFps: number;
                            maxFps: number;
                        } | null;
                    }>>;
                    intel: z.ZodOptional<z.ZodObject<{
                        powerMode: z.ZodEnum<["max_performance", "balanced", "power_saver"]>;
                    }, "strip", z.ZodTypeAny, {
                        powerMode: "balanced" | "max_performance" | "power_saver";
                    }, {
                        powerMode: "balanced" | "max_performance" | "power_saver";
                    }>>;
                    common: z.ZodOptional<z.ZodObject<{
                        hags: z.ZodBoolean;
                        gpuPreference: z.ZodEnum<["high_performance", "power_saving", "auto"]>;
                        fullscreenOptimizations: z.ZodBoolean;
                        mpo: z.ZodBoolean;
                        vrr: z.ZodBoolean;
                    }, "strip", z.ZodTypeAny, {
                        hags: boolean;
                        gpuPreference: "high_performance" | "power_saving" | "auto";
                        fullscreenOptimizations: boolean;
                        mpo: boolean;
                        vrr: boolean;
                    }, {
                        hags: boolean;
                        gpuPreference: "high_performance" | "power_saving" | "auto";
                        fullscreenOptimizations: boolean;
                        mpo: boolean;
                        vrr: boolean;
                    }>>;
                }, "strip", z.ZodTypeAny, {
                    nvidia?: {
                        lowLatencyMode: "off" | "on" | "ultra";
                        powerManagement: "max_performance" | "optimal" | "adaptive";
                        shaderCache: "off" | "on" | "driver_default";
                        textureFiltering: "driver_default" | "high_performance" | "quality";
                        reflex: "off" | "on" | "on_plus_boost";
                    } | undefined;
                    amd?: {
                        shaderCache: boolean;
                        antiLag: boolean;
                        chill: {
                            minFps: number;
                            maxFps: number;
                        } | null;
                    } | undefined;
                    intel?: {
                        powerMode: "balanced" | "max_performance" | "power_saver";
                    } | undefined;
                    common?: {
                        hags: boolean;
                        gpuPreference: "high_performance" | "power_saving" | "auto";
                        fullscreenOptimizations: boolean;
                        mpo: boolean;
                        vrr: boolean;
                    } | undefined;
                }, {
                    nvidia?: {
                        lowLatencyMode: "off" | "on" | "ultra";
                        powerManagement: "max_performance" | "optimal" | "adaptive";
                        shaderCache: "off" | "on" | "driver_default";
                        textureFiltering: "driver_default" | "high_performance" | "quality";
                        reflex: "off" | "on" | "on_plus_boost";
                    } | undefined;
                    amd?: {
                        shaderCache: boolean;
                        antiLag: boolean;
                        chill: {
                            minFps: number;
                            maxFps: number;
                        } | null;
                    } | undefined;
                    intel?: {
                        powerMode: "balanced" | "max_performance" | "power_saver";
                    } | undefined;
                    common?: {
                        hags: boolean;
                        gpuPreference: "high_performance" | "power_saving" | "auto";
                        fullscreenOptimizations: boolean;
                        mpo: boolean;
                        vrr: boolean;
                    } | undefined;
                }>;
            }, "strip", z.ZodTypeAny, {
                powerPlan: "ultimate" | "high" | "balanced" | "custom";
                gameMode: boolean;
                gameDVR: boolean;
                notifications: boolean;
                timerResolution: number;
                suspendedProcesses: string[];
                cpuPriority: "high" | "realtime" | "normal";
                gpuProfile: {
                    nvidia?: {
                        lowLatencyMode: "off" | "on" | "ultra";
                        powerManagement: "max_performance" | "optimal" | "adaptive";
                        shaderCache: "off" | "on" | "driver_default";
                        textureFiltering: "driver_default" | "high_performance" | "quality";
                        reflex: "off" | "on" | "on_plus_boost";
                    } | undefined;
                    amd?: {
                        shaderCache: boolean;
                        antiLag: boolean;
                        chill: {
                            minFps: number;
                            maxFps: number;
                        } | null;
                    } | undefined;
                    intel?: {
                        powerMode: "balanced" | "max_performance" | "power_saver";
                    } | undefined;
                    common?: {
                        hags: boolean;
                        gpuPreference: "high_performance" | "power_saving" | "auto";
                        fullscreenOptimizations: boolean;
                        mpo: boolean;
                        vrr: boolean;
                    } | undefined;
                };
            }, {
                powerPlan: "ultimate" | "high" | "balanced" | "custom";
                gameMode: boolean;
                gameDVR: boolean;
                notifications: boolean;
                timerResolution: number;
                suspendedProcesses: string[];
                cpuPriority: "high" | "realtime" | "normal";
                gpuProfile: {
                    nvidia?: {
                        lowLatencyMode: "off" | "on" | "ultra";
                        powerManagement: "max_performance" | "optimal" | "adaptive";
                        shaderCache: "off" | "on" | "driver_default";
                        textureFiltering: "driver_default" | "high_performance" | "quality";
                        reflex: "off" | "on" | "on_plus_boost";
                    } | undefined;
                    amd?: {
                        shaderCache: boolean;
                        antiLag: boolean;
                        chill: {
                            minFps: number;
                            maxFps: number;
                        } | null;
                    } | undefined;
                    intel?: {
                        powerMode: "balanced" | "max_performance" | "power_saver";
                    } | undefined;
                    common?: {
                        hags: boolean;
                        gpuPreference: "high_performance" | "power_saving" | "auto";
                        fullscreenOptimizations: boolean;
                        mpo: boolean;
                        vrr: boolean;
                    } | undefined;
                };
            }>;
            autoApply: z.ZodBoolean;
            createdAt: z.ZodString;
            updatedAt: z.ZodString;
        }, "id" | "createdAt" | "updatedAt">, "strip", z.ZodTypeAny, {
            name: string;
            tweaks: {
                powerPlan: "ultimate" | "high" | "balanced" | "custom";
                gameMode: boolean;
                gameDVR: boolean;
                notifications: boolean;
                timerResolution: number;
                suspendedProcesses: string[];
                cpuPriority: "high" | "realtime" | "normal";
                gpuProfile: {
                    nvidia?: {
                        lowLatencyMode: "off" | "on" | "ultra";
                        powerManagement: "max_performance" | "optimal" | "adaptive";
                        shaderCache: "off" | "on" | "driver_default";
                        textureFiltering: "driver_default" | "high_performance" | "quality";
                        reflex: "off" | "on" | "on_plus_boost";
                    } | undefined;
                    amd?: {
                        shaderCache: boolean;
                        antiLag: boolean;
                        chill: {
                            minFps: number;
                            maxFps: number;
                        } | null;
                    } | undefined;
                    intel?: {
                        powerMode: "balanced" | "max_performance" | "power_saver";
                    } | undefined;
                    common?: {
                        hags: boolean;
                        gpuPreference: "high_performance" | "power_saving" | "auto";
                        fullscreenOptimizations: boolean;
                        mpo: boolean;
                        vrr: boolean;
                    } | undefined;
                };
            };
            autoApply: boolean;
            executable: string;
            epicId?: string | undefined;
            steamId?: string | undefined;
            customArgs?: string | undefined;
        }, {
            name: string;
            tweaks: {
                powerPlan: "ultimate" | "high" | "balanced" | "custom";
                gameMode: boolean;
                gameDVR: boolean;
                notifications: boolean;
                timerResolution: number;
                suspendedProcesses: string[];
                cpuPriority: "high" | "realtime" | "normal";
                gpuProfile: {
                    nvidia?: {
                        lowLatencyMode: "off" | "on" | "ultra";
                        powerManagement: "max_performance" | "optimal" | "adaptive";
                        shaderCache: "off" | "on" | "driver_default";
                        textureFiltering: "driver_default" | "high_performance" | "quality";
                        reflex: "off" | "on" | "on_plus_boost";
                    } | undefined;
                    amd?: {
                        shaderCache: boolean;
                        antiLag: boolean;
                        chill: {
                            minFps: number;
                            maxFps: number;
                        } | null;
                    } | undefined;
                    intel?: {
                        powerMode: "balanced" | "max_performance" | "power_saver";
                    } | undefined;
                    common?: {
                        hags: boolean;
                        gpuPreference: "high_performance" | "power_saving" | "auto";
                        fullscreenOptimizations: boolean;
                        mpo: boolean;
                        vrr: boolean;
                    } | undefined;
                };
            };
            autoApply: boolean;
            executable: string;
            epicId?: string | undefined;
            steamId?: string | undefined;
            customArgs?: string | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        profile: {
            name: string;
            tweaks: {
                powerPlan: "ultimate" | "high" | "balanced" | "custom";
                gameMode: boolean;
                gameDVR: boolean;
                notifications: boolean;
                timerResolution: number;
                suspendedProcesses: string[];
                cpuPriority: "high" | "realtime" | "normal";
                gpuProfile: {
                    nvidia?: {
                        lowLatencyMode: "off" | "on" | "ultra";
                        powerManagement: "max_performance" | "optimal" | "adaptive";
                        shaderCache: "off" | "on" | "driver_default";
                        textureFiltering: "driver_default" | "high_performance" | "quality";
                        reflex: "off" | "on" | "on_plus_boost";
                    } | undefined;
                    amd?: {
                        shaderCache: boolean;
                        antiLag: boolean;
                        chill: {
                            minFps: number;
                            maxFps: number;
                        } | null;
                    } | undefined;
                    intel?: {
                        powerMode: "balanced" | "max_performance" | "power_saver";
                    } | undefined;
                    common?: {
                        hags: boolean;
                        gpuPreference: "high_performance" | "power_saving" | "auto";
                        fullscreenOptimizations: boolean;
                        mpo: boolean;
                        vrr: boolean;
                    } | undefined;
                };
            };
            autoApply: boolean;
            executable: string;
            epicId?: string | undefined;
            steamId?: string | undefined;
            customArgs?: string | undefined;
        };
    }, {
        profile: {
            name: string;
            tweaks: {
                powerPlan: "ultimate" | "high" | "balanced" | "custom";
                gameMode: boolean;
                gameDVR: boolean;
                notifications: boolean;
                timerResolution: number;
                suspendedProcesses: string[];
                cpuPriority: "high" | "realtime" | "normal";
                gpuProfile: {
                    nvidia?: {
                        lowLatencyMode: "off" | "on" | "ultra";
                        powerManagement: "max_performance" | "optimal" | "adaptive";
                        shaderCache: "off" | "on" | "driver_default";
                        textureFiltering: "driver_default" | "high_performance" | "quality";
                        reflex: "off" | "on" | "on_plus_boost";
                    } | undefined;
                    amd?: {
                        shaderCache: boolean;
                        antiLag: boolean;
                        chill: {
                            minFps: number;
                            maxFps: number;
                        } | null;
                    } | undefined;
                    intel?: {
                        powerMode: "balanced" | "max_performance" | "power_saver";
                    } | undefined;
                    common?: {
                        hags: boolean;
                        gpuPreference: "high_performance" | "power_saving" | "auto";
                        fullscreenOptimizations: boolean;
                        mpo: boolean;
                        vrr: boolean;
                    } | undefined;
                };
            };
            autoApply: boolean;
            executable: string;
            epicId?: string | undefined;
            steamId?: string | undefined;
            customArgs?: string | undefined;
        };
    }>;
    readonly 'game:update': z.ZodObject<{
        id: z.ZodString;
        profile: z.ZodObject<{
            id: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            executable: z.ZodOptional<z.ZodString>;
            steamId: z.ZodOptional<z.ZodOptional<z.ZodString>>;
            epicId: z.ZodOptional<z.ZodOptional<z.ZodString>>;
            customArgs: z.ZodOptional<z.ZodOptional<z.ZodString>>;
            tweaks: z.ZodOptional<z.ZodObject<{
                powerPlan: z.ZodEnum<["ultimate", "high", "balanced", "custom"]>;
                timerResolution: z.ZodNumber;
                cpuPriority: z.ZodEnum<["high", "realtime", "normal"]>;
                gameMode: z.ZodBoolean;
                gameDVR: z.ZodBoolean;
                notifications: z.ZodBoolean;
                suspendedProcesses: z.ZodArray<z.ZodString, "many">;
                gpuProfile: z.ZodObject<{
                    nvidia: z.ZodOptional<z.ZodObject<{
                        lowLatencyMode: z.ZodEnum<["off", "on", "ultra"]>;
                        powerManagement: z.ZodEnum<["max_performance", "optimal", "adaptive"]>;
                        shaderCache: z.ZodEnum<["on", "off", "driver_default"]>;
                        textureFiltering: z.ZodEnum<["high_performance", "quality", "driver_default"]>;
                        reflex: z.ZodEnum<["on", "off", "on_plus_boost"]>;
                    }, "strip", z.ZodTypeAny, {
                        lowLatencyMode: "off" | "on" | "ultra";
                        powerManagement: "max_performance" | "optimal" | "adaptive";
                        shaderCache: "off" | "on" | "driver_default";
                        textureFiltering: "driver_default" | "high_performance" | "quality";
                        reflex: "off" | "on" | "on_plus_boost";
                    }, {
                        lowLatencyMode: "off" | "on" | "ultra";
                        powerManagement: "max_performance" | "optimal" | "adaptive";
                        shaderCache: "off" | "on" | "driver_default";
                        textureFiltering: "driver_default" | "high_performance" | "quality";
                        reflex: "off" | "on" | "on_plus_boost";
                    }>>;
                    amd: z.ZodOptional<z.ZodObject<{
                        antiLag: z.ZodBoolean;
                        chill: z.ZodNullable<z.ZodObject<{
                            minFps: z.ZodNumber;
                            maxFps: z.ZodNumber;
                        }, "strip", z.ZodTypeAny, {
                            minFps: number;
                            maxFps: number;
                        }, {
                            minFps: number;
                            maxFps: number;
                        }>>;
                        shaderCache: z.ZodBoolean;
                    }, "strip", z.ZodTypeAny, {
                        shaderCache: boolean;
                        antiLag: boolean;
                        chill: {
                            minFps: number;
                            maxFps: number;
                        } | null;
                    }, {
                        shaderCache: boolean;
                        antiLag: boolean;
                        chill: {
                            minFps: number;
                            maxFps: number;
                        } | null;
                    }>>;
                    intel: z.ZodOptional<z.ZodObject<{
                        powerMode: z.ZodEnum<["max_performance", "balanced", "power_saver"]>;
                    }, "strip", z.ZodTypeAny, {
                        powerMode: "balanced" | "max_performance" | "power_saver";
                    }, {
                        powerMode: "balanced" | "max_performance" | "power_saver";
                    }>>;
                    common: z.ZodOptional<z.ZodObject<{
                        hags: z.ZodBoolean;
                        gpuPreference: z.ZodEnum<["high_performance", "power_saving", "auto"]>;
                        fullscreenOptimizations: z.ZodBoolean;
                        mpo: z.ZodBoolean;
                        vrr: z.ZodBoolean;
                    }, "strip", z.ZodTypeAny, {
                        hags: boolean;
                        gpuPreference: "high_performance" | "power_saving" | "auto";
                        fullscreenOptimizations: boolean;
                        mpo: boolean;
                        vrr: boolean;
                    }, {
                        hags: boolean;
                        gpuPreference: "high_performance" | "power_saving" | "auto";
                        fullscreenOptimizations: boolean;
                        mpo: boolean;
                        vrr: boolean;
                    }>>;
                }, "strip", z.ZodTypeAny, {
                    nvidia?: {
                        lowLatencyMode: "off" | "on" | "ultra";
                        powerManagement: "max_performance" | "optimal" | "adaptive";
                        shaderCache: "off" | "on" | "driver_default";
                        textureFiltering: "driver_default" | "high_performance" | "quality";
                        reflex: "off" | "on" | "on_plus_boost";
                    } | undefined;
                    amd?: {
                        shaderCache: boolean;
                        antiLag: boolean;
                        chill: {
                            minFps: number;
                            maxFps: number;
                        } | null;
                    } | undefined;
                    intel?: {
                        powerMode: "balanced" | "max_performance" | "power_saver";
                    } | undefined;
                    common?: {
                        hags: boolean;
                        gpuPreference: "high_performance" | "power_saving" | "auto";
                        fullscreenOptimizations: boolean;
                        mpo: boolean;
                        vrr: boolean;
                    } | undefined;
                }, {
                    nvidia?: {
                        lowLatencyMode: "off" | "on" | "ultra";
                        powerManagement: "max_performance" | "optimal" | "adaptive";
                        shaderCache: "off" | "on" | "driver_default";
                        textureFiltering: "driver_default" | "high_performance" | "quality";
                        reflex: "off" | "on" | "on_plus_boost";
                    } | undefined;
                    amd?: {
                        shaderCache: boolean;
                        antiLag: boolean;
                        chill: {
                            minFps: number;
                            maxFps: number;
                        } | null;
                    } | undefined;
                    intel?: {
                        powerMode: "balanced" | "max_performance" | "power_saver";
                    } | undefined;
                    common?: {
                        hags: boolean;
                        gpuPreference: "high_performance" | "power_saving" | "auto";
                        fullscreenOptimizations: boolean;
                        mpo: boolean;
                        vrr: boolean;
                    } | undefined;
                }>;
            }, "strip", z.ZodTypeAny, {
                powerPlan: "ultimate" | "high" | "balanced" | "custom";
                gameMode: boolean;
                gameDVR: boolean;
                notifications: boolean;
                timerResolution: number;
                suspendedProcesses: string[];
                cpuPriority: "high" | "realtime" | "normal";
                gpuProfile: {
                    nvidia?: {
                        lowLatencyMode: "off" | "on" | "ultra";
                        powerManagement: "max_performance" | "optimal" | "adaptive";
                        shaderCache: "off" | "on" | "driver_default";
                        textureFiltering: "driver_default" | "high_performance" | "quality";
                        reflex: "off" | "on" | "on_plus_boost";
                    } | undefined;
                    amd?: {
                        shaderCache: boolean;
                        antiLag: boolean;
                        chill: {
                            minFps: number;
                            maxFps: number;
                        } | null;
                    } | undefined;
                    intel?: {
                        powerMode: "balanced" | "max_performance" | "power_saver";
                    } | undefined;
                    common?: {
                        hags: boolean;
                        gpuPreference: "high_performance" | "power_saving" | "auto";
                        fullscreenOptimizations: boolean;
                        mpo: boolean;
                        vrr: boolean;
                    } | undefined;
                };
            }, {
                powerPlan: "ultimate" | "high" | "balanced" | "custom";
                gameMode: boolean;
                gameDVR: boolean;
                notifications: boolean;
                timerResolution: number;
                suspendedProcesses: string[];
                cpuPriority: "high" | "realtime" | "normal";
                gpuProfile: {
                    nvidia?: {
                        lowLatencyMode: "off" | "on" | "ultra";
                        powerManagement: "max_performance" | "optimal" | "adaptive";
                        shaderCache: "off" | "on" | "driver_default";
                        textureFiltering: "driver_default" | "high_performance" | "quality";
                        reflex: "off" | "on" | "on_plus_boost";
                    } | undefined;
                    amd?: {
                        shaderCache: boolean;
                        antiLag: boolean;
                        chill: {
                            minFps: number;
                            maxFps: number;
                        } | null;
                    } | undefined;
                    intel?: {
                        powerMode: "balanced" | "max_performance" | "power_saver";
                    } | undefined;
                    common?: {
                        hags: boolean;
                        gpuPreference: "high_performance" | "power_saving" | "auto";
                        fullscreenOptimizations: boolean;
                        mpo: boolean;
                        vrr: boolean;
                    } | undefined;
                };
            }>>;
            autoApply: z.ZodOptional<z.ZodBoolean>;
            createdAt: z.ZodOptional<z.ZodString>;
            updatedAt: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            id?: string | undefined;
            name?: string | undefined;
            tweaks?: {
                powerPlan: "ultimate" | "high" | "balanced" | "custom";
                gameMode: boolean;
                gameDVR: boolean;
                notifications: boolean;
                timerResolution: number;
                suspendedProcesses: string[];
                cpuPriority: "high" | "realtime" | "normal";
                gpuProfile: {
                    nvidia?: {
                        lowLatencyMode: "off" | "on" | "ultra";
                        powerManagement: "max_performance" | "optimal" | "adaptive";
                        shaderCache: "off" | "on" | "driver_default";
                        textureFiltering: "driver_default" | "high_performance" | "quality";
                        reflex: "off" | "on" | "on_plus_boost";
                    } | undefined;
                    amd?: {
                        shaderCache: boolean;
                        antiLag: boolean;
                        chill: {
                            minFps: number;
                            maxFps: number;
                        } | null;
                    } | undefined;
                    intel?: {
                        powerMode: "balanced" | "max_performance" | "power_saver";
                    } | undefined;
                    common?: {
                        hags: boolean;
                        gpuPreference: "high_performance" | "power_saving" | "auto";
                        fullscreenOptimizations: boolean;
                        mpo: boolean;
                        vrr: boolean;
                    } | undefined;
                };
            } | undefined;
            epicId?: string | undefined;
            steamId?: string | undefined;
            autoApply?: boolean | undefined;
            createdAt?: string | undefined;
            updatedAt?: string | undefined;
            executable?: string | undefined;
            customArgs?: string | undefined;
        }, {
            id?: string | undefined;
            name?: string | undefined;
            tweaks?: {
                powerPlan: "ultimate" | "high" | "balanced" | "custom";
                gameMode: boolean;
                gameDVR: boolean;
                notifications: boolean;
                timerResolution: number;
                suspendedProcesses: string[];
                cpuPriority: "high" | "realtime" | "normal";
                gpuProfile: {
                    nvidia?: {
                        lowLatencyMode: "off" | "on" | "ultra";
                        powerManagement: "max_performance" | "optimal" | "adaptive";
                        shaderCache: "off" | "on" | "driver_default";
                        textureFiltering: "driver_default" | "high_performance" | "quality";
                        reflex: "off" | "on" | "on_plus_boost";
                    } | undefined;
                    amd?: {
                        shaderCache: boolean;
                        antiLag: boolean;
                        chill: {
                            minFps: number;
                            maxFps: number;
                        } | null;
                    } | undefined;
                    intel?: {
                        powerMode: "balanced" | "max_performance" | "power_saver";
                    } | undefined;
                    common?: {
                        hags: boolean;
                        gpuPreference: "high_performance" | "power_saving" | "auto";
                        fullscreenOptimizations: boolean;
                        mpo: boolean;
                        vrr: boolean;
                    } | undefined;
                };
            } | undefined;
            epicId?: string | undefined;
            steamId?: string | undefined;
            autoApply?: boolean | undefined;
            createdAt?: string | undefined;
            updatedAt?: string | undefined;
            executable?: string | undefined;
            customArgs?: string | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        profile: {
            id?: string | undefined;
            name?: string | undefined;
            tweaks?: {
                powerPlan: "ultimate" | "high" | "balanced" | "custom";
                gameMode: boolean;
                gameDVR: boolean;
                notifications: boolean;
                timerResolution: number;
                suspendedProcesses: string[];
                cpuPriority: "high" | "realtime" | "normal";
                gpuProfile: {
                    nvidia?: {
                        lowLatencyMode: "off" | "on" | "ultra";
                        powerManagement: "max_performance" | "optimal" | "adaptive";
                        shaderCache: "off" | "on" | "driver_default";
                        textureFiltering: "driver_default" | "high_performance" | "quality";
                        reflex: "off" | "on" | "on_plus_boost";
                    } | undefined;
                    amd?: {
                        shaderCache: boolean;
                        antiLag: boolean;
                        chill: {
                            minFps: number;
                            maxFps: number;
                        } | null;
                    } | undefined;
                    intel?: {
                        powerMode: "balanced" | "max_performance" | "power_saver";
                    } | undefined;
                    common?: {
                        hags: boolean;
                        gpuPreference: "high_performance" | "power_saving" | "auto";
                        fullscreenOptimizations: boolean;
                        mpo: boolean;
                        vrr: boolean;
                    } | undefined;
                };
            } | undefined;
            epicId?: string | undefined;
            steamId?: string | undefined;
            autoApply?: boolean | undefined;
            createdAt?: string | undefined;
            updatedAt?: string | undefined;
            executable?: string | undefined;
            customArgs?: string | undefined;
        };
    }, {
        id: string;
        profile: {
            id?: string | undefined;
            name?: string | undefined;
            tweaks?: {
                powerPlan: "ultimate" | "high" | "balanced" | "custom";
                gameMode: boolean;
                gameDVR: boolean;
                notifications: boolean;
                timerResolution: number;
                suspendedProcesses: string[];
                cpuPriority: "high" | "realtime" | "normal";
                gpuProfile: {
                    nvidia?: {
                        lowLatencyMode: "off" | "on" | "ultra";
                        powerManagement: "max_performance" | "optimal" | "adaptive";
                        shaderCache: "off" | "on" | "driver_default";
                        textureFiltering: "driver_default" | "high_performance" | "quality";
                        reflex: "off" | "on" | "on_plus_boost";
                    } | undefined;
                    amd?: {
                        shaderCache: boolean;
                        antiLag: boolean;
                        chill: {
                            minFps: number;
                            maxFps: number;
                        } | null;
                    } | undefined;
                    intel?: {
                        powerMode: "balanced" | "max_performance" | "power_saver";
                    } | undefined;
                    common?: {
                        hags: boolean;
                        gpuPreference: "high_performance" | "power_saving" | "auto";
                        fullscreenOptimizations: boolean;
                        mpo: boolean;
                        vrr: boolean;
                    } | undefined;
                };
            } | undefined;
            epicId?: string | undefined;
            steamId?: string | undefined;
            autoApply?: boolean | undefined;
            createdAt?: string | undefined;
            updatedAt?: string | undefined;
            executable?: string | undefined;
            customArgs?: string | undefined;
        };
    }>;
    readonly 'game:delete': z.ZodObject<{
        id: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
    }, {
        id: string;
    }>;
    readonly 'game:start': z.ZodObject<{
        gameId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        gameId: string;
    }, {
        gameId: string;
    }>;
    readonly 'game:stop': z.ZodObject<{
        gameId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        gameId: string;
    }, {
        gameId: string;
    }>;
    readonly 'system:hardware': z.ZodVoid;
    readonly 'system:preflight': z.ZodVoid;
    readonly 'system:restorePoint': z.ZodObject<{
        description: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        description: string;
    }, {
        description: string;
    }>;
    readonly 'system:backup': z.ZodVoid;
    readonly 'system:restore': z.ZodObject<{
        manifestId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        manifestId: string;
    }, {
        manifestId: string;
    }>;
    readonly 'system:journal': z.ZodVoid;
    readonly 'settings:get': z.ZodVoid;
    readonly 'settings:set': z.ZodObject<{
        settings: z.ZodObject<{
            language: z.ZodOptional<z.ZodEnum<["es", "en", "pt", "fr", "de"]>>;
            theme: z.ZodOptional<z.ZodEnum<["dark", "light", "system"]>>;
            autoStart: z.ZodOptional<z.ZodBoolean>;
            minimizeToTray: z.ZodOptional<z.ZodBoolean>;
            checkUpdates: z.ZodOptional<z.ZodBoolean>;
            telemetryOptIn: z.ZodOptional<z.ZodBoolean>;
            dryRunDefault: z.ZodOptional<z.ZodBoolean>;
            batterySaverMode: z.ZodOptional<z.ZodBoolean>;
            gameModeAuto: z.ZodOptional<z.ZodBoolean>;
            overlay: z.ZodOptional<z.ZodObject<{
                enabled: z.ZodBoolean;
                position: z.ZodObject<{
                    x: z.ZodNumber;
                    y: z.ZodNumber;
                }, "strip", z.ZodTypeAny, {
                    x: number;
                    y: number;
                }, {
                    x: number;
                    y: number;
                }>;
                scale: z.ZodNumber;
                opacity: z.ZodNumber;
                clickThrough: z.ZodBoolean;
                modules: z.ZodArray<z.ZodEnum<["cpu", "ram", "gpu", "ping", "timer", "fps", "temperature"]>, "many">;
                globalHotkey: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                enabled: boolean;
                position: {
                    x: number;
                    y: number;
                };
                scale: number;
                opacity: number;
                clickThrough: boolean;
                modules: ("gpu" | "cpu" | "ram" | "ping" | "timer" | "fps" | "temperature")[];
                globalHotkey: string;
            }, {
                enabled: boolean;
                position: {
                    x: number;
                    y: number;
                };
                scale: number;
                opacity: number;
                clickThrough: boolean;
                modules: ("gpu" | "cpu" | "ram" | "ping" | "timer" | "fps" | "temperature")[];
                globalHotkey: string;
            }>>;
            backupRetentionDays: z.ZodOptional<z.ZodNumber>;
            maxLogSize: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            language?: "es" | "en" | "pt" | "fr" | "de" | undefined;
            theme?: "dark" | "light" | "system" | undefined;
            autoStart?: boolean | undefined;
            minimizeToTray?: boolean | undefined;
            checkUpdates?: boolean | undefined;
            telemetryOptIn?: boolean | undefined;
            dryRunDefault?: boolean | undefined;
            batterySaverMode?: boolean | undefined;
            gameModeAuto?: boolean | undefined;
            overlay?: {
                enabled: boolean;
                position: {
                    x: number;
                    y: number;
                };
                scale: number;
                opacity: number;
                clickThrough: boolean;
                modules: ("gpu" | "cpu" | "ram" | "ping" | "timer" | "fps" | "temperature")[];
                globalHotkey: string;
            } | undefined;
            backupRetentionDays?: number | undefined;
            maxLogSize?: number | undefined;
        }, {
            language?: "es" | "en" | "pt" | "fr" | "de" | undefined;
            theme?: "dark" | "light" | "system" | undefined;
            autoStart?: boolean | undefined;
            minimizeToTray?: boolean | undefined;
            checkUpdates?: boolean | undefined;
            telemetryOptIn?: boolean | undefined;
            dryRunDefault?: boolean | undefined;
            batterySaverMode?: boolean | undefined;
            gameModeAuto?: boolean | undefined;
            overlay?: {
                enabled: boolean;
                position: {
                    x: number;
                    y: number;
                };
                scale: number;
                opacity: number;
                clickThrough: boolean;
                modules: ("gpu" | "cpu" | "ram" | "ping" | "timer" | "fps" | "temperature")[];
                globalHotkey: string;
            } | undefined;
            backupRetentionDays?: number | undefined;
            maxLogSize?: number | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        settings: {
            language?: "es" | "en" | "pt" | "fr" | "de" | undefined;
            theme?: "dark" | "light" | "system" | undefined;
            autoStart?: boolean | undefined;
            minimizeToTray?: boolean | undefined;
            checkUpdates?: boolean | undefined;
            telemetryOptIn?: boolean | undefined;
            dryRunDefault?: boolean | undefined;
            batterySaverMode?: boolean | undefined;
            gameModeAuto?: boolean | undefined;
            overlay?: {
                enabled: boolean;
                position: {
                    x: number;
                    y: number;
                };
                scale: number;
                opacity: number;
                clickThrough: boolean;
                modules: ("gpu" | "cpu" | "ram" | "ping" | "timer" | "fps" | "temperature")[];
                globalHotkey: string;
            } | undefined;
            backupRetentionDays?: number | undefined;
            maxLogSize?: number | undefined;
        };
    }, {
        settings: {
            language?: "es" | "en" | "pt" | "fr" | "de" | undefined;
            theme?: "dark" | "light" | "system" | undefined;
            autoStart?: boolean | undefined;
            minimizeToTray?: boolean | undefined;
            checkUpdates?: boolean | undefined;
            telemetryOptIn?: boolean | undefined;
            dryRunDefault?: boolean | undefined;
            batterySaverMode?: boolean | undefined;
            gameModeAuto?: boolean | undefined;
            overlay?: {
                enabled: boolean;
                position: {
                    x: number;
                    y: number;
                };
                scale: number;
                opacity: number;
                clickThrough: boolean;
                modules: ("gpu" | "cpu" | "ram" | "ping" | "timer" | "fps" | "temperature")[];
                globalHotkey: string;
            } | undefined;
            backupRetentionDays?: number | undefined;
            maxLogSize?: number | undefined;
        };
    }>;
    readonly 'native:timerResolution': z.ZodObject<{
        action: z.ZodEnum<["get", "set", "reset"]>;
        value: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        action: "set" | "get" | "reset";
        value?: number | undefined;
    }, {
        action: "set" | "get" | "reset";
        value?: number | undefined;
    }>;
    readonly 'native:dpcLatency': z.ZodVoid;
    readonly 'native:gpuMetrics': z.ZodVoid;
    readonly 'overlay:show': z.ZodVoid;
    readonly 'overlay:hide': z.ZodVoid;
    readonly 'overlay:config': z.ZodObject<{
        config: z.ZodObject<{
            enabled: z.ZodOptional<z.ZodBoolean>;
            position: z.ZodOptional<z.ZodObject<{
                x: z.ZodNumber;
                y: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                x: number;
                y: number;
            }, {
                x: number;
                y: number;
            }>>;
            scale: z.ZodOptional<z.ZodNumber>;
            opacity: z.ZodOptional<z.ZodNumber>;
            clickThrough: z.ZodOptional<z.ZodBoolean>;
            modules: z.ZodOptional<z.ZodArray<z.ZodEnum<["cpu", "ram", "gpu", "ping", "timer", "fps", "temperature"]>, "many">>;
            globalHotkey: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            enabled?: boolean | undefined;
            position?: {
                x: number;
                y: number;
            } | undefined;
            scale?: number | undefined;
            opacity?: number | undefined;
            clickThrough?: boolean | undefined;
            modules?: ("gpu" | "cpu" | "ram" | "ping" | "timer" | "fps" | "temperature")[] | undefined;
            globalHotkey?: string | undefined;
        }, {
            enabled?: boolean | undefined;
            position?: {
                x: number;
                y: number;
            } | undefined;
            scale?: number | undefined;
            opacity?: number | undefined;
            clickThrough?: boolean | undefined;
            modules?: ("gpu" | "cpu" | "ram" | "ping" | "timer" | "fps" | "temperature")[] | undefined;
            globalHotkey?: string | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        config: {
            enabled?: boolean | undefined;
            position?: {
                x: number;
                y: number;
            } | undefined;
            scale?: number | undefined;
            opacity?: number | undefined;
            clickThrough?: boolean | undefined;
            modules?: ("gpu" | "cpu" | "ram" | "ping" | "timer" | "fps" | "temperature")[] | undefined;
            globalHotkey?: string | undefined;
        };
    }, {
        config: {
            enabled?: boolean | undefined;
            position?: {
                x: number;
                y: number;
            } | undefined;
            scale?: number | undefined;
            opacity?: number | undefined;
            clickThrough?: boolean | undefined;
            modules?: ("gpu" | "cpu" | "ram" | "ping" | "timer" | "fps" | "temperature")[] | undefined;
            globalHotkey?: string | undefined;
        };
    }>;
    readonly 'spider:scan': z.ZodVoid;
    readonly 'spider:idle': z.ZodVoid;
};
export type IpcChannel = keyof typeof IpcChannels;
export type IpcRequest<C extends IpcChannel> = z.infer<typeof IpcChannels[C]>;
//# sourceMappingURL=index.d.ts.map