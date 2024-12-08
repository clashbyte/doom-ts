import { Buffer, BufferContentType, BufferParameters } from '@/core/rendering/base/Buffer.ts';
import { WGPURenderer } from '@/core/rendering/webgpu/WGPURenderer.ts';

export class WGPUBuffer extends Buffer<WGPURenderer, GPUBuffer | null> {
  private static BUFFER_TYPES: { [name in BufferContentType]: GPUBufferUsageFlags } | null = null;

  public constructor(renderer: WGPURenderer, params: BufferParameters) {
    super(renderer, params);
    const device = renderer.device;

    if (!WGPUBuffer.BUFFER_TYPES) {
      WGPUBuffer.BUFFER_TYPES = {
        [BufferContentType.Vertex]: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        [BufferContentType.Index]: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
        [BufferContentType.Uniform]: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      };
    }

    this.localHandle = null;

    const handle = device.createBuffer({
      label: this.label,
      size: Math.ceil(this.data.byteLength / 4) * 4,
      usage: WGPUBuffer.BUFFER_TYPES[this.type],
    });
    if (handle) {
      if (this.data.byteLength % 4 !== 0) {
        const newData = new ArrayBuffer(Math.ceil(this.data.byteLength / 4) * 4);
        new Uint8Array(newData).set(
          new Uint8Array('buffer' in this.data ? (this.data.buffer as ArrayBuffer) : this.data),
        );
        device.queue.writeBuffer(handle, 0, newData, 0);
      } else {
        device.queue.writeBuffer(handle, 0, this.data, 0);
      }
      this.localHandle = handle;
    }
  }

  public dispose() {
    this.localHandle?.destroy();
    this.localHandle = null;
  }
}
