import { Vec2 } from 'gl-matrix';
import { Buffer, BufferParameters } from '@/core/rendering/base/Buffer.ts';
import { Camera } from '@/core/rendering/base/Camera.ts';
import { EventSource } from '@/core/rendering/base/EventSource.ts';
import { Palette } from '@/core/rendering/base/Palette.ts';
import { RenderTarget, RenderTargetParameters } from '@/core/rendering/base/RenderTarget.ts';
import { Texture, TextureParameters } from '@/core/rendering/base/Texture.ts';
import { TriangleMesh, TriangleMeshParameters } from '@/core/rendering/base/TriangleMesh.ts';

export abstract class Renderer<
  TPalette extends Palette = Palette,
  TCamera extends Camera = Camera,
> extends EventSource<{
  resize: { width: number; height: number };
}> {
  protected localPalette: TPalette;

  protected localCamera: TCamera;

  protected canvas: HTMLCanvasElement;

  protected localSize: Vec2;

  public get size() {
    return Vec2.clone(this.localSize);
  }

  public abstract get maxViewportSize(): [number, number];

  public get palette() {
    return this.localPalette;
  }

  public get camera() {
    return this.localCamera;
  }

  protected constructor(canvas: HTMLCanvasElement) {
    super();
    this.canvas = canvas;
    this.localSize = Vec2.fromValues(0, 0);
  }

  public resize(width: number, height: number) {
    Vec2.set(this.localSize, width, height);
    this.camera.aspect = width / height;
    this.triggerEvent('resize', {
      width,
      height,
    });
  }

  public abstract createTexture(params: TextureParameters): Texture;

  public abstract createBuffer(params: BufferParameters): Buffer;

  public abstract createRenderTarget(params: RenderTargetParameters): RenderTarget;

  public abstract createTriangleMesh(params: TriangleMeshParameters): TriangleMesh;

  public dispose() {
    //
  }

  public beginRender() {
    this.camera.updateMatrices();
  }

  public abstract endRender(): void;

  protected abstract createPalette(): TPalette;

  protected abstract createCamera(): TCamera;
}
