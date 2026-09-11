export function replaceRendererCanvas(canvas, model) {
    const replacement = canvas.cloneNode(false);
    replacement.dataset["everyQrcodeCanvas"] = model;
    canvas.replaceWith(replacement);
    return replacement;
}
