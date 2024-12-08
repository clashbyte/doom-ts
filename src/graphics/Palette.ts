import { getRenderer } from '@/core/Context.ts';
import { Texture, TextureContentType } from '@/core/rendering/base/Texture.ts';
import { WAD } from '@/files/WAD.ts';

export class Palette {
  public static palette: Texture;

  public static colorMap: Texture;

  public static init() {
    this.loadPalette();
    this.loadColorMap();
    getRenderer().palette.setPaletteTextures(this.palette, this.colorMap);
  }

  private static loadPalette() {
    const paletteData = new Uint8Array(WAD.getEntry('PLAYPAL')!);
    const width = 256;
    const height = paletteData.byteLength / width / 3;
    this.palette = getRenderer().createTexture({
      data: paletteData,
      width,
      height,
      type: TextureContentType.RGB,
    });
  }

  private static loadColorMap() {
    const colorMapData = new Uint8Array(WAD.getEntry('COLORMAP')!);
    const width = 256;
    const height = colorMapData.byteLength / width;
    this.colorMap = getRenderer().createTexture({
      data: colorMapData,
      width,
      height,
      type: TextureContentType.Lookup,
    });
  }
}
