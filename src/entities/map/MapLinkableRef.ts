import { MapSector } from '@/entities/map/MapSector.ts';
import { MapVertex } from '@/entities/map/MapVertex.ts';
import { MapWall } from '@/entities/map/MapWall.ts';
import { MapWallSide } from '@/entities/map/MapWallSide.ts';

export interface MapLinkableRef {
  linkReferences: (
    verts: MapVertex[],
    lineDefs: MapWall[],
    sideDefs: MapWallSide[],
    sectors: MapSector[],
  ) => void;
}
