import { EveryQRCodeError, UnsupportedVersionError } from "./errors.js";
const IDENTITY_VERSION = 1;
const CHANNEL_LABEL = /^[a-z0-9][a-z0-9/_-]*$/u;
const MAX_CHANNEL_LABEL_BYTES = 128;
const UINT32_RANGE = 4_294_967_296;
function bytesToHex(bytes) {
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
async function sha256(message) {
    if (!globalThis.crypto?.subtle) {
        throw new EveryQRCodeError("generation-failed", "Secure hashing is unavailable in this browser.");
    }
    const encoded = new TextEncoder().encode(message);
    return new Uint8Array(await globalThis.crypto.subtle.digest("SHA-256", encoded));
}
function decodeSeed(digest) {
    if (digest.length !== 32) {
        throw new EveryQRCodeError("generation-failed", "SHA-256 returned an unexpected digest length.");
    }
    const view = new DataView(digest.buffer, digest.byteOffset, digest.byteLength);
    return Object.freeze([
        view.getUint32(0, false),
        view.getUint32(4, false),
        view.getUint32(8, false),
        view.getUint32(12, false),
    ]);
}
function validateChannelLabel(label) {
    const length = new TextEncoder().encode(label).length;
    if (length > MAX_CHANNEL_LABEL_BYTES || !CHANNEL_LABEL.test(label)) {
        throw new RangeError(`Invalid Link DNA channel label: ${label}`);
    }
}
class Sfc32RandomStream {
    #state;
    constructor(seed) {
        this.#state = [seed[0], seed[1], seed[2], seed[3]];
    }
    nextUint32() {
        let [a, b, c, d] = this.#state;
        let value = (a + b) | 0;
        a = b ^ (b >>> 9);
        b = (c + (c << 3)) | 0;
        c = (c << 21) | (c >>> 11);
        d = (d + 1) | 0;
        value = (value + d) | 0;
        c = (c + value) | 0;
        this.#state[0] = a >>> 0;
        this.#state[1] = b >>> 0;
        this.#state[2] = c >>> 0;
        this.#state[3] = d >>> 0;
        return value >>> 0;
    }
    next() {
        return this.nextUint32() / UINT32_RANGE;
    }
}
class DNAContextV1 {
    identityVersion = IDENTITY_VERSION;
    #digests;
    #seedCache = new Map();
    constructor(digests) {
        this.#digests = {
            family: digests.family.slice(),
            page: digests.page.slice(),
            site: digests.site.slice(),
        };
    }
    get familyDigest() {
        return this.#digests.family.slice();
    }
    get pageDigest() {
        return this.#digests.page.slice();
    }
    get siteDigest() {
        return this.#digests.site.slice();
    }
    async channelSeed(source, label) {
        validateChannelLabel(label);
        const key = `${source}:${label}`;
        const cached = this.#seedCache.get(key);
        if (cached)
            return Object.freeze([...cached]);
        const sourceDigest = this.#digests[source];
        const message = `linkseed:channel:v1|${bytesToHex(sourceDigest)}|${label}`;
        const seed = decodeSeed(await sha256(message));
        this.#seedCache.set(key, seed);
        return Object.freeze([...seed]);
    }
    async channel(source, label) {
        return new Sfc32RandomStream(await this.channelSeed(source, label));
    }
}
export async function createDNAContext(link, identityVersion = 1) {
    if (identityVersion !== IDENTITY_VERSION) {
        throw new UnsupportedVersionError("identity", identityVersion);
    }
    const [family, page, site] = await Promise.all([
        sha256(`linkseed:family:v1|${link.familyIdentity}`),
        sha256(`linkseed:page:v1|${link.pageIdentity}`),
        sha256(`linkseed:site:v1|${link.siteIdentity}`),
    ]);
    return new DNAContextV1({ family, page, site });
}
export function mixFamily(family, detail, familyWeight) {
    if (familyWeight < 0 || familyWeight > 1)
        throw new RangeError("familyWeight");
    return family * familyWeight + detail * (1 - familyWeight);
}
export function digestToHex(digest) {
    return bytesToHex(digest);
}
