export class EveryQRCodeError extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.name = "EveryQRCodeError";
        this.code = code;
    }
}
export class InvalidLinkError extends EveryQRCodeError {
    constructor(message) {
        super("invalid-link", message);
        this.name = "InvalidLinkError";
    }
}
export class LinkTooComplexError extends EveryQRCodeError {
    constructor() {
        super("link-too-complex", "That link is too long for the current Every QR Code format.");
        this.name = "LinkTooComplexError";
    }
}
export class UnsupportedVersionError extends EveryQRCodeError {
    constructor(protocol, version) {
        super("unsupported-version", `Unsupported ${protocol} version: ${version}.`);
        this.name = "UnsupportedVersionError";
    }
}
