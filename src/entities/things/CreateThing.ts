import { Vec2, Vec3 } from 'gl-matrix';
import { Map } from '@/entities/map/Map.ts';
import { PlayerThing } from '@/entities/things/PlayerThing.ts';
import { Thing } from '@/entities/things/Thing.ts';
import { ThingType } from '@/defs/ThingType.ts';
import { SCALE } from '@/defs/Units.ts';
import { RawThing } from '@/files/LevelData.ts';

export function createThing(def: RawThing, map: Map): Thing | null {
  let thing: Thing | null = null;

  switch (def.type as ThingType) {
    case ThingType.Player:
      thing = new PlayerThing(map);
      break;
  }

  if (thing) {
    thing.position = Vec3.fromValues(
      def.x * SCALE,
      map.getFloorHeight(Vec2.fromValues(def.x * SCALE, def.y * SCALE)),
      def.y * SCALE,
    );
  }

  return thing;
}
