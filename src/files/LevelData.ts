import { Vec2 } from 'gl-matrix';
import { pointInsidePolygon } from '@/core/math/PolygonMath.ts';
import { WAD } from '@/files/WAD.ts';
import { BinaryReader } from '@/helpers/BinaryReader.ts';

export interface RawVertex {
  x: number;
  y: number;
}

export interface RawLineDef {
  v1: number;
  v2: number;
  flags: number;
  special: number;
  tag: number;
  sideDef1: number;
  sideDef2: number;
}

export interface RawSideDef {
  x: number;
  y: number;
  texture: string | null;
  upperTexture: string | null;
  lowerTexture: string | null;
  sector: number;
}

export interface RawSectorVertexLoop {
  indices: number[];
  parent: number | null;
}

export interface RawSector {
  floor: number;
  ceiling: number;
  floorTexture: string;
  ceilingTexture: string;
  lightLevel: number;
  type: number;
  tag: number;

  sideDefs: number[];
  lineDefs: number[];
  neighbors: number[];
  vertexLoops: RawSectorVertexLoop[];

  parent: number;
  children: number[];
}

export interface RawThing {
  x: number;
  y: number;
  angle: number;
  type: number;
  flags: number;
}

export interface LevelData {
  vertices: RawVertex[];
  lineDefs: RawLineDef[];
  sideDefs: RawSideDef[];
  sectors: RawSector[];
  things: RawThing[];
}

function linkVertexLoops(vertices: RawVertex[], vertexChains: number[][]) {
  const vertexLoops: RawSectorVertexLoop[] = vertexChains.map((indices) => ({
    indices,
    parent: null,
  }));
  const points = vertexChains.map((vlist) =>
    vlist.map((v) => Vec2.fromValues(vertices[v].x, vertices[v].y)),
  );
  for (let first = 0; first < vertexLoops.length; first++) {
    for (let second = 0; second < vertexLoops.length; second++) {
      if (first !== second) {
        let inside = true;
        for (let i = 0; i < points[second].length; i++) {
          if (!pointInsidePolygon(points[second][i], points[first])) {
            inside = false;
            break;
          }
        }
        if (inside) {
          vertexLoops[second].parent = first;
        }
      }
    }
  }

  return vertexLoops;
}

function findSectorLines(
  sectorID: number,
  verts: RawVertex[],
  lineDefs: RawLineDef[],
  sideDefs: RawSideDef[],
) {
  const neighborList: number[] = [];
  const lineList: number[] = [];
  const sideList: number[] = [];

  // Find sector line defs
  for (let i = 0; i < lineDefs.length; i++) {
    const line = lineDefs[i];
    const sideIdx = (
      (line.flags & 4) > 0 ? [line.sideDef1, line.sideDef2] : [line.sideDef1]
    ).filter((v) => v !== -1);

    for (const j of sideIdx) {
      const side = sideDefs[j];
      if (side.sector === sectorID) {
        if (!lineList.includes(i)) {
          lineList.push(i);
          break;
        }
      }
    }
  }

  // Search for sector side defs
  for (const idx of lineList) {
    const line = lineDefs[idx];
    const sideIdx = (
      (line.flags & 4) > 0 ? [line.sideDef1, line.sideDef2] : [line.sideDef1]
    ).filter((v) => v !== -1);
    for (const j of sideIdx) {
      const side = sideDefs[j];
      if (side.sector === sectorID) {
        if (!sideList.includes(j)) {
          sideList.push(j);
        }
      } else if (!neighborList.includes(side.sector)) {
        neighborList.push(side.sector);
      }
    }
  }

  // Strip down lines with two sides referring the same sector
  const defsToVisit = lineList
    .map((v) => lineDefs[v])
    .filter(
      (ln) =>
        !(
          (ln.flags & 4) > 0 && //
          ln.sideDef1 !== ln.sideDef2 &&
          sideDefs[ln.sideDef1].sector === sideDefs[ln.sideDef2].sector
        ),
    );

  // Search for vertex loops
  let searchTries = 32;
  const vertexChains: number[][] = [];
  while (defsToVisit.length > 0 && searchTries > 0) {
    const vertexWeight: { [vert: number]: number } = {};
    for (const d of defsToVisit) {
      vertexWeight[d.v1] = (vertexWeight[d.v1] ?? 0) + 1;
      vertexWeight[d.v2] = (vertexWeight[d.v2] ?? 0) + 1;
    }

    let maxWeight = 0;
    let startVert = 0;
    for (const idx in vertexWeight) {
      if (typeof vertexWeight[idx] === 'number') {
        if (vertexWeight[idx] > maxWeight) {
          startVert = Number(idx);
          maxWeight = vertexWeight[idx];
        }
      }
    }

    const chain: number[] = [startVert];
    let v = startVert;
    let loopFound = false;

    let loopTries = 32;
    while (!loopFound && loopTries > 0) {
      const visitedList: RawLineDef[] = [];
      for (let i = 0; i < defsToVisit.length; i++) {
        const other = defsToVisit[i];
        if (other.v1 === v) {
          if (other.v2 === startVert) {
            loopFound = true;
            visitedList.push(other);
            break;
          } else {
            v = other.v2;
            chain.push(v);
            visitedList.push(other);
          }
        } else if (other.v2 === v) {
          if (other.v1 === startVert) {
            loopFound = true;
            visitedList.push(other);
            break;
          } else {
            v = other.v1;
            chain.push(v);
            visitedList.push(other);
          }
        }
      }
      for (const en of visitedList) {
        defsToVisit.splice(defsToVisit.indexOf(en), 1);
      }

      loopTries--;
    }

    searchTries--;
    vertexChains.push(chain);
  }
  for (const subChain of vertexChains) {
    if (subChain.length < 3) {
      console.warn('[LevelData] Incorrect sector chains length: ', sectorID, vertexChains);
    }
  }
  if (defsToVisit.length > 0) {
    console.warn('[LevelData] Non-assigned line defs: ', sectorID, defsToVisit);
  }

  return {
    neighbors: neighborList,
    lineDefs: lineList,
    sideDefs: sideList,
    vertexLoops: linkVertexLoops(verts, vertexChains),
  };
}

function parseVerts(name: string): RawVertex[] {
  const rawData = WAD.getEntry(`${name}/VERTEXES`);
  if (rawData) {
    const data = new Int16Array(rawData);
    const verts: RawVertex[] = [];
    for (let i = 0; i < data.length; i += 2) {
      verts.push({
        x: data[i],
        y: -data[i + 1],
      });
    }

    return verts;
  }

  return [];
}

function parseLineDefs(name: string) {
  const rawData = WAD.getEntry(`${name}/LINEDEFS`);
  if (rawData) {
    const data = new Int16Array(rawData);
    const defs: RawLineDef[] = [];
    for (let i = 0; i < data.length; i += 7) {
      defs.push({
        v1: data[i],
        v2: data[i + 1],
        flags: data[i + 2],
        special: data[i + 3],
        tag: data[i + 4],
        sideDef1: data[i + 5],
        sideDef2: data[i + 6],
      });
    }

    return defs;
  }

  return [];
}

function parseSideDefs(name: string) {
  const rawData = WAD.getEntry(`${name}/SIDEDEFS`);
  if (rawData) {
    const data = new BinaryReader(rawData);
    const defs: RawSideDef[] = [];
    for (let i = 0; i < rawData.byteLength / 30; i++) {
      const x = data.readSignedShort();
      const y = data.readSignedShort();
      const upperTexture = data.readFixedString(8);
      const lowerTexture = data.readFixedString(8);
      const texture = data.readFixedString(8);
      const sector = data.readShort();

      defs.push({
        x,
        y,
        upperTexture: upperTexture !== '-' ? upperTexture : null,
        lowerTexture: lowerTexture !== '-' ? lowerTexture : null,
        texture: texture !== '-' ? texture : null,
        sector,
      });
    }

    return defs;
  }

  return [];
}

function parseSectors(
  name: string,
  verts: RawVertex[],
  lineDefs: RawLineDef[],
  sideDefs: RawSideDef[],
) {
  const rawData = WAD.getEntry(`${name}/SECTORS`);
  if (rawData) {
    const data = new BinaryReader(rawData);
    const defs: RawSector[] = [];
    for (let i = 0; i < rawData.byteLength / 26; i++) {
      const floor = data.readSignedShort();
      const ceiling = data.readSignedShort();
      const floorTexture = data.readFixedString(8);
      const ceilingTexture = data.readFixedString(8);
      const lightLevel = data.readShort();
      const type = data.readShort();
      const tag = data.readShort();

      const {
        neighbors,
        lineDefs: lines,
        sideDefs: sides,
        vertexLoops,
      } = findSectorLines(i, verts, lineDefs, sideDefs);

      defs.push({
        floor,
        ceiling,
        floorTexture,
        ceilingTexture,
        lightLevel,
        type,
        tag,

        neighbors,
        vertexLoops,
        lineDefs: lines,
        sideDefs: sides,

        children: [],
        parent: -1,
      });
    }

    return defs;
  }

  return [];
}

function parseThings(name: string): RawThing[] {
  const rawData = WAD.getEntry(`${name}/THINGS`);
  if (rawData) {
    const data = new Int16Array(rawData);
    const defs: RawThing[] = [];
    for (let i = 0; i < data.length; i += 5) {
      defs.push({
        x: data[i],
        y: -data[i + 1],
        angle: data[i + 2],
        type: data[i + 3],
        flags: data[i + 4],
      });
    }

    return defs;
  }

  return [];
}

export function parseLevelData(name: string): LevelData {
  // Parsing verts
  const vertices = parseVerts(name);
  const lineDefs = parseLineDefs(name);
  const sideDefs = parseSideDefs(name);
  const sectors = parseSectors(name, vertices, lineDefs, sideDefs);
  const things = parseThings(name);

  return {
    vertices,
    lineDefs,
    sideDefs,
    sectors,
    things,
  };
}
