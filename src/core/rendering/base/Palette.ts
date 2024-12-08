import { Renderer } from '@/core/rendering/base/Renderer.ts';
import { Texture, TextureContentType } from '@/core/rendering/base/Texture.ts';

export abstract class Palette<
  TRenderer extends Renderer = Renderer,
  TTexture extends Texture = Texture,
> {
  protected renderer: TRenderer;

  protected paletteTexture: TTexture;

  protected lookupTexture: TTexture;

  protected paletteIndex: number;

  public abstract get palette(): number;

  public abstract set palette(index: number);

  protected constructor(renderer: TRenderer) {
    this.renderer = renderer;
    this.paletteIndex = 0;
    this.paletteTexture = this.createEmptyTexture() as TTexture;
    this.lookupTexture = this.createEmptyTexture() as TTexture;
  }

  public abstract setPaletteTextures(palette: TTexture, lookup: TTexture): void;

  private createEmptyTexture() {
    return this.renderer.createTexture({
      data: new Uint8Array([255, 0, 0, 1]),
      type: TextureContentType.RGB,
      width: 1,
      height: 1,
    });
  }
}
