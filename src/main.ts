import { initCanvas, initGraphics } from '@/core/Context.ts';
import { Engine } from '@/engine/Engine.ts';
import { WAD } from '@/files/WAD.ts';
import { FlatTextures } from '@/graphics/FlatTextures.ts';
import { Palette } from '@/graphics/Palette.ts';
import { WallTextures } from '@/graphics/WallTextures.ts';

initCanvas();
Promise.all([
  initGraphics(), //
  WAD.init(),
]).then(() => {
  Palette.init();
  WallTextures.init();
  FlatTextures.init();

  // debugLevel('E1M1');

  // playground();

  const engine = new Engine();
  window.addEventListener('beforeunload', () => engine.dispose());
});
