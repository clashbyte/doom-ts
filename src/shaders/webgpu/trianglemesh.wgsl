
struct VertexBuffers {
    @location(0) position: vec3f,
    @location(1) normal: vec3f,
    @location(2) uv: vec2f,
};

struct Varyings {
    @builtin(position) vertex: vec4f,
    @location(0) vUv: vec2f,
    @location(1) vNormal: vec3f,
}

struct Camera {
    viewMat: mat4x4<f32>,
    projMat: mat4x4<f32>,
    spriteMat: mat3x3<f32>,
    position: vec3f,
}

struct MeshParameters {
    objectMat: mat4x4<f32>,
    normalMat: mat3x3<f32>,
    lightness: f32,
}

@group(0) @binding(0) var diffuse: texture_2d<f32>;
@group(0) @binding(1) var diffuseSampler: sampler;
@group(0) @binding(2) var <uniform> params: MeshParameters;

@group(1) @binding(0) var<uniform> camera: Camera;

@vertex fn vs(
    buffers: VertexBuffers
) -> Varyings {
    var out: Varyings;
    out.vertex = camera.projMat * camera.viewMat * params.objectMat * vec4(buffers.position, 1.0);
    out.vNormal = buffers.normal;
    out.vUv = buffers.uv;

    return out;
}

@fragment fn fs(vars: Varyings) -> @location(0) vec4f {
    var data = textureSample(diffuse, diffuseSampler, vars.vUv).rg;
    var colorIndex = data.r;
    var colorAlpha = data.g;
    var baseLight = 1.0 - params.lightness;

    if (colorAlpha < 1.0) {
        discard;
    }

    return vec4f(colorIndex, baseLight, 0.0, 0.0);
}
