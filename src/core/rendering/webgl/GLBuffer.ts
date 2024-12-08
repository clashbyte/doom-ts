import { Buffer, BufferContentType, BufferParameters } from '@/core/rendering/base/Buffer.ts';
import { GLRenderer } from '@/core/rendering/webgl/GLRenderer.ts';

export class GLBuffer extends Buffer<GLRenderer, WebGLBuffer | null> {
  private static BUFFER_TYPES: { [name in BufferContentType]: GLenum } | null = null;

  public constructor(renderer: GLRenderer, params: BufferParameters) {
    super(renderer, params);
    const GL = renderer.context;

    if (!GLBuffer.BUFFER_TYPES) {
      GLBuffer.BUFFER_TYPES = {
        [BufferContentType.Vertex]: GL.ARRAY_BUFFER,
        [BufferContentType.Index]: GL.ELEMENT_ARRAY_BUFFER,
        [BufferContentType.Uniform]: GL.UNIFORM_BUFFER,
      };
    }

    this.localHandle = null;

    const handle = GL.createBuffer();
    if (handle) {
      const target = GLBuffer.BUFFER_TYPES[this.type];
      GL.bindBuffer(target, handle);
      GL.bufferData(target, this.data, GL.STATIC_DRAW);
      GL.bindBuffer(target, null);
      this.localHandle = handle;
    }
  }

  public dispose() {
    const GL = this.renderer.context;
    if (this.localHandle) {
      GL.deleteBuffer(this.localHandle);
      this.localHandle = null;
    }
  }
}
