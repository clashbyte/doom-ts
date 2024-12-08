import { Buffer, BufferParameters } from '@/core/rendering/base/Buffer.ts';
import { Renderer } from '@/core/rendering/base/Renderer.ts';
import { RenderTargetParameters } from '@/core/rendering/base/RenderTarget.ts';
import { TextureParameters } from '@/core/rendering/base/Texture.ts';
import { GLBuffer } from '@/core/rendering/webgl/GLBuffer.ts';
import { GLCamera } from '@/core/rendering/webgl/GLCamera.ts';
import { GLPalette } from '@/core/rendering/webgl/GLPalette.ts';
import { GLRenderTarget } from '@/core/rendering/webgl/GLRenderTarget.ts';
import { GLTexture } from '@/core/rendering/webgl/GLTexture.ts';

export class GLRenderer extends Renderer<GLPalette, GLCamera> {
  private readonly localContext: WebGL2RenderingContext;

  public get context() {
    return this.localContext;
  }

  public get maxViewportSize(): [number, number] {
    const size = this.localContext.getParameter(this.localContext.MAX_TEXTURE_SIZE);

    return [size, size];
  }

  public constructor(canvas: HTMLCanvasElement) {
    super(canvas);
    this.localContext = canvas.getContext('webgl2', {
      depth: true,
    })!;
    this.localPalette = this.createPalette();
    this.localCamera = this.createCamera();
  }

  public beginRender() {
    // Do nothing
  }

  public endRender() {
    this.localContext.flush();
  }

  public createTexture(params: TextureParameters): GLTexture {
    return new GLTexture(this, params);
  }

  public createBuffer(params: BufferParameters): Buffer {
    return new GLBuffer(this, params);
  }

  public createRenderTarget(params: RenderTargetParameters): GLRenderTarget {
    return new GLRenderTarget(this, params);
  }

  protected createPalette(): GLPalette {
    return new GLPalette(this);
  }

  protected createCamera(): GLCamera {
    return new GLCamera(this);
  }
}
