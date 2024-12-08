import { Vec2 } from 'gl-matrix';
import { MapLinkableRef } from '@/entities/map/MapLinkableRef.ts';
import { MapSector } from '@/entities/map/MapSector.ts';
import { MapVertex } from '@/entities/map/MapVertex.ts';
import { MapWall } from '@/entities/map/MapWall.ts';
import { RawSideDef } from '@/files/LevelData.ts';

export class MapWallSide implements MapLinkableRef {
  private readonly def: RawSideDef;

  private localID: number;

  private localSector: MapSector | null;

  public get ID() {
    return this.localID;
  }

  public get sector() {
    return this.localSector!;
  }

  public get texture() {
    return this.def.texture;
  }

  public get upperTexture() {
    return this.def.upperTexture;
  }

  public get lowerTexture() {
    return this.def.lowerTexture;
  }

  public get textureOffset() {
    return Vec2.fromValues(this.def.x, this.def.y);
  }

  public constructor(info: RawSideDef) {
    this.def = info;
    this.localID = 0;
    this.localSector = null;
  }

  public linkReferences(
    verts: MapVertex[],
    lineDefs: MapWall[],
    sideDefs: MapWallSide[],
    sectors: MapSector[],
  ) {
    this.localID = sideDefs.indexOf(this);
    this.localSector = sectors[this.def.sector];
  }
}
