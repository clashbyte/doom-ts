import { Renderer } from '@/core/rendering/base/Renderer.ts';

export enum BufferContentType {
  Vertex,
  Index,
  Uniform,
}

export interface BufferParameters {
  data: ArrayBuffer;
  type?: BufferContentType;
  label?: string;
}

export abstract class Buffer<TRenderer extends Renderer = Renderer, THandle extends any = any> {
  protected renderer: TRenderer;

  protected localHandle: THandle | null;

  protected label: string | undefined;

  public readonly type: BufferContentType;

  public readonly data: ArrayBuffer;

  public get handle(): THandle | null {
    return this.localHandle;
  }

  protected constructor(renderer: TRenderer, params: BufferParameters) {
    const { data, type = BufferContentType.Vertex, label } = params;

    this.renderer = renderer;
    this.data = data;
    this.type = type;
    this.label = label;
    this.localHandle = null;
  }

  public abstract dispose(): void;
}
