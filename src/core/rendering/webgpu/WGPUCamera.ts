import { Mat4 } from 'gl-matrix';
import { Camera } from '@/core/rendering/base/Camera.ts';
import { WGPURenderer } from '@/core/rendering/webgpu/WGPURenderer.ts';
import { UniformBufferEntry, UniformBufferHelper } from '@/helpers/UniformBufferHelper.ts';

export class WGPUCamera extends Camera<WGPURenderer> {
  protected localBindGroupLayout: GPUBindGroupLayout;

  protected localBindGroup: GPUBindGroup;

  protected localUniformBuffer: GPUBuffer;

  protected uniformHelper: UniformBufferHelper;

  public get bindGroupLayout() {
    return this.localBindGroupLayout;
  }

  public get bindGroup() {
    this.rebuildMatrices();
    this.rebuildProjectionMatrix();

    return this.localBindGroup;
  }

  public constructor(renderer: WGPURenderer) {
    super(renderer);
    const device = renderer.device;

    this.uniformHelper = new UniformBufferHelper(
      [
        UniformBufferEntry.Matrix4,
        UniformBufferEntry.Matrix4,
        UniformBufferEntry.Matrix3,
        UniformBufferEntry.Vector3,
      ],
      true,
    );

    this.localUniformBuffer = device.createBuffer({
      size: this.uniformHelper.size,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.localBindGroupLayout = device.createBindGroupLayout({
      label: 'Camera Layout',
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.VERTEX,
          buffer: {},
        },
      ],
    });

    this.localBindGroup = device.createBindGroup({
      label: 'Camera Bind Group',
      layout: this.localBindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: {
            buffer: this.localUniformBuffer,
          },
        },
      ],
    });

    this.rebuildUniforms();
  }

  protected makeProjectionMatrix(target: Mat4, aspect: number, near: number, far: number): void {
    Mat4.perspectiveZO(target, 1, aspect, near, far);
  }

  protected rebuildMatrices(): boolean {
    const rebuilt = super.rebuildMatrices();
    if (rebuilt) {
      this.rebuildUniforms();
    }

    return rebuilt;
  }

  protected rebuildProjectionMatrix(): boolean {
    const rebuilt = super.rebuildProjectionMatrix();
    if (rebuilt) {
      this.rebuildUniforms();
    }

    return rebuilt;
  }

  private rebuildUniforms() {
    const device = this.renderer.device;
    const position = this.localPosition;

    this.uniformHelper.setMatrix4(0, this.viewMatrix);
    this.uniformHelper.setMatrix4(1, this.projMatrix);
    this.uniformHelper.setMatrix3(2, this.spriteMatrix);
    this.uniformHelper.setVec3(3, position);

    device.queue.writeBuffer(this.localUniformBuffer, 0, this.uniformHelper.buffer);
  }
}
