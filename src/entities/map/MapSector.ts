import * as earcut from 'earcut';
import { Vec2, Vec3 } from 'gl-matrix';
import { MapVertex } from '@/entities/map/MapVertex.ts';
import { MapWall, MapWallFlags } from '@/entities/map/MapWall.ts';
import { MapWallSide } from '@/entities/map/MapWallSide.ts';
import { getRenderer } from '@/core/Context.ts';
import { AABB } from '@/core/math/AABB.ts';
import { pointInsidePolygon } from '@/core/math/PolygonMath.ts';
import { Texture } from '@/core/rendering/base/Texture.ts';
import { TriangleMesh } from '@/core/rendering/base/TriangleMesh.ts';
import { SCALE } from '@/defs/Units.ts';
import { RawSector } from '@/files/LevelData.ts';
import { FlatTextures } from '@/graphics/FlatTextures.ts';
import { WallTextures } from '@/graphics/WallTextures.ts';

interface SectorPlaneTask {
  texture: string;
  v1: MapVertex;
  v2: MapVertex;
  top: number;
  bottom: number;
  texTop: number;
  texBottom: number;
  offset: Vec2;
}

export class MapSector {
  private readonly def: RawSector;

  private localID: number;

  private readonly levelVertexList: MapVertex[];

  private loopCache: {
    parent: number | null;
    points: Vec2[];
  }[];

  private sectorWalls: MapWall[];

  protected needRebuild: boolean;

  protected meshes: TriangleMesh[];

  protected localFloorHeight: number;

  protected localCeilHeight: number;

  protected localLightness: number;

  protected floorMesh: TriangleMesh | null;

  protected ceilMesh: TriangleMesh | null;

  protected localAABB: AABB;

  public get ID() {
    return this.localID;
  }

  public get AABB() {
    return this.localAABB;
  }

  public get floorHeight() {
    return this.localFloorHeight;
  }

  public get ceilHeight() {
    return this.localCeilHeight;
  }

  public get walls() {
    return this.sectorWalls;
  }

  public constructor(info: RawSector) {
    this.def = info;
    this.localFloorHeight = info.floor * SCALE;
    this.localCeilHeight = info.ceiling * SCALE;
    this.sectorWalls = [];
    this.levelVertexList = [];
    this.loopCache = [];
    this.localLightness = info.lightLevel / 255;

    this.meshes = [];
    this.floorMesh = null;
    this.ceilMesh = null;
    this.needRebuild = true;

    this.localAABB = new AABB(Vec2.create(), Vec2.create());
  }

  public linkReferences(
    verts: MapVertex[],
    lineDefs: MapWall[],
    sideDefs: MapWallSide[],
    sectors: MapSector[],
  ) {
    this.levelVertexList.length = 0;
    this.levelVertexList.push(...verts);
    this.sectorWalls = this.def.lineDefs.map((ld) => lineDefs[ld]);
    this.localID = sectors.indexOf(this);

    this.loopCache = this.def.vertexLoops.map((lp) => ({
      parent: lp.parent,
      points: lp.indices.map((idx) => Vec2.fromValues(verts[idx].x, verts[idx].y)),
    }));

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const grp of this.def.vertexLoops) {
      if (grp.parent === null) {
        for (const idx of grp.indices) {
          const p = verts[idx];
          minX = Math.min(minX, p.x);
          minY = Math.min(minY, p.y);
          maxX = Math.max(maxX, p.x);
          maxY = Math.max(maxY, p.y);
        }
      }
    }

    this.localAABB = new AABB(
      Vec2.fromValues((maxX + minX) / 2, (maxY + minY) / 2),
      Vec2.fromValues((maxX - minX) / 2, (maxY - minY) / 2),
    );
  }

  public render() {
    if (this.needRebuild) {
      try {
        this.rebuild();
        this.buildFlatMeshes();
      } catch (ex) {
        console.warn(`Error at sector ${this.localID}`, ex);
      }

      this.needRebuild = false;
    }

    for (const mesh of this.meshes) {
      mesh.render(0);
    }
    this.floorMesh?.render(0);
    this.ceilMesh?.render(0);
  }

  public containsPoint(point: Vec2) {
    if (this.localAABB.containsPoint(point)) {
      for (let i = 0; i < this.loopCache.length; i++) {
        const loop = this.loopCache[i];
        if (loop.parent === null) {
          let inside = pointInsidePolygon(point, loop.points);
          if (inside) {
            for (const innerLoop of this.loopCache) {
              if (innerLoop.parent === i) {
                inside = !pointInsidePolygon(point, innerLoop.points);
                if (!inside) {
                  break;
                }
              }
            }

            return inside;
          }
        }
      }
    }

    return false;
  }

  private rebuild() {
    for (const mesh of this.meshes) {
      mesh.dispose();
    }
    this.meshes.length = 0;

    // Check for flat sector
    if (this.localFloorHeight >= this.localCeilHeight) {
      return;
    }

    // Build wall tasks
    const taskList = this.generateWallTasks();
    const tasks: { [texture: string]: SectorPlaneTask[] } = {};
    for (const task of taskList) {
      if (!(task.texture in tasks)) {
        tasks[task.texture] = [];
      }
      tasks[task.texture].push(task);
    }

    // Build wall meshes
    for (const name in tasks) {
      this.meshes.push(this.triangulateTaskList(WallTextures.getTexture(name)!, tasks[name]));
    }
  }

  private generateWallTasks(): SectorPlaneTask[] {
    const tasks: SectorPlaneTask[] = [];
    for (const wall of this.sectorWalls) {
      if ((wall.flags & MapWallFlags.TwoSided) > 0) {
        // That's a two-sided linedef

        const side = wall.frontSide.sector === this ? wall.frontSide : wall.backSide;
        const otherSector = (side === wall.frontSide ? wall.backSide : wall.frontSide).sector;
        const [v1, v2] =
          side === wall.frontSide ? [wall.vertex1, wall.vertex2] : [wall.vertex2, wall.vertex1];

        if (otherSector) {
          if (side.texture) {
            // Main center texture
            tasks.push({
              v1,
              v2,
              offset: side.textureOffset,
              top: Math.min(otherSector.localCeilHeight, this.localCeilHeight),
              bottom: Math.max(otherSector.localFloorHeight, this.localFloorHeight),
              texture: side.texture!,
              texTop: 0,
              texBottom:
                Math.min(otherSector.localCeilHeight, this.localCeilHeight) -
                Math.max(otherSector.localFloorHeight, this.localFloorHeight),
            });
          }

          if (side.upperTexture && this.localCeilHeight > otherSector.localCeilHeight) {
            // Upper gap texture

            // If "UNPEGTOP" flag exists, calculate texture from the highest ceiling
            let texTop = -(this.localCeilHeight - otherSector.localCeilHeight);
            let texBottom = 0;
            if (wall.flags & MapWallFlags.DontPegTop) {
              texBottom = -texTop;
              texTop = 0;
            }

            tasks.push({
              v1,
              v2,
              offset: side.textureOffset,
              top: this.localCeilHeight,
              bottom: otherSector.localCeilHeight,
              texture: side.upperTexture!,
              texTop,
              texBottom,
            });
          }

          if (side.lowerTexture && this.localFloorHeight < otherSector.localFloorHeight) {
            let texTop = 0;
            let texBottom = otherSector.localFloorHeight - this.localFloorHeight;
            if (wall.flags & MapWallFlags.DontPegBottom) {
              const maxCeil = Math.max(this.localCeilHeight, otherSector.localCeilHeight);
              texTop = maxCeil - otherSector.localFloorHeight;
              texBottom = maxCeil - this.localFloorHeight;
            }

            // Lower gap texture
            tasks.push({
              v1,
              v2,
              offset: side.textureOffset,
              top: otherSector.localFloorHeight,
              bottom: this.localFloorHeight,
              texture: side.lowerTexture!,
              texTop,
              texBottom,
            });
          }
        }
      } else {
        // That's a solid wall
        const start = this.localCeilHeight;
        const end = this.localFloorHeight;
        const texture = wall.frontSide.texture
          ? WallTextures.getTexture(wall.frontSide.texture)
          : null;

        let texTop = 0;
        let texBottom = start - end;
        if (wall.flags & MapWallFlags.DontPegBottom) {
          texTop = -texBottom;
          texBottom = 0;
        }

        if (texture) {
          tasks.push({
            v1: wall.vertex1,
            v2: wall.vertex2,
            offset: wall.frontSide.textureOffset,
            top: start,
            bottom: end,
            texture: wall.frontSide.texture!,
            texTop,
            texBottom,
          });
        } else {
          console.warn(`Unknown texture at sector ${this.localID}: ${wall.frontSide.texture}`);
        }
      }
    }

    return tasks;
  }

  private triangulateTaskList(texture: Texture, list: SectorPlaneTask[]): TriangleMesh {
    const verts: number[] = [];
    const uvs: number[] = [];
    const normals: number[] = [];
    const indices: number[] = [];
    let vertPos = 0;

    for (const en of list) {
      const v1 = Vec2.fromValues(en.v1.x, en.v1.y);
      const v2 = Vec2.fromValues(en.v2.x, en.v2.y);

      const tw = Math.floor(Math.hypot(v2.x - v1.x, v2.y - v1.y) / SCALE) / texture.width;
      const tsh = Math.floor(en.texTop / SCALE) / texture.height;
      const teh = Math.floor(en.texBottom / SCALE) / texture.height;
      const tx = en.offset.x / texture.width;
      const ty = en.offset.y / texture.height;

      verts.push(
        ...[
          [v1.x, en.top, v1.y],
          [v2.x, en.top, v2.y],
          [v1.x, en.bottom, v1.y],
          [v2.x, en.bottom, v2.y],
        ].flat(),
      );
      normals.push(
        ...[
          [0, 0, 1], //
          [0, 0, 1],
          [0, 0, 1],
          [0, 0, 1],
        ].flat(),
      );
      uvs.push(
        ...[
          [tx, ty + tsh], //
          [tx + tw, ty + tsh], //
          [tx, ty + teh], //
          [tx + tw, ty + teh], //
        ].flat(),
      );
      indices.push(
        vertPos, //
        vertPos + 1,
        vertPos + 2,
        vertPos + 1,
        vertPos + 3,
        vertPos + 2,
      );
      vertPos += 4;
    }

    return getRenderer().createTriangleMesh({
      texture,
      positions: new Float32Array(verts),
      normals: new Float32Array(normals),
      uv: new Float32Array(uvs),
      index: new Uint16Array(indices),
      lightness: this.localLightness,
    });
  }

  private buildFlatMeshes() {
    const verts: number[] = [];
    const indices: number[] = [];

    for (let loopIndex = 0; loopIndex < this.def.vertexLoops.length; loopIndex++) {
      const loop = this.def.vertexLoops[loopIndex];
      if (loop.parent === null) {
        const indexOffset = verts.length / 3;

        const earcutVerts: number[] = [];
        const earcutHoles: number[] = [];
        for (const v of loop.indices) {
          earcutVerts.push(this.levelVertexList[v].x, this.levelVertexList[v].y);
          verts.push(this.levelVertexList[v].x, 0, this.levelVertexList[v].y);
        }
        for (
          let innerLoopIndex = 0;
          innerLoopIndex < this.def.vertexLoops.length;
          innerLoopIndex++
        ) {
          const innerLoop = this.def.vertexLoops[innerLoopIndex];
          if (innerLoop.parent === loopIndex) {
            earcutHoles.push(earcutVerts.length / 2);
            for (const v of innerLoop.indices) {
              earcutVerts.push(this.levelVertexList[v].x, this.levelVertexList[v].y);
              verts.push(this.levelVertexList[v].x, 0, this.levelVertexList[v].y);
            }
          }
        }

        const indexList = earcut.default(earcutVerts, earcutHoles, 2);
        for (const idx of indexList) {
          indices.push(idx + indexOffset);
        }
      }
    }

    const floorNormals: number[] = [];
    const ceilNormals: number[] = [];
    const floorUV: number[] = [];
    const ceilUV: number[] = [];

    for (let i = 0; i < verts.length / 3; i++) {
      floorNormals.push(0, 1, 0);
      ceilNormals.push(0, -1, 0);
    }

    for (let i = 0; i < verts.length / 3; i++) {
      const u = verts[i * 3] / SCALE / 64;
      const v = verts[i * 3 + 2] / SCALE / 64;

      floorUV.push(u, v);
      ceilUV.push(u, v);
    }

    const ceilIndices: number[] = [];
    for (let i = 0; i < indices.length; i += 3) {
      ceilIndices.push(indices[i], indices[i + 2], indices[i + 1]);
    }

    this.floorMesh = getRenderer().createTriangleMesh({
      positions: new Float32Array(verts),
      normals: new Float32Array(floorNormals),
      uv: new Float32Array(floorUV),
      index: new Uint16Array(indices),
      texture: FlatTextures.getTexture(this.def.floorTexture)!,
      lightness: this.localLightness,
    });
    this.ceilMesh = getRenderer().createTriangleMesh({
      positions: new Float32Array(verts),
      normals: new Float32Array(ceilNormals),
      uv: new Float32Array(ceilUV),
      index: new Uint16Array(ceilIndices),
      texture: FlatTextures.getTexture(this.def.ceilingTexture)!,
      lightness: this.localLightness,
    });

    this.floorMesh.position = Vec3.fromValues(0, this.localFloorHeight, 0);
    this.ceilMesh.position = Vec3.fromValues(0, this.localCeilHeight, 0);
  }
}
