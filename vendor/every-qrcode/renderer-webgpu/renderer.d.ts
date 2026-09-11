import { type GeneratorVersion } from "@every-qrcode/core";
import { type SeedForm, type SeedModel } from "./seed-model.js";
export type SeedRenderer = {
    dispose: () => void;
    resize: () => void;
    setFlat: (flat: boolean) => void;
    setScene: (scene: SeedSceneConfig) => void;
    setZoom: (zoom: number) => void;
};
export type SeedRendererOptions = {
    readonly onError?: (error: Error) => void;
    readonly onReady?: () => void;
};
export type SeedSceneEffect = "calm" | "rain" | "snow" | "wind";
export type SeedScenePalette = readonly [
    readonly [number, number, number],
    readonly [number, number, number],
    readonly [number, number, number],
    readonly [number, number, number],
    readonly [number, number, number]
];
export type SeedSceneConfig = {
    readonly background?: readonly [number, number, number];
    readonly effect?: SeedSceneEffect;
    readonly palette?: SeedScenePalette;
};
type TreeShaderSources = {
    readonly blocks: string;
    readonly branches: string;
    readonly butterflies: string;
    readonly fallingPetals: string;
    readonly flowers: string;
    readonly form: "tree";
    readonly grass: string;
    readonly shadow: string;
};
type TerrainShaderSources = {
    readonly form: "terrain";
    readonly terrain: string;
};
type SharedShaderSources = {
    readonly post: string;
    readonly weather: string;
};
type SeedShaderSources = SharedShaderSources & (TerrainShaderSources | TreeShaderSources);
export declare function loadSeedShaderSources(form: SeedForm, generatorVersion?: GeneratorVersion): Promise<SeedShaderSources>;
export declare function seedSceneEffectCode(effect: SeedSceneEffect | undefined): number;
export declare const MORPH_DURATION_MS = 950;
export declare function evaluateMorphCurve(progress: number): number;
export declare function stepTerrainSpring(position: number, velocity: number, target: number, elapsedSeconds: number): readonly [number, number];
export declare function minimumStorageBufferByteLength(byteLength: number): number;
export declare function clampSeedZoom(zoom: number): number;
export declare function mountSeed(canvas: HTMLCanvasElement, model: SeedModel, scene?: SeedSceneConfig, form?: SeedForm, options?: SeedRendererOptions): SeedRenderer;
export {};
//# sourceMappingURL=renderer.d.ts.map