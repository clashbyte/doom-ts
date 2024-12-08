import { Vec2, Vec3 } from 'gl-matrix';
import { MapSector } from '@/entities/map/MapSector.ts';
import { MapVertex } from '@/entities/map/MapVertex.ts';
import { MapWall, MapWallFlags } from '@/entities/map/MapWall.ts';
import { MapWallSide } from '@/entities/map/MapWallSide.ts';
import { linePointDistanceSquared, projectPointOnLine } from '@/core/math/LineMath.ts';
import { SCALE } from '@/defs/Units.ts';
import { LevelData, parseLevelData } from '@/files/LevelData.ts';

/**
 * Class for a single map
 */
export class Map {
  /**
   * Internal raw map file data
   * @type {LevelData}
   * @private
   */
  private readonly levelData: LevelData;

  /**
   * All linked vertices
   * @type {MapVertex[]}
   * @private
   */
  private readonly verts: MapVertex[];

  /**
   * All walls
   * @type {MapWall[]}
   * @private
   */
  private readonly walls: MapWall[];

  /**
   * All wall sides (SIDEDEF's)
   * @type {MapWallSide[]}
   * @private
   */
  private readonly wallSides: MapWallSide[];

  /**
   * Assigned sectors
   * @type {MapSector[]}
   * @private
   */
  private readonly sectors: MapSector[];

  /**
   * List of thing definitions, handled by GameScreen
   * @returns {LevelData}
   */
  public get thingDefs() {
    return this.levelData;
  }

  public constructor(lumpName: string) {
    // Decode level data and create structures
    this.levelData = parseLevelData(lumpName);
    this.verts = this.levelData.vertices.map((info) => new MapVertex(info));
    this.wallSides = this.levelData.sideDefs.map((info) => new MapWallSide(info));
    this.walls = this.levelData.lineDefs.map((info) => new MapWall(info));
    this.sectors = this.levelData.sectors.map((info) => new MapSector(info));

    // Link object references
    for (const en of [
      ...this.walls, //
      ...this.wallSides,
      ...this.sectors,
    ]) {
      en.linkReferences(this.verts, this.walls, this.wallSides, this.sectors);
    }
  }

  /**
   * Render visible sectors
   * @param {Vec3} playerPosition
   */
  public render(playerPosition: Vec3) {
    for (const sect of this.sectors) {
      sect.render();
    }
  }

  /**
   * Get floor height for a point (or circle)
   * @param {Vec2} point
   * @param {number} radius
   * @returns {number}
   */
  public getFloorHeight(point: Vec2, radius: number = 0) {
    // We have to iterate all nested sectors, to find
    // most suitable floor height
    const visitedSectors: MapSector[] = [];
    const sectorQueue: MapSector[] = [];

    let floor = 0;
    for (const sector of this.sectors) {
      if (sector.containsPoint(point)) {
        if (radius === 0) {
          return sector.floorHeight;
        }
        floor = sector.floorHeight;
        sectorQueue.push(sector);
        break;
      }
    }

    // All calculations made with radius^2, to skip
    // square roots in distance calculations
    const radSq = radius * radius;
    while (sectorQueue.length) {
      // Get the sector from queue
      const sector = sectorQueue.pop();
      visitedSectors.push(sector);
      floor = Math.max(floor, sector.floorHeight);

      // Iterate through all sector walls
      for (const wall of sector.walls) {
        if (wall.flags & MapWallFlags.TwoSided) {
          const v1 = wall.vertex1;
          const v2 = wall.vertex2;

          // If we are close to two-sided side def
          if (
            linePointDistanceSquared(
              point,
              Vec2.fromValues(v1.x, v1.y),
              Vec2.fromValues(v2.x, v2.y),
            ) <= radSq
          ) {
            const otherSector =
              wall.frontSide.sector === sector ? wall.backSide.sector : wall.frontSide.sector;
            if (!visitedSectors.includes(otherSector)) {
              sectorQueue.push(otherSector);
            }
          }
        }
      }
    }

    return floor;
  }

  /**
   * Perform collision response for cylinder
   * @param {Vec3} point
   * @param {Vec3} velocity
   * @param {number} radius
   * @param {number} height
   * @param {number} climbHeight
   * @returns {number}
   */
  public collide(
    point: Vec3,
    velocity: Vec3,
    radius: number,
    height: number,
    climbHeight: number = 24 * SCALE,
  ) {
    const visitedSectors: MapSector[] = [];
    const sectorQueue: MapSector[] = [];
    let firstSector: boolean = true;
    let collided = false;
    let iterations = 8;
    let grounded = false;

    const targetPoint = Vec3.fromValues(
      point[0] + velocity[0],
      point[1] + velocity[1],
      point[2] + velocity[2],
    );
    const targetPoint2 = Vec2.fromValues(
      point[0] + velocity[0], //
      point[2] + velocity[2],
    );

    const linePoint: Vec2 = Vec2.create();
    const lineNormal: Vec2 = Vec2.create();
    do {
      visitedSectors.length = 0;
      sectorQueue.length = 0;
      collided = false;
      iterations--;
      firstSector = true;
      grounded = true;

      for (const sector of this.sectors) {
        if (sector.containsPoint(targetPoint2)) {
          sectorQueue.push(sector);
          break;
        }
      }

      const radSq = radius * radius;
      while (sectorQueue.length) {
        const sector = sectorQueue.pop();
        visitedSectors.push(sector);
        if (firstSector) {
          if (targetPoint[1] > sector.floorHeight) {
            grounded = false;
          } else {
            targetPoint[1] = Math.max(targetPoint[1], sector.floorHeight);
          }
          firstSector = false;
        }

        for (const wall of sector.walls) {
          let solid = true;
          let otherSector: MapSector | null = null;
          let frontDef = false;
          const v1 = wall.position1;
          const v2 = wall.position2;

          if (wall.flags & MapWallFlags.TwoSided && !(wall.flags & MapWallFlags.Blocking)) {
            frontDef = wall.frontSide.sector === sector;
            otherSector = frontDef ? wall.backSide.sector : wall.frontSide.sector;
            if (
              otherSector.ceilHeight >= targetPoint[1] + height + climbHeight &&
              otherSector.floorHeight <= targetPoint[1] + climbHeight
            ) {
              solid = false;
            }
          }

          projectPointOnLine(linePoint, targetPoint2, v1, v2);

          const dist = Vec2.squaredDistance(linePoint, targetPoint2);
          if (dist < radSq) {
            if (solid) {
              // TODO Rebuild for wall normal
              Vec2.sub(lineNormal, targetPoint2, linePoint);
              Vec2.normalize(lineNormal, lineNormal);
              Vec2.scaleAndAdd(targetPoint2, linePoint, lineNormal, radius + 0.0001);

              // Vec2.sub(lineNormal, v2, v1);
              // Vec2.normalize(lineNormal, lineNormal);
              // Vec2.set(lineNormal, -lineNormal[1], lineNormal[0]);
              // if (frontDef) {
              //   Vec2.scale(lineNormal, lineNormal, -1);
              // }

              // const subDist = radius - Math.sqrt(dist) + 0.0001;
              // Vec2.scaleAndAdd(targetPoint2, targetPoint2, lineNormal, subDist);

              targetPoint[0] = targetPoint2[0];
              targetPoint[2] = targetPoint2[1];
            } else if (otherSector) {
              if (!visitedSectors.includes(otherSector)) {
                sectorQueue.push(otherSector);
                if (targetPoint[1] <= otherSector.floorHeight) {
                  targetPoint[1] = Math.max(targetPoint[1], otherSector.floorHeight);
                  grounded = true;
                }
              }
            }
            collided = true;
          }
        }
      }
    } while (collided && iterations > 0);

    return {
      result: targetPoint,
      grounded,
    };
  }
}
