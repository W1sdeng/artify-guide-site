export declare const SUPPORTED_GENERATOR_VERSIONS: readonly [1];
export type GeneratorVersion = (typeof SUPPORTED_GENERATOR_VERSIONS)[number];
export declare const CURRENT_GENERATOR_VERSION: GeneratorVersion;
export declare function isGeneratorVersion(value: unknown): value is GeneratorVersion;
export declare function resolveGeneratorVersion(value?: unknown): GeneratorVersion;
//# sourceMappingURL=generator-version.d.ts.map