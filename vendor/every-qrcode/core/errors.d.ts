export type EveryQRCodeErrorCode = "invalid-link" | "link-too-complex" | "unsupported-version" | "generation-failed";
export declare class EveryQRCodeError extends Error {
    readonly code: EveryQRCodeErrorCode;
    constructor(code: EveryQRCodeErrorCode, message: string);
}
export declare class InvalidLinkError extends EveryQRCodeError {
    constructor(message: string);
}
export declare class LinkTooComplexError extends EveryQRCodeError {
    constructor();
}
export declare class UnsupportedVersionError extends EveryQRCodeError {
    constructor(protocol: string, version: number);
}
//# sourceMappingURL=errors.d.ts.map