import { Mat3, Mat4, Vec2, Vec3, Vec4 } from 'gl-matrix';

export enum UniformBufferEntry {
  Float,
  Vector2,
  Vector3,
  Vector4,
  Matrix3,
  Matrix4,
}

const UNIT_SIZE: number[] = [
  4, //
  8,
  12,
  16,
  36,
  64,
];

const UNIT_ALIGN: number[] = [
  4, //
  8,
  16,
  16,
  16,
  16,
];

const UNIT_PADDING: number[] = [
  0, //
  0,
  8,
  0,
  12,
  0,
];

export class UniformBufferHelper {
  private readonly localBuffer: ArrayBuffer;

  private readonly localSize;

  private readonly offsets: number[];

  private readonly dataView: DataView<ArrayBuffer>;

  public get buffer() {
    return this.localBuffer;
  }

  public get size() {
    return this.localSize;
  }

  public constructor(
    private readonly defs: UniformBufferEntry[],
    private readonly padded: boolean = false,
  ) {
    this.offsets = [];

    let offset = 0;
    for (let i = 0; i < defs.length; i++) {
      const t = defs[i];
      if (padded) {
        offset = Math.ceil(offset / UNIT_ALIGN[t]) * UNIT_ALIGN[t];
        this.offsets.push(offset);
        offset += UNIT_SIZE[t] + UNIT_PADDING[t];
      } else {
        this.offsets.push(offset);
        offset += UNIT_SIZE[t];
      }
    }

    if (padded && offset % 16 !== 0) {
      offset = Math.ceil(offset / 16) * 16;
    }

    this.localSize = offset;
    this.localBuffer = new ArrayBuffer(this.localSize);
    this.dataView = new DataView(this.localBuffer);
  }

  public setFloat(index: number, value: number) {
    this.dataView.setFloat32(this.offsets[index], value, true);
  }

  public setVec2(index: number, value: Vec2) {
    if (value.length === 2) {
      this.setFloatArray(index, value);
    }
  }

  public setVec3(index: number, value: Vec3) {
    if (value.length === 3) {
      this.setFloatArray(index, value);
    }
  }

  public setVec4(index: number, value: Vec4) {
    if (value.length === 4) {
      this.setFloatArray(index, value);
    }
  }

  public setMatrix3(index: number, value: Mat3) {
    if (value.length === 9) {
      if (this.padded) {
        this.setFloatArray(index, [
          value[0],
          value[1],
          value[2],
          0, // Padding
          value[3],
          value[4],
          value[5],
          0, // Padding
          value[6],
          value[7],
          value[8],
        ]);
      } else {
        this.setFloatArray(index, value);
      }
    }
  }

  public setMatrix4(index: number, value: Mat4) {
    if (value.length === 16) {
      this.setFloatArray(index, value);
    }
  }

  private setFloatArray(index: number, value: ArrayLike<number>) {
    for (let i = 0; i < value.length; i++) {
      this.dataView.setFloat32(this.offsets[index] + i * 4, value[i], true);
    }
  }
}
