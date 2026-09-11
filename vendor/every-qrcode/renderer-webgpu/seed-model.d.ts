import { type EveryQRCodeIdentity, type GeneratorVersion } from "@every-qrcode/core";
export declare const SEED_TOPOLOGIES: readonly ["soft-sphere", "faceted-sphere", "segmented-shell", "gel-shell", "terraced-world", "open-core", "ring-habitat"];
export type SeedTopology = (typeof SEED_TOPOLOGIES)[number];
export declare const TREE_ARCHETYPES: readonly ["round", "umbrella", "conifer", "banana", "willow", "windswept", "cloud", "multi-trunk"];
export type TreeArchetype = (typeof TREE_ARCHETYPES)[number];
export declare const TREE_ARCHETYPE_WEIGHTS: Readonly<Record<TreeArchetype, number>>;
export declare const SEED_MATERIALS: readonly ["tidal", "molten", "crystal", "gel", "garden", "energy", "machine"];
export type SeedMaterial = (typeof SEED_MATERIALS)[number];
export type SeedForm = "terrain" | "tree";
export type SeedPalette = {
    readonly accent: number;
    readonly atmosphere: number;
    readonly base: number;
    readonly dark: number;
    readonly region: number;
};
export type SeedModuleAnchor = {
    readonly index: number;
    readonly normal: readonly [number, number, number];
    readonly qr: readonly [number, number, number];
    readonly relief: number;
    readonly surface: readonly [number, number, number];
};
export type SeedFeatureAnchor = {
    readonly normal: readonly [number, number, number];
    readonly position: readonly [number, number, number];
    readonly scale: number;
    readonly score: number;
};
export type SeedSatellite = {
    readonly inclination: number;
    readonly orbit: number;
    readonly phase: number;
    readonly scale: number;
};
export type SeedModel = {
    readonly archetype: TreeArchetype;
    readonly eccentricity: number;
    readonly features: readonly SeedFeatureAnchor[];
    readonly generatorVersion: GeneratorVersion;
    readonly material: SeedMaterial;
    readonly morphSeed: number;
    readonly modules: readonly SeedModuleAnchor[];
    readonly name: string;
    readonly palette: SeedPalette;
    readonly recipeId: string;
    readonly recipeLabel: string;
    readonly qrSize: number;
    readonly satellites: readonly SeedSatellite[];
    readonly topology: SeedTopology;
};
export type CreateSeedModelOptions = {
    readonly generatorVersion?: GeneratorVersion;
};
export declare const SEED_BLOCK_TYPES: {
    readonly branch: 5;
    readonly cherryBlossom: 1;
    readonly dirt: 0;
    readonly fallenPetals: 4;
    readonly grass: 3;
    readonly trunk: 2;
};
export type SeedBlock = {
    readonly baseY: number;
    readonly column: number;
    readonly index: number;
    readonly layer: number;
    readonly row: number;
    readonly type: number;
};
export type SeedBlockField = {
    readonly baseY: Float32Array;
    readonly blockSize: number;
    readonly blocks: readonly SeedBlock[];
    readonly heights: Float32Array;
    readonly positions: Float32Array;
    readonly qrSize: number;
    readonly types: Uint32Array;
};
export declare const SEED_QR_GROUND_SIDE = 2.12;
export declare const SEED_QR_GROUND_Y = -0.82;
export declare const SEED_QR_QUIET_ZONE = 4;
export declare const SEED_BLOCK_SIZE = 0.0245;
export declare function createSeedBlockField(model: SeedModel, form?: SeedForm): SeedBlockField;
export declare function createSeedModel(identity: EveryQRCodeIdentity, options?: CreateSeedModelOptions): Promise<SeedModel>;
//# sourceMappingURL=seed-model.d.ts.map