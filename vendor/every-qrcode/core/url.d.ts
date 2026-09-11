export type IdentityScope = "site" | "url";
export interface ParsedLink {
    readonly input: string;
    readonly payloadUrl: string;
    readonly familyIdentity: string;
    readonly siteIdentity: string;
    readonly pageIdentity: string;
    readonly displayHost: string;
    readonly hasSensitiveQuery: boolean;
    readonly scope: IdentityScope;
}
export type ParseLinkOptions = {
    readonly identityScope?: IdentityScope;
    readonly identityVersion?: number;
};
export declare function parseLink(input: string, options?: ParseLinkOptions): ParsedLink;
//# sourceMappingURL=url.d.ts.map