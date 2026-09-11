import { CURRENT_GENERATOR_VERSION, createEveryQRCodeIdentity, createQRSvgPath, resolveGeneratorVersion, } from "@every-qrcode/core";
import { replaceRendererCanvas } from "./renderer-canvas.js";
export const EVERY_QR_CODE_TAG = "every-qr-code";
export { CURRENT_GENERATOR_VERSION };
const TEMPLATE = `
  <style>
    :host { aspect-ratio: 1; display: block; width: 100%; }
    button { background: transparent; border: 0; cursor: pointer; height: 100%;
      padding: 0; width: 100%; }
    button[aria-disabled="true"] { cursor: default; }
    canvas, svg { display: block; height: 100%; width: 100%; }
    canvas[hidden], svg[hidden] { display: none; }
  </style>
  <button aria-label="Reveal the QR code" type="button">
    <canvas></canvas>
    <svg aria-hidden="true" hidden shape-rendering="crispEdges">
      <rect fill="#fff"></rect>
      <path fill="#111"></path>
    </svg>
  </button>
`;
function readView(element) {
    return element.getAttribute("initial-view") === "qr" ? "qr" : "model";
}
function readScope(element) {
    return element.getAttribute("identity-scope") === "url" ? "url" : "site";
}
function readGeneratorVersion(element) {
    const value = element.getAttribute("generator-version");
    return resolveGeneratorVersion(value === null ? undefined : Number(value));
}
function readModel(element) {
    const model = element.getAttribute("model");
    if (model === "terrain")
        return model;
    return "tree";
}
function isInteractive(element) {
    return element.getAttribute("interactive") !== "false";
}
function errorFrom(reason) {
    return reason instanceof Error ? reason : new Error("Every QR Code could not render this URL.");
}
async function prepareSeed(generatorVersion, model, identity) {
    const { createSeedModel, mountSeed } = await import("@every-qrcode/renderer-webgpu");
    const seed = await createSeedModel(identity, { generatorVersion });
    return {
        mount: (canvas, onError) => mountSeed(canvas, seed, {}, model, { onError }),
        qr: createQRSvgPath(identity.qr),
    };
}
function createElementConstructor() {
    return class EveryQRCodeElement extends HTMLElement {
        static get observedAttributes() {
            return ["generator-version", "identity-scope", "initial-view", "interactive", "model", "url"];
        }
        button;
        canvas;
        fallbackBackground;
        fallbackPath;
        fallbackSvg;
        fallbackVisible = false;
        renderer = null;
        resizeObserver = null;
        revision = 0;
        view = "model";
        constructor() {
            super();
            const root = this.attachShadow({ mode: "open" });
            root.innerHTML = TEMPLATE;
            this.button = root.querySelector("button");
            this.canvas = root.querySelector("canvas");
            this.fallbackSvg = root.querySelector("svg");
            this.fallbackBackground = root.querySelector("rect");
            this.fallbackPath = root.querySelector("path");
        }
        connectedCallback() {
            this.button.addEventListener("click", this.toggle);
            this.syncControls();
            void this.renderSeed();
        }
        disconnectedCallback() {
            this.button.removeEventListener("click", this.toggle);
            this.revision += 1;
            this.disposeRenderer();
        }
        attributeChangedCallback(name) {
            if (!this.isConnected)
                return;
            if (name === "generator-version" ||
                name === "url" ||
                name === "identity-scope" ||
                name === "model") {
                void this.renderSeed();
                return;
            }
            this.syncControls();
        }
        toggle = () => {
            if (!isInteractive(this) || this.fallbackVisible)
                return;
            this.view = this.view === "model" ? "qr" : "model";
            this.syncControls(false);
            this.dispatchEvent(new CustomEvent("every-qrcode-viewchange", {
                bubbles: true,
                composed: true,
                detail: { view: this.view },
            }));
        };
        syncControls(resetView = true) {
            if (resetView)
                this.view = readView(this);
            const interactive = isInteractive(this);
            this.button.ariaDisabled = String(!interactive || this.fallbackVisible);
            this.button.ariaLabel = this.fallbackVisible
                ? "QR code fallback"
                : this.view === "model"
                    ? "Reveal the QR code"
                    : `Restore the ${readModel(this)}`;
            this.renderer?.setFlat(this.view === "qr");
        }
        hideFallback() {
            this.fallbackVisible = false;
            this.canvas.hidden = false;
            this.fallbackSvg.setAttribute("hidden", "");
            this.syncControls(false);
        }
        showFallback(qr, error) {
            this.fallbackVisible = true;
            this.canvas.hidden = true;
            this.fallbackSvg.removeAttribute("hidden");
            this.fallbackSvg.setAttribute("viewBox", `0 0 ${qr.size} ${qr.size}`);
            this.fallbackBackground.setAttribute("height", String(qr.size));
            this.fallbackBackground.setAttribute("width", String(qr.size));
            this.fallbackPath.setAttribute("d", qr.path);
            this.syncControls(false);
            this.dispatchEvent(new CustomEvent("every-qrcode-error", { detail: { error } }));
        }
        async renderSeed() {
            const revision = ++this.revision;
            const model = readModel(this);
            try {
                const generatorVersion = readGeneratorVersion(this);
                const identity = await createEveryQRCodeIdentity(this.getAttribute("url") ?? "", {
                    identityScope: readScope(this),
                });
                const prepared = await prepareSeed(generatorVersion, model, identity);
                if (revision !== this.revision || !this.isConnected)
                    return;
                this.disposeRenderer();
                this.canvas = replaceRendererCanvas(this.canvas, model);
                this.hideFallback();
                this.renderer = prepared.mount(this.canvas, (error) => {
                    if (revision !== this.revision || !this.isConnected)
                        return;
                    this.showFallback(prepared.qr, error);
                });
                this.renderer.setFlat(this.view === "qr");
                this.renderer.resize();
                if (typeof ResizeObserver !== "undefined") {
                    this.resizeObserver = new ResizeObserver(this.renderer.resize);
                    this.resizeObserver.observe(this.canvas);
                }
            }
            catch (reason) {
                if (revision !== this.revision)
                    return;
                this.dispatchEvent(new CustomEvent("every-qrcode-error", {
                    detail: { error: errorFrom(reason) },
                }));
            }
        }
        disposeRenderer() {
            this.resizeObserver?.disconnect();
            this.resizeObserver = null;
            this.renderer?.dispose();
            this.renderer = null;
        }
    };
}
export function defineEveryQRCodeElement(tagName = EVERY_QR_CODE_TAG) {
    if (typeof customElements === "undefined" || typeof HTMLElement === "undefined")
        return false;
    if (customElements.get(tagName))
        return false;
    customElements.define(tagName, createElementConstructor());
    return true;
}
