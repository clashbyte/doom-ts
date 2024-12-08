import { WAD } from '@/files/WAD.ts';
import { BinaryReader } from '@/helpers/BinaryReader.ts';

export interface PatchData {
  width: number;
  height: number;
  originX: number;
  originY: number;
  map: Uint8Array<ArrayBuffer>;
  colorMap: Uint8Array<ArrayBuffer>;
  alphaMap: Uint8Array<ArrayBuffer>;
}

const PATCH_CACHE: { [name: string]: PatchData } = {};

export function decodePatch(name: string): PatchData | null {
  if (PATCH_CACHE[name]) {
    return PATCH_CACHE[name];
  }

  const rawData = WAD.getEntry(name);
  if (!rawData) {
    return null;
  }
  const f = new BinaryReader(rawData);

  const width = f.readShort();
  const height = f.readShort();
  const originX = f.readSignedShort();
  const originY = f.readSignedShort();
  const map = new Uint8Array(width * height * 2);
  const colorMap = new Uint8Array(width * height);
  const alphaMap = new Uint8Array(width * height);

  const columnOffsets = new Int32Array(width);
  for (let i = 0; i < width; i++) {
    columnOffsets[i] = f.readInt();
  }

  for (let x = 0; x < width; x++) {
    f.offset = columnOffsets[x];

    for (let idx = 0; idx < 8; idx++) {
      const start = f.readByte();
      if (start === 0xff) {
        break;
      }

      const count = f.readByte();
      f.offset++;

      const column = f.readBytes(count);
      f.offset++;

      for (let i = 0; i < count; i++) {
        const y = i + start;
        const p = y * width + x;

        colorMap[p] = map[p * 2] = column[i];
        alphaMap[p] = map[p * 2 + 1] = 255;
      }
    }
  }

  const patch: PatchData = {
    width,
    height,
    originX,
    originY,
    map,
    colorMap,
    alphaMap,
  };
  PATCH_CACHE[name] = patch;

  return patch;
}
