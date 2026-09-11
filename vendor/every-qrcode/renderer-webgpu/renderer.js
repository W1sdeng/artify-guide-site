import { CURRENT_GENERATOR_VERSION, resolveGeneratorVersion, } from "@every-qrcode/core";
import { createSeedGpuScene } from "./gpu-scene.js";
import { createSeedBlockField, } from "./seed-model.js";
import { createTerrainPalette } from "./terrain-palette.js";
async function loadVersionOneSharedShaders() {
    const shared = await import("./shared-shaders.js");
    return { post: shared.SEED_POST_SHADER, weather: shared.SEED_WEATHER_SHADER };
}
const VERSION_ONE_SHADER_LOADERS = {
    terrain: async () => {
        const [shared, terrain] = await Promise.all([
            loadVersionOneSharedShaders(),
            import("./terrain-shaders.js"),
        ]);
        return { ...shared, form: "terrain", terrain: terrain.TERRAIN_SHADER };
    },
    tree: async () => {
        const [shared, tree] = await Promise.all([
            loadVersionOneSharedShaders(),
            import("./tree-shaders.js"),
        ]);
        return {
            ...shared,
            blocks: tree.TREE_BLOCK_SHADER,
            branches: tree.TREE_BRANCH_SHADER,
            butterflies: tree.TREE_BUTTERFLY_SHADER,
            fallingPetals: tree.TREE_FALLING_PETAL_SHADER,
            flowers: tree.TREE_FLOWER_SHADER,
            form: "tree",
            grass: tree.TREE_GRASS_SHADER,
            shadow: tree.TREE_SHADOW_SHADER,
        };
    },
};
const SEED_SHADER_LOADERS = {
    1: VERSION_ONE_SHADER_LOADERS,
};
export async function loadSeedShaderSources(form, generatorVersion = CURRENT_GENERATOR_VERSION) {
    const version = resolveGeneratorVersion(generatorVersion);
    return SEED_SHADER_LOADERS[version][form]();
}
function createClearColor(scene) {
    if (!scene.background)
        return { a: 0, b: 0, g: 0, r: 0 };
    const [r, g, b] = scene.background;
    return {
        a: 1,
        b: Math.max(0, Math.min(1, b)),
        g: Math.max(0, Math.min(1, g)),
        r: Math.max(0, Math.min(1, r)),
    };
}
export function seedSceneEffectCode(effect) {
    if (effect === "calm")
        return 3;
    if (effect === "rain")
        return 1;
    if (effect === "snow")
        return 2;
    return 0;
}
function createSceneEffect(scene) {
    return seedSceneEffectCode(scene.effect);
}
const DEFAULT_PALETTE = [
    [0.91, 0.48, 0.64],
    [0.98, 0.73, 0.83],
    [0.91, 0.88, 0.79],
    [0.31, 0.43, 0.18],
    [0.965, 0.945, 0.906],
];
function createPalette(scene) {
    return scene.palette ?? DEFAULT_PALETTE;
}
export const MORPH_DURATION_MS = 950;
const TERRAIN_SPRING_RESPONSE_SECONDS = 0.38;
const UNIFORM_FLOATS = 60;
const BUFFER_USAGE = {
    copyDestination: 0x0008,
    storage: 0x0080,
    uniform: 0x0040,
};
const SHADER_STAGE = {
    fragment: 0x2,
    vertex: 0x1,
};
const TEXTURE_USAGE = {
    renderAttachment: 0x10,
    textureBinding: 0x04,
};
const ALPHA_BLEND = {
    alpha: {
        dstFactor: "one-minus-src-alpha",
        operation: "add",
        srcFactor: "one",
    },
    color: {
        dstFactor: "one-minus-src-alpha",
        operation: "add",
        srcFactor: "src-alpha",
    },
};
function bezierCoordinate(parameter, first, second) {
    const inverse = 1 - parameter;
    return (3 * inverse * inverse * parameter * first +
        3 * inverse * parameter * parameter * second +
        parameter ** 3);
}
function bezierDerivative(parameter, first, second) {
    const inverse = 1 - parameter;
    return (3 * inverse * inverse * first +
        6 * inverse * parameter * (second - first) +
        3 * parameter * parameter * (1 - second));
}
export function evaluateMorphCurve(progress) {
    if (progress <= 0)
        return 0;
    if (progress >= 1)
        return 1;
    let parameter = progress;
    for (let iteration = 0; iteration < 7; iteration++) {
        const error = bezierCoordinate(parameter, 0.2, 0.2) - progress;
        const derivative = bezierDerivative(parameter, 0.2, 0.2);
        if (Math.abs(derivative) < 0.000_001)
            break;
        parameter = Math.max(0, Math.min(1, parameter - error / derivative));
    }
    return bezierCoordinate(parameter, 0.7, 1);
}
export function stepTerrainSpring(position, velocity, target, elapsedSeconds) {
    const omega = -Math.log(0.01) / TERRAIN_SPRING_RESPONSE_SECONDS;
    const displacement = position - target;
    const decay = Math.exp(-omega * elapsedSeconds);
    const nextDisplacement = (displacement + (velocity + omega * displacement) * elapsedSeconds) * decay;
    const nextVelocity = (velocity - omega * (velocity + omega * displacement) * elapsedSeconds) * decay;
    return [target + nextDisplacement, nextVelocity];
}
function createGpuBuffer(device, label, data) {
    const buffer = device.createBuffer({
        label,
        mappedAtCreation: true,
        size: minimumStorageBufferByteLength(data.byteLength),
        usage: BUFFER_USAGE.copyDestination | BUFFER_USAGE.storage,
    });
    const bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    new Uint8Array(buffer.getMappedRange()).set(bytes);
    buffer.unmap();
    return buffer;
}
export function minimumStorageBufferByteLength(byteLength) {
    return Math.max(Float32Array.BYTES_PER_ELEMENT * 4, byteLength);
}
export function clampSeedZoom(zoom) {
    return Math.max(0.82, Math.min(1.45, zoom));
}
function createLayouts(device) {
    const visibility = SHADER_STAGE.vertex | SHADER_STAGE.fragment;
    const blocks = device.createBindGroupLayout({
        label: "every-qrcode-block-layout",
        entries: [
            { binding: 0, buffer: { type: "uniform" }, visibility },
            { binding: 1, buffer: { type: "read-only-storage" }, visibility },
            { binding: 2, buffer: { type: "read-only-storage" }, visibility },
            { binding: 3, buffer: { type: "read-only-storage" }, visibility },
            { binding: 4, buffer: { type: "read-only-storage" }, visibility },
        ],
    });
    const items = device.createBindGroupLayout({
        label: "every-qrcode-item-layout",
        entries: [
            { binding: 0, buffer: { type: "uniform" }, visibility },
            { binding: 1, buffer: { type: "read-only-storage" }, visibility },
        ],
    });
    const post = device.createBindGroupLayout({
        label: "every-qrcode-post-layout",
        entries: [
            { binding: 0, buffer: { type: "uniform" }, visibility },
            { binding: 1, texture: { sampleType: "float" }, visibility: SHADER_STAGE.fragment },
            { binding: 2, sampler: { type: "filtering" }, visibility: SHADER_STAGE.fragment },
        ],
    });
    return { blocks, items, post };
}
async function createShaderModule(device, label, code) {
    const module = device.createShaderModule({ code, label });
    const compilation = await module.getCompilationInfo();
    const errors = compilation.messages.filter((message) => message.type === "error");
    if (errors.length > 0) {
        const details = errors.map((error) => `${error.lineNum}:${error.linePos} ${error.message}`);
        throw new Error(`${label} WGSL compilation failed\n${details.join("\n")}`);
    }
    return module;
}
function createScenePipeline(device, format, spec) {
    const target = spec.blend ? { blend: spec.blend, format } : { format };
    return device.createRenderPipeline({
        depthStencil: {
            depthCompare: "less",
            depthWriteEnabled: spec.depthWrite ?? true,
            format: "depth24plus",
        },
        fragment: { entryPoint: "fragmentMain", module: spec.module, targets: [target] },
        label: spec.label,
        layout: device.createPipelineLayout({ bindGroupLayouts: [spec.layout] }),
        primitive: { cullMode: "none", topology: "triangle-list" },
        vertex: { entryPoint: "vertexMain", module: spec.module },
    });
}
async function createSharedPipelines(device, format, layouts, sources) {
    const [postModule, rainModule] = await Promise.all([
        createShaderModule(device, "every-qrcode-post", sources.post),
        createShaderModule(device, "every-qrcode-rain", sources.weather),
    ]);
    const rain = createScenePipeline(device, format, {
        blend: ALPHA_BLEND,
        depthWrite: false,
        label: "every-qrcode-rain-pipeline",
        layout: layouts.items,
        module: rainModule,
    });
    const post = device.createRenderPipeline({
        fragment: { entryPoint: "fragmentMain", module: postModule, targets: [{ format }] },
        label: "every-qrcode-post-pipeline",
        layout: device.createPipelineLayout({ bindGroupLayouts: [layouts.post] }),
        primitive: { topology: "triangle-list" },
        vertex: { entryPoint: "vertexMain", module: postModule },
    });
    return { post, rain };
}
async function createTerrainPipelines(device, format, layouts, shared, sources) {
    const module = await createShaderModule(device, "every-qrcode-terrain", sources.terrain);
    const terrain = createScenePipeline(device, format, {
        label: "every-qrcode-terrain-pipeline",
        layout: layouts.blocks,
        module,
    });
    return { ...shared, form: sources.form, terrain };
}
async function createTreePipelines(device, format, layouts, shared, sources) {
    const modules = await Promise.all([
        createShaderModule(device, "every-qrcode-blocks", sources.blocks),
        createShaderModule(device, "every-qrcode-branches", sources.branches),
        createShaderModule(device, "every-qrcode-butterflies", sources.butterflies),
        createShaderModule(device, "every-qrcode-falling-petals", sources.fallingPetals),
        createShaderModule(device, "every-qrcode-flowers", sources.flowers),
        createShaderModule(device, "every-qrcode-grass", sources.grass),
        createShaderModule(device, "every-qrcode-shadow", sources.shadow),
    ]);
    const [blockModule, branchModule, butterflyModule, fallingPetalModule, flowerModule, grassModule, shadowModule,] = modules;
    const blocks = createScenePipeline(device, format, {
        label: "every-qrcode-block-pipeline",
        layout: layouts.blocks,
        module: blockModule,
    });
    const branches = createScenePipeline(device, format, {
        blend: ALPHA_BLEND,
        label: "every-qrcode-branch-pipeline",
        layout: layouts.items,
        module: branchModule,
    });
    const butterflies = createScenePipeline(device, format, {
        blend: ALPHA_BLEND,
        depthWrite: false,
        label: "every-qrcode-butterfly-pipeline",
        layout: layouts.items,
        module: butterflyModule,
    });
    const fallingPetals = createScenePipeline(device, format, {
        blend: ALPHA_BLEND,
        depthWrite: false,
        label: "every-qrcode-falling-petal-pipeline",
        layout: layouts.items,
        module: fallingPetalModule,
    });
    const flowers = createScenePipeline(device, format, {
        blend: ALPHA_BLEND,
        depthWrite: true,
        label: "every-qrcode-flower-pipeline",
        layout: layouts.items,
        module: flowerModule,
    });
    const grass = createScenePipeline(device, format, {
        blend: ALPHA_BLEND,
        label: "every-qrcode-grass-pipeline",
        layout: layouts.items,
        module: grassModule,
    });
    const shadow = createScenePipeline(device, format, {
        blend: ALPHA_BLEND,
        depthWrite: false,
        label: "every-qrcode-shadow-pipeline",
        layout: layouts.items,
        module: shadowModule,
    });
    return {
        ...shared,
        blocks,
        branches,
        butterflies,
        fallingPetals,
        flowers,
        form: sources.form,
        grass,
        shadow,
    };
}
async function createPipelines(device, format, layouts, form, generatorVersion) {
    const sources = await loadSeedShaderSources(form, generatorVersion);
    const shared = await createSharedPipelines(device, format, layouts, sources);
    return sources.form === "terrain"
        ? createTerrainPipelines(device, format, layouts, shared, sources)
        : createTreePipelines(device, format, layouts, shared, sources);
}
function createBuffers(device, field, scene) {
    const uniforms = device.createBuffer({
        label: "every-qrcode-uniforms",
        size: UNIFORM_FLOATS * Float32Array.BYTES_PER_ELEMENT,
        usage: BUFFER_USAGE.copyDestination | BUFFER_USAGE.uniform,
    });
    return {
        baseY: createGpuBuffer(device, "every-qrcode-block-base-y", field.baseY),
        blockHeights: createGpuBuffer(device, "every-qrcode-block-heights", field.heights),
        blockPositions: createGpuBuffer(device, "every-qrcode-block-positions", field.positions),
        blockTypes: createGpuBuffer(device, "every-qrcode-block-types", field.types),
        butterflies: createGpuBuffer(device, "every-qrcode-butterflies", scene.butterflies),
        fallingPetals: createGpuBuffer(device, "every-qrcode-falling-petals", scene.fallingPetals),
        flowers: createGpuBuffer(device, "every-qrcode-flowers", scene.flowers),
        grass: createGpuBuffer(device, "every-qrcode-grass", scene.grass),
        groundPetals: createGpuBuffer(device, "every-qrcode-ground-petals", scene.groundPetals),
        rain: createGpuBuffer(device, "every-qrcode-rain", scene.rain),
        segments: createGpuBuffer(device, "every-qrcode-segments", scene.segments),
        uniforms,
    };
}
function createBindGroups(device, layouts, buffers) {
    const uniformEntry = { binding: 0, resource: { buffer: buffers.uniforms } };
    const blocks = device.createBindGroup({
        label: "every-qrcode-block-bind-group",
        layout: layouts.blocks,
        entries: [
            uniformEntry,
            { binding: 1, resource: { buffer: buffers.blockTypes } },
            { binding: 2, resource: { buffer: buffers.blockPositions } },
            { binding: 3, resource: { buffer: buffers.blockHeights } },
            { binding: 4, resource: { buffer: buffers.baseY } },
        ],
    });
    const branches = device.createBindGroup({
        label: "every-qrcode-branch-bind-group",
        layout: layouts.items,
        entries: [uniformEntry, { binding: 1, resource: { buffer: buffers.segments } }],
    });
    const flowers = device.createBindGroup({
        label: "every-qrcode-flower-bind-group",
        layout: layouts.items,
        entries: [uniformEntry, { binding: 1, resource: { buffer: buffers.flowers } }],
    });
    const groundPetals = device.createBindGroup({
        label: "every-qrcode-ground-petal-bind-group",
        layout: layouts.items,
        entries: [uniformEntry, { binding: 1, resource: { buffer: buffers.groundPetals } }],
    });
    const fallingPetals = device.createBindGroup({
        label: "every-qrcode-falling-petal-bind-group",
        layout: layouts.items,
        entries: [uniformEntry, { binding: 1, resource: { buffer: buffers.fallingPetals } }],
    });
    const grass = device.createBindGroup({
        label: "every-qrcode-grass-bind-group",
        layout: layouts.items,
        entries: [uniformEntry, { binding: 1, resource: { buffer: buffers.grass } }],
    });
    const rain = device.createBindGroup({
        label: "every-qrcode-rain-bind-group",
        layout: layouts.items,
        entries: [uniformEntry, { binding: 1, resource: { buffer: buffers.rain } }],
    });
    const butterflies = device.createBindGroup({
        label: "every-qrcode-butterfly-bind-group",
        layout: layouts.items,
        entries: [uniformEntry, { binding: 1, resource: { buffer: buffers.butterflies } }],
    });
    return {
        blocks,
        branches,
        butterflies,
        fallingPetals,
        flowers,
        grass,
        groundPetals,
        rain,
    };
}
function destroyTargets(targets) {
    targets?.depth.destroy();
    targets?.scene.destroy();
}
function createTargets(gpu, width, height) {
    const scene = gpu.device.createTexture({
        format: gpu.format,
        label: "every-qrcode-scene-texture",
        size: [width, height],
        usage: TEXTURE_USAGE.renderAttachment | TEXTURE_USAGE.textureBinding,
    });
    const depth = gpu.device.createTexture({
        format: "depth24plus",
        label: "every-qrcode-depth-texture",
        size: [width, height],
        usage: TEXTURE_USAGE.renderAttachment,
    });
    const sceneView = scene.createView();
    const postBindGroup = gpu.device.createBindGroup({
        label: "every-qrcode-post-bind-group",
        layout: gpu.layouts.post,
        entries: [
            { binding: 0, resource: { buffer: gpu.buffers.uniforms } },
            { binding: 1, resource: sceneView },
            { binding: 2, resource: gpu.sampler },
        ],
    });
    return { depth, postBindGroup, scene, sceneView };
}
function resizeGpuCanvas(canvas, gpu) {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.floor(canvas.clientWidth * ratio));
    const height = Math.max(1, Math.floor(canvas.clientHeight * ratio));
    if (canvas.width === width && canvas.height === height && gpu.targets)
        return;
    canvas.width = width;
    canvas.height = height;
    gpu.context.configure({ alphaMode: "premultiplied", device: gpu.device, format: gpu.format });
    destroyTargets(gpu.targets);
    gpu.targets = createTargets(gpu, width, height);
}
function writeUniforms(canvas, gpu, progress, time, toggleAge) {
    const idle = 1 - progress;
    const bounce = Math.exp(-6 * toggleAge) * Math.sin(12 * toggleAge) * 0.012;
    const values = new Float32Array(UNIFORM_FLOATS);
    const effectMotion = gpu.sceneEffect === 0 ? 1 : gpu.sceneEffect === 1 ? 0.15 : 0;
    const cameraMotion = gpu.form === "terrain" ? 0 : effectMotion;
    values[0] = canvas.width / Math.max(1, canvas.height);
    values[1] = time;
    values[2] = gpu.blockField.blocks.length;
    values[3] = progress;
    values[4] = gpu.blockField.qrSize;
    values[5] = Math.sin(time * 0.15) * 0.003 * idle * cameraMotion;
    values[6] = Math.sin(time * 0.11 + 1) * 0.002 * idle * cameraMotion + bounce;
    values[7] = gpu.blockField.blockSize;
    values[8] = toggleAge;
    values[9] = gpu.scene.appearance.flowerHue;
    values[10] = gpu.scene.appearance.leafHue;
    values[11] = gpu.scene.appearance.fruitHue;
    values[12] = gpu.scene.appearance.fruitfulness;
    values[13] = gpu.scene.appearance.flowerHueSpread;
    values[14] = gpu.scene.appearance.leafHueSpread;
    values[15] = gpu.sceneEffect;
    for (let index = 0; index < gpu.palette.length; index += 1) {
        const color = gpu.palette[index];
        const offset = 16 + index * 4;
        values[offset] = color[0];
        values[offset + 1] = color[1];
        values[offset + 2] = color[2];
        values[offset + 3] = 1;
    }
    for (let index = 0; index < gpu.terrainPalette.length; index += 1) {
        const color = gpu.terrainPalette[index];
        const offset = 36 + index * 4;
        values[offset] = color[0];
        values[offset + 1] = color[1];
        values[offset + 2] = color[2];
        values[offset + 3] = 1;
    }
    values[56] = gpu.zoom;
    gpu.device.queue.writeBuffer(gpu.buffers.uniforms, 0, values);
}
function encodeScenePass(encoder, gpu) {
    const targets = gpu.targets;
    if (!targets)
        return;
    const pass = encoder.beginRenderPass({
        colorAttachments: [
            {
                clearValue: gpu.clearColor,
                loadOp: "clear",
                storeOp: "store",
                view: targets.sceneView,
            },
        ],
        depthStencilAttachment: {
            depthClearValue: 1,
            depthLoadOp: "clear",
            depthStoreOp: "store",
            view: targets.depth.createView(),
        },
        label: "every-qrcode-scene-pass",
    });
    const isTerrain = gpu.pipelines.form === "terrain";
    pass.setPipeline(isTerrain ? gpu.pipelines.terrain : gpu.pipelines.blocks);
    pass.setBindGroup(0, gpu.bindGroups.blocks);
    if (isTerrain) {
        pass.draw(36, gpu.blockField.blocks.length);
    }
    else {
        pass.draw(gpu.blockField.blocks.length * 36);
        pass.setPipeline(gpu.pipelines.shadow);
        pass.setBindGroup(0, gpu.bindGroups.grass);
        pass.draw(6);
        pass.setPipeline(gpu.pipelines.grass);
        pass.setBindGroup(0, gpu.bindGroups.grass);
        pass.draw(gpu.scene.grassCount * 3);
        pass.setPipeline(gpu.pipelines.flowers);
        pass.setBindGroup(0, gpu.bindGroups.groundPetals);
        pass.draw(gpu.scene.groundPetalCount * 150);
        pass.setPipeline(gpu.pipelines.branches);
        pass.setBindGroup(0, gpu.bindGroups.branches);
        pass.draw(gpu.scene.segmentCount * 48);
        pass.setPipeline(gpu.pipelines.flowers);
        pass.setBindGroup(0, gpu.bindGroups.flowers);
        pass.draw(gpu.scene.flowerCount * 150);
        if (gpu.scene.fallingPetalCount > 0) {
            pass.setPipeline(gpu.pipelines.fallingPetals);
            pass.setBindGroup(0, gpu.bindGroups.fallingPetals);
            pass.draw(gpu.scene.fallingPetalCount * 24);
        }
    }
    pass.setPipeline(gpu.pipelines.rain);
    pass.setBindGroup(0, gpu.bindGroups.rain);
    pass.draw(gpu.scene.rainCount * 6);
    if (gpu.pipelines.form === "tree") {
        pass.setPipeline(gpu.pipelines.butterflies);
        pass.setBindGroup(0, gpu.bindGroups.butterflies);
        pass.draw(gpu.scene.butterflyCount * 6);
    }
    pass.end();
}
function encodePostPass(encoder, gpu) {
    if (!gpu.targets)
        return;
    const pass = encoder.beginRenderPass({
        colorAttachments: [
            {
                clearValue: gpu.clearColor,
                loadOp: "clear",
                storeOp: "store",
                view: gpu.context.getCurrentTexture().createView(),
            },
        ],
        label: "every-qrcode-post-pass",
    });
    pass.setPipeline(gpu.pipelines.post);
    pass.setBindGroup(0, gpu.targets.postBindGroup);
    pass.draw(3);
    pass.end();
}
function renderGpuFrame(gpu) {
    const encoder = gpu.device.createCommandEncoder({ label: "every-qrcode-frame" });
    encodeScenePass(encoder, gpu);
    encodePostPass(encoder, gpu);
    gpu.device.queue.submit([encoder.finish()]);
}
function destroyGpuResources(gpu) {
    if (!gpu)
        return;
    destroyTargets(gpu.targets);
    for (const buffer of Object.values(gpu.buffers))
        buffer.destroy();
    gpu.context.unconfigure();
    gpu.device.destroy();
}
async function initializeGpu(canvas, model, sceneConfig, form) {
    if (!("gpu" in navigator))
        throw new Error("This browser does not support WebGPU");
    const adapter = await navigator.gpu.requestAdapter({ powerPreference: "high-performance" });
    if (!adapter)
        throw new Error("No WebGPU adapter is available");
    const device = await adapter.requestDevice();
    const context = canvas.getContext("webgpu");
    if (!context)
        throw new Error("Could not create a WebGPU canvas context");
    const format = navigator.gpu.getPreferredCanvasFormat();
    const blockField = createSeedBlockField(model, form);
    const scene = createSeedGpuScene(model, form);
    const layouts = createLayouts(device);
    const pipelines = await createPipelines(device, format, layouts, form, model.generatorVersion);
    const buffers = createBuffers(device, blockField, scene);
    const bindGroups = createBindGroups(device, layouts, buffers);
    const sampler = device.createSampler({ magFilter: "linear", minFilter: "linear" });
    const palette = createPalette(sceneConfig);
    return {
        bindGroups,
        blockField,
        buffers,
        clearColor: createClearColor(sceneConfig),
        context,
        device,
        format,
        form,
        layouts,
        pipelines,
        palette,
        sampler,
        scene,
        sceneEffect: createSceneEffect(sceneConfig),
        terrainPalette: createTerrainPalette(palette),
        targets: undefined,
        zoom: 1,
    };
}
function updateGpuScene(gpu, scene) {
    const palette = createPalette(scene);
    gpu.clearColor = createClearColor(scene);
    gpu.palette = palette;
    gpu.sceneEffect = createSceneEffect(scene);
    gpu.terrainPalette = createTerrainPalette(palette);
}
function animate(canvas, state, now) {
    const gpu = state.gpu;
    if (!gpu || state.closed)
        return;
    if (gpu.form === "terrain") {
        const elapsedSeconds = Math.min(0.05, Math.max(0, now - state.lastFrameTime) / 1000);
        const [progress, velocity] = stepTerrainSpring(state.progress, state.velocity, state.target, elapsedSeconds);
        state.progress = progress;
        state.velocity = velocity;
        if (Math.abs(progress - state.target) < 0.0005 && Math.abs(velocity) < 0.006) {
            state.progress = state.target;
            state.velocity = 0;
        }
    }
    else {
        const elapsed = now - state.transitionStart;
        const linear = state.transitionDuration === 0 ? 1 : Math.min(1, elapsed / state.transitionDuration);
        const eased = evaluateMorphCurve(linear);
        state.progress = state.from + (state.target - state.from) * eased;
    }
    state.lastFrameTime = now;
    canvas.dataset["morphProgress"] = state.progress.toFixed(3);
    if (state.resizePending)
        state.resizePending = false;
    resizeGpuCanvas(canvas, gpu);
    const time = now / 1000;
    const toggleAge = Math.max(0, (now - state.toggleTime) / 1000);
    writeUniforms(canvas, gpu, state.progress, time, toggleAge);
    renderGpuFrame(gpu);
    state.frame = requestAnimationFrame((next) => animate(canvas, state, next));
}
function createInitialState() {
    const now = performance.now();
    return {
        closed: false,
        frame: 0,
        from: 0,
        gpu: undefined,
        lastFrameTime: now,
        progress: 0,
        resizePending: true,
        target: 0,
        transitionDuration: 0,
        transitionStart: now,
        toggleTime: now,
        velocity: 0,
        zoom: 1,
    };
}
export function mountSeed(canvas, model, scene = {}, form = "tree", options = {}) {
    const state = createInitialState();
    let sceneConfig = scene;
    canvas.dataset["renderer"] = "webgpu-initializing";
    void initializeGpu(canvas, model, sceneConfig, form)
        .then((gpu) => {
        if (state.closed) {
            destroyGpuResources(gpu);
            return;
        }
        updateGpuScene(gpu, sceneConfig);
        gpu.zoom = state.zoom;
        state.gpu = gpu;
        canvas.dataset["renderer"] = "webgpu-wgsl";
        resizeGpuCanvas(canvas, gpu);
        state.frame = requestAnimationFrame((now) => animate(canvas, state, now));
        options.onReady?.();
    })
        .catch((reason) => {
        if (state.closed)
            return;
        const error = reason instanceof Error ? reason : new Error("WebGPU initialization failed");
        canvas.dataset["renderer"] = "webgpu-error";
        console.error("WebGPU renderer initialization failed:", error);
        options.onError?.(error);
    });
    return {
        dispose: () => {
            state.closed = true;
            cancelAnimationFrame(state.frame);
            destroyGpuResources(state.gpu);
            state.gpu = undefined;
        },
        resize: () => {
            state.resizePending = true;
        },
        setFlat: (flat) => {
            const target = flat ? 1 : 0;
            if (target === state.target)
                return;
            const now = performance.now();
            state.from = state.progress;
            state.target = target;
            state.transitionDuration =
                MORPH_DURATION_MS * Math.max(0.25, Math.abs(state.target - state.from));
            state.transitionStart = now;
            state.toggleTime = now;
        },
        setScene: (nextScene) => {
            sceneConfig = nextScene;
            if (state.gpu)
                updateGpuScene(state.gpu, nextScene);
        },
        setZoom: (zoom) => {
            state.zoom = clampSeedZoom(zoom);
            if (state.gpu)
                state.gpu.zoom = state.zoom;
        },
    };
}
