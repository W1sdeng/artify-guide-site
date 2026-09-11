import type { ParsedLink } from "./url.js";
export type IdentitySource = "family" | "page" | "site";
export type RandomSeed = readonly [number, number, number, number];
export interface RandomStream {
    next(): number;
    nextUint32(): number;
}
export interface DNAContext {
    readonly identityVersion: number;
    readonly familyDigest: Uint8Array;
    readonly pageDigest: Uint8Array;
    readonly siteDigest: Uint8Array;
    channelSeed(source: IdentitySource, label: string): Promise<RandomSeed>;
    channel(source: IdentitySource, label: string): Promise<RandomStream>;
}
export declare function createDNAContext(link: ParsedLink, identityVersion?: number): Promise<DNAContext>;
export declare function mixFamily(family: number, detail: number, familyWeight: number): number;
export declare function digestToHex(digest: Uint8Array): string;
//# sourceMappingURL=link-dna.d.ts.map