export interface QRMatrix {
    readonly profileVersion: number;
    readonly symbolVersion: number;
    readonly size: number;
    readonly errorCorrection: "M";
    readonly maskPattern: number;
    readonly cells: Uint8Array;
}
export interface QRProfileV1 {
    readonly profileVersion: 1;
    readonly errorCorrection: "M";
    readonly minSymbolVersion: 1;
    readonly maxSymbolVersion: 6;
    readonly boostErrorCorrection: false;
}
export declare const QR_PROFILE_V1: QRProfileV1;
export declare function createQRMatrix(payloadUrl: string, profileVersion?: number): QRMatrix;
export declare function qrCell(matrix: QRMatrix, column: number, row: number): 0 | 1;
//# sourceMappingURL=qr.d.ts.map