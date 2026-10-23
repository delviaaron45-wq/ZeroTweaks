import type { Tweak, TweakCategory } from '../types/all';
export declare const allTweaks: Tweak[];
export declare const tweaksByCategory: Record<TweakCategory, Tweak[]>;
export declare const safeTweaks: Tweak[];
export declare const moderateTweaks: Tweak[];
export declare const advancedTweaks: Tweak[];
export declare const measuredTweaks: Tweak[];
export declare function getTweakById(id: string): Tweak | undefined;
export declare function getTweaksForProfile(profileTweakIds: string[]): Tweak[];
export declare function filterTweaksByHardware(tweaks: Tweak[], hardware: {
    isLaptop: boolean;
    cpuVendor: 'Intel' | 'AMD' | 'Unknown';
    gpuVendor: 'NVIDIA' | 'AMD' | 'Intel' | 'Unknown';
    windowsVersion: string;
}): Tweak[];
export declare const defaultProfiles: {
    safe: {
        id: string;
        name: string;
        description: string;
        tweaks: string[];
    };
    competitive: {
        id: string;
        name: string;
        description: string;
        tweaks: string[];
    };
    streamer: {
        id: string;
        name: string;
        description: string;
        tweaks: string[];
    };
    laptop: {
        id: string;
        name: string;
        description: string;
        tweaks: string[];
    };
};
export declare const tweakStats: {
    total: number;
    byCategory: {
        [k: string]: number;
    };
    byRisk: {
        safe: number;
        moderate: number;
        advanced: number;
    };
    byEvidence: {
        measured: number;
        debated: number;
        placebo: number;
    };
    requiresReboot: number;
};
//# sourceMappingURL=index.d.ts.map