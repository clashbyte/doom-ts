import { MapSector } from '@/entities/map/MapSector.ts';
import { MapWall } from '@/entities/map/MapWall.ts';
import { MapWallSide } from '@/entities/map/MapWallSide.ts';
import { SCALE } from '@/defs/Units.ts';
import { RawVertex } from '@/files/LevelData.ts';

export class MapVertex {
  public readonly x: number;

  public readonly y: number;

  public constructor(info: RawVertex) {
    this.x = info.x * SCALE;
    this.y = info.y * SCALE;
  }

  public linkReferences(
    verts: MapVertex[],
    lineDefs: MapWall[],
    sideDefs: MapWallSide[],
    sectors: MapSector[],
  ) {}
}
