import { Vec2, Vec3 } from 'gl-matrix';
import { Map } from '@/entities/map/Map.ts';
import { createThing } from '@/entities/things/CreateThing.ts';
import { Thing } from '@/entities/things/Thing.ts';
import { getRenderer } from '@/core/Context.ts';
import { parseLevelData } from '@/files/LevelData.ts';
import { Screen, ScreenEvent } from '@/screens/Screen.ts';

export class GameScreen extends Screen {
  private readonly map: Map;

  private readonly position: Vec3;

  private readonly rotation: Vec2;

  private readonly things: Thing[];

  public constructor(private readonly mapName: string) {
    super();
    this.map = new Map(mapName);
    this.things = [];

    this.position = Vec3.fromValues(0, 0, 0);
    this.rotation = Vec2.fromValues(0, 0);
    const things = parseLevelData(mapName).things;
    for (const t of things) {
      const thing = createThing(t, this.map);
      if (thing) {
        this.things.push(thing);
      }
    }
  }

  public update(delta: number): ScreenEvent {
    for (const thing of this.things) {
      thing.update(delta);
    }
    for (const thing of this.things) {
      thing.updateCollision(delta);
    }
    for (const thing of this.things) {
      thing.postUpdate(delta);
    }

    return null;
  }

  public render(): void {
    this.map.render(getRenderer().camera.position);
    for (const thing of this.things) {
      thing.render();
    }
  }
}
