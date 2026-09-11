import type { QRMatrix } from "./qr.js";
export interface QRDerivedFields {
    readonly density3x3: Float32Array;
    readonly density5x5: Float32Array;
    readonly blur: Float32Array;
    readonly darkDistance: Float32Array;
    readonly lightDistance: Float32Array;
    readonly edge: Float32Array;
    readonly roles: Uint8Array;
}
export declare function createQRDerivedFields(matrix: QRMatrix): QRDerivedFields;
//# sourceMappingURL=qr-fields.d.ts.map