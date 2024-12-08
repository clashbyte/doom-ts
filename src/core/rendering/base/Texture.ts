import { Renderer } from '@/core/rendering/base/Renderer.ts';

export enum TextureContentType {
  Palette,
  PaletteWithAlpha,
  RGB,
  Lookup,
}

export interface TextureParameters {
  data: Uint8Array<ArrayBuffer>;
  width: number;
  height: number;
  type: TextureContentType;
  label?: string;
}

export abstract class Texture<
  TRenderer extends Renderer = Renderer,
  THandle extends any = any,
  TSampler extends any = any,
> {
  protected renderer: TRenderer;

  protected localHandle: THandle | null;

  protected localSampler: TSampler | null;

  protected label: string | undefined;

  public readonly width: number;

  public readonly height: number;

  public readonly type: TextureContentType;

  public readonly data: Uint8Array<ArrayBuffer>;

  public get handle(): THandle {
    return this.localHandle!;
  }

  public get sampler(): TSampler {
    return this.localSampler!;
  }

  protected constructor(renderer: TRenderer, params: TextureParameters) {
    const {
      data, //
      width,
      height,
      type,
      label,
    } = params;

    this.renderer = renderer;
    this.data = data;
    this.width = width;
    this.height = height;
    this.type = type;
    this.label = label;
    this.localHandle = null;
    this.localSampler = null;
  }

  public abstract dispose();
}
