import { getRenderer } from '@/core/Context.ts';
import { BufferContentType } from '@/core/rendering/base/Buffer.ts';
import { WGPURenderer } from '@/core/rendering/webgpu/WGPURenderer.ts';
import { WGPURenderTarget } from '@/core/rendering/webgpu/WGPURenderTarget.ts';
import { WGPUTexture } from '@/core/rendering/webgpu/WGPUTexture.ts';
import { WallTextures } from '@/graphics/WallTextures.ts';
import Shader from '@/shaders/webgpu/test.wgsl?raw';

export function playground() {
  const renderer = getRenderer() as WGPURenderer;
  if ('device' in renderer && renderer.device instanceof GPUDevice) {
    const device = renderer.device as GPUDevice;

    const module = device.createShaderModule({
      label: 'our hardcoded red triangle shaders',
      code: Shader,
    });

    const buffer = renderer.createBuffer({
      data: new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      type: BufferContentType.Vertex,
    }).handle;
    const indexBuffer = renderer.createBuffer({
      data: new Uint16Array([0, 1, 2, 1, 3, 2]),
      type: BufferContentType.Index,
    }).handle;

    const renderTarget = renderer.createRenderTarget({
      depth: true,
      clear: true,
      label: '3D render target',
    });
    renderTarget.resize(renderer.context.canvas.width, renderer.context.canvas.height);

    const camera = renderer.camera;
    camera.position = [0, 0, 10];

    const bindGroupLayout = device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.FRAGMENT,
          texture: {},
        },
        {
          binding: 1,
          visibility: GPUShaderStage.FRAGMENT,
          sampler: {},
        },
      ],
    });
    const pipelineLayout = device.createPipelineLayout({
      bindGroupLayouts: [
        bindGroupLayout, //
        camera.bindGroupLayout,
      ],
    });

    const tex = WallTextures.getTexture('WOOD1')! as WGPUTexture;
    const bindGroup = device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: tex.view!,
        },
        {
          binding: 1,
          resource: tex.sampler!,
        },
      ],
    });

    const pipeline = device.createRenderPipeline({
      label: 'our hardcoded red triangle pipeline',
      layout: pipelineLayout,
      vertex: {
        module,
        buffers: [
          {
            arrayStride: 2 * 4, // 2 floats, 4 bytes each
            attributes: [
              { shaderLocation: 0, offset: 0, format: 'float32x2' }, // position
            ],
          },
        ],
      },
      fragment: {
        module,
        targets: [{ format: WGPURenderTarget.OUTPUT_FORMAT }],
      },
      depthStencil: {
        format: 'depth24plus',
        depthCompare: 'less-equal',
        depthWriteEnabled: true,
      },
    });

    const frame = () => {
      requestAnimationFrame(frame);

      const t = performance.now() * 0.001;
      renderer.camera.position = [Math.sin(t) * 5, 0, Math.cos(t) * 5];
      renderer.camera.rotation = [0, t, 0];

      renderer.beginRender();
      renderTarget.bind();

      const pass = renderer.renderPass;
      if (pass) {
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.setBindGroup(1, camera.bindGroup);
        pass.setVertexBuffer(0, buffer);
        pass.setIndexBuffer(indexBuffer, 'uint16');
        pass.drawIndexed(6);
      }

      renderTarget.unbind(true);
      renderer.endRender();
    };
    frame();
  }
}
