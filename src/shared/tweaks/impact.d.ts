import type { ImpactLevel } from '../types/index';
/**
 * Impact map per tweak id.
 *
 * ALTO  -> Real, measurable gains on this machine class (refresh rate, XMP/EXPO,
 *          dedicated GPU selection, thermal throttling).
 * MEDIO -> Measurable but smaller / hardware dependent (power plan, network,
 *          driver, startup apps, storage).
 * BAJO  -> Community "fine tuning" whose effect is small or unproven. These go
 *          into the "Ajustes finos" card and are disabled by default.
 */
export declare const tweakImpact: Record<string, ImpactLevel>;
/** Default impact when a tweak is not present in the map. */
export declare const DEFAULT_IMPACT: ImpactLevel;
export declare function getTweakImpact(tweakId: string): ImpactLevel;
/** Low impact tweaks -> "Ajustes finos" card. */
export declare function isFineTune(tweakId: string): boolean;
//# sourceMappingURL=impact.d.ts.map