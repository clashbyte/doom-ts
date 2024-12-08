import { BufferContentType } from '@/core/rendering/base/Buffer.ts';
import { Palette } from '@/core/rendering/base/Palette.ts';
import { WGPUBuffer } from '@/core/rendering/webgpu/WGPUBuffer.ts';
import { WGPURenderer } from '@/core/rendering/webgpu/WGPURenderer.ts';
import { WGPUTexture } from '@/core/rendering/webgpu/WGPUTexture.ts';

export class WGPUPalette extends Palette<WGPURenderer, WGPUTexture> {
  private readonly localBindGroupLayout: GPUBindGroupLayout | null;

  private localBindGroup: GPUBindGroup | null;

  private localUniformBuffer: WGPUBuffer | null;

  public get bindGroupLayout() {
    return this.localBindGroupLayout;
  }

  public get bindGroup() {
    return this.localBindGroup;
  }

  public get palette(): number {
    return this.paletteIndex;
  }

  public set palette(value: number) {
    if (this.paletteIndex !== value) {
      this.paletteIndex = value;
      this.rebuildBuffer();
    }
  }

  public constructor(renderer: WGPURenderer) {
    super(renderer);
    const device = renderer.device;

    this.localBindGroupLayout = null;
    this.localBindGroup = null;
    this.localUniformBuffer = null;

    this.localBindGroupLayout = device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          texture: {},
          visibility: GPUShaderStage.FRAGMENT,
        },
        {
          binding: 1,
          sampler: {},
          visibility: GPUShaderStage.FRAGMENT,
        },
        {
          binding: 2,
          texture: {},
          visibility: GPUShaderStage.FRAGMENT,
        },
        {
          binding: 3,
          sampler: {},
          visibility: GPUShaderStage.FRAGMENT,
        },
        {
          binding: 4,
          visibility: GPUShaderStage.FRAGMENT,
          buffer: {},
        },
      ],
    });
  }

  public setPaletteTextures(palette: WGPUTexture, lookup: WGPUTexture) {
    this.paletteTexture = palette;
    this.lookupTexture = lookup;
    this.rebuildBuffer();
  }

  private rebuildBuffer() {
    const device = this.renderer.device;
    this.localUniformBuffer?.dispose();

    const data = new ArrayBuffer(4);
    const view = new DataView(data);
    view.setFloat32(0, (this.paletteIndex + 0.5) / this.paletteTexture.height);

    this.localUniformBuffer = this.renderer.createBuffer({
      data,
      type: BufferContentType.Uniform,
    });

    this.localBindGroup = device.createBindGroup({
      label: 'Palette Bind Group',
      layout: this.localBindGroupLayout!,
      entries: [
        {
          binding: 0,
          resource: this.paletteTexture.view!,
        },
        {
          binding: 1,
          resource: this.paletteTexture.sampler!,
        },
        {
          binding: 2,
          resource: this.lookupTexture.view!,
        },
        {
          binding: 3,
          resource: this.lookupTexture.sampler!,
        },
        {
          binding: 4,
          resource: {
            buffer: this.localUniformBuffer.handle!,
          },
        },
      ],
    });
  }
}
