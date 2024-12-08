import { Texture, TextureContentType, TextureParameters } from '@/core/rendering/base/Texture.ts';
import { GLRenderer } from '@/core/rendering/webgl/GLRenderer.ts';

export class GLTexture extends Texture<GLRenderer, WebGLTexture | null, null> {
  private static TEXTURE_FORMATS: { [key in TextureContentType]: GLenum } | null = null;

  public constructor(renderer: GLRenderer, params: TextureParameters) {
    super(renderer, params);

    const GL = this.renderer.context;

    if (!GLTexture.TEXTURE_FORMATS) {
      GLTexture.TEXTURE_FORMATS = {
        [TextureContentType.Palette]: GL.RED,
        [TextureContentType.PaletteWithAlpha]: GL.RG,
        [TextureContentType.RGB]: GL.RGB,
        [TextureContentType.Lookup]: GL.RED,
      };
    }

    this.localHandle = GL.createTexture();
    if (this.localHandle) {
      const format = GLTexture.TEXTURE_FORMATS[this.type];
      GL.bindTexture(GL.TEXTURE_2D, this.localHandle);
      GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MIN_FILTER, GL.NEAREST);
      GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MAG_FILTER, GL.NEAREST);
      GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_S, GL.REPEAT);
      GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_T, GL.REPEAT);
      GL.texImage2D(
        GL.TEXTURE_2D,
        0,
        format,
        this.width,
        this.height,
        0,
        format,
        GL.UNSIGNED_BYTE,
        this.data,
      );
      GL.bindTexture(GL.TEXTURE_2D, null);
    }
  }

  public dispose() {
    if (this.localHandle) {
      this.renderer.context.deleteTexture(this.localHandle);
      this.localHandle = null;
    }
  }
}
