import { Palette } from '@/core/rendering/base/Palette.ts';
import { Texture } from '@/core/rendering/base/Texture.ts';
import { GLRenderer } from '@/core/rendering/webgl/GLRenderer.ts';
import { GLTexture } from '@/core/rendering/webgl/GLTexture.ts';

export class GLPalette extends Palette<GLRenderer, GLTexture> {
  public get palette(): number {
    return 0;
  }

  public setPaletteTextures(palette: Texture, lookup: Texture) {
    this.paletteTexture = palette as GLTexture;
    this.lookupTexture = lookup as GLTexture;
  }
}
