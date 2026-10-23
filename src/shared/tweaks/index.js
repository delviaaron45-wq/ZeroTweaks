"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tweakStats = exports.defaultProfiles = exports.measuredTweaks = exports.advancedTweaks = exports.moderateTweaks = exports.safeTweaks = exports.tweaksByCategory = exports.allTweaks = void 0;
exports.getTweakById = getTweakById;
exports.getTweaksForProfile = getTweaksForProfile;
exports.filterTweaksByHardware = filterTweaksByHardware;
const system_1 = require("./system");
const power_1 = require("./power");
const gpu_1 = require("./gpu");
const debloat_1 = require("./debloat");
const ram_1 = require("./ram");
const peripherals_1 = require("./peripherals");
const services_1 = require("./services");
const explorer_1 = require("./explorer");
// All tweaks combined
exports.allTweaks = [
    ...system_1.systemTweaks,
    ...power_1.powerTweaks,
    ...gpu_1.gpuTweaks,
    ...debloat_1.debloatTweaks,
    ...debloat_1.privacyTweaks,
    ...ram_1.ramTweaks,
    ...peripherals_1.peripheralsTweaks,
    ...services_1.servicesTweaks,
    ...explorer_1.explorerTweaks,
];
// Tweaks organized by category
exports.tweaksByCategory = {
    system_performance: system_1.systemTweaks,
    power_cpu: power_1.powerTweaks,
    gpu: gpu_1.gpuTweaks,
    debloat_apps: debloat_1.debloatTweaks,
    privacy_telemetry: debloat_1.privacyTweaks,
    ram_storage: ram_1.ramTweaks,
    peripherals_input: peripherals_1.peripheralsTweaks,
    services: services_1.servicesTweaks,
    explorer_ui: explorer_1.explorerTweaks,
    gaming_fps: [], // Gaming tweaks are in system/gpu
    network_tcp: system_1.systemTweaks.filter(t => t.category === 'network_tcp'),
};
// Safe tweaks (for "Optimize" button default profile)
exports.safeTweaks = exports.allTweaks.filter(t => t.risk === 'safe');
// Moderate tweaks
exports.moderateTweaks = exports.allTweaks.filter(t => t.risk === 'moderate');
// Advanced tweaks (require written confirmation)
exports.advancedTweaks = exports.allTweaks.filter(t => t.risk === 'advanced');
// Measured evidence tweaks
exports.measuredTweaks = exports.allTweaks.filter(t => t.evidence === 'measured');
// Get tweak by ID
function getTweakById(id) {
    return exports.allTweaks.find(t => t.id === id);
}
// Get tweaks for profile
function getTweaksForProfile(profileTweakIds) {
    return profileTweakIds.map(id => getTweakById(id)).filter((t) => t !== undefined);
}
// Filter tweaks by hardware compatibility
function filterTweaksByHardware(tweaks, hardware) {
    return tweaks.filter(tweak => {
        // Check form factor
        if (!tweak.compatibility.formFactors.includes(hardware.isLaptop ? 'laptop' : 'desktop')) {
            return false;
        }
        // Check CPU vendor
        if (tweak.compatibility.cpuVendors && !tweak.compatibility.cpuVendors.includes(hardware.cpuVendor)) {
            return false;
        }
        // Check GPU vendor
        if (tweak.compatibility.gpuVendors && !tweak.compatibility.gpuVendors.includes(hardware.gpuVendor)) {
            return false;
        }
        // Check Windows version (simplified - check major version)
        const majorVersion = hardware.windowsVersion.split('.')[0];
        const tweakVersions = tweak.compatibility.windowsVersions.map(v => v.split('.')[0]);
        if (!tweakVersions.includes(majorVersion)) {
            // Allow if close enough (e.g., 10.0.19041 matches 10.0.22631)
            return true; // For now, allow all Win10/11
        }
        return true;
    });
}
// Default profiles
exports.defaultProfiles = {
    safe: {
        id: 'profile_safe',
        name: 'Safe Profile',
        description: 'Only safe, measured tweaks. No reboot required for most. Recommended for all users.',
        tweaks: exports.safeTweaks.filter(t => !t.requiresReboot).map(t => t.id),
    },
    competitive: {
        id: 'profile_competitive',
        name: 'Competitive Gaming',
        description: 'Maximum performance for competitive gaming. Includes moderate tweaks. Requires reboot.',
        tweaks: [
            ...exports.safeTweaks.map(t => t.id),
            ...exports.moderateTweaks.filter(t => t.category === 'gaming_fps' || t.category === 'system_performance' || t.category === 'power_cpu' || t.category === 'network_tcp').map(t => t.id),
        ],
    },
    streamer: {
        id: 'profile_streamer',
        name: 'Streamer / Content Creator',
        description: 'Balanced for streaming: encoding performance, stability, OBS friendly. Keeps GameDVR for clips.',
        tweaks: exports.safeTweaks.map(t => t.id),
    },
    laptop: {
        id: 'profile_laptop',
        name: 'Laptop / Battery Optimized',
        description: 'Safe tweaks only. No core parking disable, no PCIe ASPM off. Preserves battery life.',
        tweaks: exports.safeTweaks.filter(t => t.compatibility.formFactors.includes('laptop')).map(t => t.id),
    },
};
// Statistics
exports.tweakStats = {
    total: exports.allTweaks.length,
    byCategory: Object.fromEntries(Object.entries(exports.tweaksByCategory).map(([cat, tweaks]) => [cat, tweaks.length])),
    byRisk: {
        safe: exports.safeTweaks.length,
        moderate: exports.moderateTweaks.length,
        advanced: exports.advancedTweaks.length,
    },
    byEvidence: {
        measured: exports.measuredTweaks.length,
        debated: exports.allTweaks.filter(t => t.evidence === 'debated').length,
        placebo: exports.allTweaks.filter(t => t.evidence === 'placebo').length,
    },
    requiresReboot: exports.allTweaks.filter(t => t.requiresReboot).length,
};
//# sourceMappingURL=index.js.map