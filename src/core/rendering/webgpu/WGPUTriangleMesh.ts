import { Mat3, Mat4 } from 'gl-matrix';
import { TriangleMesh, TriangleMeshParameters } from '@/core/rendering/base/TriangleMesh.ts';
import { WGPUBuffer } from '@/core/rendering/webgpu/WGPUBuffer.ts';
import { WGPURenderer } from '@/core/rendering/webgpu/WGPURenderer.ts';
import { WGPURenderTarget } from '@/core/rendering/webgpu/WGPURenderTarget.ts';
import { WGPUTexture } from '@/core/rendering/webgpu/WGPUTexture.ts';
import { UniformBufferEntry, UniformBufferHelper } from '@/helpers/UniformBufferHelper.ts';
import TriangleMeshShader from '@/shaders/webgpu/trianglemesh.wgsl?raw';

export class WGPUTriangleMesh extends TriangleMesh<WGPURenderer, WGPUTexture, WGPUBuffer> {
  private static readonly UNIFORM_SIZE = 4 * 4 * 4 + 3 * 4 * 4;

  //
  private static pipeline: GPURenderPipeline;

  private static pipelineLayout: GPUPipelineLayout;

  private static bindGroupLayout: GPUBindGroupLayout;

  private static shader: GPUShaderModule;

  private bindGroup: GPUBindGroup | null;

  private readonly uniformBuffer: GPUBuffer;

  private readonly uniformHelper: UniformBufferHelper;

  public constructor(renderer: WGPURenderer, params: TriangleMeshParameters) {
    super(renderer, params);
    const device = renderer.device;
    this.bindGroup = null;

    this.uniformHelper = new UniformBufferHelper(
      [
        UniformBufferEntry.Matrix4, //
        UniformBufferEntry.Matrix3,
        UniformBufferEntry.Float,
      ],
      true,
    );
    this.uniformBuffer = device.createBuffer({
      size: this.uniformHelper.size,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    if (
      !WGPUTriangleMesh.pipeline ||
      !WGPUTriangleMesh.pipelineLayout ||
      !WGPUTriangleMesh.bindGroupLayout ||
      !WGPUTriangleMesh.shader
    ) {
      WGPUTriangleMesh.shader = device.createShaderModule({
        label: 'TriangleMesh Shader Module',
        code: TriangleMeshShader,
      });

      WGPUTriangleMesh.bindGroupLayout = device.createBindGroupLayout({
        label: 'TriangleMesh Bind Group Layout',
        entries: [
          {
            binding: 0,
            visibility: GPUShaderStage.FRAGMENT,
            texture: {},
          },
          {
            binding: 1,
            visibility: GPUShaderStage.FRAGMENT,
            sampler: {},
          },
          {
            binding: 2,
            visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.VERTEX,
            buffer: {},
          },
        ],
      });

      WGPUTriangleMesh.pipelineLayout = device.createPipelineLayout({
        label: 'TriangleMesh Pipeline Layout',
        bindGroupLayouts: [
          WGPUTriangleMesh.bindGroupLayout, //
          this.renderer.camera.bindGroupLayout,
        ],
      });

      WGPUTriangleMesh.pipeline = device.createRenderPipeline({
        label: 'TriangleMesh Render Pipeline',
        layout: WGPUTriangleMesh.pipelineLayout,
        vertex: {
          module: WGPUTriangleMesh.shader,
          buffers: [
            {
              // Vertex position
              arrayStride: 3 * 4,
              attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3' }],
            },
            {
              // Vertex normal
              arrayStride: 3 * 4,
              attributes: [{ shaderLocation: 1, offset: 0, format: 'float32x3' }],
            },
            {
              // Vertex UV
              arrayStride: 2 * 4,
              attributes: [{ shaderLocation: 2, offset: 0, format: 'float32x2' }],
            },
          ],
        },
        fragment: {
          module: WGPUTriangleMesh.shader,
          targets: [{ format: WGPURenderTarget.OUTPUT_FORMAT }],
        },
        depthStencil: {
          format: 'depth24plus',
          depthCompare: 'less-equal',
          depthWriteEnabled: true,
        },
        primitive: {
          topology: 'triangle-list',
          cullMode: 'back',
          frontFace: 'cw',
        },
      });
    }
  }

  public render() {
    if (this.needUniformRebuild) {
      this.rebuildBindGroup();
      this.needUniformRebuild = false;
    }

    const pass = this.renderer.renderPass;
    if (pass && this.bindGroup && this.indexCount > 0) {
      const { pipeline } = WGPUTriangleMesh;
      // console.debug('draw');

      pass.setPipeline(pipeline);
      pass.setBindGroup(0, this.bindGroup);
      pass.setBindGroup(1, this.renderer.camera.bindGroup);
      pass.setVertexBuffer(0, this.positionBuffer.handle);
      pass.setVertexBuffer(1, this.normalBuffer.handle);
      pass.setVertexBuffer(2, this.uvBuffer.handle);
      pass.setIndexBuffer(this.indexBuffer.handle!, 'uint16');
      pass.drawIndexed(this.indexCount);
    }
  }

  private rebuildBindGroup() {
    const device = this.renderer.device;

    const tempMat = Mat4.create();
    const normMat = Mat3.create();

    Mat4.fromTranslation(tempMat, this.localPosition);
    Mat3.normalFromMat4Fast(normMat, tempMat);

    this.uniformHelper.setMatrix4(0, tempMat);
    this.uniformHelper.setMatrix3(1, normMat);
    this.uniformHelper.setFloat(2, this.localLightness);
    device.queue.writeBuffer(this.uniformBuffer, 0, this.uniformHelper.buffer);

    this.bindGroup = device.createBindGroup({
      layout: WGPUTriangleMesh.bindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: this.texture.view,
        },
        {
          binding: 1,
          resource: this.texture.sampler,
        },
        {
          binding: 2,
          resource: {
            buffer: this.uniformBuffer,
          },
        },
      ],
    });
  }
}
