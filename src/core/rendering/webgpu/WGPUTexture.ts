import { Texture, TextureContentType, TextureParameters } from '@/core/rendering/base/Texture.ts';
import { WGPURenderer } from '@/core/rendering/webgpu/WGPURenderer.ts';

export class WGPUTexture extends Texture<WGPURenderer, GPUTexture, GPUSampler> {
  private static TEXTURE_FORMATS: { [key in TextureContentType]: GPUTextureFormat } | null = null;

  private static TEXTURE_BYTES: { [key in TextureContentType]: number } | null = null;

  private readonly localView: GPUTextureView | null;

  public get view() {
    return this.localView!;
  }

  public constructor(renderer: WGPURenderer, params: TextureParameters) {
    super(renderer, params);
    const device = this.renderer.device;

    if (!WGPUTexture.TEXTURE_FORMATS) {
      WGPUTexture.TEXTURE_FORMATS = {
        [TextureContentType.Palette]: 'r8unorm',
        [TextureContentType.PaletteWithAlpha]: 'rg8unorm',
        [TextureContentType.RGB]: 'rgba8unorm',
        [TextureContentType.Lookup]: 'r8unorm',
      };
    }
    if (!WGPUTexture.TEXTURE_BYTES) {
      WGPUTexture.TEXTURE_BYTES = {
        [TextureContentType.Palette]: 1,
        [TextureContentType.PaletteWithAlpha]: 2,
        [TextureContentType.RGB]: 4,
        [TextureContentType.Lookup]: 1,
      };
    }

    this.localSampler = null;
    this.localHandle = null;
    this.localView = null;

    const handle = device.createTexture({
      size: {
        width: this.width,
        height: this.height,
      },
      format: WGPUTexture.TEXTURE_FORMATS[this.type],
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
      label: this.label,
    });
    if (handle) {
      device.queue.writeTexture(
        { texture: handle },
        this.type === TextureContentType.RGB ? this.repackAlpha(this.data) : this.data,
        { bytesPerRow: this.width * WGPUTexture.TEXTURE_BYTES[this.type] },
        { width: this.width, height: this.height },
      );

      this.localHandle = handle;
      this.localView = handle.createView();
      this.localSampler = device.createSampler({
        addressModeU: 'repeat',
        addressModeV: 'repeat',
        minFilter: 'nearest',
        magFilter: 'nearest',
        label: this.label ? `${this.label} Sampler` : undefined,
      });
    }
  }

  public dispose() {
    this.localHandle?.destroy();
    this.localHandle = null;
  }

  private repackAlpha(rgbData: Uint8Array<ArrayBuffer>) {
    const newData = new Uint8Array((rgbData.length / 3) * 4);
    for (let i = 0; i < (rgbData.length / 3) * 4; i++) {
      const v3 = i * 3;
      const v4 = i * 4;
      newData[v4] = rgbData[v3];
      newData[v4 + 1] = rgbData[v3 + 1];
      newData[v4 + 2] = rgbData[v3 + 2];
      newData[v4 + 3] = 255;
    }

    return newData;
  }
}
