import { Vec3 } from 'gl-matrix';
import { Buffer, BufferContentType } from '@/core/rendering/base/Buffer.ts';
import { Renderer } from '@/core/rendering/base/Renderer.ts';
import { Texture } from '@/core/rendering/base/Texture.ts';

export interface TriangleMeshParameters {
  positions: Float32Array<ArrayBuffer>;
  normals: Float32Array<ArrayBuffer>;
  uv: Float32Array<ArrayBuffer>;
  index: Uint16Array<ArrayBuffer>;
  texture: Texture;
  lightness: number;
}

export abstract class TriangleMesh<
  TRenderer extends Renderer = Renderer,
  TTextureHandle extends Texture = Texture,
  TBufferHandle extends Buffer = Buffer,
> {
  protected renderer: TRenderer;

  public readonly positions: Float32Array<ArrayBuffer>;

  public readonly normals: Float32Array<ArrayBuffer>;

  public readonly uv: Float32Array<ArrayBuffer>;

  public readonly index: Uint16Array<ArrayBuffer>;

  public readonly texture: TTextureHandle;

  protected readonly positionBuffer: TBufferHandle;

  protected readonly normalBuffer: TBufferHandle;

  protected readonly uvBuffer: TBufferHandle;

  protected readonly indexBuffer: TBufferHandle;

  protected readonly indexCount: number;

  protected readonly localPosition: Vec3;

  protected localLightness: number;

  protected needUniformRebuild: boolean;

  public get position() {
    return this.localPosition;
  }

  public set position(value: Vec3) {
    if (!Vec3.equals(value, this.localPosition)) {
      Vec3.copy(this.localPosition, value);
      this.needUniformRebuild = true;
    }
  }

  protected constructor(renderer: TRenderer, params: TriangleMeshParameters) {
    const { positions, normals, uv, index, texture } = params;
    this.renderer = renderer;
    this.positions = positions;
    this.normals = normals;
    this.uv = uv;
    this.index = index;
    this.texture = texture as TTextureHandle;
    this.localPosition = Vec3.create();
    this.localLightness = params.lightness ?? 1;

    this.positionBuffer = renderer.createBuffer({
      data: positions,
      type: BufferContentType.Vertex,
    }) as TBufferHandle;
    this.normalBuffer = renderer.createBuffer({
      data: normals,
      type: BufferContentType.Vertex,
    }) as TBufferHandle;
    this.uvBuffer = renderer.createBuffer({
      data: uv,
      type: BufferContentType.Vertex,
    }) as TBufferHandle;
    this.indexBuffer = renderer.createBuffer({
      data: index,
      type: BufferContentType.Index,
    }) as TBufferHandle;
    this.indexCount = index.length;
    this.needUniformRebuild = true;
  }

  public abstract render();

  public dispose() {
    this.positionBuffer.dispose();
    this.normalBuffer.dispose();
    this.uvBuffer.dispose();
    this.indexBuffer.dispose();
  }
}
