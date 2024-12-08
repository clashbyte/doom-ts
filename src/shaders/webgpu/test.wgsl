
struct VertexBuffers {
    @location(0) position: vec2f,
};

struct Varyings {
    @builtin(position) vertex: vec4f,
    @location(0) vUv: vec2f,
}

struct Camera {
    viewMat: mat4x4<f32>,
    projMat: mat4x4<f32>,
    spriteMat: mat3x3<f32>,
    position: vec3f,
}

@group(0) @binding(0) var diffuse: texture_2d<f32>;
@group(0) @binding(1) var diffuseSampler: sampler;

@group(1) @binding(0) var<uniform> camera: Camera;

@vertex fn vs(
    buffers: VertexBuffers
) -> Varyings {
    var out: Varyings;
    out.vertex = camera.projMat * camera.viewMat * vec4(buffers.position, 0.0, 1.0);
    out.vUv = buffers.position * 0.5 + 0.5;

    return out;
}

@fragment fn fs(vars: Varyings) -> @location(0) vec4f {
    var data = textureSample(diffuse, diffuseSampler, vars.vUv).rg;
    var colorIndex = data.r;

    return vec4f(colorIndex, 0.0, 0.0, 0.0);
}
