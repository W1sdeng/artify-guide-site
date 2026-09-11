import { type DNAContext } from "./link-dna.js";
import { type QRDerivedFields } from "./qr-fields.js";
import { type QRMatrix } from "./qr.js";
import { type IdentityScope, type ParsedLink } from "./url.js";
export interface EveryQRCodeIdentity {
    readonly link: ParsedLink;
    readonly dna: DNAContext;
    readonly qr: QRMatrix;
    readonly fields: QRDerivedFields;
}
export type CreateIdentityOptions = {
    readonly identityScope?: IdentityScope;
    readonly identityVersion?: number;
    readonly qrProfileVersion?: number;
};
export declare function createEveryQRCodeIdentity(input: string, options?: CreateIdentityOptions): Promise<EveryQRCodeIdentity>;
//# sourceMappingURL=identity.d.ts.map