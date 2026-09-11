import type { QRMatrix } from "./qr.js";
export type QRSvgPath = {
    readonly path: string;
    readonly size: number;
};
export declare function createQRSvgPath(matrix: QRMatrix, quietZone?: number): QRSvgPath;
//# sourceMappingURL=qr-svg.d.ts.map