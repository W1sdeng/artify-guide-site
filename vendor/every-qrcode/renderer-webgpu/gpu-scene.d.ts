import { type SeedForm, type TreeArchetype, type SeedModel } from "./seed-model.js";
export { CANOPY_GAP_RATE } from "./tree-constants.js";
export type TreeAppearance = {
    readonly bloomDensity: number;
    readonly flowerHue: number;
    readonly flowerHueSpread: number;
    readonly fruitHue: number;
    readonly fruitfulness: number;
    readonly leafDensity: number;
    readonly leafHue: number;
    readonly leafHueSpread: number;
};
export type SeedGpuScene = {
    readonly appearance: TreeAppearance;
    readonly blossomCount: number;
    readonly butterflies: Float32Array;
    readonly butterflyCount: number;
    readonly fallingPetalCount: number;
    readonly fallingPetals: Float32Array;
    readonly flowerCount: number;
    readonly flowers: Float32Array;
    readonly fruitCount: number;
    readonly grass: Float32Array;
    readonly grassCount: number;
    readonly groundPetalCount: number;
    readonly groundPetals: Float32Array;
    readonly leafCount: number;
    readonly rain: Float32Array;
    readonly rainCount: number;
    readonly segmentCount: number;
    readonly segments: Float32Array;
};
export declare function createTreeAppearance(model: SeedModel): TreeAppearance;
export declare function baseTrunkHeight(density: number, sizeScale: number): number;
export declare const CANOPY_COLUMN_GAP_RATE = 0.14;
export declare function supportsCanopyFringe(archetype: TreeArchetype): boolean;
export declare function createSeedGpuScene(model: SeedModel, form?: SeedForm): SeedGpuScene;
//# sourceMappingURL=gpu-scene.d.ts.map