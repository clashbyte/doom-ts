import { BufferParameters } from '@/core/rendering/base/Buffer.ts';
import { Renderer } from '@/core/rendering/base/Renderer.ts';
import { RenderTargetParameters } from '@/core/rendering/base/RenderTarget.ts';
import { TextureParameters } from '@/core/rendering/base/Texture.ts';
import { TriangleMesh, TriangleMeshParameters } from '@/core/rendering/base/TriangleMesh.ts';
import { WGPUBuffer } from '@/core/rendering/webgpu/WGPUBuffer.ts';
import { WGPUCamera } from '@/core/rendering/webgpu/WGPUCamera.ts';
import { WGPUPalette } from '@/core/rendering/webgpu/WGPUPalette.ts';
import { WGPURenderTarget } from '@/core/rendering/webgpu/WGPURenderTarget.ts';
import { WGPUTexture } from '@/core/rendering/webgpu/WGPUTexture.ts';
import { WGPUTriangleMesh } from '@/core/rendering/webgpu/WGPUTriangleMesh.ts';

export class WGPURenderer extends Renderer<WGPUPalette, WGPUCamera> {
  private readonly localDevice: GPUDevice;

  private readonly localContext: GPUCanvasContext;

  private localEncoder: GPUCommandEncoder | null;

  private localRenderPass: GPURenderPassEncoder | null;

  private readonly canvasFormat: GPUTextureFormat;

  public get context() {
    return this.localContext;
  }

  public get device() {
    return this.localDevice;
  }

  public get commandEncoder() {
    return this.localEncoder;
  }

  public get renderPass() {
    return this.localRenderPass;
  }

  public get outputFormat() {
    return this.canvasFormat;
  }

  public get maxViewportSize(): [number, number] {
    const size = this.device.limits.maxTextureDimension2D;

    return [size, size];
  }

  public constructor(canvas: HTMLCanvasElement, device: GPUDevice) {
    super(canvas);
    this.localDevice = device;
    this.localContext = canvas.getContext('webgpu')!;
    this.localEncoder = null;
    this.localRenderPass = null;
    this.canvasFormat = navigator.gpu.getPreferredCanvasFormat();
    this.localContext.configure({
      device: this.localDevice,
      format: this.canvasFormat,
    });
    this.localPalette = this.createPalette();
    this.localCamera = this.createCamera();
  }

  public beginRender() {
    super.beginRender();
    this.localEncoder = this.device.createCommandEncoder({
      label: 'WGPURenderer command encoder',
    });
  }

  public endRender() {
    const encoder = this.localEncoder;
    if (encoder) {
      this.localDevice.queue.submit([encoder.finish()]);
      this.localEncoder = null;
    }
  }

  public beginRenderPass(descriptor: GPURenderPassDescriptor) {
    this.endRenderPass();
    if (this.localEncoder) {
      this.localRenderPass = this.localEncoder.beginRenderPass(descriptor);

      return this.localRenderPass;
    }

    return null;
  }

  public endRenderPass() {
    const pass = this.localRenderPass;
    if (pass) {
      pass.end();
      this.localRenderPass = null;
    }
  }

  public createTexture(params: TextureParameters): WGPUTexture {
    return new WGPUTexture(this, params);
  }

  public createBuffer(params: BufferParameters): WGPUBuffer {
    return new WGPUBuffer(this, params);
  }

  public createRenderTarget(params: RenderTargetParameters): WGPURenderTarget {
    return new WGPURenderTarget(this, params);
  }

  public createTriangleMesh(params: TriangleMeshParameters): TriangleMesh {
    return new WGPUTriangleMesh(this, params);
  }

  protected createPalette(): WGPUPalette {
    return new WGPUPalette(this);
  }

  protected createCamera(): WGPUCamera {
    return new WGPUCamera(this);
  }
}
