
struct VertexBuffers {
    @location(0) position: vec2f,
};

struct Varyings {
    @builtin(position) vertex: vec4f,
    @location(0) vUv: vec2f,
}

struct PaletteUniforms {
    paletteIndex: f32
}

@group(0) @binding(0) var diffuse: texture_2d<f32>;
@group(0) @binding(1) var diffuseSampler: sampler;

@group(1) @binding(0) var palette: texture_2d<f32>;
@group(1) @binding(1) var paletteSampler: sampler;
@group(1) @binding(2) var brightmap: texture_2d<f32>;
@group(1) @binding(3) var brightmapSampler: sampler;
@group(1) @binding(3) var<uniform> paletteUniforms: PaletteUniforms;

@vertex fn vs(
    buffers: VertexBuffers
) -> Varyings {
    var out: Varyings;
    out.vertex = vec4f(buffers.position, 0.0, 1.0);
    out.vUv = buffers.position * 0.5 + 0.5;
    out.vUv.y = 1.0 - out.vUv.y;

    return out;
}

@fragment fn fs(varyings: Varyings) -> @location(0) vec4f {
    var paletteSize = vec2f(textureDimensions(palette));
    var lookupSize = vec2f(textureDimensions(brightmap));

    var data = textureSample(diffuse, diffuseSampler, varyings.vUv);

    var colorIndex = data.r;
    var brightIndex = data.g;
    var brightData = textureSample(brightmap, brightmapSampler, vec2f(colorIndex, brightIndex));

    var palColor = brightData.r;
    var color = textureSample(palette, paletteSampler, vec2f(palColor, 0.0));

    return color;
}
