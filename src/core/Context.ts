import { Renderer } from '@/core/rendering/base/Renderer.ts';
import { GLRenderer } from '@/core/rendering/webgl/GLRenderer.ts';
import { WGPURenderer } from '@/core/rendering/webgpu/WGPURenderer.ts';

export type GraphicsDevice =
  | {
      fallback: false;
      device: GPUDevice;
      context: GPUCanvasContext;
    }
  | {
      fallback: true;
      device: null;
      context: WebGL2RenderingContext;
    };

let canvas: HTMLCanvasElement | null = null;
let renderer: Renderer | null = null;

function handleResize() {
  if (canvas && renderer) {
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    renderer.resize(canvas.width, canvas.height);
  }
}
window.addEventListener('resize', handleResize);
handleResize();

export function initCanvas() {
  canvas = document.querySelector<HTMLCanvasElement>('#app canvas')!;
}

export async function initGraphics() {
  if (!canvas) {
    return;
  }
  const { width, height } = canvas.getBoundingClientRect();
  canvas.width = width * window.devicePixelRatio;
  canvas.height = height * window.devicePixelRatio;

  let fallback = true;
  if (navigator.gpu) {
    const adapter = await navigator.gpu.requestAdapter();
    if (adapter) {
      const device = await adapter.requestDevice();
      if (device) {
        console.debug('[Context] Using WebGPU renderer');
        renderer = new WGPURenderer(canvas, device);
        fallback = false;
      }
    }
  }
  if (fallback) {
    console.debug('[Context] Using WebGL2 renderer');
    renderer = new GLRenderer(canvas);
  }
  handleResize();
  window.addEventListener('beforeunload', () => {
    renderer?.dispose();
  });
}

export function getRenderer() {
  return renderer!;
}

export function getCanvas() {
  return canvas!;
}
