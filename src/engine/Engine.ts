import { getRenderer } from '@/core/Context.ts';
import { RenderTarget } from '@/core/rendering/base/RenderTarget.ts';
import { Controls } from '@/engine/Controls.ts';
import { FrameHandler } from '@/helpers/FrameHandler.ts';
import { GameScreen } from '@/screens/GameScreen.ts';
import { Screen } from '@/screens/Screen.ts';

export class Engine {
  private readonly screen: Screen | null;

  private readonly frameHandler: FrameHandler;

  private readonly sceneBuffer: RenderTarget;

  private readonly uiBuffer: RenderTarget;

  public constructor() {
    Controls.bind();

    this.screen = new GameScreen('E1M1');

    this.sceneBuffer = getRenderer().createRenderTarget({
      clear: true,
      depth: true,
      label: '3D Scene Target',
    });
    this.uiBuffer = getRenderer().createRenderTarget({
      clear: false,
      depth: false,
      label: 'UI Target',
    });
    this.frameHandler = new FrameHandler(this.handleFrame.bind(this));
    this.frameHandler.start();
  }

  public dispose() {
    Controls.release();
    this.frameHandler.stop();
  }

  private handleFrame(delta: number) {
    const renderer = getRenderer();
    if (this.screen) {
      const event = this.screen.update(delta);

      renderer.beginRender();

      this.sceneBuffer.bind();
      this.screen.render();
      this.sceneBuffer.unbind(true);

      // this.uiBuffer.bind();
      // this.screen.renderUI();
      // this.uiBuffer.unbind(false);

      renderer.endRender();

      if (event) {
        // TODO
      }
    }
    Controls.reset();
  }
}
