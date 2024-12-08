import { getRenderer } from '@/core/Context.ts';
import { Texture, TextureContentType } from '@/core/rendering/base/Texture.ts';
import { WAD } from '@/files/WAD.ts';
import { decodePatch, PatchData } from '@/graphics/Patch.ts';
import { BinaryReader } from '@/helpers/BinaryReader.ts';

export interface WallTextureData {
  width: number;
  height: number;
  map: Uint8Array<ArrayBuffer>;
  colorMap: Uint8Array<ArrayBuffer>;
  alphaMap: Uint8Array<ArrayBuffer>;
  transparent: boolean;
}

export class WallTextures {
  private static readonly list: { [key: string]: WallTextureData } = {};

  private static readonly textures: { [key: string]: Texture } = {};

  private static readonly patchCache: (PatchData | null)[] = [];

  public static init() {
    this.loadPatches();
    this.loadTextures('TEXTURE1');
    this.loadTextures('TEXTURE2');
    this.sendToGPU();
  }

  public static getRawTexture(name: string): WallTextureData | null {
    return this.list[name.toUpperCase()];
  }

  public static getTexture(name: string): Texture | null {
    return this.textures[name.toUpperCase()];
  }

  private static loadPatches() {
    const rawData = WAD.getEntry('PNAMES');
    if (!rawData) {
      return;
    }

    const f = new BinaryReader(rawData);
    const count = f.readInt();
    for (let i = 0; i < count; i++) {
      const name = f.readFixedString(8).toUpperCase();
      const patch = decodePatch(`PATCHES/${name}`);
      if (patch) {
        this.patchCache.push(patch);
      } else {
        this.patchCache.push(null);
        console.warn(`[WallTextures] Unknown patch ${name}`);
      }
    }
    console.debug(`[WallTextures] Parsed ${count} patches`);
  }

  private static loadTextures(lumpName: string) {
    const rawData = WAD.getEntry(lumpName);
    if (rawData) {
      const f = new BinaryReader(rawData);
      const count = f.readInt();
      const offsets = new Int32Array(count);
      for (let i = 0; i < count; i++) {
        offsets[i] = f.readInt();
      }
      for (let i = 0; i < count; i++) {
        f.offset = offsets[i];
        this.parseTexture(f);
      }

      console.debug(`[WallTextures] Loaded ${count} textures from ${lumpName}`);
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
          label: `Texture ${name}`,
        });
      }
    }
    console.debug('[WallTextures] Sent to GPU');
  }

  private static parseTexture(f: BinaryReader) {
    const name = f.readFixedString(8).toUpperCase();
    f.offset += 4;
    const width = f.readShort();
    const height = f.readShort();
    f.offset += 4;

    const map = new Uint8Array(width * height * 2);
    const colorMap = new Uint8Array(width * height);
    const alphaMap = new Uint8Array(width * height);

    const patchCount = f.readShort();
    for (let i = 0; i < patchCount; i++) {
      const ox = f.readSignedShort();
      const oy = f.readSignedShort();
      const patchId = f.readShort();
      f.offset += 4;

      const patch = this.patchCache[patchId]!;
      if (patch) {
        for (let y = 0; y < patch.height; y++) {
          for (let x = 0; x < patch.width; x++) {
            if (!(x + ox < 0 || y + oy < 0 || x + ox >= width || y + oy >= height)) {
              const sidx = y * patch.width + x;
              const tidx = (y + oy) * width + x + ox;

              if (patch.alphaMap[sidx]) {
                colorMap[tidx] = map[tidx * 2] = patch.colorMap[sidx];
                alphaMap[tidx] = map[tidx * 2 + 1] = Math.max(patch.alphaMap[sidx], alphaMap[tidx]);
              }
            }
          }
        }
      }
    }

    // console.debug(name);

    this.list[name] = {
      width,
      height,
      map,
      colorMap,
      alphaMap,
      transparent: false,
    };
  }
}
