import { Renderer } from '@/core/rendering/base/Renderer.ts';

export interface RenderTargetParameters {
  depth: boolean;
  clear?: boolean;
  label?: string;
}

export abstract class RenderTarget<
  TRenderer extends Renderer = Renderer,
  THandle extends any = any,
> {
  protected renderer: TRenderer;

  protected localHandle: THandle;

  protected readonly label: string | undefined;

  public readonly depth: boolean;

  public readonly clear: boolean;

  protected constructor(renderer: TRenderer, params: RenderTargetParameters) {
    const { depth, clear = true, label } = params;

    this.renderer = renderer;
    this.depth = depth;
    this.clear = clear;
    this.label = label;

    this.renderer.addEventListener('resize', ({ width, height }) => {
      this.resize(width, height);
    });
  }

  public abstract bind();

  public abstract unbind(needBlit?: boolean);

  public abstract resize(width: number, height: number);

  public abstract blit();
}
