export const SUPPORTED_GENERATOR_VERSIONS = [1];
export const CURRENT_GENERATOR_VERSION = 1;
export function isGeneratorVersion(value) {
    return SUPPORTED_GENERATOR_VERSIONS.some((version) => version === value);
}
export function resolveGeneratorVersion(value = CURRENT_GENERATOR_VERSION) {
    if (isGeneratorVersion(value))
        return value;
    throw new RangeError(`Unsupported generator version: ${String(value)}`);
}
