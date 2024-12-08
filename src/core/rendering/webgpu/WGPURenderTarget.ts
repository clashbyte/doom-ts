import { BufferContentType } from '@/core/rendering/base/Buffer.ts';
import { RenderTarget, RenderTargetParameters } from '@/core/rendering/base/RenderTarget.ts';
import { WGPUBuffer } from '@/core/rendering/webgpu/WGPUBuffer.ts';
import { WGPURenderer } from '@/core/rendering/webgpu/WGPURenderer.ts';
import BlitShader from '@/shaders/webgpu/blit.wgsl?raw';

export class WGPURenderTarget extends RenderTarget<WGPURenderer, null> {
  public static readonly OUTPUT_FORMAT: GPUTextureFormat = 'rgba8unorm';

  public static readonly OUTPUT_DEPTH_FORMAT: GPUTextureFormat = 'depth24plus';

  private static blitVertexBuffer: WGPUBuffer;

  private static blitIndexBuffer: WGPUBuffer;

  private static blitPipeline: GPURenderPipeline | null;

  private static blitLayout: GPUBindGroupLayout | null;

  private colorBuffer: GPUTexture | null;

  private depthBuffer: GPUTexture | null;

  private colorBufferView: GPUTextureView | null;

  private depthBufferView: GPUTextureView | null;

  private readonly colorBufferSampler: GPUSampler | null;

  private bindGroup: GPUBindGroup | null;

  public constructor(renderer: WGPURenderer, params: RenderTargetParameters) {
    super(renderer, params);
    this.colorBuffer = null;
    this.depthBuffer = null;
    this.colorBufferView = null;
    this.depthBufferView = null;
    this.colorBufferSampler = null;
    this.bindGroup = null;

    this.colorBufferSampler = renderer.device.createSampler({
      magFilter: 'linear',
      minFilter: 'linear',
      addressModeU: 'clamp-to-edge',
      addressModeV: 'clamp-to-edge',
    });

    if (
      !WGPURenderTarget.blitPipeline ||
      !WGPURenderTarget.blitLayout ||
      !WGPURenderTarget.blitVertexBuffer ||
      !WGPURenderTarget.blitIndexBuffer
    ) {
      const device = renderer.device;

      WGPURenderTarget.blitVertexBuffer = new WGPUBuffer(renderer, {
        data: new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
        type: BufferContentType.Vertex,
      });
      WGPURenderTarget.blitIndexBuffer = new WGPUBuffer(renderer, {
        data: new Uint16Array([0, 1, 2, 1, 3, 2]),
        type: BufferContentType.Index,
      });

      const shader = device.createShaderModule({
        label: this.label ? `${this.label} Blit Shader` : undefined,
        code: BlitShader,
      });

      WGPURenderTarget.blitLayout = device.createBindGroupLayout({
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
        ],
      });

      const pipelineLayout = device.createPipelineLayout({
        bindGroupLayouts: [
          WGPURenderTarget.blitLayout, //
          renderer.palette.bindGroupLayout,
        ],
      });

      WGPURenderTarget.blitPipeline = renderer.device.createRenderPipeline({
        label: this.label ? `${this.label} Blit Pipeline` : undefined,
        layout: pipelineLayout,
        vertex: {
          module: shader,
          buffers: [
            {
              arrayStride: 2 * 4, // 2 floats, 4 bytes each
              attributes: [
                { shaderLocation: 0, offset: 0, format: 'float32x2' }, // position
              ],
            },
          ],
        },
        fragment: {
          module: shader,
          targets: [
            {
              format: renderer.outputFormat,
            },
          ],
        },
      });
    }
    const targetSize = this.renderer.size;
    this.resize(targetSize[0], targetSize[1]);
  }

  public bind() {
    if (this.colorBuffer) {
      this.renderer.beginRenderPass({
        colorAttachments: [
          {
            view: this.colorBuffer.createView(),
            clearValue: this.clear ? [0, 0, 0, 1] : undefined,
            loadOp: this.clear ? 'clear' : 'load',
            storeOp: 'store',
          },
        ],
        depthStencilAttachment:
          this.depth && this.depthBuffer
            ? {
                view: this.depthBuffer.createView(),
                depthLoadOp: 'clear',
                depthStoreOp: 'store',
                depthClearValue: 1,
              }
            : undefined,
      });
    }
  }

  public unbind(needBlit: boolean | undefined) {
    this.renderer.endRenderPass();
    if (needBlit) {
      this.blit();
    }
  }

  public resize(width: number, height: number) {
    const device = this.renderer.device;
    this.colorBuffer?.destroy();
    this.depthBuffer?.destroy();
    this.colorBuffer = null;
    this.depthBuffer = null;
    this.colorBufferView = null;
    this.depthBufferView = null;

    const color = device.createTexture({
      size: {
        width,
        height,
      },
      format: WGPURenderTarget.OUTPUT_FORMAT,
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
    });
    if (color) {
      this.colorBuffer = color;
      this.colorBufferView = color.createView();

      if (this.depth) {
        const depth = device.createTexture({
          size: {
            width,
            height,
          },
          format: WGPURenderTarget.OUTPUT_DEPTH_FORMAT,
          usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
        });
        if (this.depth) {
          this.depthBuffer = depth;
          this.depthBufferView = depth.createView();
        }
      }
    }

    if (this.colorBufferView && this.colorBufferSampler && WGPURenderTarget.blitLayout) {
      this.bindGroup = device.createBindGroup({
        layout: WGPURenderTarget.blitLayout,
        entries: [
          {
            binding: 0,
            resource: this.colorBufferView,
          },
          {
            binding: 1,
            resource: this.colorBufferSampler,
          },
        ],
      });
    }
  }

  public blit() {
    this.renderer.beginRenderPass({
      colorAttachments: [
        {
          view: this.renderer.context.getCurrentTexture().createView(),
          clearValue: this.clear ? [0, 0, 0, 1] : undefined,
          loadOp: this.clear ? 'clear' : 'load',
          storeOp: 'store',
        },
      ],
    });
    const { blitPipeline, blitVertexBuffer, blitIndexBuffer } = WGPURenderTarget;
    const pass = this.renderer.renderPass;
    if (pass && blitPipeline && blitVertexBuffer && blitIndexBuffer) {
      pass.setPipeline(blitPipeline);
      pass.setBindGroup(0, this.bindGroup);
      pass.setBindGroup(1, this.renderer.palette.bindGroup);
      pass.setVertexBuffer(0, blitVertexBuffer.handle);
      pass.setIndexBuffer(blitIndexBuffer.handle!, 'uint16');
      pass.drawIndexed(6);
    }
    this.renderer.endRenderPass();
  }
}
