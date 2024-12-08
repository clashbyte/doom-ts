import { getRenderer } from '@/core/Context.ts';
import { Texture, TextureContentType } from '@/core/rendering/base/Texture.ts';
import { WAD } from '@/files/WAD.ts';

export interface FlatTextureData {
  width: number;
  height: number;
  map: Uint8Array<ArrayBuffer>;
  colorMap: Uint8Array<ArrayBuffer>;
  alphaMap: Uint8Array<ArrayBuffer>;
  transparent: boolean;
}

export class FlatTextures {
  private static readonly list: { [key: string]: FlatTextureData } = {};

  private static readonly textures: { [key: string]: Texture } = {};

  public static init() {
    this.loadPatches();
    this.sendToGPU();
  }

  public static getRawTexture(name: string): FlatTextureData | null {
    return this.list[name];
  }

  public static getTexture(name: string): Texture | null {
    return this.textures[name];
  }

  private static loadPatches() {
    const fileList = WAD.getFiles();
    for (const name of fileList) {
      if (name.startsWith('FLATS/')) {
        const patchData = WAD.getEntry(name);
        if (patchData) {
          const pixelData = new Uint8Array(patchData);
          const alphaData = new Uint8Array(Array(pixelData.length).fill(255));
          const mixedData = new Uint8Array(pixelData.length * 2);
          for (let i = 0; i < pixelData.length; i++) {
            mixedData[i * 2] = pixelData[i];
            mixedData[i * 2 + 1] = alphaData[i];
          }

          this.list[name.substring(6).toUpperCase()] = {
            width: 64,
            height: 64,
            map: mixedData,
            colorMap: pixelData,
            alphaMap: alphaData,
            transparent: false,
          };
        }
      }
    }
  }

  private static sendToGPU() {
    for (const name in this.list) {
      if (name in this.list) {
        const tex = this.list[name];
        this.textures[name] = getRenderer().createTexture({
          data: tex.map,
          width: tex.width,
          height: tex.height,
          type: TextureContentType.PaletteWithAlpha,
          label: `Flat ${name}`,
        });
      }
    }
    console.debug('[FlatTextures] Sent to GPU');
  }
}
