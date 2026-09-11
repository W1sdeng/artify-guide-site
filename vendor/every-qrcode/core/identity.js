import { createDNAContext } from "./link-dna.js";
import { createQRDerivedFields } from "./qr-fields.js";
import { createQRMatrix } from "./qr.js";
import { parseLink } from "./url.js";
export async function createEveryQRCodeIdentity(input, options = {}) {
    const identityVersion = options.identityVersion ?? 1;
    const qrProfileVersion = options.qrProfileVersion ?? 1;
    const linkOptions = options.identityScope
        ? { identityScope: options.identityScope, identityVersion }
        : { identityVersion };
    const link = parseLink(input, linkOptions);
    const qr = createQRMatrix(link.payloadUrl, qrProfileVersion);
    const [dna, fields] = await Promise.all([
        createDNAContext(link, identityVersion),
        Promise.resolve(createQRDerivedFields(qr)),
    ]);
    return { dna, fields, link, qr };
}
