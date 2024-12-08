import { RenderTarget, RenderTargetParameters } from '@/core/rendering/base/RenderTarget.ts';
import { GLRenderer } from '@/core/rendering/webgl/GLRenderer.ts';

export class GLRenderTarget extends RenderTarget<GLRenderer, WebGLFramebuffer | null> {
  public constructor(renderer: GLRenderer, params: RenderTargetParameters) {
    super(renderer, params);
  }

  public bind() {
    //
  }

  public unbind(needBlit: boolean | undefined) {
    const GL = this.renderer.context;
    GL.bindFramebuffer(GL.FRAMEBUFFER, null);
  }

  public blit() {
    //
  }

  public resize(width: number, height: number) {
    //
  }
}
