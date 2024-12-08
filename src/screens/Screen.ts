export enum ScreenEventType {
  ChangeScreen,
}

export type ScreenEvent = {
  type: ScreenEventType.ChangeScreen;
  screen: Screen;
} | null;

export abstract class Screen {
  protected constructor() {
    //
  }

  public abstract update(delta: number): ScreenEvent;

  public abstract render(): void;

  public renderUI() {}

  public dispose() {}
}
