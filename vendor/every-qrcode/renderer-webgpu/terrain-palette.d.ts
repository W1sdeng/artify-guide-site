import type { SeedScenePalette } from "./renderer.js";
type Color = readonly [number, number, number];
export type TerrainScenePalette = readonly [Color, Color, Color, Color, Color];
export declare function createTerrainPalette(theme: SeedScenePalette): TerrainScenePalette;
export {};
//# sourceMappingURL=terrain-palette.d.ts.map