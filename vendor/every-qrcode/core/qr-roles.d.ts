export declare const QR_ROLE_CODES: {
    readonly data: 0;
    readonly remainder: 1;
    readonly finder: 2;
    readonly separator: 3;
    readonly timing: 4;
    readonly alignment: 5;
    readonly format: 6;
    readonly version: 7;
    readonly "fixed-dark": 8;
};
export type QRRole = keyof typeof QR_ROLE_CODES;
export declare function createQRRoleMap(symbolVersion: number): Uint8Array;
//# sourceMappingURL=qr-roles.d.ts.map