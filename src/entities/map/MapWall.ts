import { Vec2 } from 'gl-matrix';
import { MapLinkableRef } from '@/entities/map/MapLinkableRef.ts';
import { MapSector } from '@/entities/map/MapSector.ts';
import { MapVertex } from '@/entities/map/MapVertex.ts';
import { MapWallSide } from '@/entities/map/MapWallSide.ts';
import { RawLineDef } from '@/files/LevelData.ts';

export enum MapWallFlags {
  Blocking = 1 << 0,
  BlockingMonsters = 1 << 1,
  TwoSided = 1 << 2,
  DontPegTop = 1 << 3,
  DontPegBottom = 1 << 4,
  Secret = 1 << 5,
  BlockSound = 1 << 6,
  DontDrawOnMap = 1 << 7,
  AlwaysDrawOnMap = 1 << 8,
}

export class MapWall implements MapLinkableRef {
  private readonly def: RawLineDef;

  private localID: number;

  private localVertex1: MapVertex | null;

  private localVertex2: MapVertex | null;

  private localFrontSide: MapWallSide | null;

  private localBackSide: MapWallSide | null;

  private readonly localPosition1: Vec2;

  private readonly localPosition2: Vec2;

  public get ID() {
    return this.localID;
  }

  public get vertex1() {
    return this.localVertex1!;
  }

  public get vertex2() {
    return this.localVertex2!;
  }

  public get position1() {
    return this.localPosition1;
  }

  public get position2() {
    return this.localPosition2;
  }

  public get frontSide() {
    return this.localFrontSide!;
  }

  public get backSide() {
    return this.localBackSide!;
  }

  public get flags() {
    return this.def.flags;
  }

  public get tag() {
    return this.def.tag;
  }

  public get special() {
    return this.def.special;
  }

  public constructor(info: RawLineDef) {
    this.def = info;
    this.localVertex1 = null;
    this.localVertex2 = null;
    this.localFrontSide = null;
    this.localBackSide = null;
    this.localID = 0;
    this.localPosition1 = Vec2.create();
    this.localPosition2 = Vec2.create();
  }

  public linkReferences(
    verts: MapVertex[],
    lineDefs: MapWall[],
    sideDefs: MapWallSide[],
    sectors: MapSector[],
  ) {
    this.localID = lineDefs.indexOf(this);
    this.localVertex1 = verts[this.def.v1];
    this.localVertex2 = verts[this.def.v2];
    this.localFrontSide = this.def.sideDef1 !== -1 ? sideDefs[this.def.sideDef1] : null;
    this.localBackSide = this.def.sideDef2 !== -1 ? sideDefs[this.def.sideDef2] : null;

    Vec2.set(this.localPosition1, this.localVertex1.x, this.localVertex1.y);
    Vec2.set(this.localPosition2, this.localVertex2.x, this.localVertex2.y);
  }
}
